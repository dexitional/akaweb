import { Building2, Check, Info, Mail, UserPlus } from "lucide-react";

const individualChecklist = ["Full name & staff ID", "Department & designation", "Contact details"];
const departmentChecklist = [
  "Department name & initials",
  "Head of department (name, staff ID, designation)",
  "Staff list with names & staff IDs (if available)",
];

export function GetListedSection({ email, recipients }: { email: string; recipients: string }) {
  return (
    <section className="py-14">
      <div className="mx-auto max-w-6xl px-4">
        <div className="rounded-2xl bg-gray-50 p-8">
          <div className="mb-6 flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
              <Info className="h-5 w-5 text-amber-600" aria-hidden="true" />
            </span>
            <div>
              <p className="text-lg font-bold text-gray-900">Not appearing in the directory?</p>
              <p className="text-sm text-gray-500">Here&apos;s how to get listed</p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-white p-5">
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
                <UserPlus className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              </span>
              <p className="mb-2 font-bold text-gray-900">Individual Staff</p>
              <p className="text-sm text-gray-600">
                Send your <strong>appointment letter</strong> with your <strong>Staff ID</strong>{" "}
                clearly indicated. Include:
              </p>
              <ul className="mt-3 space-y-1.5">
                {individualChecklist.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-600"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-5">
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
                <Building2 className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              </span>
              <p className="mb-2 font-bold text-gray-900">Department / Unit</p>
              <p className="text-sm text-gray-600">To have a department or unit listed, provide:</p>
              <ul className="mt-3 space-y-1.5">
                {departmentChecklist.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-600"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-600">
              {recipients && <p>Your email goes to {recipients}.</p>}
              <p className="mt-1 text-xs text-gray-500">
                We typically respond within 2–3 business days.
              </p>
            </div>
            {email && (
              <a
                href={`mailto:${email}?subject=${encodeURIComponent("Directory Listing Request")}`}
                className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3 font-semibold whitespace-nowrap text-white transition-colors hover:bg-[var(--primary-dark)]"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Submit a Listing Request
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
