/**
 * HeroSection.jsx
 * ───────────────────────────────────────────────────────────────
 * Atmospheric hero with an ambient Three.js WebGL canvas layer:
 *   - Slowly rotating isometric wireframe grid (#333333)
 *   - Animated CNC raster toolpath drawing in #FF5A00
 *   - Sparse particle nodes with orange accent dots
 *
 * Layout layers (z-index):
 *   0 → WebGL canvas (absolute, full-bleed)
 *   1 → Gradient vignette mask
 *  10 → Nav, hero copy, telemetry bar
 */

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════
   SCENE CONSTANTS
═══════════════════════════════════════════════════════════════ */
const ORANGE      = "#FF5A00";
const GRID_COLOR  = "#2B2B2B";
const GRID_SIZE   = 26;
const GRID_DIVS   = 26;
const TILT        = Math.PI * 0.21;       // isometric tilt on X axis
const SPIN_SPEED  = 0.03;                 // radians/sec rotation

/* ═══════════════════════════════════════════════════════════════
   1. WIREFRAME GRID
═══════════════════════════════════════════════════════════════ */
function WireframeGrid() {
  const groupRef = useRef();

  const geo = useMemo(() => {
    const g     = new THREE.BufferGeometry();
    const verts = [];
    const half  = GRID_SIZE / 2;
    const step  = GRID_SIZE / GRID_DIVS;

    for (let i = 0; i <= GRID_DIVS; i++) {
      const p = -half + i * step;
      // Z-parallel lines (rows)
      verts.push(p, 0, -half,  p, 0, half);
      // X-parallel lines (columns)
      verts.push(-half, 0, p,  half, 0, p);
    }

    g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    return g;
  }, []);

  useFrame(({ clock }) => {
    if (groupRef.current)
      groupRef.current.rotation.y = clock.elapsedTime * SPIN_SPEED;
  });

  return (
    <group ref={groupRef} rotation={[TILT, 0, 0]}>
      <lineSegments geometry={geo}>
        <lineBasicMaterial color={GRID_COLOR} transparent opacity={0.55} />
      </lineSegments>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════
   2. PARTICLE NODES
═══════════════════════════════════════════════════════════════ */
function ParticleNodes({ count = 180 }) {
  const ref = useRef();

  const { pos, col } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * GRID_SIZE;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * GRID_SIZE;

      // 12% chance of orange node, rest are dim grey
      const isOrange = Math.random() < 0.12;
      if (isOrange) {
        col[i * 3] = 1.0; col[i * 3 + 1] = 0.35; col[i * 3 + 2] = 0.0;
      } else {
        const v = 0.08 + Math.random() * 0.14;
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v;
      }
    }
    return { pos, col };
  }, [count]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    // Co-rotate with the grid for visual coherence
    ref.current.rotation.y = clock.elapsedTime * SPIN_SPEED;
    ref.current.rotation.x = TILT;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
        <bufferAttribute attach="attributes-color"    args={[col, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.065}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
      />
    </points>
  );
}

/* ═══════════════════════════════════════════════════════════════
   3. ANIMATED CNC RASTER TOOLPATH
   Uses THREE.Line created imperatively to avoid React's SVG
   <line> element collision in JSX.
═══════════════════════════════════════════════════════════════ */
function Toolpath() {
  const groupRef  = useRef();
  const headRef   = useRef();
  const progress  = useRef(0);

  // ── Generate raster boustrophedon waypoints ───────────────
  const { waypoints, positions } = useMemo(() => {
    const ROWS  = 18;
    const WIDTH = 11;
    const pts   = [];

    for (let r = 0; r < ROWS; r++) {
      const z   = -6 + (r / (ROWS - 1)) * 12;
      const dir = r % 2 === 0 ? 1 : -1;       // alternating direction

      for (let s = 0; s <= 36; s++) {
        const x = dir * (-WIDTH / 2 + (s / 36) * WIDTH);
        pts.push(new THREE.Vector3(x, 0, z));
      }
    }

    const arr = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => {
      arr[i * 3]     = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    });
    return { waypoints: pts, positions: arr };
  }, []);

  // ── Create THREE.Line imperatively ───────────────────────
  const { line, geo, mat } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setDrawRange(0, 2);
    const mat  = new THREE.LineBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.82 });
    const line = new THREE.Line(geo, mat);
    return { line, geo, mat };
  }, [positions]);

  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);

  // ── Animation ────────────────────────────────────────────
  useFrame(({ clock }, delta) => {
    // Advance progress (loops)
    progress.current = (progress.current + delta * 0.065) % 1;
    const total   = waypoints.length;
    const visible = Math.max(Math.floor(progress.current * total), 2);
    geo.setDrawRange(0, visible);

    // Move head indicator to the current draw tip
    if (headRef.current) {
      const pt = waypoints[Math.min(visible - 1, total - 1)];
      headRef.current.position.set(pt.x, pt.y + 0.07, pt.z);
      // Pulse scale
      headRef.current.scale.setScalar(
        0.8 + Math.sin(clock.elapsedTime * 14) * 0.28
      );
    }

    // Shared rotation with grid
    if (groupRef.current)
      groupRef.current.rotation.y = clock.elapsedTime * SPIN_SPEED;
  });

  return (
    <group ref={groupRef} rotation={[TILT, 0, 0]}>
      {/* Drawn path */}
      <primitive object={line} />

      {/* Extruder head — pulsing bright dot */}
      <mesh ref={headRef}>
        <sphereGeometry args={[0.055, 10, 10]} />
        <meshBasicMaterial color={ORANGE} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════
   4. ROOT SCENE
═══════════════════════════════════════════════════════════════ */
function Scene() {
  return (
    <>
      <color attach="background" args={["#111111"]} />
      <fog   attach="fog"        args={["#111111", 22, 42]} />
      <WireframeGrid />
      <ParticleNodes />
      <Toolpath />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════════════ */
const NAV_LINKS = ["MATERIALS", "CAPABILITIES", "INSTANT QUOTE", "TRACK ORDER"];

const TELEMETRY = [
  { label: "MIN RESOLUTION",    value: "0.08 MM" },
  { label: "MAX ENVELOPE",      value: "256 × 256 × 256 MM" },
  { label: "STRENGTH PROFILES", value: "GYROID / SOLID 100%" },
  { label: "DISPATCH WINDOW",   value: "24–48 HRS" },
];

/* ═══════════════════════════════════════════════════════════════
   5. HERO SECTION — MAIN EXPORT
═══════════════════════════════════════════════════════════════ */
export default function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex flex-col bg-[#111111] overflow-hidden"
      aria-label="Hero — 3D printing services"
    >
      {/* ── [z:0] WebGL Canvas ─────────────────────────────── */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <Canvas
          camera={{ position: [0, 8, 14], fov: 40, near: 0.1, far: 100 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          dpr={[1, 1.5]}
          frameloop="always"
        >
          <Scene />
        </Canvas>
      </div>

      {/* ── [z:1] Gradient vignette mask ───────────────────── */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: [
            "linear-gradient(to bottom,",
            "  #111111 0%,",
            "  rgba(17,17,17,0.6) 12%,",
            "  transparent 28%,",
            "  transparent 58%,",
            "  rgba(17,17,17,0.75) 78%,",
            "  #111111 100%",
            ")",
          ].join(""),
        }}
      />
      {/* Left vignette */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, #111111 0%, transparent 32%, transparent 68%, #111111 100%)",
        }}
      />

      {/* ── [z:10] NAVIGATION ──────────────────────────────── */}
      <nav
        className="relative z-10 flex items-center justify-between px-6 md:px-10 py-4 border-b border-[#333333]"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Brand + fleet status */}
        <div className="flex items-center gap-5">
          <span className="font-sans font-semibold text-[15px] text-white tracking-wider leading-none select-none">
            NEXUS // 3D
          </span>

          <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-[#333333]">
            {/* Pulsing status dot */}
            <span
              className="block w-[7px] h-[7px] rounded-full bg-[#FF5A00] flex-shrink-0"
              style={{ animation: "pulse-orange 2s cubic-bezier(0.4,0,0.6,1) infinite" }}
              aria-hidden="true"
            />
            <span className="font-mono text-[11px] text-[#A1A1AA] tracking-[0.08em]">
              [ FLEET ONLINE: 12 BEDS ACTIVE ]
            </span>
          </div>
        </div>

        {/* Nav links */}
        <ul className="hidden md:flex items-center gap-8" role="list">
          {NAV_LINKS.map((link) => (
            <li key={link}>
              <a
                href={
                  link === "INSTANT QUOTE"
                    ? "#quote-calculator"
                    : link === "MATERIALS"
                    ? "#model-uploader"
                    : "#"
                }
                onClick={(e) => {
                  if (link === "INSTANT QUOTE") {
                    e.preventDefault();
                    document.getElementById("quote-calculator")?.scrollIntoView({ behavior: "smooth" });
                  } else if (link === "MATERIALS") {
                    e.preventDefault();
                    document.getElementById("model-uploader")?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="font-sans font-medium text-[11px] tracking-[0.14em] uppercase text-[#A1A1AA] hover:text-[#FF5A00] transition-colors duration-150 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#FF5A00] focus-visible:outline-offset-4"
              >
                {link}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── [z:10] HERO COPY ────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 md:px-10 lg:px-20 py-20 xl:py-28">

        {/* Eyebrow label */}
        <p
          className="font-mono text-[11px] tracking-[0.22em] uppercase text-[#FF5A00] mb-7"
          style={{ animation: "fade-in 0.5s ease-out 0.1s both" }}
        >
          // ON-DEMAND ADDITIVE MANUFACTURING &amp; RAPID PROTOTYPING
        </p>

        {/* Main headline */}
        <h1
          className="font-sans font-medium text-white leading-[1.04] mb-7"
          style={{
            fontSize: "clamp(2.75rem, 5.8vw, 4rem)",
            animation: "fade-in 0.5s ease-out 0.2s both",
          }}
        >
          DIGITAL CAD TO
          <br />
          FUNCTIONAL HARDWARE.
        </h1>

        {/* Body copy */}
        <p
          className="font-sans text-[15px] leading-relaxed text-[#A1A1AA] max-w-[560px] mb-10"
          style={{ animation: "fade-in 0.5s ease-out 0.3s both" }}
        >
          Production-grade FDM and high-resolution stereolithography. Structural
          carbon-fiber nylon, functional PETG, and engineering resins delivered
          with dimensional accuracy down to ±0.1mm.
        </p>

        {/* Call-to-actions */}
        <div
          className="flex flex-wrap items-center gap-3"
          style={{ animation: "fade-in 0.5s ease-out 0.4s both" }}
        >
          {/* Primary CTA */}
          <button
            id="cta-upload-quote"
            onClick={() => document.getElementById("model-uploader")?.scrollIntoView({ behavior: "smooth" })}
            className="
              inline-flex items-center justify-center
              bg-[#FF5A00] hover:bg-[#D94D00]
              border border-[#FF5A00] hover:border-[#D94D00]
              text-white font-mono text-[11px] tracking-[0.12em] uppercase
              px-6 py-3 rounded-none
              transition-all duration-150
              active:scale-[0.98]
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5A00]
            "
          >
            [ UPLOAD 3D FILE / INSTANT QUOTE ]
          </button>

          {/* Secondary CTA */}
          <button
            id="cta-tolerances"
            onClick={() => document.getElementById("model-uploader")?.scrollIntoView({ behavior: "smooth" })}
            className="
              inline-flex items-center justify-center
              bg-transparent
              border border-[#333333] hover:border-[#FF5A00]
              text-white hover:text-[#FF5A00]
              font-mono text-[11px] tracking-[0.12em] uppercase
              px-6 py-3 rounded-none
              transition-all duration-150
              active:scale-[0.98]
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5A00]
            "
          >
            [ EXPLORE TOLERANCES ]
          </button>
        </div>
      </div>

      {/* ── [z:10] TELEMETRY BAR ─────────────────────────────── */}
      <div
        className="relative z-10 border-t border-[#333333] grid grid-cols-2 md:grid-cols-4"
        role="complementary"
        aria-label="Machine fleet specifications"
      >
        {TELEMETRY.map((item, idx) => (
          <div
            key={item.label}
            className={[
              "flex flex-col gap-[6px] px-6 md:px-8 py-5",
              idx < TELEMETRY.length - 1 ? "border-r border-[#333333]" : "",
              // Mobile: bottom border for first row
              idx < 2 ? "max-md:border-b max-md:border-[#333333]" : "",
            ].join(" ")}
          >
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#A1A1AA]">
              {item.label}
            </span>
            <span className="font-mono text-[13px] font-semibold tracking-[0.05em] text-white">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
