import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "glass" | "soft" | "solid";

const variants: Record<Variant, string> = {
  // primary floating glass surface
  glass: "glass-card",
  // subtler nested surface
  soft: "glass-soft",
  // opaque fallback (rarely needed)
  solid: "rounded-3xl border border-ink-100 bg-white shadow-card",
};

export function Card({
  className,
  variant = "glass",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: Variant }) {
  return <div className={cn(variants[variant], className)} {...props} />;
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 sm:p-7", className)} {...props} />;
}
