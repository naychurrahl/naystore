import { useParams, Link, useNavigate } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Calendar, Clock, ArrowLeft, Tag, Share2 } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";

export function BlogPost() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, loading, error } = useAPI(`${API_BASE}/blog/${id}`);
  const post = data as any;
  const { data: allPosts } = useAPI(`${API_BASE}/blog`);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface)' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading article...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Post Not Found
          </h1>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white'
            }}
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  const relatedPosts = ((allPosts ?? []) as any[])
    .filter(p => p.id !== post.id && p.category === post.category)
    .slice(0, 3);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      {/* Back Button */}
      <div className="py-4 border-b" style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 transition-colors"
            style={{ color: 'var(--color-primary)' }}
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
        </div>
      </div>

      {/* Article Header */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <span 
            className="text-sm font-medium px-3 py-1 rounded"
            style={{ 
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-blog-category)'
            }}
          >
            {post.category}
          </span>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-blog-meta)' }}>
            <Calendar className="h-4 w-4" />
            {new Date(post.publishDate).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-blog-meta)' }}>
            <Clock className="h-4 w-4" />
            {post.readTime} min read
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
          {post.title}
        </h1>

        {/* Author */}
        <div className="flex items-center gap-4 mb-8 pb-8" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="w-16 h-16 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface)' }}>
            <ImageWithFallback
              src={post.authorImage}
              alt={post.author}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>
              {post.author}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Author
            </p>
          </div>
          <button
            className="ml-auto p-3 rounded-lg transition-colors"
            style={{ 
              backgroundColor: 'white',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-surface)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        {/* Featured Image */}
        <div className="aspect-video rounded-xl overflow-hidden mb-8">
          <ImageWithFallback
            src={post.image}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Article Content */}
        <div 
          className="prose prose-lg max-w-none mb-8"
          style={{ color: 'var(--color-text-primary)' }}
        >
          <p className="text-xl mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            {post.excerpt}
          </p>

          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>

        {/* Tags */}
        <div className="flex items-center gap-3 mb-8 pb-8" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Tag className="h-5 w-5" style={{ color: 'var(--color-text-muted)' }} />
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 rounded text-sm font-medium"
                style={{ 
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
              Related Articles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.id}
                  to={`/blog/${relatedPost.id}`}
                  className="rounded-lg overflow-hidden transition-all duration-300 group"
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
                  <div className="aspect-video overflow-hidden">
                    <ImageWithFallback
                      src={relatedPost.image}
                      alt={relatedPost.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                      {relatedPost.category}
                    </p>
                    <h3 className="font-semibold mb-2 line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>
                      {relatedPost.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-blog-meta)' }}>
                      <Clock className="h-3 w-3" />
                      {relatedPost.readTime} min
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
