const router = require('express').Router();
const { getReviews, submitReview, myReviews, getAllRecent } = require('../controllers/reviewController');
const authMiddleware = require('../middleware/auth');

router.get('/recent', authMiddleware, getAllRecent);
router.get('/my', authMiddleware, myReviews);
router.get('/cafe/:cafeId', getReviews);
router.post('/', authMiddleware, submitReview);

module.exports = router;
