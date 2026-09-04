import { useRef, useState, type ChangeEvent } from "react";
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
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      <div
        onClick={() => !value && fileInputRef.current?.click()}
        className="group relative rounded-lg overflow-hidden"
        style={{
          height: 160,
          border: value ? '1px solid var(--color-border)' : '2px dashed var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          cursor: value ? 'default' : 'pointer',
        }}
      >
        {value ? (
          <>
            <ImageWithFallback src={value} alt="" className="w-full h-full object-cover" />
            <div
              className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            >
              <label
                className="px-3 py-1.5 rounded-md text-xs font-medium text-white cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {uploading ? "Uploading..." : "Replace"}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
              </label>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(""); }}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-white"
                style={{ backgroundColor: 'var(--color-error)' }}
              >
                Remove
              </button>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
            <Upload className="h-5 w-5" style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {uploading ? "Uploading..." : "Click to upload"}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>PNG or JPG</span>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowUrlInput((s) => !s)}
        className="text-xs font-medium"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {showUrlInput ? "Hide URL field" : "Paste an image URL instead"}
      </button>
      {showUrlInput && (
        <Input placeholder="https://..." value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}

      {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}
    </div>
  );
}
