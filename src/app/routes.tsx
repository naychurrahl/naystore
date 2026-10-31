import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { MerchantLayout } from "./components/MerchantLayout";
import { MerchantProtectedRoute } from "./components/MerchantProtectedRoute";
import { Home } from "./pages/Home";
import { ProductDetail } from "./pages/ProductDetail";
import { SellerPage } from "./pages/SellerPage";
import { Portfolio } from "./pages/Portfolio";
import { PortfolioDetail } from "./pages/PortfolioDetail";
import { Gallery } from "./pages/Gallery";
import { Blog } from "./pages/Blog";
import { BlogPost } from "./pages/BlogPost";
import { Cart } from "./pages/Cart";
import { Checkout } from "./pages/Checkout";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Profile } from "./pages/Profile";
import { OrderHistory } from "./pages/OrderHistory";
import { Library } from "./pages/Library";
import { OrderDetail } from "./pages/OrderDetail";
import { NotFound } from "./pages/NotFound";
import { BecomeMerchant } from "./pages/BecomeMerchant";
import { MerchantDashboard } from "./pages/MerchantDashboard";
import { MerchantProductsPage } from "./pages/MerchantProductsPage";
import { MerchantOrdersPage } from "./pages/MerchantOrdersPage";
import { MyShopPage } from "./pages/MyShopPage";
import { MyPayoutsPage } from "./pages/MyPayoutsPage";
import { MerchantChatPage } from "./pages/MerchantChatPage";
import { MerchantSupportPage } from "./pages/MerchantSupportPage";
import { MerchantProfilePage } from "./pages/MerchantProfilePage";
import { Learn } from "./pages/Learn";
import { Certificate } from "./pages/Certificate";
import { TicketPage } from "./pages/TicketPage";
import { MerchantEventBuilderPage } from "./pages/MerchantEventBuilderPage";
import { MerchantCouponsPage } from "./pages/MerchantCouponsPage";
import { InviteFriends } from "./pages/InviteFriends";
import { MerchantDomainPage } from "./pages/MerchantDomainPage";
import { useShopMode } from "./context/ShopModeContext";

// On a merchant's own domain the home page is their shop.
function IndexPage() {
  const { shop } = useShopMode();
  return shop ? <SellerPage slug={shop.slug} /> : <Home />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: IndexPage },
      { path: "shop/:id", Component: ProductDetail },
      { path: "sellers/:slug", Component: SellerPage },
      { path: "portfolio", Component: Portfolio },
      { path: "portfolio/:id", Component: PortfolioDetail },
      { path: "gallery", Component: Gallery },
      { path: "blog", Component: Blog },
      { path: "blog/:id", Component: BlogPost },
      { path: "cart", Component: Cart },
      { path: "checkout", Component: Checkout },
      { path: "login", Component: Login },
      { path: "register", Component: Register },
      { path: "profile", Component: Profile },
      { path: "orders", Component: OrderHistory },
      { path: "library", Component: Library },
      { path: "invite", Component: InviteFriends },
      { path: "learn/:productId", Component: Learn },
      { path: "tickets/:code", Component: TicketPage },
      { path: "orders/:id", Component: OrderDetail },
      { path: "become-merchant", Component: BecomeMerchant },
      { path: "*", Component: NotFound }
    ]
  },
  {
    path: "/merchant",
    Component: MerchantProtectedRoute,
    children: [
      {
        path: "/merchant",
        Component: MerchantLayout,
        children: [
          { index: true, Component: MerchantDashboard },
          { path: "products", Component: MerchantProductsPage },
          // Lazy: keeps the rich-text editor out of the shop's main bundle.
          { path: "products/:id/event", Component: MerchantEventBuilderPage },
          { path: "products/:id/course", lazy: () => import("./pages/MerchantCourseBuilderPage").then((m) => ({ Component: m.MerchantCourseBuilderPage })) },
          { path: "orders", Component: MerchantOrdersPage },
          { path: "coupons", Component: MerchantCouponsPage },
          { path: "shop", Component: MyShopPage },
          { path: "domain", Component: MerchantDomainPage },
          { path: "payouts", Component: MyPayoutsPage },
          { path: "chat", Component: MerchantChatPage },
          { path: "support", Component: MerchantSupportPage },
          { path: "profile", Component: MerchantProfilePage },
        ],
      },
    ],
  },
  // Outside the shop layout, so it prints as just the certificate.
  { path: "/certificates/:code", Component: Certificate },
  // Full-screen door scanner for phones (lazy: keeps the camera/QR reader
  // out of the shop bundle). Organizer by product, door staff by link + PIN.
  { path: "/check-in/:productId", lazy: () => import("./pages/CheckIn").then((m) => ({ Component: m.CheckIn })) },
  { path: "/door/:token", lazy: () => import("./pages/CheckIn").then((m) => ({ Component: m.CheckIn })) },
]);