import { useEffect, useRef, useState } from 'react';
import { koisaApi } from '@/api/koisa.api';
import { toApiError } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useKoisaActions } from '@/hooks/useKoisaActions';
import { detectsSensitive, SENSITIVE_WARNING } from '@/lib/sensitive';
import { cn } from '@/lib/cn';

type Sender = 'user' | 'koisa' | 'system';
interface Message {
  sender: Sender;
  text: string;
}

/**
 * Koisa floating assistant. Works in both modes: anonymous visitors get public help; signed-in
 * clients get dashboard navigation + summaries. The backend derives the mode from the JWT and
 * enforces all guardrails (tool gating, PII redaction). This widget additionally:
 *   - screens the user's input locally and shows a warning if it looks sensitive (and refuses
 *     to send it), and
 *   - surfaces any backend `warning`, and
 *   - executes navigate_to_tab actions via useKoisaActions.
 */
export function KoisaWidget() {
  const { isAuthenticated } = useAuth();
  const { handleResponse } = useKoisaActions();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'koisa',
      text: "Hi, I'm Koisa. Ask me about our products, or — once you're signed in — your dashboard. Please don't share sensitive personal details here.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    // Client-side courtesy guard: warn + refuse to transmit obviously sensitive input.
    if (detectsSensitive(text)) {
      setMessages((m) => [...m, { sender: 'user', text }, { sender: 'system', text: SENSITIVE_WARNING }]);
      setInput('');
      return;
    }

    setMessages((m) => [...m, { sender: 'user', text }]);
    setInput('');
    setBusy(true);
    try {
      const res = await koisaApi.chat(text);
      if (res.warning) {
        setMessages((m) => [...m, { sender: 'system', text: res.warning as string }]);
      }
      if (res.reply) {
        setMessages((m) => [...m, { sender: 'koisa', text: res.reply }]);
      }
      const action = handleResponse(res);
      if (action.navigatedTo) {
        setMessages((m) => [...m, { sender: 'system', text: `Opened the ${action.navigatedTo.replace('_', ' ')} tab.` }]);
      }
    } catch (err) {
      setMessages((m) => [...m, { sender: 'system', text: toApiError(err).message }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open Koisa assistant"
        className={cn(
          'fixed bottom-6 right-6 z-40 flex h-14 items-center gap-2 rounded-full bg-maroon px-5 text-cream-50 shadow-lift transition-transform hover:scale-105',
          open && 'scale-0 opacity-0'
        )}
      >
        <span className="h-2.5 w-2.5 rounded-full bg-cream-50" />
        <span className="font-semibold">Ask Koisa</span>
      </button>

      {/* Drawer */}
      <div
        className={cn(
          'fixed bottom-6 right-6 z-40 flex w-[min(24rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border border-cream-300 bg-cream-50 shadow-lift transition-all',
          open ? 'h-[32rem] opacity-100' : 'pointer-events-none h-0 opacity-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-ink px-4 py-3 text-cream-50">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-maroon">
              <span className="h-2.5 w-2.5 rounded-sm border-2 border-cream-50" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-none">Koisa</p>
              <p className="text-[11px] text-cream-400">
                {isAuthenticated ? 'Dashboard assistant' : 'Public assistant'}
              </p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close" className="text-cream-300 hover:text-cream-50">
            ✕
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-ink-faint">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-maroon" />
              Koisa is thinking…
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-cream-300 p-3">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask Koisa…"
              className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-maroon"
            />
            <button
              onClick={send}
              disabled={busy}
              className="rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-maroon-light disabled:opacity-50"
            >
              Send
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-ink-faint">
            Don't share ID, banking, or medical details. Koisa can't process them.
          </p>
        </div>
      </div>
    </>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.sender === 'system') {
    return (
      <div className="rounded-lg border border-maroon/20 bg-maroon-tint px-3 py-2 text-xs text-maroon">
        {message.text}
      </div>
    );
  }
  const isUser = message.sender === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
          isUser ? 'rounded-br-sm bg-ink text-cream-50' : 'rounded-bl-sm bg-cream-200 text-ink'
        )}
      >
        {message.text}
      </div>
    </div>
  );
}
