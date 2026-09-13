"use client";

import * as React from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * Subtle 3D tilt + glass-sheen that tracks the pointer. Professional, not gimmicky —
 * max ~7° of rotation with a soft spring. Disabled gracefully when the pointer leaves.
 */
export function TiltCard({
  children,
  className,
  max = 7,
  glare = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { max?: number; glare?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);

  const rx = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * max * 2);
    rx.set((0.5 - py) * max * 2);
    gx.set(px * 100);
    gy.set(py * 100);
  }

  function handleLeave() {
    rx.set(0);
    ry.set(0);
    gx.set(50);
    gy.set(50);
  }

  const sheen = useMotionTemplate`radial-gradient(40% 60% at ${gx}% ${gy}%, rgba(255,255,255,0.45), rgba(255,255,255,0) 70%)`;

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d", transformPerspective: 1000 }}
      className={cn("relative", className)}
      {...(props as object)}
    >
      {children}
      {glare && (
        <motion.div
          aria-hidden
          style={{ background: sheen }}
          className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-soft-light"
        />
      )}
    </motion.div>
  );
}
