import { useEffect, useState } from "react";
import { LayoutDashboard, ShoppingBag, MessageCircle, LogOut, Menu, X, UserCircle, Headset, Store, Wallet, Package, ArrowUpRight, TicketPercent, Globe, History, BarChart3, Link2, Megaphone, Truck, Users, Plus } from "lucide-react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { ChatLauncher } from "./ChatLauncher";
import { ChatPanel } from "./ChatPanel";
import { NotificationBell } from "./NotificationBell";

// Each item names what the seller's role in the store must allow (data/Stores.php).
const NAV_GROUPS: { label: string; items: { to: string; label: string; icon: typeof ShoppingBag; need: string }[] }[] = [
  { label: "Overview", items: [
    { to: "/merchant", label: "Dashboard", icon: LayoutDashboard, need: "view" },
    { to: "/merchant/insights", label: "Insights", icon: BarChart3, need: "insights" },
  ] },
  {
    label: "Selling",
    items: [
      { to: "/merchant/products", label: "Products", icon: ShoppingBag, need: "products" },
      { to: "/merchant/orders", label: "Orders", icon: Package, need: "orders" },
      { to: "/merchant/shop", label: "Store page", icon: Store, need: "shop" },
      { to: "/merchant/delivery", label: "Delivery fees", icon: Truck, need: "delivery" },
      { to: "/merchant/domain", label: "Domain", icon: Globe, need: "money" },
      { to: "/merchant/coupons", label: "Coupons", icon: TicketPercent, need: "coupons" },
      { to: "/merchant/promo-links", label: "Promo links", icon: Link2, need: "promotions" },
      { to: "/merchant/promotions", label: "Promotions", icon: Megaphone, need: "promotions" },
    ],
  },
  { label: "Money", items: [{ to: "/merchant/payouts", label: "Payouts", icon: Wallet, need: "money" }] },
  {
    label: "Messages",
    items: [
      { to: "/merchant/chat", label: "Chats", icon: MessageCircle, need: "chat" },
      { to: "/merchant/support", label: "Contact Support", icon: Headset, need: "view" },
    ],
  },
  {
    label: "Store",
    items: [
      { to: "/merchant/team", label: "Team", icon: Users, need: "view" },
      { to: "/merchant/activity", label: "Activity", icon: History, need: "insights" },
    ],
  },
  { label: "You", items: [{ to: "/merchant/profile", label: "My Profile", icon: UserCircle, need: "view" }] },
];

const ROLE_LABEL: Record<string, string> = { owner: "Owner", manager: "Manager", staff: "Staff" };

// Which store the console is working in: switch, or open another.
function StoreSwitcher({ onNavigate }: { onNavigate: () => void }) {
  const { store, stores, setStoreId } = useAuth();
  const navigate = useNavigate();
  if (!store) return null;
  return (
    <div className="px-4 pt-4 grid gap-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-wider px-2" style={{ color: 'var(--color-nav-text)', opacity: 0.5 }} htmlFor="store-switch">Store</label>
      <select id="store-switch" value={store.id}
        onChange={(e) => { if (e.target.value === "__new") { navigate("/merchant/stores/new"); onNavigate(); return; } setStoreId(e.target.value); navigate("/merchant"); onNavigate(); }}
        className="w-full px-3 py-2 rounded-lg text-sm font-medium"
        style={{ backgroundColor: 'var(--color-nav-hover)', color: '#ffffff', border: '1px solid transparent' }}>
        {stores.map((s) => <option key={s.id} value={s.id}>{s.name}{s.active ? "" : " (closed)"} · {ROLE_LABEL[s.role]}</option>)}
        <option value="__new">+ Open another store</option>
      </select>
      {!store.active && <p className="text-xs px-2" style={{ color: 'var(--color-error)' }}>This store is closed. Contact us to reopen it.</p>}
    </div>
  );
}

function NavLink({ to, label, icon: Icon, onNavigate }: { to: string; label: string; icon: typeof ShoppingBag; onNavigate: () => void }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="flex items-center gap-2.5 mx-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
      style={{
        color: active ? 'var(--color-nav-active)' : 'var(--color-nav-text)',
        backgroundColor: active ? 'var(--color-nav-hover)' : 'transparent',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'var(--color-nav-hover)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

function initials(name: string | null | undefined, email: string | undefined) {
  const source = (name?.trim() || email || "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/);
  return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : source.slice(0, 2).toUpperCase();
}

export function MerchantLayout() {
  const { user, logout, store, can } = useAuth();
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
    <div className="merchant-workspace min-h-screen flex">
      {mobileNavOpen && (
        <div className="fixed inset-0 z-30 md:hidden" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={closeNav} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex-shrink-0 flex flex-col transition-transform duration-200 md:static md:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ backgroundColor: 'var(--color-nav-bg)' }}
      >
        <div className="px-6 h-16 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--color-nav-hover)' }}>
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary)' }}>
              <Store className="h-4 w-4" style={{ color: 'white' }} />
            </div>
            <span className="font-semibold text-[15px]" style={{ color: '#ffffff' }}>Seller Console</span>
          </div>
          <button onClick={closeNav} className="md:hidden p-1 -mr-1" aria-label="Close menu">
            <X className="h-5 w-5" style={{ color: 'var(--color-nav-text)' }} />
          </button>
        </div>

        <StoreSwitcher onNavigate={closeNav} />

        <nav className="flex-1 overflow-y-auto py-4 space-y-5">
          {NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => can(item.need)) })).filter((group) => group.items.length > 0).map((group) => (
            <div key={group.label}>
              <p
                className="px-6 mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-nav-text)', opacity: 0.5 }}
              >
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ need: _need, ...item }) => (
                  <NavLink key={item.to} {...item} onNavigate={closeNav} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-6 py-3" style={{ borderTop: '1px solid var(--color-nav-hover)' }}>
          <a
            href={store?.slug ? `/${store.slug}` : "/shop"}
            className="inline-flex items-center gap-1 text-xs font-medium transition-colors"
            style={{ color: 'var(--color-nav-text)', opacity: 0.75 }}
          >
            View storefront
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>

        <div className="px-4 py-4 flex items-center gap-3" style={{ borderTop: '1px solid var(--color-nav-hover)' }}>
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
            style={{ backgroundColor: 'var(--color-nav-hover)', color: 'var(--color-nav-active)' }}
          >
            {initials(user?.name, user?.email)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate" style={{ color: '#ffffff' }}>{user?.name || user?.email}</p>
            <p className="text-xs" style={{ color: 'var(--color-nav-text)', opacity: 0.6 }}>{store ? ROLE_LABEL[store.role] : "Seller"}</p>
          </div>
          <NotificationBell />
          <button
            onClick={() => logout()}
            aria-label="Log out"
            className="p-1.5 rounded-md transition-colors shrink-0"
            style={{ color: 'var(--color-nav-text)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-nav-hover)'; e.currentTarget.style.color = 'var(--color-error)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-nav-text)'; }}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div
          className="md:hidden flex items-center gap-3 px-4 h-14 flex-shrink-0"
          style={{ backgroundColor: 'var(--color-nav-bg)' }}
        >
          <button onClick={() => setMobileNavOpen(true)} className="p-1" aria-label="Open menu">
            <Menu className="h-5 w-5" style={{ color: 'var(--color-nav-text)' }} />
          </button>
          <span className="font-semibold flex-1" style={{ color: '#ffffff' }}>Seller Console</span>
          <NotificationBell />
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet key={store?.id ?? "none"} />
        </main>
      </div>

      <ChatLauncher onClick={openChat} />
      <ChatPanel isOpen={chatOpen} onClose={closeChat} />
    </div>
  );
}
