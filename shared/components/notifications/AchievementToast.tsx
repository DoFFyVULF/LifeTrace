"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/shared/lib/locale/LocaleProvider";

const TOAST_DURATION = 6000; // ms

export type NewAchievement = {
  id: number;
  titleKey: string;
  imagePath: string;
};

export function AchievementToast() {
  const router = useRouter();
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [achievement, setAchievement] = useState<NewAchievement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const startTimeRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const toastQueue = useRef<NewAchievement[]>([]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const startDismiss = useCallback(
    (duration: number) => {
      clearTimer();
      progressRef.current = 0;
      startTimeRef.current = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTimeRef.current;
        const pct = Math.min(elapsed / duration, 1);
        progressRef.current = pct;
        if (lineRef.current) {
          // ScaleX shrinks the bar from right to left (left edge is anchored)
          lineRef.current.style.transform = `scaleX(${1 - pct})`;
        }
        if (pct < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Time's up — check queue for next toast
          setLeaving(true);
          setTimeout(() => {
            setVisible(false);
            setAchievement(null);
            setLeaving(false);
            // Show next from queue if any
            const next = toastQueue.current.shift();
            if (next) {
              setAchievement(next);
              setVisible(true);
              startDismiss(TOAST_DURATION);
            }
          }, 300);
        }
      };
      animFrameRef.current = requestAnimationFrame(animate);

      timerRef.current = setTimeout(() => {
        // fallback
      }, duration + 100);
    },
    [clearTimer],
  );

  const dismiss = useCallback(() => {
    clearTimer();
    setLeaving(true);
    setTimeout(() => {
      setVisible(false);
      setAchievement(null);
      setLeaving(false);
      const next = toastQueue.current.shift();
      if (next) {
        setAchievement(next);
        setVisible(true);
        startDismiss(TOAST_DURATION);
      }
    }, 300);
  }, [clearTimer, startDismiss]);

  const showAchievement = useCallback(
    (ach: NewAchievement) => {
      if (visible || leaving) {
        toastQueue.current.push(ach);
        return;
      }
      setAchievement(ach);
      setVisible(true);
      setPaused(false);
      startDismiss(TOAST_DURATION);
    },
    [visible, leaving, startDismiss],
  );

  const [paused, setPaused] = useState(false);

  const handleMouseEnter = useCallback(() => {
    if (visible && !leaving) {
      setPaused(true);
      clearTimer();
    }
  }, [visible, leaving, clearTimer]);

  const handleMouseLeave = useCallback(() => {
    if (visible && paused) {
      setPaused(false);
      const remaining = TOAST_DURATION * (1 - progressRef.current);
      startDismiss(remaining);
    }
  }, [visible, paused, startDismiss]);

  // Listen for manually dispatched "new achievement" events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        achievements: NewAchievement[];
      };
      const next = detail?.achievements?.[0];
      if (!next) return;
      showAchievement(next);
    };

    window.addEventListener("life-trace-new-achievement", handler);
    return () => {
      window.removeEventListener("life-trace-new-achievement", handler);
      clearTimer();
    };
  }, [showAchievement, clearTimer]);

  // Auto-check achievements on any memory/thread/profile change
  useEffect(() => {
    const onStateChange = () => {
      fetch("/api/achievements/check", { method: "POST" })
        .then((r) => r.json().catch(() => null))
        .then((data) => {
          if (data?.newlyUnlocked?.length) {
            window.dispatchEvent(
              new CustomEvent("life-trace-new-achievement", {
                detail: { achievements: data.newlyUnlocked },
              }),
            );
          }
        })
        .catch(() => {});
    };

    window.addEventListener("life-trace-memory-state", onStateChange);
    return () => {
      window.removeEventListener("life-trace-memory-state", onStateChange);
    };
  }, []);

  if (!visible || !achievement) return null;

  return (
    <div
      className={`achievement-toast ${leaving ? "achievement-toast--leave" : "achievement-toast--enter"}`}
      onClick={() => {
        dismiss();
        router.push("/achievements");
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          dismiss();
          router.push("/achievements");
        }
      }}
    >
      <button
        className="achievement-toast-close"
        onClick={(e) => {
          e.stopPropagation();
          dismiss();
        }}
        aria-label="Close"
      >
        <X size={14} />
      </button>

      <div className="achievement-toast-icon">
        <Trophy size={18} />
      </div>

      <img
        src={achievement.imagePath}
        alt=""
        className="achievement-toast-image"
      />

      <div className="achievement-toast-body">
        <span className="achievement-toast-label">
          {t("achievements.new")}
        </span>
        <strong className="achievement-toast-title">
          {t(achievement.titleKey)}
        </strong>
      </div>

      {/* Animated progress line — starts full, shrinks right→left */}
      <div
        ref={lineRef}
        className="achievement-toast-line"
        style={{ transform: "scaleX(1)" }}
      />
    </div>
  );
}
