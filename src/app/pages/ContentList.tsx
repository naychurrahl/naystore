import { useParams, Link } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { PageHeader } from "../components/PageHeader";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";

interface ContentType {
  id: string;
  key: string;
  label: string;
  description: string | null;
}

interface ContentItem {
  id: string;
  title: string;
  image: string | null;
  [key: string]: any;
}

export function ContentList() {
  const { typeKey } = useParams<{ typeKey: string }>();

  const { data: typesData } = useAPI(`${API_BASE}/content-types`);
  const types = (typesData ?? []) as ContentType[];
  const type = types.find((t) => t.key === typeKey);

  const { data: itemsData, loading, error } = useAPI(`${API_BASE}/content-items/${typeKey}`);
  const items = (itemsData ?? []) as ContentItem[];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      <PageHeader
        title={type?.label ?? ""}
        subtitle={type?.description ?? ""}
        image={`https://placehold.co/1600x400?text=${encodeURIComponent(type?.label ?? "")}`}
        tint="rgba(30, 41, 59, 0.82)"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>}
        {error && <p style={{ color: 'var(--color-error)' }}>Couldn't load this section.</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/content/${typeKey}/${item.id}`}
              className="rounded-xl overflow-hidden transition-all duration-300 group block"
              style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className="aspect-video overflow-hidden" style={{ backgroundColor: 'var(--color-surface)' }}>
                {item.image && (
                  <ImageWithFallback
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>{item.title}</h3>
              </div>
            </Link>
          ))}
        </div>

        {!loading && !error && items.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>No items yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
