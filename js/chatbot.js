/**
 * Concordia Helper — floating AI chat widget (vanilla JS).
 *
 * Drop this on any page:  <script src="js/chatbot.js"></script>
 * It builds its own DOM and styles, so it needs no markup and no CSS changes.
 *
 * Talks to POST {API_BASE}/chatbot on the Express backend, which calls
 * Groq with the live Supabase menu data.
 *
 * Optional overrides — set before this script loads:
 *   window.CHATBOT_API_URL = 'https://your-api.com/api/chatbot';
 *   window.CHATBOT_USER_ID = 'student-id';   // enables chat_logs logging
 */
(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────
  var API_URL = window.CHATBOT_API_URL || 'http://localhost:5002/api/chatbot';
  var MAX_LENGTH = 500;
  var REQUEST_TIMEOUT_MS = 30000; // give up rather than spin forever

  // Concordia Eats palette
  var C = {
    accent: '#C8975A',
    bg: '#0D0D0D',
    surface: '#161616',
    botBubble: '#2A2A2A',
    text: '#F0EDE6',
    textDark: '#0D0D0D',
    border: 'rgba(255,255,255,0.08)',
    muted: 'rgba(240,237,230,0.55)'
  };

  var WELCOME = "Hi! 👋 I'm Concordia Helper. Ask me anything about our 4 cafes — " +
    'menus, prices, locations or what to order.';

  // Lucide-style inline SVGs (same icon set as the React widget, no dependency)
  var ICONS = {
    messageCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    loader: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>'
  };

  var isOpen = false;
  var isLoading = false;
  var hasWelcomed = false;
  var els = {};

  // ── Helpers ───────────────────────────────────────────────────────
  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Everything from the API is inserted as text, never HTML
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function icon(name, size) {
    var wrap = document.createElement('span');
    wrap.style.cssText = 'display:inline-flex;width:' + size + 'px;height:' + size + 'px;flex-shrink:0;';
    wrap.innerHTML = ICONS[name];
    var svg = wrap.firstChild;
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    return wrap;
  }

  // ── Styles (scoped by the ce-chat- prefix) ────────────────────────
  function injectStyles() {
    if (document.getElementById('ce-chat-styles')) return;
    var css = document.createElement('style');
    css.id = 'ce-chat-styles';
    css.textContent = [
      '@keyframes ce-chat-spin { to { transform: rotate(360deg); } }',
      '@keyframes ce-chat-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }',
      '#ce-chat-window { animation: ce-chat-in 0.22s ease-out; }',
      '#ce-chat-btn:hover { transform: scale(1.06); }',
      '#ce-chat-messages::-webkit-scrollbar { width: 6px; }',
      '#ce-chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 3px; }',
      '#ce-chat-input::placeholder { color: ' + C.muted + '; }',
      '#ce-chat-input:focus { border-color: ' + C.accent + '; }',
      '@media (max-width: 480px) {',
      '  #ce-chat-window { width: calc(100vw - 24px) !important; height: calc(100vh - 96px) !important; right: 12px !important; }',
      '}'
    ].join('\n');
    document.head.appendChild(css);
  }

  // ── Floating button ───────────────────────────────────────────────
  function buildButton() {
    var btn = document.createElement('button');
    btn.id = 'ce-chat-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Open Concordia Helper chat');
    btn.style.cssText = [
      'position:fixed', 'bottom:24px', 'right:24px', 'z-index:9999',
      'width:56px', 'height:56px', 'border-radius:50%',
      'background:' + C.accent, 'color:' + C.textDark, 'border:none',
      'cursor:pointer', 'display:flex', 'align-items:center', 'justify-content:center',
      'box-shadow:0 8px 28px rgba(0,0,0,0.35)', 'transition:transform 0.2s ease',
      'padding:0'
    ].join(';');
    btn.appendChild(icon('messageCircle', 24));
    btn.addEventListener('click', open);
    return btn;
  }

  // ── Chat window ───────────────────────────────────────────────────
  function buildWindow() {
    var win = document.createElement('div');
    win.id = 'ce-chat-window';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-label', 'Concordia Helper chat');
    win.style.cssText = [
      'position:fixed', 'bottom:24px', 'right:24px', 'z-index:9999',
      'width:396px', 'max-width:calc(100vw - 32px)',
      'height:600px', 'max-height:calc(100vh - 48px)',
      'display:none', 'flex-direction:column',
      'background:' + C.bg, 'border:1px solid ' + C.border, 'border-radius:16px',
      'overflow:hidden', 'box-shadow:0 24px 64px rgba(0,0,0,0.45)',
      'font-family:Lexend,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
      'color:' + C.text
    ].join(';');

    // Header
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;' +
      'padding:14px 16px;background:' + C.surface + ';border-bottom:1px solid ' + C.border + ';flex-shrink:0;';

    var brand = document.createElement('div');
    brand.style.cssText = 'display:flex;align-items:center;gap:10px;min-width:0;';

    var avatar = document.createElement('span');
    avatar.style.cssText = 'width:34px;height:34px;border-radius:50%;background:' + C.accent +
      ';color:' + C.textDark + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;';
    avatar.appendChild(icon('messageCircle', 18));

    var titles = document.createElement('div');
    titles.innerHTML =
      '<div style="font-size:15px;font-weight:700;letter-spacing:-0.01em;">Concordia Helper</div>' +
      '<div style="font-size:11.5px;color:' + C.muted + ';">Powered by AI</div>';

    brand.appendChild(avatar);
    brand.appendChild(titles);

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close chat');
    closeBtn.style.cssText = 'background:transparent;border:none;color:' + C.muted +
      ';cursor:pointer;padding:4px;display:flex;border-radius:6px;';
    closeBtn.appendChild(icon('x', 18));
    closeBtn.addEventListener('click', close);
    closeBtn.addEventListener('mouseover', function () { closeBtn.style.color = C.text; });
    closeBtn.addEventListener('mouseout', function () { closeBtn.style.color = C.muted; });

    header.appendChild(brand);
    header.appendChild(closeBtn);

    // Messages
    var messages = document.createElement('div');
    messages.id = 'ce-chat-messages';
    messages.style.cssText = 'flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;';

    // Input row
    var form = document.createElement('form');
    form.style.cssText = 'display:flex;gap:8px;padding:12px;background:' + C.surface +
      ';border-top:1px solid ' + C.border + ';flex-shrink:0;';

    var input = document.createElement('input');
    input.id = 'ce-chat-input';
    input.type = 'text';
    input.maxLength = MAX_LENGTH;
    input.placeholder = 'Ask about menu, prices, recommendations...';
    input.setAttribute('aria-label', 'Message');
    input.style.cssText = 'flex:1;min-width:0;background:' + C.bg + ';border:1px solid ' + C.border +
      ';border-radius:10px;padding:10px 12px;color:' + C.text +
      ';font-size:13.5px;font-family:inherit;outline:none;';

    var sendBtn = document.createElement('button');
    sendBtn.id = 'ce-chat-send';
    sendBtn.type = 'submit';
    sendBtn.setAttribute('aria-label', 'Send message');
    sendBtn.style.cssText = 'width:42px;flex-shrink:0;background:' + C.accent + ';color:' + C.textDark +
      ';border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;' +
      'justify-content:center;transition:opacity 0.2s ease;padding:0;';
    sendBtn.appendChild(icon('send', 17));

    form.appendChild(input);
    form.appendChild(sendBtn);
    form.addEventListener('submit', onSubmit);
    input.addEventListener('input', syncSendButton);

    win.appendChild(header);
    win.appendChild(messages);
    win.appendChild(form);

    els.messages = messages;
    els.input = input;
    els.sendBtn = sendBtn;
    return win;
  }

  // ── Messages ──────────────────────────────────────────────────────
  function addMessage(role, text) {
    var isUser = role === 'user';

    var row = document.createElement('div');
    row.style.cssText = 'align-self:' + (isUser ? 'flex-end' : 'flex-start') +
      ';max-width:82%;display:flex;flex-direction:column;align-items:' +
      (isUser ? 'flex-end' : 'flex-start') + ';gap:4px;';

    var bubble = document.createElement('div');
    bubble.style.cssText = 'background:' + (isUser ? C.accent : C.botBubble) +
      ';color:' + (isUser ? C.textDark : C.text) +
      ';padding:10px 13px;border-radius:12px;' +
      'border-bottom-' + (isUser ? 'right' : 'left') + '-radius:4px;' +
      'font-size:14px;line-height:1.55;white-space:pre-wrap;word-break:break-word;';
    bubble.textContent = text; // textContent, never innerHTML — API output is untrusted

    var time = document.createElement('span');
    time.style.cssText = 'font-size:10.5px;color:' + C.muted + ';';
    time.textContent = formatTime(new Date());

    row.appendChild(bubble);
    row.appendChild(time);
    els.messages.appendChild(row);
    scrollToBottom();
  }

  function showLoading() {
    var row = document.createElement('div');
    row.id = 'ce-chat-loading';
    row.style.cssText = 'align-self:flex-start;display:flex;align-items:center;gap:8px;background:' +
      C.botBubble + ';color:' + C.muted + ';padding:10px 13px;border-radius:12px;' +
      'border-bottom-left-radius:4px;font-size:13.5px;';
    var spinner = icon('loader', 15);
    spinner.style.animation = 'ce-chat-spin 1s linear infinite';
    row.appendChild(spinner);
    row.appendChild(document.createTextNode('Thinking...'));
    els.messages.appendChild(row);
    scrollToBottom();
  }

  function hideLoading() {
    var row = document.getElementById('ce-chat-loading');
    if (row) row.remove();
  }

  function scrollToBottom() {
    els.messages.scrollTo({ top: els.messages.scrollHeight, behavior: 'smooth' });
  }

  function syncSendButton() {
    var disabled = isLoading || !els.input.value.trim();
    els.sendBtn.disabled = disabled;
    els.sendBtn.style.opacity = disabled ? '0.5' : '1';
    els.sendBtn.style.cursor = disabled ? 'not-allowed' : 'pointer';
  }

  // ── Send ──────────────────────────────────────────────────────────
  function onSubmit(event) {
    event.preventDefault();
    var text = els.input.value.trim();
    if (!text || isLoading) return;

    addMessage('user', text);
    els.input.value = '';
    isLoading = true;
    els.input.disabled = true;
    syncSendButton();
    showLoading();

    // userId is always present in the payload — null when nobody is signed in,
    // so the server sees an explicit value rather than a missing key.
    var payload = { message: text, userId: window.CHATBOT_USER_ID || null };

    // Client-side timeout, so a hung request can't leave "Thinking..." forever.
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timedOut = false;
    var timer = setTimeout(function () {
      timedOut = true;
      if (controller) controller.abort();
    }, REQUEST_TIMEOUT_MS);

    console.log('[chatbot] POST', API_URL, payload);

    // Wrapped so a synchronous throw (no fetch, blocked by CSP, bad URL) still
    // clears the loading state instead of leaving "Thinking..." on screen.
    var request;
    try {
      request = fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller ? controller.signal : undefined
      });
    } catch (err) {
      request = Promise.reject(err);
    }

    request
      .then(function (res) {
        console.log('[chatbot] HTTP', res.status, res.statusText);
        // Read the body once as text — an error page may not be JSON at all.
        return res.text().then(function (raw) {
          var data = null;
          try { data = raw ? JSON.parse(raw) : null; } catch (e) {
            console.error('[chatbot] response was not JSON:', raw.slice(0, 300));
          }

          // Validate the status code before trusting the payload
          if (!res.ok) {
            var serverMsg = data && (data.error || data.message);
            console.error('[chatbot] server error', res.status, serverMsg || raw.slice(0, 300));
            throw new Error(serverMsg || ('Server returned HTTP ' + res.status + ' (' + (res.statusText || 'error') + ').'));
          }
          if (!data) throw new Error('Server sent a response I could not read (HTTP ' + res.status + ').');
          if (!data.success || !data.message) {
            throw new Error(data.error || 'Server replied without a message.');
          }
          return data.message;
        });
      })
      .then(function (reply) {
        hideLoading();
        addMessage('bot', reply);
      })
      .catch(function (err) {
        hideLoading();
        console.error('[chatbot] request failed:', err);

        var msg;
        if (timedOut || err.name === 'AbortError') {
          msg = 'That took longer than ' + (REQUEST_TIMEOUT_MS / 1000) +
            ' seconds, so I stopped waiting. Please try again.';
        } else if (err instanceof TypeError || err.name === 'TypeError') {
          // fetch rejects with TypeError when the request never reached a server
          // (server down, wrong port, DNS, CORS rejection). The name check also
          // catches errors thrown in another realm, where instanceof fails.
          msg = "I can't reach the server at " + API_URL + '. ' +
            'Check that the backend is running (cd backend && npm run dev), then try again.';
        } else {
          msg = err.message || 'Something went wrong. Please try again.';
        }
        addMessage('bot', msg);
      })
      .finally(function () {
        clearTimeout(timer);
        isLoading = false;
        els.input.disabled = false;
        syncSendButton();
        els.input.focus();
      });
  }

  // ── Open / close ──────────────────────────────────────────────────
  function open() {
    isOpen = true;
    els.btn.style.display = 'none';
    els.win.style.display = 'flex';
    if (!hasWelcomed) {
      addMessage('bot', WELCOME);
      hasWelcomed = true;
    }
    syncSendButton();
    els.input.focus();
  }

  function close() {
    isOpen = false;
    els.win.style.display = 'none';
    els.btn.style.display = 'flex';
  }

  // ── Init ──────────────────────────────────────────────────────────
  function init() {
    if (document.getElementById('ce-chat-btn')) return; // already mounted
    injectStyles();
    els.btn = buildButton();
    els.win = buildWindow();
    document.body.appendChild(els.btn);
    document.body.appendChild(els.win);
    syncSendButton();

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) close();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exposed for debugging from the console
  window.ConcordiaChat = { open: open, close: close };
})();
