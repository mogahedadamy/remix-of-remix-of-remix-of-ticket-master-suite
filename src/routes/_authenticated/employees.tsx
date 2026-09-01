import { PageHeader } from "@/components/layout/page-header";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCog, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgencyId } from "@/hooks/use-agency-id";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/employees")({
  head: () => ({
    meta: [
      { title: "الموظفون · TICKETTY" },
      { name: "description", content: "فريق الوكالة وصلاحيات كل موظف داخل النظام." },
      { property: "og:title", content: "الموظفون · TICKETTY" },
      { property: "og:description", content: "فريق الوكالة وصلاحيات كل موظف داخل النظام." },
    ],
  }),
  component: EmployeesPage,
});

type AppRole =
  | "owner"
  | "manager"
  | "cashier"
  | "accountant"
  | "supervisor"
  | "broker"
  | "inspector";

const ROLE_LABEL: Record<AppRole, string> = {
  owner: "مالك",
  manager: "مدير",
  cashier: "أمين صندوق",
  accountant: "محاسب",
  supervisor: "مشرف",
  broker: "وكيل",
  inspector: "مفتش",
};

const ROLES = Object.keys(ROLE_LABEL) as AppRole[];

type Member = {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  roles: AppRole[];
};

function EmployeesPage() {
  const qc = useQueryClient();
  const { data: agencyId } = useAgencyId();

  const { data: members, isLoading } = useQuery({
    queryKey: ["employees", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, phone, created_at")
          .eq("agency_id", agencyId!)
          .order("created_at", { ascending: true }),
        supabase.from("user_roles").select("user_id, role").eq("agency_id", agencyId!),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      return (profiles ?? []).map((p) => ({
        ...p,
        roles: (roles ?? [])
          .filter((r) => r.user_id === p.id)
          .map((r) => r.role as AppRole),
      })) as Member[];
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      if (!agencyId) throw new Error("لم يتم تحديد الوكالة");
      const { error: delErr } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("agency_id", agencyId);
      if (delErr) throw delErr;
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role, agency_id: agencyId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("تم تحديث الصلاحية");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="الإدارة"
        title="الموظفون"
        subtitle="أعضاء فريق الوكالة وصلاحياتهم. ينضم الموظف بعد إنشاء حسابه من صفحة الدخول."
        icon={UserCog}
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : !members || members.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <UserCog className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-foreground">لا يوجد موظفون بعد</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              اطلب من زملائك إنشاء حساب، ثم امنحهم الصلاحية المناسبة من هنا.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-start">الاسم</th>
                <th className="px-4 py-3 text-start">الهاتف</th>
                <th className="px-4 py-3 text-start">تاريخ الانضمام</th>
                <th className="px-4 py-3 text-start">الصلاحية</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-semibold text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary text-[11px] font-bold text-primary-foreground">
                        {(m.full_name ?? "؟").slice(0, 1)}
                      </span>
                      {m.full_name || "بدون اسم"}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular text-muted-foreground">{m.phone || "—"}</td>
                  <td className="px-4 py-3 tabular text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString("ar-EG")}
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={m.roles[0] ?? ""}
                      onValueChange={(v) => setRole.mutate({ userId: m.id, role: v as AppRole })}
                    >
                      <SelectTrigger className="h-9 w-44">
                        <SelectValue placeholder="بدون صلاحية" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-gradient-soft p-4 text-xs text-muted-foreground shadow-card">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          الصلاحيات تتحكم بما يمكن للموظف الوصول إليه. صلاحية «مالك» تمنح تحكماً كاملاً بالوكالة
          والإعدادات.
        </p>
      </div>
    </div>
  );
}
