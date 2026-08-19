
CREATE TYPE public.driver_status AS ENUM ('active','on_leave','inactive');

CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  license_number text,
  status public.driver_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members can view drivers" ON public.drivers FOR SELECT TO authenticated USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can insert drivers" ON public.drivers FOR INSERT TO authenticated WITH CHECK (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can update drivers" ON public.drivers FOR UPDATE TO authenticated USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can delete drivers" ON public.drivers FOR DELETE TO authenticated USING (agency_id = public.current_agency_id());
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.trips ADD COLUMN driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL;

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  category text NOT NULL,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  spent_at date NOT NULL DEFAULT current_date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members can view expenses" ON public.expenses FOR SELECT TO authenticated USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can update expenses" ON public.expenses FOR UPDATE TO authenticated USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can delete expenses" ON public.expenses FOR DELETE TO authenticated USING (agency_id = public.current_agency_id());
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
