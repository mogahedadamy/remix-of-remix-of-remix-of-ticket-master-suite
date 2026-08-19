import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Agency = {
  id: string;
  name: string;
  logo_url: string | null;
  bus_image_url: string | null;
  bank_account: string | null;
  currency: string;
};

export function useAgency() {
  return useQuery({
    queryKey: ["agency"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencies")
        .select("id, name, logo_url, bus_image_url, bank_account, currency")
        .maybeSingle();
      if (error) throw error;
      return (data as Agency | null) ?? null;
    },
    staleTime: 5 * 60_000,
  });
}
