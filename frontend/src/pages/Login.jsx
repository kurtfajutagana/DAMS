import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, session } = useAuth();
  const navigate = useNavigate();

  // If the user visits the login page but is already authenticated
  // (e.g. after clicking a verification link in an email that opens a new tab),
  // immediately redirect them to their dashboard.
  useEffect(() => {
    if (session?.user) {
      if (session.user.email === "admin@teethtalk.com") {
        navigate("/admin/dashboard");
        return;
      }

      const fetchRoleAndRedirect = async () => {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        const role = profileData?.role || "patient";
        
        switch (role) {
          case "dentist":
            navigate("/dentist/dashboard");
            break;
          case "staff":
            navigate("/assistant/dashboard");
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
        toast.error(error.message);
        return;
      }

      if (data.user) {
        if (data.user.email === "admin@teethtalk.com") {
          navigate("/admin/dashboard");
          toast.success("Successfully logged in as Admin!");
          return;
        }

        // Fetch role from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile role:", profileError);
          // Default fallback if role isn't found
          navigate("/patient/dashboard");
        } else {
          // Route based on role
          switch (profileData.role) {
            case "dentist":
              navigate("/dentist/dashboard");
              break;
            case "staff":
              navigate("/assistant/dashboard"); // Or wherever staff goes
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
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
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
