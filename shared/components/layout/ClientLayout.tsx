"use client";

import { LocaleProvider } from "@/shared/lib/locale/LocaleProvider";
import { AchievementToast } from "@/shared/components/notifications/AchievementToast";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      {children}
      <AchievementToast />
    </LocaleProvider>
  );
}
