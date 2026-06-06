// Celebration helpers — confetti bursts + level-up detection.
// Keeps UI logic in one place so any page can trigger a celebration.

import confetti from "canvas-confetti";
import { getLevelInfo, loadStats } from "@/lib/gamification";

const PREV_LEVEL_KEY = (email) => `zama_prev_level_${email}`;

/** Quick small burst — used on a single correct answer. */
export function celebrateCorrect() {
  try {
    confetti({
      particleCount: 40,
      spread: 60,
      startVelocity: 30,
      origin: { y: 0.7 },
      colors: ["#22c55e", "#facc15", "#3b82f6", "#a855f7"],
      scalar: 0.8,
      disableForReducedMotion: true,
    });
  } catch {}
}

/** Bigger burst — used when a session is finished with a good score. */
export function celebrateBig() {
  try {
    confetti({
      particleCount: 140,
      spread: 100,
      startVelocity: 45,
      origin: { y: 0.6 },
      colors: ["#22c55e", "#facc15", "#f97316", "#3b82f6", "#a855f7", "#ec4899"],
      disableForReducedMotion: true,
    });
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.7 },
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.7 },
        disableForReducedMotion: true,
      });
    }, 250);
  } catch {}
}

/**
 * Detects whether the user just levelled up since the last call.
 * Compares the user's current level to the one stored in localStorage.
 * If higher, dispatches a global "zama_level_up" event and stores the new level.
 * Returns the new level info if a level-up was detected, otherwise null.
 */
export function checkLevelUp(email) {
  if (!email) return null;
  try {
    const stats = loadStats(email);
    const current = getLevelInfo(stats.totalXp || 0);
    const stored = parseInt(localStorage.getItem(PREV_LEVEL_KEY(email)) || "0", 10);

    // First time we see this user — just record their current level, don't celebrate.
    if (!stored) {
      localStorage.setItem(PREV_LEVEL_KEY(email), String(current.level));
      return null;
    }

    if (current.level > stored) {
      localStorage.setItem(PREV_LEVEL_KEY(email), String(current.level));
      window.dispatchEvent(new CustomEvent("zama_level_up", { detail: current }));
      return current;
    }
    return null;
  } catch {
    return null;
  }
}