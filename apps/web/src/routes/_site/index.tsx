import { createFileRoute } from "@tanstack/react-router";
import { getHomeData } from "#/server/public";
import { HeroCarousel } from "#/components/site/hero-carousel";
import {
  AcademicsSection,
  CtaBand,
  DownloadsSection,
  NewsSection,
  NoticesAndEvents,
  QuickLinksBar,
  StatsBand,
  StudentLifeSection,
  WelcomeSection,
} from "#/components/site/home-sections";

export const Route = createFileRoute("/_site/")({
  loader: () => getHomeData(),
  component: HomePage,
});

function HomePage() {
  const data = Route.useLoaderData();
  return (
    <>
      <HeroCarousel slides={data.spotlights} />
      <QuickLinksBar />
      <WelcomeSection />
      <StatsBand />
      <AcademicsSection departments={data.departments} />
      <NewsSection news={data.news} />
      <NoticesAndEvents
        announcements={data.announcements}
        events={data.events}
        eventsAreUpcoming={data.eventsAreUpcoming}
      />
      <StudentLifeSection pages={data.studentLife} />
      <DownloadsSection documents={data.documents} />
      <CtaBand />
    </>
  );
}
