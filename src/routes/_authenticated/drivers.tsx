import { PageHeader } from "@/components/layout/page-header";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Users, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgencyId } from "@/hooks/use-agency-id";
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

export const Route = createFileRoute("/_authenticated/drivers")({
  head: () => ({
    meta: [
      { title: "السائقون · TICKETTY" },
      { name: "description", content: "إدارة سائقي الوكالة وربطهم بالرحلات." },
      { property: "og:title", content: "السائقون · TICKETTY" },
      { property: "og:description", content: "إدارة سائقي الوكالة وربطهم بالرحلات." },
    ],
  }),
  component: DriversPage,
});

type DriverStatus = "active" | "on_leave" | "inactive";
type Driver = {
  id: string;
  full_name: string;
  phone: string | null;
  license_number: string | null;
  status: DriverStatus;
};

const STATUS_LABEL: Record<DriverStatus, string> = {
  active: "متاح",
  on_leave: "إجازة",
  inactive: "غير نشط",
};
const STATUS_TONE: Record<DriverStatus, string> = {
  active: "bg-success/15 text-success",
  on_leave: "bg-warning/20 text-warning-foreground",
  inactive: "bg-muted text-muted-foreground",
};

function DriversPage() {
  const qc = useQueryClient();
  const { data: agencyId } = useAgencyId();
  const [editing, setEditing] = useState<Driver | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Driver | null>(null);

  const { data: drivers, isLoading } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, full_name, phone, license_number, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Driver[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (form: Omit<Driver, "id"> & { id?: string }) => {
      if (form.id) {
        const { error } = await supabase
          .from("drivers")
          .update({
            full_name: form.full_name,
            phone: form.phone,
            license_number: form.license_number,
            status: form.status,
          })
          .eq("id", form.id);
        if (error) throw error;
      } else {
        if (!agencyId) throw new Error("لم يتم تحديد الوكالة");
        const { error } = await supabase.from("drivers").insert({
          agency_id: agencyId,
          full_name: form.full_name,
          phone: form.phone,
          license_number: form.license_number,
          status: form.status,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drivers"] });
      setDialogOpen(false);
      setEditing(null);
      toast.success("تم الحفظ");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("drivers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drivers"] });
      setConfirmDelete(null);
      toast.success("تم الحذف");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="الأسطول"
        title="السائقون"
        subtitle="سجّل بيانات السائقين وحالتهم، ثم اربطهم بالرحلات من صفحة الرحلات."
        icon={Users}
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
                إضافة سائق
              </Button>
            </DialogTrigger>
            <DriverFormDialog
              key={editing?.id ?? "new"}
              initial={editing}
              onSubmit={(f) => upsert.mutate(f)}
              submitting={upsert.isPending}
            />
          </Dialog>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : !drivers || drivers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-foreground">لا يوجد سائقون بعد</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              أضف أول سائق لتتمكن من إسناده إلى الرحلات.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-start">الاسم</th>
                <th className="px-4 py-3 text-start">الهاتف</th>
                <th className="px-4 py-3 text-start">رقم الرخصة</th>
                <th className="px-4 py-3 text-start">الحالة</th>
                <th className="px-4 py-3 text-end">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-semibold text-foreground">{d.full_name}</td>
                  <td className="px-4 py-3 tabular text-muted-foreground">{d.phone || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.license_number || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[d.status]}`}
                    >
                      {STATUS_LABEL[d.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <div className="inline-flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(d);
                          setDialogOpen(true);
                        }}
                        aria-label="تعديل"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDelete(d)}
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
        )}
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف السائق؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف «{confirmDelete?.full_name}» وإلغاء إسناده من الرحلات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && remove.mutate(confirmDelete.id)}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DriverFormDialog({
  initial,
  onSubmit,
  submitting,
}: {
  initial: Driver | null;
  onSubmit: (f: Omit<Driver, "id"> & { id?: string }) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(initial?.full_name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [license, setLicense] = useState(initial?.license_number ?? "");
  const [status, setStatus] = useState<DriverStatus>(initial?.status ?? "active");

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{initial ? "تعديل السائق" : "إضافة سائق"}</DialogTitle>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return toast.error("الاسم مطلوب");
          onSubmit({
            id: initial?.id,
            full_name: name.trim(),
            phone: phone.trim() || null,
            license_number: license.trim() || null,
            status,
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="dname">الاسم *</Label>
          <Input id="dname" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="dphone">الهاتف</Label>
            <Input id="dphone" value={phone ?? ""} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dlic">رقم الرخصة</Label>
            <Input id="dlic" value={license ?? ""} onChange={(e) => setLicense(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>الحالة</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as DriverStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">متاح</SelectItem>
              <SelectItem value="on_leave">إجازة</SelectItem>
              <SelectItem value="inactive">غير نشط</SelectItem>
            </SelectContent>
          </Select>
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
