require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

const app = express();

connectDB();

const allowedOrigins = [
    'http://localhost:5500', 'http://127.0.0.1:5500',
    'http://localhost:3000', 'http://127.0.0.1:3000',
    'http://localhost:8080', 'http://127.0.0.1:8080',
    'null', // file:// origins appear as "null"
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin(origin, cb) {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        console.log('CORS blocked:', origin);
        cb(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.use(express.json());

if (process.env.NODE_ENV !== 'production') {
    app.use((req, _res, next) => { console.log(`${req.method} ${req.path}`); next(); });
}

app.get('/health', (_req, res) => res.json({ success: true, message: 'Concordia Eats API is running' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/reviews', require('./routes/reviews'));

app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    console.log(`🚀 Concordia Eats API running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});
