import { useEffect, useRef, useState } from "react";
import { X, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useChat } from "../context/ChatContext";

export function ChatPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { messages, fetchChat, sendMessage } = useChat();
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    fetchChat(true);
    const interval = setInterval(() => fetchChat(true), 8000);
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

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
              className="flex items-center justify-between px-6 h-16"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <span className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>Support Chat</span>
              <button onClick={onClose} className="p-2 -mr-2" aria-label="Close chat">
                <X className="h-5 w-5" style={{ color: 'var(--color-text-primary)' }} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <p className="text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Send a message and we'll get back to you shortly.
                </p>
              )}
              {messages.map((message) => {
                const isMine = message.senderRole === "customer";
                return (
                  <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[80%] px-4 py-2 rounded-lg text-sm"
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

            <div className="p-4 flex gap-2" style={{ borderTop: '1px solid var(--color-border)' }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 rounded-lg text-sm outline-none"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
