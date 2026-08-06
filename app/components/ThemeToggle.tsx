"use client";
import { useEffect, useState } from "react";
import { ChoiceChips } from "@/app/components/ui";
import { getPref, setPref, locate, getCachedCoords, geoPermission, ThemePref } from "@/lib/theme";

// Auto / Dark / Light. Auto follows local sunrise/sunset (see lib/theme +
// ThemeController); picking it requests location once (a user gesture, so the
// permission prompt is expected here rather than a surprise on page load).
export default function ThemeToggle() {
  const [pref, setPrefState] = useState<ThemePref>("auto");
  const [locating, setLocating] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setPrefState(getPref());
    // Reflect where auto is getting its light/dark from.
    (async () => {
      if (getCachedCoords()) return setStatus("Using your location for sunrise/sunset.");
      const perm = await geoPermission();
      setStatus(perm === "denied" ? "Location off — following your system setting." : "");
    })();
  }, []);

  async function choose(next: ThemePref) {
    setPrefState(next);
    setPref(next);
    if (next === "auto") {
      if (getCachedCoords()) {
        setStatus("Using your location for sunrise/sunset.");
      } else {
        setLocating(true);
        const coords = await locate(); // prompts if not yet decided
        setLocating(false);
        setStatus(coords ? "Using your location for sunrise/sunset." : "Location off — following your system setting.");
      }
    } else {
      setStatus("");
    }
    window.dispatchEvent(new Event("themechange")); // ThemeController re-applies
  }

  const hint =
    pref === "auto"
      ? locating
        ? "Getting your location…"
        : status
      : pref === "dark"
      ? "Always dark."
      : "Always light.";

  return (
    <>
      <ChoiceChips
        options={[
          { value: "auto", label: "Auto" },
          { value: "dark", label: "🌙 Dark" },
          { value: "light", label: "☀️ Light" },
        ]}
        value={pref}
        onChange={(v) => choose(v as ThemePref)}
      />
      {hint && <p className="mt-2 text-xs text-ink-faint">{hint}</p>}
    </>
  );
}
