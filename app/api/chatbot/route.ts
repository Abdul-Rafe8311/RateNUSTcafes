/**
 * Concordia Eats — AI chatbot endpoint
 *
 * POST /api/chatbot
 *   body:     { message: string, userId?: string }
 *   returns:  { success: true,  message: string, timestamp: string }
 *             { success: false, error: string,   timestamp: string }
 *
 * Flow: read the cafe + menu data from Supabase → build a system prompt that
 * contains every menu → ask Groq (llama-3.3-70b-versatile) → return the reply.
 *
 * The Supabase service role key is used here because this file only ever runs
 * on the server. Never import this module from a client component.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Always run this route dynamically — the menu comes from the database, and
// Next.js must not try to statically pre-render or cache the response.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ── Config ──────────────────────────────────────────────────────────
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const MAX_TOKENS = 300;
const TEMPERATURE = 0.7;
const MAX_MESSAGE_LENGTH = 500; // reject anything longer, it is not a real question
const GROQ_TIMEOUT_MS = 20_000;
const MENU_CACHE_TTL_MS = 5 * 60 * 1000; // menus change rarely; don't hit the DB every message

// ── Types ───────────────────────────────────────────────────────────
interface ChatRequestBody {
  message?: unknown;
  userId?: unknown;
}

interface CafeRow {
  id: number;
  name: string;
  location: string;
  rating: number;
  description: string | null;
}

interface MenuItemRow {
  cafe_id: number;
  item_name: string;
  category: string;
  price: number;
  is_available: boolean;
}

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

// ── Supabase client (server-side, service role) ─────────────────────
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer the service role key so chat_logs inserts are not blocked by RLS.
  // Falls back to the anon key, which can still read the public cafe/menu tables.
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── Menu context, cached in module scope ────────────────────────────
let menuCache: { text: string; expiresAt: number } | null = null;

/**
 * Builds the plain-text menu block that gets embedded in the system prompt.
 * Returns null when the data cannot be read, so the caller can fail loudly
 * rather than let the model invent prices.
 */
async function buildMenuContext(): Promise<string | null> {
  if (menuCache && menuCache.expiresAt > Date.now()) return menuCache.text;

  const supabase = getSupabase();
  if (!supabase) return null;

  const [cafesResult, itemsResult] = await Promise.all([
    supabase
      .from('cafes')
      .select('id, name, location, rating, description')
      .order('id'),
    supabase
      .from('menu_items')
      .select('cafe_id, item_name, category, price, is_available')
      .eq('is_available', true)
      .order('cafe_id')
      .order('category')
      .order('item_name'),
  ]);

  if (cafesResult.error) {
    console.error('[chatbot] failed to read cafes:', cafesResult.error.message);
    return null;
  }
  if (itemsResult.error) {
    console.error('[chatbot] failed to read menu_items:', itemsResult.error.message);
    return null;
  }

  const cafes = (cafesResult.data ?? []) as CafeRow[];
  const items = (itemsResult.data ?? []) as MenuItemRow[];
  if (cafes.length === 0) return null;

  const text = cafes
    .map((cafe) => {
      const cafeItems = items.filter((item) => item.cafe_id === cafe.id);

      // Group this cafe's items by category so the model can answer
      // "what snacks do you have?" without scanning a flat list.
      const byCategory = new Map<string, MenuItemRow[]>();
      for (const item of cafeItems) {
        const bucket = byCategory.get(item.category) ?? [];
        bucket.push(item);
        byCategory.set(item.category, bucket);
      }

      const menuLines =
        byCategory.size === 0
          ? '  (no menu items on record)'
          : [...byCategory.entries()]
              .map(
                ([category, categoryItems]) =>
                  `  ${category}:\n` +
                  categoryItems
                    .map((item) => `    - ${item.item_name}: Rs. ${Number(item.price)}`)
                    .join('\n'),
              )
              .join('\n');

      return (
        `${cafe.name} (${cafe.location}) — rating ${cafe.rating}/5\n` +
        (cafe.description ? `  About: ${cafe.description}\n` : '') +
        `${menuLines}`
      );
    })
    .join('\n\n');

  menuCache = { text, expiresAt: Date.now() + MENU_CACHE_TTL_MS };
  return text;
}

function buildSystemPrompt(menuContext: string): string {
  return [
    "You are Concordia Helper, a friendly AI assistant for NUST's 4 cafes.",
    '',
    'Here is the complete, current data for all 4 cafes:',
    '',
    menuContext,
    '',
    'Rules:',
    '- Answer only from the data above. If an item or price is not listed, say you do not have it on the menu rather than guessing.',
    '- All prices are in Pakistani Rupees (PKR). Always write them as "Rs. 250".',
    '- Keep replies short and conversational — 2 to 4 sentences, or a short list.',
    '- When recommending, mention the cafe name, the item and the price.',
    '- Students often use short names: C1 = Concordia 1, C2 = Concordia 2, C3 = Concordia 3, Ratro = Ratro Cafe.',
    '- If asked which cafe is best, compare the ratings and say the ratings come from student reviews.',
    '- Stay on the topic of the cafes, their menus, prices and recommendations.',
  ].join('\n');
}

// ── Chat log (best effort — never blocks or fails the response) ─────
async function logChat(userId: string, message: string, response: string) {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase
      .from('chat_logs')
      .insert({ user_id: userId, message, response });
    if (error) console.error('[chatbot] chat_logs insert failed:', error.message);
  } catch (err) {
    console.error('[chatbot] chat_logs insert threw:', err);
  }
}

// ── Route handler ───────────────────────────────────────────────────
export async function POST(request: Request) {
  const timestamp = () => new Date().toISOString();

  const fail = (error: string, status: number) =>
    NextResponse.json({ success: false, error, timestamp: timestamp() }, { status });

  // 1. Parse and validate the request body
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return fail('Invalid JSON body.', 400);
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const userId = typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim() : null;

  if (!message) return fail('Please include a "message" string in the request body.', 400);
  if (message.length > MAX_MESSAGE_LENGTH) {
    return fail(`Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`, 400);
  }

  // 2. Check server configuration before doing any work
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    console.error('[chatbot] GROQ_API_KEY is not set');
    return fail('Chatbot is not configured yet. Missing GROQ_API_KEY.', 500);
  }

  // 3. Load the menu context
  let menuContext: string | null;
  try {
    menuContext = await buildMenuContext();
  } catch (err) {
    console.error('[chatbot] menu context build threw:', err);
    menuContext = null;
  }
  if (!menuContext) {
    return fail(
      "Couldn't load the cafe menus right now. Check the Supabase keys and that SUPABASE_SETUP.sql has been run.",
      503,
    );
  }

  // 4. Ask Groq
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  try {
    const groqResponse = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
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

    const data = (await groqResponse.json().catch(() => ({}))) as GroqResponse;

    if (!groqResponse.ok) {
      console.error('[chatbot] Groq error:', groqResponse.status, data.error?.message);
      if (groqResponse.status === 401) return fail('Groq rejected the API key.', 502);
      if (groqResponse.status === 429) {
        return fail('The chatbot is rate limited right now. Try again in a moment.', 429);
      }
      return fail('The AI service returned an error. Please try again.', 502);
    }

    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      console.error('[chatbot] Groq returned no content');
      return fail('The AI service returned an empty response. Please try again.', 502);
    }

    // 5. Log the exchange when we know who asked (never blocks the reply)
    if (userId) void logChat(userId, message, reply);

    return NextResponse.json({ success: true, message: reply, timestamp: timestamp() });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[chatbot] Groq request timed out');
      return fail('The AI service took too long to respond. Please try again.', 504);
    }
    console.error('[chatbot] unexpected error:', err);
    return fail('Something went wrong. Please try again.', 500);
  } finally {
    clearTimeout(timeout);
  }
}

// Anything other than POST gets a clear answer instead of a framework 405 page.
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Use POST with { message: string } to talk to Concordia Helper.' },
    { status: 405 },
  );
}
