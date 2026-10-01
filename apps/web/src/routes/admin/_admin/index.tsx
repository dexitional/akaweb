import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Inbox,
  Newspaper,
  PanelsTopLeft,
  PenLine,
  Plus,
} from "lucide-react";
import { api } from "#/lib/api-client";
import { canManage, canView } from "#/lib/permissions";
import { formatDate, timeAgo } from "#/lib/format";
import { cn } from "#/lib/utils";
import { AdminPageHeader, Panel, StatusPill } from "#/components/admin/ui";
import { Button } from "#/components/ui/button.tsx";

export const Route = createFileRoute("/admin/_admin/")({
  component: Dashboard,
});

interface DashboardData {
  counts: Record<
    | "pages"
    | "publishedPosts"
    | "draftPosts"
    | "upcomingEvents"
    | "documents"
    | "media"
    | "newMessages"
    | "totalDownloads",
    number
  >;
  recentPosts: Array<{
    id: number;
    type: string;
    title: string;
    status: string;
    published_at: string;
    updated_at: string;
  }>;
  drafts: Array<{
    id: number;
    type: string;
    title: string;
    updated_at: string;
    author_name: string | null;
  }>;
  messages: Array<{ id: number; name: string; subject: string; created_at: string }>;
  activity: Array<{
    id: number;
    action: string;
    entity: string;
    summary: string;
    created_at: string;
    admin_name: string | null;
  }>;
  topPosts: Array<{ id: number; type: string; title: string; view_count: number }>;
}

const TYPE_LABEL: Record<string, string> = {
  news: "News",
  event: "Event",
  announcement: "Announcement",
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function Dashboard() {
  const { admin } = Route.useRouteContext();
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardData>("/dashboard"),
  });
  const c = data?.counts;

  const stats = [
    {
      label: "Published pages",
      value: c?.pages,
      icon: PanelsTopLeft,
      to: "/admin/pages",
      module: "pages" as const,
      tone: "bg-primary text-white",
    },
    {
      label: "Published posts",
      value: c?.publishedPosts,
      icon: Newspaper,
      to: "/admin/posts",
      module: "posts" as const,
      tone: "bg-brand-green text-white",
    },
    {
      label: "Upcoming events",
      value: c?.upcomingEvents,
      icon: CalendarDays,
      to: "/admin/posts",
      module: "posts" as const,
      tone: "bg-sky-500 text-white",
    },
    {
      label: "Drafts",
      value: c?.draftPosts,
      icon: PenLine,
      to: "/admin/posts",
      module: "posts" as const,
      tone: "bg-amber-500 text-white",
    },
    {
      label: "Downloads",
      value: c?.documents,
      sub: c ? `${c.totalDownloads.toLocaleString()} total downloads` : undefined,
      icon: Download,
      to: "/admin/documents",
      module: "documents" as const,
      tone: "bg-indigo-500 text-white",
    },
    {
      label: "Media files",
      value: c?.media,
      icon: FolderOpen,
      to: "/admin/media",
      module: "media" as const,
      tone: "bg-slate-700 text-white",
    },
    {
      label: "New messages",
      value: c?.newMessages,
      icon: Inbox,
      to: "/admin/messages",
      module: "messages" as const,
      tone: "bg-rose-500 text-white",
    },
  ].filter((s) => canView(admin.role, s.module));

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={`${greeting()}, ${admin.fullName.split(" ")[0]}`}
        description="Here's what's happening on the Akatsi College of Education website."
        actions={
          canManage(admin.role, "posts") && (
            <>
              <Button asChild variant="outline">
                <Link
                  to="/admin/posts/$postId"
                  params={{ postId: "new" }}
                  search={{ type: "event" }}
                >
                  <CalendarDays /> New event
                </Link>
              </Button>
              <Button asChild>
                <Link
                  to="/admin/posts/$postId"
                  params={{ postId: "new" }}
                  search={{ type: "news" }}
                >
                  <Plus /> Write news
                </Link>
              </Button>
            </>
          )
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className="group rounded-xl border border-border bg-white p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <span className={cn("flex size-10 items-center justify-center rounded-lg", s.tone)}>
                <s.icon className="size-5" aria-hidden="true" />
              </span>
              <ArrowRight
                className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden="true"
              />
            </div>
            <p className="mt-4 text-3xl font-extrabold tabular-nums">{s.value ?? "–"}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
            {s.sub && <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>}
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          title="Recently updated"
          description="Your latest news, events and announcements."
          className="xl:col-span-2"
        >
          {data?.recentPosts.length ? (
            <ul className="-my-2 divide-y divide-border">
              {data.recentPosts.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/admin/posts/$postId"
                    params={{ postId: String(p.id) }}
                    className="flex items-center gap-3 py-3 hover:text-primary"
                  >
                    <FileText
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">{p.title}</span>
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {TYPE_LABEL[p.type]}
                    </span>
                    <StatusPill status={p.status} />
                    <span className="w-24 text-right text-xs text-muted-foreground">
                      {timeAgo(p.updated_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing yet — write your first story.</p>
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          {data && data.drafts.length > 0 && (
            <Panel title="Drafts awaiting review">
              <ul className="-my-1 space-y-2">
                {data.drafts.map((d) => (
                  <li key={d.id}>
                    <Link
                      to="/admin/posts/$postId"
                      params={{ postId: String(d.id) }}
                      className="block rounded-lg p-2 hover:bg-secondary"
                    >
                      <p className="truncate text-sm font-medium">{d.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {TYPE_LABEL[d.type]} · {d.author_name ?? "Unknown"} ·{" "}
                        {timeAgo(d.updated_at)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {canView(admin.role, "messages") && (
            <Panel
              title="New messages"
              actions={
                <Link
                  to="/admin/messages"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Inbox
                </Link>
              }
            >
              {data?.messages.length ? (
                <ul className="-my-1 space-y-2">
                  {data.messages.map((m) => (
                    <li key={m.id} className="rounded-lg p-2 hover:bg-secondary">
                      <p className="truncate text-sm font-medium">{m.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.name} · {timeAgo(m.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">You're all caught up.</p>
              )}
            </Panel>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Most read" description="Published posts by page views.">
          {data?.topPosts.length ? (
            <ol className="-my-1 space-y-2">
              {data.topPosts.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{p.title}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                    <Eye className="size-3.5" aria-hidden="true" />
                    {p.view_count.toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No views recorded yet.</p>
          )}
        </Panel>
        {canView(admin.role, "activity") && (
          <Panel
            title="Recent activity"
            className="xl:col-span-2"
            actions={
              <Link
                to="/admin/activity"
                className="text-xs font-semibold text-primary hover:underline"
              >
                View all
              </Link>
            }
          >
            {data?.activity.length ? (
              <ul className="-my-1 space-y-3">
                {data.activity.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 text-sm">
                    <span
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-green"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{a.admin_name ?? "Someone"}</span>{" "}
                      <span className="text-muted-foreground">— {a.summary}</span>
                    </span>
                    <span
                      className="shrink-0 text-xs text-muted-foreground"
                      title={formatDate(a.created_at)}
                    >
                      {timeAgo(a.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}
