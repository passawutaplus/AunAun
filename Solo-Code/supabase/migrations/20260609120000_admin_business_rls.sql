-- Admin Mission Control: allow admins to SELECT cross-user business tables for KPI dashboards.

CREATE POLICY "Admins view all quotations"
  ON public.quotations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all finance incomes"
  ON public.finance_incomes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all finance expenses"
  ON public.finance_expenses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all finance subscriptions"
  ON public.finance_subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all saved clients"
  ON public.saved_clients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

NOTIFY pgrst, 'reload schema';
