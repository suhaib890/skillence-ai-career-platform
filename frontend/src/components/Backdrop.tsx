/**
 * Ambient depth layer for the whole app: soft gradient blobs + a couple of
 * floating glass orbs. Fixed, behind everything, non-interactive, very subtle.
 */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* soft gradient blobs */}
      <div className="absolute -left-32 -top-24 h-[34rem] w-[34rem] rounded-full bg-brand-400/25 blur-3xl animate-blob" />
      <div
        className="absolute -right-40 top-10 h-[30rem] w-[30rem] rounded-full bg-violet-400/20 blur-3xl animate-blob"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="absolute bottom-[-12rem] left-1/3 h-[32rem] w-[32rem] rounded-full bg-cyan-400/15 blur-3xl animate-blob"
        style={{ animationDelay: "-12s" }}
      />

      {/* floating glass orbs */}
      <div className="absolute left-[12%] top-[28%] h-24 w-24 rounded-full border border-white/40 bg-white/20 backdrop-blur-md shadow-glass-sm animate-float-slow" />
      <div
        className="absolute right-[14%] top-[58%] h-16 w-16 rounded-full border border-white/40 bg-white/25 backdrop-blur-md shadow-glass-sm animate-float"
        style={{ animationDelay: "-3s" }}
      />
      <div
        className="absolute right-[30%] top-[16%] h-10 w-10 rounded-2xl border border-white/40 bg-white/20 backdrop-blur-md shadow-glass-sm animate-float-slow"
        style={{ animationDelay: "-5s" }}
      />
    </div>
  );
}
