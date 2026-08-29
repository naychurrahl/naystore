import { useState, useMemo } from "react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { PageHeader } from "../components/PageHeader";
import { X, Calendar, User, Tag } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";

const HEADER_IMAGE = "https://www.sourcesplash.com/i/random?q=photography%20camera%20art&w=1600&h=400";

export function Gallery() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedImage, setSelectedImage] = useState<any | null>(null);

  const { data: imagesData, loading, error } = useAPI(`${API_BASE}/gallery`);
  const { data: categoriesData } = useAPI(`${API_BASE}/categories?type=gallery`);

  const galleryImages = (imagesData ?? []) as any[];
  const galleryCategories = ["All", ...((categoriesData ?? []) as any[]).map((c) => c.name)];

  const filteredImages = useMemo(() => {
    return selectedCategory === "All"
      ? galleryImages
      : galleryImages.filter(img => img.categories?.includes(selectedCategory));
  }, [selectedCategory, imagesData]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      <PageHeader
        title="Photo Gallery"
        subtitle="A curated collection of stunning photography"
        image={HEADER_IMAGE}
        tint="rgba(245, 158, 11, 0.82)"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Filter */}
        <div className="category-scroll mb-8 flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto md:overflow-visible md:justify-center -mx-1 px-1 py-1 md:mx-0 md:px-0 md:py-0">
          {galleryCategories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className="shrink-0 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
              style={{
                backgroundColor: selectedCategory === category
                  ? 'var(--color-accent)'
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

        {/* Masonry Gallery Grid */}
        {loading && (
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading gallery...</p>
        )}
        {error && (
          <p style={{ color: 'var(--color-error)' }}>Couldn't load the gallery. Please try again later.</p>
        )}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {filteredImages.map((image) => (
            <div
              key={image.id}
              className="break-inside-avoid rounded-lg overflow-hidden transition-all duration-300 cursor-pointer group"
              style={{ 
                backgroundColor: 'var(--color-product-card)',
                border: '1px solid var(--color-border)'
              }}
              onClick={() => setSelectedImage(image)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className="relative overflow-hidden">
                <ImageWithFallback
                  src={image.image}
                  alt={image.title}
                  className="w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                >
                  <p className="text-white font-medium">View Details</p>
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  {image.title}
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {image.photographer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'var(--color-gallery-overlay)' }}
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-5xl w-full rounded-xl overflow-hidden"
            style={{ backgroundColor: 'var(--color-product-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 z-10 p-2 rounded-full transition-colors"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={() => setSelectedImage(null)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
              }}
            >
              <X className="h-6 w-6 text-white" />
            </button>

            <div className="aspect-video w-full overflow-hidden">
              <ImageWithFallback
                src={selectedImage.image}
                alt={selectedImage.title}
                className="w-full h-full object-contain"
                style={{ backgroundColor: 'black' }}
              />
            </div>

            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                {selectedImage.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" style={{ color: 'var(--color-text-muted)' }} />
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Photographer</p>
                    <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {selectedImage.photographer}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5" style={{ color: 'var(--color-text-muted)' }} />
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Category</p>
                    <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {(selectedImage.categories ?? []).join(", ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" style={{ color: 'var(--color-text-muted)' }} />
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Date</p>
                    <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {new Date(selectedImage.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
