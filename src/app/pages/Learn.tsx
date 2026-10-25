import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Download, FileText, Lock, Paperclip, PlayCircle,
} from "lucide-react";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { getGuestId } from "../utils/guestId.js";
import { formatDuration } from "../utils/formatDuration";
import { useAuth } from "../context/AuthContext";
import "../components/lessonContent.css";

interface OutlineLesson {
  id: string;
  moduleId: string;
  title: string;
  isPreview: boolean;
  durationSeconds: number | null;
  hasVideo: boolean;
  completed: boolean;
  locked: boolean;
}

interface CourseState {
  product: { id: string; name: string; image: string | null };
  enrolled: boolean;
  manager: boolean;
  token: string | null;
  sequentialUnlock: boolean;
  modules: { id: string; title: string; lessons: OutlineLesson[] }[];
  lessonCount: number;
  completedCount: number;
  durationSeconds: number;
  resumeLessonId: string | null;
}

interface LessonContent {
  id: string;
  title: string;
  completed: boolean;
  contentHtml: string;
  videoUrl: string | null;
  attachments: { id: string; name: string; size: number | null; url: string | null }[];
}

function formatSize(bytes: number | null): string {
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

// The course player. Opened from the Library or the purchase email
// (?token=), when logged in, or as a guest on the buying device (guestId).
// Without an enrolment it works as a preview: only free preview lessons open.
// Which lessons are open is decided by the backend - this page only shows it.
export function Learn() {
  const { productId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, authHeader } = useAuth();
  const headers = user ? { headers: authHeader } : {};

  const urlToken = searchParams.get("token");
  const outlineCred = urlToken ? `token=${encodeURIComponent(urlToken)}` : `guestId=${encodeURIComponent(getGuestId())}`;
  const { data, loading, error } = useAPI(`${API_BASE}/learn/${encodeURIComponent(productId)}?${outlineCred}`, headers);

  const [course, setCourse] = useState<CourseState | null>(null);
  const [saving, setSaving] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  useEffect(() => {
    if (data) setCourse(data as CourseState);
  }, [data]);

  // Once enrolled the token is the credential for every lesson, whichever
  // way the course was opened.
  const cred = course?.token ? `token=${encodeURIComponent(course.token)}` : outlineCred;
  const lessons = course ? course.modules.flatMap((m) => m.lessons) : [];
  // A ?lesson= that no longer exists (deleted since the link was made) falls
  // back to where the learner left off.
  const requested = searchParams.get("lesson");
  const currentId = requested && lessons.some((l) => l.id === requested) ? requested : course?.resumeLessonId ?? null;
  const index = lessons.findIndex((l) => l.id === currentId);
  const current = index >= 0 ? lessons[index] : null;
  const prev = index > 0 ? lessons[index - 1] : null;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;
  const currentModule = course?.modules.find((m) => m.id === current?.moduleId);

  const { data: lessonData, loading: lessonLoading, error: lessonError } = useAPI(
    current && !current.locked ? `${API_BASE}/learn/lesson/${encodeURIComponent(current.id)}?${cred}` : null,
    headers
  );
  const lesson = lessonData as LessonContent | null;

  const goTo = (id: string) => {
    setProgressError(null);
    setSearchParams((params) => {
      params.set("lesson", id);
      return params;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setCompleted = async (completed: boolean, advance: boolean) => {
    if (!course || !current) return;
    setSaving(true);
    setProgressError(null);
    try {
      const state = await api.post(`${API_BASE}/learn/progress`, {
        lessonId: current.id,
        completed,
        ...(course.token ? { token: course.token } : { guestId: getGuestId() }),
      }, headers);
      setCourse({ ...course, ...state });
      const following = advance ? (state as CourseState).modules.flatMap((m) => m.lessons)[index + 1] : null;
      if (following && !following.locked) goTo(following.id);
    } catch (err: any) {
      setProgressError(err.message || "Could not save your progress");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !course) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface)' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading course…</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>Course not available</h1>
          <p className="mb-5" style={{ color: 'var(--color-text-secondary)' }}>
            {(error as any)?.message || "This course link is invalid or no longer active."}
          </p>
          <Link to="/library" className="font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>Go to my Library</Link>
        </div>
      </div>
    );
  }

  const pct = course.lessonCount ? Math.round((course.completedCount / course.lessonCount) * 100) : 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link
          to={course.enrolled ? (urlToken ? `/library?token=${encodeURIComponent(urlToken)}` : "/library") : `/shop/${encodeURIComponent(productId)}`}
          className="inline-flex items-center gap-2 mb-4 text-sm"
          style={{ color: 'var(--color-primary)' }}
        >
          <ArrowLeft className="h-4 w-4" /> {course.enrolled ? "My Library" : "Back to the course page"}
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{course.product.name}</h1>
          {course.enrolled && (
            <div className="w-full sm:w-64">
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {course.completedCount} of {course.lessonCount} lessons complete ({pct}%)
              </p>
              <div className="h-2 rounded" style={{ backgroundColor: 'var(--color-border)' }}>
                <div className="h-2 rounded" style={{ width: `${pct}%`, backgroundColor: 'var(--color-success)' }} />
              </div>
            </div>
          )}
        </div>

        {!course.enrolled && (
          <div className="mb-5 p-3 rounded-lg text-sm flex flex-wrap items-center justify-between gap-3" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-text-primary)' }}>
            <span>
              {course.manager
                ? "Owner preview: every lesson is open to you. Progress isn't saved."
                : "You're previewing this course. Free preview lessons are open; enrol to unlock the rest."}
            </span>
            {!course.manager && (
              <Link to={`/shop/${encodeURIComponent(productId)}`} className="font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
                Enrol now
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          {/* Lesson */}
          <main className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
            {!current && (
              <p className="p-8 text-center" style={{ color: 'var(--color-text-secondary)' }}>This course doesn't have any lessons yet.</p>
            )}

            {current?.locked && (
              <div className="p-10 text-center">
                <Lock className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{current.title}</h2>
                <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                  {course.enrolled
                    ? "Finish the previous lessons to unlock this one."
                    : "This lesson is part of the full course."}
                </p>
                {!course.enrolled && (
                  <Link
                    to={`/shop/${encodeURIComponent(productId)}`}
                    className="inline-flex px-5 py-2.5 rounded-lg font-medium"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                  >
                    Enrol to unlock
                  </Link>
                )}
              </div>
            )}

            {current && !current.locked && (
              <>
                {lessonLoading && !lesson && <p className="p-8" style={{ color: 'var(--color-text-muted)' }}>Loading lesson…</p>}
                {lessonError && !lessonLoading && (
                  <p className="p-8" style={{ color: 'var(--color-error)' }}>{(lessonError as any).message || "Could not load this lesson."}</p>
                )}
                {lesson && lesson.id === current.id && (
                  <>
                    {lesson.videoUrl && (
                      <div className="aspect-video bg-black">
                        <video
                          key={lesson.id}
                          src={lesson.videoUrl}
                          controls
                          playsInline
                          controlsList="nodownload"
                          onContextMenu={(e) => e.preventDefault()}
                          onEnded={() => { if (course.enrolled && !current.completed) void setCompleted(true, false); }}
                          className="w-full h-full"
                        />
                      </div>
                    )}
                    <div className="p-5 md:p-8 space-y-6">
                      <div>
                        {currentModule && <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{currentModule.title}</p>}
                        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{lesson.title}</h2>
                      </div>

                      {/* Cleaned by the backend's allow-list sanitiser when the lesson was saved. */}
                      {lesson.contentHtml && <div className="lesson-content" dangerouslySetInnerHTML={{ __html: lesson.contentHtml }} />}

                      {lesson.attachments.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                            <Paperclip className="h-4 w-4" /> Lesson files
                          </h3>
                          <ul className="space-y-2">
                            {lesson.attachments.map((file) => (
                              <li key={file.id} className="flex items-center justify-between gap-3 text-sm p-2 rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
                                <span className="flex items-center gap-2 min-w-0" style={{ color: 'var(--color-text-secondary)' }}>
                                  <FileText className="h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">{file.name}</span>
                                  {file.size ? <span style={{ color: 'var(--color-text-muted)' }}>({formatSize(file.size)})</span> : null}
                                </span>
                                {file.url && (
                                  <a
                                    href={file.url}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium flex-shrink-0"
                                    style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                                  >
                                    <Download className="h-4 w-4" /> Download
                                  </a>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {current && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 md:px-8 py-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  disabled={!prev}
                  onClick={() => prev && goTo(prev.id)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium disabled:opacity-40"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <ArrowLeft className="h-4 w-4" /> Previous
                </button>

                <div className="flex flex-wrap items-center gap-3">
                  {progressError && <span className="text-sm" style={{ color: 'var(--color-error)' }}>{progressError}</span>}
                  {course.enrolled && !current.locked && (
                    current.completed ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void setCompleted(false, false)}
                        className="inline-flex items-center gap-1.5 text-sm"
                        style={{ color: 'var(--color-success)' }}
                        title="Mark as not done"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Completed
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void setCompleted(true, true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                      >
                        <CheckCircle2 className="h-4 w-4" /> {next ? "Mark complete & next" : "Mark complete"}
                      </button>
                    )
                  )}
                  {next && (!course.enrolled || current.completed || current.locked) && (
                    <button
                      type="button"
                      onClick={() => goTo(next.id)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      Next <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </main>

          {/* Curriculum */}
          <aside className="rounded-xl overflow-hidden lg:sticky lg:top-4" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
            <p className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)' }}>
              Course content
              <span className="font-normal" style={{ color: 'var(--color-text-muted)' }}>
                {" "}· {course.lessonCount} lessons{course.durationSeconds ? ` · ${formatDuration(course.durationSeconds)}` : ""}
              </span>
            </p>
            <div className="max-h-[70vh] overflow-y-auto">
              {course.modules.map((module, mi) => (
                <div key={module.id}>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    {mi + 1}. {module.title}
                  </p>
                  <ul className="pb-2">
                    {module.lessons.map((l) => {
                      const active = l.id === current?.id;
                      const Icon = l.completed ? CheckCircle2 : l.locked ? Lock : l.hasVideo ? PlayCircle : FileText;
                      return (
                        <li key={l.id}>
                          <button
                            type="button"
                            onClick={() => goTo(l.id)}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-sm"
                            style={{ backgroundColor: active ? 'var(--color-primary-light)' : 'transparent' }}
                            aria-current={active ? "true" : undefined}
                          >
                            <Icon
                              className="h-4 w-4 flex-shrink-0"
                              style={{ color: l.completed ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                            />
                            <span className="flex-1 min-w-0 truncate" style={{ color: l.locked ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>
                              {l.title}
                            </span>
                            {l.isPreview && !course.enrolled && (
                              <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--color-primary)' }}>Preview</span>
                            )}
                            {l.durationSeconds ? (
                              <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{formatDuration(l.durationSeconds)}</span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
