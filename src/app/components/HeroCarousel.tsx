import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "./ui/carousel";

export interface HeroSlide {
  image: string;
  heading: string;
  subheading?: string;
  ctaLabel?: string;
  ctaLink?: string;
}

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api || slides.length <= 1) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, 6000);

    return () => clearInterval(interval);
  }, [api, slides.length]);

  if (slides.length === 0) return null;

  return (
    <Carousel setApi={setApi} opts={{ loop: true }} className="relative">
      <style>{`
        @keyframes hero-scrim-drift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .hero-scrim {
          background: linear-gradient(120deg,
            rgba(37, 99, 235, 0.55),
            rgba(124, 58, 237, 0.52),
            rgba(0, 0, 0, 0.55),
            rgba(245, 158, 11, 0.5)
          );
          background-size: 300% 300%;
          animation: hero-scrim-drift 18s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-scrim {
            animation: none;
            background-position: 50% 50%;
          }
        }
      `}</style>
      <CarouselContent className="ml-0">
        {slides.map((slide, index) => (
          <CarouselItem key={index} className="pl-0">
            <div className="relative h-[420px] md:h-[560px] overflow-hidden">
              <ImageWithFallback
                src={slide.image}
                alt={slide.heading}
                className="w-full h-full object-cover"
              />
              <div className="hero-scrim absolute inset-0 flex items-center">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                  <div className="max-w-2xl">
                    <h1 className="text-3xl md:text-5xl font-bold mb-4 text-white">
                      {slide.heading}
                    </h1>
                    {slide.subheading && (
                      <p className="text-lg md:text-xl mb-6 text-white opacity-90">
                        {slide.subheading}
                      </p>
                    )}
                    {slide.ctaLabel && slide.ctaLink && (
                      <Link
                        to={slide.ctaLink}
                        className="inline-flex items-center px-6 py-3 rounded-lg font-medium transition-colors"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                      >
                        {slide.ctaLabel}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      {slides.length > 1 && (
        <>
          <CarouselPrevious className="left-4" />
          <CarouselNext className="right-4" />
        </>
      )}
    </Carousel>
  );
}
