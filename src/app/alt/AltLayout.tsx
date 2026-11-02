import { useEffect, useLayoutEffect, useState, type FormEvent } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate, useSearchParams } from "react-router";
import { LayoutDashboard, Library, LogIn, Phone, Search, ShoppingCart, Store, User, X } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { useChat } from "../context/ChatContext";
import { useShopMode } from "../context/ShopModeContext";
import { ChatLauncher } from "../components/ChatLauncher";
import { ChatPanel } from "../components/ChatPanel";
import { NotificationBell } from "../components/NotificationBell";
import { rememberReferral } from "../utils/referral";
import { altPath, contactsOf } from "./shared";
import "./alt.css";

// Puts the /alt look on <html> while an /alt page is open (so the login
// modal, toasts and chat, which render outside the page, match it), and
// follows the device's light/dark setting.
function useAltTheme() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => root.classList.toggle("dark", media.matches);
    root.classList.add("alt-theme");
    apply();
    media.addEventListener("change", apply);
    return () => {
      media.removeEventListener("change", apply);
      root.classList.remove("alt-theme", "dark");
    };
  }, []);
}

function HeaderSearch({ autoFocus = false }: { autoFocus?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const onSearch = location.pathname === altPath("/search");
  const [q, setQ] = useState(onSearch ? params.get("q") ?? "" : "");

  useEffect(() => {
    if (onSearch) setQ(params.get("q") ?? "");
  }, [onSearch, params]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(onSearch ? params : undefined);
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    navigate(`${altPath("/search")}?${next.toString()}`);
  };

  return (
    <form role="search" onSubmit={submit} className="relative flex-1 min-w-0">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 alt-muted pointer-events-none" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocus}
        placeholder="Search products, shops and categories"
        aria-label="Search products, shops and categories"
        className="alt-input"
        style={{ paddingLeft: 40, paddingRight: q ? 40 : 14, background: "var(--a-sunk)", borderColor: "transparent" }}
      />
      {q && (
        <button type="button" onClick={() => setQ("")} aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full alt-muted">
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}

function IconLink({ to, label, children, badge }: { to: string; label: string; children: React.ReactNode; badge?: number }) {
  return (
    <Link to={to} aria-label={label} title={label}
      className="relative h-11 w-11 shrink-0 rounded-full inline-flex items-center justify-center hover:bg-[var(--a-sunk)]">
      {children}
      {!!badge && (
        <span className="absolute top-0.5 right-0.5 min-w-5 h-5 px-1 rounded-full text-[11px] font-bold inline-flex items-center justify-center"
          style={{ background: "var(--a-accent)", color: "var(--a-accent-ink)" }}>
          {badge}
        </span>
      )}
    </Link>
  );
}

export function AltLayout() {
  useAltTheme();
  const location = useLocation();
  const { shop } = useShopMode();
  const { data: settings } = useAPI(`${API_BASE}/settings`);
  const { itemCount } = useCart();
  const { user, logout } = useAuth();
  const { openLogin } = useAuthModal();
  const { isOpen: chatOpen, open: openChat, close: closeChat } = useChat();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  useEffect(() => {
    rememberReferral(location.search);
  }, [location.search]);

  useEffect(() => {
    const before = document.title;
    if (settings?.companyName) document.title = settings.companyName;
    return () => { document.title = before; };
  }, [settings?.companyName]);

  // A merchant's own domain shows only that shop; /alt is the marketplace.
  if (shop) return <Navigate to="/" replace />;

  const storeName: string = settings?.companyName ?? "";
  const { phone, whatsapp, socials, emails, addresses } = contactsOf(settings);

  return (
    <div className="alt min-h-screen flex flex-col">
      {/* Utility bar: how to reach a person, which Nigerian shoppers look for first. */}
      {(phone || whatsapp) && (
        <div className="text-[13px]" style={{ background: "var(--a-top)", color: "var(--a-top-ink)" }}>
          <div className="alt-wrap flex items-center justify-between gap-4 h-9">
            <div className="flex items-center gap-4 min-w-0">
              {phone && (
                <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                  <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="hidden sm:inline">Call to order:</span>
                  <a href={`tel:${phone.replace(/\s+/g, "")}`} className="font-semibold select-all">{phone}</a>
                </span>
              )}
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline shrink-0">
                  WhatsApp us
                </a>
              )}
            </div>
            {!user && (
              <Link to="/become-merchant" className="hidden sm:inline hover:underline shrink-0">Sell on {storeName || "the store"}</Link>
            )}
          </div>
        </div>
      )}

      <header className="sticky z-40" style={{ top: "env(safe-area-inset-top, 0px)", background: "var(--a-surface)", borderBottom: "1px solid var(--a-line)" }}>
        <div className="alt-wrap py-2.5 grid gap-2.5">
          <div className="flex items-center gap-3 sm:gap-6">
            <Link to={altPath()} className="flex items-center gap-2 shrink-0 min-w-0" aria-label={`${storeName} home`}>
              <span className="h-9 w-9 rounded-lg inline-flex items-center justify-center text-lg font-extrabold"
                style={{ background: "var(--a-accent)", color: "var(--a-accent-ink)" }} aria-hidden>
                {storeName.charAt(0).toUpperCase()}
              </span>
              <span className="font-extrabold text-lg truncate max-w-[40vw] sm:max-w-none">{storeName}</span>
            </Link>
            <div className="hidden md:flex flex-1 min-w-0"><HeaderSearch /></div>
            <nav className="ml-auto flex items-center gap-0.5" aria-label="Account">
              <NotificationBell />
              {user?.role === "merchant" && (
                <IconLink to="/merchant" label="Seller dashboard"><LayoutDashboard className="h-5 w-5" /></IconLink>
              )}
              {user?.role === "customer" && (
                <IconLink to="/become-merchant" label="Sell on the store"><Store className="h-5 w-5" /></IconLink>
              )}
              <IconLink to="/library" label="My library"><Library className="h-5 w-5" /></IconLink>
              {user ? (
                <IconLink to="/profile" label="My account"><User className="h-5 w-5" /></IconLink>
              ) : (
                <button type="button" onClick={() => openLogin()} aria-label="Log in" title="Log in"
                  className="h-11 w-11 rounded-full inline-flex items-center justify-center hover:bg-[var(--a-sunk)]">
                  <LogIn className="h-5 w-5" />
                </button>
              )}
              <IconLink to={altPath("/cart")} label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`} badge={itemCount}>
                <ShoppingCart className="h-5 w-5" />
              </IconLink>
            </nav>
          </div>
          <div className="md:hidden flex"><HeaderSearch /></div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer style={{ background: "var(--a-surface)", borderTop: "1px solid var(--a-line)" }}>
        <div className="alt-wrap py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="grid gap-2 content-start">
            <p className="font-extrabold text-base">{storeName}</p>
            {settings?.tagline && <p className="alt-soft">{settings.tagline}</p>}
            <p className="alt-muted">We'll never ask for your card PIN or a one-time code by phone, chat or email.</p>
          </div>
          <div className="grid gap-2 content-start">
            <p className="font-bold">Shopping</p>
            <Link className="alt-soft hover:underline" to={altPath("/search")}>All products</Link>
            <Link className="alt-soft hover:underline" to="/orders">Track my orders</Link>
            <Link className="alt-soft hover:underline" to="/library">My library</Link>
            <Link className="alt-soft hover:underline" to={altPath("/cart")}>Cart</Link>
          </div>
          <div className="grid gap-2 content-start">
            <p className="font-bold">Account</p>
            {user ? (
              <>
                <Link className="alt-soft hover:underline" to="/profile">My account</Link>
                <Link className="alt-soft hover:underline" to="/invite">Invite friends</Link>
                <button type="button" className="alt-soft hover:underline text-left text-sm" onClick={() => logout()}>Log out</button>
              </>
            ) : (
              <button type="button" className="alt-soft hover:underline text-left text-sm" onClick={() => openLogin()}>Log in or sign up</button>
            )}
            <Link className="alt-soft hover:underline" to={user?.role === "merchant" ? "/merchant" : "/become-merchant"}>
              Sell on {storeName || "the store"}
            </Link>
          </div>
          {(phone || whatsapp || emails.length > 0 || addresses.length > 0 || socials.length > 0) && (
            <div className="grid gap-2 content-start">
              <p className="font-bold">Contact us</p>
              {phone && <p className="alt-soft select-all">{phone}</p>}
              {emails.map((e: any) => <p key={e.id} className="alt-soft select-all break-all">{e.value}</p>)}
              {addresses.map((a: any) => <p key={a.id} className="alt-soft">{a.value}</p>)}
              {socials.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {socials.map((s) => (
                    <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="alt-link capitalize">{s.platform}</a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="alt-wrap py-4 text-xs alt-muted" style={{ borderTop: "1px solid var(--a-line)" }}>
          © {new Date().getFullYear()} {storeName}. All rights reserved.
        </div>
      </footer>

      <ChatLauncher onClick={openChat} />
      <ChatPanel isOpen={chatOpen} onClose={closeChat} />
    </div>
  );
}
