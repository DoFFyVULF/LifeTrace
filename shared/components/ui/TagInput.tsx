"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
};

const TAG_REGEX = /^[a-zA-Zа-яА-ЯёЁ0-9_\-+#]+$/;

export function TagInput({ tags, onChange, placeholder = "Add a tag..." }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
      setInputValue("");
    }
    if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    const parts = text.split(/[,;\n\r]+/).map((s) => s.trim()).filter(Boolean);
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

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
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
        onBlur={() => {
          if (inputValue.trim()) {
            addTag(inputValue);
            setInputValue("");
          }
        }}
        placeholder={tags.length === 0 ? placeholder : ""}
      />
    </div>
  );
}
