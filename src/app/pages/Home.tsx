import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { HeroCarousel, type HeroSlide } from "../components/HeroCarousel";
import { ShopSection } from "../components/ShopSection";
import { BusinessesCarousel } from "../components/BusinessesCarousel";
import { Testimonials } from "../components/Testimonials";
import { TrustStrip } from "../components/TrustStrip";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";

export function Home() {
  const { data: companyInfo } = useAPI(`${API_BASE}/settings`);
  const { data: homeStats } = useAPI(`${API_BASE}/home-stats`);
  const { data: curatedSlidesData } = useAPI(`${API_BASE}/hero-slides`);
  const { data: featuredProjectsData } = useAPI(`${API_BASE}/portfolio?featured=true`);

  const curatedSlides: HeroSlide[] = (curatedSlidesData ?? []) as HeroSlide[];
  const autoSlides: HeroSlide[] = ((featuredProjectsData ?? []) as any[]).map((project) => ({
    image: project.image,
    heading: project.title,
    subheading: `Client: ${project.client}`,
    ctaLabel: "View Project",
    ctaLink: `/portfolio/${project.id}`,
  }));
  const heroSlides = [...curatedSlides, ...autoSlides];

  return (
    <div>
      {/* Hero Carousel */}
      <HeroCarousel slides={heroSlides} />

      <TrustStrip />

      {/* Company Intro */}
      <section
        className="py-16"
        style={{ backgroundColor: 'var(--color-surface-alt)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {companyInfo?.companyName}
          </h2>
          <p
            className="text-lg md:text-xl mb-3"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {companyInfo?.tagline}
          </p>
          <p
            className="text-base max-w-2xl mx-auto"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {companyInfo?.description}
          </p>
        </div>
      </section>

      <ShopSection />

      <BusinessesCarousel />

      <Testimonials />
    </div>
  );
}
