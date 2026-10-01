import {
  BookOpen,
  Boxes,
  Briefcase,
  Building,
  Building2,
  GraduationCap,
  Home,
  Landmark,
  LayoutGrid,
  Library,
  School,
} from "lucide-react";
import type { LucideIcon, LucideProps } from "lucide-react";
import { createElement } from "react";

// Category icon names (see src/lib/directory.ts) → Lucide component.
const UNIT_CATEGORY_ICONS: Record<string, LucideIcon> = {
  building: Building,
  "graduation-cap": GraduationCap,
  "building-2": Building2,
  landmark: Landmark,
  school: School,
  home: Home,
  library: Library,
  "book-open": BookOpen,
  briefcase: Briefcase,
  "layout-grid": LayoutGrid,
  boxes: Boxes,
};

/** Renders a unit category's Studio-chosen icon, falling back to a building. */
export function UnitCategoryIcon({ name, ...props }: { name?: string } & LucideProps) {
  return createElement((name && UNIT_CATEGORY_ICONS[name]) || Building2, props);
}
