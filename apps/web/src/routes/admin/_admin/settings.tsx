import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api } from "#/lib/api-client";
import { canManage } from "#/lib/permissions";
import { QUICK_LINK_ICONS, SOCIAL_PLATFORMS, settingsSchemas } from "#/lib/settings";
import type { SettingsKey, SiteSettings } from "#/lib/settings";
import { SECTIONS } from "#/lib/content";
import { cn } from "#/lib/utils";
import { AdminPageHeader, Field, Panel, Switch, errorToast } from "#/components/admin/ui";
import { ImageField } from "#/components/admin/media-fields";
import { ItemList, LinkField } from "#/components/admin/block-editor";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";

export const Route = createFileRoute("/admin/_admin/settings")({
  component: SettingsPage,
});

const TABS = [
  { key: "general", label: "College identity" },
  { key: "home", label: "Home page" },
  { key: "notice", label: "Notice banner" },
  { key: "sections", label: "Section intros" },
] as const;
type Tab = (typeof TABS)[number]["key"];

function SettingsPage() {
  const [tab, setTab] = useState<Tab>("general");
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<{ settings: SiteSettings }>("/settings").then((r) => r.settings),
  });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title="Site settings" description="College details, contact information, home page content and the site-wide notice." />
      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto lg:w-52 lg:flex-col" aria-label="Settings">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-lg px-3 py-2 text-left text-sm font-medium whitespace-nowrap",
                tab === t.key ? "bg-white text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:bg-white/60 hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {!data ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : tab === "general" ? (
            <>
              <IdentityCard value={data.identity} />
              <ContactCard value={data.contact} />
              <SocialsCard value={data.socials} />
            </>
          ) : tab === "home" ? (
            <>
              <WelcomeCard value={data.welcome} />
              <QuickLinksCard value={data.quickLinks} />
              <StatsCard value={data.stats} />
              <CtaCard value={data.cta} />
            </>
          ) : tab === "notice" ? (
            <NoticeCard value={data.notice} />
          ) : (
            <SectionsCard value={data.sections} />
          )}
        </div>
      </div>
    </div>
  );
}

// Local form state for one settings group, validated with the same schema the
// API uses, saved on its own.
function useSettingForm<TKey extends SettingsKey>(key: TKey, value: SiteSettings[TKey]) {
  const { admin } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SiteSettings[TKey]>(value);
  useEffect(() => setForm(value), [value]);
  const dirty = JSON.stringify(form) !== JSON.stringify(value);
  const parsed = settingsSchemas[key].safeParse(form);
  const error = parsed.success ? null : (parsed.error.issues[0] ? `${parsed.error.issues[0].path.join(" › ")}: ${parsed.error.issues[0].message}` : "Invalid");

  const save = useMutation({
    mutationFn: () => api.put(`/settings/${key}`, form),
    onSuccess: () => {
      toast.success("Settings saved — the website updates within a few minutes for visitors already browsing.");
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: errorToast("Couldn't save settings."),
  });

  const set = (patch: Partial<SiteSettings[TKey]>) => setForm((f) => ({ ...f, ...patch }));
  const footer = canManage(admin.role, "settings") ? (
    <div className="mt-5 flex items-center justify-end gap-3 border-t border-border pt-4">
      {error && dirty && <p className="mr-auto text-xs text-destructive">{error}</p>}
      {dirty && (
        <Button variant="ghost" onClick={() => setForm(value)}>
          Discard
        </Button>
      )}
      <Button disabled={!dirty || Boolean(error) || save.isPending} onClick={() => save.mutate()}>
        {save.isPending && <Loader2 className="animate-spin" />} Save
      </Button>
    </div>
  ) : null;
  return { form, set, footer };
}

function IdentityCard({ value }: { value: SiteSettings["identity"] }) {
  const { form, set, footer } = useSettingForm("identity", value);
  return (
    <Panel title="College identity" description="Shown in the header, footer and browser titles.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="College name">
          <Input value={form.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Short name">
          <Input value={form.shortName} onChange={(e) => set({ shortName: e.target.value })} />
        </Field>
        <Field label="Motto">
          <Input value={form.motto} onChange={(e) => set({ motto: e.target.value })} />
        </Field>
        <Field label="Tagline">
          <Input value={form.tagline} onChange={(e) => set({ tagline: e.target.value })} />
        </Field>
        <Field label="Footer description" className="sm:col-span-2">
          <Textarea rows={3} value={form.footerText} onChange={(e) => set({ footerText: e.target.value })} />
        </Field>
      </div>
      {footer}
    </Panel>
  );
}

function ContactCard({ value }: { value: SiteSettings["contact"] }) {
  const { form, set, footer } = useSettingForm("contact", value);
  return (
    <Panel title="Contact details" description="Used in the header, footer and Contact blocks.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Address" className="sm:row-span-2">
          <Textarea rows={4} value={form.address} onChange={(e) => set({ address: e.target.value })} />
        </Field>
        <Field label="Postal address">
          <Input value={form.postalAddress} onChange={(e) => set({ postalAddress: e.target.value })} />
        </Field>
        <Field label="Office hours">
          <Input value={form.officeHours} onChange={(e) => set({ officeHours: e.target.value })} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
        </Field>
        <Field label="Alternative phone">
          <Input value={form.altPhone} onChange={(e) => set({ altPhone: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
        </Field>
        <Field label="Map location" hint="What to search on Google Maps for the embedded map.">
          <Input value={form.mapQuery} onChange={(e) => set({ mapQuery: e.target.value })} />
        </Field>
      </div>
      {footer}
    </Panel>
  );
}

const SOCIAL_LABELS: Record<(typeof SOCIAL_PLATFORMS)[number], string> = {
  facebook: "Facebook",
  x: "X (Twitter)",
  instagram: "Instagram",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
};

function SocialsCard({ value }: { value: SiteSettings["socials"] }) {
  const { form, set, footer } = useSettingForm("socials", value);
  return (
    <Panel title="Social media" description="Leave blank to hide an icon.">
      <div className="grid gap-4 sm:grid-cols-2">
        {SOCIAL_PLATFORMS.map((p) => (
          <Field key={p} label={SOCIAL_LABELS[p]}>
            <Input value={form[p]} onChange={(e) => set({ [p]: e.target.value.trim() })} placeholder="https://" />
          </Field>
        ))}
      </div>
      {footer}
    </Panel>
  );
}

function NoticeCard({ value }: { value: SiteSettings["notice"] }) {
  const { form, set, footer } = useSettingForm("notice", value);
  return (
    <Panel title="Notice banner" description="A dismissible strip above the header on every page — for urgent or time-limited information.">
      <div className="grid gap-4">
        <Switch label="Show the notice" checked={form.enabled} onChange={(enabled) => set({ enabled })} />
        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <Field label="Label">
            <Input value={form.label} onChange={(e) => set({ label: e.target.value })} placeholder="Important" />
          </Field>
          <Field label="Headline">
            <Input value={form.title} onChange={(e) => set({ title: e.target.value })} />
          </Field>
        </div>
        <Field label="Details">
          <Textarea rows={2} value={form.text} onChange={(e) => set({ text: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Button label">
            <Input value={form.linkLabel} onChange={(e) => set({ linkLabel: e.target.value })} />
          </Field>
          <LinkField label="Button link" value={form.linkUrl} onChange={(linkUrl) => set({ linkUrl })} />
          <Field label="Hide automatically after" hint="Optional">
            <Input type="date" value={form.expiresOn} onChange={(e) => set({ expiresOn: e.target.value })} />
          </Field>
        </div>
        {form.enabled && form.title && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <span className="mr-2 rounded-full bg-amber-200/70 px-2 py-0.5 text-xs font-semibold text-amber-900">{form.label}</span>
            <span className="font-bold">{form.title}</span>
            {form.text && <p className="mt-0.5 text-slate-600">{form.text}</p>}
          </div>
        )}
      </div>
      {footer}
    </Panel>
  );
}

function WelcomeCard({ value }: { value: SiteSettings["welcome"] }) {
  const { form, set, footer } = useSettingForm("welcome", value);
  return (
    <Panel title="Welcome message" description="The Principal's welcome on the home page.">
      <div className="grid gap-5 md:grid-cols-[200px_1fr]">
        <ImageField label="Photo" aspect="portrait" folder="settings" value={form.photoUrl} onChange={(url) => set({ photoUrl: url ?? "" })} />
        <div className="grid content-start gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Small heading">
              <Input value={form.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} />
            </Field>
            <Field label="Title">
              <Input value={form.title} onChange={(e) => set({ title: e.target.value })} />
            </Field>
            <Field label="Name">
              <Input value={form.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label="Role">
              <Input value={form.role} onChange={(e) => set({ role: e.target.value })} />
            </Field>
          </div>
          <Field label="Message">
            <Textarea rows={6} value={form.message} onChange={(e) => set({ message: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Button label">
              <Input value={form.linkLabel} onChange={(e) => set({ linkLabel: e.target.value })} />
            </Field>
            <LinkField label="Button link" value={form.linkUrl} onChange={(linkUrl) => set({ linkUrl })} />
          </div>
        </div>
      </div>
      {footer}
    </Panel>
  );
}

function QuickLinksCard({ value }: { value: SiteSettings["quickLinks"] }) {
  const { form, set, footer } = useSettingForm("quickLinks", value);
  return (
    <Panel title="Quick links" description="The row of buttons under the home page slider.">
      <ItemList
        items={form.items}
        onChange={(items) => set({ items })}
        newItem={() => ({ label: "", url: "", icon: "portal" as const, highlight: false })}
        addLabel="Add link"
        render={(item, update) => (
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_140px_auto] sm:items-center">
            <Input value={item.label} onChange={(e) => update({ label: e.target.value })} placeholder="Label" />
            <Input value={item.url} onChange={(e) => update({ url: e.target.value.trim() })} placeholder="/admissions or https://…" />
            <select value={item.icon} onChange={(e) => update({ icon: e.target.value as (typeof QUICK_LINK_ICONS)[number] })} className="h-9 rounded-md border border-input bg-white px-2 text-sm capitalize">
              {QUICK_LINK_ICONS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
              <input type="checkbox" checked={item.highlight} onChange={(e) => update({ highlight: e.target.checked })} /> Highlight
            </label>
          </div>
        )}
      />
      {footer}
    </Panel>
  );
}

function StatsCard({ value }: { value: SiteSettings["stats"] }) {
  const { form, set, footer } = useSettingForm("stats", value);
  return (
    <Panel title="At a glance figures" description="Animated numbers on the navy band.">
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Heading">
            <Input value={form.title} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <Field label="Introduction">
            <Input value={form.intro} onChange={(e) => set({ intro: e.target.value })} />
          </Field>
        </div>
        <ItemList
          items={form.items}
          onChange={(items) => set({ items })}
          newItem={() => ({ value: 0, suffix: "", label: "", note: "" })}
          addLabel="Add figure"
          render={(item, update) => (
            <div className="grid gap-2 sm:grid-cols-[110px_70px_1fr_1fr]">
              <Input type="number" min={0} value={item.value} onChange={(e) => update({ value: Math.max(0, Math.round(Number(e.target.value) || 0)) })} aria-label="Number" />
              <Input value={item.suffix} onChange={(e) => update({ suffix: e.target.value })} placeholder="+" aria-label="Suffix" />
              <Input value={item.label} onChange={(e) => update({ label: e.target.value })} placeholder="Label" />
              <Input value={item.note} onChange={(e) => update({ note: e.target.value })} placeholder="Note" />
            </div>
          )}
        />
      </div>
      {footer}
    </Panel>
  );
}

function CtaCard({ value }: { value: SiteSettings["cta"] }) {
  const { form, set, footer } = useSettingForm("cta", value);
  return (
    <Panel title="Admissions call to action" description="The green band near the bottom of the home page.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <Input value={form.title} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <Field label="Highlighted line">
          <Input value={form.highlight} onChange={(e) => set({ highlight: e.target.value })} />
        </Field>
        <Field label="Text" className="sm:col-span-2">
          <Textarea rows={2} value={form.text} onChange={(e) => set({ text: e.target.value })} />
        </Field>
        <Field label="Main button label">
          <Input value={form.primaryLabel} onChange={(e) => set({ primaryLabel: e.target.value })} />
        </Field>
        <LinkField label="Main button link" value={form.primaryUrl} onChange={(primaryUrl) => set({ primaryUrl })} />
        <Field label="Second button label">
          <Input value={form.secondaryLabel} onChange={(e) => set({ secondaryLabel: e.target.value })} />
        </Field>
        <LinkField label="Second button link" value={form.secondaryUrl} onChange={(secondaryUrl) => set({ secondaryUrl })} />
      </div>
      {footer}
    </Panel>
  );
}

function SectionsCard({ value }: { value: SiteSettings["sections"] }) {
  const { form, set, footer } = useSettingForm("sections", value);
  return (
    <Panel title="Section landing pages" description="Introductions and banner images for /about, /academics, /admissions, /student-life and /alumni. Leave blank to use the defaults.">
      <div className="grid gap-6">
        {SECTIONS.map((s) => (
          <div key={s.key} className="grid gap-4 border-b border-border pb-6 last:border-0 last:pb-0 md:grid-cols-[220px_1fr]">
            <ImageField label={s.label} folder="settings" value={form[s.key].imageUrl} onChange={(url) => set({ [s.key]: { ...form[s.key], imageUrl: url ?? "" } })} />
            <Field label="Introduction" hint={`Default: ${s.intro}`}>
              <Textarea rows={4} value={form[s.key].intro} onChange={(e) => set({ [s.key]: { ...form[s.key], intro: e.target.value } })} />
            </Field>
          </div>
        ))}
      </div>
      {footer}
    </Panel>
  );
}
