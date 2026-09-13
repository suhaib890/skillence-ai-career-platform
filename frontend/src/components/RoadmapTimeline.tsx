"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

export function RoadmapTimeline({ steps }: { steps: string[] }) {
  return (
    <ol className="relative space-y-3 pl-6">
      {/* gradient connector line */}
      <span
        aria-hidden
        className="absolute bottom-2 left-[9px] top-2 w-px bg-gradient-to-b from-brand-400/60 via-violet-400/40 to-cyan-400/50"
      />
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <motion.li
            key={step}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="relative"
          >
            <span
              className={`absolute -left-6 top-0.5 grid h-[18px] w-[18px] place-items-center rounded-full text-[10px] font-semibold ring-2 ring-white/70 ${
                isLast
                  ? "bg-gradient-to-br from-success-500 to-cyan-500 text-white"
                  : "bg-gradient-to-br from-brand-500 to-violet-600 text-white"
              }`}
            >
              {isLast ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span
              className={`text-sm ${
                isLast ? "font-semibold text-success-700" : "text-ink-700"
              }`}
            >
              {step}
            </span>
          </motion.li>
        );
      })}
    </ol>
  );
}
