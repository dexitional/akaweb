import { Link } from "@tanstack/react-router";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { asset } from "#/lib/asset";
import { useSiteLayout } from "#/lib/site-layout";
import { SocialLinks } from "./social-links";
import { SmartLink } from "./smart-link";
import { OptimizedImage } from "#/components/site/optimized-image";

export function SiteFooter() {
  const { settings, nav } = useSiteLayout();
  const { identity, contact } = settings;
  const year = new Date().getFullYear();

  const columns = [
    ...nav
      .filter((group) => group.items.length > 0)
      .slice(0, 3)
      .map((group) => ({
        title: group.label,
        links: group.items.slice(0, 6).map((i) => ({ label: i.title, href: i.href })),
      })),
    {
      title: "News & Media",
      links: [
        { label: "News", href: "/news" },
        { label: "Events", href: "/events" },
        { label: "Announcements", href: "/announcements" },
        { label: "Guides & Downloads", href: "/downloads" },
        { label: "Staff Directory", href: "/directory" },
        { label: "Alumni", href: "/alumni" },
        { label: "Student Mobile App", href: "/mobile" },
      ],
    },
  ];

  return (
    <footer className="relative overflow-hidden bg-primary-dark text-white">
      <div
        className="h-1.5 bg-gradient-to-r from-brand-green via-brand-sky to-brand-green"
        aria-hidden="true"
      />
      <div
        className="line-grid pointer-events-none absolute inset-0 opacity-60"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-8 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div className="max-w-lg">
            <div className="flex items-center gap-4">
              <OptimizedImage
                src={asset("logo-sm.webp")}
                alt=""
                sizes="64px"
                width={64}
                height={82}
                className="h-20 w-auto"
              />
              <div>
                <p className="text-xl font-extrabold leading-tight">{identity.name}</p>
                <p className="mt-1 text-xs font-bold tracking-[0.16em] text-brand-sky uppercase">
                  {identity.motto}
                </p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-white/70">{identity.footerText}</p>
            <div className="mt-6">
              <SocialLinks socials={settings.socials} />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="mb-4 text-xs font-bold tracking-[0.12em] text-white/50 uppercase">
              Get in touch
            </h2>
            <ul className="space-y-3.5 text-sm text-white/80">
              {contact.address && (
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-brand-sky" aria-hidden="true" />
                  <span className="whitespace-pre-line">{contact.address}</span>
                </li>
              )}
              {contact.phone && (
                <li className="flex gap-3">
                  <Phone className="mt-0.5 size-4 shrink-0 text-brand-sky" aria-hidden="true" />
                  <span>
                    <a
                      href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                      className="hover:text-white hover:underline"
                    >
                      {contact.phone}
                    </a>
                    {contact.altPhone && <> · {contact.altPhone}</>}
                  </span>
                </li>
              )}
              {contact.email && (
                <li className="flex gap-3">
                  <Mail className="mt-0.5 size-4 shrink-0 text-brand-sky" aria-hidden="true" />
                  <a href={`mailto:${contact.email}`} className="hover:text-white hover:underline">
                    {contact.email}
                  </a>
                </li>
              )}
              {contact.officeHours && (
                <li className="flex gap-3">
                  <Clock className="mt-0.5 size-4 shrink-0 text-brand-sky" aria-hidden="true" />
                  {contact.officeHours}
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-8 border-t border-white/10 pt-10 md:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="mb-3 text-xs font-bold tracking-[0.12em] text-white/50 uppercase">
                {col.title}
              </h2>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <SmartLink
                      href={link.href}
                      className="text-sm text-white/75 transition-colors hover:text-white hover:underline"
                    >
                      {link.label}
                    </SmartLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-[13px] text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {identity.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/search" search={{ q: "" }} className="hover:text-white">
              Search
            </Link>
            <Link to="/downloads" className="hover:text-white">
              Downloads
            </Link>
            <Link to="/mobile/privacy" className="hover:text-white">
              App Privacy
            </Link>
            <Link to="/mobile/terms" className="hover:text-white">
              App Terms
            </Link>
            <Link to="/admin/login" className="hover:text-white">
              Staff login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
