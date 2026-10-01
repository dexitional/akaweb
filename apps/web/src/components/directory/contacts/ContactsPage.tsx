import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { ComponentType, FormEvent } from "react";
import {
  BookOpen,
  Building2,
  ChevronRight,
  FileText,
  Globe,
  GraduationCap,
  Grid,
  Home,
  Landmark,
  Mail,
  Phone,
  School,
  Search,
} from "lucide-react";

import type { ContactCard, ContactGroup } from "#/lib/directory-types";
import { UNIT_CATEGORIES } from "#/lib/directory";

// Tab icon per unit category ("primary" = the college's main lines).
const CATEGORY_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  primary: Landmark,
  department: GraduationCap,
  unit: Building2,
  office: Building2,
  directorate: Landmark,
  section: FileText,
  centre: School,
  hall: Home,
  library: BookOpen,
};

function contactMatches(contact: ContactCard, query: string) {
  if (!query) return true;
  return [
    contact.name,
    contact.description,
    contact.email,
    contact.phone,
    contact.code,
    contact.website?.label,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

const tagColorClasses: Record<NonNullable<ContactCard["tag"]>["color"], string> = {
  primary: "bg-indigo-100 text-indigo-700",
  international: "bg-purple-100 text-purple-700",
  regional: "bg-amber-100 text-amber-700",
};

function ContactCardView({ contact }: { contact: ContactCard }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <div className="mb-2 flex items-start justify-between">
        {contact.href ? (
          <a
            href={contact.href}
            className="font-bold text-gray-900 hover:text-[var(--primary)] hover:underline"
          >
            {contact.name}
          </a>
        ) : (
          <span className="font-bold text-gray-900">{contact.name}</span>
        )}
        {contact.tag && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tagColorClasses[contact.tag.color]}`}
          >
            {contact.tag.label}
          </span>
        )}
      </div>

      {contact.description && <p className="mb-3 text-sm text-gray-500">{contact.description}</p>}

      <div className="space-y-1.5 text-sm text-gray-600">
        {contact.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <span className="text-gray-500">Email:</span>
            <a href={`mailto:${contact.email}`} className="text-[var(--primary)] hover:underline">
              {contact.email}
            </a>
          </div>
        )}

        {contact.website && (
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <span className="text-gray-500">Website:</span>
            <a
              href={contact.website.href}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-[var(--primary)] hover:underline"
            >
              {contact.website.label}
            </a>
          </div>
        )}

        {contact.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <span className="text-gray-500">Phone:</span>
            <a
              href={`tel:${(contact.phone.split(",")[0] ?? "").replace(/\s+/g, "")}`}
              className="hover:underline"
            >
              {contact.phone}
            </a>
          </div>
        )}
      </div>

      {contact.code && (
        <span className="mt-2 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {contact.code}
        </span>
      )}
    </div>
  );
}

export function ContactsPage({ groups }: { groups: ContactGroup[] }) {
  const navigate = useNavigate();
  const [searchScope, setSearchScope] = useState<"page" | "directory">("page");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const allContacts = useMemo(() => groups.flatMap((g) => g.contacts), [groups]);
  const categoryTabs = useMemo(
    () => [
      { key: "all", label: "All Contacts", count: allContacts.length, icon: Grid },
      ...groups.map((g) => ({
        key: g.key,
        label: g.key === "primary" ? "Primary" : g.heading,
        count: g.contacts.length,
        icon: CATEGORY_ICONS[g.key] ?? Building2,
      })),
    ],
    [groups, allContacts.length],
  );
  const departments = groups.find((g) => g.key === UNIT_CATEGORIES[0].value)?.contacts.length ?? 0;
  const withPhone = allContacts.filter((c) => c.phone).length;

  const visibleGroups = useMemo(
    () =>
      groups
        .filter((g) => activeCategory === "all" || g.key === activeCategory)
        .map((g) => ({ ...g, contacts: g.contacts.filter((c) => contactMatches(c, query)) }))
        .filter((g) => g.contacts.length > 0),
    [groups, activeCategory, query],
  );
  const shown = visibleGroups.reduce((sum, g) => sum + g.contacts.length, 0);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    if (searchScope === "directory" && q.trim()) {
      void navigate({ to: "/directory/search", search: { q: q.trim() } });
    }
  }

  return (
    <>
      <div className="border-b border-indigo-100/50 bg-indigo-50/60">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 text-sm md:px-8">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-gray-500 transition hover:text-gray-700"
          >
            <Home className="h-3.5 w-3.5" aria-hidden="true" />
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
          <Link to="/directory" className="text-gray-500 transition hover:text-gray-700">
            Directory
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
          <span className="font-medium text-gray-900">Contacts</span>
        </div>
      </div>

      <section className="bg-[var(--primary)] py-14 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            College Contact Directory
          </span>

          <h1 className="mb-4 text-4xl font-extrabold text-white md:text-5xl">Get In Touch</h1>

          <p className="mb-8 text-white/70">
            Find contact information for departments, offices, and units across the college. Your
            gateway to academic and administrative services.
          </p>

          <div className="mb-8 flex flex-wrap justify-center gap-4">
            <div className="min-w-[100px] rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-center">
              <div className="text-3xl font-extrabold text-white">{allContacts.length}</div>
              <div className="mt-1 text-xs text-white/60">Total Contacts</div>
            </div>
            <div className="min-w-[100px] rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-center">
              <div className="text-3xl font-extrabold text-white">{departments}</div>
              <div className="mt-1 text-xs text-white/60">Departments</div>
            </div>
            <div className="min-w-[100px] rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-center">
              <div className="text-3xl font-extrabold text-white">{withPhone}</div>
              <div className="mt-1 text-xs text-white/60">With Phone</div>
            </div>
          </div>

          <form
            onSubmit={onSearch}
            role="search"
            className="mx-auto mb-3 flex max-w-xl items-center gap-2 rounded-2xl bg-white p-2"
          >
            <Search className="ml-2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <label htmlFor="contact-search" className="sr-only">
              Search contacts
            </label>
            <input
              id="contact-search"
              type="search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search by name, email, phone, or department..."
              className="flex-1 py-1.5 text-sm text-gray-700 outline-none"
            />
          </form>

          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-white/60">Search in:</span>
            <button
              type="button"
              onClick={() => setSearchScope("page")}
              className={`rounded-full px-3 py-1 font-semibold ${
                searchScope === "page"
                  ? "bg-white text-[var(--primary)]"
                  : "border border-white/20 text-white/70"
              }`}
            >
              This Page
            </button>
            <button
              type="button"
              onClick={() => setSearchScope("directory")}
              className={`rounded-full px-3 py-1 font-semibold ${
                searchScope === "directory"
                  ? "bg-white text-[var(--primary)]"
                  : "border border-white/20 text-white/70"
              }`}
            >
              Directory
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-7xl flex-wrap gap-3 px-4 py-6">
        {categoryTabs.map(({ key, label, count, icon: Icon }) => {
          const isActive = activeCategory === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategory(key)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
                isActive
                  ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
              <span
                className={`rounded-full px-1.5 text-xs ${
                  isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mx-auto mb-4 max-w-7xl px-4 text-right text-sm text-gray-500">
        Showing {shown} {shown === 1 ? "contact" : "contacts"}
      </p>

      {visibleGroups.length === 0 && (
        <div className="mx-auto mb-12 max-w-7xl px-4">
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
            No contacts match “{q.trim()}”.{" "}
            <Link
              to="/directory/search"
              search={{ q: q.trim() }}
              className="font-semibold text-[var(--primary)] hover:underline"
            >
              Search the staff directory instead
            </Link>
          </div>
        </div>
      )}

      {visibleGroups.map((group) => (
        <div key={group.key} className="mx-auto mb-12 max-w-7xl px-4">
          <h2 className="mb-1 text-2xl font-bold text-gray-900">{group.heading}</h2>
          {group.subtext && <p className="mb-4 text-sm text-gray-500">{group.subtext}</p>}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {group.contacts.map((contact) => (
              <ContactCardView key={contact.name} contact={contact} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
