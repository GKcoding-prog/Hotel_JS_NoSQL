const mongoose = require('mongoose');

const ligneFactureSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantite: { type: Number, default: 1 },
  prixUnitaire: { type: Number, required: true },
  total: { type: Number, required: true },
});

const factureSchema = new mongoose.Schema({
  reservation: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true, unique: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  numero: { type: String, unique: true }, // e.g. FACT-2024-0001
  lignes: [ligneFactureSchema],
  sousTotal: { type: Number, required: true },
  tva: { type: Number, default: 0.18 }, // 18% TVA
  montantTVA: { type: Number },
  montantTotal: { type: Number, required: true },
  statut: {
    type: String,
    enum: ['en_attente', 'payee', 'annulee'],
    default: 'en_attente',
  },
  methodePaiement: {
    type: String,
    enum: ['especes', 'carte', 'virement', 'non_defini'],
    default: 'non_defini',
  },
  datePaiement: { type: Date },
}, { timestamps: true });

// Auto-generate invoice number
factureSchema.pre('save', async function (next) {
  if (!this.numero) {
    const count = await mongoose.model('Facture').countDocuments();
    const year = new Date().getFullYear();
    this.numero = `FACT-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  this.montantTVA = this.sousTotal * this.tva;
  this.montantTotal = this.sousTotal + this.montantTVA;
  next();
});

module.exports = mongoose.model('Facture', factureSchema);
