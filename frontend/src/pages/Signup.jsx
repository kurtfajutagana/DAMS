import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bookingDraft, setBookingDraft] = useState(null);

  const { signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedDraft = localStorage.getItem("pendingBookingDraft");
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setBookingDraft(parsed);
        if (parsed.firstName) setFirstName(parsed.firstName);
        if (parsed.lastName) setLastName(parsed.lastName);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.phone) setPhone(parsed.phone);
      } catch (e) {
        console.error("Failed to parse booking draft", e);
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await signup(email, password, {
        first_name: firstName,
        last_name: lastName,
        contact_number: phone || bookingDraft?.phone || "",
        role: "patient",
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user) {
        try {
          const response = await fetch("http://localhost:8000/api/auth/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, user_id: data.user.id })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || "Failed to send OTP from backend");
          }

          toast.success("Verification code sent to your email!");
          navigate("/verify-otp", { state: { email: email, userId: data.user.id } });
        } catch (err) {
          toast.error("Failed to send OTP: " + err.message);
          navigate("/verify-otp", { state: { email: email, userId: data.user.id } });
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side: Form */}
      <div className="flex w-full flex-col justify-center px-8 sm:px-16 md:w-1/2 lg:px-24">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <Link to="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground -mt-8 mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
          <div className="space-y-2 text-center md:text-left">
            <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
            <p className="text-muted-foreground">
              {bookingDraft ? "Set up your password to confirm & link your appointment" : "Enter your details to register for the patient portal"}
            </p>
          </div>

          {bookingDraft && (
            <div className="p-3 bg-teal-50 dark:bg-teal-950/60 rounded-xl border border-teal-200 dark:border-teal-800 text-sm space-y-1">
              <div className="flex items-center justify-between font-bold text-teal-800 dark:text-teal-300">
                <span>📌 Booking Draft Attached</span>
                <span className="text-[10px] bg-teal-600 text-white px-2 py-0.5 rounded font-semibold uppercase">Pending</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200">
                <strong>{bookingDraft.service}</strong> ({bookingDraft.branch?.toUpperCase()} Branch)
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                📅 Date: {bookingDraft.date} | ⏰ Time: {bookingDraft.time}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Juan"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Dela Cruz"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Mobile Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="0917 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && (
                <p className={`text-xs ${password === confirmPassword ? "text-emerald-600 font-semibold" : "text-destructive font-semibold"}`}>
                  {password === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                </p>
              )}
            </div>

            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Sign up"}
            </Button>
          </form>

          <div className="text-center text-sm">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Right side: Image */}
      <div className="hidden bg-muted md:block md:w-1/2">
        <img
          src="/login-bg.png"
          alt="Dental Clinic Aesthetic"
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
