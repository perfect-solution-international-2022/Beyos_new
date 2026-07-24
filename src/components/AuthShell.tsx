import Image from "next/image";
import Link from "next/link";

export default function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="container-x py-12">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-navy-800/10 shadow-sm lg:grid-cols-2">
        {/* Visual */}
        <div className="relative hidden min-h-[560px] bg-navy-800 lg:block">
          <Image
            src="/images/login/login.png"
            alt="Beyos Clothing"
            fill
            className="object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 to-navy-900/10" />
          <div className="absolute bottom-0 left-0 p-10 text-white">
            <p className="font-display text-3xl font-bold">Style Is Forever</p>
            <p className="mt-2 max-w-xs text-white/70">
              Join the Beyos community and enjoy exclusive drops, offers and
              rewards.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <Link href="/" className="mb-8 flex items-center gap-2">
            <Image
              src="/images/logo.png"
              alt="Beyos Clothing"
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
            />
            <span className="text-xl font-bold text-navy-800">
              Beyos<span className="text-brand"> Clothing</span>
            </span>
          </Link>
          <h1 className="font-display text-3xl font-bold text-navy-800">
            {title}
          </h1>
          <p className="mt-2 text-navy-800/60">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
