import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface MediaItem {
  type: "image" | "video";
  url: string;
}

// The product page's main photo or video with a strip of thumbnails below.
export function ProductGallery({ media, fallbackImage, alt, overlay }: {
  media?: MediaItem[];
  fallbackImage: string;
  alt: string;
  overlay?: ReactNode;
}) {
  const items: MediaItem[] = media?.length ? media : [{ type: "image", url: fallbackImage }];
  const [index, setIndex] = useState(0);
  const current = items[Math.min(index, items.length - 1)];
  const step = (by: number) => setIndex((i) => (i + by + items.length) % items.length);

  return (
    <div>
      <div className="relative aspect-square rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
        {current.type === "video" ? (
          <video key={current.url} src={current.url} controls playsInline preload="metadata" className="w-full h-full object-contain bg-black" />
        ) : (
          <ImageWithFallback src={current.url} alt={alt} className="w-full h-full object-cover" />
        )}
        {overlay}
        {items.length > 1 && (
          <>
            <button type="button" onClick={() => step(-1)} aria-label="Previous" className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-white" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Next" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-white" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {items.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {items.map((item, i) => (
            <button key={`${item.url}-${i}`} type="button" onClick={() => setIndex(i)} aria-label={`Show ${item.type} ${i + 1}`}
              className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden"
              style={{ border: i === index ? '2px solid var(--color-primary)' : '1px solid var(--color-border)' }}>
              {item.type === "video" ? (
                <>
                  <video src={item.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                  <Play className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow" />
                </>
              ) : (
                <ImageWithFallback src={item.url} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
