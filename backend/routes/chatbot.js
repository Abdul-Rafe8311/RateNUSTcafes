const router = require('express').Router();
const { chat } = require('../controllers/chatbotController');

// Public — students can ask without logging in
router.post('/', chat);

module.exports = router;
