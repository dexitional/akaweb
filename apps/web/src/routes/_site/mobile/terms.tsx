import { Link, createFileRoute } from "@tanstack/react-router";
import { getMobileAppData } from "#/server/public";
import { PageHero } from "#/components/site/page-hero";
import { LegalDocument } from "#/components/site/legal-document";

// Terms & Conditions for the student mobile apps (Android & iOS).
export const Route = createFileRoute("/_site/mobile/terms")({
  loader: () => getMobileAppData(),
  head: () => ({
    meta: [
      { title: "Mobile App Terms & Conditions | Akatsi College of Education" },
      { name: "description", content: "The terms for using the Akatsico student app." },
    ],
  }),
  component: TermsPage,
});

const UPDATED = "5 October 2026";

function TermsPage() {
  const { app, collegeName, contact } = Route.useLoaderData();
  const name = app.name;
  return (
    <>
      <PageHero
        eyebrow="Mobile app"
        title="Terms & Conditions"
        summary={`The terms for using the ${name} app.`}
        crumbs={[{ label: "Mobile app", href: "/mobile" }, { label: "Terms & Conditions" }]}
        compact
      />
      <LegalDocument
        updated={UPDATED}
        intro={
          <p>
            These terms govern your use of the {name} mobile app (“the app”) provided by <strong>{collegeName}</strong>{" "}
            (“the College”, “we”, “us”). By installing or using the app you agree to them. If you do not agree, please do
            not use the app.
          </p>
        }
        sections={[
          {
            id: "eligibility",
            title: "Who may use the app",
            body: (
              <p>
                The app is for registered students of the College. You must sign in with the student portal account issued
                to you by the College. Use of the app is also subject to the College’s rules, regulations and student
                handbook.
              </p>
            ),
          },
          {
            id: "account",
            title: "Your account",
            body: (
              <ul>
                <li>Keep your password private, and do not let anyone else use your account or device session.</li>
                <li>You are responsible for actions taken through your account, including course registrations and evaluations.</li>
                <li>
                  Tell the College Registry promptly if you think your account has been misused, and change your password in
                  the app or the student portal.
                </li>
              </ul>
            ),
          },
          {
            id: "use",
            title: "Acceptable use",
            body: (
              <>
                <p>You agree not to:</p>
                <ul>
                  <li>access or try to access another person’s account or information;</li>
                  <li>interfere with, disrupt, overload or attempt to break the security of the app or the College’s systems;</li>
                  <li>copy, modify, reverse engineer or redistribute the app, except as allowed by law;</li>
                  <li>submit false, misleading or abusive information, including in course evaluations.</li>
                </ul>
                <p>Misuse may lead to suspension of access and action under the College’s disciplinary procedures.</p>
              </>
            ),
          },
          {
            id: "records",
            title: "Academic and financial records",
            body: (
              <p>
                The app shows information from the College’s official systems for your convenience. If anything in the app
                differs from the College’s official records, the official records prevail. Results, fee balances and
                registration status shown in the app are not official transcripts or receipts; contact the relevant College
                office for official documents.
              </p>
            ),
          },
          {
            id: "registration",
            title: "Registrations and submissions",
            body: (
              <p>
                Course registrations, evaluations, profile updates and service request details submitted through the app are
                treated the same as those made on the student portal. You are responsible for checking that your registration
                is complete and correct before the published deadlines. Late-registration rules and fines set by the College
                still apply.
              </p>
            ),
          },
          {
            id: "notifications",
            title: "Notifications",
            body: (
              <p>
                The College may send you circulars, announcements, news and event notifications through the app. You can
                choose which types you receive. Notifications are a convenience; official notices remain valid even if a
                notification is not delivered, so check the app or the College’s notice channels regularly.
              </p>
            ),
          },
          {
            id: "availability",
            title: "Availability and changes",
            body: (
              <p>
                We aim to keep the app available, but it may be interrupted for maintenance, updates or reasons beyond our
                control. We may change, suspend or discontinue features at any time. Keep the app updated to the latest
                version, and install it only from Google Play, the App Store or the College website at{" "}
                <Link to="/mobile">/mobile</Link>.
              </p>
            ),
          },
          {
            id: "ip",
            title: "Intellectual property",
            body: (
              <p>
                The app, the College name, crest and other content belong to the College or its licensors. You may use the
                app only for your personal studies at the College.
              </p>
            ),
          },
          {
            id: "liability",
            title: "Disclaimer and liability",
            body: (
              <p>
                The app is provided “as is”. To the extent permitted by law, the College is not liable for any loss arising
                from your use of, or inability to use, the app, including delays or errors in information shown or
                notifications sent. Nothing in these terms limits any rights you have under the laws of Ghana that cannot be
                limited.
              </p>
            ),
          },
          {
            id: "privacy",
            title: "Privacy",
            body: (
              <p>
                How the app uses your information is explained in the <Link to="/mobile/privacy">Privacy Policy</Link>.
              </p>
            ),
          },
          {
            id: "law",
            title: "Governing law",
            body: <p>These terms are governed by the laws of the Republic of Ghana.</p>,
          },
          {
            id: "changes",
            title: "Changes to these terms",
            body: (
              <p>
                We may update these terms from time to time. The latest version is always on this page. Continuing to use
                the app after an update means you accept the updated terms.
              </p>
            ),
          },
          {
            id: "contact",
            title: "Contact",
            body: (
              <p>
                Questions about these terms:{" "}
                {contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : "the College Registry"}
                {contact.phone ? <> · {contact.phone}</> : null}.
              </p>
            ),
          },
        ]}
      />
    </>
  );
}
