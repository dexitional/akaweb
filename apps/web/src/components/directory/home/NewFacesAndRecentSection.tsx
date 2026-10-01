import { Link } from "@tanstack/react-router";

import { useRecentlyViewed } from "#/hooks/useRecentlyViewed";
import type {
  AppointedHead,
  FeaturedDepartment,
  NewFace,
  ResearcherSpotlight,
} from "#/lib/directory-types";
import { InitialsAvatar } from "../shared/InitialsAvatar";
import { FeaturedDepartmentsSection } from "./FeaturedDepartmentsSection";

export function NewFacesAndRecentSection({
  newFaces,
  researcher,
  appointedHeads,
  featuredDepartments,
}: {
  newFaces: Array<NewFace>;
  researcher: ResearcherSpotlight | null;
  appointedHeads: Array<AppointedHead>;
  featuredDepartments: Array<FeaturedDepartment>;
}) {
  const { recent, clear } = useRecentlyViewed();

  return (
    <section className="border-t border-gray-200 bg-gradient-to-b from-[#eeeef6] to-[#f4f4f9] py-14">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          {newFaces.length > 0 && (
            <div>
              <h2 className="zone-h eyebrow t-muted mb-3">New faces</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {newFaces.map((face) => (
                  <Link
                    key={face.slug}
                    to="/directory/p/$slug"
                    params={{ slug: face.slug }}
                    className="group block rounded-2xl border border-[#d4d7e8] bg-white p-4 transition-shadow hover:shadow-md"
                  >
                    <InitialsAvatar name={face.name} photoUrl={face.photoUrl} size={56} />
                    <p className="heading mt-3 text-sm leading-snug group-hover:underline">
                      {face.name}
                    </p>
                    <p className="t-muted mt-0.5 truncate text-xs">{face.title}</p>
                    {face.department && (
                      <p className="t-muted mt-0.5 truncate text-xs">{face.department}</p>
                    )}
                    <p className="t-spark mt-2 text-[11px] font-semibold">Joined {face.joined}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {researcher && (
            <section className="surface p-6" aria-label="Meet a researcher">
              <h2 className="zone-h eyebrow t-muted mb-4">
                Meet a researcher{" "}
                <span className="font-normal tracking-normal normal-case">· changes daily</span>
              </h2>
              <div className="flex items-start gap-4">
                <InitialsAvatar
                  name={researcher.name}
                  photoUrl={researcher.photoUrl}
                  size={56}
                  colorClassName="bg-[#E4E6F5] text-[#39418F]"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    to="/directory/p/$slug"
                    params={{ slug: researcher.slug }}
                    className="focus-ring heading text-base hover:underline"
                  >
                    {researcher.name}
                  </Link>
                  <p className="t-muted text-xs">
                    {researcher.role}
                    {researcher.department ? ` · ${researcher.department}` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {researcher.tags.map((tag) => (
                      <span
                        key={tag}
                        className="chip rounded-full px-2.5 py-1 text-xs font-semibold"
                      >
                        {tag}
                      </span>
                    ))}
                    <Link
                      to="/directory/p/$slug"
                      params={{ slug: researcher.slug }}
                      className="focus-ring t-accent ml-auto text-xs font-semibold hover:underline"
                    >
                      View full profile <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          {appointedHeads.length > 0 && (
            <section aria-label="Recently appointed heads">
              <h2 className="zone-h eyebrow t-muted mb-3">Recently appointed heads</h2>
              <div className="surface px-4 py-2">
                {appointedHeads.map((head) => (
                  <Link
                    key={head.slug}
                    {...(head.departmentSlug
                      ? { to: "/directory/d/$slug" as const, params: { slug: head.departmentSlug } }
                      : { to: "/directory/p/$slug" as const, params: { slug: head.slug } })}
                    className="dhr-row focus-ring group -mx-2 flex items-center gap-3 px-2 py-2"
                  >
                    <InitialsAvatar
                      name={head.name}
                      size={36}
                      colorClassName="bg-[#E4E6F5] text-[#39418F]"
                    />
                    <div className="min-w-0">
                      <p className="heading truncate text-sm group-hover:underline">{head.name}</p>
                      <p className="t-muted truncate text-xs">
                        {head.role}
                        {head.department ? `, ${head.department}` : ""}
                        {head.since ? ` · since ${head.since}` : ""}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <FeaturedDepartmentsSection departments={featuredDepartments} />
        </div>

        <div className="h-fit rounded-2xl border border-[#d4d7e8] bg-white p-5 lg:sticky lg:top-24">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="zone-h amber eyebrow t-muted">Recently viewed</h2>
            {recent.length > 0 && (
              <button
                type="button"
                onClick={clear}
                className="focus-ring t-muted cursor-pointer text-[11px] underline underline-offset-2 hover:no-underline"
              >
                Clear
              </button>
            )}
          </div>
          {recent.length === 0 ? (
            <p className="t-muted text-xs leading-relaxed">
              Profiles you open will appear here, so you can find your way back to them.
            </p>
          ) : (
            recent.map((profile) => (
              <Link
                key={profile.slug}
                to="/directory/p/$slug"
                params={{ slug: profile.slug }}
                className="group flex items-center gap-3 rounded-lg py-2 transition-colors hover:bg-gray-50"
              >
                <InitialsAvatar
                  name={profile.name}
                  photoUrl={profile.photoUrl}
                  size={36}
                  colorClassName="bg-[#E4E6F5] text-[#39418F]"
                />
                <div className="min-w-0">
                  <p className="heading truncate text-sm group-hover:underline">{profile.name}</p>
                  <p className="t-muted truncate text-xs">{profile.title}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
