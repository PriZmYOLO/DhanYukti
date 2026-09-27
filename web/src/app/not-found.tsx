import Link from "next/link";

export default function NotFound() {
  return (
    <div className="p-8 text-center mt-24">
      <p className="text-6xl">🧭</p>
      <p className="mt-4 text-xl font-extrabold">Yeh page nahi mila</p>
      <p className="text-muted text-sm">This page doesn&apos;t exist</p>
      <Link href="/app" className="inline-block mt-6 rounded-[20px] bg-ink text-white px-6 py-3.5 font-bold">Ghar chalein · Go home</Link>
    </div>
  );
}
