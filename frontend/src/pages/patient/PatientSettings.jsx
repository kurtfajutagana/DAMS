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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  KeyRound,
  Eye,
  EyeOff,
  User,
  Bell,
  ShieldCheck,
  Download,
  Building2,
  Phone,
  Heart,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  Mail,
  Smartphone
} from "lucide-react";

export default function PatientSettings() {
  const { user, profile } = useAuth();

  // Tab 1: Profile & Emergency Contact
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [contactNumber, setContactNumber] = useState(profile?.contact_number || "");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("Spouse / Partner");
  const [preferredBranchId, setPreferredBranchId] = useState(profile?.branch_id || "");
  const [branches, setBranches] = useState([]);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Tab 2: Notification Preferences
  const [emailReminders, setEmailReminders] = useState(true);
  const [inAppAlerts, setInAppAlerts] = useState(true);
  const [medicationAlerts, setMedicationAlerts] = useState(true);
  const [clinicAnnouncements, setClinicAnnouncements] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  // Tab 3: Security
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Tab 4: DPA & Export State
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Load branches, emergency contact, and preferences
  useEffect(() => {
    const fetchPatientData = async () => {
      if (!user?.id) return;
      try {
        const { data: bData } = await supabase.from("branches").select("id, branch_name").eq("is_active", true);
        if (bData) setBranches(bData);

        const { data: pData } = await supabase
          .from("profiles")
          .select("full_name, contact_number, branch_id, emergency_contact_name, emergency_contact_phone, preferences")
          .eq("id", user.id)
          .single();

        if (pData) {
          if (pData.full_name) setFullName(pData.full_name);
          if (pData.contact_number) setContactNumber(pData.contact_number);
          if (pData.branch_id) setPreferredBranchId(pData.branch_id);
          if (pData.emergency_contact_name) setEmergencyName(pData.emergency_contact_name);
          if (pData.emergency_contact_phone) setEmergencyPhone(pData.emergency_contact_phone);

          if (pData.preferences) {
            if (pData.preferences.emergency_relation) setEmergencyRelation(pData.preferences.emergency_relation);
            if (typeof pData.preferences.email_reminders === "boolean") setEmailReminders(pData.preferences.email_reminders);
            if (typeof pData.preferences.in_app_alerts === "boolean") setInAppAlerts(pData.preferences.in_app_alerts);
            if (typeof pData.preferences.medication_alerts === "boolean") setMedicationAlerts(pData.preferences.medication_alerts);
            if (typeof pData.preferences.clinic_announcements === "boolean") setClinicAnnouncements(pData.preferences.clinic_announcements);
          }
        }
      } catch (err) {
        console.error("Error loading patient settings:", err);
      }
    };
    fetchPatientData();
  }, [user?.id]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsSavingProfile(true);
    try {
      const existingPrefs = profile?.preferences || {};
      const updatedPrefs = {
        ...existingPrefs,
        emergency_relation: emergencyRelation
      };

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          contact_number: contactNumber.trim(),
          emergency_contact_name: emergencyName.trim(),
          emergency_contact_phone: emergencyPhone.trim(),
          branch_id: preferredBranchId || null,
          preferences: updatedPrefs
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Profile details and emergency contact saved!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save profile: " + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveNotifications = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsSavingNotifications(true);
    try {
      const existingPrefs = profile?.preferences || {};
      const updatedPrefs = {
        ...existingPrefs,
        email_reminders: emailReminders,
        in_app_alerts: inAppAlerts,
        medication_alerts: medicationAlerts,
        clinic_announcements: clinicAnnouncements
      };

      const { error } = await supabase
        .from("profiles")
        .update({ preferences: updatedPrefs })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Notification preferences updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save notification settings: " + err.message);
    } finally {
      setIsSavingNotifications(false);
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

  // PDF Dental Record Summary Generator (RA 10173 Data Privacy Export)
  const handleDownloadDentalSummary = async () => {
    if (!user?.id) return;
    setIsExportingPDF(true);
    try {
      // 1. Fetch patient's past appointments and treatments
      const { data: apts } = await supabase
        .from("appointments")
        .select(`
          appointment_date,
          service_requested,
          status,
          dentist:profiles!appointments_dentist_id_fkey(first_name, last_name)
        `)
        .eq("patient_id", user.id)
        .order("appointment_date", { ascending: false });

      const { data: treatments } = await supabase
        .from("treatments")
        .select(`
          procedure_name,
          treatment_date,
          clinical_notes
        `)
        .eq("patient_id", user.id)
        .order("treatment_date", { ascending: false });

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const primaryColor = [15, 23, 42]; // Slate 900

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...primaryColor);
      doc.text("TEETHTALK DENTAL CLINIC", 14, 18);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Official Patient Dental History & Treatment Summary", 14, 23);
      doc.text("Republic of the Philippines &bull; Data Privacy Act (RA 10173) Certified Copy", 14, 27);
      doc.line(14, 30, 196, 30);

      // Patient Demographics Box
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text("Patient Name:", 14, 37);
      doc.setFont("helvetica", "normal");
      doc.text(fullName || user.email, 45, 37);

      doc.setFont("helvetica", "bold");
      doc.text("Contact Number:", 14, 43);
      doc.setFont("helvetica", "normal");
      doc.text(contactNumber || "N/A", 45, 43);

      doc.setFont("helvetica", "bold");
      doc.text("Export Date:", 120, 37);
      doc.setFont("helvetica", "normal");
      doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), 145, 37);

      doc.setFont("helvetica", "bold");
      doc.text("Emergency Contact:", 120, 43);
      doc.setFont("helvetica", "normal");
      doc.text(emergencyName ? `${emergencyName} (${emergencyPhone || 'No Phone'})` : "None Listed", 158, 43);

      // Section 1: Completed Treatments & Procedures
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...primaryColor);
      doc.text("1. Completed Dental Treatments", 14, 53);

      const treatmentRows = (treatments || []).map(t => [
        t.treatment_date ? new Date(t.treatment_date).toLocaleDateString() : "—",
        t.procedure_name || "General Dental Procedure",
        t.clinical_notes || "Procedure completed successfully."
      ]);

      autoTable(doc, {
        startY: 56,
        head: [["Date", "Procedure / Clinical Service", "Clinical Notes"]],
        body: treatmentRows.length > 0 ? treatmentRows : [["—", "No recorded clinical treatments to date", "—"]],
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 }
      });

      // Section 2: Appointment History
      const nextY = doc.lastAutoTable.finalY + 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...primaryColor);
      doc.text("2. Clinical Visits & Appointments Log", 14, nextY);

      const aptRows = (apts || []).map(a => [
        a.appointment_date ? new Date(a.appointment_date).toLocaleDateString() : "—",
        a.appointment_date ? new Date(a.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—",
        a.service_requested || "Consultation",
        a.dentist ? `Dr. ${a.dentist.first_name} ${a.dentist.last_name}` : "Attending Dentist",
        a.status.toUpperCase()
      ]);

      autoTable(doc, {
        startY: nextY + 3,
        head: [["Date", "Time", "Service Requested", "Attending Doctor", "Status"]],
        body: aptRows.length > 0 ? aptRows : [["—", "—", "No appointments recorded", "—", "—"]],
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 }
      });

      // Confidentiality Footer
      const finalY = doc.lastAutoTable.finalY + 12;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Confidential Dental Record: This summary was exported by the patient under RA 10173 data portability rights.", 14, finalY);
      doc.text("TeethTalk Dental Management System &bull; Valid without physical signature for personal medical review.", 14, finalY + 4);

      doc.save(`Dental_Summary_${(fullName || 'Patient').replace(/\s+/g, '_')}.pdf`);
      toast.success("Your official dental summary has been generated and downloaded!");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to generate dental summary PDF.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Patient Security & Preferences</h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Manage your personal profile, emergency contact, communication reminders, account credentials, and data privacy.
          </p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-800 font-bold border-emerald-200 px-3 py-1 text-xs">
          Role: Verified Patient
        </Badge>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full bg-slate-100 p-1 rounded-xl h-auto gap-1">
          <TabsTrigger value="profile" className="text-xs font-bold py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs">
            <User className="w-3.5 h-3.5 mr-1.5" /> Profile & Emergency
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs font-bold py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs">
            <Bell className="w-3.5 h-3.5 mr-1.5" /> Reminders & Alerts
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs font-bold py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Security
          </TabsTrigger>
          <TabsTrigger value="privacy" className="text-xs font-bold py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Privacy & PDF Export
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PROFILE & EMERGENCY CONTACT */}
        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <form onSubmit={handleSaveProfile}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-indigo-600" />
                  <CardTitle className="text-lg">Personal Details & Emergency Safety Contact</CardTitle>
                </div>
                <CardDescription>
                  Keep your emergency contact up to date for clinical surgical safety and anesthesia protocols.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full-name" className="text-xs font-bold text-slate-700">Full Legal Name *</Label>
                    <Input
                      id="full-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter full legal name"
                      className="rounded-xl text-xs font-medium"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-no" className="text-xs font-bold text-slate-700">Mobile Phone Number *</Label>
                    <Input
                      id="contact-no"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="e.g. 0917 123 4567"
                      className="rounded-xl text-xs font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pref-branch" className="text-xs font-bold text-slate-700">
                    Preferred Clinic Branch (Default for Appointments)
                  </Label>
                  <Select value={preferredBranchId} onValueChange={setPreferredBranchId}>
                    <SelectTrigger id="pref-branch" className="rounded-xl">
                      <SelectValue placeholder="Select preferred branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.branch_name} Branch
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Emergency Contact Box */}
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-3">
                  <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5 uppercase tracking-wider">
                    <Heart className="h-4 w-4 text-rose-600" /> In Case of Emergency Contact
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-slate-700">Contact Person Name</Label>
                      <Input
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        placeholder="e.g. Maria Santos"
                        className="rounded-xl text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-slate-700">Emergency Phone Number</Label>
                      <Input
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        placeholder="e.g. 0918 999 8888"
                        className="rounded-xl text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-slate-700">Relationship</Label>
                      <Select value={emergencyRelation} onValueChange={setEmergencyRelation}>
                        <SelectTrigger className="rounded-xl bg-white">
                          <SelectValue placeholder="Relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Spouse / Partner">Spouse / Partner</SelectItem>
                          <SelectItem value="Parent / Guardian">Parent / Guardian</SelectItem>
                          <SelectItem value="Sibling">Sibling</SelectItem>
                          <SelectItem value="Adult Child">Adult Child</SelectItem>
                          <SelectItem value="Close Friend">Close Friend</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 border-t border-slate-100 py-3 flex justify-end">
                <Button type="submit" disabled={isSavingProfile} className="bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  {isSavingProfile ? "Saving..." : "Save Profile Information"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* TAB 2: REMINDERS & NOTIFICATION CHANNELS */}
        <TabsContent value="notifications" className="mt-4 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <form onSubmit={handleSaveNotifications}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-indigo-600" />
                  <CardTitle className="text-lg">Appointment Reminders & Clinic Notifications</CardTitle>
                </div>
                <CardDescription>
                  Choose how and when TeethTalk sends you appointment confirmations and post-procedure clinical alerts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Email Reminders */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-indigo-600" /> Email Appointment Reminders (Brevo)
                    </Label>
                    <p className="text-xs text-slate-500">Receive 24-hour ahead confirmations and schedule change notices directly to your email.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEmailReminders(!emailReminders)}
                    className={`rounded-xl text-xs font-bold ${emailReminders ? "border-emerald-500 text-emerald-700 bg-emerald-50" : "text-slate-600"}`}
                  >
                    {emailReminders ? "Enabled" : "Muted"}
                  </Button>
                </div>

                {/* In-App Alerts */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Bell className="h-4 w-4 text-indigo-600" /> In-App Notification Bell & Badges
                    </Label>
                    <p className="text-xs text-slate-500">Real-time alerts when your doctor adds treatment logs, issues prescriptions, or confirms visits.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setInAppAlerts(!inAppAlerts)}
                    className={`rounded-xl text-xs font-bold ${inAppAlerts ? "border-emerald-500 text-emerald-700 bg-emerald-50" : "text-slate-600"}`}
                  >
                    {inAppAlerts ? "Enabled" : "Muted"}
                  </Button>
                </div>

                {/* Medication Alerts */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-600" /> Post-Treatment Medication Alerts
                    </Label>
                    <p className="text-xs text-slate-500">Automated dosage schedule notifications for prescribed antibiotics and pain relief.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMedicationAlerts(!medicationAlerts)}
                    className={`rounded-xl text-xs font-bold ${medicationAlerts ? "border-emerald-500 text-emerald-700 bg-emerald-50" : "text-slate-600"}`}
                  >
                    {medicationAlerts ? "Enabled" : "Muted"}
                  </Button>
                </div>

                {/* Clinic Announcements */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-600" /> Holiday & Branch Advisory Notices
                    </Label>
                    <p className="text-xs text-slate-500">Receive announcements regarding typhoon suspensions and clinic holiday operating hours.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setClinicAnnouncements(!clinicAnnouncements)}
                    className={`rounded-xl text-xs font-bold ${clinicAnnouncements ? "border-emerald-500 text-emerald-700 bg-emerald-50" : "text-slate-600"}`}
                  >
                    {clinicAnnouncements ? "Enabled" : "Muted"}
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 border-t border-slate-100 py-3 flex justify-end">
                <Button type="submit" disabled={isSavingNotifications} className="bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  {isSavingNotifications ? "Saving..." : "Save Preferences"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* TAB 3: SECURITY & AUTHENTICATION */}
        <TabsContent value="security" className="mt-4 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <form onSubmit={handleUpdatePassword}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-indigo-600" />
                  <CardTitle className="text-lg">Change Password</CardTitle>
                </div>
                <CardDescription>
                  Update your patient account password to keep your medical and appointment records secure.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patient-new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="patient-new-password"
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
                  <Label htmlFor="patient-confirm-password">Confirm New Password</Label>
                  <Input
                    id="patient-confirm-password"
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
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Verified Patient Account
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

        {/* TAB 4: DATA PRIVACY (RA 10173) & PDF EXPORT */}
        <TabsContent value="privacy" className="mt-4 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg">Data Privacy & Medical Records Rights (RA 10173)</CardTitle>
              </div>
              <CardDescription>
                Under the Philippine Data Privacy Act (Republic Act No. 10173), you retain full rights to access, inspect, and export your personal dental health records.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* PDF Download Action Box */}
              <div className="p-5 rounded-2xl border border-indigo-200 bg-indigo-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-600" /> Official Dental Treatment Summary (PDF)
                  </h4>
                  <p className="text-xs text-slate-600 max-w-xl">
                    Generate an official, formatted summary of all your completed clinical procedures, past visit dates, and attending dentists for your personal records or health insurance claims.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleDownloadDentalSummary}
                  disabled={isExportingPDF}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold gap-2 px-4 shadow-sm shrink-0"
                >
                  <Download className="h-4 w-4" />
                  {isExportingPDF ? "Generating PDF..." : "Download My Dental Summary"}
                </Button>
              </div>

              {/* Data Rights & Clinical Retention Disclosure */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Clinical Data Governance & Retention Notice</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Right to Data Portability
                    </span>
                    You may download or request copies of your diagnostic records, prescriptions, and invoices at any time through this self-service portal.
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> 10-Year Clinical Record Retention
                    </span>
                    Per Department of Health (DOH) & PRC Dental Board regulations, dental health charts are legally preserved for a mandatory 10-year period for clinical continuity.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
