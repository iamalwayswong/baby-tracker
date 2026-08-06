"use client";
import { useEffect } from "react";
import {
  getPref,
  getCachedCoords,
  resolveAppearance,
  applyAppearance,
  nextFlipMs,
  geoPermission,
  locate,
  Coords,
} from "@/lib/theme";

// Mounted once (in the root layout). Owns applying the resolved appearance and,
// for "auto", flipping light<->dark at the local sunrise/sunset. Renders nothing.
export default function ThemeController() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    async function apply() {
      if (stopped) return;
      const pref = getPref();
      let coords: Coords | null = getCachedCoords();
      // In auto with no cached location, only fetch it silently if already
      // granted — never surprise-prompt on load (the toggle prompts on tap).
      if (pref === "auto" && !coords && (await geoPermission()) === "granted") {
        coords = await locate();
      }
      if (stopped) return;
      const now = new Date();
      applyAppearance(resolveAppearance(pref, now, coords), pref);

      clearTimeout(timer);
      if (pref !== "auto") return; // fixed themes never change on their own
      // Wake at the next sun boundary (capped at 1h so we also recover from
      // clock drift / the system-fallback path, which has no boundary).
      const next = nextFlipMs(now, coords);
      const delay = next ? next - Date.now() + 1000 : 60 * 60 * 1000;
      timer = setTimeout(apply, Math.max(1000, Math.min(delay, 60 * 60 * 1000)));
    }

    apply();

    const onVisible = () => {
      if (document.visibilityState === "visible") apply();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", apply);
    // Follow the OS when we're on the system-preference fallback.
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener?.("change", apply);
    // The settings toggle fires this after changing the preference.
    window.addEventListener("themechange", apply);

    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", apply);
      mq?.removeEventListener?.("change", apply);
      window.removeEventListener("themechange", apply);
    };
  }, []);

  return null;
}
