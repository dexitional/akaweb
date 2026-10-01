import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { ChevronRight, GraduationCap, Home } from "lucide-react";
import { ProfileActions } from "./ProfileActions";
import { ProfilePublications } from "./ProfilePublications";
import { CoViewTracker, ProfileColleagues } from "./ProfileColleagues";
import { cn } from "#/lib/utils";
import type { ProfileData } from "#/lib/directory-types";
import type { StaffStatus } from "@aka/db";
import { rememberProfileView } from "#/hooks/useRecentlyViewed";
import { OptimizedImage } from "#/components/site/optimized-image";

export type { ColleagueTab, ProfileData, Publication } from "#/lib/directory-types";

const TITLE_PREFIXES = ["Dr. (Mrs.)", "Dr. (Mr.)", "Prof.", "Dr.", "Mr.", "Mrs.", "Ms."];

function getInitials(name: string): string {
  let stripped = name.trim();
  for (const prefix of TITLE_PREFIXES) {
    if (stripped.startsWith(prefix)) {
      stripped = stripped.slice(prefix.length).trim();
      break;
    }
  }
  const parts = stripped.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0] ?? "";
  const last = parts.at(-1) ?? "";
  if (parts.length === 1) return first.charAt(0).toUpperCase();
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

/**
 * Large hero portrait: initials drawn as SVG text (so they scale with the
 * box), with the Sanity photo layered on top when there is one.
 */
function HeroAvatar({ name, photoUrl }: { name: string; photoUrl?: string }) {
  return (
    <div className="relative h-40 w-40 overflow-hidden rounded-2xl bg-[#E4E6F5] text-[#39418F] shadow-[0_10px_34px_rgba(0,0,0,0.22)] ring-4 ring-[#edeef6] sm:h-64 sm:w-64">
      <svg
        className="h-full w-full select-none"
        viewBox="0 0 100 100"
        aria-hidden="true"
        focusable="false"
      >
        <text
          x="50"
          y="50"
          dy=".35em"
          textAnchor="middle"
          fontSize="40"
          fontWeight="600"
          fill="currentColor"
        >
          {getInitials(name)}
        </text>
      </svg>
      {photoUrl && (
        <OptimizedImage
          src={photoUrl}
          alt={name}
          sizes="(min-width: 640px) 256px, 160px"
          priority
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      )}
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="heading mb-4 flex items-baseline gap-3 text-xl">
      {children}
      <span className="rule flex-1" />
    </h2>
  );
}

// Shown next to the name; "active" (or no status) gets no badge.
const STATUS_BADGES: Partial<Record<StaffStatus, { label: string; className: string }>> = {
  "on-secondment": { label: "On secondment", className: "bg-[#c8892b]/16 text-[#9a6a1c]" },
  "post-retirement": { label: "Post-retirement", className: "bg-[#8a8f9c]/16 text-[#5c6472]" },
  "in-memoriam": { label: "In memoriam", className: "bg-[#8a8f9c]/16 text-[#5c6472]" },
};

export function ProfilePage({ data }: { data: ProfileData }) {
  const statusBadge = data.staffStatus ? STATUS_BADGES[data.staffStatus] : undefined;
  // "Lecturer · Senior Member" → designation (emphasised) + category.
  const roleParts = data.role
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);

  const designation = roleParts[0] ?? "";

  // Feed the directory home's "Recently viewed" sidebar.
  useEffect(() => {
    rememberProfileView({
      slug: data.slug,
      name: data.name,
      title: designation,
      photoUrl: data.photoUrl,
    });
  }, [data.slug, data.name, data.photoUrl, designation]);

  return (
    <div className="min-h-screen bg-[#edeef6]">
      {/* Breadcrumb */}
      <div className="border-b border-[#d4d7e8] bg-[#f8f7fc]">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-3 text-sm sm:px-8">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-[#5a5f7e] transition hover:text-[#0b1a62]"
          >
            <Home className="h-3.5 w-3.5" aria-hidden="true" />
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-[#5a5f7e]" aria-hidden="true" />
          <Link to="/directory" className="text-[#5a5f7e] transition hover:text-[#0b1a62]">
            Directory
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-[#5a5f7e]" aria-hidden="true" />
          <span className="heading text-sm">{data.name}</span>
        </div>
      </div>

      {/* Hero band */}
      <section>
        <div className="hero-cover relative h-44 overflow-hidden sm:h-60">
          <GraduationCap
            className="absolute -right-8 -bottom-8 text-white/10"
            style={{ width: 220, height: 220 }}
            aria-hidden="true"
          />
        </div>

        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          {/* Avatar + updated badge */}
          <div className="hero-an-av -mt-16 sm:-mt-28">
            <div className="relative inline-block">
              <HeroAvatar name={data.name} photoUrl={data.photoUrl} />
              {data.updatedAgo && (
                <span className="surface absolute -right-2 -bottom-2 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold">
                  <span
                    className="fresh-dot h-2 w-2 rounded-full bg-[#39418F]"
                    aria-hidden="true"
                  />
                  Updated {data.updatedAgo}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="hero-an-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <h1 className="heading text-4xl leading-[1.02] sm:text-[3.35rem]">{data.name}</h1>
              {statusBadge && (
                <span
                  className={cn(
                    "inline-flex items-center gap-[0.35rem] rounded-full px-[0.62rem] py-[0.32rem] text-[0.72rem] leading-none font-bold whitespace-nowrap",
                    statusBadge.className,
                  )}
                >
                  <span aria-hidden="true">●</span> {statusBadge.label}
                </span>
              )}
            </div>

            {roleParts.length > 0 && (
              <p className="hero-an-3 t-muted mt-2 text-lg">
                <span className="font-semibold text-[#0b1a62]">{roleParts[0]}</span>
                {roleParts.slice(1).map((part) => (
                  <span key={part}>
                    {" "}
                    <span className="opacity-40">·</span> {part}
                  </span>
                ))}
              </p>
            )}
            {(data.departmentName || data.department) && (
              <p className="hero-an-3 t-muted mt-1 text-base">
                <span aria-hidden="true">🏛</span>{" "}
                {data.departmentSlug ? (
                  <Link
                    to="/directory/d/$slug"
                    params={{ slug: data.departmentSlug }}
                    className="hover:underline"
                  >
                    {data.departmentName || data.department}
                  </Link>
                ) : (
                  data.departmentName || data.department
                )}
              </p>
            )}

            {data.externalLinks.length > 0 && (
              <div className="hero-an-4 t-muted mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                {data.externalLinks.map((link) =>
                  link.url ? (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <span key={link.label}>{link.label}</span>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats/actions bar */}
      <div className="mx-auto mt-6 max-w-6xl px-5 sm:px-8">
        <div className="surface flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl px-4 py-3 sm:px-6">
          {data.stats.profileViews > 0 && (
            <span className="t-muted text-sm">
              <span className="num t-spark">{data.stats.profileViews}</span> profile views
            </span>
          )}
          {data.stats.shares > 0 && (
            <span className="t-muted text-sm">
              <span className="num t-spark">{data.stats.shares}</span> shares · vCards
            </span>
          )}
          {data.stats.colleaguesShareInterest > 0 && (
            <span className="t-muted text-sm">
              <span className="num t-spark">{data.stats.colleaguesShareInterest}</span> colleagues
              share your top interest
            </span>
          )}
          <span className="ml-auto w-full sm:w-auto">
            <ProfileActions
              slug={data.slug}
              name={data.name}
              role={data.role}
              departmentName={data.departmentName}
              organization={data.organization}
              email={data.email}
              phone={data.phone}
            />
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mt-10 space-y-10 pb-6">
          {/* About */}
          {data.aboutParagraphs.length > 0 && (
            <section>
              <SectionHeading>About</SectionHeading>
              <article className="surface p-6 text-lg leading-relaxed sm:p-8 first-letter:float-left first-letter:mr-2 first-letter:text-5xl first-letter:leading-[0.8] first-letter:font-bold first-letter:text-[#0b1a62]">
                {data.aboutParagraphs.map((paragraph, i) => (
                  <p key={i} className={cn("text-gray-700", i > 0 && "mt-3")}>
                    {paragraph}
                  </p>
                ))}
              </article>
            </section>
          )}

          {/* Focus & expertise */}
          {(data.specializations.length > 0 || data.academicInterests.length > 0) && (
            <section>
              <SectionHeading>Focus &amp; expertise</SectionHeading>
              <div className="grid gap-4 sm:grid-cols-2">
                {data.specializations.length > 0 && (
                  <div className="surface p-6">
                    <h3 className="eyebrow t-muted mb-3">Specializations</h3>
                    <div className="flex flex-wrap gap-2">
                      {data.specializations.map((label) => (
                        <span
                          key={label}
                          className="chip rounded-full px-3 py-1.5 text-sm font-medium"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {data.academicInterests.length > 0 && (
                  <div className="surface p-6">
                    <h3 className="eyebrow t-muted mb-3">
                      Academic interests{" "}
                      <span className="font-normal tracking-normal normal-case opacity-70">
                        · number = colleagues who share it
                      </span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {data.academicInterests.map((tag) => (
                        <span
                          key={tag.label}
                          className="chip inline-flex items-center gap-1.5 rounded-full py-1 pr-1.5 pl-3 text-sm font-medium"
                        >
                          {tag.label}
                          {tag.count > 0 && (
                            <span className="num rounded-full bg-white/70 px-1.5 text-xs">
                              {tag.count}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Background */}
          {(data.education.length > 0 || data.careerPositions.length > 0) && (
            <section id="background" className="scroll-mt-32">
              <SectionHeading>Background</SectionHeading>
              <div className="grid gap-6 sm:grid-cols-2">
                {data.education.length > 0 && (
                  <div>
                    <h3 className="eyebrow t-muted mb-3 flex items-center gap-2">
                      <span aria-hidden="true">🎓</span> Education &amp; qualifications
                    </h3>
                    <div className="space-y-3">
                      {data.education.map((entry, i) => (
                        <div key={i} className="surface rounded-xl p-4">
                          <p className="heading text-sm leading-snug font-semibold">
                            {entry.degree}{" "}
                            {entry.field && (
                              <span className="t-muted font-normal">in {entry.field}</span>
                            )}
                          </p>
                          {entry.institution && (
                            <p className="t-muted mt-0.5 text-xs">{entry.institution}</p>
                          )}
                          {entry.year && (
                            <p className="num t-muted mt-1 text-[11px]">{entry.year}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.careerPositions.length > 0 && (
                  <div>
                    <h3 className="eyebrow t-muted mb-3 flex items-center gap-2">
                      <span aria-hidden="true">★</span> Career &amp; positions
                    </h3>
                    <div className="relative pl-6">
                      <span
                        className="absolute top-2 bottom-2 left-[5px] w-px bg-[#d4d7e8]"
                        aria-hidden="true"
                      />
                      <div className="space-y-4">
                        {data.careerPositions.map((entry, i) => (
                          <div key={i} className="relative">
                            <span
                              className="absolute top-1.5 -left-[23px] h-3 w-3 rounded-full border-2 border-white bg-[#39418f]"
                              aria-hidden="true"
                            />
                            <p className="heading text-sm leading-snug font-semibold">
                              {entry.position}
                            </p>
                            {entry.organization && (
                              <p className="t-muted text-xs">{entry.organization}</p>
                            )}
                            {(entry.startYear || entry.endYear) && (
                              <p className="num t-muted mt-0.5 text-[11px]">
                                {entry.startYear
                                  ? `${entry.startYear} to ${entry.endYear || "Present"}`
                                  : entry.endYear}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Teaching & projects */}
          {(data.teachingPhilosophy || data.projects.length > 0) && (
            <section id="teaching" className="scroll-mt-32 space-y-6">
              <SectionHeading>Teaching &amp; projects</SectionHeading>
              {data.teachingPhilosophy && (
                <figure className="pl-5" style={{ borderLeft: "3px solid #39418F" }}>
                  <blockquote className="text-lg leading-relaxed text-gray-700">
                    {data.teachingPhilosophy}
                  </blockquote>
                  <figcaption className="eyebrow t-muted mt-2">Teaching philosophy</figcaption>
                </figure>
              )}
              {data.projects.length > 0 && (
                <div>
                  <h3 className="eyebrow t-muted mb-3">Projects</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.projects.map((project, i) => (
                      <div
                        key={i}
                        className="card-hover surface flex items-start gap-3 rounded-xl p-5"
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e4e6f5] text-lg"
                          aria-hidden="true"
                        >
                          🧪
                        </span>
                        <div className="min-w-0">
                          {project.url ? (
                            <a
                              href={project.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="heading leading-snug font-semibold hover:underline"
                            >
                              {project.title}
                            </a>
                          ) : (
                            <p className="heading leading-snug font-semibold">{project.title}</p>
                          )}
                          {project.role && <p className="t-muted mt-0.5 text-sm">{project.role}</p>}
                          {project.period && (
                            <p className="t-muted num mt-1 text-xs">{project.period}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Publications */}
          {data.publications && (
            <section id="publications" className="scroll-mt-32">
              <h2 className="heading mb-4 flex items-baseline gap-3 text-xl">
                Publications
                <span className="rule flex-1" />
                {data.publications.shown.length > 0 && (
                  <span className="t-muted num text-xs whitespace-nowrap">
                    {data.publications.shown.length}{" "}
                    {data.publications.shown.length === 1 ? "work" : "works"}
                  </span>
                )}
              </h2>
              {data.publications.orcid && (
                <p className="t-muted mb-4 text-xs">
                  <a
                    href={
                      data.publications.orcid.startsWith("http")
                        ? data.publications.orcid
                        : `https://orcid.org/${data.publications.orcid}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#39418f] hover:underline"
                  >
                    ORCID {data.publications.orcid} →
                  </a>
                </p>
              )}
              {data.publications.shown.length > 0 && (
                <ProfilePublications publications={data.publications.shown} />
              )}
            </section>
          )}

          {/* Engagements */}
          {data.conferences.length > 0 && (
            <section id="engagements" className="scroll-mt-32">
              <SectionHeading>Engagements</SectionHeading>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="eyebrow t-muted mb-3">📅 Conferences attended</h3>
                  <div className="surface divide-y divide-[#d4d7e8] rounded-xl">
                    {data.conferences.map((conference, i) => {
                      const meta = [conference.role, conference.location]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <div key={i} className="flex items-center gap-3 p-4">
                          {conference.year && (
                            <span className="num t-spark w-10 shrink-0 text-sm font-bold">
                              {conference.year}
                            </span>
                          )}
                          <span className="min-w-0">
                            {conference.url ? (
                              <a
                                href={conference.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="heading block text-sm leading-snug font-semibold hover:underline"
                              >
                                {conference.name}
                              </a>
                            ) : (
                              <span className="heading block text-sm leading-snug font-semibold">
                                {conference.name}
                              </span>
                            )}
                            {meta && <span className="t-muted block text-xs">{meta}</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Honors & affiliations */}
          {data.honors.length > 0 && (
            <section id="recognition" className="scroll-mt-32">
              <SectionHeading>Honors &amp; affiliations</SectionHeading>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.honors.map((honor, i) => {
                  const meta = [honor.org, honor.year].filter(Boolean).join(" · ");
                  return (
                    <div key={i} className="card-hover surface rounded-xl p-5">
                      <div
                        className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#7f5c07]/16 text-lg"
                        aria-hidden="true"
                      >
                        🏅
                      </div>
                      <p className="heading text-sm leading-snug font-semibold">{honor.title}</p>
                      {meta && <p className="t-muted num mt-1 text-xs">{meta}</p>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Colleagues & frequently viewed together */}
          {data.colleagueTabs.length > 0 && (
            <section id="people" className="scroll-mt-32">
              <SectionHeading>Colleagues &amp; frequently viewed together</SectionHeading>
              <ProfileColleagues tabs={data.colleagueTabs} />

              {/* Research constellation CTA */}
              <Link
                to="/directory/search"
                search={{ q: data.topInterest ?? data.departmentName ?? data.department }}
                className="hero-cover group relative mt-4 flex items-center gap-4 overflow-hidden rounded-2xl p-5 text-white sm:gap-5 sm:p-6"
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/14 text-2xl sm:h-14 sm:w-14"
                  aria-hidden="true"
                >
                  ✦
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg leading-tight font-bold sm:text-xl">
                    Explore the research constellation
                  </span>
                  <span className="mt-0.5 block text-sm text-white/75">
                    See how {data.firstName} connects to colleagues — by shared interests,
                    department and who&apos;s viewed together.
                  </span>
                </span>
                <span className="hero-pill-glass inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-transform group-hover:translate-x-0.5">
                  Open <span aria-hidden="true">→</span>
                </span>
              </Link>
            </section>
          )}
          <CoViewTracker slug={data.slug} />
        </div>
      </div>
    </div>
  );
}
