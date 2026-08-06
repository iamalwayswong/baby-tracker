"use client";
import { useEffect, useState } from "react";
import { ChoiceChips } from "@/app/components/ui";

type Theme = "dark" | "light";

// Apply + persist the theme. Dark is the default (no `.light` class); light is
// opted in. Kept in sync with the no-flash init script in app/layout.tsx.
function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("light", theme === "light");
  try {
    localStorage.setItem("theme", theme);
  } catch {}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#f5f3ff" : "#0e0e13");
}

export default function ThemeToggle() {
  // Start from the class the init script already set, so the control matches
  // what's on screen (avoids a flip on hydration).
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");
  }, []);

  return (
    <ChoiceChips
      options={[
        { value: "dark", label: "🌙 Dark" },
        { value: "light", label: "☀️ Light" },
      ]}
      value={theme}
      onChange={(v) => {
        setTheme(v as Theme);
        applyTheme(v as Theme);
      }}
    />
  );
}
