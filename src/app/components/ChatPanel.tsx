import { useEffect, useRef, useState } from "react";
import { X, Send, ChevronLeft, Headset, Store } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useChat, type ActiveThread } from "../context/ChatContext";

const TEXTAREA_MAX_HEIGHT = 120;

function ThreadRow({
  label,
  lastMessage,
  unreadCount,
  icon: Icon,
  onClick,
}: {
  label: string;
  lastMessage: string | null;
  unreadCount: number;
  icon: typeof Headset;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: 'var(--color-product-card)', color: 'var(--color-text-secondary)' }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
          {unreadCount > 0 && (
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--color-error)' }} />
          )}
        </div>
        <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
          {lastMessage || "No messages yet"}
        </p>
      </div>
    </button>
  );
}

function ThreadList({ onSelect }: { onSelect: (thread: ActiveThread) => void }) {
  const { merchantConversations, supportUnread } = useChat();

  return (
    <div className="flex-1 overflow-y-auto">
      <p className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        Merchants
      </p>
      {merchantConversations.length === 0 && (
        <p className="px-4 pb-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          No merchant chats yet
        </p>
      )}
      {merchantConversations.map((c) => (
        <ThreadRow
          key={c.id}
          label={c.merchantName}
          lastMessage={c.lastMessage}
          unreadCount={c.unreadCount}
          icon={Store}
          onClick={() => onSelect({ type: "merchant", merchantId: c.merchantId, merchantName: c.merchantName })}
        />
      ))}

      <p className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        Staffs
      </p>
      <ThreadRow
        label="Support"
        lastMessage="We'll get back to you shortly"
        unreadCount={supportUnread}
        icon={Headset}
        onClick={() => onSelect({ type: "support" })}
      />
    </div>
  );
}

export function ChatPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { activeThread, messages, openThread, backToList, sendMessage } = useChat();
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    try {
      setText("");
      await sendMessage(body);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const title = !activeThread ? "Chat" : activeThread.type === "support" ? "Support" : activeThread.merchantName;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md z-50 flex flex-col"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <div
              className="flex items-center gap-2 px-4 h-16"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              {activeThread && (
                <button onClick={backToList} className="p-2 -ml-2" aria-label="Back to conversations">
                  <ChevronLeft className="h-5 w-5" style={{ color: 'var(--color-text-primary)' }} />
                </button>
              )}
              <span className="flex-1 font-bold text-lg truncate" style={{ color: 'var(--color-text-primary)' }}>{title}</span>
              <button onClick={onClose} className="p-2 -mr-2" aria-label="Close chat">
                <X className="h-5 w-5" style={{ color: 'var(--color-text-primary)' }} />
              </button>
            </div>

            {!activeThread ? (
              <ThreadList onSelect={openThread} />
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.length === 0 && (
                    <p className="text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Send a message and we'll get back to you shortly.
                    </p>
                  )}
                  {messages.map((message) => {
                    const isMine = message.senderRole !== "customer";
                    return (
                      <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div
                          className="max-w-[80%] px-4 py-2 rounded-lg text-sm whitespace-pre-wrap"
                          style={
                            isMine
                              ? { backgroundColor: 'var(--color-secondary)', color: 'white' }
                              : { backgroundColor: 'var(--color-product-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }
                          }
                        >
                          {message.body}
                        </div>
                      </div>
                    );
                  })}
                </div>

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
                    aria-label="Send message"
                    className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: isSending || !text.trim() ? 'var(--color-border)' : 'var(--color-secondary)' }}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
