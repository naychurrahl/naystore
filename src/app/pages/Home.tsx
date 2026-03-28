import { Link } from "react-router";
import { companyInfo } from "../../data.js";
import { ArrowRight, ShoppingBag, Briefcase, Image as ImageIcon, BookOpen } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function Home() {
  const features = [
    {
      icon: ShoppingBag,
      title: "E-commerce Store",
      description: "Browse our curated selection of premium products",
      link: "/shop",
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
      {/* Hero Section */}
      <section 
        className="relative py-20 md:py-32"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 
              className="text-4xl md:text-6xl font-bold mb-6"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {companyInfo.name}
            </h1>
            <p 
              className="text-xl md:text-2xl mb-4"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {companyInfo.tagline}
            </p>
            <p 
              className="text-lg max-w-2xl mx-auto mb-8"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {companyInfo.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/shop"
                className="px-8 py-3 rounded-lg font-medium transition-colors inline-flex items-center justify-center"
                style={{ 
                  backgroundColor: 'var(--color-primary)',
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                }}
              >
                Start Shopping
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/portfolio"
                className="px-8 py-3 rounded-lg font-medium transition-colors inline-flex items-center justify-center"
                style={{ 
                  backgroundColor: 'white',
                  color: 'var(--color-primary)',
                  border: '2px solid var(--color-primary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                View Our Work
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-24">
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

      {/* Stats Section */}
      <section 
        className="py-16"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: "500+", label: "Products" },
              { number: "100+", label: "Projects" },
              { number: "1000+", label: "Photos" },
              { number: "200+", label: "Articles" }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {stat.number}
                </div>
                <div className="text-white opacity-90">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
