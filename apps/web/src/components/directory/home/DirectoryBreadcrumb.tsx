import { Link } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";

export function DirectoryBreadcrumb({ current }: { current?: string } = {}) {
  return (
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
        {current ? (
          <>
            <Link to="/directory" className="text-gray-500 transition hover:text-gray-700">
              Directory
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
            <span className="font-medium text-gray-900">{current}</span>
          </>
        ) : (
          <span className="font-medium text-gray-900">Directory</span>
        )}
      </div>
    </div>
  );
}
