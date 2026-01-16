import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: String,
  imageUrl: String,
  active: { type: Boolean, default: true },
  validFrom: Date,
  validTo: Date,
  createdAt: { type: Date, default: Date.now }
});

const Offer = mongoose.model('Offer', offerSchema);
export default Offer;
