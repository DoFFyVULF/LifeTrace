"use client";

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
};

export function Switch({ checked, onChange, label = "Edit" }: SwitchProps) {
  return (
    <label className={`archive-switch ${checked ? "is-checked" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
      />
      <span className="archive-switch-track" aria-hidden="true">
        <svg
          className="archive-switch-icon archive-switch-icon--open"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <path d="M50 18A20 20 0 0 0 30 38v8a8 8 0 0 0-8 8v20a8 8 0 0 0 8 8h40a8 8 0 0 0 8-8V54a8 8 0 0 0-8-8H38v-8a12 12 0 0 1 23.6-3 4 4 0 1 0 7.8-2A20 20 0 0 0 50 18Z" />
        </svg>
        <svg
          className="archive-switch-icon archive-switch-icon--closed"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <path
            d="M30 46v-8a20 20 0 0 1 40 0v8a8 8 0 0 1 8 8v20a8 8 0 0 1-8 8H30a8 8 0 0 1-8-8V54a8 8 0 0 1 8-8Zm32-8v8H38v-8a12 12 0 0 1 24 0Z"
            fillRule="evenodd"
          />
        </svg>
        <span className="archive-switch-thumb" />
      </span>
      <span className="archive-switch-label">
        {checked ? "Editing" : label}
      </span>
    </label>
  );
}
