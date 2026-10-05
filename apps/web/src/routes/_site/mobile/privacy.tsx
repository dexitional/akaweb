import { Link, createFileRoute } from "@tanstack/react-router";
import { getMobileAppData } from "#/server/public";
import { PageHero } from "#/components/site/page-hero";
import { LegalDocument } from "#/components/site/legal-document";

// Privacy policy for the student mobile apps (Android & iOS). This URL is the
// one given to Google Play and the App Store.
export const Route = createFileRoute("/_site/mobile/privacy")({
  loader: () => getMobileAppData(),
  head: () => ({
    meta: [
      { title: "Mobile App Privacy Policy | Akatsi College of Education" },
      { name: "description", content: "How the Akatsico student app uses and protects your information." },
    ],
  }),
  component: PrivacyPage,
});

const UPDATED = "5 October 2026";

function PrivacyPage() {
  const { app, collegeName, contact } = Route.useLoaderData();
  const name = app.name;
  const mail = contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : "the College Registry";
  return (
    <>
      <PageHero
        eyebrow="Mobile app"
        title="Privacy Policy"
        summary={`How the ${name} app for students of ${collegeName} uses and protects your information.`}
        crumbs={[{ label: "Mobile app", href: "/mobile" }, { label: "Privacy Policy" }]}
        compact
      />
      <LegalDocument
        updated={UPDATED}
        intro={
          <p>
            {name} (“the app”) is the student mobile app of <strong>{collegeName}</strong> (“the College”, “we”, “us”),
            available for Android and iOS. This policy explains what information the app uses, why, and the choices you
            have. It applies only to the app; the College website is covered by its own notices.
          </p>
        }
        sections={[
          {
            id: "who",
            title: "Who the app is for",
            body: (
              <p>
                The app is for registered students of the College. Accounts are issued by the College Registry; there is
                no public sign-up. The app is not intended for children.
              </p>
            ),
          },
          {
            id: "information",
            title: "Information the app uses",
            body: (
              <>
                <ul>
                  <li>
                    <strong>Sign-in details.</strong> Your student portal username and password are sent securely to the
                    College’s student information system only to sign you in. The app keeps a session token on your device
                    (in the iOS Keychain or Android Keystore) and does not store your password.
                  </li>
                  <li>
                    <strong>Your student record.</strong> The app displays information the College already holds about you,
                    such as your name, student ID, index number, programme, level, contact details, results, fees statement,
                    course registration and service requests.
                  </li>
                  <li>
                    <strong>Information you enter.</strong> When you update your phone number, email, address, hometown or
                    Ghana Card number, submit a course registration or course evaluation, or add delivery details to a
                    document request, that information is sent to the College’s student information system.
                  </li>
                  <li>
                    <strong>Notifications.</strong> If you allow notifications, the app sends the College a push-notification
                    token for your device, together with your student ID, the student groups you belong to (for example “final
                    year”), the types of notification you chose, your device platform and the app version.
                  </li>
                </ul>
                <p>The app does not access your location, contacts, photos, camera, microphone or files.</p>
              </>
            ),
          },
          {
            id: "use",
            title: "How we use it",
            body: (
              <ul>
                <li>To sign you in and show your academic, financial and registration information.</li>
                <li>To process the registrations, evaluations, profile updates and requests you submit.</li>
                <li>To send you circulars, announcements, news and event notifications you have chosen to receive.</li>
                <li>To keep the service secure and working, for example by expiring old sessions.</li>
              </ul>
            ),
          },
          {
            id: "not",
            title: "What we don’t do",
            body: (
              <ul>
                <li>We do not show advertising in the app.</li>
                <li>We do not track you across other apps or websites.</li>
                <li>We do not sell or rent your information.</li>
                <li>The app contains no third-party analytics or advertising tools.</li>
              </ul>
            ),
          },
          {
            id: "sharing",
            title: "Service providers",
            body: (
              <p>
                Notifications are delivered through Expo’s push notification service, Google Firebase Cloud Messaging
                (Android) and Apple Push Notification service (iOS). These providers receive only what is needed to deliver
                a notification to your device. We do not otherwise share your information with third parties, except where
                required by law.
              </p>
            ),
          },
          {
            id: "security",
            title: "Security and retention",
            body: (
              <>
                <p>
                  All communication between the app and the College’s servers uses encrypted HTTPS connections. Sessions
                  expire automatically, and signing out removes the session from your device.
                </p>
                <p>
                  Your student record is kept by the College in line with its academic record-keeping obligations. A device’s
                  notification registration is removed when the app is uninstalled or the token stops working.
                </p>
              </>
            ),
          },
          {
            id: "choices",
            title: "Your choices and rights",
            body: (
              <ul>
                <li>
                  Turn notification types on or off in the app under <em>Me → Notifications &amp; appearance</em>, or turn
                  notifications off in your phone’s settings.
                </li>
                <li>Signing out unlinks your device from your student account, so you stop receiving circulars on it.</li>
                <li>
                  You may ask to access or correct your personal information, or ask us to delete information that we are not
                  required to keep, by contacting {mail}. Academic records such as results must be retained by the College.
                </li>
              </ul>
            ),
          },
          {
            id: "changes",
            title: "Changes to this policy",
            body: <p>We may update this policy from time to time. The latest version is always on this page, with the date it was last updated.</p>,
          },
          {
            id: "contact",
            title: "Contact",
            body: (
              <p>
                {collegeName}
                {contact.address ? <>, {contact.address}</> : null}.<br />
                {contact.email ? <>Email: {mail}<br /></> : null}
                {contact.phone ? <>Phone: {contact.phone}</> : null}
                <br />
                See also the <Link to="/mobile/terms">Terms &amp; Conditions</Link>.
              </p>
            ),
          },
        ]}
      />
    </>
  );
}
