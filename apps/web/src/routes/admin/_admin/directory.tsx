import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, ExternalLink, Pencil, Share2 } from "lucide-react";
import type { StaffProfileRow, StaffStatus, StaffType } from "@aka/db";
import { api } from "#/lib/api-client";
import { CONFERENCE_ROLES, PUBLICATION_TYPES, STAFF_STATUSES } from "#/lib/directory";
import type { ProfileDetails } from "#/lib/directory";
import { canManage } from "#/lib/permissions";
import { initials } from "#/lib/format";
import { cn } from "#/lib/utils";
import {
  AdminPageHeader,
  Field,
  SearchInput,
  Segmented,
  Switch,
  TableMessage,
  errorToast,
} from "#/components/admin/ui";
import { ImageField } from "#/components/admin/media-fields";
import { ItemList } from "#/components/admin/block-editor";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx";

export const Route = createFileRoute("/admin/_admin/directory")({
  component: DirectoryAdminPage,
});

interface ProfileListRow {
  id: number;
  slug: string;
  name: string | null;
  title: string | null;
  units: string | null;
  photo_url: string | null;
  staff_type: StaffType | null;
  staff_status: StaffStatus;
  is_new_face: 0 | 1;
  is_appointed_head: 0 | 1;
  has_profile: 0 | 1;
  profile_views: number;
  shares: number;
}

interface Affiliation {
  id: number;
  name: string;
  title: string;
  group_key: string;
  unit_role: string | null;
  department_name: string | null;
}

type ProfileDetail = Omit<StaffProfileRow, "details"> & {
  details: ProfileDetails;
  affiliations: Array<Affiliation>;
};

type Filter = "all" | "teaching" | "non-teaching" | "untyped" | "inactive";

const STATUS_LABELS = Object.fromEntries(STAFF_STATUSES.map((s) => [s.value, s.label])) as Record<
  StaffStatus,
  string
>;

function DirectoryAdminPage() {
  const { admin } = Route.useRouteContext();
  const canEdit = canManage(admin.role, "directory");
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-profiles"],
    queryFn: () =>
      api.get<{ profiles: Array<ProfileListRow> }>("/staff-profiles").then((r) => r.profiles),
  });
  const profiles = data ?? [];
  const query = q.trim().toLowerCase();
  const matches: Record<Filter, (p: ProfileListRow) => boolean> = {
    all: () => true,
    teaching: (p) => p.staff_type === "teaching",
    "non-teaching": (p) => p.staff_type === "non-teaching",
    untyped: (p) => p.staff_type === null,
    inactive: (p) => p.staff_status !== "active",
  };
  const visible = profiles.filter(
    (p) =>
      matches[filter](p) &&
      (!query || [p.name, p.title, p.units, p.slug].join(" ").toLowerCase().includes(query)),
  );

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Staff Directory"
        description="Directory profiles for every member of staff. Names, positions and units come from People; here you set staff type, status and the academic profile."
        actions={
          <Button variant="outline" asChild>
            <a href="/directory" target="_blank" rel="noreferrer">
              <ExternalLink /> View directory
            </a>
          </Button>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={(["all", "teaching", "non-teaching", "untyped", "inactive"] as const).map(
            (value) => ({
              value,
              label: {
                all: "All",
                teaching: "Teaching",
                "non-teaching": "Non-teaching",
                untyped: "Type not set",
                inactive: "Not active",
              }[value],
              count: profiles.filter(matches[value]).length,
            }),
          )}
        />
        <SearchInput value={q} onChange={setQ} placeholder="Search staff…" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        {isLoading ? (
          <TableMessage>Loading…</TableMessage>
        ) : visible.length === 0 ? (
          <TableMessage>No profiles match.</TableMessage>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs font-semibold text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3">Staff member</th>
                <th className="hidden px-4 py-3 md:table-cell">Units</th>
                <th className="hidden px-4 py-3 lg:table-cell">Type</th>
                <th className="hidden px-4 py-3 sm:table-cell">Status</th>
                <th className="hidden px-4 py-3 text-right lg:table-cell">Views</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((p) => (
                <tr key={p.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      {p.photo_url ? (
                        <img
                          src={p.photo_url}
                          alt=""
                          className="size-10 shrink-0 rounded-full object-cover object-top"
                        />
                      ) : (
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">
                          {initials(p.name ?? p.slug)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{p.name ?? p.slug}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.title}</p>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {p.is_new_face === 1 && <Badge>New face</Badge>}
                          {p.is_appointed_head === 1 && <Badge>Appointed head</Badge>}
                          {p.has_profile === 1 && <Badge tone="green">Academic profile</Badge>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden max-w-60 truncate px-4 py-2.5 text-muted-foreground md:table-cell">
                    {p.units ?? "—"}
                  </td>
                  <td className="hidden px-4 py-2.5 capitalize lg:table-cell">
                    {p.staff_type ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="hidden px-4 py-2.5 sm:table-cell">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        p.staff_status === "active" ? "text-emerald-700" : "text-amber-700",
                      )}
                    >
                      {STATUS_LABELS[p.staff_status]}
                    </span>
                  </td>
                  <td className="hidden px-4 py-2.5 text-right text-muted-foreground tabular-nums lg:table-cell">
                    <span className="inline-flex items-center gap-1" title={`${p.shares} shares`}>
                      <Eye className="size-3.5" aria-hidden="true" /> {p.profile_views}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon-sm" asChild>
                      <a
                        href={`/directory/p/${p.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open public profile"
                      >
                        <ExternalLink />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditing(p.slug)}
                      aria-label={canEdit ? "Edit profile" : "View profile"}
                    >
                      <Pencil />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <ProfileDialog
        slug={editing}
        canEdit={canEdit}
        onClose={() => setEditing(null)}
        onSaved={() => void queryClient.invalidateQueries({ queryKey: ["staff-profiles"] })}
      />
    </div>
  );
}

function Badge({
  children,
  tone = "blue",
}: {
  children: React.ReactNode;
  tone?: "blue" | "green";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
        tone === "blue" ? "bg-primary/10 text-primary" : "bg-emerald-50 text-emerald-700",
      )}
    >
      {children}
    </span>
  );
}

interface FormState {
  staffType: StaffType | null;
  staffStatus: StaffStatus;
  photoUrl: string;
  about: string;
  isNewFace: boolean;
  joinedOn: string;
  isAppointedHead: boolean;
  appointedOn: string;
  details: ProfileDetails;
}

function toForm(p: ProfileDetail): FormState {
  return {
    staffType: p.staff_type,
    staffStatus: p.staff_status,
    photoUrl: p.photo_url ?? "",
    about: p.about ?? "",
    isNewFace: p.is_new_face === 1,
    joinedOn: p.joined_on?.slice(0, 10) ?? "",
    isAppointedHead: p.is_appointed_head === 1,
    appointedOn: p.appointed_on?.slice(0, 10) ?? "",
    details: p.details,
  };
}

type Tab = "basics" | "expertise" | "background" | "research" | "recognition";

// One label per line. Keeps the raw text while typing (so blank lines and
// trailing spaces survive) and reports the cleaned list.
function LinesField({
  value,
  onChange,
  rows,
  max,
}: {
  value: Array<string>;
  onChange: (value: Array<string>) => void;
  rows: number;
  max: number;
}) {
  const [text, setText] = useState(() => value.join("\n"));
  return (
    <Textarea
      rows={rows}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(
          e.target.value
            .split("\n")
            .map((v) => v.trim())
            .filter(Boolean)
            .slice(0, max),
        );
      }}
    />
  );
}

function ProfileDialog({
  slug,
  canEdit,
  onClose,
  onSaved,
}: {
  slug: string | null;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tab, setTab] = useState<Tab>("basics");
  const [form, setForm] = useState<FormState | null>(null);
  const { data: profile } = useQuery({
    queryKey: ["staff-profile", slug],
    queryFn: () =>
      api.get<{ profile: ProfileDetail }>(`/staff-profiles/${slug}`).then((r) => r.profile),
    enabled: slug !== null,
  });

  useEffect(() => {
    if (slug === null) {
      setForm(null);
      setTab("basics");
    } else if (profile && profile.slug === slug) {
      setForm(toForm(profile));
    }
  }, [slug, profile]);

  const save = useMutation({
    mutationFn: (f: FormState) => api.patch(`/staff-profiles/${slug}`, f),
    onSuccess: () => {
      toast.success("Profile saved.");
      onSaved();
      onClose();
    },
    onError: errorToast("Couldn't save the profile."),
  });

  const set = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const setDetails = (patch: Partial<ProfileDetails>) =>
    setForm((f) => (f ? { ...f, details: { ...f.details, ...patch } } : f));
  const primary = profile?.affiliations[0];
  const d = form?.details;

  return (
    <Dialog open={slug !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{primary?.name ?? "Directory profile"}</DialogTitle>
        </DialogHeader>
        {!form || !d || !profile ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <fieldset disabled={!canEdit} className="grid min-w-0 gap-5">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: "basics", label: "Basics" },
                { value: "expertise", label: "Expertise" },
                { value: "background", label: "Background" },
                { value: "research", label: "Research" },
                { value: "recognition", label: "Recognition" },
              ]}
            />

            {tab === "basics" && (
              <>
                <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
                  <p className="mb-1.5 text-xs font-semibold text-muted-foreground uppercase">
                    Listed as
                  </p>
                  <ul className="grid gap-1">
                    {profile.affiliations.map((a) => (
                      <li key={a.id}>
                        <span className="font-medium">{a.title}</span>
                        {a.unit_role && (
                          <span className="text-muted-foreground"> · {a.unit_role}</span>
                        )}
                        {a.department_name && (
                          <span className="text-muted-foreground"> · {a.department_name}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Change names, positions and units in{" "}
                    <Link to="/admin/people" className="font-medium text-primary hover:underline">
                      People
                    </Link>
                    . <Share2 className="inline size-3" aria-hidden="true" /> {profile.shares}{" "}
                    shares · <Eye className="inline size-3" aria-hidden="true" />{" "}
                    {profile.profile_views} views
                  </p>
                </div>
                <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
                  <ImageField
                    label="Directory photo"
                    aspect="portrait"
                    folder="people"
                    value={form.photoUrl}
                    onChange={(url) => set({ photoUrl: url ?? "" })}
                  />
                  <div className="grid content-start gap-4">
                    <p className="text-xs text-muted-foreground">
                      Leave the photo empty to use the one from People.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Staff type">
                        <select
                          value={form.staffType ?? ""}
                          onChange={(e) =>
                            set({ staffType: (e.target.value || null) as StaffType | null })
                          }
                          className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                        >
                          <option value="">Not set</option>
                          <option value="teaching">Teaching</option>
                          <option value="non-teaching">Non-teaching</option>
                        </select>
                      </Field>
                      <Field
                        label="Status"
                        hint={
                          form.staffStatus === "exited"
                            ? "Exited staff are hidden from the directory."
                            : undefined
                        }
                      >
                        <select
                          value={form.staffStatus}
                          onChange={(e) => set({ staffStatus: e.target.value as StaffStatus })}
                          className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                        >
                          {STAFF_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Switch
                          label="New face"
                          description="Featured under “New faces”."
                          checked={form.isNewFace}
                          onChange={(isNewFace) => set({ isNewFace })}
                        />
                        {form.isNewFace && (
                          <Input
                            type="date"
                            value={form.joinedOn}
                            onChange={(e) => set({ joinedOn: e.target.value })}
                            aria-label="Joined on"
                          />
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Switch
                          label="Appointed head"
                          description="Listed under “Recently appointed”."
                          checked={form.isAppointedHead}
                          onChange={(isAppointedHead) => set({ isAppointedHead })}
                        />
                        {form.isAppointedHead && (
                          <Input
                            type="date"
                            value={form.appointedOn}
                            onChange={(e) => set({ appointedOn: e.target.value })}
                            aria-label="Appointed on"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <Field
                  label="About"
                  hint="Leave empty to use the profile text from People. Separate paragraphs with a blank line."
                >
                  <Textarea
                    rows={6}
                    value={form.about}
                    onChange={(e) => set({ about: e.target.value })}
                    maxLength={6000}
                  />
                </Field>
                <Field label="Profile links" hint="Google Scholar, ResearchGate, LinkedIn…">
                  <ItemList
                    items={d.externalLinks}
                    onChange={(externalLinks) => setDetails({ externalLinks })}
                    newItem={() => ({ label: "", url: "" })}
                    addLabel="Add link"
                    render={(item, setItem) => (
                      <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
                        <Input
                          placeholder="Label"
                          value={item.label}
                          onChange={(e) => setItem({ label: e.target.value })}
                        />
                        <Input
                          placeholder="https://…"
                          value={item.url}
                          onChange={(e) => setItem({ url: e.target.value })}
                        />
                      </div>
                    )}
                  />
                </Field>
              </>
            )}

            {tab === "expertise" && (
              <>
                <Field
                  label="Specialisations"
                  hint="One per line. Shown as chips and used to find colleagues with the same skills."
                >
                  <LinesField
                    rows={4}
                    max={20}
                    value={d.specializations}
                    onChange={(specializations) => setDetails({ specializations })}
                  />
                </Field>
                <Field
                  label="Academic interests"
                  hint="One per line. Powers “Explore by expertise” and shared-interest colleagues."
                >
                  <LinesField
                    rows={4}
                    max={20}
                    value={d.academicInterests}
                    onChange={(academicInterests) => setDetails({ academicInterests })}
                  />
                </Field>
                <Field
                  label="Spotlight tags"
                  hint="Up to three, one per line — shown if they're picked for “Meet a researcher”."
                >
                  <LinesField
                    rows={3}
                    max={3}
                    value={d.spotlightTags}
                    onChange={(spotlightTags) => setDetails({ spotlightTags })}
                  />
                </Field>
                <Field label="Teaching philosophy" hint="Optional quote.">
                  <Textarea
                    rows={3}
                    value={d.teachingPhilosophy}
                    onChange={(e) => setDetails({ teachingPhilosophy: e.target.value })}
                    maxLength={2000}
                  />
                </Field>
              </>
            )}

            {tab === "background" && (
              <>
                <Field label="Education">
                  <ItemList
                    items={d.education}
                    onChange={(education) => setDetails({ education })}
                    newItem={() => ({ degree: "", field: "", institution: "", year: "" })}
                    addLabel="Add qualification"
                    render={(item, setItem) => (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          placeholder="Degree, e.g. MPhil"
                          value={item.degree}
                          onChange={(e) => setItem({ degree: e.target.value })}
                        />
                        <Input
                          placeholder="Field of study"
                          value={item.field}
                          onChange={(e) => setItem({ field: e.target.value })}
                        />
                        <Input
                          placeholder="Institution"
                          value={item.institution}
                          onChange={(e) => setItem({ institution: e.target.value })}
                        />
                        <Input
                          placeholder="Year"
                          value={item.year}
                          onChange={(e) => setItem({ year: e.target.value })}
                        />
                      </div>
                    )}
                  />
                </Field>
                <Field label="Career" hint="Leave the end year empty for the current role.">
                  <ItemList
                    items={d.careerPositions}
                    onChange={(careerPositions) => setDetails({ careerPositions })}
                    newItem={() => ({ position: "", organization: "", startYear: "", endYear: "" })}
                    addLabel="Add position"
                    render={(item, setItem) => (
                      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_90px_90px]">
                        <Input
                          placeholder="Position"
                          value={item.position}
                          onChange={(e) => setItem({ position: e.target.value })}
                        />
                        <Input
                          placeholder="Organisation"
                          value={item.organization}
                          onChange={(e) => setItem({ organization: e.target.value })}
                        />
                        <Input
                          placeholder="From"
                          value={item.startYear}
                          onChange={(e) => setItem({ startYear: e.target.value })}
                        />
                        <Input
                          placeholder="To"
                          value={item.endYear}
                          onChange={(e) => setItem({ endYear: e.target.value })}
                        />
                      </div>
                    )}
                  />
                </Field>
              </>
            )}

            {tab === "research" && (
              <>
                <Field label="ORCID iD">
                  <Input
                    placeholder="0000-0000-0000-0000"
                    value={d.orcid}
                    onChange={(e) => setDetails({ orcid: e.target.value })}
                  />
                </Field>
                <Field
                  label="Publications"
                  hint="Authors comma-separated; this person's name is bolded on the site."
                >
                  <ItemList
                    items={d.publications}
                    onChange={(publications) => setDetails({ publications })}
                    newItem={() => ({
                      title: "",
                      year: null,
                      url: "",
                      authors: "",
                      venue: "",
                      type: "Article",
                      citations: null,
                    })}
                    addLabel="Add publication"
                    render={(item, setItem) => (
                      <div className="grid gap-2">
                        <Input
                          placeholder="Title"
                          value={item.title}
                          onChange={(e) => setItem({ title: e.target.value })}
                        />
                        <Input
                          placeholder="Authors"
                          value={item.authors}
                          onChange={(e) => setItem({ authors: e.target.value })}
                        />
                        <div className="grid gap-2 sm:grid-cols-[1fr_150px_90px_90px]">
                          <Input
                            placeholder="Journal / venue"
                            value={item.venue}
                            onChange={(e) => setItem({ venue: e.target.value })}
                          />
                          <select
                            value={item.type}
                            onChange={(e) => setItem({ type: e.target.value })}
                            className="h-9 rounded-md border border-input bg-white px-2 text-sm"
                          >
                            {PUBLICATION_TYPES.map((t) => (
                              <option key={t}>{t}</option>
                            ))}
                          </select>
                          <Input
                            placeholder="Year"
                            inputMode="numeric"
                            value={item.year ?? ""}
                            onChange={(e) => setItem({ year: toInt(e.target.value) })}
                          />
                          <Input
                            placeholder="Citations"
                            inputMode="numeric"
                            value={item.citations ?? ""}
                            onChange={(e) => setItem({ citations: toInt(e.target.value) })}
                          />
                        </div>
                        <Input
                          placeholder="Link (https://…)"
                          value={item.url}
                          onChange={(e) => setItem({ url: e.target.value })}
                        />
                      </div>
                    )}
                  />
                </Field>
                <Field label="Projects">
                  <ItemList
                    items={d.projects}
                    onChange={(projects) => setDetails({ projects })}
                    newItem={() => ({ title: "", role: "", startDate: "", endDate: "", url: "" })}
                    addLabel="Add project"
                    render={(item, setItem) => (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          className="sm:col-span-2"
                          placeholder="Project title"
                          value={item.title}
                          onChange={(e) => setItem({ title: e.target.value })}
                        />
                        <Input
                          placeholder="Role"
                          value={item.role}
                          onChange={(e) => setItem({ role: e.target.value })}
                        />
                        <Input
                          placeholder="Link (https://…)"
                          value={item.url}
                          onChange={(e) => setItem({ url: e.target.value })}
                        />
                        <Input
                          type="month"
                          aria-label="Start"
                          value={item.startDate}
                          onChange={(e) => setItem({ startDate: e.target.value })}
                        />
                        <Input
                          type="month"
                          aria-label="End"
                          value={item.endDate}
                          onChange={(e) => setItem({ endDate: e.target.value })}
                        />
                      </div>
                    )}
                  />
                </Field>
              </>
            )}

            {tab === "recognition" && (
              <>
                <Field label="Conferences & engagements">
                  <ItemList
                    items={d.conferences}
                    onChange={(conferences) => setDetails({ conferences })}
                    newItem={() => ({
                      name: "",
                      role: "Participant",
                      location: "",
                      year: null,
                      url: "",
                    })}
                    addLabel="Add conference"
                    render={(item, setItem) => (
                      <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
                        <Input
                          placeholder="Conference"
                          value={item.name}
                          onChange={(e) => setItem({ name: e.target.value })}
                        />
                        <select
                          value={item.role}
                          onChange={(e) => setItem({ role: e.target.value })}
                          className="h-9 rounded-md border border-input bg-white px-2 text-sm"
                        >
                          {CONFERENCE_ROLES.map((r) => (
                            <option key={r}>{r}</option>
                          ))}
                        </select>
                        <Input
                          placeholder="Location"
                          value={item.location}
                          onChange={(e) => setItem({ location: e.target.value })}
                        />
                        <Input
                          placeholder="Year"
                          inputMode="numeric"
                          value={item.year ?? ""}
                          onChange={(e) => setItem({ year: toInt(e.target.value) })}
                        />
                        <Input
                          className="sm:col-span-2"
                          placeholder="Link (https://…)"
                          value={item.url}
                          onChange={(e) => setItem({ url: e.target.value })}
                        />
                      </div>
                    )}
                  />
                </Field>
                <Field
                  label="Honours & affiliations"
                  hint="e.g. “Fellow” · “Ghana Mathematics Society, 2021”."
                >
                  <ItemList
                    items={d.honors}
                    onChange={(honors) => setDetails({ honors })}
                    newItem={() => ({ title: "", description: "" })}
                    addLabel="Add honour"
                    render={(item, setItem) => (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          placeholder="Title"
                          value={item.title}
                          onChange={(e) => setItem({ title: e.target.value })}
                        />
                        <Input
                          placeholder="Organisation, year"
                          value={item.description}
                          onChange={(e) => setItem({ description: e.target.value })}
                        />
                      </div>
                    )}
                  />
                </Field>
              </>
            )}
          </fieldset>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {canEdit ? "Cancel" : "Close"}
          </Button>
          {canEdit && (
            <Button disabled={!form || save.isPending} onClick={() => form && save.mutate(form)}>
              {save.isPending ? "Saving…" : "Save profile"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toInt(value: string): number | null {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}
