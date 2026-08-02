/**
 * Concordia Helper — AI chatbot controller.
 *
 * Reads the cafe + menu data from Supabase (over the REST API, so no extra npm
 * dependency), builds a system prompt containing every menu, and asks Groq.
 *
 * Env vars (loaded from the project-root .env.local by server.js):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const MAX_TOKENS = 300;
const TEMPERATURE = 0.7;
const MAX_MESSAGE_LENGTH = 500;
const GROQ_TIMEOUT_MS = 20000;
const MENU_CACHE_TTL_MS = 5 * 60 * 1000; // menus change rarely — don't refetch per message

// ── Supabase REST helper ────────────────────────────────────────────
async function supabaseSelect(path) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase env vars are not set');

    const res = await fetch(`${url}/rest/v1/${path}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
    });

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Supabase ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
}

// ── Menu context, cached in module scope ────────────────────────────
let menuCache = null; // { text, expiresAt }

async function buildMenuContext() {
    if (menuCache && menuCache.expiresAt > Date.now()) return menuCache.text;

    const [cafes, items] = await Promise.all([
        supabaseSelect('cafes?select=id,name,location,rating,description&order=id'),
        supabaseSelect(
            'menu_items?select=cafe_id,item_name,category,price&is_available=eq.true' +
            '&order=cafe_id&order=category&order=item_name'
        ),
    ]);

    if (!Array.isArray(cafes) || cafes.length === 0) throw new Error('No cafes found in Supabase');

    const text = cafes.map(cafe => {
        const cafeItems = items.filter(item => item.cafe_id === cafe.id);

        // Group by category so "what snacks do you have?" is easy to answer
        const byCategory = new Map();
        for (const item of cafeItems) {
            if (!byCategory.has(item.category)) byCategory.set(item.category, []);
            byCategory.get(item.category).push(item);
        }

        const menuLines = byCategory.size === 0
            ? '  (no menu items on record)'
            : [...byCategory.entries()].map(([category, categoryItems]) =>
                `  ${category}:\n` + categoryItems
                    .map(item => `    - ${item.item_name}: Rs. ${Number(item.price)}`)
                    .join('\n')
            ).join('\n');

        return `${cafe.name} (${cafe.location}) — rating ${cafe.rating}/5\n` +
            (cafe.description ? `  About: ${cafe.description}\n` : '') + menuLines;
    }).join('\n\n');

    menuCache = { text, expiresAt: Date.now() + MENU_CACHE_TTL_MS };
    return text;
}

function buildSystemPrompt(menuContext) {
    return [
        "You are Concordia Helper, a friendly AI chatbot for NUST's 4 cafes. " +
        'Answer questions about menus, prices, cafe locations, and recommendations. ' +
        'Be concise and helpful. Only use the menu data provided.',
        '',
        'MENU DATA — all 4 cafes:',
        '',
        menuContext,
        '',
        'Formatting rules:',
        '- If an item or price is not in the data above, say you do not have it on the menu. Never guess a price.',
        '- All prices are in Pakistani Rupees. Always write them as "Rs. 250".',
        '- Keep replies to 2-4 sentences, or a short list.',
        '- When recommending, name the cafe, the item and the price.',
        '- Students use short names: C1 = Concordia 1, C2 = Concordia 2, C3 = Concordia 3.',
        '- If asked which cafe is best, compare the ratings and note they come from student reviews.',
    ].join('\n');
}

// ── Chat log (best effort — never blocks or fails the reply) ────────
async function logChat(userId, message, response) {
    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) return; // anon key is blocked by RLS on chat_logs, so skip

        const res = await fetch(`${url}/rest/v1/chat_logs`, {
            method: 'POST',
            headers: {
                apikey: key,
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
            },
            body: JSON.stringify({ user_id: userId, message, response }),
        });
        if (!res.ok) console.error('chat_logs insert failed:', res.status);
    } catch (err) {
        console.error('chat_logs insert threw:', err.message);
    }
}

// ── POST /api/chatbot ───────────────────────────────────────────────
exports.chat = async (req, res) => {
    const timestamp = () => new Date().toISOString();
    const fail = (status, error) => res.status(status).json({ success: false, error, timestamp: timestamp() });

    // 1. Validate input
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const userId = typeof req.body?.userId === 'string' && req.body.userId.trim()
        ? req.body.userId.trim()
        : null;

    if (!message) return fail(400, 'Please include a "message" string in the request body.');
    if (message.length > MAX_MESSAGE_LENGTH)
        return fail(400, `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`);

    // 2. Check configuration before doing any work
    if (!process.env.GROQ_API_KEY) {
        console.error('[chatbot] GROQ_API_KEY is not set');
        return fail(500, 'Chatbot is not configured yet. Missing GROQ_API_KEY.');
    }

    // 3. Load the menu context
    let menuContext;
    try {
        menuContext = await buildMenuContext();
    } catch (err) {
        console.error('[chatbot] menu load failed:', err.message);
        return fail(503, "Couldn't load the cafe menus right now. Check the Supabase keys and that SUPABASE_SETUP.sql has been run.");
    }

    // 4. Ask Groq
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

    try {
        const groqRes = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                max_tokens: MAX_TOKENS,
                temperature: TEMPERATURE,
                messages: [
                    { role: 'system', content: buildSystemPrompt(menuContext) },
                    { role: 'user', content: message },
                ],
            }),
            signal: controller.signal,
        });

        const data = await groqRes.json().catch(() => ({}));

        if (!groqRes.ok) {
            console.error('[chatbot] Groq error:', groqRes.status, data?.error?.message);
            if (groqRes.status === 401) return fail(502, 'Groq rejected the API key.');
            if (groqRes.status === 429) return fail(429, 'The chatbot is rate limited right now. Try again in a moment.');
            return fail(502, 'The AI service returned an error. Please try again.');
        }

        const reply = data?.choices?.[0]?.message?.content?.trim();
        if (!reply) {
            console.error('[chatbot] Groq returned no content');
            return fail(502, 'The AI service returned an empty response. Please try again.');
        }

        // 5. Log the exchange when we know who asked (never blocks the reply)
        if (userId) logChat(userId, message, reply);

        res.json({ success: true, message: reply, timestamp: timestamp() });
    } catch (err) {
        if (err.name === 'AbortError') {
            console.error('[chatbot] Groq request timed out');
            return fail(504, 'The AI service took too long to respond. Please try again.');
        }
        console.error('[chatbot] unexpected error:', err.message);
        return fail(500, 'Something went wrong. Please try again.');
    } finally {
        clearTimeout(timer);
    }
};
