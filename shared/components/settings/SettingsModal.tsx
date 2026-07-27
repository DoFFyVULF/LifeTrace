"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLocale } from "@/shared/lib/locale/LocaleProvider";
import type { Locale } from "@/shared/lib/locale/translations";

type Props = {
  open: boolean;
  onClose: () => void;
};

const LANGUAGES: { value: Locale; labelKey: string }[] = [
  { value: "en", labelKey: "settings.language.en" },
  { value: "ru", labelKey: "settings.language.ru" },
];

export function SettingsModal({ open, onClose }: Props) {
  const { t, locale, setLocale } = useLocale();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="settings-overlay"
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="settings-modal" role="dialog" aria-modal="true" aria-label={t("settings.title")}>
        <div className="settings-modal-head">
          <h2>{t("settings.title")}</h2>
          <button
            className="settings-close"
            onClick={onClose}
            aria-label={t("settings.close")}
          >
            <X size={16} />
          </button>
        </div>
        <div className="settings-modal-body">
          <div className="settings-group">
            <label className="settings-label">{t("settings.language")}</label>
            <div className="settings-language-options">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  className={`settings-language-btn ${locale === lang.value ? "is-active" : ""}`}
                  onClick={() => setLocale(lang.value)}
                >
                  {t(lang.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
