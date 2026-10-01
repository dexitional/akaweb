import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import type { DepartmentKind, DepartmentRow } from "@aka/db";
import { api } from "#/lib/api-client";
import { DEPARTMENT_KINDS } from "#/lib/content";
import { canManage } from "#/lib/permissions";
import { AdminPageHeader, Field, Panel, Segmented, Switch, errorToast } from "#/components/admin/ui";
import { RichTextEditor } from "#/components/admin/rich-text-editor";
import { ImageField } from "#/components/admin/media-fields";
import { ItemList } from "#/components/admin/block-editor";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";

export const Route = createFileRoute("/admin/_admin/departments/$departmentId")({
  validateSearch: z.object({ kind: z.enum(["department", "unit"]).optional().catch(undefined) }),
  component: DepartmentEditorRoute,
});

type Full = DepartmentRow & { programmes: Array<string> };

function toForm(d: Full) {
  return {
    kind: d.kind,
    name: d.name,
    slug: d.slug,
    summary: d.summary ?? "",
    body: d.body ?? "",
    imageUrl: d.image_url ?? "",
    headName: d.head_name ?? "",
    headTitle: d.head_title ?? "",
    headPhotoUrl: d.head_photo_url ?? "",
    email: d.email ?? "",
    phone: d.phone ?? "",
    location: d.location ?? "",
    programmes: d.programmes,
    isPublished: d.is_published === 1,
  };
}
type Form = ReturnType<typeof toForm>;

function DepartmentEditorRoute() {
  const { departmentId } = Route.useParams();
  const { kind } = Route.useSearch();
  const isNew = departmentId === "new";
  const { data, isLoading } = useQuery({
    queryKey: ["departments", departmentId],
    queryFn: () => api.get<{ department: Full }>(`/departments/${departmentId}`).then((r) => r.department),
    enabled: !isNew,
  });
  if (!isNew && (isLoading || !data)) return <p className="text-muted-foreground">Loading…</p>;
  const initial: Form = data
    ? toForm(data)
    : {
        kind: kind ?? "department",
        name: "",
        slug: "",
        summary: "",
        body: "",
        imageUrl: "",
        headName: "",
        headTitle: kind === "unit" ? "Head of Unit" : "Head of Department",
        headPhotoUrl: "",
        email: "",
        phone: "",
        location: "",
        programmes: [],
        isPublished: true,
      };
  return <DepartmentEditor key={departmentId} department={data ?? null} initial={initial} />;
}

function DepartmentEditor({ department, initial }: { department: Full | null; initial: Form }) {
  const { admin } = Route.useRouteContext();
  const canEdit = canManage(admin.role, "departments");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(initial);
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const meta = DEPARTMENT_KINDS[form.kind];

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, slug: form.slug.replace(/^-+|-+$/g, ""), programmes: form.programmes.map((p) => p.trim()).filter(Boolean) };
      return department ? api.patch<{ department: Full }>(`/departments/${department.id}`, body) : api.post<{ department: Full }>("/departments", body);
    },
    onSuccess: ({ department: saved }) => {
      setForm(toForm(saved));
      void queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Saved.");
      if (!department) void navigate({ to: "/admin/departments/$departmentId", params: { departmentId: String(saved.id) }, replace: true });
    },
    onError: errorToast("Couldn't save."),
  });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow={
          <Link to="/admin/departments" className="inline-flex items-center gap-1 hover:text-primary">
            <ArrowLeft className="size-3.5" /> Departments & Units
          </Link>
        }
        title={department ? form.name || "Untitled" : `New ${meta.label.toLowerCase()}`}
        actions={
          <>
            {department && (
              <Button asChild variant="outline">
                <a href={`${DEPARTMENT_KINDS[department.kind].path}/${department.slug}`} target="_blank" rel="noopener">
                  <ExternalLink /> View
                </a>
              </Button>
            )}
            {canEdit && (
              <Button disabled={form.name.trim().length < 2 || save.isPending} onClick={() => save.mutate()}>
                {save.isPending && <Loader2 className="animate-spin" />} Save
              </Button>
            )}
          </>
        }
      />
      <fieldset disabled={!canEdit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel>
            <div className="grid gap-4">
              <Field label="Type">
                <Segmented
                  value={form.kind}
                  onChange={(kind: DepartmentKind) => set({ kind })}
                  options={[
                    { value: "department", label: "Academic department" },
                    { value: "unit", label: "Unit" },
                  ]}
                />
              </Field>
              <Field label="Name">
                <Input value={form.name} onChange={(e) => set({ name: e.target.value })} className="h-11 text-lg font-semibold" placeholder="e.g. Mathematics and ICT Department" />
              </Field>
              <Field label="Web address" hint={form.slug ? undefined : "Created from the name when you save."}>
                <div className="flex items-center rounded-md border border-input bg-secondary/40 pl-3 text-sm">
                  <span className="shrink-0 text-muted-foreground">{meta.path}/</span>
                  <input
                    value={form.slug}
                    onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-") })}
                    className="h-9 min-w-0 flex-1 rounded-r-md bg-white px-2 font-mono outline-none"
                  />
                </div>
              </Field>
              <Field label="Summary" hint="Shown on cards and under the page title.">
                <Textarea rows={2} value={form.summary} onChange={(e) => set({ summary: e.target.value })} maxLength={500} />
              </Field>
            </div>
          </Panel>
          <Panel title="About" description="Overview, vision, history, facilities…">
            <RichTextEditor value={form.body} onChange={(body) => set({ body })} folder="departments" />
          </Panel>
          {form.kind === "department" && (
            <Panel title="Programmes offered">
              <ItemList
                items={form.programmes}
                onChange={(programmes) => set({ programmes })}
                newItem={() => ""}
                addLabel="Add programme"
                render={(item, _set, index) => (
                  <Input
                    value={item}
                    placeholder="e.g. B.Ed. Junior High School Mathematics"
                    onChange={(e) => set({ programmes: form.programmes.map((p, i) => (i === index ? e.target.value : p)) })}
                  />
                )}
              />
            </Panel>
          )}
        </div>
        <div className="flex flex-col gap-6">
          <Panel title="Visibility">
            <Switch label="Published" description="Show this page on the website." checked={form.isPublished} onChange={(isPublished) => set({ isPublished })} />
          </Panel>
          <Panel title="Banner image">
            <ImageField folder="departments" value={form.imageUrl} onChange={(url) => set({ imageUrl: url ?? "" })} />
          </Panel>
          <Panel title={`Head of ${meta.label.toLowerCase()}`}>
            <div className="grid gap-4">
              <div className="grid grid-cols-[96px_1fr] gap-3">
                <ImageField aspect="square" folder="people" value={form.headPhotoUrl} onChange={(url) => set({ headPhotoUrl: url ?? "" })} />
                <div className="grid content-start gap-2">
                  <Input value={form.headName} onChange={(e) => set({ headName: e.target.value })} placeholder="Name" />
                  <Input value={form.headTitle} onChange={(e) => set({ headTitle: e.target.value })} placeholder="Title" />
                </div>
              </div>
            </div>
          </Panel>
          <Panel title="Contact">
            <div className="grid gap-3">
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
              </Field>
              <Field label="Location">
                <Input value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Science Block, Room 4" />
              </Field>
            </div>
          </Panel>
        </div>
      </fieldset>
    </div>
  );
}
