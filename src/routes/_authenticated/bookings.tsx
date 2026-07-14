import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Plus, Pencil, Trash2, Search } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/bookings")({
  component: BookingsPage,
});

type BookingStatus = "confirmed" | "pending" | "cancelled";

type Booking = {
  id: string;
  passenger_name: string;
  passenger_phone: string | null;
  route: string;
  departure_at: string;
  seat_number: number;
  amount: number;
  status: BookingStatus;
  created_at: string;
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  confirmed: "مؤكد",
  pending: "معلق",
  cancelled: "ملغى",
};

const STATUS_TONE: Record<BookingStatus, string> = {
  confirmed: "bg-success/15 text-success",
  pending: "bg-warning/20 text-warning-foreground",
  cancelled: "bg-muted text-muted-foreground line-through",
};

const MOCK_BOOKINGS: Booking[] = [
  {
    id: "1",
    passenger_name: "أحمد محمد",
    passenger_phone: "0912345678",
    route: "الخرطوم → بورتسودان",
    departure_at: "2026-07-15T08:00:00",
    seat_number: 12,
    amount: 15000,
    status: "confirmed",
    created_at: "2026-07-14T10:30:00",
  },
  {
    id: "2",
    passenger_name: "فاطمة عمر",
    passenger_phone: "0998765432",
    route: "الخرطوم → مدني",
    departure_at: "2026-07-15T14:00:00",
    seat_number: 5,
    amount: 8500,
    status: "pending",
    created_at: "2026-07-14T11:00:00",
  },
  {
    id: "3",
    passenger_name: "خالد إبراهيم",
    passenger_phone: null,
    route: "بورتسودان → الخرطوم",
    departure_at: "2026-07-16T07:30:00",
    seat_number: 22,
    amount: 15000,
    status: "cancelled",
    created_at: "2026-07-13T16:45:00",
  },
];

function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Booking | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");

  const filtered = bookings.filter((b) => {
    const matchesSearch =
      search.trim() === "" ||
      b.passenger_name.includes(search) ||
      b.route.includes(search) ||
      (b.passenger_phone && b.passenger_phone.includes(search));
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function handleSave(form: Omit<Booking, "id" | "created_at"> & { id?: string }) {
    if (form.id) {
      setBookings((prev) =>
        prev.map((b) => (b.id === form.id ? { ...b, ...form, id: form.id } : b))
      );
      toast.success("تم تحديث الحجز");
    } else {
      const newBooking: Booking = {
        ...form,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };
      setBookings((prev) => [newBooking, ...prev]);
      toast.success("تم إضافة الحجز");
    }
    setDialogOpen(false);
    setEditing(null);
  }

  function handleDelete(id: string) {
    setBookings((prev) => prev.filter((b) => b.id !== id));
    setConfirmDelete(null);
    toast.success("تم حذف الحجز");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="الحجوزات والرحلات"
        title="الحجوزات"
        subtitle="قائمة الحجوزات والتذاكر المحجوزة لدى الوكالة."
        icon={BookOpen}
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
                حجز جديد

            </Button>
          </DialogTrigger>
          <BookingFormDialog
            key={editing?.id ?? "new"}
            initial={editing}
            onSubmit={handleSave}
          />
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" style={{ insetInlineStart: "0.75rem" }} />
          <Input
            placeholder="ابحث باسم المسافر، المسار، أو الهاتف…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BookingStatus | "all")}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="confirmed">مؤكد</SelectItem>
            <SelectItem value="pending">معلق</SelectItem>
            <SelectItem value="cancelled">ملغى</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <BookOpen className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-foreground">لا توجد حجوزات</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              أضف أول حجز أو جرّب تغيير معايير البحث.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-start">المسافر</th>
                  <th className="px-4 py-3 text-start">المسار</th>
                  <th className="px-4 py-3 text-start">الموعد</th>
                  <th className="px-4 py-3 text-start">المقعد</th>
                  <th className="px-4 py-3 text-start">المبلغ</th>
                  <th className="px-4 py-3 text-start">الحالة</th>
                  <th className="px-4 py-3 text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{b.passenger_name}</p>
                      <p className="text-xs text-muted-foreground">{b.passenger_phone || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-foreground">{b.route}</td>
                    <td className="px-4 py-3 tabular text-muted-foreground">
                      {new Date(b.departure_at).toLocaleString("ar", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 tabular text-foreground">{b.seat_number}</td>
                    <td className="px-4 py-3 tabular font-bold text-foreground">
                      {b.amount.toLocaleString("ar-EG")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[b.status]}`}
                      >
                        {STATUS_LABEL[b.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(b);
                            setDialogOpen(true);
                          }}
                          aria-label="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDelete(b)}
                          aria-label="حذف"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الحجز؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف حجز «{confirmDelete?.passenger_name}» نهائياً. لا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete.id)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BookingFormDialog({
  initial,
  onSubmit,
}: {
  initial: Booking | null;
  onSubmit: (form: Omit<Booking, "id" | "created_at"> & { id?: string }) => void;
}) {
  const [name, setName] = useState(initial?.passenger_name ?? "");
  const [phone, setPhone] = useState(initial?.passenger_phone ?? "");
  const [route, setRoute] = useState(initial?.route ?? "");
  const [departure, setDeparture] = useState(
    initial ? new Date(initial.departure_at).toISOString().slice(0, 16) : ""
  );
  const [seat, setSeat] = useState(initial?.seat_number ?? 1);
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [status, setStatus] = useState<BookingStatus>(initial?.status ?? "confirmed");

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{initial ? "تعديل الحجز" : "حجز جديد"}</DialogTitle>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !route.trim() || !departure) {
            return toast.error("اسم المسافر والمسار وموعد الرحلة مطلوبة");
          }
          onSubmit({
            id: initial?.id,
            passenger_name: name.trim(),
            passenger_phone: phone.trim() || null,
            route: route.trim(),
            departure_at: new Date(departure).toISOString(),
            seat_number: Number(seat) || 1,
            amount: Number(amount) || 0,
            status,
          });
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="name">اسم المسافر *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">الهاتف</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="route">المسار *</Label>
          <Input id="route" value={route} onChange={(e) => setRoute(e.target.value)} placeholder="مثال: الخرطوم → بورتسودان" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="departure">موعد الرحلة *</Label>
            <Input
              id="departure"
              type="datetime-local"
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seat">رقم المقعد</Label>
            <Input
              id="seat"
              type="number"
              min={1}
              value={seat}
              onChange={(e) => setSeat(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="amount">المبلغ</Label>
            <Input
              id="amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>الحالة</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as BookingStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">مؤكد</SelectItem>
                <SelectItem value="pending">معلق</SelectItem>
                <SelectItem value="cancelled">ملغى</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">{initial ? "حفظ التعديلات" : "إضافة الحجز"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
