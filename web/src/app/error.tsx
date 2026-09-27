"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-8 text-center mt-24">
      <p className="text-6xl">🙏</p>
      <p className="mt-4 text-xl font-extrabold">Kuch gadbad ho gayi</p>
      <p className="text-muted text-sm">Something went wrong. Your money data is safe.</p>
      <button onClick={reset} className="mt-6 rounded-[20px] bg-ink text-white px-6 min-h-12 font-bold">Dobara · Retry</button>
      <a href="tel:1800000000" className="block mt-3 text-sm font-semibold underline">Madad chahiye? · Need help?</a>
    </div>
  );
}
