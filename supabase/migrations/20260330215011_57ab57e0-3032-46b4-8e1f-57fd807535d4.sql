
-- ============================================
-- BLUESTREAM WALLET — FULL DATABASE SCHEMA
-- ============================================

-- 1. ENUM TYPES
CREATE TYPE public.kyc_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.wallet_status AS ENUM ('active', 'frozen', 'suspended');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'success', 'failed', 'reversed');
CREATE TYPE public.transaction_type AS ENUM ('transfer', 'deposit', 'withdrawal', 'airtime', 'exchange', 'statement', 'fee', 'admin_credit', 'admin_debit');
CREATE TYPE public.notification_type AS ENUM ('in_app', 'sms');
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  country TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  avatar_url TEXT,
  pin_hash TEXT,
  pin_set BOOLEAN NOT NULL DEFAULT false,
  kyc_status public.kyc_status NOT NULL DEFAULT 'pending',
  kyc_rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. USER ROLES TABLE
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 5. KYC DOCUMENTS TABLE
CREATE TABLE public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id_front_url TEXT,
  id_back_url TEXT,
  selfie_url TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own KYC docs" ON public.kyc_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own KYC docs" ON public.kyc_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own KYC docs" ON public.kyc_documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all KYC docs" ON public.kyc_documents
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update KYC docs" ON public.kyc_documents
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- 6. WALLETS TABLE
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_number TEXT NOT NULL UNIQUE,
  balance DECIMAL(18, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  currency TEXT NOT NULL DEFAULT 'KES',
  status public.wallet_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets" ON public.wallets
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update wallets" ON public.wallets
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. TRANSACTIONS TABLE
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  type public.transaction_type NOT NULL,
  amount DECIMAL(18, 2) NOT NULL CHECK (amount > 0),
  fee DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL,
  sender_wallet_id UUID REFERENCES public.wallets(id),
  receiver_wallet_id UUID REFERENCES public.wallets(id),
  phone_number TEXT,
  status public.transaction_status NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  description TEXT,
  reversed_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES auth.users(id),
  reversal_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (
    sender_wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
    OR receiver_wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can view all transactions" ON public.transactions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update transactions" ON public.transactions
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- System can insert transactions (via edge functions with service role)
CREATE POLICY "System can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (true);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL DEFAULT 'in_app',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- 9. ADMIN CONFIG TABLE (fees, rates, etc.)
CREATE TABLE public.admin_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read config" ON public.admin_config
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage config" ON public.admin_config
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_admin_config_updated_at
  BEFORE UPDATE ON public.admin_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. ADMIN AUDIT LOG
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log" ON public.admin_audit_log
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit log" ON public.admin_audit_log
  FOR INSERT WITH CHECK (true);

-- 11. WALLET NUMBER GENERATOR FUNCTION
CREATE OR REPLACE FUNCTION public.generate_wallet_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    new_number := 'BLU' || LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0');
    SELECT EXISTS(SELECT 1 FROM public.wallets WHERE wallet_number = new_number) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN new_number;
END;
$$;

-- 12. TRANSACTION REFERENCE GENERATOR
CREATE OR REPLACE FUNCTION public.generate_transaction_reference(prefix TEXT DEFAULT 'TXN')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_ref TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    new_ref := prefix || TO_CHAR(now(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.transactions WHERE reference = new_ref) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN new_ref;
END;
$$;

-- 13. KYC APPROVAL FUNCTION (creates wallet on approval)
CREATE OR REPLACE FUNCTION public.approve_kyc(
  _user_id UUID,
  _admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _currency TEXT;
  _wallet_number TEXT;
BEGIN
  -- Get user currency
  SELECT currency INTO _currency FROM public.profiles WHERE user_id = _user_id;
  
  -- Update KYC status
  UPDATE public.profiles SET kyc_status = 'approved' WHERE user_id = _user_id;
  
  -- Update KYC document review
  UPDATE public.kyc_documents SET reviewed_at = now(), reviewed_by = _admin_id WHERE user_id = _user_id;
  
  -- Generate wallet number
  _wallet_number := public.generate_wallet_number();
  
  -- Create wallet
  INSERT INTO public.wallets (user_id, wallet_number, currency)
  VALUES (_user_id, _wallet_number, _currency);
  
  -- Create notification
  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  VALUES (
    _user_id,
    'in_app',
    'KYC Approved',
    'Your KYC has been approved! Your wallet number is ' || _wallet_number,
    jsonb_build_object('wallet_number', _wallet_number)
  );
  
  -- Audit log
  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, details)
  VALUES (_admin_id, 'kyc_approved', 'profiles', _user_id, jsonb_build_object('wallet_number', _wallet_number));
END;
$$;

-- 14. KYC REJECTION FUNCTION
CREATE OR REPLACE FUNCTION public.reject_kyc(
  _user_id UUID,
  _admin_id UUID,
  _reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET kyc_status = 'rejected', kyc_rejection_reason = _reason WHERE user_id = _user_id;
  UPDATE public.kyc_documents SET reviewed_at = now(), reviewed_by = _admin_id WHERE user_id = _user_id;
  
  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  VALUES (_user_id, 'in_app', 'KYC Rejected', 'Your KYC was rejected: ' || _reason, jsonb_build_object('reason', _reason));
  
  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, details)
  VALUES (_admin_id, 'kyc_rejected', 'profiles', _user_id, jsonb_build_object('reason', _reason));
END;
$$;

-- 15. PROFILE CREATION TRIGGER (auto-create on signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, phone_number, country, currency)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'country', ''),
    COALESCE(NEW.raw_user_meta_data->>'currency', 'KES')
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 16. DEFAULT ADMIN CONFIG (fees, rates)
INSERT INTO public.admin_config (key, value, description) VALUES
  ('transfer_fee_percent', '1.5', 'Percentage fee for wallet-to-wallet transfers'),
  ('transfer_fee_min', '10', 'Minimum transfer fee in base currency'),
  ('withdrawal_fee_percent', '2.0', 'Percentage fee for withdrawals'),
  ('withdrawal_fee_min', '15', 'Minimum withdrawal fee'),
  ('airtime_commission_percent', '5.0', 'Airtime purchase commission percentage'),
  ('exchange_fee_percent', '2.5', 'Currency exchange fee percentage'),
  ('statement_fee', '50', 'Fee for downloading statement (KES)'),
  ('sms_charge', '0.50', 'SMS notification charge per message'),
  ('exchange_rates', '{"KES_USD": 0.0065, "USD_KES": 153.50, "KES_EUR": 0.006, "EUR_KES": 167.00}', 'Exchange rates'),
  ('airtime_networks', '["Safaricom", "Airtel", "Telkom"]', 'Supported airtime networks');

-- 17. KYC STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false);

CREATE POLICY "Users can upload own KYC files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own KYC files" ON storage.objects
  FOR SELECT USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all KYC files" ON storage.objects
  FOR SELECT USING (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(), 'admin'));

-- 18. INDEXES FOR PERFORMANCE
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_kyc_status ON public.profiles(kyc_status);
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_wallets_wallet_number ON public.wallets(wallet_number);
CREATE INDEX idx_transactions_sender ON public.transactions(sender_wallet_id);
CREATE INDEX idx_transactions_receiver ON public.transactions(receiver_wallet_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
