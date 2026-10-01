import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2, Users } from "lucide-react";
import type { DepartmentKind } from "@aka/db";
import { api } from "#/lib/api-client";
import { DEPARTMENT_KINDS } from "#/lib/content";
import { canManage } from "#/lib/permissions";
import {
  AdminPageHeader,
  ConfirmDialog,
  Segmented,
  StatusPill,
  TableMessage,
  errorToast,
} from "#/components/admin/ui";
import { Button } from "#/components/ui/button.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table.tsx";

export const Route = createFileRoute("/admin/_admin/departments/")({
  component: DepartmentsList,
});

interface Item {
  id: number;
  kind: DepartmentKind;
  slug: string;
  name: string;
  summary: string | null;
  image_url: string | null;
  head_name: string | null;
  head_title: string | null;
  is_published: 0 | 1;
  programme_count: number;
  people_count: number;
}

function DepartmentsList() {
  const { admin } = Route.useRouteContext();
  const canEdit = canManage(admin.role, "departments");
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<DepartmentKind>("department");
  const [deleting, setDeleting] = useState<Item | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get<{ departments: Array<Item> }>("/departments").then((r) => r.departments),
  });
  const all = data ?? [];
  const items = all.filter((d) => d.kind === kind);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["departments"] });

  const reorder = useMutation({
    mutationFn: (ids: Array<number>) => api.post("/departments/reorder", { ids }),
    onSuccess: invalidate,
    onError: errorToast("Couldn't reorder."),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/departments/${id}`),
    onSuccess: () => {
      toast.success("Deleted.");
      setDeleting(null);
      void invalidate();
    },
    onError: errorToast("Couldn't delete."),
  });

  const move = (index: number, delta: number) => {
    const ids = items.map((d) => d.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + delta, 0, id!);
    queryClient.setQueryData<Array<Item>>(["departments"], (old) => {
      const others = (old ?? []).filter((d) => d.kind !== kind);
      return [...others, ...ids.map((i) => items.find((d) => d.id === i)!)];
    });
    reorder.mutate(ids);
  };

  const meta = DEPARTMENT_KINDS[kind];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Departments & Units"
        description="Academic departments and the college's units. Each gets its own page, linked from the Academics section."
        actions={
          canEdit && (
            <Button asChild>
              <Link
                to="/admin/departments/$departmentId"
                params={{ departmentId: "new" }}
                search={{ kind }}
              >
                <Plus /> New {meta.label.toLowerCase()}
              </Link>
            </Button>
          )
        }
      />
      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          {
            value: "department",
            label: "Academic departments",
            count: all.filter((d) => d.kind === "department").length,
          },
          { value: "unit", label: "Units", count: all.filter((d) => d.kind === "unit").length },
        ]}
      />
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {canEdit && <TableHead className="w-20">Order</TableHead>}
              <TableHead>{meta.label}</TableHead>
              <TableHead>Head</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((d, i) => (
              <TableRow key={d.id}>
                {canEdit && (
                  <TableCell>
                    <div className="flex">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        aria-label="Move up"
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={i === items.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label="Move down"
                      >
                        <ArrowDown />
                      </Button>
                    </div>
                  </TableCell>
                )}
                <TableCell className="max-w-md">
                  <Link
                    to="/admin/departments/$departmentId"
                    params={{ departmentId: String(d.id) }}
                    className="flex items-center gap-3 hover:text-primary"
                  >
                    {d.image_url ? (
                      <img
                        src={d.image_url}
                        alt=""
                        className="size-10 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <span className="size-10 shrink-0 rounded-md bg-gradient-to-br from-primary to-brand-green" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{d.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {d.programme_count} programmes
                      </span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="text-sm">
                  {d.head_name ?? <span className="text-muted-foreground italic">Not set</span>}
                  {d.head_title && (
                    <span className="block text-xs text-muted-foreground">{d.head_title}</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="size-3.5" aria-hidden="true" /> {d.people_count}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusPill
                    status={d.is_published ? "published" : "hidden"}
                    label={d.is_published ? "Published" : "Hidden"}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="icon-sm" aria-label="View on site">
                      <a href={`${meta.path}/${d.slug}`} target="_blank" rel="noopener">
                        <ExternalLink />
                      </a>
                    </Button>
                    {canEdit && (
                      <>
                        <Button asChild variant="ghost" size="icon-sm" aria-label="Edit">
                          <Link
                            to="/admin/departments/$departmentId"
                            params={{ departmentId: String(d.id) }}
                          >
                            <Pencil />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive"
                          onClick={() => setDeleting(d)}
                          aria-label="Delete"
                        >
                          <Trash2 />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {isLoading && <TableMessage>Loading…</TableMessage>}
        {!isLoading && items.length === 0 && (
          <TableMessage>No {meta.plural.toLowerCase()} yet.</TableMessage>
        )}
      </div>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="Its page will be removed. People linked to it stay in the directory, without a department."
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}
