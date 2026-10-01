import { Link } from "@tanstack/react-router";
import { ArrowLeft, Search } from "lucide-react";
import { asset } from "#/lib/asset";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-20 text-center">
      <img src={asset("logo-sm.webp")} alt="" className="h-24 w-auto opacity-90" />
      <p className="mt-6 text-sm font-bold tracking-[0.18em] text-brand-green uppercase">Error 404</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-primary">We couldn't find that page</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        It may have been moved or unpublished. Try searching, or head back to the home page.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-dark">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back home
        </Link>
        <Link
          to="/search"
          search={{ q: "" }}
          className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary"
        >
          <Search className="size-4" aria-hidden="true" />
          Search the site
        </Link>
      </div>
    </div>
  );
}
