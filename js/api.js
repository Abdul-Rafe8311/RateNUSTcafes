/**
 * API client for Concordia Eats backend.
 * Falls back to localStorage when the server is unreachable.
 */

const API_BASE = 'http://localhost:5002/api';

const Api = {
    _token() {
        return localStorage.getItem('ce_token') || '';
    },

    async _req(method, path, body) {
        const headers = { 'Content-Type': 'application/json' };
        if (this._token()) headers['Authorization'] = `Bearer ${this._token()}`;

        const res = await fetch(API_BASE + path, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Request failed');
        return data;
    },

    // ── Auth ──
    async register(name, email, password) {
        const data = await this._req('POST', '/auth/register', { name, email, password });
        localStorage.setItem('ce_token', data.data.token);
        return data.data.user;
    },

    async login(email, password) {
        const data = await this._req('POST', '/auth/login', { email, password });
        localStorage.setItem('ce_token', data.data.token);
        return data.data.user;
    },

    async me() {
        const data = await this._req('GET', '/auth/me');
        return data.data.user;
    },

    logout() {
        localStorage.removeItem('ce_token');
        localStorage.removeItem('ce_session');
    },

    // ── Reviews ──
    async getReviews(cafeId) {
        const data = await this._req('GET', `/reviews/cafe/${cafeId}`);
        return data.data; // { reviews, avg, count }
    },

    async submitReview(cafeId, rating, comment) {
        const data = await this._req('POST', '/reviews', { cafeId, rating, comment });
        return data.data.review;
    },

    async myReviews() {
        const data = await this._req('GET', '/reviews/my');
        return data.data.reviews;
    },

    async recentReviews() {
        const data = await this._req('GET', '/reviews/recent');
        return data.data.reviews;
    },

    async ping() {
        try {
            const res = await fetch(API_BASE.replace('/api', '/health'), { signal: AbortSignal.timeout(2000) });
            return res.ok;
        } catch {
            return false;
        }
    }
};

window.Api = Api;
