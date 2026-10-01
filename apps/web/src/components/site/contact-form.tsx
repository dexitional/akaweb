import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { api, ApiError } from "#/lib/api-client";
import { cn } from "#/lib/utils";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name"),
  email: z.string().trim().email("Please enter a valid email"),
  phone: z.string().trim().max(30).optional(),
  subject: z.string().trim().min(3, "Please add a subject").max(200),
  message: z.string().trim().min(10, "Please write a little more").max(5000),
  website: z.string().optional(),
});
type Values = z.infer<typeof schema>;

const field =
  "w-full rounded-xl border border-input bg-white px-4 py-3 text-[15px] outline-none transition-shadow placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10";

export function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: Values) => api.post("/messages/contact", values),
    onSuccess: () => reset(),
    onError: (err) =>
      setError("root", {
        message: err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      }),
  });

  if (mutation.isSuccess) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-12 text-center">
        <CheckCircle2 className="size-12 text-brand-green" aria-hidden="true" />
        <p className="mt-4 text-xl font-bold text-slate-900">
          Thank you — your message has been sent.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Our team will get back to you as soon as possible.
        </p>
        <button
          type="button"
          onClick={() => mutation.reset()}
          className="mt-5 text-sm font-semibold text-primary hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      className="grid gap-4 sm:grid-cols-2"
      noValidate
    >
      <Field label="Full name" error={errors.name?.message}>
        <input {...register("name")} autoComplete="name" className={field} />
      </Field>
      <Field label="Email address" error={errors.email?.message}>
        <input {...register("email")} type="email" autoComplete="email" className={field} />
      </Field>
      <Field label="Phone (optional)" error={errors.phone?.message}>
        <input {...register("phone")} type="tel" autoComplete="tel" className={field} />
      </Field>
      <Field label="Subject" error={errors.subject?.message}>
        <input {...register("subject")} className={field} />
      </Field>
      <Field label="Message" error={errors.message?.message} className="sm:col-span-2">
        <textarea {...register("message")} rows={6} className={cn(field, "resize-y")} />
      </Field>
      {/* Honeypot — hidden from people, filled by bots. */}
      <input
        {...register("website")}
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      {errors.root && (
        <p className="text-sm font-medium text-destructive sm:col-span-2">{errors.root.message}</p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          {mutation.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
          {mutation.isPending ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {error && <span className="text-xs font-medium text-destructive">{error}</span>}
    </label>
  );
}
