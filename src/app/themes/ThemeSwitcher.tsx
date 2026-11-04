import { THEMES, useTheme, type ThemeId } from "./ThemeContext";

// Uses the store's --color-* tokens, which every theme defines, so it reads
// the same in all of them.
export function ThemeSwitcher({ className = "" }: { className?: string }) {
  const { theme, setTheme, locked } = useTheme();
  if (locked) return null;

  return (
    <label className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <span>Theme</span>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemeId)}
        className="px-2 py-1.5 rounded-md text-sm"
        style={{ backgroundColor: 'var(--color-product-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
      >
        {THEMES.map((t) => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>
    </label>
  );
}
