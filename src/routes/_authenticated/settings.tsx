import { PageHeader } from "@/components/layout/page-header";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/use-agency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "إعدادات الوكالة · TICKETTY" },
      { name: "description", content: "بيانات الوكالة والعملة والحساب البنكي والشعار." },
      { property: "og:title", content: "إعدادات الوكالة · TICKETTY" },
      { property: "og:description", content: "بيانات الوكالة والعملة والحساب البنكي والشعار." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data: agency, isLoading } = useAgency();

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("SDG");
  const [bank, setBank] = useState("");
  const [logo, setLogo] = useState("");
  const [busImage, setBusImage] = useState("");

  useEffect(() => {
    if (!agency) return;
    setName(agency.name ?? "");
    setCurrency(agency.currency ?? "SDG");
    setBank(agency.bank_account ?? "");
    setLogo(agency.logo_url ?? "");
    setBusImage(agency.bus_image_url ?? "");
  }, [agency]);

  const save = useMutation({
    mutationFn: async () => {
      if (!agency?.id) throw new Error("لم يتم تحديد الوكالة");
      const { error } = await supabase
        .from("agencies")
        .update({
          name: name.trim(),
          currency: currency.trim() || "SDG",
          bank_account: bank.trim() || null,
          logo_url: logo.trim() || null,
          bus_image_url: busImage.trim() || null,
        })
        .eq("id", agency.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agency"] });
      toast.success("تم حفظ الإعدادات");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="النظام"
        title="إعدادات الوكالة"
        subtitle="بيانات الوكالة التي تظهر على التذاكر والتقارير."
        icon={SettingsIcon}
        actions={
          <Button onClick={() => save.mutate()} disabled={save.isPending || !agency}>
            {save.isPending ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-2 h-4 w-4" />
            )}
            حفظ
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-border bg-card py-24 shadow-card">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-2">
            <h2 className="font-display text-sm font-extrabold text-foreground">البيانات الأساسية</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ag-name">اسم الوكالة</Label>
                <Input id="ag-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ag-cur">العملة</Label>
                <Input
                  id="ag-cur"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="SDG"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ag-bank">الحساب البنكي</Label>
                <Input
                  id="ag-bank"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  placeholder="اسم البنك ورقم الحساب"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ag-logo">رابط الشعار</Label>
                <Input id="ag-logo" value={logo} onChange={(e) => setLogo(e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ag-bus">رابط صورة الحافلة</Label>
                <Input
                  id="ag-bus"
                  value={busImage}
                  onChange={(e) => setBusImage(e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-gradient-soft p-5 shadow-card">
            <h2 className="font-display text-sm font-extrabold text-foreground">معاينة</h2>
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                {logo ? (
                  <img
                    src={logo}
                    alt="شعار الوكالة"
                    className="h-12 w-12 rounded-xl object-contain"
                  />
                ) : (
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                    <SettingsIcon className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <p className="font-display text-sm font-extrabold text-foreground">
                    {name || "اسم الوكالة"}
                  </p>
                  <p className="tabular text-[11px] text-muted-foreground">العملة: {currency}</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">{bank || "لا يوجد حساب بنكي"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
