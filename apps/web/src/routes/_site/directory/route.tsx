import { Outlet, createFileRoute } from "@tanstack/react-router";
import { FavouritesWidget } from "#/components/directory/shared/FavouritesWidget";

// Every directory page gets the floating Favourites button (it renders
// nothing until the visitor has starred someone).
export const Route = createFileRoute("/_site/directory")({
  component: DirectoryLayout,
});

function DirectoryLayout() {
  return (
    <div className="font-sans">
      <Outlet />
      <FavouritesWidget />
    </div>
  );
}
