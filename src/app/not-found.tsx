import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x flex flex-col items-center justify-center py-32 text-center">
      <p className="font-display text-7xl font-bold text-brand">404</p>
      <h1 className="mt-4 font-display text-3xl font-bold text-navy-800">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-navy-800/60">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Let&apos;s get you back on track.
      </p>
      <Link href="/" className="btn-primary mt-8">
        Back to Home
      </Link>
    </div>
  );
}
