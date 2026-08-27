import { Outlet, Link, useLocation } from "react-router";
import { Menu, X, ShoppingCart, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

const SOCIAL_LABELS = {
  facebook: "Facebook",
  twitter: "Twitter",
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

export function Layout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: settings } = useAPI(`${API_BASE}/settings`);
  const { data: navigationMenu } = useAPI(`${API_BASE}/nav`);
  const { itemCount } = useCart();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.pathname, location.hash]);

  const companyName = settings?.companyName ?? "";
  const logoInitial = companyName ? companyName.charAt(0).toUpperCase() : "";
  const navItems = navigationMenu ?? [];
  const socialLinks = settings
    ? Object.entries(SOCIAL_LABELS)
        .map(([key, label]) => ({ label, url: settings[key] }))
        .filter((entry) => entry.url)
    : [];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav style={{ backgroundColor: 'var(--color-nav-bg)', borderBottom: '1px solid var(--color-border)' }}>
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

              {user ? (
                <div className="hidden sm:flex items-center gap-3">
                  <Link
                    to="/profile"
                    className="flex items-center gap-1 transition-colors"
                    style={{ color: 'var(--color-nav-text)' }}
                  >
                    <User className="h-5 w-5" />
                    {user.name}
                  </Link>
                  <button
                    onClick={() => logout()}
                    className="text-sm transition-colors"
                    style={{ color: 'var(--color-nav-text)' }}
                  >
                    Log Out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden sm:flex items-center gap-1 transition-colors"
                  style={{ color: 'var(--color-nav-text)' }}
                >
                  <User className="h-5 w-5" />
                  Log In
                </Link>
              )}

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
              {user ? (
                <>
                  <Link
                    to="/profile"
                    className="block px-3 py-2 rounded-md transition-colors"
                    style={{ color: 'var(--color-nav-text)' }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Account
                  </Link>
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="block w-full text-left px-3 py-2 rounded-md transition-colors"
                    style={{ color: 'var(--color-nav-text)' }}
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="block px-3 py-2 rounded-md transition-colors"
                  style={{ color: 'var(--color-nav-text)' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Log In
                </Link>
              )}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <h3 className="font-bold text-lg mb-4 text-white">{companyName}</h3>
              <p className="mb-4">{settings?.description}</p>
              <div className="space-y-2 text-sm">
                <p>{settings?.email}</p>
                <p>{settings?.phone}</p>
                <p>{settings?.address}</p>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-white mb-4">Quick Links</h4>
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

            {/* Social Links */}
            <div>
              <h4 className="font-bold text-white mb-4">Follow Us</h4>
              <div className="space-y-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.url}
                    style={{ color: 'var(--color-footer-link)' }}
                    className="block hover:underline"
                  >
                    {social.label}
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
    </div>
  );
}