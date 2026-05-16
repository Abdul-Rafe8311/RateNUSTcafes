# ☕ Rate  NUST  Cafes

A café rating and review platform built **by NUST student, for NUST students**.

Find your perfect campus café through honest ratings and reviews from real students — no more wasting your recess wondering where to eat.

🔗 **Live:** https://rate-nust-cafes.vercel.app

---

## 📖 About

When I came to NUST, my entire first semester went into one question: *which café do I go to for recess?* My friends and I would swear we'd "try something new" — and still end up with C1 ka roll paratha or C4 ki biryani every time.

So I built the thing I wished existed. **Rate Deez NUST** helps students discover campus cafés through ratings and reviews from actual students. Sign-in is restricted to verified NUST emails, so it stays a Nustian-only space.

> Crossed **100+ users in under 24 hours** of launch 🚀

---

## ✨ Features

- 🔐 **NUST email verification** — only students with a valid NUST email can sign in
- ⭐ **Multi-dimensional ratings** — rate cafés on food quality, value for money, and ambiance/service
- 📝 **Reviews** — leave and read honest feedback from fellow students
- 🍽️ **Menu rating** — rate individual menu items, not just the café
- 🏆 **Leaderboard** — see which cafés are ranked highest
- 🔍 **Search** — quickly find cafés across campus

---

## 🛠️ Tech Stack

| Layer    | Technology              |
|----------|-------------------------|
| Frontend | HTML, CSS, JavaScript   |
| Backend  | Supabase                |
| Auth     | Supabase Auth (email)   |
| Database | Supabase (PostgreSQL)   |

---

## 📁 Project Structure
RateNUSTcafes/
├── backend/              # Backend logic
├── css/                  # Stylesheets
├── images/               # Static assets
├── js/                   # JavaScript (auth, app logic)
├── cafe-detail.html      # Individual café page
├── cafe.html             # Café listing
├── dashboard.html        # User dashboard
├── index.html            # Landing page
├── leaderboard.html      # Café rankings
├── login.html            # Login / sign-up
├── search.html           # Search page
└── supabase-schema.sql   # Database schema

---

## 🚀 Getting Started

1. Clone the repository
```bash
   git clone https://github.com/Abdul-Rafe8311/RateNUSTcafes.git
```
2. Set up a Supabase project and run `supabase-schema.sql` to create the tables.
3. Add your Supabase URL and anon key to the config in `js/`.
4. Open `index.html` in your browser (or serve it with a local server).

---

## 🗺️ Roadmap

- [ ] Fix "Invalid" date display on review form
- [ ] Fix loading issue after café review submission
- [ ] Add more cafés (Retro, Coffee Lounge, etc.)
- [ ] CV-based photo verification for reviews
- [ ] Improved spam / abuse protection

---

## 🤝 Contributing

Feedback and suggestions are always welcome — open an issue or reach out.

---

## 👤 Author

**Abdul Rafe Khalid**
Computer Science @ NUST
