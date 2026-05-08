const Review = require('../models/Review');

const CAFE_IDS = ['1', '2', '3'];

exports.getReviews = async (req, res, next) => {
    try {
        const { cafeId } = req.params;
        if (!CAFE_IDS.includes(cafeId))
            return res.status(404).json({ success: false, message: 'Cafe not found' });

        const reviews = await Review.find({ cafeId })
            .sort({ createdAt: -1 })
            .lean();

        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        const avg = reviews.length ? (sum / reviews.length).toFixed(1) : null;

        res.json({ success: true, data: { reviews, avg, count: reviews.length } });
    } catch (err) {
        next(err);
    }
};

exports.submitReview = async (req, res, next) => {
    try {
        const { cafeId, rating, comment } = req.body;

        if (!CAFE_IDS.includes(String(cafeId)))
            return res.status(400).json({ success: false, message: 'Invalid cafe ID' });
        if (!rating || rating < 1 || rating > 5)
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });

        const existing = await Review.findOne({ cafeId: String(cafeId), userId: req.user._id });
        if (existing)
            return res.status(409).json({ success: false, message: 'You have already reviewed this cafe' });

        const review = await Review.create({
            cafeId: String(cafeId),
            userId: req.user._id,
            department: req.user.department,
            rating: Number(rating),
            comment: comment || '',
        });

        res.status(201).json({ success: true, data: { review } });
    } catch (err) {
        next(err);
    }
};

exports.myReviews = async (req, res, next) => {
    try {
        const reviews = await Review.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
        res.json({ success: true, data: { reviews } });
    } catch (err) {
        next(err);
    }
};

exports.getAllRecent = async (req, res, next) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 }).limit(20).lean();
        res.json({ success: true, data: { reviews } });
    } catch (err) {
        next(err);
    }
};
