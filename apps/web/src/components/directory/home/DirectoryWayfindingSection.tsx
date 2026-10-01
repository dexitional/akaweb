import type { UnitCategory } from "#/lib/directory-types";
import { BrowseByTypeSection } from "./BrowseByTypeSection";
import { ExploreByExpertiseSection } from "./ExploreByExpertiseSection";

export function DirectoryWayfindingSection({
  categories,
  tags,
}: {
  categories: Array<UnitCategory>;
  tags: Array<string>;
}) {
  return (
    <section className="band-alt" aria-label="Browse the directory">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <BrowseByTypeSection categories={categories} />
        <ExploreByExpertiseSection tags={tags} />
      </div>
    </section>
  );
}
