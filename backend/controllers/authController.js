const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

exports.register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password)
            return res.status(400).json({ success: false, message: 'All fields are required' });

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing)
            return res.status(400).json({ success: false, message: 'An account with this email already exists' });

        const user = await User.create({ name, email, password });
        const token = generateToken({ userId: user._id });

        res.status(201).json({ success: true, data: { user: user.toPublic(), token } });
    } catch (err) {
        if (err.name === 'ValidationError') {
            const msg = Object.values(err.errors)[0].message;
            return res.status(400).json({ success: false, message: msg });
        }
        next(err);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ success: false, message: 'Email and password are required' });

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user)
            return res.status(401).json({ success: false, message: 'No account found with this email. Please sign up first.' });

        const ok = await user.comparePassword(password);
        if (!ok)
            return res.status(401).json({ success: false, message: 'Incorrect password' });

        const token = generateToken({ userId: user._id });
        res.json({ success: true, data: { user: user.toPublic(), token } });
    } catch (err) {
        next(err);
    }
};

exports.me = async (req, res) => {
    res.json({ success: true, data: { user: req.user.toPublic() } });
};
