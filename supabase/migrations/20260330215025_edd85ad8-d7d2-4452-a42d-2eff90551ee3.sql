
-- Tighten INSERT policies to require at least authentication
DROP POLICY "System can insert transactions" ON public.transactions;
CREATE POLICY "Authenticated can insert transactions" ON public.transactions
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY "System can insert audit log" ON public.admin_audit_log;
CREATE POLICY "Authenticated can insert audit log" ON public.admin_audit_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- Also add admin view/update for profiles (needed for KYC review)
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
