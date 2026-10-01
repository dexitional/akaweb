import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { AdminRole } from "@aka/db";
import { api } from "#/lib/api-client";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "#/lib/permissions";
import { formatDateTime, initials } from "#/lib/format";
import { cn } from "#/lib/utils";
import { AdminPageHeader, ConfirmDialog, Field, StatusPill, Switch, TableMessage, errorToast } from "#/components/admin/ui";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table.tsx";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog.tsx";

export const Route = createFileRoute("/admin/_admin/users")({
  component: UsersPage,
});

interface User {
  id: number;
  full_name: string;
  email: string;
  role: AdminRole;
  position: string | null;
  phone: string | null;
  photo_url: string | null;
  is_active: 0 | 1;
  last_login_at: string | null;
  locked_until: string | null;
}

const ROLES: Array<AdminRole> = ["super_admin", "admin", "editor", "author"];

function UsersPage() {
  const { admin } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => api.get<{ users: Array<User> }>("/users").then((r) => r.users) });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["users"] });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => {
      toast.success("Account deleted.");
      setDeleting(null);
      void invalidate();
    },
    onError: errorToast("Couldn't delete the account."),
  });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Users"
        description="Who can sign in to the CMS, and what they can do."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus /> Add user
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ROLES.map((r) => (
          <div key={r} className="rounded-xl border border-border bg-white p-4">
            <p className="font-semibold">{ROLE_LABELS[r]}</p>
            <p className="mt-1 text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</p>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last sign-in</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((u) => (
              <TableRow key={u.id} className={cn(!u.is_active && "opacity-60")}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {u.photo_url ? (
                      <img src={u.photo_url} alt="" className="size-9 rounded-full object-cover" />
                    ) : (
                      <span className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{initials(u.full_name)}</span>
                    )}
                    <span>
                      <span className="block font-semibold">
                        {u.full_name}
                        {u.id === admin.id && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                      </span>
                      <span className="block text-xs text-muted-foreground">{u.email}</span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {ROLE_LABELS[u.role]}
                  {u.position && <span className="block text-xs text-muted-foreground">{u.position}</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.last_login_at ? formatDateTime(u.last_login_at) : "Never"}</TableCell>
                <TableCell>
                  <StatusPill status={u.is_active ? "active" : "inactive"} label={u.is_active ? "Active" : "Deactivated"} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(u)} aria-label="Edit">
                      <Pencil />
                    </Button>
                    {u.id !== admin.id && (
                      <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setDeleting(u)} aria-label="Delete">
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {isLoading && <TableMessage>Loading…</TableMessage>}
      </div>
      <UserDialog editing={editing} selfId={admin.id} onClose={() => setEditing(null)} onSaved={invalidate} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.full_name}'s account?`}
        description="Their content stays; it just won't be attributed to them. Consider deactivating instead."
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}

function UserDialog({ editing, selfId, onClose, onSaved }: { editing: User | "new" | null; selfId: number; onClose: () => void; onSaved: () => void }) {
  const blank = { fullName: "", email: "", role: "editor" as AdminRole, position: "", phone: "", password: "", isActive: true };
  const [form, setForm] = useState(blank);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  useEffect(() => {
    if (!editing) return;
    setForm(
      editing === "new"
        ? blank
        : { fullName: editing.full_name, email: editing.email, role: editing.role, position: editing.position ?? "", phone: editing.phone ?? "", password: "", isActive: editing.is_active === 1 },
    );
  }, [editing]);

  const isNew = editing === "new";
  const save = useMutation({
    mutationFn: () => {
      const { password, ...rest } = form;
      return isNew ? api.post("/users", form) : api.patch(`/users/${(editing as User).id}`, { ...rest, ...(password ? { password } : {}) });
    },
    onSuccess: () => {
      toast.success(isNew ? "Account created. Share the password with them securely." : "Account updated.");
      onSaved();
      onClose();
    },
    onError: errorToast("Couldn't save the account."),
  });

  const generate = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const bytes = crypto.getRandomValues(new Uint32Array(12));
    set({ password: Array.from(bytes, (b) => chars[b % chars.length]).join("") });
  };

  const valid = form.fullName.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.email) && (isNew ? form.password.length >= 8 : !form.password || form.password.length >= 8);

  return (
    <Dialog open={editing !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add user" : "Edit user"}</DialogTitle>
          <DialogDescription>{isNew ? "They sign in at /admin/login with this email and password." : "Leave the password blank to keep it unchanged."}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
            </Field>
            <Field label="Position" hint="Optional">
              <Input value={form.position} onChange={(e) => set({ position: e.target.value })} placeholder="e.g. PRO" />
            </Field>
            <Field label="Phone" hint="Optional">
              <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
          </div>
          <Field label="Role">
            <div className="grid gap-2 sm:grid-cols-2">
              {ROLES.map((r) => (
                <label key={r} className={cn("flex cursor-pointer gap-2 rounded-lg border p-3 text-sm", form.role === r ? "border-primary bg-primary/5" : "border-border")}>
                  <input type="radio" name="role" checked={form.role === r} onChange={() => set({ role: r })} className="mt-0.5" />
                  <span>
                    <span className="block font-semibold">{ROLE_LABELS[r]}</span>
                    <span className="block text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</span>
                  </span>
                </label>
              ))}
            </div>
          </Field>
          <Field label={isNew ? "Password" : "Reset password"} hint="At least 8 characters.">
            <div className="flex gap-2">
              <Input value={form.password} onChange={(e) => set({ password: e.target.value })} className="font-mono" autoComplete="new-password" />
              <Button type="button" variant="outline" onClick={generate}>
                Generate
              </Button>
            </div>
          </Field>
          {/* The dialog stays mounted while closed (editing === null). */}
          {editing && editing !== "new" && editing.id !== selfId && <Switch label="Active" description="Deactivated users can't sign in." checked={form.isActive} onChange={(isActive) => set({ isActive })} />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
