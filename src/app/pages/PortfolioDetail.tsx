import { useParams, Link } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ArrowLeft, Star, Tag } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";

export function PortfolioDetail() {
  const { id } = useParams();

  const { data, loading, error } = useAPI(`${API_BASE}/portfolio/${id}`);
  const project = data as any;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface)' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading project...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Project Not Found
          </h1>
          <Link
            to="/portfolio"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--color-secondary)', color: 'white' }}
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Portfolio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/portfolio"
          className="inline-flex items-center gap-2 mb-6 transition-colors"
          style={{ color: 'var(--color-secondary)' }}
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Portfolio
        </Link>

        <div className="relative aspect-video rounded-xl overflow-hidden mb-8">
          <ImageWithFallback src={project.image} alt={project.title} className="w-full h-full object-cover" />
          {project.featured && (
            <div
              className="absolute top-4 right-4 p-2 rounded-full"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              <Star className="h-5 w-5 text-white fill-current" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-3">
          <span
            className="text-sm font-medium px-3 py-1 rounded"
            style={{ backgroundColor: 'var(--color-secondary-light)', color: 'var(--color-secondary)' }}
          >
            {project.categories?.join(", ")}
          </span>
          <span style={{ color: 'var(--color-text-muted)' }}>{project.year}</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          {project.title}
        </h1>
        <p className="text-lg mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          Client: {project.client}
        </p>
        <p className="text-lg mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          {project.description}
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <Tag className="h-5 w-5" style={{ color: 'var(--color-text-muted)' }} />
          {(project.tags as string[]).map((tag: string, index: number) => (
            <span
              key={index}
              className="px-3 py-1 rounded text-sm"
              style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-portfolio-tag)', border: '1px solid var(--color-border)' }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
