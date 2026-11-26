import { lazy, Suspense, useEffect, type ComponentType } from "react";
import { Navigate, useLocation } from "react-router";
import { Layout } from "../components/Layout";
import { Home } from "../pages/Home";
import { SellerPage } from "../pages/SellerPage";
import { ProductDetail } from "../pages/ProductDetail";
import { Cart } from "../pages/Cart";
import { Checkout } from "../pages/Checkout";
import { ClassicCategory, ShopAll } from "../pages/ShopAll";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { useShopMode } from "../context/ShopModeContext";
import { rememberReferral } from "../utils/referral";
import { useTheme, type ThemeId } from "./ThemeContext";
import { useApplyColorMode } from "./ColorMode";

// One set of addresses for every theme: each address here says which page
// each theme shows there. Modern and Marketplace load only when they're used.
const modern = (name: string) => lazy(() => import("../alt").then((m: any) => ({ default: m[name] })));
const marketplace = (name: string) => lazy(() => import("../alt2").then((m: any) => ({ default: m[name] })));

type ThemedPages = Record<ThemeId, ComponentType>;

function themedPage(pages: ThemedPages): ComponentType {
  return function ThemedPage() {
    const { theme } = useTheme();
    const Page = pages[theme];
    return (
      <Suspense fallback={<div className="min-h-screen" />}>
        <Page />
      </Suspense>
    );
  };
}

// On a merchant's own domain the home page is their shop.
function ClassicIndex() {
  const { shop } = useShopMode();
  return shop ? <SellerPage slug={shop.slug} /> : <Home />;
}

// Addresses a theme has no page for go to its nearest equivalent.
const ToShopAll = () => <Navigate to="/shop" replace />;

export const ThemedHome = themedPage({ classic: ClassicIndex, modern: modern("AltHome"), marketplace: marketplace("Home") });
export const ThemedProduct = themedPage({ classic: ProductDetail, modern: modern("AltProductPage"), marketplace: marketplace("ProductPage") });
export const ThemedSeller = themedPage({ classic: SellerPage as ComponentType, modern: modern("AltSeller"), marketplace: marketplace("StorePage") });
export const ThemedCart = themedPage({ classic: Cart, modern: modern("AltCart"), marketplace: marketplace("CartPage") });
export const ThemedCheckout = themedPage({ classic: Checkout, modern: Checkout, marketplace: marketplace("CheckoutPage") });
// Shop all (/shop) and search (/search) are the same list: every product,
// the store's own and every shop's. Category pages are the store's own.
export const ThemedSearch = themedPage({ classic: ShopAll, modern: modern("AltSearch"), marketplace: marketplace("SearchPage") });
export const ThemedCategories = themedPage({ classic: ToShopAll, modern: ToShopAll, marketplace: marketplace("CategoriesPage") });
export const ThemedCategory = themedPage({ classic: ClassicCategory, modern: modern("AltCategory"), marketplace: marketplace("CategoryPage") });
export const ThemedWishlist = themedPage({ classic: ToShopAll, modern: ToShopAll, marketplace: marketplace("WishlistPage") });

const layouts: Record<ThemeId, ComponentType> = {
  classic: Layout,
  modern: modern("AltLayout"),
  marketplace: marketplace("M2Layout"),
};

// Links that work on any page, in any theme: an invite (?ref=CODE), "Set a
// password" from the guest-account email (?signup=email), and a seller invite
// (?ref=CODE&join=seller) opening the shop sign-up.
function useStoreLinks() {
  const location = useLocation();
  const { user } = useAuth();
  const { openRegister } = useAuthModal();

  useEffect(() => {
    rememberReferral(location.search);
    const params = new URLSearchParams(location.search);
    const signupEmail = params.get("signup");
    if (signupEmail && !user) openRegister(undefined, "customer", signupEmail);
    else if (params.get("join") === "seller" && !user) openRegister("/merchant", "merchant");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);
}

export function ThemedLayout() {
  const { theme } = useTheme();
  useStoreLinks();
  useApplyColorMode();
  const ActiveLayout = layouts[theme];
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ActiveLayout />
    </Suspense>
  );
}

// The addresses the themes had while they were being built.
export function OldThemeAddress() {
  const { pathname, search, hash } = useLocation();
  const path = pathname
    .replace(/^\/alt(_2)?(?=\/|$)/, "")
    .replace(/^\/p\//, "/shop/")
    .replace(/^\/s\//, "/sellers/");
  return <Navigate to={`${path || "/"}${search}${hash}`} replace />;
}
