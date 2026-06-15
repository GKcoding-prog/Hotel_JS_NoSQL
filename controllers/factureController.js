const Facture = require('../models/Facture');

// @GET /api/factures  [Admin = all, Client = own]
exports.listerFactures = async (req, res) => {
  try {
    const filtre = req.user.role === 'admin' ? {} : { client: req.user._id };
    const { statut } = req.query;
    if (statut) filtre.statut = statut;

    const factures = await Facture.find(filtre)
      .populate('client', 'nom prenom email')
      .populate('reservation', 'dateArrivee dateDepart')
      .sort({ createdAt: -1 });

    res.json({ succes: true, total: factures.length, data: factures });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @GET /api/factures/:id
exports.obtenirFacture = async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id)
      .populate('client', 'nom prenom email telephone adresse')
      .populate({ path: 'reservation', populate: { path: 'chambre', select: 'numero type' } });

    if (!facture) return res.status(404).json({ succes: false, message: 'Facture introuvable.' });

    if (req.user.role !== 'admin' && facture.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ succes: false, message: 'Accès non autorisé.' });
    }

    res.json({ succes: true, data: facture });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @PUT /api/factures/:id/payer  [Admin]
exports.payerFacture = async (req, res) => {
  try {
    const { methodePaiement } = req.body;

    const facture = await Facture.findById(req.params.id);
    if (!facture) return res.status(404).json({ succes: false, message: 'Facture introuvable.' });
    if (facture.statut === 'payee') {
      return res.status(400).json({ succes: false, message: 'Facture déjà payée.' });
    }

    facture.statut = 'payee';
    facture.methodePaiement = methodePaiement || 'especes';
    facture.datePaiement = new Date();
    await facture.save();

    res.json({ succes: true, message: 'Paiement enregistré.', data: facture });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @GET /api/factures/stats  [Admin]
exports.statsFactures = async (req, res) => {
  try {
    const stats = await Facture.aggregate([
      {
        $group: {
          _id: '$statut',
          total: { $sum: '$montantTotal' },
          count: { $sum: 1 },
        },
      },
    ]);
    const totalRevenu = await Facture.aggregate([
      { $match: { statut: 'payee' } },
      { $group: { _id: null, total: { $sum: '$montantTotal' } } },
    ]);

    res.json({
      succes: true,
      data: {
        parStatut: stats,
        revenuTotal: totalRevenu[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};
