import { useCallback, useEffect, useState, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// A home page row as a looping carousel: swipe or drag, or the arrows on a
// wide screen. A row too short to fill the width stays still, with no
// arrows, so nobody sees the same thing twice at once. Each theme styles it
// through the class names it passes.
export function LoopRail<T>({ items, keyOf, render, slideClass, arrowClass = "", arrowStyle, label, gap = 12 }: {
  items: T[];
  keyOf: (item: T) => string;
  render: (item: T) => ReactNode;
  // Each slide's width, e.g. "basis-[46%] sm:basis-1/3 lg:basis-1/5".
  slideClass: string;
  arrowClass?: string;
  arrowStyle?: React.CSSProperties;
  label: string;
  gap?: number;
}) {
  const [ref, api] = useEmblaCarousel({ loop: true, align: "start", containScroll: "trimSnaps", skipSnaps: true });
  const [moves, setMoves] = useState(false);

  const check = useCallback(() => {
    if (!api) return;
    setMoves(api.scrollSnapList().length > 1 && (api.canScrollNext() || api.canScrollPrev()));
  }, [api]);

  useEffect(() => {
    if (!api) return;
    check();
    api.on("reInit", check).on("resize", check);
    return () => { api.off("reInit", check).off("resize", check); };
  }, [api, check]);

  useEffect(() => { api?.reInit(); }, [api, items.length]);

  if (items.length === 0) return null;
  const arrow = (dir: "prev" | "next") => (
    <button type="button" aria-label={dir === "prev" ? `Back through ${label}` : `More ${label}`}
      onClick={() => (dir === "prev" ? api?.scrollPrev() : api?.scrollNext())}
      className={`hidden md:inline-flex absolute top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full items-center justify-center shadow ${dir === "prev" ? "-left-3" : "-right-3"} ${arrowClass}`}
      style={arrowStyle}>
      {dir === "prev" ? <ChevronLeft className="h-5 w-5" aria-hidden /> : <ChevronRight className="h-5 w-5" aria-hidden />}
    </button>
  );

  return (
    // min-w-0: inside a grid row it must not grow to its slides' total width.
    <div className="relative min-w-0 w-full" role="region" aria-roledescription="carousel" aria-label={label}>
      <div ref={ref} className="overflow-hidden">
        <div className="flex touch-pan-y" style={{ marginLeft: -gap }}>
          {items.map((item) => (
            <div key={keyOf(item)} className={`shrink-0 grow-0 min-w-0 ${slideClass}`} style={{ paddingLeft: gap }}>
              {render(item)}
            </div>
          ))}
        </div>
      </div>
      {moves && arrow("prev")}
      {moves && arrow("next")}
    </div>
  );
}
