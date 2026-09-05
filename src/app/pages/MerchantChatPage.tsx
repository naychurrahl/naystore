import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

interface ConversationSummary {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderRole: "customer" | "merchant" | "staff" | "admin";
  body: string;
  createdAt: string;
}

const TEXTAREA_MAX_HEIGHT = 120;

// A staff/admin reply can appear in this thread once staff has stepped in on
// an unanswered conversation - shown with its own label so it's never
// mistaken for something the customer said.
const senderLabel = (role: Message["senderRole"]): string | null =>
  role === "staff" || role === "admin" ? "Naychurrahl Support" : null;

function ConversationRow({
  conversation,
  isActive,
  onClick,
}: {
  conversation: ConversationSummary;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 transition-colors"
      style={{
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
          {conversation.userName || conversation.userEmail}
        </span>
        {conversation.unreadCount > 0 && (
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--color-error)' }} />
        )}
      </div>
      <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
        {conversation.lastMessage || "No messages yet"}
      </p>
    </button>
  );
}

export function MerchantChatPage() {
  const { authHeader } = useAuth();
  const { data: conversationsData, refetch: refetchConversations } = useAPI(`${API_BASE}/merchant-chat`, { headers: authHeader });
  const conversations = (conversationsData ?? []) as ConversationSummary[];

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchThread = async (conversationId: string) => {
    try {
      const data = await api.get(`${API_BASE}/merchant-chat/${conversationId}`, { headers: authHeader });
      setMessages(data.messages ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const interval = setInterval(refetchConversations, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeId) return;

    fetchThread(activeId);
    const interval = setInterval(() => fetchThread(activeId), 8000);
    return () => clearInterval(interval);
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
  }, [text]);

  // Each conversation gets its own blank draft - a half-typed reply to one
  // client shouldn't show up when switching to another.
  useEffect(() => {
    setText("");
    setError("");
  }, [activeId]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || !activeId || isSending) return;

    setIsSending(true);
    setError("");
    try {
      setText("");
      await api.post(`${API_BASE}/merchant-chat`, { conversationId: activeId, body }, { headers: authHeader });
      await Promise.all([fetchThread(activeId), refetchConversations()]);
    } catch (err: any) {
      setError(err.message || "Could not send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>My Chats</h1>

      <div
        className="flex flex-col lg:flex-row rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--color-border)', height: '70vh', backgroundColor: 'var(--color-product-card)' }}
      >
        <div
          className={`${activeId ? "hidden lg:block" : "block"} w-full lg:w-72 min-h-0 overflow-y-auto lg:shrink-0`}
          style={{ borderRight: '1px solid var(--color-border)' }}
        >
          {conversations.map((conversation) => (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              isActive={activeId === conversation.id}
              onClick={() => setActiveId(conversation.id)}
            />
          ))}

          {conversations.length === 0 && (
            <p className="text-center text-sm py-8 px-4" style={{ color: 'var(--color-text-muted)' }}>
              No conversations yet
            </p>
          )}
        </div>

        <div className={`${activeId ? "flex" : "hidden lg:flex"} flex-1 flex-col min-w-0 min-h-0`}>
          {!activeId ? (
            <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Select a conversation
            </div>
          ) : (
            <>
              <button
                onClick={() => setActiveId(null)}
                className="lg:hidden flex items-center gap-1 px-4 py-3 text-sm"
                style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                <ChevronLeft className="h-4 w-4" />
                {activeConversation?.userName || activeConversation?.userEmail || "Back to conversations"}
              </button>

              <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => {
                  const isMine = message.senderRole === "merchant";
                  const label = !isMine ? senderLabel(message.senderRole) : null;
                  return (
                    <div key={message.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                      {label && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide mb-0.5 px-1" style={{ color: 'var(--color-text-muted)' }}>
                          {label}
                        </span>
                      )}
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
                  placeholder="Type a reply..."
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
