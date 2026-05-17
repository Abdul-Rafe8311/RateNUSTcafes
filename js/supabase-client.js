// ─── Supabase config — replace these two values ───────────────────────────
const SUPABASE_URL  = 'https://twzvnoagmmpsqqfhnpwi.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_DYe5ATXxlVEj5xzMC8qoRg_hN6w1y6W';
// ──────────────────────────────────────────────────────────────────────────

const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ── Auth ──────────────────────────────────────────────────────────────── */
const SbAuth = {
    async signUp(name, email, password, department) {
        const { data, error } = await _sb.auth.signUp({
            email,
            password,
            options: { data: { name, department } },
        });
        if (error) throw new Error(error.message);
        return { user: data.user, session: data.session, name, department };
    },

    async verifyOtp(email, token) {
        const { data, error } = await _sb.auth.verifyOtp({ email, token, type: 'signup' });
        if (error) throw new Error(error.message);
        return data.session;
    },

    async resendOtp(email) {
        const { error } = await _sb.auth.resend({ email, type: 'signup' });
        if (error) throw new Error(error.message);
    },

    async signIn(email, password) {
        const { data, error } = await _sb.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        return data.session;
    },

    async signOut() {
        await _sb.auth.signOut();
    },

    async getSession() {
        const { data } = await _sb.auth.getSession();
        return data.session;
    },

    async getProfile(userId) {
        const { data, error } = await _sb.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (error) throw new Error(error.message);
        return data; // null if profile doesn't exist yet
    },

    async ensureProfile(userId, name, department) {
        const existing = await this.getProfile(userId);
        if (existing) return existing;
        const { data, error } = await _sb.from('profiles').insert({ id: userId, name, department }).select().single();
        if (error && error.code !== '23505') throw new Error(error.message);
        return data || { name, department };
    },
};

/* ── Reviews ───────────────────────────────────────────────────────────── */
const SbReviews = {
    async forCafe(cafeId) {
        const { data, error } = await _sb
            .from('reviews').select('*')
            .eq('cafe_id', cafeId)
            .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);

        const avg = data.length
            ? (data.reduce((s, r) => s + r.rating, 0) / data.length).toFixed(1)
            : null;
        return { reviews: data, avg, count: data.length };
    },

    async submit(cafeId, userId, department, rating, comment) {
        const { data, error } = await _sb.from('reviews').insert({
            cafe_id: cafeId, user_id: userId, department,
            rating, comment: comment || '',
        }).select().single();

        if (error) {
            if (error.code === '23503') throw new Error('Session expired — please log out and log back in.');
            throw new Error(error.message);
        }
        return data;
    },

    async update(reviewId, rating, comment) {
        const { data, error } = await _sb.from('reviews')
            .update({ rating, comment: comment || '' })
            .eq('id', reviewId)
            .select().single();
        if (error) throw new Error(error.message);
        return data;
    },

    async mine(userId) {
        const { data, error } = await _sb.from('reviews').select('*').eq('user_id', userId);
        if (error) throw new Error(error.message);
        return data;
    },

    async recent(limit = 20) {
        const { data, error } = await _sb.from('reviews').select('*')
            .order('created_at', { ascending: false }).limit(limit);
        if (error) throw new Error(error.message);
        return data;
    },
};

/* ── Item Ratings ──────────────────────────────────────────────────────── */
const SbItems = {
    async ratingsForCafe(cafeId) {
        const { data, error } = await _sb.from('item_reviews')
            .select('item_id, rating').eq('cafe_id', cafeId);
        if (error) throw new Error(error.message);
        // aggregate: { itemId -> { avg, count } }
        const map = {};
        data.forEach(r => {
            if (!map[r.item_id]) map[r.item_id] = { sum: 0, count: 0 };
            map[r.item_id].sum += r.rating;
            map[r.item_id].count++;
        });
        Object.keys(map).forEach(k => {
            map[k].avg = (map[k].sum / map[k].count).toFixed(1);
        });
        return map;
    },

    async myRatings(userId) {
        const { data, error } = await _sb.from('item_reviews')
            .select('item_id, rating').eq('user_id', userId);
        if (error) throw new Error(error.message);
        const map = {};
        data.forEach(r => { map[r.item_id] = r.rating; });
        return map;
    },

    async rate(cafeId, itemId, userId, department, rating) {
        const { error } = await _sb.from('item_reviews').upsert({
            cafe_id: cafeId, item_id: itemId,
            user_id: userId, department, rating,
        }, { onConflict: 'item_id,user_id' });
        if (error) throw new Error(error.message);
    },
};

window._sb       = _sb;
window.SbAuth    = SbAuth;
window.SbReviews = SbReviews;
window.SbItems   = SbItems;
