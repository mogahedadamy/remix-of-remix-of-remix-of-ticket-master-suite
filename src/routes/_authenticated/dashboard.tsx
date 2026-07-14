import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Ticket,
  BusFront,
  Users,
  Wallet,
  Loader2,
  CheckCircle2,
  Clock,
  Wrench,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

type BusStatus = "active" | "maintenance" | "inactive";

type DashboardData = {
  profile: { full_name: string | null; agency_name: string | null; agency_currency: string };
  todayRevenue: number;
  todayBookings: number;
  activeTrips: number;
  busCounts: Record<BusStatus, number>;
  recentBookings: Array<{
    id: string;
    passenger_name: string;
    seat_number: number;
    amount: number;
    status: string;
    created_at: string;
    route: string | null;
  }>;
};

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function endOfTodayISO() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
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

  const dayStart = startOfTodayISO();
  const dayEnd = endOfTodayISO();

  const [
    todayBookingsRes,
    activeTripsRes,
    busesRes,
    recentBookingsRes,
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("amount, status, created_at")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd),
    supabase
      .from("trips")
      .select("id, status, departure_at")
      .gte("departure_at", dayStart)
      .lte("departure_at", dayEnd)
      .in("status", ["scheduled", "boarding", "departed"]),
    supabase.from("buses").select("status"),
    supabase
      .from("bookings")
      .select("id, passenger_name, seat_number, amount, status, created_at, trips(routes(origin, destination))")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const bookings = todayBookingsRes.data ?? [];
  const todayRevenue = bookings
    .filter((b) => b.status === "confirmed")
    .reduce((sum, b) => sum + Number(b.amount ?? 0), 0);
  const todayBookings = bookings.filter((b) => b.status === "confirmed").length;

  const busCounts: Record<BusStatus, number> = { active: 0, maintenance: 0, inactive: 0 };
  for (const b of busesRes.data ?? []) {
    const s = b.status as BusStatus;
    if (s in busCounts) busCounts[s] += 1;
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

  return {
    profile: {
      full_name: profileRow?.full_name ?? userRes.user.email ?? null,
      agency_name: agency?.name ?? null,
      agency_currency: agency?.currency ?? "SDG",
    },
    todayRevenue,
    todayBookings,
    activeTrips: activeTripsRes.data?.length ?? 0,
    busCounts,
    recentBookings,
  };
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
    activeTrips,
    busCounts,
    recentBookings,
  } = data;
  const totalBuses = busCounts.active + busCounts.maintenance + busCounts.inactive;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground">نظرة عامة</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-foreground lg:text-3xl">
              أهلاً، {profile.full_name || "بك"} 👋
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.agency_name ? `وكالة ${profile.agency_name}` : "لوحة تحكم الوكالة"}
              {" · "}
              {new Date().toLocaleDateString("ar", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="rounded-xl border border-dashed border-border bg-card px-4 py-2 text-xs text-muted-foreground">
            تحديث تلقائي كل دقيقة
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="إيرادات اليوم"
          value={todayRevenue.toLocaleString("ar-EG", { maximumFractionDigits: 0 })}
          suffix={profile.agency_currency}
          icon={Wallet}
          tone="primary"
          hint={todayBookings === 0 ? "سيظهر بعد أول عملية بيع" : undefined}
        />
        <StatCard
          label="حجوزات اليوم"
          value={String(todayBookings)}
          icon={Ticket}
          tone="success"
        />
        <StatCard
          label="الرحلات النشطة اليوم"
          value={String(activeTrips)}
          icon={BusFront}
          tone="accent"
        />
        <StatCard
          label="الأسطول"
          value={`${busCounts.active}/${totalBuses}`}
          suffix="جاهزة"
          icon={Users}
          tone="warning"
          hint={
            busCounts.maintenance > 0
              ? `${busCounts.maintenance} في الصيانة`
              : undefined
          }
        />
      </div>

      {/* Two-column: recent activity + bus status */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-bold">آخر الحجوزات</h2>
            <span className="text-xs text-muted-foreground">آخر {recentBookings.length || 10}</span>
          </div>
          {recentBookings.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="لا توجد حجوزات بعد"
              desc="ستظهر آخر التذاكر الصادرة من الكاشير هنا فور بدء البيع."
            />
          ) : (
            <ul className="divide-y divide-border">
              {recentBookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {b.passenger_name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {b.route ?? "—"} · مقعد {b.seat_number}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-bold tabular text-foreground">
                      {b.amount.toLocaleString("ar-EG")} {profile.agency_currency}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {new Date(b.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-bold">حالة الأسطول</h2>
          </div>
          {totalBuses === 0 ? (
            <EmptyState
              icon={BusFront}
              title="لا توجد حافلات"
              desc="أضف حافلاتك لبدء جدولة الرحلات."
            />
          ) : (
            <div className="space-y-2.5">
              <BusRow icon={CheckCircle2} tone="success" label="جاهزة" value={busCounts.active} />
              <BusRow icon={Wrench} tone="warning" label="في الصيانة" value={busCounts.maintenance} />
              <BusRow icon={Clock} tone="destructive" label="متوقفة" value={busCounts.inactive} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BusRow({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof Ticket;
  tone: Tone;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <div className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneMap[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span className="ms-auto tabular text-sm font-bold text-foreground">{value}</span>
    </div>
  );
}

type Tone = "primary" | "success" | "accent" | "warning" | "destructive";
const toneMap: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success/15 text-success",
  accent: "bg-accent-soft text-accent",
  warning: "bg-warning/20 text-warning-foreground",
  destructive: "bg-destructive/15 text-destructive",
};

function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  tone,
  change,
  hint,
}: {
  label: string;
  value: string;
  suffix?: string;
  icon: typeof Ticket;
  tone: Tone;
  change?: { dir: "up" | "down"; value: string };
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {change && (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
              change.dir === "up" ? "text-success" : "text-destructive"
            }`}
          >
            {change.dir === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {change.value}
          </span>
        )}
      </div>
      <p className="mt-4 text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-display text-2xl font-extrabold text-foreground tabular">{value}</span>
        {suffix && <span className="text-xs font-semibold text-muted-foreground">{suffix}</span>}
      </div>
      {hint && <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc }: { icon: typeof Ticket; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-2 text-sm font-bold text-foreground">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}

