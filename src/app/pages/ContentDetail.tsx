import { useParams, Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";

interface ContentTypeField {
  key: string;
  label: string;
  type: string;
}

interface ContentType {
  key: string;
  label: string;
  fields: ContentTypeField[];
}

interface ContentItem {
  id: string;
  title: string;
  image: string | null;
  [key: string]: any;
}

function formatFieldValue(value: any, type: string): string {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "checkbox") return value ? "Yes" : "No";
  if (type === "date") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
  }
  if (type === "tags" && Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function ContentDetail() {
  const { typeKey, id } = useParams<{ typeKey: string; id: string }>();

  const { data: typesData } = useAPI(`${API_BASE}/content-types`);
  const types = (typesData ?? []) as ContentType[];
  const type = types.find((t) => t.key === typeKey);

  const { data, loading, error } = useAPI(`${API_BASE}/content-items/${typeKey}/${id}`);
  const item = data as ContentItem | null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface)' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Not Found</h1>
          <Link
            to={`/content/${typeKey}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to={`/content/${typeKey}`}
          className="inline-flex items-center gap-2 mb-6 text-sm"
          style={{ color: 'var(--color-primary)' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {type?.label ?? "list"}
        </Link>

        {item.image && (
          <div className="aspect-video rounded-xl overflow-hidden mb-6" style={{ backgroundColor: 'var(--color-surface)' }}>
            <ImageWithFallback src={item.image} alt={item.title} className="w-full h-full object-cover" />
          </div>
        )}

        <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>{item.title}</h1>

        {type && type.fields.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {type.fields.map((field) => (
              <div
                key={field.key}
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}
              >
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{field.label}</p>
                <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {formatFieldValue(item[field.key], field.type)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
