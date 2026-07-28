"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  /** All tags available in the system (for autocomplete suggestions). */
  existingTags?: string[];
};

const TAG_REGEX = /^[a-zA-Zа-яА-ЯёЁ0-9_\-+#]+$/;

export function TagInput({
  tags,
  onChange,
  placeholder = "Add a tag...",
  existingTags = [],
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on current input, excluding already-selected tags
  const suggestions = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return existingTags
      .filter(
        (tag) =>
          tag.toLowerCase().includes(q) &&
          !tags.includes(tag) &&
          tag !== q,
      )
      .slice(0, 10);
  }, [inputValue, existingTags, tags]);

  const addTag = useCallback(
    (raw: string) => {
      const tag = raw.trim().toLowerCase();
      if (!tag || !TAG_REGEX.test(tag)) return;
      if (tags.includes(tag)) return;
      onChange([...tags, tag]);
    },
    [tags, onChange],
  );

  const removeTag = useCallback(
    (index: number) => {
      onChange(tags.filter((_, i) => i !== index));
    },
    [tags, onChange],
  );

  const commitInput = useCallback(() => {
    if (inputValue.trim()) {
      addTag(inputValue);
      setInputValue("");
    }
  }, [inputValue, addTag]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitInput();
      // Keep focus after adding
      inputRef.current?.focus();
    }
    if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
    if (e.key === "Escape" && suggestions.length) {
      e.preventDefault();
      setInputValue("");
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    const parts = text
      .split(/[,;\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 1) {
      const newTags = [...tags];
      for (const part of parts) {
        const tag = part.toLowerCase();
        if (tag && TAG_REGEX.test(tag) && !newTags.includes(tag)) {
          newTags.push(tag);
        }
      }
      onChange(newTags);
      setInputValue("");
    } else {
      setInputValue(text);
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    if (!focused || !suggestions.length) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [focused, suggestions.length]);

  return (
    <div className="tag-input-wrap" ref={wrapRef}>
      <div
        className="tag-input"
        role="listbox"
        aria-label="Tags"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, index) => (
          <span key={tag} className="tag-chip" role="option" aria-selected>
            <span>{tag}</span>
            <button
              type="button"
              className="tag-chip-remove"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
              aria-label={`Remove tag ${tag}`}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="tag-input-field"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            // Small delay so suggestion click fires before blur
            setTimeout(() => {
              commitInput();
              setFocused(false);
            }, 160);
          }}
          placeholder={tags.length === 0 ? placeholder : ""}
        />
      </div>

      {/* Autocomplete suggestions */}
      {focused && suggestions.length > 0 && (
        <div className="tag-suggestions">
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              className="tag-suggestion"
              onMouseDown={(e) => {
                // prevent blur from firing before click
                e.preventDefault();
                addTag(tag);
                setInputValue("");
                inputRef.current?.focus();
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
