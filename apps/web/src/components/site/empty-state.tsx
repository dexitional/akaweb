import { Inbox } from "lucide-react";

export function EmptyState({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/50 px-6 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-white text-primary shadow-sm">
        <Inbox className="size-6" aria-hidden="true" />
      </div>
      <p className="mt-4 text-lg font-bold text-slate-900">{title}</p>
      {text && <p className="mt-1 max-w-md text-sm text-muted-foreground">{text}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
