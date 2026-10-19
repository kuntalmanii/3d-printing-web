/**
 * HeroSection — landing section scaffold.
 * Demonstrates design tokens: colors, typography, sharp borders.
 */
export default function HeroSection() {
  return (
    <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 gap-8">
      {/* Telemetry label */}
      <span className="tag-mono">SYSTEM INITIALIZED</span>

      {/* Heading */}
      <div className="text-center max-w-2xl space-y-4">
        <h1 className="font-display text-5xl md:text-7xl text-textPrimary leading-none tracking-tight">
          3D PRINT
          <span className="text-primary"> STUDIO</span>
        </h1>
        <p className="font-ui text-base text-textSecondary max-w-md mx-auto">
          Industrial-grade precision tooling for additive manufacturing workflows.
        </p>
      </div>

      {/* CTA row */}
      <div className="flex flex-wrap gap-3 items-center justify-center">
        <button className="btn-primary">
          START BUILD
        </button>
        <button className="btn-ghost">
          VIEW SPECS
        </button>
      </div>

      {/* Telemetry strip */}
      <div className="flex items-center gap-6 border-t border-borderDark pt-6 mt-2 w-full max-w-md">
        <div className="flex items-center gap-2">
          <span className="status-dot status-dot--active" />
          <span className="font-label">EXTRUDER ONLINE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="status-dot status-dot--idle" />
          <span className="font-label text-textSecondary">BED IDLE</span>
        </div>
        <div className="ml-auto font-telemetry text-primary text-xs">
          210°C
        </div>
      </div>
    </section>
  );
}
