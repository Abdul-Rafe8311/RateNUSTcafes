'use client';

/**
 * Concordia Eats — floating AI chat widget.
 *
 * Drop <ChatbotWidget /> into app/layout.tsx (inside <body>) and it renders a
 * gold bubble in the bottom-right corner that opens a 396 x 600 chat window
 * talking to POST /api/chatbot.
 *
 * Styling is inline so the component works in any Next.js app without needing
 * Tailwind, CSS modules or a global stylesheet.
 */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle, X, Send, Loader } from 'lucide-react';

// ── Concordia colour scheme ─────────────────────────────────────────
const COLORS = {
  accent: '#C8975A',       // gold
  bg: '#0D0D0D',           // dark background
  surface: '#161616',      // panels
  botBubble: '#2A2A2A',    // bot message background
  text: '#F0EDE6',         // primary text
  textDark: '#0D0D0D',     // text on gold
  border: 'rgba(255,255,255,0.08)',
  muted: 'rgba(240,237,230,0.55)',
} as const;

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

interface ChatbotWidgetProps {
  /** Passed to the API so the exchange is written to chat_logs. Optional. */
  userId?: string;
}

const REQUEST_TIMEOUT_MS = 30_000; // give up rather than spin forever

const WELCOME_TEXT =
  "Hi! 👋 I'm Concordia Helper. Ask me anything about our 4 cafes — menus, prices, " +
  'locations or what to order.';

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChatbotWidget({ userId }: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Welcome message, added the first time the window is opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        { id: newId(), role: 'bot', text: WELCOME_TEXT, timestamp: new Date() },
      ]);
    }
    if (isOpen) inputRef.current?.focus();
  }, [isOpen, messages.length]);

  // Auto-scroll to the latest message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  // Esc closes the window
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();

    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: newId(),
      role: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const addBotMessage = (botText: string) =>
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: 'bot', text: botText, timestamp: new Date() },
      ]);

    // Client-side timeout, so a hung request can't spin forever
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      // userId is always sent — null when nobody is signed in, so the server
      // sees an explicit value rather than a missing key.
      const payload = { message: text, userId: userId ?? null };
      console.log('[chatbot] POST /api/chatbot', payload);

      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      console.log('[chatbot] HTTP', response.status, response.statusText);

      // Read the body once as text — an error page may not be JSON at all
      const raw = await response.text();
      let data: { success?: boolean; message?: string; error?: string } | null = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        console.error('[chatbot] response was not JSON:', raw.slice(0, 300));
      }

      // Validate the status code before trusting the payload
      if (!response.ok) {
        const serverMsg = data?.error ?? data?.message;
        console.error('[chatbot] server error', response.status, serverMsg ?? raw.slice(0, 300));
        throw new Error(
          serverMsg ??
            `Server returned HTTP ${response.status} (${response.statusText || 'error'}).`,
        );
      }
      if (!data) throw new Error(`Server sent a response I could not read (HTTP ${response.status}).`);
      if (!data.success || !data.message) {
        throw new Error(data.error ?? 'Server replied without a message.');
      }

      addBotMessage(data.message);
    } catch (err) {
      console.error('[chatbot] request failed:', err);

      if (timedOut || (err instanceof Error && err.name === 'AbortError')) {
        addBotMessage(
          `That took longer than ${REQUEST_TIMEOUT_MS / 1000} seconds, so I stopped waiting. Please try again.`,
        );
      } else if (err instanceof TypeError || (err instanceof Error && err.name === 'TypeError')) {
        // fetch rejects with TypeError when the request never reached a server
        // (server down, wrong URL, DNS, CORS rejection). The name check also
        // catches errors thrown in another realm, where instanceof fails.
        addBotMessage(
          "I can't reach the chatbot API. Check that the dev server is running, then try again.",
        );
      } else {
        addBotMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      clearTimeout(timer);
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  // ── Closed state: floating button ─────────────────────────────────
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open Concordia Helper chat"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: COLORS.accent,
          color: COLORS.textDark,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
          transition: 'transform 0.2s ease',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.06)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <MessageCircle size={24} strokeWidth={2} />
      </button>
    );
  }

  // ── Open state: chat window ───────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-label="Concordia Helper chat"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        width: 396,
        maxWidth: 'calc(100vw - 32px)',
        height: 600,
        maxHeight: 'calc(100vh - 48px)',
        display: 'flex',
        flexDirection: 'column',
        background: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: COLORS.text,
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '14px 16px',
          background: COLORS.surface,
          borderBottom: `1px solid ${COLORS.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: COLORS.accent,
              color: COLORS.textDark,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MessageCircle size={18} strokeWidth={2.2} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
              Concordia Helper
            </div>
            <div style={{ fontSize: 11.5, color: COLORS.muted }}>Powered by AI</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Close chat"
          style={{
            background: 'transparent',
            border: 'none',
            color: COLORS.muted,
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            borderRadius: 6,
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = COLORS.text;
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = COLORS.muted;
          }}
        >
          <X size={18} />
        </button>
      </header>

      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div
              key={message.id}
              style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '82%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                gap: 4,
              }}
            >
              <div
                style={{
                  background: isUser ? COLORS.accent : COLORS.botBubble,
                  color: isUser ? COLORS.textDark : COLORS.text,
                  padding: '10px 13px',
                  borderRadius: 12,
                  borderBottomRightRadius: isUser ? 4 : 12,
                  borderBottomLeftRadius: isUser ? 12 : 4,
                  fontSize: 14,
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {message.text}
              </div>
              <span style={{ fontSize: 10.5, color: COLORS.muted }}>
                {formatTime(message.timestamp)}
              </span>
            </div>
          );
        })}

        {/* Loading indicator */}
        {isLoading && (
          <div
            style={{
              alignSelf: 'flex-start',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: COLORS.botBubble,
              color: COLORS.muted,
              padding: '10px 13px',
              borderRadius: 12,
              borderBottomLeftRadius: 4,
              fontSize: 13.5,
            }}
          >
            <Loader
              size={15}
              style={{ animation: 'concordia-spin 1s linear infinite', flexShrink: 0 }}
            />
            Thinking...
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <form
        onSubmit={sendMessage}
        style={{
          display: 'flex',
          gap: 8,
          padding: 12,
          background: COLORS.surface,
          borderTop: `1px solid ${COLORS.border}`,
          flexShrink: 0,
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          maxLength={500}
          placeholder="Ask about menu, prices, recommendations..."
          aria-label="Message"
          style={{
            flex: 1,
            minWidth: 0,
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: '10px 12px',
            color: COLORS.text,
            fontSize: 13.5,
            fontFamily: 'inherit',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = COLORS.accent;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = COLORS.border;
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          aria-label="Send message"
          style={{
            width: 42,
            flexShrink: 0,
            background: COLORS.accent,
            color: COLORS.textDark,
            border: 'none',
            borderRadius: 10,
            cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: isLoading || !input.trim() ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'opacity 0.2s ease',
          }}
        >
          <Send size={17} />
        </button>
      </form>

      {/* Spinner keyframes — scoped by a unique animation name */}
      <style>{`
        @keyframes concordia-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
