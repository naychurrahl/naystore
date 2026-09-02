import { useEffect, useState } from "react";
import { LayoutDashboard, ShoppingBag, MessageCircle, LogOut, Menu, X, UserCircle, Headset, Store, Wallet, Package } from "lucide-react";
import { Outlet, Link, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { ChatLauncher } from "./ChatLauncher";
import { ChatPanel } from "./ChatPanel";

const NAV_ITEMS = [
  { to: "/merchant", label: "Dashboard", icon: LayoutDashboard },
  { to: "/merchant/products", label: "My Products", icon: ShoppingBag },
  { to: "/merchant/orders", label: "Orders", icon: Package },
  { to: "/merchant/payouts", label: "My Payouts", icon: Wallet },
  { to: "/merchant/chat", label: "My Chats", icon: MessageCircle },
  { to: "/merchant/support", label: "Contact Support", icon: Headset },
  { to: "/merchant/shop", label: "My Shop", icon: Store },
  { to: "/merchant/profile", label: "My Profile", icon: UserCircle },
];

function NavLink({ to, label, icon: Icon, onNavigate }: { to: string; label: string; icon: typeof ShoppingBag; onNavigate: () => void }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="flex items-center gap-2 px-6 py-2 text-sm transition-colors"
      style={{
        color: active ? 'var(--color-nav-active)' : 'var(--color-nav-text)',
        backgroundColor: active ? 'var(--color-primary-light)' : 'transparent',
      }}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

export function MerchantLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { isOpen: chatOpen, open: openChat, close: closeChat } = useChat();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  const closeNav = () => setMobileNavOpen(false);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--color-surface)' }}>
      {mobileNavOpen && (
        <div className="fixed inset-0 z-30 md:hidden" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={closeNav} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex-shrink-0 flex flex-col transition-transform duration-200 md:static md:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ backgroundColor: 'var(--color-nav-bg)', borderRight: '1px solid var(--color-border)' }}
      >
        <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <span className="font-bold text-lg" style={{ color: 'var(--color-nav-text)' }}>Merchant Portal</span>
          <button onClick={closeNav} className="md:hidden p-1 -mr-1" aria-label="Close menu">
            <X className="h-5 w-5" style={{ color: 'var(--color-nav-text)' }} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} {...item} onNavigate={closeNav} />
          ))}
        </nav>

        <div className="px-6 py-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-nav-text)' }}>{user?.name || user?.email}</p>
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>Merchant</p>
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: 'var(--color-error)' }}
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div
          className="md:hidden flex items-center gap-3 px-4 h-14 flex-shrink-0"
          style={{ backgroundColor: 'var(--color-nav-bg)', borderBottom: '1px solid var(--color-border)' }}
        >
          <button onClick={() => setMobileNavOpen(true)} className="p-1" aria-label="Open menu">
            <Menu className="h-5 w-5" style={{ color: 'var(--color-nav-text)' }} />
          </button>
          <span className="font-bold" style={{ color: 'var(--color-nav-text)' }}>Merchant Portal</span>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      <Link
        to="/#shop"
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-transform hover:scale-105"
        style={{ backgroundColor: 'var(--color-primary)', color: 'white', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)' }}
        aria-label="Back to Shop"
      >
        <ShoppingBag className="h-5 w-5" />
        <span className="hidden sm:inline text-sm font-medium">Back to Shop</span>
      </Link>

      <ChatLauncher onClick={openChat} />
      <ChatPanel isOpen={chatOpen} onClose={closeChat} />
    </div>
  );
}
