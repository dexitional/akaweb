import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  ClipboardList,
  FileText,
  Megaphone,
  MessageSquareText,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import { getMobileAppData } from "#/server/public";
import { asset } from "#/lib/asset";
import { StoreButton } from "#/components/site/store-buttons";

export const Route = createFileRoute("/_site/mobile/")({
  loader: () => getMobileAppData(),
  head: ({ loaderData }) => {
    const title = `${loaderData?.app.name ?? "Akatsico"} Mobile App | Akatsi College of Education`;
    const description = loaderData?.app.tagline ?? "";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: MobileAppPage,
});

const FEATURES = [
  { icon: BarChart3, title: "Results & GPA", text: "Semester grades, GPA and CGPA, with a trend of your progress." },
  { icon: ClipboardList, title: "Course registration", text: "Register for the semester from your phone and see your slip." },
  { icon: Wallet, title: "Fees", text: "Your full statement of bills and payments, and your balance." },
  { icon: Megaphone, title: "Circulars", text: "Official notices addressed to you: all students, freshers, final years…" },
  { icon: Bell, title: "Notifications", text: "Instant alerts for circulars, announcements, news and events." },
  { icon: MessageSquareText, title: "Course evaluations", text: "Rate your courses and lecturers quickly and anonymously." },
  { icon: FileText, title: "Service requests", text: "Track transcript and document requests and add delivery details." },
  { icon: Smartphone, title: "Campus news", text: "Stories, announcements and events from the college website." },
];

const formatSize = (bytes: number | null) => (bytes ? `${(bytes / 1024 / 1024).toFixed(0)} MB` : null);
const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;

function MobileAppPage() {
  const { app, apk, contact } = Route.useLoaderData();
  const apkMeta = [app.apkVersion && `Version ${app.apkVersion}`, formatSize(apk?.sizeBytes ?? null), apk?.updatedAt && `Updated ${formatDate(apk.updatedAt)}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-primary text-white">
        <div className="dot-grid absolute inset-0 -z-10 opacity-70" aria-hidden="true" />
        <div className="absolute -top-32 -right-24 -z-10 size-[520px] rounded-full bg-brand-sky/20 blur-3xl" aria-hidden="true" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div>
            <nav aria-label="Breadcrumb" className="text-sm text-white/70">
              <Link to="/" className="hover:text-white">Home</Link> <span aria-hidden="true">/</span> Mobile app
            </nav>
            <p className="mt-6 text-xs font-bold tracking-[0.18em] text-brand-sky uppercase">Student mobile app</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-6xl">{app.name}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">{app.tagline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <StoreButton store="play" href={app.playStoreUrl || null} />
              <StoreButton store="apple" href={app.appStoreUrl || null} />
            </div>
            {apk ? (
              <p className="mt-5 text-sm text-white/75">
                No Google Play?{" "}
                <a href={apk.url} download className="font-semibold text-white underline decoration-brand-green underline-offset-4 hover:decoration-white">
                  Download the APK directly
                </a>
                {apkMeta ? <span className="text-white/60"> ({apkMeta})</span> : null}
              </p>
            ) : null}
            <p className="mt-6 flex items-center gap-2 text-sm text-white/65">
              <ShieldCheck className="size-4 text-brand-green" aria-hidden="true" />
              Sign in with your student portal username and password.
            </p>
          </div>
          <div className="relative mx-auto flex h-[460px] w-full max-w-md items-center justify-center md:h-[560px]" aria-hidden="true">
            {[
              { src: "apps/screens/03-results.webp", cls: "-translate-x-[62%] rotate-[-8deg] scale-[.82] opacity-90" },
              { src: "apps/screens/06-circulars.webp", cls: "translate-x-[62%] rotate-[8deg] scale-[.82] opacity-90" },
              { src: "apps/screens/01-home.webp", cls: "z-10" },
            ].map((p) => (
              <div key={p.src} className={`absolute w-[52%] max-w-[250px] rounded-[2.2rem] bg-slate-950 p-2 shadow-2xl shadow-black/40 ring-1 ring-white/10 ${p.cls}`}>
                <img src={asset(p.src)} alt="" loading="lazy" className="w-full rounded-[1.8rem]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download options */}
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
        <h2 className="text-2xl font-extrabold tracking-tight text-primary md:text-3xl">Download options</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <OptionCard
            title="Android: Google Play"
            text="The recommended way to install on Android. Updates arrive automatically."
            action={<StoreButton store="play" href={app.playStoreUrl || null} className={app.playStoreUrl ? "" : "bg-slate-200 text-slate-500 ring-slate-300"} />}
          />
          <OptionCard
            title="iPhone & iPad: App Store"
            text="Requires iOS on iPhone or iPad. Updates arrive automatically."
            action={<StoreButton store="apple" href={app.appStoreUrl || null} className={app.appStoreUrl ? "" : "bg-slate-200 text-slate-500 ring-slate-300"} />}
          />
          <OptionCard
            title="Android: direct download"
            text={apk ? `For phones without Google Play. ${apkMeta}` : "A direct download will be available here soon."}
            action={<StoreButton store="apk" href={apk?.url ?? null} download className={apk ? "bg-brand-green" : "bg-slate-200 text-slate-500 ring-slate-300"} />}
          />
        </div>

        {apk ? (
          <div className="mt-8 rounded-3xl bg-secondary p-6 md:p-8">
            <h3 className="text-lg font-bold text-slate-900">Installing the APK</h3>
            <ol className="mt-4 grid gap-4 text-sm text-slate-700 md:grid-cols-4">
              {[
                "Download the APK on your Android phone using the button above.",
                "Open the downloaded file. If asked, allow your browser or Files app to install unknown apps.",
                "Tap Install, then open Akatsico.",
                "Sign in with your student portal username and password, and allow notifications.",
              ].map((t, i) => (
                <li key={t} className="flex gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-xs text-muted-foreground">
              Only install the app from this page, Google Play or the App Store. Direct downloads don&apos;t update automatically, so check back for new versions.
            </p>
          </div>
        ) : null}
      </section>

      {/* Features */}
      <section className="bg-secondary/60">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
          <h2 className="text-2xl font-extrabold tracking-tight text-primary md:text-3xl">Everything in one app</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <f.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-bold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Legal + support */}
      <section className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-sm text-slate-600 md:flex-row md:items-center md:justify-between md:px-8">
        <p>
          By using the app you agree to the{" "}
          <Link to="/mobile/terms" className="font-semibold text-primary hover:underline">Terms &amp; Conditions</Link> and{" "}
          <Link to="/mobile/privacy" className="font-semibold text-primary hover:underline">Privacy Policy</Link>.
        </p>
        {contact.email ? (
          <p>
            Need help? <a href={`mailto:${contact.email}`} className="font-semibold text-primary hover:underline">{contact.email}</a>
          </p>
        ) : null}
      </section>
    </>
  );
}

function OptionCard({ title, text, action }: { title: string; text: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border">
      <div>
        <h3 className="font-bold text-slate-900">{title}</h3>
        <p className="mt-1.5 text-sm text-slate-600">{text}</p>
      </div>
      <div>{action}</div>
    </div>
  );
}
