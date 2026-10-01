import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowRight, ChevronDown, Mail, Menu, Phone, Search, X } from "lucide-react";
import { asset } from "#/lib/asset";
import { cn } from "#/lib/utils";
import { useSiteLayout } from "#/lib/site-layout";
import { SECTIONS } from "#/lib/content";
import { Dialog, DialogContent, DialogTitle } from "#/components/ui/dialog.tsx";
import { SocialLinks } from "./social-links";

interface MenuLink {
  title: string;
  href: string;
  summary?: string | null;
}

interface Menu {
  key: string;
  label: string;
  path: string;
  eyebrow: string;
  intro: string;
  items: Array<MenuLink>;
}

const NEWS_MENU: Menu = {
  key: "news",
  label: "News & Media",
  path: "/news",
  eyebrow: "Stay informed",
  intro: "Stories, events, official announcements and the documents you need.",
  items: [
    { title: "News", href: "/news", summary: "Stories from across the college" },
    { title: "Events", href: "/events", summary: "What's coming up on campus" },
    { title: "Announcements", href: "/announcements", summary: "Official notices and press releases" },
    { title: "Guides & Downloads", href: "/downloads", summary: "Forms, handbooks, guides and calendars" },
  ],
};

function useMenus(): Array<Menu> {
  const { nav, settings } = useSiteLayout();
  return [
    ...nav.map((group) => {
      const def = SECTIONS.find((s) => s.key === group.section)!;
      return {
        key: group.section,
        label: group.label,
        path: group.path,
        eyebrow: def.eyebrow,
        intro: settings.sections[group.section].intro || def.intro,
        items: group.items,
      };
    }),
    NEWS_MENU,
  ];
}

export function SiteHeader() {
  const { settings } = useSiteLayout();
  const menus = useMenus();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOpenMenu(null);
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === "Escape") setOpenMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openWithIntent = (key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenMenu(key);
  };
  const closeWithDelay = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 160);
  };

  const { contact } = settings;

  return (
    <>
      {/* Utility bar */}
      <div className="hidden bg-primary-dark text-white/80 lg:block">
        <div className="mx-auto flex h-10 max-w-7xl items-center justify-between gap-6 px-8 text-[13px]">
          <div className="flex items-center gap-5">
            {contact.phone && (
              <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1.5 hover:text-white">
                <Phone className="size-3.5" aria-hidden="true" />
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 hover:text-white">
                <Mail className="size-3.5" aria-hidden="true" />
                {contact.email}
              </a>
            )}
          </div>
          <div className="flex items-center gap-5">
            <Link to="/downloads" className="hover:text-white">
              Downloads
            </Link>
            <Link to="/events" className="hover:text-white">
              Events
            </Link>
            <Link
              to="/$section/$slug"
              params={{ section: "about", slug: "contact-us" }}
              className="hover:text-white"
            >
              Contact Us
            </Link>
            <SocialLinks socials={settings.socials} size="sm" />
          </div>
        </div>
      </div>

      <header
        className={cn(
          "sticky top-0 z-50 border-b bg-white/95 backdrop-blur-md transition-shadow",
          scrolled ? "border-border shadow-[0_6px_24px_-12px_rgb(11_26_98/0.25)]" : "border-transparent",
        )}
      >
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 md:px-8 lg:h-20">
          <Link to="/" className="flex min-w-0 items-center gap-3" aria-label={`${settings.identity.name} home`}>
            <img
              src={asset("logo-sm.webp")}
              alt=""
              width={48}
              height={62}
              className="h-12 w-auto shrink-0 lg:h-[60px]"
            />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[15px] font-extrabold tracking-tight text-primary sm:text-lg lg:text-[19px]">
                {settings.identity.name}
              </span>
              <span className="block truncate text-xs font-semibold tracking-[0.14em] text-brand-green uppercase">
                {settings.identity.motto}
              </span>
            </span>
          </Link>

          <nav aria-label="Main" className="hidden h-full items-center xl:flex">
            <ul className="flex h-full items-center">
              {menus.map((menu, index) => {
                const active = pathname === menu.path || pathname.startsWith(`${menu.path}/`) ||
                  (menu.key === "news" && /^\/(events|announcements|downloads)/.test(pathname));
                const open = openMenu === menu.key;
                return (
                  <li
                    key={menu.key}
                    className="relative flex h-full items-center"
                    onMouseEnter={() => openWithIntent(menu.key)}
                    onMouseLeave={closeWithDelay}
                  >
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenMenu(open ? null : menu.key)}
                      className={cn(
                        "relative flex h-full items-center gap-1 px-3 text-[14.5px] font-semibold transition-colors",
                        active || open ? "text-primary" : "text-slate-700 hover:text-primary",
                      )}
                    >
                      {menu.label}
                      <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
                      <span
                        className={cn(
                          "absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-brand-green transition-opacity",
                          active ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </button>
                    {open && (
                      <MegaPanel
                        menu={menu}
                        align={index >= menus.length - 2 ? "right" : "left"}
                        onNavigate={() => setOpenMenu(null)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex size-10 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-secondary hover:text-primary"
              aria-label="Search the site"
            >
              <Search className="size-5" aria-hidden="true" />
            </button>
            <Link
              to="/$section"
              params={{ section: "admissions" }}
              className="hidden items-center gap-1.5 rounded-full bg-brand-green px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#00703f] sm:flex"
            >
              Apply
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex size-10 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-secondary xl:hidden"
              aria-label="Open menu"
              aria-expanded={drawerOpen}
            >
              <Menu className="size-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {drawerOpen && <MobileDrawer menus={menus} onClose={() => setDrawerOpen(false)} />}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

function MegaPanel({ menu, align, onNavigate }: { menu: Menu; align: "left" | "right"; onNavigate: () => void }) {
  const twoColumns = menu.items.length > 4;
  return (
    <div
      className={cn(
        "absolute top-full z-50 pt-0 animate-in fade-in-0 slide-in-from-top-1 duration-150",
        align === "right" ? "right-0" : "-left-4",
      )}
    >
      <div
        className={cn(
          "grid overflow-hidden rounded-b-2xl border border-t-0 border-border bg-white shadow-2xl shadow-primary/10",
          twoColumns ? "w-[760px] grid-cols-[250px_1fr]" : "w-[600px] grid-cols-[230px_1fr]",
        )}
      >
        <div className="relative flex flex-col justify-between overflow-hidden bg-primary p-6 text-white">
          <div className="dot-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
          <div className="relative">
            <p className="text-[11px] font-bold tracking-[0.16em] text-brand-sky uppercase">{menu.eyebrow}</p>
            <p className="mt-2 text-xl font-extrabold">{menu.label}</p>
            <p className="mt-2 text-sm leading-relaxed text-white/75">{menu.intro}</p>
          </div>
          <Link
            to={menu.path}
            onClick={onNavigate}
            className="relative mt-6 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/20"
          >
            Overview
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <ul className={cn("grid content-start gap-1 p-4", twoColumns && "grid-cols-2")}>
          {menu.items.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">Pages are coming soon.</li>
          )}
          {menu.items.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                onClick={onNavigate}
                className="group block rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary"
              >
                <span className="flex items-center justify-between gap-2 text-[14.5px] font-semibold text-slate-800 group-hover:text-primary">
                  {item.title}
                  <ArrowRight
                    className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </span>
                {item.summary && (
                  <span className="mt-0.5 line-clamp-1 block text-[13px] text-muted-foreground">{item.summary}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MobileDrawer({ menus, onClose }: { menus: Array<Menu>; onClose: () => void }) {
  const { settings } = useSiteLayout();
  const [expanded, setExpanded] = useState<string | null>(null);
  const titleId = useId();

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] xl:hidden" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-primary-dark/60 backdrop-blur-sm animate-in fade-in-0"
      />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p id={titleId} className="text-sm font-bold tracking-wider text-muted-foreground uppercase">
            Menu
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-full p-2 text-slate-600 hover:bg-secondary"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-3">
          <Link to="/" className="block rounded-lg px-3 py-3 text-[15px] font-bold text-slate-800 hover:bg-secondary">
            Home
          </Link>
          {menus.map((menu) => {
            const open = expanded === menu.key;
            return (
              <div key={menu.key} className="border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : menu.key)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-[15px] font-bold text-slate-800 hover:bg-secondary"
                >
                  {menu.label}
                  <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
                </button>
                {open && (
                  <ul className="mb-2 ml-3 border-l-2 border-brand-green/40 pl-2">
                    <li>
                      <Link
                        to={menu.path}
                        className="block rounded-md px-3 py-2 text-sm font-semibold text-primary hover:bg-secondary"
                      >
                        {menu.label} overview
                      </Link>
                    </li>
                    {menu.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          to={item.href}
                          className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-secondary hover:text-primary"
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
        <div className="space-y-3 border-t border-border p-5">
          <Link
            to="/$section"
              params={{ section: "admissions" }}
            className="flex items-center justify-center gap-2 rounded-full bg-brand-green px-5 py-3 text-sm font-bold text-white"
          >
            Apply to Akatsi
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <div className="flex justify-center">
            <SocialLinks socials={settings.socials} tone="dark" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const suggestions = ["Admission requirements", "Academic calendar", "Departments", "Student handbook", "Contact"];

  const go = (term: string) => {
    const query = term.trim();
    if (!query) return;
    onOpenChange(false);
    setQ("");
    void navigate({ to: "/search", search: { q: query } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-24 translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl" showCloseButton={false}>
        <DialogTitle className="sr-only">Search the website</DialogTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go(q);
          }}
          className="flex items-center gap-3 border-b border-border px-4 py-3.5"
        >
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pages, news, events, downloads…"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            aria-label="Search"
          />
          <kbd className="hidden rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-muted-foreground sm:inline">
            Esc
          </kbd>
        </form>
        <div className="p-4">
          <p className="mb-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">Popular searches</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => go(s)}
                className="rounded-full border border-border px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-primary hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
