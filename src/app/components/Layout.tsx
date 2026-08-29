import { Outlet, Link, useLocation } from "react-router";
import { Menu, X, ShoppingCart, ShoppingBag, User, LogIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export function Layout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const { data: settings } = useAPI(`${API_BASE}/settings`);
  const { data: navigationMenu } = useAPI(`${API_BASE}/nav`);
  const { itemCount } = useCart();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.hash]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuOpen]);

  const companyName = settings?.companyName ?? "";
  const logoInitial = companyName ? companyName.charAt(0).toUpperCase() : "";
  const navItems = navigationMenu ?? [];
  const socialLinks = settings?.socialLinks ?? [];
  const emails = settings?.emails ?? [];
  const phones = settings?.phones ?? [];
  const addresses = settings?.addresses ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav
        ref={navRef}
        className="sticky top-0 z-40"
        style={{ backgroundColor: 'var(--color-nav-bg)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <span className="text-white font-bold text-xl">{logoInitial}</span>
              </div>
              <span
                className="font-bold text-xl hidden sm:block"
                style={{ color: 'var(--color-nav-text)' }}
              >
                {companyName}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="px-3 py-2 rounded-md transition-colors"
                  style={{
                    color: location.pathname === item.path ? 'var(--color-nav-active)' : 'var(--color-nav-text)',
                    backgroundColor: location.pathname === item.path ? 'var(--color-primary-light)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (location.pathname !== item.path) {
                      e.currentTarget.style.backgroundColor = 'var(--color-nav-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (location.pathname !== item.path) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Cart Icon & Mobile Menu Button */}
            <div className="flex items-center space-x-4">
              <Link
                to="/cart"
                className="p-2 rounded-md transition-colors relative"
                style={{ color: 'var(--color-nav-text)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-nav-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <ShoppingCart className="h-6 w-6" />
                {itemCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center text-white"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {itemCount}
                  </span>
                )}
              </Link>

              <Link
                to={user ? "/profile" : "/login"}
                className="p-2 rounded-md transition-colors"
                style={{ color: 'var(--color-nav-text)' }}
                aria-label={user ? "Profile" : "Log In"}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-nav-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {user ? <User className="h-6 w-6" /> : <LogIn className="h-6 w-6" />}
              </Link>

              <button
                className="md:hidden p-2 rounded-md"
                style={{ color: 'var(--color-nav-text)' }}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="block px-3 py-2 rounded-md transition-colors"
                  style={{
                    color: location.pathname === item.path ? 'var(--color-nav-active)' : 'var(--color-nav-text)',
                    backgroundColor: location.pathname === item.path ? 'var(--color-primary-light)' : 'transparent',
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: 'var(--color-footer-bg)', color: 'var(--color-footer-text)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <h3 className="font-bold text-lg mb-4 text-white">{companyName}</h3>
              <p className="mb-4">{settings?.description}</p>
              <div className="space-y-2 text-sm">
                {emails.map((entry: any) => (
                  <p key={entry.id}>{entry.value}</p>
                ))}
                {phones.map((entry: any) => (
                  <p key={entry.id}>{entry.value}</p>
                ))}
                {addresses.map((entry: any) => (
                  <p key={entry.id}>{entry.value}</p>
                ))}
              </div>
            </div>

            {/* Nav Links */}
            <div>
              <h4 className="font-bold text-white mb-4">Nav Links</h4>
              <ul className="space-y-2">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      style={{ color: 'var(--color-footer-link)' }}
                      className="hover:underline"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/orders" style={{ color: 'var(--color-footer-link)' }} className="hover:underline">
                    Order History
                  </Link>
                </li>
                <li>
                  <Link to="/profile" style={{ color: 'var(--color-footer-link)' }} className="hover:underline">
                    Profile
                  </Link>
                </li>
                <li>
                  <Link to="/cart" style={{ color: 'var(--color-footer-link)' }} className="hover:underline">
                    Cart
                  </Link>
                </li>
                <li>
                  {user ? (
                    <button
                      onClick={() => logout()}
                      style={{ color: 'var(--color-footer-link)' }}
                      className="hover:underline"
                    >
                      Log Out
                    </button>
                  ) : (
                    <Link to="/login" style={{ color: 'var(--color-footer-link)' }} className="hover:underline">
                      Log In
                    </Link>
                  )}
                </li>
              </ul>
            </div>

            {/* Social Links */}
            <div>
              <h4 className="font-bold text-white mb-4">Follow Us</h4>
              <div className="space-y-2">
                {socialLinks.map((social: any) => (
                  <a
                    key={social.id}
                    href={social.url}
                    style={{ color: 'var(--color-footer-link)' }}
                    className="block hover:underline capitalize"
                  >
                    {social.platform}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <p className="text-center text-sm">
              © {new Date().getFullYear()} {companyName}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <Link
        to="/#shop"
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-transform hover:scale-105"
        style={{ backgroundColor: 'var(--color-primary)', color: 'white', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)' }}
        aria-label="Back to Shop"
      >
        <ShoppingBag className="h-5 w-5" />
        <span className="hidden sm:inline text-sm font-medium">Back to Shop</span>
      </Link>
    </div>
  );
}