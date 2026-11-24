import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";
import { DeliveryTableEditor } from "../components/DeliveryTableEditor";

// The shop's delivery fees: where it delivers, for how much, how fast.
export function MerchantDeliveryPage() {
  const { authHeader } = useAuth();
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Delivery fees</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          You deliver your own orders. Buyers pay one delivery fee per order from your shop, matched on their address: a town (LGA) you list beats its
          whole state, which beats "Everywhere else". The fee is all yours, with no commission on it, and is paid out with the order after delivery.
        </p>
      </div>
      <DeliveryTableEditor
        load={() => api.get(`${API_BASE}/my-delivery`, { headers: authHeader })}
        save={(zones) => api.put(`${API_BASE}/my-delivery`, { zones }, { headers: authHeader })}
      />
    </div>
  );
}
