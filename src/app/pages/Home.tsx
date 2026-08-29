import { Link } from "react-router";
import { ArrowRight, ShoppingBag, Briefcase, Image as ImageIcon, BookOpen } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { HeroCarousel, type HeroSlide } from "../components/HeroCarousel";
import { ShopSection } from "../components/ShopSection";
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

  const features = [
    {
      icon: ShoppingBag,
      title: "E-commerce Store",
      description: "Browse our curated selection of premium products",
      link: "/#shop",
      color: 'var(--color-primary)'
    },
    {
      icon: Briefcase,
      title: "Portfolio",
      description: "Explore our creative work and successful projects",
      link: "/portfolio",
      color: 'var(--color-secondary)'
    },
    {
      icon: ImageIcon,
      title: "Gallery",
      description: "View our collection of stunning photography",
      link: "/gallery",
      color: 'var(--color-accent)'
    },
    {
      icon: BookOpen,
      title: "Blog",
      description: "Read insights and stories from our team",
      link: "/blog",
      color: 'var(--color-success)'
    }
  ];

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

      {/* Features Grid */}
      <section className="py-16 md:py-24" style={{ backgroundColor: 'var(--color-surface-alt)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Explore Our Businesses
            </h2>
            <p 
              className="text-lg"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Discover what we have to offer across our diverse portfolio
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={index}
                  to={feature.link}
                  className="p-6 rounded-xl transition-all duration-300 group"
                  style={{ 
                    backgroundColor: 'var(--color-product-card)',
                    border: '1px solid var(--color-border)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: feature.color, opacity: 0.1 }}
                  >
                    <Icon 
                      className="h-6 w-6"
                      style={{ color: feature.color }}
                    />
                  </div>
                  <h3 
                    className="font-bold text-xl mb-2"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {feature.title}
                  </h3>
                  <p 
                    className="mb-4"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {feature.description}
                  </p>
                  <div 
                    className="flex items-center font-medium group-hover:gap-2 transition-all"
                    style={{ color: feature.color }}
                  >
                    Explore
                    <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <Testimonials />
    </div>
  );
}
