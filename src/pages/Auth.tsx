import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Globe, ChevronDown, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Registration fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // Country selection
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: countries } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const { data } = await supabase
        .from("countries")
        .select("*")
        .order("name");
      return data ?? [];
    },
  });

  const filteredCountries = useMemo(() => {
    if (!countries) return [];
    if (!countrySearch) return countries;
    const q = countrySearch.toLowerCase();
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.iso_code.toLowerCase().includes(q) ||
        c.phone_code.includes(q) ||
        c.currency_code.toLowerCase().includes(q)
    );
  }, [countries, countrySearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-fill phone code when country selected
  useEffect(() => {
    if (selectedCountry && !phone) {
      setPhone(selectedCountry.phone_code);
    }
  }, [selectedCountry]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back!");
      navigate("/");
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !selectedCountry) {
      toast.error("Please fill all fields and select a country");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "https://abanremit.com/login?verified=true",
        data: {
          full_name: fullName,
          phone_number: phone,
          country: selectedCountry.name,
          currency: selectedCountry.currency_code,
        },
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! Check your email to verify.");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="gradient-primary flex h-14 w-14 items-center justify-center rounded-2xl shadow-card">
            <Globe className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">AbanRemit</h1>
          <p className="text-sm text-muted-foreground">Global Digital Wallet</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex rounded-xl bg-muted p-1">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              isLogin ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              !isLogin ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required />
              </div>

              {/* Country Searchable Dropdown */}
              <div className="space-y-1.5" ref={dropdownRef}>
                <Label>Country</Label>
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {selectedCountry ? (
                    <span className="flex items-center gap-2">
                      <span>{selectedCountry.flag_emoji}</span>
                      <span>{selectedCountry.name}</span>
                      <span className="text-muted-foreground">({selectedCountry.currency_code})</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select your country</span>
                  )}
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>

                {showCountryDropdown && (
                  <div className="absolute z-50 mt-1 w-[calc(100%-2rem)] max-w-sm rounded-xl border bg-card shadow-elevated">
                    <div className="flex items-center gap-2 border-b px-3 py-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        placeholder="Search country..."
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        autoFocus
                      />
                      {countrySearch && (
                        <button type="button" onClick={() => setCountrySearch("")}>
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    <div className="max-h-48 overflow-y-auto py-1">
                      {filteredCountries.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCountry(c);
                            setShowCountryDropdown(false);
                            setCountrySearch("");
                          }}
                          className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted ${
                            selectedCountry?.id === c.id ? "bg-primary/5 text-primary" : ""
                          }`}
                        >
                          <span className="text-base">{c.flag_emoji}</span>
                          <span className="flex-1 text-left">{c.name}</span>
                          <span className="text-xs text-muted-foreground">{c.phone_code}</span>
                          <span className="text-xs font-medium text-muted-foreground">{c.currency_code}</span>
                        </button>
                      ))}
                      {filteredCountries.length === 0 && (
                        <p className="px-3 py-4 text-center text-xs text-muted-foreground">No countries found</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={selectedCountry ? `${selectedCountry.phone_code}...` : "+1234567890"}
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Powered by AbanRemit · Secure Global Payments
        </p>
      </div>
    </div>
  );
};

export default Auth;
