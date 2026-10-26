import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./ui/input";
import { cn } from "./ui/utils";

// A password field with a show/hide button. `native` renders a plain
// <input> for forms styled by hand; otherwise it's the ui Input.
export function PasswordInput({ native = false, className, ...props }: Omit<ComponentProps<"input">, "type"> & { native?: boolean }) {
  const [visible, setVisible] = useState(false);
  const Field = native ? "input" : Input;

  return (
    <div className="relative">
      <Field {...props} type={visible ? "text" : "password"} className={cn(className, "pr-10")} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex items-center px-3"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
