import { useEffect, useRef } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { CartProvider, useCart } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { AuthModalProvider } from './context/AuthModalContext';
import { clearGuestId } from './utils/guestId.js';
import { Toaster } from './components/ui/sonner';
import { AuthModal } from './components/AuthModal';

// Wipes cart + guest identity the instant a logged-in session ends, so nothing
// carries over to whoever uses the browser next. Only fires on an actual
// logout (was logged in, now isn't) - not on initial load, when there was
// never a user to begin with and a guest's own cart should survive.
function SessionGuard() {
  const { user } = useAuth();
  const { clearCart } = useCart();
  const wasLoggedIn = useRef(false);

  useEffect(() => {
    if (user) {
      wasLoggedIn.current = true;
    } else if (wasLoggedIn.current) {
      wasLoggedIn.current = false;
      clearCart();
      clearGuestId();
    }
  }, [user, clearCart]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthModalProvider>
        <CartProvider>
          <ChatProvider>
            <SessionGuard />
            <RouterProvider router={router} />
            <Toaster />
            <AuthModal />
          </ChatProvider>
        </CartProvider>
      </AuthModalProvider>
    </AuthProvider>
  );
}