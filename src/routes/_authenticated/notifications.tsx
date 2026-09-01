import { PageHeader } from "@/components/layout/page-header";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, Loader2, AlertTriangle, CalendarClock, Wrench, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "التنبيهات · TICKETTY" },
      { name: "description", content: "تنبيهات تشغيلية عن الرحلات والحافلات والسائقين." },
      { property: "og:title", content: "التنبيهات · TICKETTY" },
      { property: "og:description", content: "تنبيهات تشغيلية عن الرحلات والحافلات والسائقين." },
    ],
  }),
  component: NotificationsPage,
});

type Alert = {
  id: string;
  tone: "info" | "warning" | "danger";
  icon: typeof Bell;
  title: string;
  detail: string;
  to?: string;
};

function NotificationsPage() {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ["notifications"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 3600_000);

      const [tripsRes, busesRes, driversRes, bookingsRes] = await Promise.all([
        supabase
          .from("trips")
          .select("id, departure_at, status, bus_id, route_id")
          .gte("departure_at", now.toISOString())
          .lte("departure_at", in24h.toISOString())
          .order("departure_at", { ascending: true }),
        supabase.from("buses").select("id, plate_number, status"),
        supabase.from("drivers").select("id, full_name, status"),
        supabase.from("bookings").select("id, status, created_at, trip_id"),
      ]);

      const trips = tripsRes.data ?? [];
      const buses = busesRes.data ?? [];
      const drivers = driversRes.data ?? [];
      const bookings = bookingsRes.data ?? [];

      const out: Alert[] = [];

      for (const t of trips.slice(0, 5)) {
        const sold = bookings.filter((b) => b.trip_id === t.id && b.status !== "cancelled").length;
        out.push({
          id: `trip-${t.id}`,
          tone: "info",
          icon: CalendarClock,
          title: "رحلة خلال 24 ساعة",
          detail: `المغادرة ${new Date(t.departure_at).toLocaleString("ar-EG")} · ${sold} تذكرة مباعة`,
          to: "/trips",
        });
      }

      const maintenance = buses.filter((b) => b.status === "maintenance");
      if (maintenance.length) {
        out.push({
          id: "buses-maintenance",
          tone: "warning",
          icon: Wrench,
          title: `${maintenance.length} حافلة في الصيانة`,
          detail: maintenance.map((b) => b.plate_number).join("، "),
          to: "/buses",
        });
      }

      const inactive = buses.filter((b) => b.status === "inactive");
      if (inactive.length) {
        out.push({
          id: "buses-inactive",
          tone: "danger",
          icon: AlertTriangle,
          title: `${inactive.length} حافلة متوقفة`,
          detail: inactive.map((b) => b.plate_number).join("، "),
          to: "/buses",
        });
      }

      const away = drivers.filter((d) => d.status !== "active");
      if (away.length) {
        out.push({
          id: "drivers-away",
          tone: "warning",
          icon: AlertTriangle,
          title: `${away.length} سائق غير متاح`,
          detail: away.map((d) => d.full_name).join("، "),
          to: "/drivers",
        });
      }

      if (buses.length === 0) {
        out.push({
          id: "no-buses",
          tone: "warning",
          icon: AlertTriangle,
          title: "لا توجد حافلات مسجّلة",
          detail: "أضف أول حافلة لتتمكن من جدولة الرحلات.",
          to: "/buses",
        });
      }

      return out;
    },
  });

  const TONE: Record<Alert["tone"], string> = {
    info: "bg-primary/10 text-primary",
    warning: "bg-warning/20 text-warning-foreground",
    danger: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="النظام"
        title="التنبيهات"
        subtitle="تنبيهات تُحسب تلقائياً من حالة الرحلات والأسطول والسائقين."
        icon={Bell}
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : !alerts || alerts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-success/15 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-foreground">كل شيء على ما يرام</p>
            <p className="max-w-xs text-xs text-muted-foreground">لا توجد تنبيهات حالياً.</p>
          </div>
        ) : (
          <ul>
            {alerts.map((a) => (
              <li key={a.id} className="border-b border-border/60 last:border-0">
                <div className="flex items-start gap-3 p-4">
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE[a.tone]}`}
                  >
                    <a.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">{a.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.detail}</p>
                  </div>
                  {a.to && (
                    <Link
                      to={a.to}
                      className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted"
                    >
                      عرض
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
