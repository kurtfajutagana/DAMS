import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { KeyRound, Mail, ArrowLeft, Eye, EyeOff, CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  onSuccess?: () => void;
}

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  initialEmail = "",
  onSuccess
}: ForgotPasswordModalProps) {
  // Steps: "email" (request code) -> "reset" (verify code & set new password) -> "success"
  const [step, setStep] = useState<"email" | "reset" | "success">("email");
  const [email, setEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState("");
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const otpInputRef = useRef<HTMLInputElement>(null);
  const newPasswordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleModalClose = () => {
    setTimeout(() => {
      setStep("email");
      setOtpCode("");
      setIsOtpVerified(false);
      setIsVerifyingOtp(false);
      setNewPassword("");
      setConfirmPassword("");
      setErrorMsg(null);
    }, 300);
    onClose();
  };

  // STEP 1: Request 6-digit OTP code to email
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg("Please enter your registered email address.");
      return;
    }

    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Unable to send verification code. Please check the email and try again.");
      }

      toast.success("Verification code sent! Please check your email inbox.");
      setStep("reset");
      setIsOtpVerified(false);
      setOtpCode("");
      setNewPassword("");
      setConfirmPassword("");
      setResendCooldown(60);
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 150);
    } catch (err: any) {
      console.error("Forgot password request failed:", err);
      setErrorMsg(err.message || "Failed to send reset code. Please try again.");
      toast.error(err.message || "Failed to send reset code.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP code
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setErrorMsg(null);
    setIsResending(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Failed to resend code.");
      }

      toast.success("A fresh 6-digit verification code has been sent!");
      setOtpCode("");
      setIsOtpVerified(false);
      setNewPassword("");
      setConfirmPassword("");
      setResendCooldown(60);
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 100);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to resend code.");
      toast.error(err.message || "Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  // Verify the 6-digit OTP code against backend
  const verifyCode = async (codeToVerify: string) => {
    const cleanOtp = codeToVerify.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setErrorMsg("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsVerifyingOtp(true);
    setErrorMsg(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/auth/verify-reset-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp_code: cleanOtp,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Invalid or expired verification code. Please check and try again.");
      }

      setIsOtpVerified(true);
      setErrorMsg(null);
      toast.success("Code verified! Please create your new password.");

      // Automatically focus new password input once revealed
      setTimeout(() => {
        newPasswordInputRef.current?.focus();
      }, 150);
    } catch (err: any) {
      console.error("OTP verification failed:", err);
      setIsOtpVerified(false);
      setErrorMsg(err.message || "Invalid or expired verification code.");
      toast.error(err.message || "Invalid verification code.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Handle OTP change: auto-verify when exactly 6 digits are inputted
  const handleOtpChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 6);
    setOtpCode(clean);
    setErrorMsg(null);

    // If previously verified and code is edited, reset verified state so password fields hide
    if (isOtpVerified) {
      setIsOtpVerified(false);
    }

    // Automatically trigger verification when all 6 digits are entered
    if (clean.length === 6) {
      verifyCode(clean);
    }
  };

  // Handle Form Submission for Reset Step
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // If OTP is not verified yet, verify it first
    if (!isOtpVerified) {
      if (otpCode.trim().length === 6) {
        await verifyCode(otpCode.trim());
      } else {
        setErrorMsg("Please enter the complete 6-digit verification code.");
      }
      return;
    }

    // Passwords validation
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter to confirm.");
      return;
    }

    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp_code: otpCode.trim(),
          new_password: newPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Password reset failed. Please ensure the code is correct.");
      }

      toast.success("Password reset successfully!");
      setStep("success");
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Password reset error:", err);
      setErrorMsg(err.message || "Failed to reset password.");
      toast.error(err.message || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleModalClose()}>
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl bg-white dark:bg-slate-900">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600" />

        {/* Header Area */}
        <div className="px-6 pt-6 pb-2">
          {step !== "success" && (
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800/40 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {step === "email" ? "Forgot Password" : "Reset Password"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {step === "email"
                    ? "Enter your email to receive a secure recovery code"
                    : `Enter the 6-digit code sent to ${email}`}
                </DialogDescription>
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="px-6 pb-6 pt-2">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* ================= STEP 1: Enter Email ================= */}
          {step === "email" && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Registered Email Address
                </Label>
                <div className="relative">
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="e.g. patient@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="h-11 pl-10 rounded-xl border-slate-300 dark:border-slate-700 focus:ring-teal-500 text-sm"
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  We will send a 6-digit verification code that expires in 15 minutes.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleModalClose}
                  className="rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 text-xs font-semibold h-10 px-4 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-10 px-6 shadow-sm shadow-teal-600/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Sending Code...
                    </>
                  ) : (
                    "Send Reset Code"
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* ================= STEP 2: Reset Password (OTP + Conditional Password Fields) ================= */}
          {step === "reset" && (
            <form onSubmit={handleResetSubmit} className="space-y-3.5">
              {/* Recipient summary card */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <Mail className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                  <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setIsOtpVerified(false);
                    setErrorMsg(null);
                  }}
                  className="text-[11px] text-teal-600 hover:text-teal-700 dark:text-teal-400 font-semibold underline shrink-0 ml-2 cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* 6-digit Code input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="otp-input" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    6-Digit Verification Code
                  </Label>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isResending}
                    onClick={handleResendOtp}
                    className="text-[11px] text-teal-600 hover:text-teal-700 dark:text-teal-400 font-semibold disabled:text-slate-400 disabled:no-underline underline cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isResending ? (
                      "Sending..."
                    ) : resendCooldown > 0 ? (
                      `Resend in ${resendCooldown}s`
                    ) : (
                      "Resend code"
                    )}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    id="otp-input"
                    ref={otpInputRef}
                    type="text"
                    maxLength={6}
                    placeholder="1 2 3 4 5 6"
                    value={otpCode}
                    onChange={(e) => handleOtpChange(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                    required
                    className={`h-12 rounded-xl text-center text-xl tracking-[0.35em] font-mono font-bold transition-all ${
                      errorMsg
                        ? "border-red-400 dark:border-red-600 focus:ring-red-400 text-red-600 dark:text-red-400"
                        : isOtpVerified
                        ? "border-emerald-500 dark:border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 focus:ring-emerald-500"
                        : "border-slate-300 dark:border-slate-700 focus:ring-teal-500 shadow-sm"
                    }`}
                  />
                  {isVerifyingOtp && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <RefreshCw className="h-4 w-4 text-teal-600 animate-spin" />
                    </div>
                  )}
                  {isOtpVerified && !isVerifyingOtp && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  )}
                </div>

                {isOtpVerified ? (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium text-center animate-in fade-in">
                    ✓ Code confirmed! Set your new password below.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                    Check your spam/junk folder if you don&apos;t see the email within 1 minute.
                  </p>
                )}
              </div>

              {/* ================= CONDITIONAL NEW PASSWORD FIELDS ================= */}
              {/* HIDDEN until the correct 6-digit verification code is inputted */}
              {isOtpVerified && (
                <div className="space-y-3 pt-1 transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-2">
                  {/* New Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        ref={newPasswordInputRef}
                        type={showNewPassword ? "text" : "password"}
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        className="h-11 pr-10 rounded-xl border-slate-300 dark:border-slate-700 focus:ring-teal-500 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Repeat new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className="h-11 pr-10 rounded-xl border-slate-300 dark:border-slate-700 focus:ring-teal-500 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPassword && (
                      <p className={`text-[11px] font-semibold ${newPassword === confirmPassword ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                        {newPassword === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setStep("email");
                    setIsOtpVerified(false);
                    setErrorMsg(null);
                  }}
                  className="rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 text-xs font-semibold h-10 px-4 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !isOtpVerified
                      ? isVerifyingOtp || otpCode.trim().length < 6
                      : isLoading || !newPassword || !confirmPassword || newPassword.length < 6 || newPassword !== confirmPassword
                  }
                  className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-10 px-6 shadow-sm shadow-teal-600/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {!isOtpVerified ? (
                    isVerifyingOtp ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Verifying Code...
                      </>
                    ) : (
                      "Verify Code"
                    )
                  ) : isLoading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* ================= STEP 3: Success Screen ================= */}
          {step === "success" && (
            <div className="text-center py-4 space-y-4 animate-in zoom-in-95">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Password Reset Complete!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Your password has been successfully updated. You can now use your new credentials to sign in to your Teeth Talk Clinic account.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleModalClose}
                  className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-11 shadow-md shadow-teal-600/20 cursor-pointer"
                >
                  Return to Sign In
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
