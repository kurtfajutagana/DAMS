import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  Building2,
  FileText,
  RefreshCw,
  Info,
  CalendarCheck,
  Stethoscope,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Phone
} from "lucide-react";
import ClinicalCalendarView from "../../components/ClinicalCalendarView";
import DailyClinicalReportModal from "../../components/DailyClinicalReportModal";
import {
  notifyAppointmentConfirmed,
  notifyAppointmentRescheduled,
  notifyAppointmentCancelled
} from "../../lib/procedureLogger";
import { STANDARD_CLINIC_SLOTS, formatTimeTo12h } from "../../lib/schedulingValidation";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function DentistSchedule() {
  const { user, profile } = useAuth() as any;
  const [appointments, setAppointments] = useState([]);
  const [dutySchedules, setDutySchedules] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const fetchDoctorData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Fetch branches
      const { data: bData } = await supabase.from("branches").select("id, branch_name");
      if (bData) setBranches(bData);

      // 2. Fetch doctor's weekly duty schedule
      const { data: schedData, error: sErr } = await supabase
        .from("dentist_schedules")
        .select(`
          id,
          day_of_week,
          start_time,
          end_time,
          is_active,
          branch:branches!dentist_schedules_branch_id_fkey(id, branch_name)
        `)
        .eq("dentist_id", user.id)
        .eq("is_active", true)
        .order("day_of_week", { ascending: true });

      if (!sErr && schedData) {
        setDutySchedules(schedData);
      }

      // 3. Fetch dentist's appointments (including pending requests)
      const { data: aptData, error: aptErr } = await supabase
        .from("appointments")
        .select(`
          *,
          patient:profiles!appointments_patient_id_fkey(first_name, last_name, contact_number),
          branch:branches!appointments_branch_id_fkey(branch_name)
        `)
        .eq("dentist_id", user.id)
        .in("status", ["pending", "scheduled", "waiting", "in_progress", "completed"])
        .order("appointment_date", { ascending: true });

      if (aptErr) {
        console.warn("Appointments join failed, fetching raw:", aptErr);
        const { data: rawApt } = await supabase
          .from("appointments")
          .select("*")
          .eq("dentist_id", user.id)
          .in("status", ["pending", "scheduled", "waiting", "in_progress", "completed"])
          .order("appointment_date", { ascending: true });

        setAppointments(rawApt || []);
      } else {
        setAppointments(aptData || []);
      }
    } catch (err) {
      console.error("Error fetching dentist schedule:", err);
      toast.error("Failed to load clinical schedule.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDoctorData();
  }, [fetchDoctorData]);

  const doctorDisplayName = profile?.first_name 
    ? `Dr. ${profile.first_name} ${profile.last_name || ''}`.trim()
    : "Doctor";

  // Selected appointment details & reschedule modal state
  const [selectedApt, setSelectedApt] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleNotes, setRescheduleNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenDetails = (apt: any) => {
    setSelectedApt(apt);
    setIsRescheduling(false);
    setIsDetailModalOpen(true);
  };

  const handleOpenReschedule = (apt: any) => {
    setSelectedApt(apt);
    setIsRescheduling(true);
    if (apt?.appointment_date) {
      const d = new Date(apt.appointment_date);
      setRescheduleDate(d.toISOString().split("T")[0]);
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      setRescheduleTime(`${hours}:${minutes}`);
    } else {
      setRescheduleDate("");
      setRescheduleTime("");
    }
    setRescheduleNotes("");
    setIsDetailModalOpen(true);
  };

  const handleConfirmDoctorReschedule = async () => {
    if (!selectedApt || !rescheduleDate || !rescheduleTime) {
      toast.error("Please pick a valid date and time slot.");
      return;
    }
    setIsSubmitting(true);
    try {
      const newIsoDate = new Date(`${rescheduleDate}T${rescheduleTime}:00`).toISOString();
      const prevDate = selectedApt.appointment_date;
      const patientName = selectedApt.patient ? `${selectedApt.patient.first_name} ${selectedApt.patient.last_name}` : "Patient";
      const serviceName = selectedApt.service_requested || "General Consultation";
      const reasonText = rescheduleNotes.trim() ? ` Reason: "${rescheduleNotes.trim()}".` : "";

      const existingNotes = selectedApt.notes || "";
      const prevFormatted = new Date(prevDate).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      const newFormatted = new Date(newIsoDate).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const reschedTag = `[Rescheduled by ${doctorDisplayName}: Moved from ${prevFormatted} to ${newFormatted}${reasonText}]`;
      const updatedNotes = existingNotes ? `${reschedTag} | ${existingNotes}` : reschedTag;

      const { error } = await supabase
        .from("appointments")
        .update({
          appointment_date: newIsoDate,
          notes: updatedNotes
        })
        .eq("id", selectedApt.id);

      if (error) throw error;

      // Log to appointment_reschedule_logs
      try {
        await supabase.from("appointment_reschedule_logs").insert({
          appointment_id: selectedApt.id,
          rescheduled_by: user.id,
          rescheduled_by_role: "dentist",
          previous_date: prevDate,
          new_date: newIsoDate,
          reason: rescheduleNotes.trim() || `Rescheduled by attending doctor ${doctorDisplayName}`
        });
      } catch (_) {}

      // Broadcast and log to audit_logs
      await notifyAppointmentRescheduled({
        patientName,
        service: serviceName,
        doctorName: doctorDisplayName,
        prevDate,
        newDate: newIsoDate,
        rescheduledBy: doctorDisplayName,
        reason: rescheduleNotes.trim()
      });

      // Insert in-app notification for patient
      if (selectedApt.patient_id) {
        try {
          await supabase.from("notifications").insert({
            patient_id: selectedApt.patient_id,
            title: "Doctor Rescheduled Your Visit",
            message: `${doctorDisplayName} has updated your appointment schedule for ${serviceName} to ${newFormatted}.${reasonText}`,
            is_read: false
          });
        } catch (_) {}
      }

      toast.success("Appointment rescheduled successfully!");
      setIsDetailModalOpen(false);
      fetchDoctorData();
    } catch (err: any) {
      console.error("Doctor reschedule error:", err);
      toast.error("Failed to reschedule: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDoctorApprove = async (apt: any) => {
    if (!apt) return;
    setIsSubmitting(true);
    try {
      const patientName = apt.patient ? `${apt.patient.first_name} ${apt.patient.last_name}` : "Patient";
      const serviceName = apt.service_requested || "General Consultation";

      const { error } = await supabase
        .from("appointments")
        .update({ status: "scheduled" })
        .eq("id", apt.id);

      if (error) throw error;

      await notifyAppointmentConfirmed({
        patientName,
        service: serviceName,
        doctorName: doctorDisplayName,
        appointmentDate: apt.appointment_date
      });

      if (apt.patient_id) {
        const dObj = new Date(apt.appointment_date);
        const formatted = `${dObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${dObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
        try {
          await supabase.from("notifications").insert({
            patient_id: apt.patient_id,
            title: "Appointment Approved & Confirmed",
            message: `Your appointment for ${serviceName} with ${doctorDisplayName} on ${formatted} has been approved by your doctor.`,
            is_read: false
          });
        } catch (_) {}
      }

      toast.success("Appointment approved and confirmed!");
      setIsDetailModalOpen(false);
      fetchDoctorData();
    } catch (err: any) {
      console.error("Doctor approve error:", err);
      toast.error("Failed to approve appointment: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDoctorCancel = async (apt: any) => {
    if (!apt) return;
    setIsSubmitting(true);
    try {
      const patientName = apt.patient ? `${apt.patient.first_name} ${apt.patient.last_name}` : "Patient";
      const serviceName = apt.service_requested || "General Consultation";

      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", apt.id);

      if (error) throw error;

      await notifyAppointmentCancelled({
        patientName,
        service: serviceName,
        doctorName: doctorDisplayName,
        cancelledBy: doctorDisplayName,
        reason: "Clinical scheduling adjustment"
      });

      if (apt.patient_id) {
        const dObj = new Date(apt.appointment_date);
        const formatted = `${dObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${dObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
        try {
          await supabase.from("notifications").insert({
            patient_id: apt.patient_id,
            title: "Appointment Cancelled by Doctor",
            message: `Your appointment for ${serviceName} with ${doctorDisplayName} on ${formatted} was cancelled. Please contact reception to reschedule.`,
            is_read: false
          });
        } catch (_) {}
      }

      toast.success("Appointment cancelled.");
      setIsDetailModalOpen(false);
      fetchDoctorData();
    } catch (err: any) {
      console.error("Doctor cancel error:", err);
      toast.error("Failed to cancel appointment: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">My Clinical Schedule</h1>
            <Badge className="bg-indigo-100 text-indigo-800 font-bold border-indigo-200">Ahead-of-Time View</Badge>
          </div>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Review upcoming confirmed appointments, check your weekly duty rotation, and plan chairside consultations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsReportModalOpen(true)}
            variant="outline"
            className="border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold text-xs h-9 px-3 rounded-xl gap-1.5 shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            My Daily Cases Report
          </Button>

          <Button
            onClick={fetchDoctorData}
            disabled={loading}
            variant="outline"
            className="border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold text-xs h-9 px-3 rounded-xl gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Agreed Weekly Duty Roster Banner */}
      <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/50 via-white to-slate-50 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-sm font-bold text-slate-900">Agreed Weekly Duty Roster & Branch Rotations</CardTitle>
            </div>
            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-slate-400" /> Coordinated with Clinic Administration
            </span>
          </div>
          <CardDescription className="text-xs text-slate-600">
            Your recurring clinical duty schedule agreed with management. Patients can book with you during these operating windows.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white border border-indigo-100/70 rounded-xl p-3 space-y-2">
                  <div className="h-3.5 w-16 bg-slate-200 rounded shimmer-sweep" />
                  <div className="h-3 w-20 bg-slate-100 rounded shimmer-sweep" />
                  <div className="h-2.5 w-14 bg-slate-100 rounded shimmer-sweep" />
                </div>
              ))}
            </div>
          ) : dutySchedules.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {dutySchedules.map((duty: any) => {
                const dayName = DAY_NAMES[duty.day_of_week] || `Day ${duty.day_of_week}`;
                const branchName = duty.branch?.branch_name || "Pasig";
                return (
                  <div
                    key={duty.id}
                    className="bg-white border border-indigo-100/80 rounded-xl p-2.5 shadow-2xs flex flex-col justify-between space-y-1 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900">{dayName}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active Duty" />
                    </div>
                    <div className="text-[11px] font-semibold text-indigo-700 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-indigo-500" />
                      {branchName}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {duty.start_time?.slice(0, 5)} - {duty.end_time?.slice(0, 5)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-100">
              No active weekly duty days recorded. Please contact clinic administration to assign your branch schedule.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Synchronized Ahead-of-Time Calendar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" /> Ahead-of-Time Appointment Calendar
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {loading ? "Syncing schedule..." : `Showing ${appointments.length} scheduled visits`}
          </span>
        </div>

        {loading && appointments.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-6 w-48 bg-slate-200 rounded shimmer-sweep" />
              <div className="flex gap-2">
                <div className="h-8 w-20 bg-slate-100 rounded-lg shimmer-sweep" />
                <div className="h-8 w-20 bg-slate-100 rounded-lg shimmer-sweep" />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-3 pt-2">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="h-8 bg-slate-100 rounded-lg shimmer-sweep" />
              ))}
              {[...Array(28)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-50 border border-slate-100 rounded-xl p-2 space-y-2">
                  <div className="h-3 w-5 bg-slate-200 rounded shimmer-sweep" />
                  {i % 3 === 0 && <div className="h-4 w-full bg-indigo-50 border border-indigo-100 rounded shimmer-sweep" />}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <ClinicalCalendarView
            appointments={appointments}
            branches={branches}
            lockedDentistId={user?.id}
            isDentistView={true}
            onSelectAppointment={handleOpenDetails}
            onReschedule={handleOpenReschedule}
          />
        )}
      </div>

      {/* Appointment Details & Doctor Reschedule Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-lg p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              {isRescheduling ? "Reschedule Consultation" : "Appointment Details"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {isRescheduling 
                ? "Adjust this patient's clinical appointment slot. Patient and clinic staff will be notified instantly."
                : "Review patient request info and update chairside scheduling."}
            </DialogDescription>
          </DialogHeader>

          {selectedApt && (
            <div className="space-y-4 pt-2">
              {/* Patient info card */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-600" />
                    {selectedApt.patient ? `${selectedApt.patient.first_name} ${selectedApt.patient.last_name}` : "Walk-in Patient"}
                  </span>
                  <Badge className={`text-[10px] font-bold uppercase ${
                    selectedApt.status === "scheduled" ? "bg-emerald-100 text-emerald-800" :
                    selectedApt.status === "pending" ? "bg-amber-100 text-amber-900" :
                    selectedApt.status === "cancelled" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"
                  }`}>
                    {selectedApt.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                  <div className="flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium truncate">{selectedApt.service_requested || "General Consultation"}</span>
                  </div>
                  {selectedApt.patient?.contact_number && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium">{selectedApt.patient.contact_number}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 col-span-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">
                      Current: {new Date(selectedApt.appointment_date).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                {selectedApt.notes && (
                  <p className="text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-100 italic">
                    "{selectedApt.notes}"
                  </p>
                )}
              </div>

              {/* Reschedule Inputs */}
              {isRescheduling ? (
                <div className="space-y-3 p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 animate-in fade-in duration-200">
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarCheck className="w-3.5 h-3.5 text-indigo-600" /> New Date & Time Slot
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Select Date</label>
                      <input
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Select Time Slot</label>
                      <select
                        value={rescheduleTime}
                        onChange={(e) => setRescheduleTime(e.target.value)}
                        className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Choose slot...</option>
                        {STANDARD_CLINIC_SLOTS.map((slot) => {
                          const [t, p] = slot.split(" ");
                          const [h, m] = t.split(":");
                          let hourNum = parseInt(h, 10);
                          if (p === "PM" && hourNum < 12) hourNum += 12;
                          if (p === "AM" && hourNum === 12) hourNum = 0;
                          const val = `${String(hourNum).padStart(2, "0")}:${m}`;
                          return (
                            <option key={slot} value={val}>
                              {slot}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Doctor Note / Reason for Reschedule</label>
                    <textarea
                      rows={2}
                      value={rescheduleNotes}
                      onChange={(e) => setRescheduleNotes(e.target.value)}
                      placeholder="e.g. In emergency surgery, moved to afternoon slot"
                      className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100">
            {isRescheduling ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsRescheduling(false)}
                  disabled={isSubmitting}
                  className="text-xs rounded-xl"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmDoctorReschedule}
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl gap-1.5"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  {isSubmitting ? "Updating..." : "Confirm Reschedule"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-xs rounded-xl"
                >
                  Close
                </Button>

                {selectedApt?.status === "pending" && (
                  <Button
                    onClick={() => handleDoctorApprove(selectedApt)}
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve Request
                  </Button>
                )}

                {(selectedApt?.status === "scheduled" || selectedApt?.status === "pending") && (
                  <>
                    <Button
                      onClick={() => handleOpenReschedule(selectedApt)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl gap-1.5"
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      Reschedule
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDoctorCancel(selectedApt)}
                      disabled={isSubmitting}
                      className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs rounded-xl gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Cancel Visit
                    </Button>
                  </>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily Clinical Report Modal for Dentist */}
      <DailyClinicalReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        lockedDentistId={user?.id}
        dentistName={doctorDisplayName}
        initialBranchId={profile?.branch_id}
        lockedBranchId={profile?.branch_id}
      />
    </div>
  );
}

