"use client";

import { Plus, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "./Logo";
import { SettingsModal } from "@/shared/components/settings/SettingsModal";
import { useLocale } from "@/shared/lib/locale/LocaleProvider";
export function Header() {
  const { t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const handleAdd = () => {
    if (pathname === "/") {
      window.dispatchEvent(new CustomEvent("life-trace-add"));
    } else {
      sessionStorage.setItem("life-trace-queue-add", "1");
      router.push("/");
    }
  };
  return (
    <header className="app-header">
      <Logo />
      <label className="search-box">
        <span>⌕</span>
        <input
          placeholder={t("search.placeholder")}
          onChange={(event) =>
            window.dispatchEvent(
              new CustomEvent("life-trace-search", {
                detail: event.target.value,
              }),
            )
          }
        />
      </label>
      <div className="header-actions">
        <button className="add-button" onClick={handleAdd}>
          <Plus size={15} /> {t("add.memory")}
        </button>
        <button
          className="icon-button"
          aria-label={t("settings.button")}
          onClick={() => setSettingsOpen(true)}
        >
          <Settings size={16} />
        </button>
        <Link href="/profile" className="icon-button" aria-label={t("profile.title")}>
          <UserRound size={16} />
        </Link>
      </div>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}
