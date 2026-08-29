const STORAGE_KEY = "naychurrahl_guest_id";

// Stable per-browser identifier for guest checkout, so a guest's past orders
// can be looked up later (via /guest-orders) without an account - the same
// role an order id already plays for payment verification.
export function getGuestId() {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function clearGuestId() {
  localStorage.removeItem(STORAGE_KEY);
}
