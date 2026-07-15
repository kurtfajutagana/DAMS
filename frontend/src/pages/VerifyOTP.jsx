import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";

export default function VerifyOTP() {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract email and user_id from state or query params
  const email = location.state?.email || new URLSearchParams(location.search).get("email");
  const userId = location.state?.userId || new URLSearchParams(location.search).get("user_id");

  useEffect(() => {
    if (!email || !userId) {
      toast.error("Missing verification context. Please log in again.");
      navigate("/login");
    }
  }, [email, userId, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Please enter a valid 6-digit code.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp_code: otp })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.detail || "Invalid or expired code.");
      } else {
        toast.success("Email verified successfully! You can now log in.");
        // Use window.location.href to force a full reload so AuthContext fetches the updated profile
        window.location.href = "/login";
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while verifying OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    toast.info("Requesting a new code...");
    try {
      const res = await fetch("http://localhost:8000/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, user_id: userId })
      });
      
      if (res.ok) {
        toast.success("A new verification code has been sent!");
      } else {
        const data = await res.json();
        toast.error(data.detail || "Failed to resend code.");
      }
    } catch (err) {
      toast.error("Network error while resending OTP.");
    }
  };

  if (!email || !userId) return null;

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-8 sm:px-16 md:w-1/2 lg:px-24">
        <div className="mx-auto w-full max-w-sm space-y-6 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <MailCheck className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Verify your email</h1>
          <p className="text-muted-foreground">
            We've sent a 6-digit verification code to <span className="font-medium text-foreground">{email}</span>.
          </p>

          <form onSubmit={handleVerify} className="space-y-4 pt-4">
            <div className="space-y-2 text-left">
              <Input
                id="otp"
                type="text"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-widest h-14"
                required
              />
            </div>
            <Button className="w-full h-12 text-lg" type="submit" disabled={isLoading}>
              {isLoading ? "Verifying..." : "Verify Code"}
            </Button>
          </form>

          <div className="pt-6 text-sm">
            <span className="text-muted-foreground">Didn't receive the code? </span>
            <button 
              onClick={handleResend}
              className="font-medium text-primary hover:underline"
            >
              Resend code
            </button>
          </div>
        </div>
      </div>
      
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
