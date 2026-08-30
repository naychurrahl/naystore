import { useState, useMemo } from "react";
import { Link } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { PageHeader } from "../components/PageHeader";
import { Calendar, Clock, ArrowRight, Search } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";

const HEADER_IMAGE = "https://www.sourcesplash.com/i/random?q=writing%20desk%20laptop&w=1600&h=400";

export function Blog() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: postsData, loading, error } = useAPI(`${API_BASE}/blog`);
  const { data: categoriesData } = useAPI(`${API_BASE}/categories?type=blog`);

  const blogPosts = (postsData ?? []) as any[];
  const blogCategories = ["All", ...((categoriesData ?? []) as any[]).map((c) => c.name)];

  const filteredPosts = useMemo(() => {
    let filtered = selectedCategory === "All"
      ? blogPosts
      : blogPosts.filter(p => p.categories?.includes(selectedCategory));

    if (searchTerm) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered;
  }, [selectedCategory, searchTerm, postsData]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      <PageHeader
        title="Our Blog"
        subtitle="Insights, stories, and updates from our team"
        image={HEADER_IMAGE}
        tint="rgba(16, 185, 129, 0.82)"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-xl">
            <Search 
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" 
              style={{ color: 'var(--color-text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border"
              style={{ 
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            />
          </div>

          {/* Category Filter */}
          <div className="category-scroll flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto md:overflow-visible -mx-1 px-1 py-1 md:mx-0 md:px-0 md:py-0">
            {blogCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className="shrink-0 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                style={{
                  backgroundColor: selectedCategory === category
                    ? 'var(--color-success)'
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

        {/* Blog Posts Grid */}
        {loading && (
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading articles...</p>
        )}
        {error && (
          <p style={{ color: 'var(--color-error)' }}>Couldn't load articles. Please try again later.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              className="rounded-xl overflow-hidden transition-all duration-300 group flex flex-col"
              style={{ 
                backgroundColor: 'var(--color-blog-card)',
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
              {/* Featured Image */}
              <div className="aspect-video overflow-hidden">
                <ImageWithFallback
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Post Content */}
              <div className="p-6 flex flex-col flex-1">
                {/* Meta Info */}
                <div className="flex items-center gap-4 mb-3">
                  <span 
                    className="text-xs font-medium px-2 py-1 rounded"
                    style={{ 
                      backgroundColor: 'var(--color-primary-light)',
                      color: 'var(--color-blog-category)'
                    }}
                  >
                    {post.categories?.join(", ")}
                  </span>
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-blog-meta)' }}>
                    <Calendar className="h-3 w-3" />
                    {new Date(post.publishDate).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-blog-meta)' }}>
                    <Clock className="h-3 w-3" />
                    {post.readTime} min
                  </div>
                </div>

                {/* Title and Excerpt */}
                <h2 className="font-bold text-xl mb-2 group-hover:text-blue-600 transition-colors" style={{ color: 'var(--color-text-primary)' }}>
                  {post.title}
                </h2>
                <p className="mb-4 flex-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {post.excerpt}
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <div className="w-10 h-10 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface)' }}>
                    <ImageWithFallback
                      src={post.authorImage}
                      alt={post.author}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {post.author}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Author
                    </p>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {(post.tags as string[]).map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-1 rounded"
                      style={{ 
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text-secondary)'
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Read More Link */}
                <Link
                  to={`/blog/${post.id}`}
                  className="font-medium inline-flex items-center group/link"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Read More
                  <ArrowRight className="ml-2 h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
              No articles found matching your search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
