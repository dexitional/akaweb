import { getRouteApi } from "@tanstack/react-router";

const siteRoute = getRouteApi("/_site");

// Settings, navigation and the notice — loaded once by the /_site layout.
export function useSiteLayout() {
  return siteRoute.useLoaderData();
}
