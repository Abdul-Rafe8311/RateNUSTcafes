const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

        mongoose.connection.on('error', err => console.error('❌ MongoDB error:', err));
        mongoose.connection.on('disconnected', () => console.log('⚠️  MongoDB disconnected'));

        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            process.exit(0);
        });
    } catch (err) {
        // Don't kill the process: routes that need Mongo (auth, reviews) will
        // fail individually, but the chatbot — which only talks to Supabase and
        // Groq — keeps working.
        console.error('❌ MongoDB connection failed:', err.message);
        console.error('⚠️  Auth and review endpoints are unavailable until Mongo is reachable.');
    }
};

module.exports = connectDB;
