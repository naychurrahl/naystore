import { Link, useSearchParams } from "react-router";
import { Download, Library as LibraryIcon, FileText } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { getGuestId } from "../utils/guestId.js";
import { useAuth } from "../context/AuthContext";
import { productTypeLabel } from "../utils/productTypes";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

interface LibraryFile {
  id: string;
  name: string;
  size: number | null;
}

interface LibraryItem {
  id: string;
  token: string;
  orderId: string;
  productId: string | null;
  productType: string;
  name: string;
  image: string | null;
  files: LibraryFile[];
  createdAt: string;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

// Everything bought that isn't shipped - downloads now, courses and tickets in
// later phases. Opened three ways: logged in, as a guest on the same browser
// (guestId, like Order History), or from the "purchase ready" email (?token=).
export function Library() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { user, authHeader } = useAuth();

  const url = token
    ? `${API_BASE}/library?token=${encodeURIComponent(token)}`
    : `${API_BASE}/library?guestId=${encodeURIComponent(getGuestId())}`;
  const { data, loading, error } = useAPI(url, user ? { headers: authHeader } : {});
  const items = (data ?? []) as LibraryItem[];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
          <LibraryIcon className="h-7 w-7" /> My Library
        </h1>
        <p className="mb-8" style={{ color: 'var(--color-text-secondary)' }}>
          {token
            ? "Your purchase, opened from your email link."
            : "Downloads and other digital purchases you've bought."}
        </p>

        {loading && <p style={{ color: 'var(--color-text-muted)' }}>Loading your Library…</p>}

        {!loading && error && (
          <p style={{ color: 'var(--color-error)' }}>
            {(error as any)?.message || "Could not load your Library."}
          </p>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="p-8 rounded-xl text-center" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Nothing here yet. Digital purchases appear here as soon as payment goes through.
            </p>
            {!user && (
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
                Bought as a guest on another device? Use the link in your "Your purchase is ready" email.
              </p>
            )}
            <Link to="/" className="font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
              Browse the shop
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 p-4 rounded-xl"
              style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}
            >
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--color-surface)' }}>
                {item.image && <ImageWithFallback src={item.image} alt={item.name} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  {productTypeLabel(item.productType)} · Bought {new Date(item.createdAt).toLocaleDateString()}
                </p>
                <h2 className="font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>{item.name}</h2>

                {item.productType === "digital" && item.files.length === 0 && (
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    The seller hasn't attached the files yet &mdash; check back soon.
                  </p>
                )}
                {item.productType === "digital" && item.files.length > 0 && (
                  <ul className="space-y-2">
                    {item.files.map((file) => (
                      <li key={file.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2 min-w-0" style={{ color: 'var(--color-text-secondary)' }}>
                          <FileText className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{file.name}</span>
                          {file.size ? <span style={{ color: 'var(--color-text-muted)' }}>({formatSize(file.size)})</span> : null}
                        </span>
                        <a
                          href={`${API_BASE}/library/download/${encodeURIComponent(file.id)}?token=${encodeURIComponent(item.token)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium flex-shrink-0"
                          style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                        >
                          <Download className="h-4 w-4" /> Download
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {item.productType !== "digital" && (
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Access for this item is coming soon.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
