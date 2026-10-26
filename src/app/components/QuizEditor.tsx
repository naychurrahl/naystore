import { ArrowDown, ArrowUp, ClipboardCheck, Plus, Trash2, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

export interface QuizQuestionDraft {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizDraft {
  passPercent: number;
  questions: QuizQuestionDraft[];
}

const MAX_OPTIONS = 8;

const blankQuestion = (): QuizQuestionDraft => ({ prompt: "", options: ["", ""], correctIndex: 0, explanation: "" });

// Multiple-choice quiz of one lesson (one correct option per question).
// Edited as a draft and saved with the rest of the lesson; learners must
// score at least the pass mark to complete the lesson.
export function QuizEditor({ value, onChange }: { value: QuizDraft | null; onChange: (quiz: QuizDraft | null) => void }) {
  if (!value) {
    return (
      <div className="space-y-1">
        <Button type="button" size="sm" variant="outline" onClick={() => onChange({ passPercent: 70, questions: [blankQuestion()] })}>
          <ClipboardCheck className="h-4 w-4 mr-1.5" /> Add a quiz
        </Button>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          With a quiz, learners complete this lesson by passing it. For an end-of-module test, add a lesson that only has a quiz.
        </p>
      </div>
    );
  }

  const setQuestion = (qi: number, patch: Partial<QuizQuestionDraft>) =>
    onChange({ ...value, questions: value.questions.map((q, i) => (i === qi ? { ...q, ...patch } : q)) });

  const moveQuestion = (qi: number, dir: -1 | 1) => {
    const questions = [...value.questions];
    [questions[qi], questions[qi + dir]] = [questions[qi + dir], questions[qi]];
    onChange({ ...value, questions });
  };

  const removeOption = (qi: number, oi: number) => {
    const q = value.questions[qi];
    const correctIndex = q.correctIndex === oi ? 0 : q.correctIndex > oi ? q.correctIndex - 1 : q.correctIndex;
    setQuestion(qi, { options: q.options.filter((_, i) => i !== oi), correctIndex });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Pass mark
          <Input
            type="number"
            min={1}
            max={100}
            className="w-20"
            value={value.passPercent}
            onChange={(e) => onChange({ ...value, passPercent: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })}
          />
          %
        </label>
        <button
          type="button"
          className="text-sm"
          style={{ color: 'var(--color-error)' }}
          onClick={() => { if (confirm("Remove this lesson's quiz?")) onChange(null); }}
        >
          Remove quiz
        </button>
      </div>

      {value.questions.map((q, qi) => (
        <div key={qi} className="p-3 rounded-lg space-y-2" style={{ border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-1">
            <p className="flex-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Question {qi + 1}</p>
            <button type="button" aria-label="Move question up" disabled={qi === 0} onClick={() => moveQuestion(qi, -1)} className="p-1 disabled:opacity-30" style={{ color: 'var(--color-text-muted)' }}><ArrowUp className="h-4 w-4" /></button>
            <button type="button" aria-label="Move question down" disabled={qi === value.questions.length - 1} onClick={() => moveQuestion(qi, 1)} className="p-1 disabled:opacity-30" style={{ color: 'var(--color-text-muted)' }}><ArrowDown className="h-4 w-4" /></button>
            <button
              type="button"
              aria-label="Delete question"
              onClick={() => onChange({ ...value, questions: value.questions.filter((_, i) => i !== qi) })}
              className="p-1"
              style={{ color: 'var(--color-error)' }}
            ><Trash2 className="h-4 w-4" /></button>
          </div>
          <Textarea rows={2} placeholder="The question" value={q.prompt} onChange={(e) => setQuestion(qi, { prompt: e.target.value })} />

          <div className="space-y-1.5">
            {q.options.map((option, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${qi}`}
                  checked={q.correctIndex === oi}
                  onChange={() => setQuestion(qi, { correctIndex: oi })}
                  aria-label={`Option ${oi + 1} is the correct answer`}
                  title="Correct answer"
                />
                <Input
                  placeholder={`Option ${oi + 1}`}
                  value={option}
                  onChange={(e) => setQuestion(qi, { options: q.options.map((o, i) => (i === oi ? e.target.value : o)) })}
                />
                <button
                  type="button"
                  aria-label={`Remove option ${oi + 1}`}
                  disabled={q.options.length <= 2}
                  onClick={() => removeOption(qi, oi)}
                  className="p-1 disabled:opacity-30"
                  style={{ color: 'var(--color-text-muted)' }}
                ><X className="h-4 w-4" /></button>
              </div>
            ))}
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Select the dot beside the correct answer.</p>
            {q.options.length < MAX_OPTIONS && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm"
                style={{ color: 'var(--color-primary)' }}
                onClick={() => setQuestion(qi, { options: [...q.options, ""] })}
              >
                <Plus className="h-3.5 w-3.5" /> Add option
              </button>
            )}
          </div>

          <Input
            placeholder="Explanation shown after passing (optional)"
            value={q.explanation}
            onChange={(e) => setQuestion(qi, { explanation: e.target.value })}
          />
        </div>
      ))}

      <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...value, questions: [...value.questions, blankQuestion()] })}>
        <Plus className="h-4 w-4 mr-1" /> Add question
      </Button>
    </div>
  );
}
