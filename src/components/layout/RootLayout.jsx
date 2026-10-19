/**
 * RootLayout — persistent shell wrapping all pages.
 * Enforces background, base font, and full-height layout.
 */
export default function RootLayout({ children }) {
  return (
    <div className="min-h-dvh bg-background text-textPrimary font-sans flex flex-col">
      {/* Top border accent line */}
      <div className="h-[2px] w-full bg-primary flex-shrink-0" />

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer bar */}
      <footer className="border-t border-borderDark px-6 py-3 flex items-center justify-between">
        <span className="font-label text-textSecondary">3D PRINTING SYSTEM</span>
        <span className="font-telemetry text-[10px] text-textSecondary">
          v0.1.0 — READY
        </span>
      </footer>
    </div>
  );
}
