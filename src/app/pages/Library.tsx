import { Link, useSearchParams } from "react-router";
import { Award, CalendarDays, CalendarPlus, CheckCircle2, Download, Globe, Library as LibraryIcon, FileText, GraduationCap, MapPin, QrCode } from "lucide-react";
import { formatEventRange } from "../utils/eventTime";
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
  lessonCount: number;
  completedCount: number;
  certificateCode: string | null;
  tickets: { code: string; attendeeName: string; tierName: string; checkedInAt: string | null }[];
  event: {
    startsAt: string;
    endsAt: string | null;
    locationType: "venue" | "online";
    venueName: string | null;
    venueAddress: string | null;
    onlineUrl: string | null;
    accessNotes: string | null;
  } | null;
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
            : "Downloads, courses and other digital purchases you've bought."}
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
                {item.productType === "course" && item.productId && (
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.completedCount} of {item.lessonCount} lessons complete
                      </p>
                      <div className="h-2 rounded" style={{ backgroundColor: 'var(--color-border)' }}>
                        <div
                          className="h-2 rounded"
                          style={{
                            width: `${item.lessonCount ? Math.round((item.completedCount / item.lessonCount) * 100) : 0}%`,
                            backgroundColor: 'var(--color-success)',
                          }}
                        />
                      </div>
                    </div>
                    <Link
                      to={`/learn/${encodeURIComponent(item.productId)}?token=${encodeURIComponent(item.token)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium flex-shrink-0"
                      style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                    >
                      <GraduationCap className="h-4 w-4" /> {item.completedCount > 0 ? "Continue course" : "Start course"}
                    </Link>
                    {item.certificateCode && (
                      <Link
                        to={`/certificates/${encodeURIComponent(item.certificateCode)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium flex-shrink-0"
                        style={{ border: '1px solid var(--color-success)', color: 'var(--color-success)' }}
                      >
                        <Award className="h-4 w-4" /> Certificate
                      </Link>
                    )}
                  </div>
                )}
                {item.productType === "ticket" && (
                  <div className="space-y-3 text-sm">
                    {item.event && (
                      <div className="space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                        <p className="flex items-start gap-2"><CalendarDays className="h-4 w-4 mt-0.5 flex-shrink-0" /> {formatEventRange(item.event.startsAt, item.event.endsAt)}</p>
                        {item.event.locationType === "online" ? (
                          <p className="flex items-start gap-2 min-w-0">
                            <Globe className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <a href={item.event.onlineUrl ?? "#"} target="_blank" rel="noreferrer" className="hover:underline truncate" style={{ color: 'var(--color-primary)' }}>
                              Join online
                            </a>
                          </p>
                        ) : (
                          <p className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" /> {[item.event.venueName, item.event.venueAddress].filter(Boolean).join(", ")}</p>
                        )}
                        {item.event.accessNotes && <p className="whitespace-pre-line" style={{ color: 'var(--color-text-muted)' }}>{item.event.accessNotes}</p>}
                      </div>
                    )}
                    <ul className="space-y-2">
                      {item.tickets.map((ticket) => (
                        <li key={ticket.code} className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
                          <span style={{ color: 'var(--color-text-secondary)' }}>
                            <strong style={{ color: 'var(--color-text-primary)' }}>{ticket.attendeeName}</strong> &middot; {ticket.tierName}
                            {ticket.checkedInAt && (
                              <span className="inline-flex items-center gap-1 ml-2 text-xs" style={{ color: 'var(--color-success)' }}>
                                <CheckCircle2 className="h-3.5 w-3.5" /> Checked in
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-3">
                            <a href={`${API_BASE}/tickets/${encodeURIComponent(ticket.code)}/calendar`} className="inline-flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--color-text-secondary)' }}>
                              <CalendarPlus className="h-3.5 w-3.5" /> Calendar
                            </a>
                            <Link
                              to={`/tickets/${encodeURIComponent(ticket.code)}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium"
                              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                            >
                              <QrCode className="h-4 w-4" /> Show ticket
                            </Link>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!["digital", "course", "ticket"].includes(item.productType) && (
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
