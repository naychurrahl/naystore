import { useRef, useState, type ReactNode } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  Bold, Italic, Strikethrough, Heading2, Heading3, List, ListOrdered, Quote, Code,
  Link2, Image as ImageIcon, Undo2, Redo2,
} from "lucide-react";
import "./lessonContent.css";

function ToolbarButton({
  label, active, disabled, onClick, children,
}: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep the editor's selection
      onClick={onClick}
      className="p-1.5 rounded disabled:opacity-40"
      style={{
        color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
        backgroundColor: active ? 'var(--color-primary-light)' : 'transparent',
      }}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, onPickImage, uploading }: { editor: Editor; onPickImage?: () => void; uploading: boolean }) {
  const setLink = () => {
    const current = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Link address (https://…)", current ?? "https://");
    if (href === null) return;
    if (href.trim() === "" || href.trim() === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  };

  const icon = "h-4 w-4";
  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className={icon} /></ToolbarButton>
      <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className={icon} /></ToolbarButton>
      <ToolbarButton label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className={icon} /></ToolbarButton>
      <ToolbarButton label="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className={icon} /></ToolbarButton>
      <ToolbarButton label="Subheading" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className={icon} /></ToolbarButton>
      <ToolbarButton label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className={icon} /></ToolbarButton>
      <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className={icon} /></ToolbarButton>
      <ToolbarButton label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className={icon} /></ToolbarButton>
      <ToolbarButton label="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code className={icon} /></ToolbarButton>
      <ToolbarButton label="Link" active={editor.isActive("link")} onClick={setLink}><Link2 className={icon} /></ToolbarButton>
      {onPickImage && (
        <ToolbarButton label={uploading ? "Uploading image…" : "Image"} disabled={uploading} onClick={onPickImage}><ImageIcon className={icon} /></ToolbarButton>
      )}
      <span className="flex-1" />
      <ToolbarButton label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 className={icon} /></ToolbarButton>
      <ToolbarButton label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 className={icon} /></ToolbarButton>
    </div>
  );
}

// A small rich-text editor (Tiptap) producing HTML. The backend cleans the
// HTML again on save, so this only needs to be friendly, not a security
// boundary. Remount it (key=) to load different content.
export function RichTextEditor({
  value,
  onChange,
  onUploadImage,
  placeholder = "Write the lesson…",
}: {
  value: string;
  onChange: (html: string) => void;
  onUploadImage?: (file: File) => Promise<string>;
  placeholder?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true, protocols: ["mailto"] }),
      Image,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
    editorProps: {
      attributes: { class: "lesson-content min-h-[220px] px-3 py-2 focus:outline-none", "aria-label": placeholder },
    },
  });

  const handleImage = async (file: File) => {
    if (!onUploadImage || !editor) return;
    setUploading(true);
    setError(null);
    try {
      const src = await onUploadImage(file);
      editor.chain().focus().setImage({ src, alt: file.name.replace(/\.[^.]+$/, "") }).run();
    } catch (err: any) {
      setError(err.message || "Could not upload the image");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)' }}>
        {editor && <Toolbar editor={editor} uploading={uploading} onPickImage={onUploadImage ? () => fileRef.current?.click() : undefined} />}
        <EditorContent editor={editor} />
      </div>
      {error && <p className="text-sm mt-1" style={{ color: 'var(--color-error)' }}>{error}</p>}
      {onUploadImage && (
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImage(file);
          }}
        />
      )}
    </div>
  );
}
