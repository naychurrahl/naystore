import { THEMES, useTheme, type ThemeId } from "./ThemeContext";
import { COLOR_MODES, useColorMode, type ColorMode } from "./ColorMode";

// Uses the store's --color-* tokens, which every theme defines, so it reads
// the same in all of them. On a shop's own domain the theme is fixed, but
// light or dark can still be picked.
export function ThemeSwitcher({ className = "" }: { className?: string }) {
  const { theme, setTheme, locked } = useTheme();
  const { mode, setMode } = useColorMode();
  const select = "px-2 py-1.5 rounded-md text-sm";
  const look = { backgroundColor: 'var(--color-product-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' };

  return (
    <span className={`inline-flex flex-wrap items-center justify-center gap-3 text-sm ${className}`}>
      {!locked && (
        <label className="inline-flex items-center gap-2">
          <span>Theme</span>
          <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeId)} className={select} style={look}>
            {THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
      )}
      <label className="inline-flex items-center gap-2">
        <span>Mode</span>
        <select value={mode} onChange={(e) => setMode(e.target.value as ColorMode)} className={select} style={look}>
          {COLOR_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </label>
    </span>
  );
}
