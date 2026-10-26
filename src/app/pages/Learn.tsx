import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import {
  ArrowLeft, ArrowRight, Award, CheckCircle2, ClipboardCheck, Download, FileText, Lock, Paperclip, PlayCircle, XCircle,
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
  hasQuiz: boolean;
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
  certificateEnabled: boolean;
  certificate: { code: string } | null;
}

interface LessonContent {
  id: string;
  title: string;
  completed: boolean;
  contentHtml: string;
  videoUrl: string | null;
  attachments: { id: string; name: string; size: number | null; url: string | null }[];
  quiz: {
    passPercent: number;
    questions: { id: string; prompt: string; options: string[] }[];
    passed: boolean;
  } | null;
}

interface QuizResult {
  scorePercent: number;
  passPercent: number;
  passed: boolean;
  correctCount: number;
  questionCount: number;
  results: { questionId: string; correct: boolean; correctIndex?: number; explanation?: string }[];
  course: Partial<CourseState>;
}

// A lesson's multiple-choice quiz. Scored by the backend, which only reveals
// the right answers once the learner passes.
function QuizPanel({ quiz, canSubmit, blockedReason, onSubmit }: {
  quiz: NonNullable<LessonContent["quiz"]>;
  canSubmit: boolean;
  blockedReason: string;
  onSubmit: (answers: Record<string, number>) => Promise<QuizResult>;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = quiz.questions.every((q) => answers[q.id] !== undefined);
  const byId = Object.fromEntries((result?.results ?? []).map((r) => [r.questionId, r]));
  const locked = !!result?.passed;

  const choose = (questionId: string, index: number) => {
    if (locked) return;
    setAnswers((a) => ({ ...a, [questionId]: index }));
    if (result) setResult(null); // a failed attempt's marks no longer apply
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      setResult(await onSubmit(answers));
    } catch (err: any) {
      setError(err.message || "Could not submit the quiz");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl p-4 md:p-5 space-y-5" style={{ border: '1px solid var(--color-border)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <ClipboardCheck className="h-5 w-5" /> Quiz
        </h3>
        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {quiz.questions.length} question{quiz.questions.length === 1 ? "" : "s"} · pass mark {quiz.passPercent}%
        </span>
      </div>

      {quiz.passed && !result && (
        <p className="text-sm flex items-center gap-2" style={{ color: 'var(--color-success)' }}>
          <CheckCircle2 className="h-4 w-4" /> You've passed this quiz. You can take it again any time.
        </p>
      )}

      <ol className="space-y-5">
        {quiz.questions.map((q, qi) => {
          const mark = byId[q.id];
          return (
            <li key={q.id}>
              <p className="font-medium mb-2 flex items-start gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <span>{qi + 1}.</span>
                <span className="flex-1 whitespace-pre-line">{q.prompt}</span>
                {mark && (mark.correct
                  ? <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--color-success)' }} aria-label="Correct" />
                  : <XCircle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--color-error)' }} aria-label="Incorrect" />)}
              </p>
              <div className="space-y-1.5" role="radiogroup" aria-label={`Question ${qi + 1}`}>
                {q.options.map((option, oi) => {
                  const isRight = mark?.correctIndex === oi;
                  return (
                    <label
                      key={oi}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer"
                      style={{
                        border: `1px solid ${isRight ? 'var(--color-success)' : 'var(--color-border)'}`,
                        backgroundColor: answers[q.id] === oi ? 'var(--color-primary-light)' : 'transparent',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={answers[q.id] === oi}
                        disabled={locked || !canSubmit}
                        onChange={() => choose(q.id, oi)}
                      />
                      <span className="flex-1">{option}</span>
                      {isRight && <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>Correct answer</span>}
                    </label>
                  );
                })}
              </div>
              {mark?.explanation && (
                <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>{mark.explanation}</p>
              )}
            </li>
          );
        })}
      </ol>

      {result && (
        <p className="text-sm font-medium" style={{ color: result.passed ? 'var(--color-success)' : 'var(--color-error)' }}>
          {result.passed
            ? `Passed - you scored ${result.scorePercent}% (${result.correctCount} of ${result.questionCount}).`
            : `You scored ${result.scorePercent}% - you need ${result.passPercent}%. Change your answers and try again.`}
        </p>
      )}
      {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}

      {!canSubmit ? (
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{blockedReason}</p>
      ) : locked ? (
        <button
          type="button"
          onClick={() => { setResult(null); setAnswers({}); }}
          className="text-sm font-medium"
          style={{ color: 'var(--color-primary)' }}
        >
          Retake quiz
        </button>
      ) : (
        <button
          type="button"
          disabled={!allAnswered || submitting || (!!result && !result.passed)}
          onClick={() => void submit()}
          className="px-4 py-2 rounded-lg font-medium disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
        >
          {submitting ? "Checking…" : "Submit answers"}
        </button>
      )}
    </div>
  );
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
  // Quizzes passed during this visit (the loaded lesson still says not passed).
  const [passedQuizzes, setPassedQuizzes] = useState<string[]>([]);
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

  const submitQuiz = async (answers: Record<string, number>): Promise<QuizResult> => {
    if (!course || !current) throw new Error("No lesson open");
    const result = (await api.post(`${API_BASE}/learn/quiz`, {
      lessonId: current.id,
      answers,
      ...(course.token ? { token: course.token } : { guestId: getGuestId() }),
    }, headers)) as QuizResult;
    setCourse({ ...course, ...result.course });
    if (result.passed) setPassedQuizzes((ids) => [...ids, current.id]);
    return result;
  };

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
  const courseDone = course.enrolled && course.lessonCount > 0 && course.completedCount >= course.lessonCount;
  // A quiz lesson completes by passing its quiz, not by "Mark complete".
  const quizPending = !!(current && lesson?.id === current.id && lesson.quiz && !lesson.quiz.passed
    && !passedQuizzes.includes(current.id) && !current.completed);

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

        {courseDone && (
          <div className="mb-5 p-4 rounded-lg flex flex-wrap items-center justify-between gap-3" style={{ border: '1px solid var(--color-success)', color: 'var(--color-text-primary)' }}>
            <span className="flex items-center gap-2 font-medium">
              <Award className="h-5 w-5" style={{ color: 'var(--color-success)' }} /> You've completed this course!
            </span>
            {course.certificate && (
              <Link
                to={`/certificates/${encodeURIComponent(course.certificate.code)}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--color-success)', color: 'white' }}
              >
                <Award className="h-4 w-4" /> View your certificate
              </Link>
            )}
          </div>
        )}

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

                      {lesson.quiz && (
                        <QuizPanel
                          key={lesson.id}
                          quiz={lesson.quiz}
                          canSubmit={course.enrolled}
                          blockedReason={course.manager ? "Owner preview: quizzes are scored for enrolled learners only." : "Enrol in the course to take this quiz."}
                          onSubmit={submitQuiz}
                        />
                      )}

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
                  {quizPending && (
                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Pass the quiz to complete this lesson</span>
                  )}
                  {course.enrolled && !current.locked && !quizPending && (
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
                      const Icon = l.completed ? CheckCircle2 : l.locked ? Lock : l.hasVideo ? PlayCircle : l.hasQuiz ? ClipboardCheck : FileText;
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
