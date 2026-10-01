// The Hono app instance, mounted at /api/* by routes/api/$.ts (which strips
// that prefix before calling .fetch() here).
import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors.js";
import { loggerMiddleware } from "./middleware/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRoute } from "./modules/auth/route.js";
import { usersRoute } from "./modules/users/route.js";
import { mediaRoute } from "./modules/media/route.js";
import { settingsRoute } from "./modules/settings/route.js";
import { pagesRoute } from "./modules/pages/route.js";
import { postsRoute } from "./modules/posts/route.js";
import { spotlightsRoute } from "./modules/spotlights/route.js";
import { departmentsRoute } from "./modules/departments/route.js";
import { peopleRoute } from "./modules/people/route.js";
import { documentsRoute } from "./modules/documents/route.js";
import { messagesRoute } from "./modules/messages/route.js";
import { activityRoute } from "./modules/activity/route.js";
import { dashboardRoute } from "./modules/dashboard/route.js";
import { publicRoute } from "./modules/public/route.js";
import { directoryRoute } from "./modules/directory/route.js";
import { staffProfilesRoute } from "./modules/staff-profiles/route.js";

const app = new Hono();

app.use("*", loggerMiddleware);
app.use("*", corsMiddleware);
app.onError(errorHandler);

app.get("/health", (c) => c.json({ ok: true }));

app.route("/auth", authRoute);
app.route("/users", usersRoute);
app.route("/media", mediaRoute);
app.route("/settings", settingsRoute);
app.route("/pages", pagesRoute);
app.route("/posts", postsRoute);
app.route("/spotlights", spotlightsRoute);
app.route("/departments", departmentsRoute);
app.route("/people", peopleRoute);
app.route("/documents", documentsRoute);
app.route("/messages", messagesRoute);
app.route("/activity", activityRoute);
app.route("/dashboard", dashboardRoute);
app.route("/public", publicRoute);
app.route("/directory", directoryRoute);
app.route("/staff-profiles", staffProfilesRoute);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export type AppType = typeof app;
export { app as apiApp };
