import { createFileRoute } from "@tanstack/react-router";
import { getContactsData } from "#/server/directory-fns";
import { ContactsPage } from "#/components/directory/contacts/ContactsPage";

export const Route = createFileRoute("/_site/directory/contacts")({
  loader: () => getContactsData(),
  head: () => ({
    meta: [
      { title: "College Contacts | Akatsi College of Education" },
      {
        name: "description",
        content:
          "Find contact information for departments, offices and units across Akatsi College of Education.",
      },
    ],
  }),
  component: ContactsRoute,
});

function ContactsRoute() {
  return <ContactsPage groups={Route.useLoaderData()} />;
}
