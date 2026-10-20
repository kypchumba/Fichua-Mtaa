import { useMemo, useState } from "react";
import { Field } from "./UI";
import { SERVICE_CATEGORIES } from "../data/services";

// Offer examples from the same service definitions used by the category picker.
const titleSuggestions = SERVICE_CATEGORIES.flatMap(({ examples }) => examples);

export function RequestTitleField({ value, onChange, error }) {
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => {
    const query = value.trim().toLocaleLowerCase();
    const matching = query
      ? titleSuggestions.filter((suggestion) =>
          suggestion.toLocaleLowerCase().includes(query),
        )
      : titleSuggestions;
    return matching.slice(0, 6);
  }, [value]);

  return (
    <div
      className="request-title-field"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <Field
        label="Request title"
        name="title"
        required
        maxLength={120}
        hint="A short summary of the issue. You can also enter your own title."
        error={error}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={onChange}
        aria-expanded={open && suggestions.length > 0}
        aria-controls={
          open && suggestions.length > 0
            ? "request-title-suggestions"
            : undefined
        }
      />
      {open && suggestions.length > 0 && (
        <div
          id="request-title-suggestions"
          className="request-title-suggestions"
          role="group"
          aria-label="Suggested request titles"
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange({ target: { value: suggestion } });
                setOpen(false);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
