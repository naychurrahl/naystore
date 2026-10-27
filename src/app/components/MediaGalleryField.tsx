import { useRef, useState, type ChangeEvent } from "react";
import { ChevronLeft, ChevronRight, Plus, Video, X } from "lucide-react";
import { Input } from "./ui/input";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

export interface MediaItem {
  type: "image" | "video";
  url: string;
}

const MAX_ITEMS = 10;
const MAX_BYTES = 8 * 1024 * 1024;
const VIDEO_EXT = /\.(mp4|webm|mov)(\?|$)/i;

// A product's photos and videos in order. The first photo is the cover shown
// on cards; the rest appear in the product page gallery.
export function MediaGalleryField({
  value,
  fallbackImage,
  onChange,
  folder,
}: {
  value: MediaItem[] | undefined;
  // A product saved before media existed only has its single image.
  fallbackImage?: string;
  onChange: (media: MediaItem[]) => void;
  folder: string;
}) {
  const { authHeader } = useAuth();
  const items: MediaItem[] = value?.length ? value : fallbackImage ? [{ type: "image", url: fallbackImage }] : [];
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverIndex = items.findIndex((m) => m.type === "image");
  const full = items.length >= MAX_ITEMS;

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from<File>(e.target.files ?? []).slice(0, MAX_ITEMS - items.length);
    e.target.value = "";
    if (!files.length) return;
    setError(null);
    setUploading(files.length);
    let next = items;
    // One at a time, so a large video doesn't hold up the photos picked with it.
    for (const file of files) {
      if (file.size > MAX_BYTES) {
        setError(`${file.name}: too large (8MB max)`);
        setUploading((n) => n - 1);
        continue;
      }
      try {
        const formData = new FormData();
        formData.append("file", file);
        const result = await api.post(`${API_BASE}/upload/${folder}`, formData, { headers: authHeader });
        next = [...next, { type: result.type === "video" ? "video" : "image", url: result.url }];
        onChange(next);
      } catch (err: any) {
        setError(`${file.name}: ${err.message || "upload failed"}`);
      }
      setUploading((n) => n - 1);
    }
  };

  const addUrl = () => {
    const trimmed = url.trim();
    if (!trimmed || full) return;
    onChange([...items, { type: VIDEO_EXT.test(trimmed) ? "video" : "image", url: trimmed }]);
    setUrl("");
  };

  const move = (from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {items.map((item, i) => (
          <div key={`${item.url}-${i}`} className="group relative aspect-square rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            {item.type === "video" ? (
              <>
                <video src={item.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                <Video className="absolute bottom-1.5 left-1.5 h-4 w-4 text-white drop-shadow" />
              </>
            ) : (
              <ImageWithFallback src={item.url} alt="" className="w-full h-full object-cover" />
            )}
            {i === coverIndex && (
              <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
                Cover
              </span>
            )}
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} title="Remove"
              className="absolute top-1.5 right-1.5 p-1 rounded-full text-white" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
              <X className="h-3 w-3" />
            </button>
            <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {i > 0 && (
                <button type="button" onClick={() => move(i, i - 1)} title="Move earlier" className="p-1 rounded-full text-white" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                  <ChevronLeft className="h-3 w-3" />
                </button>
              )}
              {i < items.length - 1 && (
                <button type="button" onClick={() => move(i, i + 1)} title="Move later" className="p-1 rounded-full text-white" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ))}

        {!full && (
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading > 0}
            className="aspect-square rounded-lg flex flex-col items-center justify-center gap-1 text-xs font-medium disabled:opacity-60"
            style={{ border: '2px dashed var(--color-border)', color: 'var(--color-text-secondary)' }}>
            <Plus className="h-5 w-5" />
            {uploading > 0 ? `Uploading ${uploading}…` : "Photo or video"}
          </button>
        )}
      </div>
      <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        className="hidden" onChange={(e) => void handleFiles(e)} />

      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Up to {MAX_ITEMS}, 8MB each - photos, or MP4, WebM or MOV videos. The first photo is the cover - hover a tile to move it.
      </p>
      {!full && (
        <div className="flex gap-2">
          <Input placeholder="Or paste a photo or video URL" value={url} onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }} />
          <button type="button" onClick={addUrl} className="px-3 rounded-md text-sm font-medium shrink-0"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
            Add
          </button>
        </div>
      )}
      {items.length > 0 && coverIndex === -1 && (
        <p className="text-sm" style={{ color: 'var(--color-error)' }}>Add at least one photo - it is used as the cover.</p>
      )}
      {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}
    </div>
  );
}
