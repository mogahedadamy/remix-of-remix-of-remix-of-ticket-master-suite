import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Ticket, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/ticketty-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — TICKETTY ERP" },
      { name: "description", content: "سجل الدخول أو أنشئ حساباً جديداً لوكالتك على منصة TICKETTY ERP." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [agencyName, setAgencyName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else setCheckingSession(false);
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, agency_name: agencyName },
          },
        });
        if (error) throw error;
        toast.success("تم إنشاء حسابك بنجاح");
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("مرحباً بعودتك");
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ ما";
      toast.error(
        message.includes("Invalid login") ? "بيانات الدخول غير صحيحة" :
        message.includes("already registered") ? "هذا البريد مسجل مسبقاً" :
        message
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-hero lg:flex lg:flex-col lg:justify-between lg:p-10 lg:text-primary-foreground">
        {/* decorative orbs & dot grid */}
        <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-30" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -top-24 -end-24 h-72 w-72 rounded-full opacity-40 blur-3xl"
          style={{ background: "var(--color-primary-glow)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -start-16 h-80 w-80 rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--color-brand-navy)" }}
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-primary opacity-40 blur-md" aria-hidden="true" />
            <img
              src={logo.url}
              alt="TICKETTY"
              className="relative h-12 w-12 rounded-2xl bg-white object-contain p-1 shadow-card"
            />
          </div>
          <div>
            <p className="font-display text-lg font-extrabold tracking-tight">TICKETTY</p>
            <p className="text-xs opacity-80">ERP لشركات النقل البري</p>
          </div>
        </div>

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            منصّة متكاملة
          </span>
          <h2 className="mt-4 font-display text-4xl font-extrabold leading-tight">
            أدر وكالتك بذكاء
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed opacity-90">
            من إصدار التذكرة إلى المنفستو الرقمي، من ورديات الكاشير إلى قيود المحاسبة
            المتزنة — كل شيء في مكان واحد وبالعربية.
          </p>

          <ul className="mt-6 space-y-2.5 text-sm">
            {[
              { icon: Ticket, text: "إصدار تذاكر وحجوزات في ثوانٍ" },
              { icon: ShieldCheck, text: "محاسبة متزنة وتقارير دقيقة" },
              { icon: Sparkles, text: "واجهة عربية أنيقة وسريعة" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="opacity-95">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs opacity-70">© {new Date().getFullYear()} TICKETTY</p>
      </aside>

      {/* Form panel */}
      <main className="relative flex items-center justify-center overflow-hidden bg-gradient-soft p-6">
        <div
          className="pointer-events-none absolute -top-20 -end-20 h-64 w-64 rounded-full opacity-20 blur-3xl lg:hidden"
          style={{ background: "var(--color-primary-glow)" }}
          aria-hidden="true"
        />
        <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-elevated lg:p-8">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-primary opacity-30 blur-md" aria-hidden="true" />
              <img src={logo.url} alt="TICKETTY" className="relative h-11 w-11 rounded-xl bg-white object-contain p-1 shadow-card" />
            </div>
            <div>
              <p className="font-display text-base font-extrabold text-primary">TICKETTY</p>
              <p className="text-xs text-muted-foreground">ERP لشركات النقل</p>
            </div>
          </div>

          <div className="mb-6 inline-flex rounded-xl border border-border bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                mode === "signin"
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                mode === "signup"
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              إنشاء حساب
            </button>
          </div>

          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            {mode === "signin" ? "الدخول للنظام" : "حساب جديد"}
          </p>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-foreground lg:text-3xl">
            {mode === "signin" ? "مرحباً بعودتك" : "أنشئ حساب وكالتك"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "signin"
              ? "أدخل بياناتك للوصول إلى لوحة التحكم."
              : "ابدأ في دقائق — سنجهّز وكالتك تلقائياً."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <Field label="الاسم الكامل" htmlFor="fullName">
                  <input
                    id="fullName"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: أحمد محمد"
                    className={inputClass}
                  />
                </Field>
                <Field label="اسم الوكالة" htmlFor="agencyName">
                  <input
                    id="agencyName"
                    required
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="مثال: وكالة الأمل للنقل"
                    className={inputClass}
                  />
                </Field>
              </>
            )}

            <Field label="البريد الإلكتروني" htmlFor="email">
              <input
                id="email"
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@agency.com"
                className={`${inputClass} text-start`}
              />
            </Field>

            <Field label="كلمة المرور" htmlFor="password">
              <input
                id="password"
                type="password"
                required
                minLength={6}
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${inputClass} text-start`}
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow transition hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "دخول" : "إنشاء الحساب"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="transition-colors hover:text-primary">← العودة للصفحة الرئيسية</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

const inputClass =
  "block w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition";

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
