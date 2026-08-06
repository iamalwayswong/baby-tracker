import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

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

// Runs before first paint so a light-mode user never flashes the default dark
// theme: reads the saved preference and, if "light", tags <html> accordingly
// (and matches the PWA status-bar color).
const themeInit = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.add('light');var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#f5f3ff');}}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <div className="mx-auto min-h-dvh w-full max-w-md bg-surface shadow-sm">{children}</div>
      </body>
    </html>
  );
}
