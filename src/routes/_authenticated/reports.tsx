import { PageHeader } from "@/components/layout/page-header";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart3, Loader2, TrendingUp, Ticket, Wallet, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/use-agency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "التقارير · TICKETTY" },
      { name: "description", content: "تقارير الإيرادات والمصروفات وأداء الخطوط." },
      { property: "og:title", content: "التقارير · TICKETTY" },
      { property: "og:description", content: "تقارير الإيرادات والمصروفات وأداء الخطوط." },
    ],
  }),
  component: ReportsPage,
});

const RANGES = [
  { value: "7", label: "آخر 7 أيام" },
  { value: "30", label: "آخر 30 يوم" },
  { value: "90", label: "آخر 90 يوم" },
];

function ReportsPage() {
  const [days, setDays] = useState("30");
  const { data: agency } = useAgency();
  const currency = agency?.currency ?? "SDG";

  const { data, isLoading } = useQuery({
    queryKey: ["reports", days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - Number(days));
      const sinceIso = since.toISOString();

      const [bookingsRes, expensesRes, routesRes, tripsRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("amount, status, created_at, trip_id")
          .gte("created_at", sinceIso),
        supabase.from("expenses").select("amount, category, spent_at").gte("spent_at", sinceIso.slice(0, 10)),
        supabase.from("routes").select("id, origin, destination"),
        supabase.from("trips").select("id, route_id, departure_at").gte("departure_at", sinceIso),
      ]);

      const bookings = (bookingsRes.data ?? []).filter((b) => b.status !== "cancelled");
      const expenses = expensesRes.data ?? [];
      const routes = routesRes.data ?? [];
      const trips = tripsRes.data ?? [];

      const revenue = bookings.reduce((s, b) => s + Number(b.amount), 0);
      const spend = expenses.reduce((s, e) => s + Number(e.amount), 0);

      // daily series
      const buckets = new Map<string, { revenue: number; count: number }>();
      for (let i = Number(days) - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        buckets.set(d.toISOString().slice(0, 10), { revenue: 0, count: 0 });
      }
      for (const b of bookings) {
        const key = String(b.created_at).slice(0, 10);
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.revenue += Number(b.amount);
          bucket.count += 1;
        }
      }
      const series = [...buckets.entries()].map(([day, v]) => ({ day, ...v }));

      // per route
      const tripRoute = new Map(trips.map((t) => [t.id, t.route_id]));
      const routeName = new Map(routes.map((r) => [r.id, `${r.origin} → ${r.destination}`]));
      const perRoute = new Map<string, { revenue: number; count: number }>();
      for (const b of bookings) {
        const rid = b.trip_id ? tripRoute.get(b.trip_id) : undefined;
        const name = (rid && routeName.get(rid)) || "غير محدد";
        const cur = perRoute.get(name) ?? { revenue: 0, count: 0 };
        cur.revenue += Number(b.amount);
        cur.count += 1;
        perRoute.set(name, cur);
      }
      const topRoutes = [...perRoute.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6);

      // expenses per category
      const perCat = new Map<string, number>();
      for (const e of expenses) {
        perCat.set(e.category, (perCat.get(e.category) ?? 0) + Number(e.amount));
      }
      const categories = [...perCat.entries()]
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);

      return {
        revenue,
        spend,
        net: revenue - spend,
        ticketCount: bookings.length,
        series,
        topRoutes,
        categories,
      };
    },
  });

  const fmt = (n: number) => `${Math.round(n).toLocaleString("en-US")} ${currency}`;

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="الإدارة" title="التقارير" icon={BarChart3} />
        <div className="flex items-center justify-center rounded-2xl border border-border bg-card py-24 shadow-card">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(1, ...data.series.map((s) => s.revenue));
  const maxRoute = Math.max(1, ...data.topRoutes.map((r) => r.revenue));
  const maxCat = Math.max(1, ...data.categories.map((c) => c.amount));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="الإدارة"
        title="التقارير"
        subtitle="أداء الإيرادات والمصروفات والخطوط خلال الفترة المحددة."
        icon={BarChart3}
        actions={
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="h-10 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={TrendingUp} label="الإيرادات" value={fmt(data.revenue)} tone="primary" />
        <StatCard icon={Wallet} label="المصروفات" value={fmt(data.spend)} tone="warning" />
        <StatCard
          icon={Scale}
          label="صافي الربح"
          value={fmt(data.net)}
          tone={data.net >= 0 ? "success" : "destructive"}
        />
        <StatCard
          icon={Ticket}
          label="التذاكر المباعة"
          value={data.ticketCount.toLocaleString("en-US")}
          tone="accent"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-sm font-extrabold text-foreground">
          الإيرادات اليومية
        </h2>
        <div className="mt-5 flex h-48 items-end gap-1">
          {data.series.map((s) => (
            <div key={s.day} className="group relative flex-1">
              <div
                className="w-full rounded-t-md bg-gradient-primary transition group-hover:opacity-80"
                style={{ height: `${(s.revenue / maxRevenue) * 170}px`, minHeight: "3px" }}
              />
              <div className="pointer-events-none absolute bottom-full start-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2 py-1 text-[10px] font-semibold text-background group-hover:block">
                {s.day.slice(5)} · {fmt(s.revenue)}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {data.series[0]?.day} — {data.series[data.series.length - 1]?.day}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-sm font-extrabold text-foreground">أفضل الخطوط</h2>
          <ul className="mt-4 space-y-3">
            {data.topRoutes.length === 0 && (
              <li className="py-6 text-center text-xs text-muted-foreground">لا توجد بيانات بعد</li>
            )}
            {data.topRoutes.map((r) => (
              <li key={r.name}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{r.name}</span>
                  <span className="tabular text-muted-foreground">
                    {fmt(r.revenue)} · {r.count} تذكرة
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-primary"
                    style={{ width: `${(r.revenue / maxRoute) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-sm font-extrabold text-foreground">
            توزيع المصروفات
          </h2>
          <ul className="mt-4 space-y-3">
            {data.categories.length === 0 && (
              <li className="py-6 text-center text-xs text-muted-foreground">
                لا توجد مصروفات مسجّلة
              </li>
            )}
            {data.categories.map((c) => (
              <li key={c.name}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{c.name}</span>
                  <span className="tabular text-muted-foreground">{fmt(c.amount)}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${(c.amount / maxCat) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  tone: "primary" | "accent" | "success" | "warning" | "destructive";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/15 text-accent",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
          <p className="tabular font-display text-lg font-extrabold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}
