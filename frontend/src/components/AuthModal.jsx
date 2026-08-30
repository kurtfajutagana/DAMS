import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";

export default function AuthModal({ isOpen, initialMode = "login", onClose }) {
  const [mode, setMode] = useState(initialMode); // "login" | "signup"
  const [bookingDraft, setBookingDraft] = useState(null);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // Signup Form States
  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupLastName, setSignupLastName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);

  // Sync mode and booking draft during render when modal opens or initialMode changes
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [prevInitialMode, setPrevInitialMode] = useState(initialMode);

  if (isOpen !== prevIsOpen || initialMode !== prevInitialMode) {
    setPrevIsOpen(isOpen);
    setPrevInitialMode(initialMode);
    if (isOpen) {
      setMode(initialMode);
      const savedDraft = localStorage.getItem("pendingBookingDraft");
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setBookingDraft(parsed);
          if (parsed.firstName) setSignupFirstName(parsed.firstName);
          if (parsed.lastName) setSignupLastName(parsed.lastName);
          if (parsed.email) setSignupEmail(parsed.email);
          if (parsed.phone) setSignupPhone(parsed.phone);
        } catch (e) {
          console.error("Failed to parse booking draft", e);
        }
      }
    }
  }

  const { login, signup, session } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isOpen && session?.user) {
      const fetchRoleAndRedirect = async () => {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role, is_active, is_email_verified")
          .eq("id", session.user.id)
          .single();

        if (profileData && profileData.is_active === false) {
          await supabase.auth.signOut();
          toast.error("Your account has been disabled. Please contact the administrator.");
          return;
        }

        if (profileData && !profileData.is_email_verified) {
          navigate("/verify-otp", { state: { email: session.user.email, userId: session.user.id } });
          return;
        }

        const role = profileData?.role || "patient";

        switch (role) {
          case "admin":
            navigate("/admin/dashboard");
            break;
          case "dentist":
            navigate("/dentist/queue");
            break;
          case "receptionist":
            navigate("/staff/queue");
            break;
          case "patient":
          default:
            navigate("/patient/dashboard");
            break;
        }
      };

      fetchRoleAndRedirect();
    }
  }, [isOpen, session, navigate]);

  if (!isOpen) return null;

  // Handle Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoginLoading(true);

    try {
      const { data, error } = await login(loginEmail, loginPassword);

      if (error) {
        if (error.message.toLowerCase().includes("invalid login credentials")) {
          toast.error("Account not found. Switching to sign up...");
          setSignupEmail(loginEmail);
          setMode("signup");
          return;
        }
        toast.error(error.message);
        return;
      }

      if (data.user) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role, is_email_verified, is_active")
          .eq("id", data.user.id)
          .single();

        if (profileData && profileData.is_active === false) {
          await supabase.auth.signOut();
          toast.error("Your account has been disabled. Please contact the administrator.");
          setIsLoginLoading(false);
          return;
        }

        if (profileData && !profileData.is_email_verified) {
          toast.error("Please verify your email first.");
          try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/send-otp`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: data.user.email, user_id: data.user.id })
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.detail || "Failed to trigger OTP resend");
            }
          } catch (err) {
            console.error("Failed to trigger OTP resend", err);
            toast.error("Failed to send OTP: " + err.message);
          }
          if (onClose) onClose();
          navigate("/verify-otp", { state: { email: data.user.email, userId: data.user.id } });
          return;
        }

        toast.success("Successfully logged in!");
        if (onClose) onClose();

        if (profileError) {
          console.error("Error fetching profile role:", profileError);
          navigate("/patient/dashboard");
        } else {
          switch (profileData.role) {
            case "admin":
              navigate("/admin/dashboard");
              break;
            case "dentist":
              navigate("/dentist/queue");
              break;
            case "receptionist":
              navigate("/staff/queue");
              break;
            case "patient":
            default:
              navigate("/patient/dashboard");
              break;
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoginLoading(false);
    }
  };

  // Handle Signup Submit
  const handleSignupSubmit = async (e) => {
    e.preventDefault();

    if (signupPassword !== signupConfirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSignupLoading(true);

    try {
      const { data, error } = await signup(signupEmail, signupPassword, {
        first_name: signupFirstName,
        last_name: signupLastName,
        contact_number: signupPhone || bookingDraft?.phone || "",
        role: "patient",
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user) {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: signupEmail, user_id: data.user.id })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || "Failed to send OTP from backend");
          }

          toast.success("Verification code sent to your email!");
          if (onClose) onClose();
          navigate("/verify-otp", { state: { email: signupEmail, userId: data.user.id } });
        } catch (err) {
          toast.error("Failed to send OTP: " + err.message);
          if (onClose) onClose();
          navigate("/login");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSignupLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md smooth-backdrop"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl h-[600px] max-h-[92vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden relative flex flex-col md:flex-row my-auto smooth-modal-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-full shadow-sm border border-slate-200 dark:border-slate-700 smooth-transition hover:scale-110 active:scale-95"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left side: Form Panel with Ultra-Smooth Cross-Fade Key Transition */}
        <div className="w-full md:w-1/2 h-full p-8 sm:p-10 flex flex-col justify-center overflow-y-auto">
          <div
            key={mode}
            className="mx-auto w-full max-w-sm transition-all duration-300 ease-out animate-in fade-in slide-in-from-right-4"
          >
            {mode === "login" ? (
              /* LOGIN FORM PANEL */
              <div className="space-y-6">
                <header className="space-y-2 text-left">
                  <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Welcome back</h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Enter your credentials to access your account
                  </p>
                </header>

                <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
                  <div className="space-y-2">
                    <Label htmlFor="auth-login-email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email</Label>
                    <Input
                      id="auth-login-email"
                      type="email"
                      placeholder="m@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="h-11 rounded-xl border-slate-300 dark:border-slate-700 focus:ring-teal-500 text-sm smooth-transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auth-login-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Password</Label>
                      <Link to="#" className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline smooth-transition">
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="auth-login-password"
                        type={showLoginPassword ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        className="h-11 rounded-xl border-slate-300 dark:border-slate-700 focus:ring-teal-500 text-sm pr-10 smooth-transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 smooth-transition"
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoginLoading}
                    className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm shadow-md smooth-transition hover:scale-[1.01] active:scale-[0.99] mt-2"
                  >
                    {isLoginLoading ? "Signing in..." : "Sign in"}
                  </Button>
                </form>

                <footer className="text-center text-xs font-medium text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="font-bold text-teal-600 dark:text-teal-400 hover:underline smooth-transition"
                  >
                    Sign up
                  </button>
                </footer>
              </div>
            ) : (
              /* SIGNUP FORM PANEL */
              <div className="space-y-3">
                <header className="space-y-1 text-left">
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Create your account</h2>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Set up your password to confirm & link your appointment
                  </p>
                </header>

                {bookingDraft && (
                  <div className="p-2.5 bg-teal-50 dark:bg-teal-950/60 rounded-xl border border-teal-200 dark:border-teal-800 text-xs space-y-1 text-left">
                    <div className="flex items-center justify-between font-bold text-teal-800 dark:text-teal-300">
                      <span>📌 Booking Draft Attached</span>
                      <span className="text-[9px] bg-teal-600 text-white px-1.5 py-0.5 rounded font-semibold uppercase">Pending</span>
                    </div>
                    <p className="text-[11px] text-slate-700 dark:text-slate-200">
                      <strong>{bookingDraft.service}</strong> ({bookingDraft.branch?.toUpperCase()} Branch)
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      📅 Date: {bookingDraft.date} | ⏰ Time: {bookingDraft.time}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSignupSubmit} className="space-y-2.5 text-left">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <Label htmlFor="auth-signup-firstName" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">First Name</Label>
                      <Input
                        id="auth-signup-firstName"
                        type="text"
                        placeholder="Juan"
                        value={signupFirstName}
                        onChange={(e) => setSignupFirstName(e.target.value)}
                        required
                        className="h-8 text-xs rounded-xl border-slate-300 dark:border-slate-700 focus:ring-teal-500 smooth-transition"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="auth-signup-lastName" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Last Name</Label>
                      <Input
                        id="auth-signup-lastName"
                        type="text"
                        placeholder="Dela Cruz"
                        value={signupLastName}
                        onChange={(e) => setSignupLastName(e.target.value)}
                        required
                        className="h-8 text-xs rounded-xl border-slate-300 dark:border-slate-700 focus:ring-teal-500 smooth-transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <Label htmlFor="auth-signup-phone" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Mobile Phone</Label>
                      <Input
                        id="auth-signup-phone"
                        type="tel"
                        placeholder="0917 123 4567"
                        value={signupPhone}
                        onChange={(e) => setSignupPhone(e.target.value)}
                        required
                        className="h-8 text-xs rounded-xl border-slate-300 dark:border-slate-700 focus:ring-teal-500 smooth-transition"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="auth-signup-email" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Email</Label>
                      <Input
                        id="auth-signup-email"
                        type="email"
                        placeholder="m@example.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                        className="h-8 text-xs rounded-xl border-slate-300 dark:border-slate-700 focus:ring-teal-500 smooth-transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="auth-signup-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Password</Label>
                    <div className="relative">
                      <Input
                        id="auth-signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        minLength={6}
                        className="h-9 text-xs rounded-xl border-slate-300 dark:border-slate-700 focus:ring-teal-500 pr-9 smooth-transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 smooth-transition"
                      >
                        {showSignupPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="auth-signup-confirmPassword" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="auth-signup-confirmPassword"
                        type={showSignupConfirmPassword ? "text" : "password"}
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className="h-9 text-xs rounded-xl border-slate-300 dark:border-slate-700 focus:ring-teal-500 pr-9 smooth-transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 smooth-transition"
                      >
                        {showSignupConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {signupConfirmPassword && (
                      <p className={`text-[11px] ${signupPassword === signupConfirmPassword ? "text-emerald-600 font-semibold" : "text-destructive font-semibold"}`}>
                        {signupPassword === signupConfirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isSignupLoading}
                    className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md smooth-transition hover:scale-[1.01] active:scale-[0.99] mt-1"
                  >
                    {isSignupLoading ? "Creating account..." : "Sign up"}
                  </Button>
                </form>

                <footer className="text-center text-xs font-medium text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="font-bold text-teal-600 dark:text-teal-400 hover:underline smooth-transition"
                  >
                    Sign in
                  </button>
                </footer>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Image (Stationary, zero flicker) */}
        <div className="hidden bg-muted md:block md:w-1/2 h-full relative overflow-hidden">
          <img
            src="/login-bg.png"
            alt="Dental Clinic Aesthetic"
            className="h-full w-full object-cover smooth-transition hover:scale-105"
          />
        </div>
      </div>
    </div>
  );
}
