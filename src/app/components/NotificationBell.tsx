import { Bell } from "lucide-react";
import { useNavigate } from "react-router";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { useAuth } from "../context/AuthContext";
import { useNotifications, type NotificationItem } from "../context/NotificationsContext";

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  if (!user) return null;

  const deepLinkFor = (n: NotificationItem): string | null => {
    if (n.entityType === "order") {
      return user.role === "merchant" ? "/merchant/orders" : `/orders/${n.entityId}`;
    }
    if (n.entityType === "product") {
      return "/merchant/products";
    }
    return null;
  };

  const handleClick = (n: NotificationItem) => {
    if (!n.readAt) markRead(n.id);
    const link = deepLinkFor(n);
    if (link) navigate(link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="p-2 rounded-md transition-colors relative"
          style={{ color: "var(--color-nav-text)" }}
          aria-label="Notifications"
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-nav-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center text-white"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <p className="font-medium text-sm">Notifications</p>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" onClick={() => markAllRead()}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 && (
            <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--color-text-muted)" }}>
              No notifications yet.
            </p>
          )}
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className="w-full text-left px-4 py-3 transition-colors"
              style={{
                borderBottom: "1px solid var(--color-border)",
                backgroundColor: n.readAt ? "transparent" : "var(--color-primary-light)",
              }}
            >
              <div className="flex items-start gap-2">
                {!n.readAt && (
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "var(--color-primary)" }} />
                )}
                <div className="min-w-0">
                  <p className={`text-sm ${n.readAt ? "" : "font-semibold"}`}>{n.title}</p>
                  {n.body && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{n.body}</p>
                  )}
                  <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
