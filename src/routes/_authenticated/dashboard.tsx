import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Ticket,
  CalendarClock,
  BusFront,
  Users,
  Wallet,
  Loader2,
  CheckCircle2,
  Clock,
  Wrench,
  Sparkles,
  ArrowUpRight,
  ScrollText,
  PlusCircle,
  Gauge,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

type BusStatus = "active" | "maintenance" | "inactive";

type DaySeries = { day: string; label: string; revenue: number; bookings: number };

type UpcomingTrip = {
  id: string;
  departure_at: string;
  route: string | null;
  capacity: number;
  booked: number;
};

type DashboardData = {
  profile: { full_name: string | null; agency_name: string | null; agency_currency: string };
  todayRevenue: number;
  todayBookings: number;
  yesterdayRevenue: number;
  yesterdayBookings: number;
  activeTrips: number;
  busCounts: Record<BusStatus, number>;
  avgOccupancy: number;
  revenueSeries: DaySeries[];
  recentBookings: Array<{
    id: string;
    passenger_name: string;
    seat_number: number;
    amount: number;
    status: string;
    created_at: string;
    route: string | null;
  }>;
  upcomingTrips: UpcomingTrip[];
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

async function loadDashboard(): Promise<DashboardData> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) throw new Error("Not authenticated");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("full_name, agencies(name, currency)")
    .eq("id", userRes.user.id)
    .maybeSingle();

  const agencies = profileRow?.agencies as
    | { name: string; currency: string }
    | { name: string; currency: string }[]
    | null
    | undefined;
  const agency = Array.isArray(agencies) ? agencies[0] ?? null : agencies ?? null;

  const now = new Date();
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenAgo = new Date(today);
  sevenAgo.setDate(sevenAgo.getDate() - 6); // include today = 7 days

  const [
    weekBookingsRes,
    activeTripsRes,
    busesRes,
    recentBookingsRes,
    upcomingRes,
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("amount, status, created_at")
      .gte("created_at", sevenAgo.toISOString()),
    supabase
      .from("trips")
      .select("id, status, departure_at")
      .gte("departure_at", today.toISOString())
      .lte("departure_at", endOfDay(now).toISOString())
      .in("status", ["scheduled", "boarding", "departed"]),
    supabase.from("buses").select("status, seat_count"),
    supabase
      .from("bookings")
      .select("id, passenger_name, seat_number, amount, status, created_at, trips(routes(origin, destination))")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("trips")
      .select("id, departure_at, status, buses(seat_count), routes(origin, destination), bookings(id, status)")
      .gte("departure_at", now.toISOString())
      .eq("status", "scheduled")
      .order("departure_at", { ascending: true })
      .limit(4),
  ]);

  // Build 7-day series (day buckets in local time)
  const series: DaySeries[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenAgo);
    d.setDate(sevenAgo.getDate() + i);
    series.push({
      day: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("ar", { weekday: "short" }),
      revenue: 0,
      bookings: 0,
    });
  }
  for (const b of weekBookingsRes.data ?? []) {
    if (b.status !== "confirmed") continue;
    const key = new Date(b.created_at).toISOString().slice(0, 10);
    const bucket = series.find((s) => s.day === key);
    if (bucket) {
      bucket.revenue += Number(b.amount ?? 0);
      bucket.bookings += 1;
    }
  }

  const todayKey = today.toISOString().slice(0, 10);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  const todayBucket = series.find((s) => s.day === todayKey);
  const yesterdayBucket = series.find((s) => s.day === yesterdayKey);
  const todayRevenue = todayBucket?.revenue ?? 0;
  const todayBookings = todayBucket?.bookings ?? 0;
  const yesterdayRevenue = yesterdayBucket?.revenue ?? 0;
  const yesterdayBookings = yesterdayBucket?.bookings ?? 0;

  const busCounts: Record<BusStatus, number> = { active: 0, maintenance: 0, inactive: 0 };
  let totalCapacity = 0;
  for (const b of busesRes.data ?? []) {
    const s = b.status as BusStatus;
    if (s in busCounts) busCounts[s] += 1;
    totalCapacity += Number(b.seat_count ?? 0);
  }

  const recentBookings = (recentBookingsRes.data ?? []).map((b) => {
    const trip = b.trips as { routes?: { origin: string; destination: string } | { origin: string; destination: string }[] | null } | null;
    const routeObj = trip?.routes;
    const route = Array.isArray(routeObj) ? routeObj[0] : routeObj;
    return {
      id: b.id,
      passenger_name: b.passenger_name,
      seat_number: b.seat_number,
      amount: Number(b.amount ?? 0),
      status: b.status,
      created_at: b.created_at,
      route: route ? `${route.origin} → ${route.destination}` : null,
    };
  });

  const upcomingTrips: UpcomingTrip[] = (upcomingRes.data ?? []).map((t) => {
    const bus = Array.isArray(t.buses) ? t.buses[0] : t.buses;
    const routeObj = Array.isArray(t.routes) ? t.routes[0] : t.routes;
    const capacity = Number((bus as { seat_count?: number } | null)?.seat_count ?? 0);
    const bookingsList = (t.bookings ?? []) as Array<{ status: string }>;
    const booked = bookingsList.filter((b) => b.status === "confirmed").length;
    return {
      id: t.id,
      departure_at: t.departure_at,
      route: routeObj ? `${routeObj.origin} → ${routeObj.destination}` : null,
      capacity,
      booked,
    };
  });

  // Average occupancy: use upcoming today + active as sample
  const occSamples = upcomingTrips.filter((t) => t.capacity > 0);
  const avgOccupancy = occSamples.length
    ? Math.round(
        (occSamples.reduce((s, t) => s + t.booked / t.capacity, 0) / occSamples.length) * 100,
      )
    : 0;

  return {
    profile: {
      full_name: profileRow?.full_name ?? userRes.user.email ?? null,
      agency_name: agency?.name ?? null,
      agency_currency: agency?.currency ?? "SDG",
    },
    todayRevenue,
    todayBookings,
    yesterdayRevenue,
    yesterdayBookings,
    activeTrips: activeTripsRes.data?.length ?? 0,
    busCounts,
    avgOccupancy,
    revenueSeries: series,
    recentBookings,
    upcomingTrips,
  };
  void totalCapacity;
}

function pctChange(current: number, prev: number): number | null {
  if (prev === 0) return current > 0 ? 100 : null;
  return Math.round(((current - prev) / prev) * 100);
}

function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: loadDashboard,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
        تعذّر تحميل بيانات اللوحة. حاول التحديث.
      </div>
    );
  }

  const {
    profile,
    todayRevenue,
    todayBookings,
    yesterdayRevenue,
    yesterdayBookings,
    activeTrips,
    busCounts,
    avgOccupancy,
    revenueSeries,
    recentBookings,
    upcomingTrips,
  } = data;
  const totalBuses = busCounts.active + busCounts.maintenance + busCounts.inactive;
  const revDelta = pctChange(todayRevenue, yesterdayRevenue);
  const bookDelta = pctChange(todayBookings, yesterdayBookings);
  const fmt = (n: number) => n.toLocaleString("ar-EG", { maximumFractionDigits: 0 });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-hero p-6 text-primary-foreground shadow-elevated lg:p-8">
        <div className="absolute inset-0 bg-dot-grid opacity-30" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--color-primary-glow)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 -start-16 h-72 w-72 rounded-full opacity-25 blur-3xl"
          style={{ background: "var(--color-brand-navy)" }}
          aria-hidden="true"
        />
        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur">
              <Sparkles className="h-3 w-3" />
              نظرة عامة
            </div>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight lg:text-4xl">
              أهلاً، {profile.full_name || "بك"} 👋
            </h1>
            <p className="mt-1.5 text-sm text-white/85">
              {profile.agency_name ? `وكالة ${profile.agency_name}` : "لوحة تحكم الوكالة"} ·{" "}
              {new Date().toLocaleDateString("ar", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>

            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="font-display text-5xl font-extrabold tabular tracking-tight lg:text-6xl">
                {fmt(todayRevenue)}
              </span>
              <span className="text-sm font-semibold text-white/85">
                {profile.agency_currency} · إيرادات اليوم
              </span>
              {revDelta !== null && (
                <DeltaPill value={revDelta} onDark />
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                to="/pos"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-primary shadow-elevated transition hover:-translate-y-0.5 hover:scale-[1.02]"
              >
                <Ticket className="h-4 w-4" />
                بيع تذكرة
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/trips"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-primary-foreground backdrop-blur transition hover:bg-white/20"
              >
                <CalendarClock className="h-4 w-4" />
                رحلة جديدة
              </Link>
              <Link
                to="/manifest"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-primary-foreground backdrop-blur transition hover:bg-white/20"
              >
                <ScrollText className="h-4 w-4" />
                منفستو الرحلة
              </Link>
            </div>
          </div>

          {/* Mini stat panel */}
          <div className="relative grid grid-cols-2 gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur">
            <MiniStat label="حجوزات اليوم" value={String(todayBookings)} delta={bookDelta} />
            <MiniStat label="رحلات نشطة" value={String(activeTrips)} />
            <MiniStat label="حافلات جاهزة" value={`${busCounts.active}/${totalBuses || 0}`} />
            <MiniStat label="إشغال متوسط" value={`${avgOccupancy}%`} />
          </div>
        </div>
      </section>

      {/* ============ KPI CARDS ============ */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="إيرادات اليوم"
          value={fmt(todayRevenue)}
          suffix={profile.agency_currency}
          icon={Wallet}
          tone="primary"
          delta={revDelta}
          spark={revenueSeries.map((s) => s.revenue)}
        />
        <KpiCard
          label="حجوزات اليوم"
          value={String(todayBookings)}
          icon={Ticket}
          tone="success"
          delta={bookDelta}
          spark={revenueSeries.map((s) => s.bookings)}
        />
        <KpiCard
          label="رحلات نشطة"
          value={String(activeTrips)}
          icon={BusFront}
          tone="accent"
          hint={activeTrips === 0 ? "لا رحلات مجدولة اليوم" : "قيد التشغيل الآن"}
        />
        <KpiCard
          label="متوسط الإشغال"
          value={`${avgOccupancy}%`}
          icon={Gauge}
          tone="warning"
          progress={avgOccupancy}
          hint={`${busCounts.active} حافلة جاهزة`}
        />
      </section>

      {/* ============ MAIN GRID ============ */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">الإيرادات — آخر 7 أيام</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                إجمالي {fmt(revenueSeries.reduce((s, d) => s + d.revenue, 0))} {profile.agency_currency}
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold text-primary">
              <TrendingUp className="h-3 w-3" />
              اسبوعي
            </div>
          </div>
          <RevenueAreaChart data={revenueSeries} currency={profile.agency_currency} />
        </div>

        {/* Fleet donut */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4">
            <h2 className="font-display text-lg font-bold">حالة الأسطول</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{totalBuses} حافلة إجمالاً</p>
          </div>
          {totalBuses === 0 ? (
            <EmptyState
              icon={BusFront}
              title="لا توجد حافلات"
              desc="أضف أول حافلة لبدء الجدولة."
              ctaLabel="إضافة حافلة"
              ctaTo="/buses"
            />
          ) : (
            <div className="space-y-4">
              <FleetDonut counts={busCounts} total={totalBuses} />
              <div className="space-y-2">
                <FleetRow icon={CheckCircle2} label="جاهزة" value={busCounts.active} total={totalBuses} tone="success" />
                <FleetRow icon={Wrench} label="في الصيانة" value={busCounts.maintenance} total={totalBuses} tone="warning" />
                <FleetRow icon={Clock} label="متوقفة" value={busCounts.inactive} total={totalBuses} tone="destructive" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ============ SECONDARY GRID ============ */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* Recent bookings table */}
        <div className="lg:col-span-2 rounded-3xl border border-border bg-card shadow-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-6 pb-4">
            <div>
              <h2 className="font-display text-lg font-bold">آخر الحجوزات</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">تحديث مباشر</p>
            </div>
            <Link
              to="/bookings"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] font-bold text-foreground transition hover:border-primary hover:text-primary"
            >
              عرض الكل
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {recentBookings.length === 0 ? (
            <div className="p-6 pt-0">
              <EmptyState
                icon={Ticket}
                title="لا توجد حجوزات بعد"
                desc="ستظهر آخر التذاكر هنا فور بدء البيع."
                ctaLabel="بيع تذكرة"
                ctaTo="/pos"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-2.5 text-start">الراكب</th>
                    <th className="px-3 py-2.5 text-start">الخط</th>
                    <th className="px-3 py-2.5 text-center">المقعد</th>
                    <th className="px-3 py-2.5 text-end">المبلغ</th>
                    <th className="px-6 py-2.5 text-end">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b) => (
                    <tr key={b.id} className="border-b border-border last:border-0 transition hover:bg-primary-soft/30">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-[11px] font-bold text-primary">
                            {b.passenger_name.slice(0, 2)}
                          </div>
                          <span className="font-semibold text-foreground truncate max-w-[140px]">{b.passenger_name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground truncate max-w-[160px]">{b.route ?? "—"}</td>
                      <td className="px-3 py-3 text-center tabular text-foreground">{b.seat_number}</td>
                      <td className="px-3 py-3 text-end tabular font-bold text-foreground">
                        {fmt(b.amount)}{" "}
                        <span className="text-[10px] font-semibold text-muted-foreground">{profile.agency_currency}</span>
                      </td>
                      <td className="px-6 py-3 text-end">
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upcoming trips */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold">الرحلات القادمة</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">أقرب 4 رحلات</p>
            </div>
            <Link
              to="/trips"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-bold text-foreground transition hover:border-primary hover:text-primary"
            >
              الكل
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {upcomingTrips.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="لا رحلات مجدولة"
              desc="أنشئ رحلة جديدة لتظهر هنا."
              ctaLabel="رحلة جديدة"
              ctaTo="/trips"
            />
          ) : (
            <ul className="space-y-2.5">
              {upcomingTrips.map((t) => {
                const pct = t.capacity > 0 ? Math.round((t.booked / t.capacity) * 100) : 0;
                return (
                  <li key={t.id} className="rounded-2xl border border-border p-3 transition hover:border-primary/40 hover:shadow-card">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-foreground">{t.route ?? "—"}</p>
                      <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">
                        {new Date(t.departure_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="shrink-0 tabular text-[11px] font-bold text-muted-foreground">
                        {t.booked}/{t.capacity || "—"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

/* ============================ Sub-components ============================ */

function DeltaPill({ value, onDark }: { value: number; onDark?: boolean }) {
  const up = value >= 0;
  const cls = onDark
    ? up
      ? "bg-success/90 text-success-foreground"
      : "bg-destructive/90 text-destructive-foreground"
    : up
      ? "bg-success/15 text-success"
      : "bg-destructive/15 text-destructive";
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular ${cls}`}>
      <Icon className="h-3 w-3" />
      {up ? "+" : ""}
      {value}%
    </span>
  );
}

function MiniStat({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  return (
    <div className="rounded-xl bg-white/10 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">{label}</p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-display text-xl font-extrabold tabular text-primary-foreground">{value}</span>
        {typeof delta === "number" && (
          <span
            className={`text-[10px] font-bold tabular ${
              delta >= 0 ? "text-success-foreground" : "text-destructive-foreground"
            }`}
          >
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  );
}

type Tone = "primary" | "success" | "accent" | "warning" | "destructive";

const toneIconBg: Record<Tone, string> = {
  primary: "bg-gradient-primary text-primary-foreground shadow-glow",
  success: "bg-success/15 text-success",
  accent: "bg-gradient-navy text-white",
  warning: "bg-warning/20 text-warning-foreground",
  destructive: "bg-destructive/15 text-destructive",
};

function KpiCard({
  label,
  value,
  suffix,
  icon: Icon,
  tone,
  delta,
  spark,
  hint,
  progress,
}: {
  label: string;
  value: string;
  suffix?: string;
  icon: typeof Ticket;
  tone: Tone;
  delta?: number | null;
  spark?: number[];
  hint?: string;
  progress?: number;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="flex items-start justify-between">
        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${toneIconBg[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {typeof delta === "number" && <DeltaPill value={delta} />}
      </div>
      <p className="mt-4 text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-display text-3xl font-extrabold text-foreground tabular">{value}</span>
        {suffix && <span className="text-xs font-semibold text-muted-foreground">{suffix}</span>}
      </div>
      {spark && spark.some((v) => v > 0) && <Sparkline values={spark} tone={tone} />}
      {typeof progress === "number" && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-primary transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
      {hint && <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Sparkline({ values, tone }: { values: number[]; tone: Tone }) {
  const w = 100;
  const h = 28;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`);
  const line = `M ${pts.join(" L ")}`;
  const area = `${line} L ${w},${h} L 0,${h} Z`;
  const stroke =
    tone === "primary" ? "var(--color-primary)" : tone === "success" ? "var(--color-success)" : tone === "accent" ? "var(--color-accent)" : "var(--color-warning)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-8 w-full" preserveAspectRatio="none" aria-hidden="true">
      <path d={area} fill={stroke} opacity={0.14} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RevenueAreaChart({ data, currency }: { data: DaySeries[]; currency: string }) {
  const w = 640;
  const h = 200;
  const padX = 24;
  const padY = 24;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const step = data.length > 1 ? (w - padX * 2) / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: padX + i * step,
    y: padY + (h - padY * 2) * (1 - d.revenue / max),
    d,
  }));
  const line = points.length ? `M ${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")}` : "";
  const area = points.length
    ? `${line} L ${points[points.length - 1].x},${h - padY} L ${points[0].x},${h - padY} Z`
    : "";

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full" preserveAspectRatio="none" role="img" aria-label="مخطط الإيرادات">
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={padX}
            x2={w - padX}
            y1={padY + (h - padY * 2) * f}
            y2={padY + (h - padY * 2) * f}
            stroke="var(--color-border)"
            strokeDasharray="3 4"
          />
        ))}
        {area && <path d={area} fill="url(#revFill)" />}
        {line && <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3.5} fill="var(--color-card)" stroke="var(--color-primary)" strokeWidth={2} />
          </g>
        ))}
      </svg>
      <div className="flex justify-between px-1 text-[10px] font-semibold text-muted-foreground">
        {data.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span>{d.label}</span>
            <span className="tabular text-foreground/80">
              {d.revenue > 0 ? d.revenue.toLocaleString("ar-EG", { maximumFractionDigits: 0 }) : "—"}
            </span>
          </div>
        ))}
      </div>
      <p className="text-center text-[10px] text-muted-foreground">القيم بالـ {currency}</p>
    </div>
  );
}

function FleetDonut({ counts, total }: { counts: Record<BusStatus, number>; total: number }) {
  const size = 160;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const segments: Array<{ value: number; color: string }> = [
    { value: counts.active, color: "var(--color-success)" },
    { value: counts.maintenance, color: "var(--color-warning)" },
    { value: counts.inactive, color: "var(--color-destructive)" },
  ];
  let offset = 0;
  const pct = total > 0 ? Math.round((counts.active / total) * 100) : 0;
  return (
    <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-muted)" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const len = total > 0 ? (s.value / total) * c : 0;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-extrabold tabular text-foreground">{pct}%</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">جاهزية</span>
      </div>
    </div>
  );
}

function FleetRow({
  icon: Icon,
  label,
  value,
  total,
  tone,
}: {
  icon: typeof Ticket;
  label: string;
  value: number;
  total: number;
  tone: "success" | "warning" | "destructive";
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const dot = tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-destructive";
  const chip = tone === "success" ? "bg-success/15 text-success" : tone === "warning" ? "bg-warning/20 text-warning-foreground" : "bg-destructive/15 text-destructive";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-2.5">
      <div className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${chip}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex flex-1 items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
        <span className="text-xs font-semibold text-foreground">{label}</span>
      </div>
      <span className="tabular text-sm font-bold text-foreground">{value}</span>
      <span className="tabular text-[10px] font-bold text-muted-foreground">{pct}%</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    confirmed: { cls: "bg-success/15 text-success", label: "مؤكد" },
    pending: { cls: "bg-warning/20 text-warning-foreground", label: "معلّق" },
    cancelled: { cls: "bg-destructive/15 text-destructive", label: "ملغى" },
    refunded: { cls: "bg-muted text-muted-foreground", label: "مسترد" },
  };
  const item = map[status] ?? { cls: "bg-muted text-muted-foreground", label: status };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${item.cls}`}>
      {item.label}
    </span>
  );
}

function EmptyState({
  icon: Icon,
  title,
  desc,
  ctaLabel,
  ctaTo,
}: {
  icon: typeof Ticket;
  title: string;
  desc: string;
  ctaLabel?: string;
  ctaTo?: "/pos" | "/trips" | "/buses" | "/bookings" | "/manifest";
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="relative inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-40 blur-xl"
          style={{ background: "var(--color-primary)" }}
          aria-hidden="true"
        />
        <Icon className="relative h-6 w-6" />
      </div>
      <p className="mt-1 text-sm font-bold text-foreground">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{desc}</p>
      {ctaLabel && ctaTo && (
        <Link
          to={ctaTo}
          className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-gradient-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-glow transition hover:-translate-y-0.5"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
