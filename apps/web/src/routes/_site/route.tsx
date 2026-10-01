import { Outlet, createFileRoute } from "@tanstack/react-router";
import { getLayoutData } from "#/server/public";
import { NoticeBanner } from "#/components/site/notice-banner";
import { SiteHeader } from "#/components/site/site-header";
import { SiteFooter } from "#/components/site/site-footer";
import { NotFoundPage } from "#/components/site/not-found";
import { MotionProvider } from "#/components/site/reveal";

export const Route = createFileRoute("/_site")({
  loader: () => getLayoutData(),
  // Settings and navigation change rarely; don't refetch on every navigation.
  staleTime: 5 * 60_000,
  component: SiteLayout,
  notFoundComponent: NotFoundPage,
});

function SiteLayout() {
  return (
    <MotionProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <a
          href="#main"
          className="sr-only z-[100] rounded-md bg-primary px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <NoticeBanner />
        <SiteHeader />
        <main id="main" className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </MotionProvider>
  );
}
