import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown, ArrowUp, Check, ClipboardCheck, Eye, FileText, Paperclip, Pencil, Plus, Trash2, Upload, Video, X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { RichTextEditor } from "./RichTextEditor";
import { QuizEditor, type QuizDraft } from "./QuizEditor";
import { formatSize, uploadToSignedUrl } from "./ProductFilesPanel";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { formatDuration } from "../utils/formatDuration";
import { useAuth } from "../context/AuthContext";

interface BuilderFile {
  id: string;
  name: string;
  size: number | null;
}

interface BuilderLesson {
  id: string;
  moduleId: string;
  title: string;
  isPreview: boolean;
  durationSeconds: number | null;
  hasVideo: boolean;
  hasText: boolean;
  attachmentCount: number;
  hasQuiz: boolean;
  contentHtml: string;
  video: { name: string; size: number | null } | null;
  attachments: BuilderFile[];
  quiz: QuizDraft | null;
}

interface BuilderModule {
  id: string;
  title: string;
  lessons: BuilderLesson[];
}

interface BuilderCourse {
  productId: string;
  name: string;
  visible: boolean;
  sequentialUnlock: boolean;
  certificateEnabled: boolean;
  modules: BuilderModule[];
}

// The server's quiz (question ids included) as an editable draft.
function toQuizDraft(quiz: QuizDraft | null): QuizDraft | null {
  if (!quiz) return null;
  return {
    passPercent: quiz.passPercent,
    questions: quiz.questions.map((q) => ({
      prompt: q.prompt, options: [...q.options], correctIndex: q.correctIndex, explanation: q.explanation ?? "",
    })),
  };
}

// Read a local video's length before uploading it, so the curriculum can
// show durations without the server ever touching the file.
function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(video.duration) ? video.duration : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}

function IconButton({ label, onClick, disabled, danger, children }: {
  label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="p-1 rounded disabled:opacity-30"
      style={{ color: danger ? 'var(--color-error)' : 'var(--color-text-muted)' }}
    >
      {children}
    </button>
  );
}

function InlineAdd({ placeholder, buttonLabel, onAdd }: { placeholder: string; buttonLabel: string; onAdd: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await onAdd(title.trim());
      setTitle("");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex gap-2">
      <Input
        placeholder={placeholder}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void submit(); } }}
      />
      <Button type="button" size="sm" variant="outline" disabled={busy || !title.trim()} onClick={() => void submit()}>
        <Plus className="h-4 w-4 mr-1" /> {buttonLabel}
      </Button>
    </div>
  );
}

function UploadProgress({ name, progress }: { name: string; progress: number }) {
  return (
    <div>
      <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>Uploading {name}… {progress}%</p>
      <div className="h-2 rounded" style={{ backgroundColor: 'var(--color-border)' }}>
        <div className="h-2 rounded" style={{ width: `${progress}%`, backgroundColor: 'var(--color-primary)' }} />
      </div>
    </div>
  );
}

// Modules -> lessons editor for one course product. Every backend call
// answers with the whole course, so `course` is simply replaced each time.
export function CourseBuilder({ productId, previewHref }: { productId: string; previewHref?: string }) {
  const { authHeader } = useAuth();
  const { data, loading, error: loadError } = useAPI(
    `${API_BASE}/course-builder?productId=${encodeURIComponent(productId)}`,
    { headers: authHeader }
  );
  const [course, setCourse] = useState<BuilderCourse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renamingModule, setRenamingModule] = useState<{ id: string; title: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) setCourse(data as BuilderCourse);
  }, [data]);

  const call = async (request: Promise<any>): Promise<BuilderCourse | null> => {
    setError(null);
    try {
      const next = (await request) as BuilderCourse;
      setCourse(next);
      return next;
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      return null;
    }
  };
  const url = (path: string) => `${API_BASE}/course-builder${path}`;
  const opts = { headers: authHeader };

  if (loading && !course) return <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading course…</p>;
  if (loadError && !course) return <p className="text-sm" style={{ color: 'var(--color-error)' }}>{(loadError as any).message || "Could not load the course"}</p>;
  if (!course) return null;

  const lessons = course.modules.flatMap((m) => m.lessons);
  const selected = lessons.find((l) => l.id === selectedId) ?? null;

  const select = (id: string | null) => {
    if (id === selectedId) return;
    if (dirty && !confirm("You have unsaved changes in this lesson. Leave without saving?")) return;
    setDirty(false);
    setSelectedId(id);
  };

  const saveOrder = (modules: BuilderModule[]) => {
    setCourse({ ...course, modules }); // instant feedback; the response confirms it
    return call(api.put(url("/order"), {
      productId,
      modules: modules.map((m) => ({ id: m.id, lessonIds: m.lessons.map((l) => l.id) })),
    }, opts));
  };

  const moveModule = (index: number, dir: -1 | 1) => {
    const modules = [...course.modules];
    [modules[index], modules[index + dir]] = [modules[index + dir], modules[index]];
    void saveOrder(modules);
  };

  // Up/down within a module; past either end it moves into the next module.
  const moveLesson = (mi: number, li: number, dir: -1 | 1) => {
    const modules = course.modules.map((m) => ({ ...m, lessons: [...m.lessons] }));
    const [lesson] = modules[mi].lessons.splice(li, 1);
    const target = li + dir;
    if (target >= 0 && target <= modules[mi].lessons.length) {
      modules[mi].lessons.splice(target, 0, lesson);
    } else if (dir === -1) {
      modules[mi - 1].lessons.push(lesson);
    } else {
      modules[mi + 1].lessons.unshift(lesson);
    }
    void saveOrder(modules);
  };

  const totalDuration = lessons.reduce((sum, l) => sum + (l.durationSeconds ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-product-card)' }}>
        <div>
          <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{course.name}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {course.modules.length} module{course.modules.length === 1 ? "" : "s"} · {lessons.length} lesson{lessons.length === 1 ? "" : "s"}
            {totalDuration ? ` · ${formatDuration(totalDuration)} of video` : ""}
            {!course.visible && " · hidden from the shop"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <Switch
              checked={course.sequentialUnlock}
              onCheckedChange={(checked) => void call(api.put(url("/settings"), { productId, sequentialUnlock: checked }, opts))}
            />
            Sequential unlock
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <Switch
              checked={course.certificateEnabled}
              onCheckedChange={(checked) => void call(api.put(url("/settings"), { productId, certificateEnabled: checked }, opts))}
            />
            Certificate
          </label>
          {previewHref && (
            <a href={previewHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
              <Eye className="h-4 w-4" /> Preview course
            </a>
          )}
        </div>
      </div>
      <p className="text-xs -mt-3" style={{ color: 'var(--color-text-muted)' }}>
        With sequential unlock, learners must finish each lesson before the next one opens. Free preview lessons are always open, even before buying.
        With certificates on, learners who complete every lesson get a certificate anyone can verify online.
      </p>

      {lessons.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Buyers can't enrol until the course has at least one lesson. Start with a module, then add lessons to it.
        </p>
      )}
      {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-5 items-start">
        {/* Curriculum */}
        <div className="space-y-3">
          {course.modules.map((module, mi) => (
            <div key={module.id} className="rounded-xl" style={{ border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-1 px-3 py-2" style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                {renamingModule?.id === module.id ? (
                  <>
                    <Input
                      autoFocus
                      value={renamingModule.title}
                      onChange={(e) => setRenamingModule({ id: module.id, title: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void call(api.put(url("/module"), { id: module.id, title: renamingModule.title }, opts)).then((ok) => ok && setRenamingModule(null));
                        }
                        if (e.key === "Escape") setRenamingModule(null);
                      }}
                    />
                    <IconButton label="Save module name" onClick={() => void call(api.put(url("/module"), { id: module.id, title: renamingModule.title }, opts)).then((ok) => ok && setRenamingModule(null))}><Check className="h-4 w-4" /></IconButton>
                    <IconButton label="Cancel" onClick={() => setRenamingModule(null)}><X className="h-4 w-4" /></IconButton>
                  </>
                ) : (
                  <>
                    <p className="flex-1 min-w-0 truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {mi + 1}. {module.title}
                    </p>
                    <IconButton label="Move module up" disabled={mi === 0} onClick={() => moveModule(mi, -1)}><ArrowUp className="h-4 w-4" /></IconButton>
                    <IconButton label="Move module down" disabled={mi === course.modules.length - 1} onClick={() => moveModule(mi, 1)}><ArrowDown className="h-4 w-4" /></IconButton>
                    <IconButton label="Rename module" onClick={() => setRenamingModule({ id: module.id, title: module.title })}><Pencil className="h-4 w-4" /></IconButton>
                    <IconButton
                      label="Delete module"
                      danger
                      onClick={() => {
                        if (!confirm(`Delete "${module.title}" and its ${module.lessons.length} lesson(s)? Learners lose their progress on them.`)) return;
                        if (module.lessons.some((l) => l.id === selectedId)) { setDirty(false); setSelectedId(null); }
                        void call(api.delete(url(`/module/${encodeURIComponent(module.id)}`), opts));
                      }}
                    ><Trash2 className="h-4 w-4" /></IconButton>
                  </>
                )}
              </div>

              <ul>
                {module.lessons.map((lesson, li) => {
                  const isFirst = mi === 0 && li === 0;
                  const isLast = mi === course.modules.length - 1 && li === module.lessons.length - 1;
                  const active = lesson.id === selectedId;
                  return (
                    <li
                      key={lesson.id}
                      className="flex items-center gap-1 px-3 py-1.5"
                      style={{ backgroundColor: active ? 'var(--color-primary-light)' : 'transparent' }}
                    >
                      <button type="button" onClick={() => select(lesson.id)} className="flex-1 min-w-0 flex items-center gap-2 text-left text-sm py-1">
                        {lesson.hasVideo ? <Video className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                          : lesson.hasQuiz && !lesson.hasText ? <ClipboardCheck className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                          : <FileText className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />}
                        <span className="truncate" style={{ color: 'var(--color-text-primary)' }}>{lesson.title}</span>
                        {lesson.isPreview && (
                          <span className="px-1.5 rounded text-[10px] font-semibold uppercase flex-shrink-0" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>Preview</span>
                        )}
                        {lesson.durationSeconds ? <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{formatDuration(lesson.durationSeconds)}</span> : null}
                        {lesson.hasQuiz && (
                          <span className="px-1.5 rounded text-[10px] font-semibold uppercase flex-shrink-0" style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>Quiz</span>
                        )}
                        {!lesson.hasVideo && !lesson.hasText && !lesson.hasQuiz && lesson.attachmentCount === 0 && (
                          <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-error)' }}>empty</span>
                        )}
                      </button>
                      <IconButton label="Move lesson up" disabled={isFirst} onClick={() => moveLesson(mi, li, -1)}><ArrowUp className="h-4 w-4" /></IconButton>
                      <IconButton label="Move lesson down" disabled={isLast} onClick={() => moveLesson(mi, li, 1)}><ArrowDown className="h-4 w-4" /></IconButton>
                    </li>
                  );
                })}
              </ul>

              <div className="px-3 py-2" style={{ borderTop: module.lessons.length ? '1px solid var(--color-border)' : undefined }}>
                <InlineAdd
                  placeholder="New lesson title"
                  buttonLabel="Lesson"
                  onAdd={async (title) => {
                    const next = await call(api.post(url("/lesson"), { moduleId: module.id, title }, opts));
                    const added = next?.modules.find((m) => m.id === module.id)?.lessons.at(-1);
                    if (added && !dirty) setSelectedId(added.id);
                  }}
                />
              </div>
            </div>
          ))}

          <div className="p-3 rounded-xl" style={{ border: '1px dashed var(--color-border)' }}>
            <InlineAdd
              placeholder={course.modules.length ? "New module title" : "First module, e.g. Getting started"}
              buttonLabel="Module"
              onAdd={async (title) => { await call(api.post(url("/module"), { productId, title }, opts)); }}
            />
          </div>
        </div>

        {/* Lesson editor */}
        <div className="rounded-xl p-4" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-product-card)' }}>
          {selected ? (
            <LessonEditor
              key={selected.id}
              productId={productId}
              lesson={selected}
              onDirtyChange={setDirty}
              call={call}
              error={error}
              onDeleted={() => { setDirty(false); setSelectedId(null); }}
            />
          ) : (
            <p className="text-sm py-10 text-center" style={{ color: 'var(--color-text-muted)' }}>
              {lessons.length ? "Pick a lesson on the left to edit it." : "Add a module and a lesson to start building."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function LessonEditor({ productId, lesson, onDirtyChange, call, error, onDeleted }: {
  productId: string;
  lesson: BuilderLesson;
  onDirtyChange: (dirty: boolean) => void;
  call: (request: Promise<any>) => Promise<BuilderCourse | null>;
  error: string | null;
  onDeleted: () => void;
}) {
  const { authHeader } = useAuth();
  const opts = { headers: authHeader };
  const lessonUrl = `${API_BASE}/course-builder/lesson`;

  // Title, preview, text and quiz are saved together with "Save lesson";
  // video and attachments save as soon as their upload finishes.
  const [title, setTitle] = useState(lesson.title);
  const [isPreview, setIsPreview] = useState(lesson.isPreview);
  const [contentHtml, setContentHtml] = useState(lesson.contentHtml);
  const [quiz, setQuiz] = useState<QuizDraft | null>(() => toQuizDraft(lesson.quiz));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [upload, setUpload] = useState<{ name: string; progress: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const saved = useRef({ title: lesson.title, isPreview: lesson.isPreview, contentHtml: lesson.contentHtml, quiz: JSON.stringify(toQuizDraft(lesson.quiz)) });

  const dirty = title !== saved.current.title || isPreview !== saved.current.isPreview
    || contentHtml !== saved.current.contentHtml || JSON.stringify(quiz) !== saved.current.quiz;
  useEffect(() => onDirtyChange(dirty), [dirty]);

  const save = async () => {
    setSaving(true);
    const next = await call(api.put(lessonUrl, {
      id: lesson.id, title, isPreview, contentHtml, quiz: quiz?.questions.length ? quiz : null,
    }, opts));
    setSaving(false);
    const fresh = next?.modules.flatMap((m) => m.lessons).find((l) => l.id === lesson.id);
    if (fresh) {
      // The server cleans the HTML; keep what it stored as the new baseline.
      const freshQuiz = toQuizDraft(fresh.quiz);
      saved.current = { title: fresh.title, isPreview: fresh.isPreview, contentHtml, quiz: JSON.stringify(freshQuiz) };
      setTitle(fresh.title);
      setQuiz(freshQuiz);
      setSavedAt(Date.now());
      onDirtyChange(false);
    }
  };

  const uploadFile = async (file: File, kind: "video" | "attachment") => {
    setUploadError(null);
    setUpload({ name: file.name, progress: 0 });
    try {
      const duration = kind === "video" ? await readVideoDuration(file) : null;
      const { key, url } = await api.post(`${API_BASE}/course-builder/upload-url`, {
        productId, kind, fileName: file.name, size: file.size,
      }, opts);
      await uploadToSignedUrl(url, file, (progress) => setUpload({ name: file.name, progress }));
      if (kind === "video") {
        await call(api.put(lessonUrl, { id: lesson.id, video: { key, name: file.name, size: file.size, durationSeconds: duration } }, opts));
      } else {
        await call(api.post(`${API_BASE}/course-builder/attachment`, {
          lessonId: lesson.id, key, fileName: file.name, size: file.size, contentType: file.type,
        }, opts));
      }
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUpload(null);
      if (videoInput.current) videoInput.current.value = "";
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);
    const result = await api.post(`${API_BASE}/upload/courses`, formData, opts);
    return result.url;
  };

  const label = "block text-xs font-semibold uppercase tracking-wider mb-2";
  const labelStyle = { color: 'var(--color-text-muted)' };

  return (
    <div className="space-y-5">
      <div>
        <label className={label} style={labelStyle} htmlFor={`lesson-title-${lesson.id}`}>Lesson title</label>
        <Input id={`lesson-title-${lesson.id}`} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        <Switch checked={isPreview} onCheckedChange={setIsPreview} />
        Free preview &mdash; anyone can watch this lesson before buying
      </label>

      <div>
        <p className={label} style={labelStyle}>Video</p>
        {lesson.video ? (
          <div className="flex items-center justify-between gap-3 text-sm p-2 rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
            <span className="flex items-center gap-2 min-w-0" style={{ color: 'var(--color-text-primary)' }}>
              <Video className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{lesson.video.name}</span>
              <span className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                {[formatSize(lesson.video.size), formatDuration(lesson.durationSeconds)].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className="flex gap-1 flex-shrink-0">
              <Button type="button" size="sm" variant="outline" disabled={!!upload} onClick={() => videoInput.current?.click()}>Replace</Button>
              <IconButton
                label="Remove video"
                danger
                disabled={!!upload}
                onClick={() => {
                  if (confirm("Remove this lesson's video?")) void call(api.put(lessonUrl, { id: lesson.id, video: null }, opts));
                }}
              ><Trash2 className="h-4 w-4" /></IconButton>
            </span>
          </div>
        ) : (
          <Button type="button" size="sm" variant="outline" disabled={!!upload} onClick={() => videoInput.current?.click()}>
            <Upload className="h-4 w-4 mr-1.5" /> Upload video
          </Button>
        )}
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>MP4 (H.264) plays everywhere; WebM also works. Up to 4 GB.</p>
        <input
          ref={videoInput}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/ogg,.mp4,.m4v,.webm,.mov,.ogv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadFile(f, "video"); }}
        />
      </div>

      <div>
        <p className={label} style={labelStyle}>Lesson text</p>
        <RichTextEditor value={lesson.contentHtml} onChange={setContentHtml} onUploadImage={uploadImage} />
      </div>

      <div>
        <p className={label} style={labelStyle}>Attachments</p>
        <ul className="space-y-2 mb-2">
          {lesson.attachments.map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-3 text-sm p-2 rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
              <span className="flex items-center gap-2 min-w-0" style={{ color: 'var(--color-text-primary)' }}>
                <Paperclip className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{file.name}</span>
                {file.size ? <span style={{ color: 'var(--color-text-muted)' }}>({formatSize(file.size)})</span> : null}
              </span>
              <IconButton
                label={`Remove ${file.name}`}
                danger
                onClick={() => {
                  if (confirm(`Remove "${file.name}"?`)) void call(api.delete(`${API_BASE}/course-builder/attachment/${encodeURIComponent(file.id)}`, opts));
                }}
              ><Trash2 className="h-4 w-4" /></IconButton>
            </li>
          ))}
        </ul>
        <Button type="button" size="sm" variant="outline" disabled={!!upload} onClick={() => fileInput.current?.click()}>
          <Paperclip className="h-4 w-4 mr-1.5" /> Add attachment
        </Button>
        <input
          ref={fileInput}
          type="file"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadFile(f, "attachment"); }}
        />
      </div>

      <div>
        <p className={label} style={labelStyle}>Quiz</p>
        <QuizEditor value={quiz} onChange={setQuiz} />
      </div>

      {upload && <UploadProgress name={upload.name} progress={upload.progress} />}
      {uploadError && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{uploadError}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm"
          style={{ color: 'var(--color-error)' }}
          onClick={() => {
            if (!confirm(`Delete the lesson "${lesson.title}"? Learners lose their progress on it.`)) return;
            void call(api.delete(`${lessonUrl}/${encodeURIComponent(lesson.id)}`, opts)).then((ok) => ok && onDeleted());
          }}
        >
          <Trash2 className="h-4 w-4" /> Delete lesson
        </button>
        <div className="flex items-center gap-3">
          {!dirty && savedAt && <span className="text-xs" style={{ color: 'var(--color-success)' }}>Saved</span>}
          {error && <span className="text-xs" style={{ color: 'var(--color-error)' }}>{error}</span>}
          {dirty && !error && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Unsaved changes</span>}
          <Button type="button" disabled={saving || !dirty || !title.trim()} onClick={() => void save()}>
            {saving ? "Saving…" : "Save lesson"}
          </Button>
        </div>
      </div>
    </div>
  );
}
