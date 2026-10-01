import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2, LockKeyhole } from "lucide-react";
import { api, ApiError } from "#/lib/api-client";
import { asset } from "#/lib/asset";
import { getAdminSession } from "#/server/session";
import { homePathFor } from "#/lib/permissions";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Button } from "#/components/ui/button.tsx";

export const Route = createFileRoute("/admin/login")({
  beforeLoad: async () => {
    const admin = await getAdminSession();
    if (admin) throw redirect({ href: homePathFor(admin.role) });
  },
  head: () => ({ meta: [{ title: "Sign in | Akatsi CMS" }, { name: "robots", content: "noindex" }] }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type Values = z.infer<typeof schema>;

function LoginPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const login = useMutation({
    mutationFn: (values: Values) => api.post("/auth/login", values),
    onSuccess: () => navigate({ to: "/admin" }),
    onError: (err) =>
      setError("root", { message: err instanceof ApiError ? err.message : "Something went wrong. Please try again." }),
  });

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-primary text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="dot-grid absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="absolute -bottom-40 -left-40 size-[520px] rounded-full bg-brand-green/30 blur-3xl" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <img src={asset("logo-sm.webp")} alt="" className="h-14 w-auto" />
          <div>
            <p className="font-extrabold">Akatsi College of Education</p>
            <p className="text-xs font-bold tracking-[0.16em] text-brand-sky uppercase">Content Management</p>
          </div>
        </div>
        <div className="relative">
          <img src={asset("logo.webp")} alt="" className="mb-10 h-64 w-auto drop-shadow-2xl" />
          <p className="max-w-md text-3xl leading-tight font-extrabold">Keep the college's story current — pages, news, events and downloads in one place.</p>
          <p className="mt-4 text-sm text-white/60">Head · Heart · Hands</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <img src={asset("logo-sm.webp")} alt="" className="mb-6 h-16 w-auto lg:hidden" />
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LockKeyhole className="size-6" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-primary">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Use your CMS account to manage the website.</p>

          <form onSubmit={handleSubmit((v) => login.mutate(v))} className="mt-8 flex flex-col gap-5" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="username" className="h-11" {...register("email")} aria-invalid={Boolean(errors.email)} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" className="h-11" {...register("password")} aria-invalid={Boolean(errors.password)} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            {errors.root && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{errors.root.message}</p>}
            <Button type="submit" size="lg" className="h-11" disabled={login.isPending}>
              {login.isPending && <Loader2 className="animate-spin" />}
              {login.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-xs text-muted-foreground">Forgotten your password? Ask a super admin to reset it from Users.</p>
          <Link to="/" className="mt-10 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to the website
          </Link>
        </div>
      </div>
    </div>
  );
}
