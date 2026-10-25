import { useRef, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

interface ProductFile {
  id: string;
  name: string;
  size: number | null;
}

export function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

// PUT straight to the signed R2 link (the file never passes through our
// backend), reporting progress - fetch() can't report upload progress.
export function uploadToSignedUrl(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Upload failed - check your connection"));
    xhr.send(file);
  });
}

// The files a digital product delivers to buyers (Library downloads).
// Shown in the product's edit form once the product exists.
export function ProductFilesPanel({ productId }: { productId: string }) {
  const { authHeader } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadingName, setUploadingName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, loading, refetch } = useAPI(
    `${API_BASE}/product-files?productId=${encodeURIComponent(productId)}`,
    { headers: authHeader }
  );
  const files = (data ?? []) as ProductFile[];

  const handleUpload = async (file: File) => {
    setError(null);
    setUploadingName(file.name);
    setProgress(0);
    try {
      const { key, url } = await api.post(`${API_BASE}/product-files/upload-url`, {
        productId, fileName: file.name, contentType: file.type, size: file.size,
      }, { headers: authHeader });
      await uploadToSignedUrl(url, file, setProgress);
      await api.post(`${API_BASE}/product-files`, {
        productId, key, fileName: file.name, size: file.size, contentType: file.type,
      }, { headers: authHeader });
      await refetch();
    } catch (err: any) {
      setError(err.message || "Could not upload the file");
    } finally {
      setProgress(null);
      setUploadingName("");
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (file: ProductFile) => {
    if (!confirm(`Remove "${file.name}"? Buyers will no longer be able to download it.`)) return;
    setError(null);
    try {
      await api.delete(`${API_BASE}/product-files/${encodeURIComponent(file.id)}`, { headers: authHeader });
      await refetch();
    } catch (err: any) {
      setError(err.message || "Could not remove the file");
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Buyers download these from their Library right after paying. Up to 2 GB per file.
      </p>

      {loading && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading files…</p>}
      {!loading && files.length === 0 && progress === null && (
        <p className="text-sm" style={{ color: 'var(--color-warning, var(--color-text-secondary))' }}>
          No files yet - buyers won't receive anything until you add at least one.
        </p>
      )}

      <ul className="space-y-2">
        {files.map((file) => (
          <li key={file.id} className="flex items-center justify-between gap-3 text-sm p-2 rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
            <span className="flex items-center gap-2 min-w-0" style={{ color: 'var(--color-text-primary)' }}>
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{file.name}</span>
              {file.size ? <span style={{ color: 'var(--color-text-muted)' }}>({formatSize(file.size)})</span> : null}
            </span>
            <button
              type="button"
              onClick={() => handleDelete(file)}
              className="p-1 rounded"
              style={{ color: 'var(--color-error)' }}
              aria-label={`Remove ${file.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      {progress !== null && (
        <div>
          <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Uploading {uploadingName}… {progress}%
          </p>
          <div className="h-2 rounded" style={{ backgroundColor: 'var(--color-border)' }}>
            <div className="h-2 rounded" style={{ width: `${progress}%`, backgroundColor: 'var(--color-primary)' }} />
          </div>
        </div>
      )}

      {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleUpload(file);
        }}
      />
      <Button type="button" size="sm" variant="outline" disabled={progress !== null} onClick={() => inputRef.current?.click()}>
        <Upload className="h-4 w-4 mr-1.5" /> Add file
      </Button>
    </div>
  );
}
