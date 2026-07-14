import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ScrollText, Printer, Download, Search, BusFront, MapPin, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/manifest")({
  component: ManifestPage,
});

type TripSummary = {
  id: string;
  route: string;
  bus: string;
  driver: string;
  departure_at: string;
};

type ManifestRow = {
  seat: number;
  passenger: string;
  phone: string | null;
  national_id: string | null;
  boarding: string;
  dropoff: string;
  paid: boolean;
};

const TRIPS: TripSummary[] = [
  {
    id: "t1",
    route: "الخرطوم → بورتسودان",
    bus: "ح-1024",
    driver: "عمر يوسف",
    departure_at: "2026-07-15T08:00:00",
  },
  {
    id: "t2",
    route: "الخرطوم → مدني",
    bus: "ح-2210",
    driver: "إبراهيم علي",
    departure_at: "2026-07-15T14:00:00",
  },
];

const MANIFEST: Record<string, ManifestRow[]> = {
  t1: [
    { seat: 1, passenger: "أحمد محمد", phone: "0912345678", national_id: "199001234567", boarding: "الخرطوم", dropoff: "بورتسودان", paid: true },
    { seat: 2, passenger: "سارة عبدالله", phone: "0911223344", national_id: null, boarding: "الخرطوم", dropoff: "عطبرة", paid: true },
    { seat: 4, passenger: "خالد إبراهيم", phone: null, national_id: "198507654321", boarding: "الخرطوم", dropoff: "بورتسودان", paid: false },
    { seat: 7, passenger: "منى حسن", phone: "0987654321", national_id: null, boarding: "الخرطوم", dropoff: "بورتسودان", paid: true },
    { seat: 12, passenger: "يوسف علي", phone: "0999887766", national_id: "199212345678", boarding: "الخرطوم", dropoff: "عطبرة", paid: true },
    { seat: 15, passenger: "ليلى صالح", phone: "0955443322", national_id: null, boarding: "الخرطوم", dropoff: "بورتسودان", paid: true },
  ],
  t2: [
    { seat: 1, passenger: "فاطمة عمر", phone: "0998765432", national_id: null, boarding: "الخرطوم", dropoff: "مدني", paid: true },
    { seat: 3, passenger: "علي بشير", phone: "0912000111", national_id: "199005556677", boarding: "الخرطوم", dropoff: "مدني", paid: true },
    { seat: 8, passenger: "ريم إبراهيم", phone: null, national_id: null, boarding: "الخرطوم", dropoff: "مدني", paid: false },
  ],
};

function ManifestPage() {
  const [tripId, setTripId] = useState<string>(TRIPS[0].id);
  const [search, setSearch] = useState("");

  const trip = TRIPS.find((t) => t.id === tripId)!;
  const rows = MANIFEST[tripId] ?? [];
  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          search.trim() === "" ||
          r.passenger.includes(search) ||
          String(r.seat).includes(search) ||
          (r.phone && r.phone.includes(search))
      ),
    [rows, search]
  );

  const paidCount = rows.filter((r) => r.paid).length;

  function handlePrint() {
    window.print();
  }

  function handleExport() {
    const header = ["مقعد", "المسافر", "الهاتف", "الرقم الوطني", "الصعود", "النزول", "الدفع"];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.seat,
          r.passenger,
          r.phone ?? "",
          r.national_id ?? "",
          r.boarding,
          r.dropoff,
          r.paid ? "مدفوع" : "غير مدفوع",
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manifest-${trip.bus}-${trip.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير المنفستو");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="الحجوزات والرحلات"
        title="المنفستو"
        subtitle="كشف المسافرين لكل رحلة — للطباعة أو التصدير عند نقاط التفتيش."
        icon={ScrollText}
        actions={
          <>
            <Button variant="outline" onClick={handleExport}>
              <Download className="me-2 h-4 w-4" /> تصدير CSV
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="me-2 h-4 w-4" /> طباعة
            </Button>
          </>
        }
      />


      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <label className="text-xs font-semibold text-muted-foreground">اختر الرحلة</label>
          <Select value={tripId} onValueChange={setTripId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRIPS.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.route} — {new Date(t.departure_at).toLocaleString("ar", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2 lg:col-span-2">
          <label className="text-xs font-semibold text-muted-foreground">بحث</label>
          <div className="relative">
            <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" style={{ insetInlineStart: "0.75rem" }} />
            <Input
              placeholder="ابحث باسم، رقم مقعد، أو هاتف…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-display text-base font-extrabold text-foreground">{trip.route}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><BusFront className="h-3.5 w-3.5" /> {trip.bus}</span>
              <span>·</span>
              <span>السائق: {trip.driver}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" />
                {new Date(trip.departure_at).toLocaleString("ar", { weekday: "long", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
          <div className="text-end">
            <p className="tabular font-display text-lg font-extrabold text-primary">
              {rows.length} <span className="text-xs text-muted-foreground">مسافر</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              مدفوع: <span className="tabular font-bold text-foreground">{paidCount}</span> / غير مدفوع:{" "}
              <span className="tabular font-bold text-foreground">{rows.length - paidCount}</span>
            </p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <ScrollText className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-foreground">لا توجد بيانات</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              لم يتم تسجيل أي مسافر في هذه الرحلة بعد.
            </p>
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">#</th>
                  <th className="px-3 py-2 text-start">المقعد</th>
                  <th className="px-3 py-2 text-start">المسافر</th>
                  <th className="px-3 py-2 text-start">الهاتف</th>
                  <th className="px-3 py-2 text-start">الرقم الوطني</th>
                  <th className="px-3 py-2 text-start">الصعود</th>
                  <th className="px-3 py-2 text-start">النزول</th>
                  <th className="px-3 py-2 text-start">الدفع</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.seat} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2 tabular text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 tabular font-bold text-foreground">{r.seat}</td>
                    <td className="px-3 py-2 font-semibold text-foreground">{r.passenger}</td>
                    <td className="px-3 py-2 tabular text-muted-foreground">{r.phone || "—"}</td>
                    <td className="px-3 py-2 tabular text-muted-foreground">{r.national_id || "—"}</td>
                    <td className="px-3 py-2 text-foreground">{r.boarding}</td>
                    <td className="px-3 py-2 text-foreground">{r.dropoff}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          r.paid ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground"
                        }`}
                      >
                        {r.paid ? "مدفوع" : "غير مدفوع"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 hidden grid-cols-3 gap-6 border-t border-border pt-6 text-xs text-muted-foreground print:grid">
          <div>توقيع السائق: __________________</div>
          <div>توقيع المفتش: __________________</div>
          <div>ختم الوكالة: __________________</div>
        </div>
      </div>
    </div>
  );
}