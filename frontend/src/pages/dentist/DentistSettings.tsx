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
import { Textarea } from "../../components/ui/textarea";
import { toast } from "sonner";
import {
  KeyRound,
  Eye,
  EyeOff,
  Stethoscope,
  CalendarCheck,
  Volume2,
  VolumeX,
  FileCheck,
  ShieldCheck,
  Building2,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  Layers
} from "lucide-react";

const SPECIALTIES = [
  "General Dentistry",
  "Orthodontics & Dentofacial Orthopedics",
  "Endodontics (Root Canal Therapy)",
  "Oral & Maxillofacial Surgery",
  "Periodontics (Gum Disease Care)",
  "Prosthodontics (Crowns, Bridges, Dentures)",
  "Pediatric Dentistry"
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function DentistSettings() {
  const { user, profile } = useAuth();

  // Tab 1: Credentials & Stamp
  const [licenseNumber, setLicenseNumber] = useState(profile?.license_number || "");
  const [ptrNumber, setPtrNumber] = useState("");
  const [s2License, setS2License] = useState("");
  const [specialization, setSpecialization] = useState(profile?.specialization || "General Dentistry");
  const [consultationRoom, setConsultationRoom] = useState("Operatory 1");
  const [bio, setBio] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Tab 2: Duty Schedules
  const [dutySchedules, setDutySchedules] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);

  // Tab 3: Chairside Preferences
  const [soundChime, setSoundChime] = useState(true);
  const [chartNotation, setChartNotation] = useState("fdi"); // "fdi" | "universal"
  const [autoOpenChart, setAutoOpenChart] = useState(true);
  const [rxQuickfill, setRxQuickfill] = useState(true);
  const [isSavingChairside, setIsSavingChairside] = useState(false);

  // Tab 4: Security
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Load profile credentials and duty schedule
  useEffect(() => {
    const fetchDoctorProfileAndSchedule = async () => {
      if (!user?.id) return;
      try {
        // 1. Fetch profile with ptr_number and preferences
        const { data: pData } = await supabase
          .from("profiles")
          .select("license_number, ptr_number, specialization, preferences")
          .eq("id", user.id)
          .single();

        if (pData) {
          if (pData.license_number) setLicenseNumber(pData.license_number);
          if (pData.ptr_number) setPtrNumber(pData.ptr_number);
          if (pData.specialization) setSpecialization(pData.specialization);

          if (pData.preferences) {
            if (pData.preferences.s2_license) setS2License(pData.preferences.s2_license);
            if (pData.preferences.consultation_room) setConsultationRoom(pData.preferences.consultation_room);
            if (pData.preferences.bio) setBio(pData.preferences.bio);
            if (typeof pData.preferences.sound_chime === "boolean") setSoundChime(pData.preferences.sound_chime);
            if (pData.preferences.chart_notation) setChartNotation(pData.preferences.chart_notation);
            if (typeof pData.preferences.auto_open_chart === "boolean") setAutoOpenChart(pData.preferences.auto_open_chart);
            if (typeof pData.preferences.rx_quickfill === "boolean") setRxQuickfill(pData.preferences.rx_quickfill);
          }
        }

        // 2. Fetch duty schedule
        const { data: sData } = await supabase
          .from("dentist_schedules")
          .select(`
            id,
            day_of_week,
            start_time,
            end_time,
            is_active,
            branch:branches!dentist_schedules_branch_id_fkey(branch_name)
          `)
          .eq("dentist_id", user.id)
          .eq("is_active", true)
          .order("day_of_week", { ascending: true });

        if (sData) {
          setDutySchedules(sData);
        }
      } catch (err) {
        console.error("Error loading dentist settings:", err);
      } finally {
        setLoadingSchedule(false);
      }
    };

    fetchDoctorProfileAndSchedule();
  }, [user?.id]);

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsSavingProfile(true);
    try {
      const existingPrefs = profile?.preferences || {};
      const updatedPrefs = {
        ...existingPrefs,
        s2_license: s2License.trim(),
        consultation_room: consultationRoom.trim(),
        bio: bio.trim()
      };

      const { error } = await supabase
        .from("profiles")
        .update({
          license_number: licenseNumber.trim(),
          ptr_number: ptrNumber.trim(),
          specialization: specialization,
          preferences: updatedPrefs
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Professional credentials and prescription stamp updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update credentials: " + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveChairside = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsSavingChairside(true);
    try {
      const existingPrefs = profile?.preferences || {};
      const updatedPrefs = {
        ...existingPrefs,
        sound_chime: soundChime,
        chart_notation: chartNotation,
        auto_open_chart: autoOpenChart,
        rx_quickfill: rxQuickfill
      };

      const { error } = await supabase
        .from("profiles")
        .update({ preferences: updatedPrefs })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Chairside clinical preferences saved!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save chairside preferences: " + err.message);
    } finally {
      setIsSavingChairside(false);
    }
  };

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
      toast.success("Password updated successfully!");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update password: " + err.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const doctorFullName = profile?.first_name 
    ? `Dr. ${profile.first_name} ${profile.last_name || ''}`.trim()
    : "Dr. Dentist";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Dentist Profile & Clinical Settings</h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Manage your PRC credentials, digital prescription stamp, weekly duty rotation, and operatory chair preferences.
          </p>
        </div>
        <Badge className="bg-indigo-900 text-white font-bold px-3 py-1 text-xs">
          Role: Attending Dentist
        </Badge>
      </div>

      <Tabs defaultValue="credentials" className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full bg-slate-100 p-1 rounded-xl h-auto gap-1">
          <TabsTrigger value="credentials" className="text-xs font-bold py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs">
            <Stethoscope className="w-3.5 h-3.5 mr-1.5" /> Credentials & Stamp
          </TabsTrigger>
          <TabsTrigger value="duty" className="text-xs font-bold py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs">
            <CalendarCheck className="w-3.5 h-3.5 mr-1.5" /> Weekly Duty Roster
          </TabsTrigger>
          <TabsTrigger value="chairside" className="text-xs font-bold py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs">
            <Layers className="w-3.5 h-3.5 mr-1.5" /> Chairside Preferences
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs font-bold py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Security
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CREDENTIALS & DIGITAL PRESCRIPTION STAMP */}
        <TabsContent value="credentials" className="mt-4 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <form onSubmit={handleSaveCredentials}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-indigo-600" />
                  <CardTitle className="text-lg">Professional Licensure & Digital E-Prescription Stamp</CardTitle>
                </div>
                <CardDescription>
                  These credentials appear automatically on all official electronic prescriptions, dental certificates, and treatment invoices generated for your patients.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="license-no" className="text-xs font-bold text-slate-700">
                      PRC Dental License Number *
                    </Label>
                    <Input
                      id="license-no"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="e.g. PRC-0089123"
                      className="rounded-xl font-mono text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ptr-no" className="text-xs font-bold text-slate-700">
                      Professional Tax Receipt (PTR) Number *
                    </Label>
                    <Input
                      id="ptr-no"
                      value={ptrNumber}
                      onChange={(e) => setPtrNumber(e.target.value)}
                      placeholder="e.g. PTR-7654321"
                      className="rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="specialty-select" className="text-xs font-bold text-slate-700">
                      Primary Clinical Specialty
                    </Label>
                    <Select value={specialization} onValueChange={setSpecialization}>
                      <SelectTrigger id="specialty-select" className="rounded-xl">
                        <SelectValue placeholder="Select specialty" />
                      </SelectTrigger>
                      <SelectContent>
                        {SPECIALTIES.map(spec => (
                          <SelectItem key={spec} value={spec}>
                            {spec}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="s2-no" className="text-xs font-bold text-slate-700">
                      DDB S2 License Number (Optional / Controlled Drugs)
                    </Label>
                    <Input
                      id="s2-no"
                      value={s2License}
                      onChange={(e) => setS2License(e.target.value)}
                      placeholder="e.g. S2-987654"
                      className="rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="room-no" className="text-xs font-bold text-slate-700">
                    Assigned Operatory Chair / Consultation Room
                  </Label>
                  <Input
                    id="room-no"
                    value={consultationRoom}
                    onChange={(e) => setConsultationRoom(e.target.value)}
                    placeholder="e.g. Operatory Chair 2 - Endodontic Suite"
                    className="rounded-xl text-xs"
                  />
                </div>

                {/* Digital Stamp Live Preview */}
                <div className="mt-4 p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-2">
                  <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck className="h-3.5 w-3.5 text-indigo-600" /> Official Prescription Stamp Preview
                  </span>
                  <div className="bg-white p-4 rounded-xl border border-dashed border-indigo-300 font-serif text-center space-y-1 shadow-2xs max-w-sm mx-auto">
                    <p className="font-bold text-sm text-slate-900 tracking-wide uppercase">{doctorFullName}, DDM</p>
                    <p className="text-[11px] text-slate-600 italic">{specialization}</p>
                    <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-100 mt-2 space-y-0.5">
                      <p>PRC Lic. No.: {licenseNumber || "PRC-XXXXXX"}</p>
                      <p>PTR No.: {ptrNumber || "PTR-XXXXXX"}</p>
                      {s2License && <p>DDB S2 No.: {s2License}</p>}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 border-t border-slate-100 py-3 flex justify-end">
                <Button type="submit" disabled={isSavingProfile} className="bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  {isSavingProfile ? "Saving..." : "Save Professional Stamp"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* TAB 2: WEEKLY AGREED DUTY SCHEDULE */}
        <TabsContent value="duty" className="mt-4 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg">Weekly Agreed Duty Schedule Matrix</CardTitle>
              </div>
              <CardDescription>
                This weekly duty schedule is agreed upon with clinic administration and dictates which branches patients can book with you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingSchedule ? (
                <div className="p-6 text-center text-xs text-slate-500">Loading duty rotation...</div>
              ) : dutySchedules.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {dutySchedules.map((duty) => {
                    const dayName = DAY_NAMES[duty.day_of_week] || `Day ${duty.day_of_week}`;
                    const branchName = duty.branch?.branch_name || "Pasig";
                    return (
                      <div
                        key={duty.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5 hover:border-indigo-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900">{dayName}</span>
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0 border-emerald-200">
                            On Duty
                          </Badge>
                        </div>
                        <div className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                          {branchName} Branch
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {duty.start_time?.slice(0, 5)} - {duty.end_time?.slice(0, 5)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                  No active duty schedule found. Please coordinate with clinic administration.
                </div>
              )}

              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Need to swap shifts or schedule leave?</span>
                  Please notify the clinic medical director and reception staff at least 48 hours in advance so booked patients can be rescheduled accordingly.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: CHAIRSIDE PREFERENCES */}
        <TabsContent value="chairside" className="mt-4 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <form onSubmit={handleSaveChairside}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-600" />
                  <CardTitle className="text-lg">Operatory & Chairside Clinical Preferences</CardTitle>
                </div>
                <CardDescription>
                  Customize your dental charting notation, queue chime audio alerts, and automated workflow helpers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Audio Chime */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      {soundChime ? <Volume2 className="h-4 w-4 text-emerald-600" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
                      Waiting Room Arrival Audio Chime
                    </Label>
                    <p className="text-xs text-slate-500">Play a chime when receptionist checks in a patient into your waiting queue.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSoundChime(!soundChime)}
                    className={`rounded-xl text-xs font-bold ${soundChime ? "border-emerald-500 text-emerald-700 bg-emerald-50" : "text-slate-600"}`}
                  >
                    {soundChime ? "Enabled" : "Muted"}
                  </Button>
                </div>

                {/* Odontogram Notation System */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                  <Label className="text-xs font-bold text-slate-700 block">Dental Chart Tooth Numbering System</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setChartNotation("fdi")}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        chartNotation === "fdi"
                          ? "border-indigo-600 bg-indigo-50/50 text-indigo-950 font-semibold shadow-xs"
                          : "border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <span className="font-bold block text-sm">FDI Two-Digit System (ISO 3950)</span>
                      <span className="text-[11px] text-slate-500">Quadrant numbering: 11, 21, 36, 48 (Philippine Dental Association standard)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setChartNotation("universal")}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        chartNotation === "universal"
                          ? "border-indigo-600 bg-indigo-50/50 text-indigo-950 font-semibold shadow-xs"
                          : "border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <span className="font-bold block text-sm">Universal Numbering System</span>
                      <span className="text-[11px] text-slate-500">Sequential teeth numbering: 1 to 32 starting upper right</span>
                    </button>
                  </div>
                </div>

                {/* Automation Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                    <div className="space-y-0.5 pr-2">
                      <Label className="text-xs font-bold text-slate-900 block">Auto-Open Dental Chart</Label>
                      <span className="text-[11px] text-slate-500 block">Open chart when calling patient from queue</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAutoOpenChart(!autoOpenChart)}
                      className="rounded-lg text-xs font-semibold h-7"
                    >
                      {autoOpenChart ? "Yes" : "No"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                    <div className="space-y-0.5 pr-2">
                      <Label className="text-xs font-bold text-slate-900 block">Prescription Quick-Fill Presets</Label>
                      <span className="text-[11px] text-slate-500 block">Pre-populate standard dental dosages</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRxQuickfill(!rxQuickfill)}
                      className="rounded-lg text-xs font-semibold h-7"
                    >
                      {rxQuickfill ? "Yes" : "No"}
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 border-t border-slate-100 py-3 flex justify-end">
                <Button type="submit" disabled={isSavingChairside} className="bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  {isSavingChairside ? "Saving..." : "Save Chairside Preferences"}
                </Button>
              </CardFooter>
            </form>
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
                  Update your dentist portal password to protect patient health records and electronic prescriptions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dentist-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="dentist-password"
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
                  <Label htmlFor="dentist-confirm-password">Confirm New Password</Label>
                  <Input
                    id="dentist-confirm-password"
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
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Professional Session Verified
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

