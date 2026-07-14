import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Ticket, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/pos")({
  component: POSPage,
});

type TripOption = {
  id: string;
  route: string;
  departure_at: string;
  bus: string;
  price: number;
  available_seats: number[];
};

const TRIPS: TripOption[] = [
  {
    id: "t1",
    route: "الخرطوم → بورتسودان",
    departure_at: "2026-07-15T08:00:00",
    bus: "ح-1024",
    price: 15000,
    available_seats: [1, 2, 3, 5, 7, 8, 11, 12, 15, 18, 22, 24, 27, 30],
  },
  {
    id: "t2",
    route: "الخرطوم → مدني",
    departure_at: "2026-07-15T14:00:00",
    bus: "ح-2210",
    price: 8500,
    available_seats: [1, 4, 5, 6, 9, 10, 13, 14, 17, 20, 21, 25],
  },
  {
    id: "t3",
    route: "بورتسودان → الخرطوم",
    departure_at: "2026-07-16T07:30:00",
    bus: "ح-1024",
    price: 15000,
    available_seats: [2, 3, 6, 9, 12, 16, 19, 23, 26, 28, 31, 33],
  },
];

type CartItem = {
  key: string;
  trip: TripOption;
  seat: number;
  passenger: string;
};

type PayMethod = "cash" | "card" | "mobile";

function POSPage() {
  const [search, setSearch] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<TripOption | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [passenger, setPassenger] = useState("");
  const [pay, setPay] = useState<PayMethod>("cash");
  const [discount, setDiscount] = useState(0);

  const filteredTrips = useMemo(
    () =>
      TRIPS.filter(
        (t) => search.trim() === "" || t.route.includes(search) || t.bus.includes(search)
      ),
    [search]
  );

  const takenSeats = useMemo(
    () =>
      cart
        .filter((c) => selectedTrip && c.trip.id === selectedTrip.id)
        .map((c) => c.seat),
    [cart, selectedTrip]
  );

  function addSeat(seat: number) {
    if (!selectedTrip) return;
    if (!passenger.trim()) return toast.error("أدخل اسم المسافر أولاً");
    if (takenSeats.includes(seat)) return;
    setCart((prev) => [
      ...prev,
      {
        key: `${selectedTrip.id}-${seat}-${crypto.randomUUID()}`,
        trip: selectedTrip,
        seat,
        passenger: passenger.trim(),
      },
    ]);
    setPassenger("");
    toast.success(`تم حجز المقعد ${seat}`);
  }

  function removeItem(key: string) {
    setCart((prev) => prev.filter((c) => c.key !== key));
  }

  const subtotal = cart.reduce((s, c) => s + c.trip.price, 0);
  const total = Math.max(0, subtotal - discount);

  function checkout() {
    if (cart.length === 0) return toast.error("السلة فارغة");
    toast.success(`تم إصدار ${cart.length} تذكرة بمبلغ ${total.toLocaleString("ar-EG")} ج.س`);
    setCart([]);
    setDiscount(0);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-muted-foreground">الحجوزات والرحلات</p>
        <h1 className="font-display text-2xl font-extrabold text-foreground lg:text-3xl">
          نقطة البيع
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          إصدار تذاكر سريعة للمسافرين واختيار المقاعد وطرق الدفع.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trips + seat map */}
        <div className="space-y-4 lg:col-span-2">
          <div className="relative">
            <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" style={{ insetInlineStart: "0.75rem" }} />
            <Input
              placeholder="ابحث برقم الحافلة أو المسار…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {filteredTrips.map((t) => {
              const active = selectedTrip?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTrip(t)}
                  className={`rounded-2xl border p-4 text-start transition ${
                    active
                      ? "border-primary bg-primary/5 shadow-card"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <p className="font-bold text-foreground">{t.route}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(t.departure_at).toLocaleString("ar", {
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · حافلة {t.bus}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {t.available_seats.length} مقعد متاح
                    </span>
                    <span className="font-display text-sm font-extrabold text-primary">
                      {t.price.toLocaleString("ar-EG")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedTrip && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">المقاعد المتاحة</p>
                  <p className="font-bold text-foreground">{selectedTrip.route}</p>
                </div>
                <div className="w-56">
                  <Label htmlFor="pass" className="text-xs">اسم المسافر</Label>
                  <Input
                    id="pass"
                    value={passenger}
                    onChange={(e) => setPassenger(e.target.value)}
                    placeholder="مثال: محمد أحمد"
                  />
                </div>
              </div>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
                {selectedTrip.available_seats.map((s) => {
                  const taken = takenSeats.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => addSeat(s)}
                      disabled={taken}
                      className={`tabular rounded-lg border p-2 text-sm font-bold transition ${
                        taken
                          ? "cursor-not-allowed border-muted bg-muted text-muted-foreground"
                          : "border-border bg-card text-foreground hover:border-primary hover:text-primary"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" />
              <p className="font-bold text-foreground">التذاكر ({cart.length})</p>
            </div>
            {cart.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                لا توجد تذاكر بعد. اختر رحلة ومقعد.
              </p>
            ) : (
              <ul className="space-y-2">
                {cart.map((c) => (
                  <li
                    key={c.key}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{c.passenger}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {c.trip.route} · مقعد {c.seat}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tabular text-sm font-bold text-foreground">
                        {c.trip.price.toLocaleString("ar-EG")}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => removeItem(c.key)} aria-label="حذف">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>المجموع الفرعي</span>
                <span className="tabular">{subtotal.toLocaleString("ar-EG")}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-muted-foreground">
                <span>خصم</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setDiscount((d) => Math.max(0, d - 500))}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="tabular w-16 text-center font-semibold text-foreground">
                    {discount.toLocaleString("ar-EG")}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setDiscount((d) => d + 500)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-display text-base font-extrabold">
                <span>الإجمالي</span>
                <span className="tabular text-primary">{total.toLocaleString("ar-EG")}</span>
              </div>
            </div>

            <div className="mt-4">
              <Label className="mb-2 text-xs">طريقة الدفع</Label>
              <Select value={pay} onValueChange={(v) => setPay(v as PayMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <span className="flex items-center gap-2"><Banknote className="h-4 w-4" /> نقداً</span>
                  </SelectItem>
                  <SelectItem value="card">
                    <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> بطاقة</span>
                  </SelectItem>
                  <SelectItem value="mobile">
                    <span className="flex items-center gap-2"><Smartphone className="h-4 w-4" /> محفظة إلكترونية</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button className="mt-4 w-full" onClick={checkout} disabled={cart.length === 0}>
              إصدار التذاكر
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}