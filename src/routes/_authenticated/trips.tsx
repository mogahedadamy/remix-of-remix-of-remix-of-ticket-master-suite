import { PageHeader } from "@/components/layout/page-header";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarClock, Plus, Pencil, Trash2, Search, BusFront, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/trips")({
  component: TripsPage,
});

type TripStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

type Trip = {
  id: string;
  route: string;
  bus: string;
  driver: string;
  departure_at: string;
  arrival_at: string;
  price: number;
  capacity: number;
  sold: number;
  status: TripStatus;
};

const STATUS_LABEL: Record<TripStatus, string> = {
  scheduled: "مجدولة",
  in_progress: "جارية",
  completed: "منتهية",
  cancelled: "ملغاة",
};

const STATUS_TONE: Record<TripStatus, string> = {
  scheduled: "bg-primary/10 text-primary",
  in_progress: "bg-warning/20 text-warning-foreground",
  completed: "bg-success/15 text-success",
  cancelled: "bg-muted text-muted-foreground line-through",
};

const MOCK: Trip[] = [
  {
    id: "t1",
    route: "الخرطوم → بورتسودان",
    bus: "ح-1024",
    driver: "عمر يوسف",
    departure_at: "2026-07-15T08:00:00",
    arrival_at: "2026-07-15T20:00:00",
    price: 15000,
    capacity: 45,
    sold: 31,
    status: "scheduled",
  },
  {
    id: "t2",
    route: "الخرطوم → مدني",
    bus: "ح-2210",
    driver: "إبراهيم علي",
    departure_at: "2026-07-15T14:00:00",
    arrival_at: "2026-07-15T17:30:00",
    price: 8500,
    capacity: 30,
    sold: 18,
    status: "in_progress",
  },
  {
    id: "t3",
    route: "بورتسودان → الخرطوم",
    bus: "ح-1024",
    driver: "عمر يوسف",
    departure_at: "2026-07-14T07:30:00",
    arrival_at: "2026-07-14T19:00:00",
    price: 15000,
    capacity: 45,
    sold: 45,
    status: "completed",
  },
];

function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>(MOCK);
  const [editing, setEditing] = useState<Trip | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Trip | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TripStatus | "all">("all");

  const filtered = trips.filter((t) => {
    const matchesSearch =
      search.trim() === "" ||
      t.route.includes(search) ||
      t.bus.includes(search) ||
      t.driver.includes(search);
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function handleSave(form: Omit<Trip, "id"> & { id?: string }) {
    if (form.id) {
      setTrips((prev) => prev.map((t) => (t.id === form.id ? { ...(form as Trip) } : t)));
      toast.success("تم تحديث الرحلة");
    } else {
      setTrips((prev) => [{ ...form, id: crypto.randomUUID() } as Trip, ...prev]);
      toast.success("تم إضافة الرحلة");
    }
    setDialogOpen(false);
    setEditing(null);
  }

  function handleDelete(id: string) {
    setTrips((prev) => prev.filter((t) => t.id !== id));
    setConfirmDelete(null);
    toast.success("تم حذف الرحلة");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="الحجوزات والرحلات"
        title="الرحلات"
        subtitle="جدولة الرحلات، متابعة نسب البيع، والحافلات والسائقين المخصصين."
        icon={CalendarClock}
        actions={
          <Dialog
            open={dialogOpen}
            onOpenChange={(o) => {
              setDialogOpen(o);
              if (!o) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}>
                <Plus className="me-2 h-4 w-4" />
                رحلة جديدة
              </Button>
            </DialogTrigger>
            <TripFormDialog key={editing?.id ?? "new"} initial={editing} onSubmit={handleSave} />
          </Dialog>
        }
      />


      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" style={{ insetInlineStart: "0.75rem" }} />
          <Input
            placeholder="ابحث بمسار، حافلة، أو سائق…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TripStatus | "all")}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="scheduled">مجدولة</SelectItem>
            <SelectItem value="in_progress">جارية</SelectItem>
            <SelectItem value="completed">منتهية</SelectItem>
            <SelectItem value="cancelled">ملغاة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center shadow-card">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <CalendarClock className="h-5 w-5" />
          </div>
          <p className="mt-2 text-sm font-bold text-foreground">لا توجد رحلات</p>
          <p className="mt-1 text-xs text-muted-foreground">أضف رحلة جديدة لتظهر هنا.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => {
            const pct = Math.round((t.sold / t.capacity) * 100);
            return (
              <article
                key={t.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-card"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{t.route}</span>
                    </div>
                    <p className="mt-1 font-display text-base font-extrabold text-foreground">
                      {new Date(t.departure_at).toLocaleString("ar", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[t.status]}`}
                  >
                    {STATUS_LABEL[t.status]}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <BusFront className="h-3.5 w-3.5" /> {t.bus}
                  </span>
                  <span>·</span>
                  <span>{t.driver}</span>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>
                      المقاعد المباعة: <span className="tabular font-bold text-foreground">{t.sold}/{t.capacity}</span>
                    </span>
                    <span className="tabular font-bold text-foreground">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="font-display text-sm font-extrabold text-primary tabular">
                    {t.price.toLocaleString("ar-EG")} ج.س
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(t);
                        setDialogOpen(true);
                      }}
                      aria-label="تعديل"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDelete(t)}
                      aria-label="حذف"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الرحلة؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف رحلة «{confirmDelete?.route}» نهائياً. لا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && handleDelete(confirmDelete.id)}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TripFormDialog({
  initial,
  onSubmit,
}: {
  initial: Trip | null;
  onSubmit: (form: Omit<Trip, "id"> & { id?: string }) => void;
}) {
  const [route, setRoute] = useState(initial?.route ?? "");
  const [bus, setBus] = useState(initial?.bus ?? "");
  const [driver, setDriver] = useState(initial?.driver ?? "");
  const [departure, setDeparture] = useState(
    initial ? new Date(initial.departure_at).toISOString().slice(0, 16) : ""
  );
  const [arrival, setArrival] = useState(
    initial ? new Date(initial.arrival_at).toISOString().slice(0, 16) : ""
  );
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [capacity, setCapacity] = useState(initial?.capacity ?? 45);
  const [sold, setSold] = useState(initial?.sold ?? 0);
  const [status, setStatus] = useState<TripStatus>(initial?.status ?? "scheduled");

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{initial ? "تعديل الرحلة" : "رحلة جديدة"}</DialogTitle>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!route.trim() || !bus.trim() || !departure || !arrival) {
            return toast.error("المسار، الحافلة، والمواعيد مطلوبة");
          }
          onSubmit({
            id: initial?.id,
            route: route.trim(),
            bus: bus.trim(),
            driver: driver.trim() || "—",
            departure_at: new Date(departure).toISOString(),
            arrival_at: new Date(arrival).toISOString(),
            price: Number(price) || 0,
            capacity: Number(capacity) || 1,
            sold: Math.min(Number(sold) || 0, Number(capacity) || 1),
            status,
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="route">المسار *</Label>
          <Input id="route" value={route} onChange={(e) => setRoute(e.target.value)} placeholder="مثال: الخرطوم → بورتسودان" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="bus">الحافلة *</Label>
            <Input id="bus" value={bus} onChange={(e) => setBus(e.target.value)} placeholder="ح-1024" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="driver">السائق</Label>
            <Input id="driver" value={driver} onChange={(e) => setDriver(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="dep">موعد الانطلاق *</Label>
            <Input id="dep" type="datetime-local" value={departure} onChange={(e) => setDeparture(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="arr">موعد الوصول *</Label>
            <Input id="arr" type="datetime-local" value={arrival} onChange={(e) => setArrival(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="price">السعر</Label>
            <Input id="price" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cap">السعة</Label>
            <Input id="cap" type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sold">المباعة</Label>
            <Input id="sold" type="number" min={0} value={sold} onChange={(e) => setSold(Number(e.target.value))} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>الحالة</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as TripStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">مجدولة</SelectItem>
              <SelectItem value="in_progress">جارية</SelectItem>
              <SelectItem value="completed">منتهية</SelectItem>
              <SelectItem value="cancelled">ملغاة</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="submit">{initial ? "حفظ التعديلات" : "إضافة الرحلة"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}