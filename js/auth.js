const NUST_DOMAINS = [
    'seecs.edu.pk', 'nbs.nust.edu.pk', 'smme.nust.edu.pk', 'scme.nust.edu.pk',
    's3h.nust.edu.pk', 'nust.edu.pk', 'pnec.edu.pk', 'mcs.edu.pk',
    'iese.edu.pk', 'asab.nust.edu.pk', 'igis.nust.edu.pk', 'rimms.nust.edu.pk',
    'sns.nust.edu.pk', 'nice.nust.edu.pk', 'camp.nust.edu.pk', 'cae.nust.edu.pk',
];

const DEPT_NAMES = {
    'seecs.edu.pk': 'SEECS', 'nbs.nust.edu.pk': 'NBS', 'smme.nust.edu.pk': 'SMME',
    'scme.nust.edu.pk': 'SCME', 's3h.nust.edu.pk': 'S3H', 'nust.edu.pk': 'NUST',
    'pnec.edu.pk': 'PNEC', 'mcs.edu.pk': 'MCS', 'iese.edu.pk': 'IESE',
    'asab.nust.edu.pk': 'ASAB', 'igis.nust.edu.pk': 'IGIS', 'rimms.nust.edu.pk': 'RIMMS',
    'sns.nust.edu.pk': 'SNS', 'nice.nust.edu.pk': 'NICE', 'camp.nust.edu.pk': 'CAMP',
    'cae.nust.edu.pk': 'CAE',
};

const Auth = {
    _supabaseReady() {
        return typeof SbAuth !== 'undefined' &&
            typeof SUPABASE_URL !== 'undefined' &&
            SUPABASE_URL !== 'YOUR_SUPABASE_URL';
    },

    validateNUST(email) {
        const domain = email.toLowerCase().trim().split('@')[1];
        return domain ? NUST_DOMAINS.includes(domain) : false;
    },

    getDept(email) {
        const domain = email.toLowerCase().split('@')[1];
        return DEPT_NAMES[domain] || 'NUST';
    },

    async signup(name, email, password) {
        email = email.toLowerCase().trim();
        if (!this.validateNUST(email)) throw new Error('Please use your NUST institutional email.');

        const department = this.getDept(email);

        if (this._supabaseReady()) {
            const result = await SbAuth.signUp(name, email, password, department);
            const session = result.session || (await SbAuth.signIn(email, password));
            // Ensure profile exists regardless of whether trigger fired
            await SbAuth.ensureProfile(result.user.id, name, department);
            this._saveSession({
                id: result.user.id, name, email, department,
                _at: session.access_token, _rt: session.refresh_token,
            });
            return result.user;
        }

        // localStorage fallback
        const existing = DB.findOne('users', 'email', email);
        if (existing) throw new Error('An account with this email already exists. Please log in.');
        const user = DB.insert('users', { name: name.trim(), email, password, department });
        this._saveSession(user);
        return user;
    },

    async login(email, password) {
        email = email.toLowerCase().trim();
        if (!this.validateNUST(email)) throw new Error('Please use your NUST institutional email.');

        if (this._supabaseReady()) {
            const session = await SbAuth.signIn(email, password);
            const department = this.getDept(email);
            const meta = session.user.user_metadata || {};
            const name = meta.name || email.split('@')[0];
            // Get or create profile — never crash if missing
            const profile = await SbAuth.ensureProfile(session.user.id, name, department);
            const userData = {
                id: session.user.id,
                name: profile.name || name,
                email,
                department: profile.department || department,
                _at: session.access_token, _rt: session.refresh_token,
            };
            this._saveSession(userData);
            return userData;
        }

        // localStorage fallback
        const user = DB.findOne('users', 'email', email);
        if (!user) throw new Error('No account found. Please sign up first.');
        if (user.password !== password) throw new Error('Incorrect password.');
        this._saveSession(user);
        return user;
    },

    _saveSession(user) {
        localStorage.setItem('ce_session', JSON.stringify({
            id: user.id, name: user.name, email: user.email, department: user.department,
            _at: user._at || null, _rt: user._rt || null,
        }));
    },

    async restoreSession() {
        if (!this._supabaseReady()) return;
        // Best-effort: try to establish a Supabase session.
        // RLS policies no longer block inserts even if this fails.
        try {
            const { data: { session: native } } = await _sb.auth.getSession();
            if (native) return;
            const stored = this.getUser();
            if (stored && stored._at) {
                const { data } = await _sb.auth.setSession({ access_token: stored._at, refresh_token: stored._rt });
                if (data && data.session) {
                    stored._at = data.session.access_token;
                    stored._rt = data.session.refresh_token;
                    this._saveSession(stored);
                }
            }
        } catch (_) {}
    },

    getUser() {
        const s = localStorage.getItem('ce_session');
        return s ? JSON.parse(s) : null;
    },

    isLoggedIn() { return !!this.getUser(); },

    logout() {
        if (this._supabaseReady()) SbAuth.signOut();
        localStorage.removeItem('ce_session');
        window.location.href = 'index.html';
    },

    requireAuth() {
        if (!this.isLoggedIn()) { window.location.href = 'login.html'; return false; }
        return true;
    },
};

window.Auth = Auth;
window.NUST_DOMAINS = NUST_DOMAINS;
window.DEPT_NAMES = DEPT_NAMES;
