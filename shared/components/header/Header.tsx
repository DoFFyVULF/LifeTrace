"use client";

import { Plus, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "./Logo";
export function Header() {
  const pathname = usePathname();
  const router = useRouter();
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
        <button className="add-button" onClick={handleAdd}>
          <Plus size={15} /> Add memory
        </button>
        <button className="icon-button" aria-label="Settings">
          <Settings size={16} />
        </button>
        <Link href="/profile" className="icon-button" aria-label="Profile">
          <UserRound size={16} />
        </Link>
      </div>
    </header>
  );
}
