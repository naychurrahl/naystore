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

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
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
          { path: "orders", Component: MerchantOrdersPage },
          { path: "shop", Component: MyShopPage },
          { path: "payouts", Component: MyPayoutsPage },
          { path: "chat", Component: MerchantChatPage },
          { path: "support", Component: MerchantSupportPage },
          { path: "profile", Component: MerchantProfilePage },
        ],
      },
    ],
  },
]);