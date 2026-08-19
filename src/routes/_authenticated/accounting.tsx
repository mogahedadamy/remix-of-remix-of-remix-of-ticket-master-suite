import { PageHeader } from "@/components/layout/page-header";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Wallet, Plus, Trash2, Loader2, TrendingUp, TrendingDown, Scale } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgencyId } from "@/hooks/use-agency-id";
import { useAgency } from "@/hooks/use-agency";
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

export const Route = createFileRoute("/_authenticated/accounting")({
  head: () => ({
    meta: [
      { title: "المحاسبة · TICKETTY" },
      { name: "description", content: "الإيرادات والمصروفات وصافي الربح للوكالة." },
      { property: "og:title", content: "المحاسبة · TICKETTY" },
      { property: "og:description", content: "الإيرادات والمصروفات وصافي الربح للوكالة." },
    ],
  }),
  component: AccountingPage,
});

const CATEGORIES = ["وقود", "صيانة", "رواتب", "رسوم وتراخيص", "أخرى"] as const;

type Expense = {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  spent_at: string;
  trip_id: string | null;
};

function AccountingPage() {
  const qc = useQueryClient();
  const { data: agencyId } = useAgencyId();
  const { data: agency } = useAgency();
  const currency = agency?.currency ?? "SDG";
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["accounting"],
    queryFn: async () => {
      const [exp, bookings] = await Promise.all([
        supabase
          .from("expenses")
          .select("id, category, description, amount, spent_at, trip_id")
          .order("spent_at", { ascending: false }),
        supabase.from("bookings").select("amount, status, created_at"),
      ]);
      if (exp.error) throw exp.error;
      if (bookings.error) throw bookings.error;
      const expenses = (exp.data ?? []) as Expense[];
      const revenue = (bookings.data ?? [])
        .filter((b) => b.status === "confirmed")
        .reduce((s, b) => s + Number(b.amount || 0), 0);
      const spent = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
      const byCategory = CATEGORIES.map((c) => ({
        category: c,
        total: expenses
          .filter((e) => e.category === c)
          .reduce((s, e) => s + Number(e.amount || 0), 0),
      })).filter((r) => r.total > 0);
      return { expenses, revenue, spent, net: revenue - spent, byCategory };
    },
  });

  const addExpense = useMutation({
    mutationFn: async (form: Omit<Expense, "id" | "trip_id">) => {
      if (!agencyId) throw new Error("لم يتم تحديد الوكالة");
      const { error } = await supabase.from("expenses").insert({
        agency_id: agencyId,
        category: form.category,
        description: form.description,
        amount: form.amount,
        spent_at: form.spent_at,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounting"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      setOpen(false);
      toast.success("تم تسجيل المصروف");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounting"] });
      toast.success("تم الحذف");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fmt = (n: number) => `${n.toLocaleString("ar-EG")} ${currency}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="المالية"
        title="المحاسبة"
        subtitle="تابع الإيرادات من الحجوزات وسجّل المصروفات لمعرفة صافي الربح."
        icon={Wallet}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="me-2 h-4 w-4" />
                تسجيل مصروف
              </Button>
            </DialogTrigger>
            <ExpenseDialog
              onSubmit={(f) => addExpense.mutate(f)}
              submitting={addExpense.isPending}
            />
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="إجمالي الإيرادات"
          value={fmt(data?.revenue ?? 0)}
          icon={TrendingUp}
          tone="text-success"
        />
        <SummaryCard
          label="إجمالي المصروفات"
          value={fmt(data?.spent ?? 0)}
          icon={TrendingDown}
          tone="text-destructive"
        />
        <SummaryCard
          label="صافي الربح"
          value={fmt(data?.net ?? 0)}
          icon={Scale}
          tone={(data?.net ?? 0) >= 0 ? "text-primary" : "text-destructive"}
        />
      </div>

      {data && data.byCategory.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="mb-4 text-sm font-bold text-foreground">المصروفات حسب البند</p>
          <div className="space-y-3">
            {data.byCategory.map((c) => {
              const pct = data.spent ? (c.total / data.spent) * 100 : 0;
              return (
                <div key={c.category}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{c.category}</span>
                    <span className="tabular text-muted-foreground">{fmt(c.total)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : !data || data.expenses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Wallet className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-foreground">لا توجد مصروفات مسجّلة</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-start">التاريخ</th>
                <th className="px-4 py-3 text-start">البند</th>
                <th className="px-4 py-3 text-start">الوصف</th>
                <th className="px-4 py-3 text-start">المبلغ</th>
                <th className="px-4 py-3 text-end">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {data.expenses.map((e) => (
                <tr key={e.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 tabular text-muted-foreground">{e.spent_at}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{e.category}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.description || "—"}</td>
                  <td className="px-4 py-3 tabular font-bold text-foreground">
                    {fmt(Number(e.amount))}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove.mutate(e.id)}
                      aria-label="حذف"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <p className={`mt-2 tabular text-2xl font-extrabold ${tone}`}>{value}</p>
    </div>
  );
}

function ExpenseDialog({
  onSubmit,
  submitting,
}: {
  onSubmit: (f: Omit<Expense, "id" | "trip_id">) => void;
  submitting: boolean;
}) {
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>تسجيل مصروف</DialogTitle>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!amount || amount <= 0) return toast.error("أدخل مبلغاً صحيحاً");
          onSubmit({
            category,
            description: description.trim() || null,
            amount: Number(amount),
            spent_at: date,
          });
        }}
      >
        <div className="space-y-2">
          <Label>البند</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="amt">المبلغ *</Label>
            <Input
              id="amt"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">التاريخ</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">الوصف</Label>
          <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            حفظ
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
