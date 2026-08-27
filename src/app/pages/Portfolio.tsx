import { useState, useMemo } from "react";
import { Link } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ExternalLink, Filter, Star } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";

export function Portfolio() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);

  const { data: projectsData, loading, error } = useAPI(`${API_BASE}/portfolio`);
  const { data: categoriesData } = useAPI(`${API_BASE}/categories?type=portfolio`);

  const portfolioProjects = (projectsData ?? []) as any[];
  const portfolioCategories = ["All", ...((categoriesData ?? []) as any[]).map((c) => c.name)];

  const filteredProjects = useMemo(() => {
    let filtered = selectedCategory === "All"
      ? portfolioProjects
      : portfolioProjects.filter(p => p.category === selectedCategory);

    if (showFeaturedOnly) {
      filtered = filtered.filter(p => p.featured);
    }

    return filtered;
  }, [selectedCategory, showFeaturedOnly, projectsData]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'var(--color-secondary)' }} className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-white mb-2">Our Portfolio</h1>
          <p className="text-white opacity-90">Showcasing our best work and creative solutions</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" style={{ color: 'var(--color-text-secondary)' }} />
              <div className="flex flex-wrap gap-2">
                {portfolioCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className="px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    style={{
                      backgroundColor: selectedCategory === category 
                        ? 'var(--color-secondary)' 
                        : 'white',
                      color: selectedCategory === category 
                        ? 'white' 
                        : 'var(--color-text-primary)',
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showFeaturedOnly}
                onChange={(e) => setShowFeaturedOnly(e.target.checked)}
                className="w-4 h-4"
              />
              <Star className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
              <span style={{ color: 'var(--color-text-primary)' }}>Featured Only</span>
            </label>
          </div>
        </div>

        {/* Projects Grid */}
        {loading && (
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading projects...</p>
        )}
        {error && (
          <p style={{ color: 'var(--color-error)' }}>Couldn't load projects. Please try again later.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProjects.map((project) => (
            <Link
              to={`/portfolio/${project.id}`}
              key={project.id}
              className="rounded-xl overflow-hidden transition-all duration-300 group block"
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
              {/* Project Image */}
              <div className="relative aspect-video overflow-hidden">
                <ImageWithFallback
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-portfolio-overlay)' }}
                >
                  <span
                    className="px-6 py-3 rounded-lg flex items-center gap-2 text-white transition-transform group-hover:scale-105"
                    style={{ backgroundColor: 'var(--color-secondary)' }}
                  >
                    View Project
                    <ExternalLink className="h-4 w-4" />
                  </span>
                </div>
                {project.featured && (
                  <div
                    className="absolute top-3 right-3 p-2 rounded-full"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    <Star className="h-4 w-4 text-white fill-current" />
                  </div>
                )}
              </div>

              {/* Project Info */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span 
                    className="text-xs font-medium px-2 py-1 rounded"
                    style={{ 
                      backgroundColor: 'var(--color-secondary-light)',
                      color: 'var(--color-secondary)'
                    }}
                  >
                    {project.category}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {project.year}
                  </span>
                </div>
                <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  {project.title}
                </h3>
                <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Client: {project.client}
                </p>
                <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(project.tags as string[]).map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-1 rounded"
                      style={{ 
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-portfolio-tag)'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
              No projects found with the selected filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
