import { Link } from "@tanstack/react-router";
import { Landmark } from "lucide-react";

import type { RankedProfile } from "#/lib/directory-types";
import { InitialsAvatar } from "../shared/InitialsAvatar";

export function RankedProfileCard({ profile }: { profile: RankedProfile }) {
  const isTopThree = profile.rank <= 3;

  return (
    <Link
      to="/directory/p/$slug"
      params={{ slug: profile.slug }}
      className="relative block rounded-2xl border border-[#d4d7e8] bg-white p-8 text-center transition-shadow hover:shadow-md"
    >
      <span
        className={`absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shadow-sm ${
          isTopThree ? "bg-[#7f5c0724] text-[#7f5c07]" : "bg-[#e7e9f3] text-[#5a5f7e]"
        }`}
      >
        {profile.rank}
      </span>
      <div className="mx-auto w-fit">
        <InitialsAvatar
          name={profile.name}
          photoUrl={profile.photoUrl}
          size={96}
          colorClassName="bg-[#E4E6F5] text-[#39418F]"
          ringColor="ring-4 ring-[#39418f4d]"
          className="shadow"
        />
      </div>
      <p className="mt-4 text-base leading-snug font-bold tracking-[-0.01em] text-[#0b1a62]">
        {profile.name}
      </p>
      <p className="mt-1 text-sm text-[#5a5f7e]">{profile.title}</p>
      {profile.deptCode && (
        <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-[0.85rem] border border-[#d4d7e8] bg-[#e7e9f3] px-2.5 py-1 text-xs font-medium text-[#39418f]">
          <Landmark className="size-3.5 shrink-0 text-[#39418f]" aria-hidden="true" />
          <span className="truncate">{profile.deptCode}</span>
        </span>
      )}
    </Link>
  );
}

export function MostViewedProfilesSection({ profiles }: { profiles: Array<RankedProfile> }) {
  if (profiles.length === 0) return null;
  return (
    <section className="border-t border-gray-200 bg-gradient-to-b from-[#ededf5] to-[#f2f2f8] py-14">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-[-0.01em] text-[#0b1a62] md:text-4xl">
              Most Viewed Profiles
            </h2>
            <p className="t-muted mt-1.5 text-sm">Ranked by profile views this week</p>
          </div>
          <Link
            to="/directory/most-visited-profiles"
            className="text-sm font-semibold text-[var(--primary)] hover:underline"
          >
            View all profiles →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {profiles.map((profile) => (
            <RankedProfileCard key={profile.slug} profile={profile} />
          ))}
        </div>
      </div>
    </section>
  );
}
