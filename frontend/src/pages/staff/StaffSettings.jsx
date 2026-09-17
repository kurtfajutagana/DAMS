import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import {
  KeyRound,
  Eye,
  EyeOff,
  Building2,
  Volume2,
  VolumeX,
  Printer,
  Clock,
  Phone,
  ShieldCheck,
  Save,
  CheckCircle2,
  Radio,
  Sparkles,
  AlertCircle
} from "lucide-react";

export default function StaffSettings() {
  const { user, profile } = useAuth();
  
  // Password States
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Front-Desk Tools & Chimes State
  const [soundChimeEnabled, setSoundChimeEnabled] = useState(true);
  const [paperSize, setPaperSize] = useState("A4");
  const [refreshInterval, setRefreshInterval] = useState("15");
  const [isSavingOps, setIsSavingOps] = useState(false);
  const [branchName, setBranchName] = useState("Pasig");

  // Fetch branch name and preferences on mount
  useEffect(() => {
    const fetchBranchAndPreferences = async () => {
      try {
        if (profile?.branch_id) {
          const { data: bData } = await supabase
            .from("branches")
            .select("branch_name")
            .eq("id", profile.branch_id)
            .single();
          if (bData?.branch_name) setBranchName(bData.branch_name);
        }

        if (profile?.id) {
          const { data: pData } = await supabase
            .from("profiles")
            .select("preferences")
            .eq("id", profile.id)
            .single();
          if (pData?.preferences) {
            if (typeof pData.preferences.sound_chime === "boolean") setSoundChimeEnabled(pData.preferences.sound_chime);
            if (pData.preferences.paper_size) setPaperSize(pData.preferences.paper_size);
            if (pData.preferences.refresh_interval) setRefreshInterval(pData.preferences.refresh_interval);
          }
        }
      } catch (err) {
        console.error("Error loading staff settings:", err);
      }
    };
    fetchBranchAndPreferences();
  }, [profile?.id, profile?.branch_id]);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Security credentials updated successfully!");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update password: " + err.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSaveOperations = async (e) => {
    e.preventDefault();
    if (!profile?.id) return;
    setIsSavingOps(true);
    try {
      const existingPrefs = profile.preferences || {};
      const updatedPrefs = {
        ...existingPrefs,
        sound_chime: soundChimeEnabled,
        paper_size: paperSize,
        refresh_interval: refreshInterval
      };

      const { error } = await supabase
        .from("profiles")
        .update({ preferences: updatedPrefs })
        .eq("id", profile.id);

      if (error) throw error;
      toast.success("Front-desk operational preferences updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save preferences: " + err.message);
    } finally {
      setIsSavingOps(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Staff & Front-Desk Settings</h1>
          <p className="text-sm font-medium text-slate-600 mt-1">Configure front-desk tools, arrival chimes, intake defaults, and security credentials.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>{branchName} Branch</span>
          </div>
          <Badge className="bg-slate-900 text-white font-bold px-3 py-1 text-xs">
            Role: Clinic Receptionist
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="operations" className="w-full">
        <TabsList className="grid grid-cols-1 sm:grid-cols-3 w-full bg-slate-100 p-1 rounded-xl h-auto gap-1">
          <TabsTrigger value="operations" className="text-xs font-bold py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs">
            <Volume2 className="w-3.5 h-3.5 mr-1.5" /> Front-Desk Tools & Chimes
          </TabsTrigger>
          <TabsTrigger value="intake" className="text-xs font-bold py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs">
            <Clock className="w-3.5 h-3.5 mr-1.5" /> Intake & Scheduling Rules
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs font-bold py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Security & Password
          </TabsTrigger>
        </TabsList>

        {/* TAB 2: FRONT-DESK TOOLS & SOUND */}
        <TabsContent value="operations" className="mt-4 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <form onSubmit={handleSaveOperations}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-indigo-600" />
                  <CardTitle className="text-lg">Front-Desk Operational & Queue Sound Tools</CardTitle>
                </div>
                <CardDescription>
                  Configure audio alerts for incoming queue arrivals and default print formats for patient reports.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      {soundChimeEnabled ? <Volume2 className="h-4 w-4 text-emerald-600" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
                      Patient Arrival Audio Chime
                    </Label>
                    <p className="text-xs text-slate-500">Play a subtle chime alert when a patient is checked into the live queue.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSoundChimeEnabled(!soundChimeEnabled)}
                    className={`rounded-xl text-xs font-bold ${soundChimeEnabled ? "border-emerald-500 text-emerald-700 bg-emerald-50" : "text-slate-600"}`}
                  >
                    {soundChimeEnabled ? "Enabled" : "Muted"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Printer className="h-3.5 w-3.5 text-slate-500" /> Default Print Paper Size
                    </Label>
                    <Select value={paperSize} onValueChange={setPaperSize}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select paper size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A4">A4 (Standard ISO 210 x 297 mm)</SelectItem>
                        <SelectItem value="Letter">US Letter (8.5 x 11 in)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Radio className="h-3.5 w-3.5 text-slate-500" /> Live Queue Auto-Refresh Rate
                    </Label>
                    <Select value={refreshInterval} onValueChange={setRefreshInterval}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select interval" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">Every 10 Seconds (High Speed)</SelectItem>
                        <SelectItem value="15">Every 15 Seconds (Recommended)</SelectItem>
                        <SelectItem value="30">Every 30 Seconds</SelectItem>
                        <SelectItem value="manual">Manual Refresh Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 border-t border-slate-100 py-3 flex justify-end">
                <Button type="submit" disabled={isSavingOps} className="bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  {isSavingOps ? "Saving..." : "Save Operational Preferences"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* TAB 3: INTAKE & SCHEDULING DEFAULTS */}
        <TabsContent value="intake" className="mt-4 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg">Patient Intake & Scheduling Rules</CardTitle>
              </div>
              <CardDescription>
                Overview of automated clinic rules enforced for patient scheduling and queue check-in.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                  <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Standard 1-Hour Time Slots
                  </span>
                  <p className="text-xs text-slate-600">
                    Appointments are standardized at 60-minute blocks (09:00 AM, 10:00 AM, 11:00 AM, 01:00 PM, 02:00 PM, 03:00 PM, 04:00 PM). Overlapping or collision bookings are strictly blocked.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                  <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-amber-600" /> 2-Hour Patient Reschedule Cutoff
                  </span>
                  <p className="text-xs text-slate-600">
                    Patients may self-reschedule online up to 2 hours prior to their visit. Under 2 hours, they are directed to contact this reception desk to prevent chair downtime.
                  </p>
                </div>
              </div>

              {/* Patient Contact Card Preview */}
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-2">
                <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider block">
                  Patient Contact Card Preview (Displayed to Patients within 2-hour cutoff)
                </span>
                <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-indigo-200/60 space-y-1">
                  <p className="font-semibold text-slate-900">Need to reschedule immediately?</p>
                  <p className="text-slate-600">
                    Your appointment is in less than 2 hours. Please contact our reception desk directly so we can release your operatory slot:
                  </p>
                  <p className="font-bold text-indigo-700 pt-0.5">
                    📍 {branchName} Branch Reception Desk &bull; 📞 (02) 8642-1190
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: SECURITY & CREDENTIALS */}
        <TabsContent value="security" className="mt-4 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <form onSubmit={handleUpdatePassword}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-indigo-600" />
                  <CardTitle className="text-lg">Change Password</CardTitle>
                </div>
                <CardDescription>
                  Update your receptionist account password to protect clinic patient records.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password (min. 6 characters)"
                      required
                      className="rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    className="rounded-xl"
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Active Session Authenticated
                  </span>
                  <span className="text-slate-500 font-mono">{user?.email}</span>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 border-t border-slate-100 py-3 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={isUpdatingPassword}
                  className="bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold"
                >
                  {isUpdatingPassword ? "Updating..." : "Update Password"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
