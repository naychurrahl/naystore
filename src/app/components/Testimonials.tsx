import { useEffect, useRef } from "react";
import { Star, Quote } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";

const AUTO_SCROLL_SPEED = 40; // px/sec
const RESUME_DELAY = 1500; // ms of inactivity before auto-scroll resumes

export function Testimonials() {
  const { data } = useAPI(`${API_BASE}/testimonials`);
  const testimonials = (data ?? []) as any[];

  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Three copies of the list let the middle copy be the "home" band: auto-scroll and
  // manual drag both wrap within it, so the loop never visibly snaps back to a start.
  const trackItems = [...testimonials, ...testimonials, ...testimonials];

  useEffect(() => {
    const track = trackRef.current;
    if (!track || testimonials.length === 0) return;

    const setWidth = () => track.scrollWidth / 3;
    track.scrollLeft = setWidth();

    let frameId: number;
    let lastTime = performance.now();

    const step = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      if (!pausedRef.current) {
        track.scrollLeft += (AUTO_SCROLL_SPEED * delta) / 1000;
      }

      const width = setWidth();
      if (track.scrollLeft >= width * 2) {
        track.scrollLeft -= width;
      } else if (track.scrollLeft <= 0) {
        track.scrollLeft += width;
      }

      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [testimonials.length]);

  if (testimonials.length === 0) return null;

  const pause = () => {
    pausedRef.current = true;
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
  };

  const scheduleResume = () => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, RESUME_DELAY);
  };

  return (
    <section className="py-16 md:py-24" style={{ backgroundColor: 'var(--color-surface)' }}>
      <style>{`
        .testimonials-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .testimonials-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            What Our Clients Say
          </h2>
          <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
            Real feedback from the businesses we've worked with
          </p>
        </div>
      </div>

      <div className="relative">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-24 z-10"
          style={{ background: 'linear-gradient(to right, var(--color-surface), transparent)' }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-24 z-10"
          style={{ background: 'linear-gradient(to left, var(--color-surface), transparent)' }}
        />

        <div
          ref={trackRef}
          className="testimonials-scroll flex gap-8 overflow-x-auto overflow-y-hidden px-4 sm:px-6 lg:px-8"
          style={{ cursor: 'grab' }}
          onPointerDown={pause}
          onPointerUp={scheduleResume}
          onPointerLeave={scheduleResume}
          onWheel={() => {
            pause();
            scheduleResume();
          }}
          onTouchStart={pause}
          onTouchEnd={scheduleResume}
        >
          {trackItems.map((testimonial, index) => (
            <div
              key={`${testimonial.id}-${index}`}
              className="w-full md:w-[calc(50%-1rem)] shrink-0 p-6 rounded-xl"
              style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}
            >
              <Quote className="h-8 w-8 mb-4" style={{ color: 'var(--color-primary)', opacity: 0.3 }} />
              {testimonial.rating && (
                <div className="flex items-center gap-0.5 mb-3">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className="h-4 w-4"
                      fill={n <= testimonial.rating ? "var(--color-accent)" : "none"}
                      style={{ color: 'var(--color-accent)' }}
                    />
                  ))}
                </div>
              )}
              <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                "{testimonial.quote}"
              </p>
              <div className="flex items-center gap-3">
                {testimonial.avatar && (
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.customerName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {testimonial.customerName}
                  </p>
                  {testimonial.roleCompany && (
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {testimonial.roleCompany}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
