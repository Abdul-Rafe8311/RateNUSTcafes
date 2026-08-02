const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    cafeId: { type: String, required: true, enum: ['1', '2', '3', '4'] },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 400, default: '' },
}, { timestamps: true });

// One review per user per cafe
reviewSchema.index({ cafeId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
