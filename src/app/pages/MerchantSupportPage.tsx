import { useEffect, useRef, useState } from "react";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

interface Message {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderRole: "customer" | "staff" | "admin" | "merchant";
  body: string;
  createdAt: string;
}

const TEXTAREA_MAX_HEIGHT = 120;

// A merchant has exactly one conversation with staff (same one-per-user
// model customers already use) - no list needed, just the single thread.
export function MerchantSupportPage() {
  const { authHeader } = useAuth();
  const { data, refetch } = useAPI(`${API_BASE}/chat`, { headers: authHeader });
  const messages = (data?.messages ?? []) as Message[];
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const interval = setInterval(refetch, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
  }, [text]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || isSending) return;

    setIsSending(true);
    setError("");
    try {
      setText("");
      await api.post(`${API_BASE}/chat`, { body }, { headers: authHeader });
      await refetch();
    } catch (err: any) {
      setError(err.message || "Could not send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>Contact Support</h1>

      <div
        className="flex flex-col rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--color-border)', height: '70vh', backgroundColor: 'var(--color-product-card)' }}
      >
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <p className="text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Send a message and staff will get back to you shortly.
            </p>
          )}
          {messages.map((message) => {
            const isMine = message.senderRole === "merchant";
            return (
              <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[70%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap"
                  style={
                    isMine
                      ? { backgroundColor: 'var(--color-primary)', color: 'white' }
                      : { backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }
                  }
                >
                  {message.body}
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="px-4 py-2 text-sm" style={{ color: 'var(--color-error)' }}>{error}</div>
        )}

        <div className="p-4 flex gap-2 items-end" style={{ borderTop: '1px solid var(--color-border)' }}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-4 py-2 rounded-lg text-sm outline-none resize-none"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', maxHeight: TEXTAREA_MAX_HEIGHT, overflowY: 'auto' }}
          />
          <button
            onClick={handleSend}
            disabled={isSending || !text.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: isSending || !text.trim() ? 'var(--color-border)' : 'var(--color-primary)' }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
