require('dotenv').config();
// Chatbot keys (Supabase + Groq) live in the project-root .env.local so they
// are shared with the rest of the app. Loaded second so backend/.env wins.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
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

// In development any localhost port is fine (Live Server picks 5500, 5501, …);
// production stays restricted to the explicit list above.
const isLocalhost = origin => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.use(cors({
    origin(origin, cb) {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        if (process.env.NODE_ENV !== 'production' && isLocalhost(origin)) return cb(null, true);
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
app.use('/api/chatbot', require('./routes/chatbot'));

app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    console.log(`🚀 Concordia Eats API running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);

    // Chatbot config check — a missing key here is the usual cause of
    // "I'm having trouble connecting right now" in the widget.
    const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GROQ_API_KEY']
        .filter(k => !process.env[k]);
    console.log(missing.length
        ? `🤖 Chatbot: DISABLED — missing ${missing.join(', ')} (expected in project-root .env.local)`
        : '🤖 Chatbot: ready at POST /api/chatbot');
});
