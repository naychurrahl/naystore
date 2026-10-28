import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { CountryCode } from "libphonenumber-js/min";
import { checkPhone, countryList, countryName, splitPhone } from "../utils/phone";

type Props = {
  // The saved value: +E.164 once it's a real number, otherwise what was typed.
  value: string;
  // valid is false only for a filled-in number that isn't real.
  onChange: (value: string, valid: boolean) => void;
  required?: boolean;
  id?: string;
  style?: CSSProperties;
};

// A country picker (Nigeria by default) and the number. Typing a number with
// a + picks the country from it.
export function PhoneInput({ value, onChange, required, id, style }: Props) {
  const [country, setCountry] = useState<CountryCode>(() => splitPhone(value).country);
  const [text, setText] = useState(() => splitPhone(value).national);
  const [touched, setTouched] = useState(false);
  const reported = useRef(value);

  // A value set from outside (e.g. filled in from the profile).
  useEffect(() => {
    if (value === reported.current) return;
    const split = splitPhone(value);
    setCountry(split.country);
    setText(split.national);
    reported.current = value;
  }, [value]);

  const report = (nextText: string, nextCountry: CountryCode) => {
    const result = checkPhone(nextText, nextCountry);
    const next = result.e164 ?? nextText.trim();
    reported.current = next;
    onChange(next, result.empty || result.e164 !== null);
    return result;
  };

  const result = checkPhone(text, country);
  const showError = touched && !result.empty && !result.e164;

  return (
    <div>
      <div className="flex gap-2">
        <select
          aria-label="Country"
          value={country}
          onChange={(e) => {
            const next = e.target.value as CountryCode;
            setCountry(next);
            report(text, next);
          }}
          className="w-28 shrink-0 px-2 py-3 rounded-lg border"
          style={style}
        >
          {countryList().map((c) => (
            <option key={c.code} value={c.code}>{c.flag} {c.dial} {c.name}</option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required={required}
          value={text}
          placeholder={country === "NG" ? "0803 123 4567" : "Phone number"}
          onChange={(e) => {
            const nextText = e.target.value;
            setText(nextText);
            const checked = report(nextText, country);
            if (nextText.trim().startsWith("+") && checked.country && checked.country !== country) setCountry(checked.country);
          }}
          onBlur={() => setTouched(true)}
          className="min-w-0 flex-1 px-4 py-3 rounded-lg border"
          style={style}
        />
      </div>
      {showError && (
        <p className="text-xs mt-1" style={{ color: "var(--color-error)" }}>
          That doesn't look like a valid {countryName(result.country ?? country)} number.
        </p>
      )}
    </div>
  );
}
