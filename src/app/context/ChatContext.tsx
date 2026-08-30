import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { getGuestId } from "../utils/guestId.js";
import { useAuth } from "./AuthContext";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderRole: "customer" | "staff" | "admin" | "merchant";
  body: string;
  createdAt: string;
}

export interface MerchantConversationSummary {
  id: string;
  merchantId: string;
  merchantName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export type ActiveThread = { type: "support" } | { type: "merchant"; merchantId: string; merchantName: string };

interface ChatContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  unreadCount: number;
  supportUnread: number;
  merchantConversations: MerchantConversationSummary[];
  activeThread: ActiveThread | null;
  messages: ChatMessage[];
  openThread: (thread: ActiveThread) => void;
  backToList: () => void;
  openMerchantChat: (merchantId: string, merchantName: string) => void;
  sendMessage: (body: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

// Customer-facing chat, open to guests too (same guestId identity guest
// checkout already uses) - staff/admin use the CMS's own Chat page instead.
// Owns two conversation types: the single support thread (/chat, unchanged
// shape from before merchants existed) and any number of merchant threads
// (/merchant-chat) - see openMerchantChat, used by the product page's "Chat
// with Merchant" link.
export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, authHeader } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [supportUnread, setSupportUnread] = useState(0);
  const [merchantConversations, setMerchantConversations] = useState<MerchantConversationSummary[]>([]);
  const [activeThread, setActiveThread] = useState<ActiveThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const isStaffOrAdmin = !!user && (user.role === "admin" || user.role === "staff");
  const guestParam = () => (user ? "" : `&guestId=${encodeURIComponent(getGuestId())}`);

  const fetchOverview = async () => {
    try {
      const [supportData, merchantData] = await Promise.all([
        api.get(`${API_BASE}/chat?markRead=0${guestParam()}`, { headers: authHeader }),
        api.get(`${API_BASE}/merchant-chat?markRead=0${guestParam()}`, { headers: authHeader }),
      ]);
      setSupportUnread(supportData.unreadCount ?? 0);
      setMerchantConversations(merchantData.conversations ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchThreadMessages = async (thread: ActiveThread, markRead: boolean) => {
    try {
      if (thread.type === "support") {
        const data = await api.get(`${API_BASE}/chat?markRead=${markRead ? "1" : "0"}${guestParam()}`, { headers: authHeader });
        setMessages(data.messages ?? []);
        setSupportUnread(data.unreadCount ?? 0);
      } else {
        const data = await api.get(
          `${API_BASE}/merchant-chat?markRead=${markRead ? "1" : "0"}&merchantId=${encodeURIComponent(thread.merchantId)}${guestParam()}`,
          { headers: authHeader }
        );
        setMessages(data.messages ?? []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Badge-only poll for anyone who can actually chat (customer, or a guest -
  // just not staff/admin); a thread itself polls faster (and marks read)
  // only while actually open, below.
  useEffect(() => {
    if (isStaffOrAdmin) {
      setSupportUnread(0);
      setMerchantConversations([]);
      return;
    }

    fetchOverview();
    const interval = setInterval(fetchOverview, 20000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!isOpen || !activeThread) return;

    fetchThreadMessages(activeThread, true);
    const interval = setInterval(() => fetchThreadMessages(activeThread, true), 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeThread?.type, activeThread?.type === "merchant" ? activeThread.merchantId : null]);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  const openThread = (thread: ActiveThread) => {
    setMessages([]);
    setActiveThread(thread);
  };

  const backToList = () => {
    setActiveThread(null);
    setMessages([]);
    fetchOverview();
  };

  const openMerchantChat = (merchantId: string, merchantName: string) => {
    setMessages([]);
    setActiveThread({ type: "merchant", merchantId, merchantName });
    setIsOpen(true);
  };

  // Always keyed by merchantId (never a tracked conversationId) - the
  // backend's getOrCreateMerchantConversation finds the existing thread once
  // one exists, so the client never needs to know its id. This is also what
  // makes "only clients can initiate" true: the client always has a
  // merchantId to resolve from, a merchant never does.
  const sendMessage = async (body: string) => {
    if (!activeThread) return;

    const payload: Record<string, string> = { body };
    if (!user) payload.guestId = getGuestId();

    if (activeThread.type === "support") {
      await api.post(`${API_BASE}/chat`, payload, { headers: authHeader });
    } else {
      payload.merchantId = activeThread.merchantId;
      await api.post(`${API_BASE}/merchant-chat`, payload, { headers: authHeader });
    }

    await fetchThreadMessages(activeThread, true);
    fetchOverview();
  };

  const unreadCount = supportUnread + merchantConversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <ChatContext.Provider
      value={{
        isOpen, open, close, unreadCount, supportUnread, merchantConversations, activeThread, messages,
        openThread, backToList, openMerchantChat, sendMessage,
      }}
    >
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
