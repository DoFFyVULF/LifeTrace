"use client";

import { LocaleProvider } from "@/shared/lib/locale/LocaleProvider";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
