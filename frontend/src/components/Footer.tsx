import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="px-3 pb-4 pt-10 sm:px-5">
      <div className="glass-card container-x flex flex-col items-center justify-between gap-3 !rounded-3xl px-6 py-7 text-sm text-ink-600 sm:flex-row">
        <p className="flex items-center gap-2">
          <span className="relative h-7 w-7 overflow-hidden rounded-lg ring-1 ring-white/60">
            <Image src="/logo.png" alt="Skillence" fill sizes="28px" className="object-cover" />
          </span>
          © {2026} Skillence — AI Career Advisory.
        </p>
        <div className="flex items-center gap-5">
          <Link href="/about" className="transition-colors hover:text-brand-700">
            About
          </Link>
          <p className="text-ink-400">
            Powered by a CatBoost + XGBoost ensemble.
          </p>
        </div>
      </div>
    </footer>
  );
}
