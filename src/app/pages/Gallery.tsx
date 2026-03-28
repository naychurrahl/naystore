import { useState, useMemo } from "react";
import { galleryImages, galleryCategories } from "../../data.js";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { X, Calendar, User, Tag } from "lucide-react";

export function Gallery() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedImage, setSelectedImage] = useState<typeof galleryImages[0] | null>(null);

  const filteredImages = useMemo(() => {
    return selectedCategory === "All" 
      ? galleryImages 
      : galleryImages.filter(img => img.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'var(--color-accent)' }} className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-white mb-2">Photo Gallery</h1>
          <p className="text-white opacity-90">A curated collection of stunning photography</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Filter */}
        <div className="mb-8 flex flex-wrap gap-2 justify-center">
          {galleryCategories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className="px-4 py-2 rounded-lg transition-colors text-sm font-medium"
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
                  src={`https://source.unsplash.com/600x${400 + Math.floor(Math.random() * 400)}/?${encodeURIComponent(image.image)}`}
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
                src={`https://source.unsplash.com/1200x800/?${encodeURIComponent(selectedImage.image)}`}
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
                      {selectedImage.category}
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
