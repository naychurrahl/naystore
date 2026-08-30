import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { getGuestId } from "../utils/guestId.js";
import { useAuth } from "./AuthContext";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderRole: "customer" | "staff" | "admin";
  body: string;
  createdAt: string;
}

interface ChatContextValue {
  messages: ChatMessage[];
  unreadCount: number;
  fetchChat: (markRead?: boolean) => Promise<void>;
  sendMessage: (body: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

// Customer-facing support chat, open to guests too (same guestId identity
// guest checkout already uses) - staff/admin use the CMS's own Chat page
// instead, so this only ever talks to the customer/guest shape of GET/POST
// /chat (a single conversation with a badge-only unread count until opened).
export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, authHeader } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const guestParam = () => (user ? "" : `&guestId=${encodeURIComponent(getGuestId())}`);

  const fetchChat = async (markRead = true) => {
    try {
      const data = await api.get(`${API_BASE}/chat?markRead=${markRead ? "1" : "0"}${guestParam()}`, { headers: authHeader });
      setUnreadCount(data.unreadCount ?? 0);
      setMessages(data.messages ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async (body: string) => {
    const payload: Record<string, string> = { body };
    if (!user) payload.guestId = getGuestId();
    await api.post(`${API_BASE}/chat`, payload, { headers: authHeader });
    await fetchChat(true);
  };

  // Badge-only poll for anyone who can actually chat (customer, or a guest -
  // just not staff/admin); the panel itself polls faster (and marks read)
  // only while actually open, see ChatPanel.
  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "staff")) {
      setMessages([]);
      setUnreadCount(0);
      return;
    }

    fetchChat(false);
    const interval = setInterval(() => fetchChat(false), 20000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <ChatContext.Provider value={{ messages, unreadCount, fetchChat, sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
