import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { MailCheck } from "lucide-react"; // We'll use an icon for the success screen

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const { signup, session } = useAuth();
  const navigate = useNavigate();

  // Cross-tab synchronization:
  // If the user clicks the email link in a new tab, the session in this tab
  // will automatically update via our AuthContext. Once we detect the session,
  // we redirect them!
  useEffect(() => {
    if (session) {
      toast.success("Email verified! Redirecting to your dashboard...");
      navigate("/login");
    }
  }, [session, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await signup(email, password, {
        full_name: fullName,
        role: "patient",
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user) {
        if (!data.session) {
          // Email confirmation is required
          setIsSuccess(true);
        } else {
          // Email confirmation is OFF, auto-logged in
          toast.success("Account created successfully! You are now logged in.");
          navigate("/login");
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
      {/* Left side: Form or Success Message */}
      <div className="flex w-full flex-col justify-center px-8 sm:px-16 md:w-1/2 lg:px-24">
        {isSuccess ? (
          <div className="mx-auto w-full max-w-sm space-y-6 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <MailCheck className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Check your email</h1>
            <p className="text-muted-foreground">
              We&apos;ve sent a verification link to <span className="font-medium text-foreground">{email}</span>.
            </p>
            <p className="text-sm text-muted-foreground">
              Please click the link to verify your account. This page will automatically update once you do!
            </p>
            <div className="flex justify-center pt-4">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
            </div>
            <div className="pt-8 text-sm">
              <button 
                onClick={() => setIsSuccess(false)}
                className="font-medium text-primary hover:underline"
              >
                Use a different email address
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-sm space-y-8">
            <div className="space-y-2 text-center md:text-left">
              <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
              <p className="text-muted-foreground">
                Enter your details below to create your patient account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Juan Dela Cruz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
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
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
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
        )}
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
