import { useState, type ChangeEvent } from "react";
import { Upload } from "lucide-react";
import { Input } from "./ui/input";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

export function ImageUploadField({
  value,
  onChange,
  folder,
}: {
  value: string;
  onChange: (url: string) => void;
  folder: string;
}) {
  const { authHeader } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      const result = await api.post(`${API_BASE}/upload/${folder}`, formData, { headers: authHeader });
      onChange(result.url);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {value && (
        <div className="w-24 h-24 rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <ImageWithFallback src={value} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <Input
        placeholder="Image URL (or upload below)"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
      <label className="inline-flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-primary)' }}>
        <Upload className="h-4 w-4" />
        {uploading ? "Uploading..." : "Upload image"}
        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
      </label>
      {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}
    </div>
  );
}
