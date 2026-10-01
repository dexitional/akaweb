import { useEffect, useState } from "react";
import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ExternalLink,
  FileStack,
  FolderOpen,
  GalleryHorizontalEnd,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Newspaper,
  PanelsTopLeft,
  Settings,
  ShieldCheck,
  Users,
  Inbox,
  X,
  Contact,
} from "lucide-react";
import { getAdminSession } from "#/server/session";
import { api } from "#/lib/api-client";
import { asset } from "#/lib/asset";
import { cn } from "#/lib/utils";
import { initials } from "#/lib/format";
import { MODULE_PATHS, ROLE_LABELS, canView, homePathFor } from "#/lib/permissions";
import type { AdminModule } from "#/lib/permissions";

function moduleForPath(pathname: string): AdminModule | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/admin") return "dashboard";
  const match = MODULE_PATHS.filter(([, base]) => base !== "/admin").find(
    ([, base]) => path === base || path.startsWith(`${base}/`),
  );
  return match?.[0] ?? null;
}

export const Route = createFileRoute("/admin/_admin")({
  beforeLoad: async ({ location }) => {
    const admin = await getAdminSession();
    if (!admin) throw redirect({ to: "/admin/login" });
    const area = moduleForPath(location.pathname);
    if (area && !canView(admin.role, area)) {
      const home = homePathFor(admin.role);
      if (home !== location.pathname) throw redirect({ href: home });
    }
    return { admin };
  },
  head: () => ({ meta: [{ title: "Akatsi CMS" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

const NAV: Array<{
  heading: string;
  items: Array<{
    to: string;
    label: string;
    icon: typeof LayoutDashboard;
    module: AdminModule;
    exact?: boolean;
  }>;
}> = [
  {
    heading: "",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, module: "dashboard", exact: true },
    ],
  },
  {
    heading: "Website",
    items: [
      {
        to: "/admin/spotlights",
        label: "Spotlights",
        icon: GalleryHorizontalEnd,
        module: "spotlights",
      },
      { to: "/admin/pages", label: "Pages", icon: PanelsTopLeft, module: "pages" },
      { to: "/admin/posts", label: "News & Events", icon: Newspaper, module: "posts" },
      {
        to: "/admin/departments",
        label: "Departments & Units",
        icon: Network,
        module: "departments",
      },
      { to: "/admin/people", label: "People", icon: Users, module: "people" },
      { to: "/admin/directory", label: "Staff Directory", icon: Contact, module: "directory" },
      { to: "/admin/documents", label: "Downloads", icon: FileStack, module: "documents" },
    ],
  },
  {
    heading: "Library",
    items: [
      { to: "/admin/media", label: "Media", icon: FolderOpen, module: "media" },
      { to: "/admin/messages", label: "Messages", icon: Inbox, module: "messages" },
    ],
  },
  {
    heading: "System",
    items: [
      { to: "/admin/settings", label: "Site settings", icon: Settings, module: "settings" },
      { to: "/admin/users", label: "Users", icon: ShieldCheck, module: "users" },
      { to: "/admin/activity", label: "Activity log", icon: Activity, module: "activity" },
    ],
  },
];

function AdminLayout() {
  const { admin } = Route.useRouteContext();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => setMobileOpen(false), [pathname]);

  const { data: unread } = useQuery({
    queryKey: ["messages", "unread"],
    queryFn: () =>
      api.get<{ total: number }>("/messages", { status: "new", pageSize: 1 }).then((r) => r.total),
    enabled: canView(admin.role, "messages"),
    refetchInterval: 60_000,
  });

  const logout = async () => {
    await api.post("/auth/logout");
    await navigate({ to: "/admin/login" });
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <Link
        to="/admin"
        className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5"
      >
        <img src={asset("logo-sm.webp")} alt="" className="h-11 w-auto" />
        <div className="leading-tight">
          <p className="font-extrabold">Akatsi CMS</p>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-sidebar-primary uppercase">
            Website admin
          </p>
        </div>
      </Link>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin">
        {NAV.map((group) => {
          const items = group.items.filter((i) => canView(admin.role, i.module));
          if (!items.length) return null;
          return (
            <div key={group.heading || "main"} className="mb-4">
              {group.heading && (
                <p className="mb-1.5 px-3 text-[11px] font-bold tracking-[0.14em] text-white/40 uppercase">
                  {group.heading}
                </p>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      activeOptions={{ exact: item.exact ?? false }}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white [&.active]:bg-white [&.active]:text-primary"
                    >
                      <item.icon className="size-4" aria-hidden="true" />
                      {item.label}
                      {item.module === "messages" && unread ? (
                        <span className="ml-auto rounded-full bg-brand-green px-2 py-0.5 text-[11px] font-bold text-white">
                          {unread}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="space-y-1 border-t border-sidebar-border p-3">
        <a
          href="/"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
        >
          <ExternalLink className="size-4" aria-hidden="true" /> View website
        </a>
        <Link
          to="/admin/account"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white [&.active]:bg-white [&.active]:text-primary"
        >
          <KeyRound className="size-4" aria-hidden="true" /> My account
        </Link>
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-white/5 p-3">
          {admin.photoUrl ? (
            <img src={admin.photoUrl} alt="" className="size-9 rounded-full object-cover" />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold">
              {initials(admin.fullName)}
            </span>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">{admin.fullName}</p>
            <p className="text-xs text-white/50">{ROLE_LABELS[admin.role]}</p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Log out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-muted">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">{sidebar}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          <div className="relative h-full w-72 animate-in slide-in-from-left duration-200">
            {sidebar}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-5 -right-12 rounded-full bg-white p-2"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 hover:bg-secondary"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <img src={asset("logo-sm.webp")} alt="" className="h-8 w-auto" />
          <span className="font-bold text-primary">Akatsi CMS</span>
        </header>
        <main className={cn("mx-auto w-full max-w-[1400px] flex-1 p-4 sm:p-6 lg:p-8")}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
