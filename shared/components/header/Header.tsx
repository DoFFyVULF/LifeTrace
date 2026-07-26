"use client";

import { Plus, Settings, UserRound } from "lucide-react";
import Logo from "./Logo";
export function Header() {
  return (
    <header className="app-header">
      <Logo />
      <label className="search-box">
        <span>⌕</span>
        <input
          placeholder="Search your memories..."
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
        <button
          className="add-button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("life-trace-add"))
          }
        >
          <Plus size={15} /> Add memory
        </button>
        <button className="icon-button" aria-label="Settings">
          <Settings size={16} />
        </button>
        <button className="icon-button" aria-label="Profile">
          <UserRound size={16} />
        </button>
      </div>
    </header>
  );
}
