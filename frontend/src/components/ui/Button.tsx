import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "glass";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 " +
  "disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-brand-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent " +
  "active:scale-[.98] will-change-transform";

const variants: Record<Variant, string> = {
  // gradient indigo→violet, soft glow, lifts on hover
  primary:
    "text-white bg-gradient-to-br from-brand-500 to-violet-600 shadow-[0_8px_24px_-8px_rgba(99,102,241,0.6)] " +
    "hover:shadow-[0_16px_40px_-12px_rgba(99,102,241,0.7)] hover:-translate-y-0.5 " +
    "[border:1px_solid_rgba(255,255,255,0.25)]",
  secondary:
    "text-white bg-ink-900/90 backdrop-blur-md shadow-glass-sm hover:bg-ink-900 hover:-translate-y-0.5",
  // frosted glass button
  glass:
    "glass text-ink-800 shadow-glass-sm hover:bg-white/70 hover:-translate-y-0.5 hover:text-brand-700",
  outline:
    "border border-white/70 bg-white/40 backdrop-blur-md text-ink-700 shadow-glass-sm " +
    "hover:bg-white/70 hover:text-brand-700 hover:-translate-y-0.5",
  ghost: "text-ink-700 hover:bg-white/60 hover:backdrop-blur-md",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-[3.25rem] px-8 text-base",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
