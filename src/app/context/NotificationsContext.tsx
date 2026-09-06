import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "./AuthContext";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

// Types that still create a bell entry (and count toward unreadCount) but
// shouldn't pop a toast - either because the recipient likely isn't at their
// keyboard when it happens (payment_failed) or because it's a quiet
// moderation notice, not something worth interrupting for (review_removed).
const SILENT_TOAST_TYPES = new Set(["payment_failed", "review_removed"]);

// Bell/notification-center data, shared by every logged-in role in this app
// (customer and merchant both live here) - notifications are already scoped
// server-side by user_id, so one context serves both with no role gating.
// Chat has its own separate unread-badge system (ChatContext) and is
// deliberately excluded from this one.
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, authHeader } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // Not state: flips on every fetch without needing to re-trigger the poll
  // effect, and its initial `null` is what tells the first poll "just seed,
  // don't toast" - toasting whatever's already there on page load would
  // replay old notifications as if they just happened.
  const lastSeenCreatedAt = useRef<string | null>(null);
  const isFirstFetch = useRef(true);

  const fetchNotifications = async () => {
    try {
      const data = await api.get(`${API_BASE}/notifications`, { headers: authHeader });
      const items: NotificationItem[] = data.notifications ?? [];
      setNotifications(items);
      setUnreadCount(data.unreadCount ?? 0);

      if (!isFirstFetch.current) {
        const fresh = lastSeenCreatedAt.current
          ? items.filter((n) => n.createdAt > lastSeenCreatedAt.current!)
          : [];
        const toastable = fresh.filter((n) => !SILENT_TOAST_TYPES.has(n.type));
        toastable.slice(0, 3).forEach((n) => toast(n.title, { description: n.body ?? undefined }));
        if (toastable.length > 3) toast(`+${toastable.length - 3} more notifications`);
      }
      isFirstFetch.current = false;
      if (items[0]) lastSeenCreatedAt.current = items[0].createdAt;
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      isFirstFetch.current = true;
      lastSeenCreatedAt.current = null;
      return;
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await api.put(`${API_BASE}/notifications/${id}`, {}, { headers: authHeader });
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    setUnreadCount(0);
    try {
      await api.put(`${API_BASE}/notifications/read-all`, {}, { headers: authHeader });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}
