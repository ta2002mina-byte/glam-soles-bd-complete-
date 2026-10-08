import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-boutique flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-3xl text-charcoal">Page not found</h1>
      <p className="max-w-sm text-sm text-charcoal-soft">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link href="/" className={buttonVariants({ size: "md" })}>
        Back to Home
      </Link>
    </div>
  );
}
