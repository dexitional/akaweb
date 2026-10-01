import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "#/lib/api-client";
import { ROLE_LABELS } from "#/lib/permissions";
import { AdminPageHeader, Field, Panel, errorToast } from "#/components/admin/ui";
import { ImageField } from "#/components/admin/media-fields";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";

export const Route = createFileRoute("/admin/_admin/account")({
  component: AccountPage,
});

interface Me {
  full_name: string;
  email: string;
  position: string | null;
  phone: string | null;
  photo_url: string | null;
}

function AccountPage() {
  const { admin } = Route.useRouteContext();
  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<{ admin: Me }>("/auth/me").then((r) => r.admin),
  });
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <AdminPageHeader
        title="My account"
        description={`${admin.email} · ${ROLE_LABELS[admin.role]}`}
      />
      {data && <ProfileCard me={data} />}
      <PasswordCard />
    </div>
  );
}

function ProfileCard({ me }: { me: Me }) {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: me.full_name,
    position: me.position ?? "",
    phone: me.phone ?? "",
    photoUrl: me.photo_url ?? "",
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const save = useMutation({
    mutationFn: () => api.patch("/auth/me", form),
    onSuccess: () => {
      toast.success("Profile updated.");
      void router.invalidate();
    },
    onError: errorToast("Couldn't update your profile."),
  });
  return (
    <Panel title="Profile">
      <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
        <ImageField
          aspect="square"
          folder="people"
          value={form.photoUrl}
          onChange={(url) => set({ photoUrl: url ?? "" })}
        />
        <div className="grid content-start gap-4">
          <Field label="Full name">
            <Input value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Position">
              <Input value={form.position} onChange={(e) => set({ position: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
          </div>
          <Button
            className="w-fit"
            disabled={form.fullName.trim().length < 2 || save.isPending}
            onClick={() => save.mutate()}
          >
            Save profile
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function PasswordCard() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const mismatch = form.confirm.length > 0 && form.confirm !== form.newPassword;
  const save = useMutation({
    mutationFn: () =>
      api.post("/auth/me/password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }),
    onSuccess: () => {
      toast.success("Password changed.");
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
    },
    onError: errorToast("Couldn't change your password."),
  });
  return (
    <Panel title="Change password">
      <form
        className="grid max-w-md gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label="Current password">
          <Input
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          />
        </Field>
        <Field label="New password" hint="At least 8 characters.">
          <Input
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          />
        </Field>
        <Field label="Confirm new password" error={mismatch ? "Passwords don't match" : undefined}>
          <Input
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          />
        </Field>
        <Button
          type="submit"
          className="w-fit"
          disabled={
            !form.currentPassword || form.newPassword.length < 8 || mismatch || save.isPending
          }
        >
          Change password
        </Button>
      </form>
    </Panel>
  );
}
