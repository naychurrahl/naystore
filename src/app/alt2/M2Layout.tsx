import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router";
import {
  ChevronDown, Heart, Home, LayoutDashboard, LayoutGrid, Library, LogIn, LogOut, MapPin, Menu, MessageCircle, Package, ShoppingCart, Store, User, X,
} from "lucide-react";
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
import { NIGERIA_STATES } from "../data/nigeriaStates";
import { rememberReferral } from "../utils/referral";
import { contactsOf } from "../alt/shared";
import { setShopState, useShopState, useWishlist } from "./local";
import { SearchBox } from "./SearchBox";
import { categoryUrl, m2 } from "./ui";
import "./alt2.css";

function useM2Theme() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => root.classList.toggle("dark", media.matches);
    root.classList.add("m2-theme");
    apply();
    media.addEventListener("change", apply);
    return () => {
      media.removeEventListener("change", apply);
      root.classList.remove("m2-theme", "dark");
    };
  }, []);
}

function useCloseOnOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, close]);
  return ref;
}

// Where the buyer shops from. There are no delivery fees or dates in the API
// yet, so this only marks products sent from the same state.
function DeliverTo({ compact = false }: { compact?: boolean }) {
  const state = useShopState();
  const [open, setOpen] = useState(false);
  const ref = useCloseOnOutside(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-md hover:bg-[var(--m-sunk)] ${compact ? "text-xs px-1 py-1" : "px-2 py-1.5 text-left"}`}>
        <MapPin className={compact ? "h-3.5 w-3.5" : "h-5 w-5"} aria-hidden />
        <span className="leading-tight">
          {!compact && <span className="block text-[11px] m2-ink3">Shopping from</span>}
          <span className="font-bold text-sm">{state || "Choose your state"}</span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 m2-ink3" aria-hidden />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-72 m2-panel m2-pop p-3 grid gap-2" style={{ boxShadow: "var(--m-shadow)" }}>
          <label className="m2-label" htmlFor="m2-state">Your state</label>
          <select id="m2-state" className="m2-input" value={state} onChange={(e) => { setShopState(e.target.value); setOpen(false); }}>
            <option value="">Not set</option>
            {NIGERIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <p className="text-xs m2-ink3">We'll point out products sent from your state.</p>
        </div>
      )}
    </div>
  );
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const { openLogin } = useAuthModal();
  const [open, setOpen] = useState(false);
  const ref = useCloseOnOutside(open, () => setOpen(false));
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  if (!user) {
    return (
      <button type="button" onClick={() => openLogin()} className="m2-icon-btn gap-2 text-sm font-semibold">
        <User className="h-5 w-5" aria-hidden /> <span className="hidden xl:inline">Log in</span>
      </button>
    );
  }
  const item = "flex items-center gap-2.5 px-3 py-2.5 text-sm rounded hover:bg-[var(--m-sunk)]";
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)} className="m2-icon-btn gap-1.5 text-sm font-semibold">
        <User className="h-5 w-5" aria-hidden /> <span className="hidden xl:inline max-w-28 truncate">{user.name?.split(" ")[0] || "Account"}</span>
        <ChevronDown className="h-3.5 w-3.5 m2-ink3" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1 z-50 w-56 m2-panel m2-pop p-1.5" style={{ boxShadow: "var(--m-shadow)" }}>
          <Link role="menuitem" to="/profile" className={item}><User className="h-4 w-4" /> My account</Link>
          <Link role="menuitem" to="/orders" className={item}><Package className="h-4 w-4" /> Orders & tracking</Link>
          <Link role="menuitem" to="/library" className={item}><Library className="h-4 w-4" /> My library</Link>
          {user.role === "merchant"
            ? <Link role="menuitem" to="/merchant" className={item}><LayoutDashboard className="h-4 w-4" /> Seller dashboard</Link>
            : <Link role="menuitem" to="/become-merchant" className={item}><Store className="h-4 w-4" /> Sell on the marketplace</Link>}
          <button role="menuitem" type="button" onClick={() => logout()} className={`${item} w-full`}><LogOut className="h-4 w-4" /> Log out</button>
        </div>
      )}
    </div>
  );
}

function CountBadge({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-extrabold inline-flex items-center justify-center m2-num"
      style={{ background: "var(--m-deal)", color: "var(--m-deal-ink)" }}>{n > 99 ? "99+" : n}</span>
  );
}

function Drawer({ open, onClose, categories, storeName, onChat }: { open: boolean; onClose: () => void; categories: string[]; storeName: string; onChat: () => void }) {
  const { user, logout } = useAuth();
  const { openLogin } = useAuthModal();
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [open, onClose]);
  if (!open) return null;
  const row = "flex items-center gap-3 px-4 py-3 text-[15px] font-medium";
  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" aria-label="Close menu" className="absolute inset-0" style={{ background: "var(--m-scrim)" }} onClick={onClose} />
      <nav className="absolute inset-y-0 left-0 w-[86%] max-w-sm overflow-y-auto m2-pop"
        style={{ background: "var(--m-surface)", paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex items-center justify-between px-4 h-14" style={{ borderBottom: "1px solid var(--m-line)" }}>
          <span className="font-extrabold">{storeName}</span>
          <button type="button" onClick={onClose} aria-label="Close menu" className="m2-icon-btn"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--m-line)" }}><DeliverTo /></div>
        <p className="m2-eyebrow px-4 pt-4 pb-1">Categories</p>
        <Link to={m2("/categories")} className={row} onClick={onClose}><LayoutGrid className="h-4 w-4 m2-ink3" /> All categories</Link>
        {categories.map((c) => <Link key={c} to={categoryUrl(c)} className={row} onClick={onClose}>{c}</Link>)}
        <p className="m2-eyebrow px-4 pt-4 pb-1" style={{ borderTop: "1px solid var(--m-line)" }}>Your account</p>
        {user ? (
          <>
            <Link to="/orders" className={row} onClick={onClose}><Package className="h-4 w-4 m2-ink3" /> Orders & tracking</Link>
            <Link to="/library" className={row} onClick={onClose}><Library className="h-4 w-4 m2-ink3" /> My library</Link>
            <Link to="/profile" className={row} onClick={onClose}><User className="h-4 w-4 m2-ink3" /> My account</Link>
            {user.role === "merchant" && <Link to="/merchant" className={row} onClick={onClose}><LayoutDashboard className="h-4 w-4 m2-ink3" /> Seller dashboard</Link>}
            <button type="button" className={`${row} w-full`} onClick={() => { onClose(); logout(); }}><LogOut className="h-4 w-4 m2-ink3" /> Log out</button>
          </>
        ) : (
          <>
            <button type="button" className={`${row} w-full`} onClick={() => { onClose(); openLogin(); }}><LogIn className="h-4 w-4 m2-ink3" /> Log in or sign up</button>
            <Link to="/orders" className={row} onClick={onClose}><Package className="h-4 w-4 m2-ink3" /> Track an order</Link>
          </>
        )}
        <p className="m2-eyebrow px-4 pt-4 pb-1" style={{ borderTop: "1px solid var(--m-line)" }}>Help</p>
        <button type="button" className={`${row} w-full`} onClick={() => { onClose(); onChat(); }}><MessageCircle className="h-4 w-4 m2-ink3" /> Chat with support</button>
        <Link to="/become-merchant" className={row} onClick={onClose}><Store className="h-4 w-4 m2-ink3" /> Sell on {storeName || "the marketplace"}</Link>
      </nav>
    </div>
  );
}

// Phones: the five places people go most, always in reach.
function BottomNav() {
  const { itemCount } = useCart();
  const wish = useWishlist();
  const { user } = useAuth();
  const { openLogin } = useAuthModal();
  const cell = ({ isActive }: { isActive: boolean }) =>
    `relative flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${isActive ? "text-[var(--m-accent)]" : "m2-ink2"}`;
  return (
    <nav aria-label="Main" className="lg:hidden fixed inset-x-0 bottom-0 z-40"
      style={{ background: "var(--m-surface)", borderTop: "1px solid var(--m-line)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex h-14" style={{ paddingLeft: "env(safe-area-inset-left, 0px)", paddingRight: "env(safe-area-inset-right, 0px)" }}>
        <NavLink to={m2()} end className={cell}><Home className="h-5 w-5" aria-hidden />Home</NavLink>
        <NavLink to={m2("/categories")} className={cell}><LayoutGrid className="h-5 w-5" aria-hidden />Categories</NavLink>
        <NavLink to={m2("/wishlist")} className={cell}><span className="relative"><Heart className="h-5 w-5" aria-hidden /><CountBadge n={wish.length} /></span>Wishlist</NavLink>
        {user
          ? <NavLink to="/profile" className={cell}><User className="h-5 w-5" aria-hidden />Account</NavLink>
          : <button type="button" onClick={() => openLogin()} className={cell({ isActive: false })}><User className="h-5 w-5" aria-hidden />Account</button>}
        <NavLink to={m2("/cart")} className={cell}><span className="relative"><ShoppingCart className="h-5 w-5" aria-hidden /><CountBadge n={itemCount} /></span>Cart</NavLink>
      </div>
    </nav>
  );
}

export function M2Layout() {
  useM2Theme();
  const location = useLocation();
  const { shop } = useShopMode();
  const { data: settings } = useAPI(`${API_BASE}/settings`);
  const { data: catData } = useAPI(`${API_BASE}/categories?type=product`);
  const { itemCount } = useCart();
  const wish = useWishlist();
  const { user } = useAuth();
  const { isOpen: chatOpen, open: openChat, close: closeChat } = useChat();
  const [drawer, setDrawer] = useState(false);
  const closeDrawer = useCallback(() => setDrawer(false), []);
  const [notice, setNotice] = useState(0);

  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); setDrawer(false); }, [location.pathname]);
  useEffect(() => { rememberReferral(location.search); }, [location.search]);
  useEffect(() => {
    const t = setInterval(() => setNotice((n) => n + 1), 6000);
    return () => clearInterval(t);
  }, []);

  if (shop) return <Navigate to="/" replace />;

  const storeName: string = settings?.companyName ?? "";
  const categories = ((catData ?? []) as any[]).map((c) => c.name as string);
  const { phone, whatsapp, socials, emails, addresses } = contactsOf(settings);
  const focused = location.pathname.startsWith(m2("/checkout"));
  const hasOwnBar = location.pathname.startsWith(m2("/p/"));

  // The strip says what's true of every order: no promotions to invent.
  const notices = [
    "One checkout for every shop in your cart",
    "Pay on delivery on items marked for it",
    phone ? `Need help? Call ${phone}` : "Need help? Chat with us any time",
  ];

  return (
    <div className={`m2 min-h-screen flex flex-col ${focused || hasOwnBar ? "" : "pb-[calc(56px+env(safe-area-inset-bottom,0px))] lg:pb-0"}`}>
      <div className="text-[13px]" style={{ background: "var(--m-band)", color: "var(--m-band-ink)" }}>
        <div className="m2-wrap h-8 flex items-center justify-between gap-4">
          <p className="truncate lg:hidden" aria-live="polite">{notices[notice % notices.length]}</p>
          <p className="hidden lg:flex items-center gap-5">{notices.map((n) => <span key={n}>{n}</span>)}</p>
          <span className="hidden md:flex items-center gap-4 shrink-0">
            {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">WhatsApp us</a>}
            <Link to="/orders" className="hover:underline">Track an order</Link>
            {user?.role !== "merchant" && <Link to="/become-merchant" className="hover:underline">Sell with us</Link>}
          </span>
        </div>
      </div>

      <header className="sticky z-40" style={{ top: "env(safe-area-inset-top, 0px)", background: "var(--m-surface)", borderBottom: "1px solid var(--m-line)" }}>
        <div className="m2-wrap">
          <div className="flex items-center gap-2 lg:gap-5 h-14 lg:h-[68px]">
            <button type="button" className="m2-icon-btn lg:hidden -ml-2" aria-label="Open menu" onClick={() => setDrawer(true)}><Menu className="h-5 w-5" /></button>
            <Link to={m2()} className="flex items-center gap-2 min-w-0 shrink-0" aria-label={`${storeName} home`}>
              <span aria-hidden className="h-8 w-8 rounded-md inline-flex items-center justify-center font-extrabold text-[17px]" style={{ background: "var(--m-accent)", color: "var(--m-accent-ink)" }}>
                {storeName.charAt(0)}
              </span>
              <span className="font-extrabold text-[17px] lg:text-lg truncate max-w-[46vw] lg:max-w-none">{storeName}</span>
            </Link>
            <div className="hidden lg:block"><DeliverTo /></div>
            {!focused && <div className="hidden lg:flex flex-1 min-w-0"><SearchBox /></div>}
            <nav aria-label="Account" className="ml-auto flex items-center gap-0.5">
              <span className="hidden sm:inline-flex"><NotificationBell /></span>
              <Link to={m2("/wishlist")} className="m2-icon-btn hidden lg:inline-flex" aria-label={`Wishlist, ${wish.length} saved`}><span className="relative inline-flex"><Heart className="h-5 w-5" /><CountBadge n={wish.length} /></span></Link>
              <span className="hidden lg:inline-flex"><AccountMenu /></span>
              <Link to={m2("/cart")} className="m2-icon-btn gap-2 text-sm font-semibold" aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}>
                <span className="relative inline-flex"><ShoppingCart className="h-5 w-5" /><CountBadge n={itemCount} /></span>
                <span className="hidden xl:inline">Cart</span>
              </Link>
            </nav>
          </div>
          {!focused && <div className="lg:hidden pb-2.5"><SearchBox /></div>}
        </div>
        {!focused && categories.length > 0 && (
          <nav aria-label="Categories" className="hidden lg:block" style={{ borderTop: "1px solid var(--m-line)" }}>
            <div className="m2-wrap flex items-center gap-1 h-11 overflow-x-auto m2-scroll text-sm">
              <NavLink to={m2("/categories")} className="flex items-center gap-1.5 px-3 h-8 rounded-md font-bold hover:bg-[var(--m-sunk)] shrink-0"><LayoutGrid className="h-4 w-4" /> All categories</NavLink>
              {categories.map((c) => (
                <NavLink key={c} to={categoryUrl(c)}
                  className={({ isActive }) => `px-3 h-8 inline-flex items-center rounded-md shrink-0 hover:bg-[var(--m-sunk)] ${isActive ? "font-bold text-[var(--m-accent)]" : "m2-ink2 font-medium"}`}>{c}</NavLink>
              ))}
              <NavLink to={`${m2("/search")}?deals=1&sort=discount`} className="ml-auto px-3 h-8 inline-flex items-center rounded-md font-bold shrink-0" style={{ color: "var(--m-bad)" }}>Today's deals</NavLink>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1 min-w-0"><Outlet /></main>

      <footer style={{ background: "var(--m-surface)", borderTop: "1px solid var(--m-line)" }}>
        <div className="m2-wrap py-10 grid gap-8 grid-cols-2 lg:grid-cols-5 text-sm">
          <div className="col-span-2 grid gap-2 content-start">
            <p className="font-extrabold text-base">{storeName}</p>
            {settings?.tagline && <p className="m2-ink2">{settings.tagline}</p>}
            <p className="m2-ink3 max-w-sm">Many shops, one checkout. Pay online through Paystack or Naylet, or pay on delivery where a shop offers it.</p>
            <p className="m2-ink3 max-w-sm">We'll never ask for your card PIN or a one-time code by phone, chat or email.</p>
          </div>
          <div className="grid gap-2 content-start">
            <p className="font-bold">Shop</p>
            <Link className="m2-ink2 hover:underline" to={m2("/categories")}>All categories</Link>
            <Link className="m2-ink2 hover:underline" to={`${m2("/search")}?deals=1&sort=discount`}>Today's deals</Link>
            <Link className="m2-ink2 hover:underline" to={m2("/wishlist")}>Wishlist</Link>
            <Link className="m2-ink2 hover:underline" to={m2("/cart")}>Cart</Link>
          </div>
          <div className="grid gap-2 content-start">
            <p className="font-bold">Help</p>
            <Link className="m2-ink2 hover:underline" to="/orders">Track an order</Link>
            <button type="button" className="m2-ink2 hover:underline text-left text-sm" onClick={openChat}>Chat with support</button>
            <Link className="m2-ink2 hover:underline" to="/library">My library</Link>
            <Link className="m2-ink2 hover:underline" to="/become-merchant">Sell on {storeName || "the marketplace"}</Link>
          </div>
          {(phone || emails.length > 0 || addresses.length > 0 || socials.length > 0) && (
            <div className="grid gap-2 content-start col-span-2 lg:col-span-1">
              <p className="font-bold">Contact</p>
              {phone && <p className="m2-ink2 select-all">{phone}</p>}
              {emails.map((e: any) => <p key={e.id} className="m2-ink2 select-all break-all">{e.value}</p>)}
              {addresses.map((a: any) => <p key={a.id} className="m2-ink2">{a.value}</p>)}
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {socials.map((s) => <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="m2-link capitalize">{s.platform}</a>)}
              </div>
            </div>
          )}
        </div>
        <div className="m2-wrap py-4 flex flex-wrap items-center justify-between gap-2 text-xs m2-ink3" style={{ borderTop: "1px solid var(--m-line)" }}>
          <span>© {new Date().getFullYear()} {storeName}. All rights reserved.</span>
          <span className="flex gap-2">
            {["Paystack", "Naylet", "Pay on delivery"].map((p) => <span key={p} className="m2-badge m2-badge-plain">{p}</span>)}
          </span>
        </div>
      </footer>

      {!focused && !hasOwnBar && <BottomNav />}
      <Drawer open={drawer} onClose={closeDrawer} categories={categories} storeName={storeName} onChat={openChat} />
      {/* Phones reach chat from the menu; the bubble would sit over page controls above the bottom bar. */}
      <div className="hidden lg:block"><ChatLauncher onClick={openChat} /></div>
      <ChatPanel isOpen={chatOpen} onClose={closeChat} />
    </div>
  );
}
