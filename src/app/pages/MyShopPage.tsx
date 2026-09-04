import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { ImageUploadField } from "../components/ImageUploadField";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

export function MyShopPage() {
  const { authHeader } = useAuth();
  const [form, setForm] = useState({ slug: "", bio: "", location: "", bannerImage: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);

  useEffect(() => {
    api.get(`${API_BASE}/my-shop`, { headers: authHeader })
      .then((shop) => setForm({ slug: shop.slug ?? "", bio: shop.bio ?? "", location: shop.location ?? "", bannerImage: shop.bannerImage ?? "" }))
      .catch((err: any) => toast.error(err.message || "Could not load shop"))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSlugError(null);
    try {
      const updated = await api.put(`${API_BASE}/my-shop`, form, { headers: authHeader });
      setForm({ slug: updated.slug ?? "", bio: updated.bio ?? "", location: updated.location ?? "", bannerImage: updated.bannerImage ?? "" });
      toast.success("Shop saved");
    } catch (err: any) {
      if (err.status === 409) {
        setSlugError(err.message);
      } else {
        toast.error(err.message || "Could not save shop");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>My Shop</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Your public shop page - what buyers see when they click "Sold by" on one of your products.
      </p>

      <div className="p-6 rounded-xl" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-product-card)' }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Shop URL</Label>
            <div className="flex rounded-md overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <span
                className="px-3 flex items-center text-sm shrink-0"
                style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' }}
              >
                /sellers/
              </span>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="your-shop-name"
                className="border-0 rounded-none focus-visible:ring-0"
              />
            </div>
            {slugError && <p className="text-sm mt-1" style={{ color: 'var(--color-error)' }}>{slugError}</p>}
          </div>

          <div>
            <Label className="mb-1.5 block">Location</Label>
            <Input
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Ibadan, Oyo"
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Bio</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={4}
              placeholder="Tell buyers about your shop"
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Banner Image</Label>
            <ImageUploadField
              value={form.bannerImage}
              onChange={(url) => setForm({ ...form, bannerImage: url })}
              folder="shop"
            />
          </div>

          <div className="flex items-center gap-4 pt-1">
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Shop"}</Button>
            {form.slug && (
              <a
                href={`/sellers/${form.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                style={{ color: 'var(--color-primary)' }}
              >
                <ExternalLink className="h-4 w-4" />
                View my shop
              </a>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
