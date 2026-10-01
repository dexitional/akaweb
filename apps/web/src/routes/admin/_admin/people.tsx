import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import type { PersonRow } from "@aka/db";
import { api } from "#/lib/api-client";
import { PERSON_GROUPS } from "#/lib/content";
import { DIRECTORY_GROUPS } from "#/lib/directory";
import type { PersonGroup } from "#/lib/content";
import { canManage } from "#/lib/permissions";
import { initials } from "#/lib/format";
import { cn } from "#/lib/utils";
import {
  AdminPageHeader,
  ConfirmDialog,
  Field,
  SearchInput,
  Switch,
  errorToast,
} from "#/components/admin/ui";
import { ImageField } from "#/components/admin/media-fields";
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

export const Route = createFileRoute("/admin/_admin/people")({
  component: PeoplePage,
});

type Person = PersonRow & { department_name: string | null };

function PeoplePage() {
  const { admin } = Route.useRouteContext();
  const canEdit = canManage(admin.role, "people");
  const queryClient = useQueryClient();
  const [group, setGroup] = useState<PersonGroup>("management");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Person | "new" | null>(null);
  const [deleting, setDeleting] = useState<Person | null>(null);

  const { data } = useQuery({
    queryKey: ["people"],
    queryFn: () => api.get<{ people: Array<Person> }>("/people").then((r) => r.people),
  });
  const people = data ?? [];
  const query = q.trim().toLowerCase();
  const visible = query
    ? people.filter(
        (p) => p.name.toLowerCase().includes(query) || p.title.toLowerCase().includes(query),
      )
    : people.filter((p) => p.group_key === group);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["people"] });

  const reorder = useMutation({
    mutationFn: (ids: Array<number>) => api.post("/people/reorder", { ids }),
    onSuccess: invalidate,
    onError: errorToast("Couldn't reorder."),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/people/${id}`),
    onSuccess: () => {
      toast.success("Removed.");
      setDeleting(null);
      void invalidate();
    },
    onError: errorToast("Couldn't remove."),
  });
  const move = (index: number, delta: number) => {
    const ids = visible.map((p) => p.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + delta, 0, id!);
    queryClient.setQueryData<Array<Person>>(["people"], (old) =>
      (old ?? [])
        .map((p) => (ids.includes(p.id) ? { ...p, sort_order: ids.indexOf(p.id) } : p))
        .sort((a, b) => a.group_key.localeCompare(b.group_key) || a.sort_order - b.sort_order),
    );
    reorder.mutate(ids);
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="People"
        description="Profiles shown on pages through the People block — management, the Principal's office, SRC, alumni executives and staff."
        actions={
          canEdit && (
            <Button onClick={() => setEditing("new")}>
              <Plus /> Add person
            </Button>
          )
        }
      />
      <div className="flex flex-col gap-4 lg:flex-row">
        <nav
          className="flex shrink-0 gap-1 overflow-x-auto lg:w-60 lg:flex-col"
          aria-label="Groups"
        >
          {PERSON_GROUPS.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => {
                setGroup(g.key);
                setQ("");
              }}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium whitespace-nowrap",
                group === g.key && !query
                  ? "bg-white text-primary shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:bg-white/60 hover:text-foreground",
              )}
            >
              {g.label}
              <span className="text-xs">{people.filter((p) => p.group_key === g.key).length}</span>
            </button>
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex justify-end">
            <SearchInput value={q} onChange={setQ} placeholder="Search everyone…" />
          </div>
          {visible.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border bg-white px-6 py-14 text-center text-sm text-muted-foreground">
              No one here yet.
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {visible.map((p, i) => (
                <li
                  key={p.id}
                  className={cn(
                    "flex gap-3 rounded-xl border border-border bg-white p-3",
                    !p.is_active && "opacity-60",
                  )}
                >
                  {p.photo_url ? (
                    <img
                      src={p.photo_url}
                      alt=""
                      className="size-20 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-dark text-xl font-bold text-brand-sky">
                      {initials(p.name)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{p.title}</p>
                    {p.department_name && (
                      <p className="truncate text-xs text-muted-foreground">{p.department_name}</p>
                    )}
                    <div className="mt-1 flex gap-2 text-muted-foreground">
                      {p.email && <Mail className="size-3.5" aria-label={p.email} />}
                      {p.phone && <Phone className="size-3.5" aria-label={p.phone} />}
                      {!p.is_active && <span className="text-xs">Hidden</span>}
                    </div>
                    {canEdit && (
                      <div className="mt-2 flex items-center gap-0.5">
                        {!query && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              disabled={i === 0}
                              onClick={() => move(i, -1)}
                              aria-label="Move up"
                            >
                              <ArrowUp />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              disabled={i === visible.length - 1}
                              onClick={() => move(i, 1)}
                              aria-label="Move down"
                            >
                              <ArrowDown />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="ml-auto"
                          onClick={() => setEditing(p)}
                          aria-label="Edit"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-destructive"
                          onClick={() => setDeleting(p)}
                          aria-label="Remove"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <PersonDialog
        editing={editing}
        defaultGroup={group}
        onClose={() => setEditing(null)}
        onSaved={invalidate}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Remove ${deleting?.name}?`}
        pending={remove.isPending}
        confirmLabel="Remove"
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}

const blank = (group: PersonGroup) => ({
  groupKey: group,
  name: "",
  title: "",
  departmentId: null as number | null,
  photoUrl: "",
  bio: "",
  email: "",
  phone: "",
  unitRole: "",
  profileSlug: "",
  isActive: true,
});

function PersonDialog({
  editing,
  defaultGroup,
  onClose,
  onSaved,
}: {
  editing: Person | "new" | null;
  defaultGroup: PersonGroup;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(blank(defaultGroup));
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () =>
      api
        .get<{ departments: Array<{ id: number; name: string; kind: string }> }>("/departments")
        .then((r) => r.departments),
    enabled: editing !== null,
  });

  useEffect(() => {
    if (!editing) return;
    setForm(
      editing === "new"
        ? blank(defaultGroup)
        : {
            groupKey: editing.group_key as PersonGroup,
            name: editing.name,
            title: editing.title,
            departmentId: editing.department_id,
            photoUrl: editing.photo_url ?? "",
            bio: editing.bio ?? "",
            email: editing.email ?? "",
            phone: editing.phone ?? "",
            unitRole: editing.unit_role ?? "",
            profileSlug: editing.profile_slug ?? "",
            isActive: editing.is_active === 1,
          },
    );
  }, [editing, defaultGroup]);

  const save = useMutation({
    mutationFn: () =>
      editing === "new"
        ? api.post("/people", form)
        : api.patch(`/people/${(editing as Person).id}`, form),
    onSuccess: () => {
      toast.success("Saved.");
      onSaved();
      onClose();
    },
    onError: errorToast("Couldn't save."),
  });

  return (
    <Dialog open={editing !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing === "new" ? "Add person" : "Edit person"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
          <ImageField
            label="Photo"
            aspect="portrait"
            folder="people"
            value={form.photoUrl}
            onChange={(url) => set({ photoUrl: url ?? "" })}
          />
          <div className="grid content-start gap-4">
            <Field label="Full name">
              <Input
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="e.g. Dr. Ama Mensah"
              />
            </Field>
            <Field label="Position / title">
              <Input
                value={form.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="e.g. Vice Principal"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Group">
                <select
                  value={form.groupKey}
                  onChange={(e) => set({ groupKey: e.target.value as PersonGroup })}
                  className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                >
                  {PERSON_GROUPS.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Department / unit" hint="Lists them on that page.">
                <select
                  value={form.departmentId ?? ""}
                  onChange={(e) =>
                    set({ departmentId: e.target.value ? Number(e.target.value) : null })
                  }
                  className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                >
                  <option value="">None</option>
                  {(departments ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set({ email: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
        </div>
        {DIRECTORY_GROUPS.includes(form.groupKey) && (
          <div className="grid gap-4 rounded-lg border border-border bg-secondary/30 p-3 sm:grid-cols-2">
            <Field
              label="Leadership role in the unit"
              hint="e.g. Head of Department — lists them under the unit's leadership."
            >
              <Input
                value={form.unitRole}
                onChange={(e) => set({ unitRole: e.target.value })}
                maxLength={120}
              />
            </Field>
            <Field
              label="Directory profile"
              hint="Leave empty to create one from the name. Use the same address to merge several listings into one person."
            >
              <Input
                value={form.profileSlug}
                onChange={(e) =>
                  set({ profileSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
                }
                placeholder="e.g. ama-mensah"
                maxLength={150}
              />
            </Field>
          </div>
        )}
        <Field label="Profile" hint="Shown when visitors open the profile.">
          <Textarea
            rows={5}
            value={form.bio}
            onChange={(e) => set({ bio: e.target.value })}
            maxLength={4000}
          />
        </Field>
        <Switch
          label="Visible on the website"
          checked={form.isActive}
          onChange={(isActive) => set({ isActive })}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={form.name.trim().length < 2 || form.title.trim().length < 2 || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
