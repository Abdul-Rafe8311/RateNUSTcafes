# Concordia Helper — AI Chatbot Setup

An AI assistant for the four NUST cafes, built on **Groq** (`llama-3.3-70b-versatile`) and **Supabase**. It answers menu, price and recommendation questions using live data from your database — not from the model's memory.

| Cafe | Location | Rating |
| --- | --- | --- |
| Concordia 1 | Near NBS Ground | 4.2 |
| Concordia 2 | Near SEECS | 4.5 |
| Concordia 3 | In front of NUST Main Office | 3.9 |
| Ratro Cafe | Near Liaquat Hostel | 4.3 |

## Files

| File | Goes to |
| --- | --- |
| `SUPABASE_SETUP.sql` | Run in the Supabase SQL editor |
| `app/api/chatbot/route.ts` | `app/api/chatbot/route.ts` in your Next.js app |
| `components/ChatbotWidget.tsx` | `components/ChatbotWidget.tsx` |
| `.env.local.template` | Copy to `.env.local` and fill in |
| `CONCORDIA_CHATBOT_SETUP.md` | This guide |

Requirements: Next.js 13.4+ with the App Router, React 18+, TypeScript.

---

## 1. Get your Supabase keys

1. Go to [supabase.com](https://supabase.com) and open your project (or create one — the free tier is fine).
2. **Settings → API**.
3. Copy three values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

> The `service_role` key bypasses Row Level Security. Keep it server-side only — never prefix it with `NEXT_PUBLIC_`.

## 2. Get your Groq API key

1. Go to [console.groq.com](https://console.groq.com) and sign in.
2. **API Keys → Create API Key**.
3. Copy it immediately — the key is shown only once.
4. Paste into `GROQ_API_KEY`.

Groq's free tier covers development comfortably; check the current rate limits on their dashboard before you put this in front of the whole campus.

## 3. Create `.env.local`

```bash
cp .env.local.template .env.local
```

Fill in all four values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GROQ_API_KEY=gsk_...
```

Make sure `.env.local` is in `.gitignore`. Restart `npm run dev` after any change — Next.js reads env vars only at startup.

## 4. Run the SQL setup

1. Supabase dashboard → **SQL Editor → New query**.
2. Paste the whole of `SUPABASE_SETUP.sql` and hit **Run**.
3. The final `select` should print 4 rows with 8, 8, 8 and 9 menu items.

This creates:

- **`cafes`** — id, name, location, rating, description
- **`menu_items`** — cafe_id, item_name, category, price, is_available (categories: `biryani`, `main`, `beverages`, `snacks`, `sandwiches`, `desserts`)
- **`chat_logs`** — user_id, message, response, created_at
- RLS on all three: public read for cafes and menus, private chat logs
- Indexes on `cafe_id`, `category`, `item_name` (plus `lower(item_name)`)

The script is idempotent — re-running it updates rows instead of duplicating them, so it doubles as your "edit the menu" workflow.

## 5. Install dependencies

```bash
npm install @supabase/supabase-js lucide-react
```

## 6. Add the API route

Copy `app/api/chatbot/route.ts` into your project at exactly that path. It:

- accepts `POST { message: string, userId?: string }`
- reads all four cafes and their menus from Supabase (cached in memory for 5 minutes)
- builds a system prompt containing every menu
- calls Groq with `max_tokens: 300`, `temperature: 0.7`, a 20-second timeout
- returns `{ success: true, message: string, timestamp: string }`
- writes to `chat_logs` when `userId` is supplied — and never fails the reply if that write errors

## 7. Add the widget

Copy `components/ChatbotWidget.tsx`, then mount it in `app/layout.tsx`:

```tsx
import ChatbotWidget from '@/components/ChatbotWidget';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ChatbotWidget />
      </body>
    </html>
  );
}
```

To log conversations against a signed-in student, pass their id:

```tsx
<ChatbotWidget userId={user.id} />
```

## 8. Run and test

```bash
npm run dev
```

Open <http://localhost:3000>, click the gold bubble in the bottom-right, and try:

- "What's the price of biryani in C1?"
- "Which cafe is best?"
- "What's available at Ratro Cafe?"
- "Which cafe near Liaquat Hostel?"
- "What snacks do you have?"
- "Recommend something for lunch"

Or hit the endpoint directly:

```bash
curl -X POST http://localhost:3000/api/chatbot \
  -H 'Content-Type: application/json' \
  -d '{"message":"What is the price of biryani in C1?"}'
```

---

## Customising

**Change the menu** — edit rows in Supabase (Table Editor → `menu_items`) or re-run the seed block in `SUPABASE_SETUP.sql`. Changes appear within 5 minutes, or immediately after a server restart; adjust `MENU_CACHE_TTL_MS` in the route to change that window.

**Change the personality** — edit `buildSystemPrompt()` in the route.

**Change the model** — edit `GROQ_MODEL`. Groq retires models periodically; check [console.groq.com/docs/models](https://console.groq.com/docs/models) if one stops working.

**Change the colours** — the `COLORS` object at the top of `ChatbotWidget.tsx`.

---

## Troubleshooting

**"Chatbot is not configured yet. Missing GROQ_API_KEY."**
`.env.local` is missing the key, or the dev server wasn't restarted after adding it. The file must sit at the project root, next to `package.json`.

**"Couldn't load the cafe menus right now."**
Supabase couldn't be read. Check `NEXT_PUBLIC_SUPABASE_URL` has no trailing slash, that `SUPABASE_SETUP.sql` actually ran, and look at the terminal — the route logs the underlying Postgres error.

**"Groq rejected the API key." (502)**
The key is wrong, was revoked, or has a stray space. Generate a fresh one at console.groq.com.

**429 rate limited**
Groq's free tier limit was hit. Wait a minute, or add your own per-user throttle in the route.

**The bot invents prices or items**
It is answering without the menu context — confirm `menu_items` has rows and that the reply changes when you edit a price. The system prompt explicitly forbids guessing, so empty data is the usual cause.

**`Module not found: lucide-react` / `@supabase/supabase-js`**
Run `npm install @supabase/supabase-js lucide-react`.

**"You're importing a component that needs useState" error**
The `'use client'` directive must be the very first line of `ChatbotWidget.tsx`, above the imports.

**Widget doesn't appear**
Check it's mounted inside `<body>` in `app/layout.tsx`, and that nothing in your CSS sits above `z-index: 9999`.

**Nothing is written to `chat_logs`**
Logging only happens when `userId` is passed to the widget. It also needs `SUPABASE_SERVICE_ROLE_KEY` — the anon key is blocked by RLS on that table by design.

**404 on `/api/chatbot`**
The file must be at `app/api/chatbot/route.ts` (App Router). If your project uses the `pages/` router, this route format won't work.
