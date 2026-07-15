import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, session } = useAuth();
  const navigate = useNavigate();

  // If the user visits the login page but is already authenticated
  // (e.g. after clicking a verification link in an email that opens a new tab),
  // immediately redirect them to their dashboard.
  useEffect(() => {
    if (session?.user) {
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
  }, [session, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await login(email, password);
      
      if (error) {
        if (error.message.toLowerCase().includes("invalid login credentials")) {
          toast.error("Account not found. Redirecting to sign up...");
          navigate("/signup", { state: { email } });
          return;
        }
        toast.error(error.message);
        return;
      }

      if (data.user) {
        // Fetch role and verification status from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role, is_email_verified, is_active")
          .eq("id", data.user.id)
          .single();

        if (profileData && profileData.is_active === false) {
          await supabase.auth.signOut();
          toast.error("Your account has been disabled. Please contact the administrator.");
          setIsLoading(false);
          return;
        }

        if (profileData && !profileData.is_email_verified) {
          toast.error("Please verify your email first.");
          try {
            const response = await fetch("http://localhost:8000/api/auth/send-otp", {
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
          navigate("/verify-otp", { state: { email: data.user.email, userId: data.user.id } });
          return;
        }

        if (profileError) {
          console.error("Error fetching profile role:", profileError);
          // Default fallback if role isn't found
          navigate("/patient/dashboard");
        } else {
          // Route based on role
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
        toast.success("Successfully logged in!");
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
        <div className="mx-auto w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center md:text-left">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="#" className="text-sm font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Sign up
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
