// Theme resolution shared by the toggle (settings) and the app-wide controller.
//
// Three preferences: "auto" (default) follows local sunrise/sunset; "dark" and
// "light" are fixed. Auto needs a location: we use the device's (granted once,
// then cached), compute sun times locally — no network, nothing leaves the
// device — and fall back to the OS `prefers-color-scheme`, then a daytime
// heuristic, when location isn't available.

export type ThemePref = "auto" | "dark" | "light";
export type Appearance = "dark" | "light";
export type Coords = { lat: number; lng: number };

const THEME_KEY = "theme";
const GEO_KEY = "geo";
const AUTO_KEY = "autoAppearance"; // last resolved auto appearance, for no-flash boot

// Keep these in sync with the boot script in app/layout.tsx.
export const THEME_COLOR: Record<Appearance, string> = { dark: "#0e0e13", light: "#f5f3ff" };

export function getPref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "dark" || v === "light" || v === "auto") return v;
  } catch {}
  return "auto";
}

export function setPref(p: ThemePref) {
  try {
    localStorage.setItem(THEME_KEY, p);
  } catch {}
}

export function getCachedCoords(): Coords | null {
  try {
    const raw = localStorage.getItem(GEO_KEY);
    if (raw) {
      const c = JSON.parse(raw);
      if (typeof c?.lat === "number" && typeof c?.lng === "number") return { lat: c.lat, lng: c.lng };
    }
  } catch {}
  return null;
}

function setCachedCoords(c: Coords) {
  try {
    localStorage.setItem(GEO_KEY, JSON.stringify(c));
  } catch {}
}

/** OS-level preference — used when we have no location. Defaults to dark. */
export function systemAppearance(): Appearance {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "dark";
}

// ——— Sunrise/sunset ———
// Derived from SunCalc (Vladimir Agafonkin, BSD-2-Clause) — the standard
// low-precision sunrise equation, accurate to ~1 min. Pure math, no deps.
const rad = Math.PI / 180;
const dayMs = 864e5;
const J1970 = 2440588;
const J2000 = 2451545;
const J0 = 0.0009;
const e = rad * 23.4397; // obliquity of the Earth

const toJulian = (d: Date) => d.valueOf() / dayMs - 0.5 + J1970;
const fromJulian = (j: number) => new Date((j + 0.5 - J1970) * dayMs);
const toDays = (d: Date) => toJulian(d) - J2000;
const solarMeanAnomaly = (d: number) => rad * (357.5291 + 0.98560028 * d);
const eclipticLongitude = (M: number) =>
  M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
const declination = (L: number) => Math.asin(Math.sin(e) * Math.sin(L));
const julianCycle = (d: number, lw: number) => Math.round(d - J0 - lw / (2 * Math.PI));
const approxTransit = (Ht: number, lw: number, n: number) => J0 + (Ht + lw) / (2 * Math.PI) + n;
const solarTransitJ = (ds: number, M: number, L: number) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);

/** Sunrise/sunset for `date` at (lat, lng), or null in polar day/night. */
export function sunTimes(date: Date, lat: number, lng: number): { sunrise: Date; sunset: Date } | null {
  const lw = rad * -lng;
  const phi = rad * lat;
  const d = toDays(date);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L);
  const Jnoon = solarTransitJ(ds, M, L);

  const h0 = -0.833 * rad; // sun's upper edge at the horizon, incl. refraction
  const cosH = (Math.sin(h0) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  if (cosH >= 1 || cosH <= -1) return null; // sun never rises / never sets
  const w0 = Math.acos(cosH);

  const Jset = solarTransitJ(approxTransit(w0, lw, n), M, L);
  const Jrise = Jnoon - (Jset - Jnoon);
  return { sunrise: fromJulian(Jrise), sunset: fromJulian(Jset) };
}

/** Auto appearance for `now`: light between sunrise and sunset, else dark. */
export function autoAppearance(now: Date, coords: Coords | null): Appearance {
  if (!coords) return systemAppearance();
  const t = sunTimes(now, coords.lat, coords.lng);
  if (!t) return systemAppearance();
  return now >= t.sunrise && now < t.sunset ? "light" : "dark";
}

export function resolveAppearance(pref: ThemePref, now: Date, coords: Coords | null): Appearance {
  if (pref === "dark") return "dark";
  if (pref === "light") return "light";
  return autoAppearance(now, coords);
}

/** When does auto next flip? Timestamp (ms) of the next sunrise/sunset after now. */
export function nextFlipMs(now: Date, coords: Coords | null): number | null {
  if (!coords) return null;
  const candidates: number[] = [];
  for (const offset of [0, 1]) {
    const d = new Date(now);
    d.setDate(now.getDate() + offset);
    const t = sunTimes(d, coords.lat, coords.lng);
    if (t) candidates.push(+t.sunrise, +t.sunset);
  }
  const future = candidates.filter((ts) => ts > +now).sort((a, b) => a - b);
  return future[0] ?? null;
}

/** Apply appearance to the DOM (class + PWA status-bar color); cache for boot. */
export function applyAppearance(a: Appearance, pref: ThemePref) {
  document.documentElement.classList.toggle("light", a === "light");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLOR[a]);
  try {
    if (pref === "auto") localStorage.setItem(AUTO_KEY, a);
  } catch {}
}

/** Ask the browser for the current position (prompts if not yet decided). */
export function locate(): Promise<Coords | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCachedCoords(c);
        resolve(c);
      },
      () => resolve(null),
      { timeout: 10000, maximumAge: 6 * 60 * 60 * 1000 }
    );
  });
}

/** Geolocation permission state without triggering a prompt. */
export async function geoPermission(): Promise<"granted" | "prompt" | "denied" | "unknown"> {
  try {
    if (navigator.permissions?.query) {
      const s = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      return s.state;
    }
  } catch {}
  return "unknown";
}
