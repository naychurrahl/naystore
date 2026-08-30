import { MessageCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

export function ChatLauncher({ onClick }: { onClick: () => void }) {
  const { user } = useAuth();
  const { unreadCount } = useChat();

  // Available to customers and guests alike - staff/admin use the CMS's
  // Chat page instead.
  if (user && (user.role === "admin" || user.role === "staff")) return null;

  return (
    <button
      onClick={onClick}
      aria-label="Open support chat"
      className="fixed bottom-24 right-6 z-30 w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105"
      style={{ backgroundColor: 'var(--color-secondary)', color: 'white', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)' }}
    >
      <MessageCircle className="h-5 w-5" />
      {unreadCount > 0 && (
        <span
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center text-white"
          style={{ backgroundColor: 'var(--color-error)' }}
        >
          {unreadCount}
        </span>
      )}
    </button>
  );
}
