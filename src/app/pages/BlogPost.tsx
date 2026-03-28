import { useParams, Link, useNavigate } from "react-router";
import { blogPosts } from "../../data.js";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Calendar, Clock, ArrowLeft, Tag, Share2 } from "lucide-react";

export function BlogPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const post = blogPosts.find(p => p.id === Number(id));

  if (!post) {
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

  const relatedPosts = blogPosts
    .filter(p => p.id !== post.id && p.category === post.category)
    .slice(0, 3);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      {/* Back Button */}
      <div style={{ backgroundColor: 'var(--color-background)' }} className="py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
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
              src={`https://source.unsplash.com/150x150/?${encodeURIComponent(post.authorImage)}`}
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
            src={`https://source.unsplash.com/1200x675/?${encodeURIComponent(post.image)}`}
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

          <p className="mb-4">
            This is where the full blog post content would be displayed. In a real application, 
            you would have rich text content here with multiple paragraphs, images, headings, 
            lists, and other formatted content.
          </p>

          <p className="mb-4">
            The content management system would store this data and render it dynamically. 
            You could use a rich text editor or markdown to allow authors to format their posts 
            with ease.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">Key Takeaways</h2>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>First important point from the article</li>
            <li>Second key insight worth remembering</li>
            <li>Third takeaway for readers</li>
            <li>Final thought or action item</li>
          </ul>

          <h2 className="text-2xl font-bold mt-8 mb-4">Conclusion</h2>
          <p className="mb-4">
            Wrap up the article with a strong conclusion that reinforces the main points 
            and provides value to the reader. Include a call-to-action if appropriate.
          </p>
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
                      src={`https://source.unsplash.com/400x225/?${encodeURIComponent(relatedPost.image)}`}
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
