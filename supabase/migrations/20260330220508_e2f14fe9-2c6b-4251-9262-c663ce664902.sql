
-- ============================================
-- ABANREMIT — COUNTRIES + LEDGER + EXCHANGE RATES
-- ============================================

-- 1. COUNTRIES TABLE
CREATE TABLE public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  iso_code TEXT NOT NULL UNIQUE,
  phone_code TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  currency_name TEXT NOT NULL,
  flag_emoji TEXT NOT NULL DEFAULT '🏳️'
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read countries" ON public.countries FOR SELECT USING (true);

-- 2. EXCHANGE RATES TABLE
CREATE TABLE public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate DECIMAL(18, 8) NOT NULL CHECK (rate > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE (base_currency, target_currency)
);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read exchange rates" ON public.exchange_rates FOR SELECT USING (true);
CREATE POLICY "Admins can manage exchange rates" ON public.exchange_rates FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_exchange_rates_updated_at
  BEFORE UPDATE ON public.exchange_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. LEDGER TABLE (DOUBLE-ENTRY)
CREATE TYPE public.ledger_entry_type AS ENUM ('debit', 'credit');

CREATE TABLE public.ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  transaction_id UUID REFERENCES public.transactions(id),
  entry_type public.ledger_entry_type NOT NULL,
  amount DECIMAL(18, 2) NOT NULL CHECK (amount > 0),
  balance_before DECIMAL(18, 2) NOT NULL,
  balance_after DECIMAL(18, 2) NOT NULL,
  currency TEXT NOT NULL,
  reference TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ledger" ON public.ledger
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all ledger entries" ON public.ledger
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can insert ledger" ON public.ledger
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_ledger_user_id ON public.ledger(user_id);
CREATE INDEX idx_ledger_wallet_id ON public.ledger(wallet_id);
CREATE INDEX idx_ledger_transaction_id ON public.ledger(transaction_id);
CREATE INDEX idx_ledger_created_at ON public.ledger(created_at);
CREATE INDEX idx_countries_iso ON public.countries(iso_code);
CREATE INDEX idx_exchange_rates_pair ON public.exchange_rates(base_currency, target_currency);

-- 4. SEED COUNTRIES (GLOBAL)
INSERT INTO public.countries (name, iso_code, phone_code, currency_code, currency_name, flag_emoji) VALUES
-- Africa
('Kenya', 'KE', '+254', 'KES', 'Kenyan Shilling', '🇰🇪'),
('Nigeria', 'NG', '+234', 'NGN', 'Nigerian Naira', '🇳🇬'),
('South Africa', 'ZA', '+27', 'ZAR', 'South African Rand', '🇿🇦'),
('Ghana', 'GH', '+233', 'GHS', 'Ghanaian Cedi', '🇬🇭'),
('Uganda', 'UG', '+256', 'UGX', 'Ugandan Shilling', '🇺🇬'),
('Tanzania', 'TZ', '+255', 'TZS', 'Tanzanian Shilling', '🇹🇿'),
('Rwanda', 'RW', '+250', 'RWF', 'Rwandan Franc', '🇷🇼'),
('Ethiopia', 'ET', '+251', 'ETB', 'Ethiopian Birr', '🇪🇹'),
('Egypt', 'EG', '+20', 'EGP', 'Egyptian Pound', '🇪🇬'),
('Morocco', 'MA', '+212', 'MAD', 'Moroccan Dirham', '🇲🇦'),
('Senegal', 'SN', '+221', 'XOF', 'CFA Franc', '🇸🇳'),
('Cameroon', 'CM', '+237', 'XAF', 'Central African CFA', '🇨🇲'),
('Ivory Coast', 'CI', '+225', 'XOF', 'CFA Franc', '🇨🇮'),
('Zambia', 'ZM', '+260', 'ZMW', 'Zambian Kwacha', '🇿🇲'),
('Zimbabwe', 'ZW', '+263', 'ZWL', 'Zimbabwean Dollar', '🇿🇼'),
('Botswana', 'BW', '+267', 'BWP', 'Botswana Pula', '🇧🇼'),
('Mozambique', 'MZ', '+258', 'MZN', 'Mozambican Metical', '🇲🇿'),
('Madagascar', 'MG', '+261', 'MGA', 'Malagasy Ariary', '🇲🇬'),
('Malawi', 'MW', '+265', 'MWK', 'Malawian Kwacha', '🇲🇼'),
('Congo (DRC)', 'CD', '+243', 'CDF', 'Congolese Franc', '🇨🇩'),
-- Middle East
('Qatar', 'QA', '+974', 'QAR', 'Qatari Riyal', '🇶🇦'),
('Saudi Arabia', 'SA', '+966', 'SAR', 'Saudi Riyal', '🇸🇦'),
('United Arab Emirates', 'AE', '+971', 'AED', 'UAE Dirham', '🇦🇪'),
('Kuwait', 'KW', '+965', 'KWD', 'Kuwaiti Dinar', '🇰🇼'),
('Bahrain', 'BH', '+973', 'BHD', 'Bahraini Dinar', '🇧🇭'),
('Oman', 'OM', '+968', 'OMR', 'Omani Rial', '🇴🇲'),
('Jordan', 'JO', '+962', 'JOD', 'Jordanian Dinar', '🇯🇴'),
('Lebanon', 'LB', '+961', 'LBP', 'Lebanese Pound', '🇱🇧'),
('Iraq', 'IQ', '+964', 'IQD', 'Iraqi Dinar', '🇮🇶'),
('Turkey', 'TR', '+90', 'TRY', 'Turkish Lira', '🇹🇷'),
('Israel', 'IL', '+972', 'ILS', 'Israeli Shekel', '🇮🇱'),
-- Europe
('United Kingdom', 'GB', '+44', 'GBP', 'British Pound', '🇬🇧'),
('Germany', 'DE', '+49', 'EUR', 'Euro', '🇩🇪'),
('France', 'FR', '+33', 'EUR', 'Euro', '🇫🇷'),
('Italy', 'IT', '+39', 'EUR', 'Euro', '🇮🇹'),
('Spain', 'ES', '+34', 'EUR', 'Euro', '🇪🇸'),
('Netherlands', 'NL', '+31', 'EUR', 'Euro', '🇳🇱'),
('Belgium', 'BE', '+32', 'EUR', 'Euro', '🇧🇪'),
('Switzerland', 'CH', '+41', 'CHF', 'Swiss Franc', '🇨🇭'),
('Sweden', 'SE', '+46', 'SEK', 'Swedish Krona', '🇸🇪'),
('Norway', 'NO', '+47', 'NOK', 'Norwegian Krone', '🇳🇴'),
('Denmark', 'DK', '+45', 'DKK', 'Danish Krone', '🇩🇰'),
('Poland', 'PL', '+48', 'PLN', 'Polish Zloty', '🇵🇱'),
('Portugal', 'PT', '+351', 'EUR', 'Euro', '🇵🇹'),
('Ireland', 'IE', '+353', 'EUR', 'Euro', '🇮🇪'),
('Austria', 'AT', '+43', 'EUR', 'Euro', '🇦🇹'),
-- Americas
('United States', 'US', '+1', 'USD', 'US Dollar', '🇺🇸'),
('Canada', 'CA', '+1', 'CAD', 'Canadian Dollar', '🇨🇦'),
('Mexico', 'MX', '+52', 'MXN', 'Mexican Peso', '🇲🇽'),
('Brazil', 'BR', '+55', 'BRL', 'Brazilian Real', '🇧🇷'),
('Argentina', 'AR', '+54', 'ARS', 'Argentine Peso', '🇦🇷'),
('Colombia', 'CO', '+57', 'COP', 'Colombian Peso', '🇨🇴'),
('Chile', 'CL', '+56', 'CLP', 'Chilean Peso', '🇨🇱'),
('Peru', 'PE', '+51', 'PEN', 'Peruvian Sol', '🇵🇪'),
-- Asia
('India', 'IN', '+91', 'INR', 'Indian Rupee', '🇮🇳'),
('China', 'CN', '+86', 'CNY', 'Chinese Yuan', '🇨🇳'),
('Japan', 'JP', '+81', 'JPY', 'Japanese Yen', '🇯🇵'),
('South Korea', 'KR', '+82', 'KRW', 'South Korean Won', '🇰🇷'),
('Indonesia', 'ID', '+62', 'IDR', 'Indonesian Rupiah', '🇮🇩'),
('Philippines', 'PH', '+63', 'PHP', 'Philippine Peso', '🇵🇭'),
('Malaysia', 'MY', '+60', 'MYR', 'Malaysian Ringgit', '🇲🇾'),
('Singapore', 'SG', '+65', 'SGD', 'Singapore Dollar', '🇸🇬'),
('Thailand', 'TH', '+66', 'THB', 'Thai Baht', '🇹🇭'),
('Vietnam', 'VN', '+84', 'VND', 'Vietnamese Dong', '🇻🇳'),
('Pakistan', 'PK', '+92', 'PKR', 'Pakistani Rupee', '🇵🇰'),
('Bangladesh', 'BD', '+880', 'BDT', 'Bangladeshi Taka', '🇧🇩'),
('Sri Lanka', 'LK', '+94', 'LKR', 'Sri Lankan Rupee', '🇱🇰'),
('Nepal', 'NP', '+977', 'NPR', 'Nepalese Rupee', '🇳🇵'),
-- Oceania
('Australia', 'AU', '+61', 'AUD', 'Australian Dollar', '🇦🇺'),
('New Zealand', 'NZ', '+64', 'NZD', 'New Zealand Dollar', '🇳🇿');

-- 5. SEED EXCHANGE RATES (common pairs, admin can update)
INSERT INTO public.exchange_rates (base_currency, target_currency, rate) VALUES
('USD', 'KES', 153.50),
('KES', 'USD', 0.00651),
('USD', 'GBP', 0.79),
('GBP', 'USD', 1.27),
('USD', 'EUR', 0.92),
('EUR', 'USD', 1.09),
('USD', 'QAR', 3.64),
('QAR', 'USD', 0.2747),
('USD', 'SAR', 3.75),
('SAR', 'USD', 0.2667),
('USD', 'AED', 3.67),
('AED', 'USD', 0.2725),
('USD', 'NGN', 1550.00),
('NGN', 'USD', 0.000645),
('USD', 'ZAR', 18.50),
('ZAR', 'USD', 0.054),
('USD', 'GHS', 15.20),
('GHS', 'USD', 0.0658),
('USD', 'UGX', 3780.00),
('UGX', 'USD', 0.000265),
('USD', 'INR', 83.50),
('INR', 'USD', 0.012),
('GBP', 'KES', 194.50),
('KES', 'GBP', 0.00514),
('EUR', 'KES', 167.00),
('KES', 'EUR', 0.00599);
