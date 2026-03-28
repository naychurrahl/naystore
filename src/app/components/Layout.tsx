import { Outlet, Link, useLocation } from "react-router";
import { navigationMenu, companyInfo } from "../../data.js";
import { Menu, X, ShoppingCart } from "lucide-react";
import { useState } from "react";

export function Layout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
                <span className="text-white font-bold text-xl">N</span>
              </div>
              <span 
                className="font-bold text-xl hidden sm:block"
                style={{ color: 'var(--color-nav-text)' }}
              >
                {companyInfo.name}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-8">
              {navigationMenu.map((item) => (
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
              <button
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
                <span 
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center text-white"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  0
                </span>
              </button>

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
              {navigationMenu.map((item) => (
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <h3 className="font-bold text-lg mb-4 text-white">{companyInfo.name}</h3>
              <p className="mb-4">{companyInfo.description}</p>
              <div className="space-y-2 text-sm">
                <p>{companyInfo.email}</p>
                <p>{companyInfo.phone}</p>
                <p>{companyInfo.address}</p>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2">
                {navigationMenu.map((item) => (
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
                <li>
                  <Link
                    to="/api-demo"
                    style={{ color: 'var(--color-footer-link)' }}
                    className="hover:underline"
                  >
                    API Demo
                  </Link>
                </li>
              </ul>
            </div>

            {/* Social Links */}
            <div>
              <h4 className="font-bold text-white mb-4">Follow Us</h4>
              <div className="space-y-2">
                <a href={companyInfo.social.facebook} style={{ color: 'var(--color-footer-link)' }} className="block hover:underline">
                  Facebook
                </a>
                <a href={companyInfo.social.twitter} style={{ color: 'var(--color-footer-link)' }} className="block hover:underline">
                  Twitter
                </a>
                <a href={companyInfo.social.instagram} style={{ color: 'var(--color-footer-link)' }} className="block hover:underline">
                  Instagram
                </a>
                <a href={companyInfo.social.linkedin} style={{ color: 'var(--color-footer-link)' }} className="block hover:underline">
                  LinkedIn
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <p className="text-center text-sm">
              © 2024 {companyInfo.name}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}