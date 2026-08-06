import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ThemeController from "./components/ThemeController";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Nestling — Baby Tracker",
  description: "Track sleep, feeding, diapers and growth — together.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Nestling" },
};

export const viewport: Viewport = {
  // Dark is the default theme; the init script below flips this to the light
  // page color when the user has opted into light mode.
  themeColor: "#0e0e13",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Runs before first paint so the theme never flashes. Resolves the saved
// preference synchronously: fixed dark/light directly; "auto" from the last
// resolved appearance (cached by ThemeController) or the OS setting as a
// starting point. ThemeController then refines auto from sunrise/sunset.
const themeInit = `(function(){try{var t=localStorage.getItem('theme')||'auto';var light;if(t==='light')light=true;else if(t==='dark')light=false;else{var c=localStorage.getItem('autoAppearance');if(c==='light')light=true;else if(c==='dark')light=false;else light=window.matchMedia?!matchMedia('(prefers-color-scheme: dark)').matches:false;}if(light)document.documentElement.classList.add('light');var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',light?'#f5f3ff':'#0e0e13');}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <ThemeController />
        <div className="mx-auto min-h-dvh w-full max-w-md bg-surface shadow-sm">{children}</div>
      </body>
    </html>
  );
}
