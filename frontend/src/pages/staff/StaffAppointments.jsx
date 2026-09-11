import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";
import { Calendar, User, FileText, CheckSquare, Clock, CheckCircle2, XCircle, CalendarClock, AlertTriangle, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { useAuth } from "../../contexts/AuthContext";

export default function StaffAppointments() {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dentists, setDentists] = useState([]);
  const [scheduleFilter, setScheduleFilter] = useState("today"); // "today" | "upcoming" | "missed" | "all"
  const [searchQuery, setSearchQuery] = useState("");
  
  // Assign Dentist Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAppointmentForAssign, setSelectedAppointmentForAssign] = useState(null);
  const [selectedDentistId, setSelectedDentistId] = useState("");
  
  // Approve / Reject Action Modal State
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState("");
  const [selectedActionAppointmentId, setSelectedActionAppointmentId] = useState(null);

  // Reschedule Modal State
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedAppointmentForReschedule, setSelectedAppointmentForReschedule] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("09:00");
  const [rescheduleDentistId, setRescheduleDentistId] = useState("");
  const [rescheduleNotes, setRescheduleNotes] = useState("");
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  const fetchDentists = useCallback(async () => {
    try {
      let query = supabase
        .from("profiles")
        .select("id, first_name, last_name, branch_id")
        .eq("role", "dentist")
        .eq("is_active", true);
      
      if (profile?.branch_id) {
        query = query.eq("branch_id", profile.branch_id);
      }
      
      const { data, error } = await query;
      
      if (!error && data) {
        setDentists(data);
      }
    } catch (err) {
      console.error("Error fetching dentists:", err);
    }
  }, [profile?.branch_id]);

  const fetchAppointmentsFallback = useCallback(async () => {
    if (!profile?.branch_id) return;
    try {
      const { data: aptData, error: aptError } = await supabase
        .from("appointments")
        .select("*")
        .eq("branch_id", profile.branch_id)
        .in("status", ["scheduled", "pending"])
        .order("appointment_date", { ascending: true });
        
      if (aptError) throw aptError;
      
      if (!aptData || aptData.length === 0) {
        setAppointments([]);
        return;
      }
      
      // Fetch related profiles
      const { data: profiles } = await supabase.from("profiles").select("id, first_name, last_name, contact_number");
      
      const enrichedData = aptData.map(apt => {
        const patient = profiles?.find(p => p.id === apt.patient_id);
        const dentist = profiles?.find(p => p.id === apt.dentist_id);
        return {
          ...apt,
          patient: patient || null,
          dentist: dentist || null
        };
      });
      
      setAppointments(enrichedData);
    } catch (err) {
      console.error("Fallback fetch failed", err);
    }
  }, [profile]);

  const fetchAppointments = useCallback(async () => {
    if (!profile?.branch_id) return;
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          patient:profiles!appointments_patient_id_fkey(first_name, last_name, contact_number, is_email_verified),
          dentist:profiles!appointments_dentist_id_fkey(first_name, last_name)
        `)
        .eq("branch_id", profile.branch_id)
        .in("status", ["scheduled", "pending"])
        .order("appointment_date", { ascending: true });

      if (error) {
        console.warn("Join failed, trying raw fetch...");
        await fetchAppointmentsFallback();
      } else {
        setAppointments(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [profile, fetchAppointmentsFallback]);

  useEffect(() => {
    if (profile?.branch_id) {
      const loadData = async () => {
        await fetchAppointments();
        await fetchDentists();
      };
      loadData();

      const channel = supabase
        .channel("staff_appointments_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "appointments",
            filter: `branch_id=eq.${profile.branch_id}`,
          },
          () => {
            fetchAppointments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile, fetchAppointments, fetchDentists]);

  const handleCheckIn = async (appointment) => {
    if (!appointment.dentist_id) {
      setSelectedAppointmentForAssign(appointment);
      setSelectedDentistId("");
      setIsAssignModalOpen(true);
      return;
    }
    
    await processCheckIn(appointment.id, appointment.dentist_id);
  };

  const handleAssignAndCheckIn = async () => {
    if (!selectedDentistId) {
      toast.error("Please select a dentist.");
      return;
    }
    
    setIsAssignModalOpen(false);
    await processCheckIn(
      selectedAppointmentForAssign.id, 
      selectedDentistId
    );
  };

  const processCheckIn = async (appointmentId, dentistId) => {
    try {
      const { error: aptError } = await supabase
        .from("appointments")
        .update({ status: "waiting", dentist_id: dentistId })
        .eq("id", appointmentId);

      if (aptError) throw aptError;

      toast.success("Patient successfully checked into the daily queue!");
      fetchAppointments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to check-in patient.");
    }
  };

  const handleApproveClick = (appointmentId) => {
    setSelectedActionAppointmentId(appointmentId);
    setActionType("approve");
    setIsActionModalOpen(true);
  };

  const handleRejectClick = (appointmentId) => {
    setSelectedActionAppointmentId(appointmentId);
    setActionType("reject");
    setIsActionModalOpen(true);
  };

  const confirmAction = async () => {
    if (!selectedActionAppointmentId) return;
    setIsActionModalOpen(false);
    
    const newStatus = actionType === "approve" ? "scheduled" : "cancelled";
    const successMsg = actionType === "approve" ? "Appointment approved and scheduled." : "Appointment rejected and cancelled.";
    const errorMsg = actionType === "approve" ? "Failed to approve appointment." : "Failed to reject appointment.";

    try {
      const { error } = await supabase.from("appointments").update({ status: newStatus }).eq("id", selectedActionAppointmentId);
      if (error) throw error;
      toast.success(successMsg);
      fetchAppointments();
    } catch (err) {
      console.error(err);
      toast.error(errorMsg);
    }
  };

  // RESCHEDULE HANDLERS
  const handleOpenReschedule = (appointment) => {
    setSelectedAppointmentForReschedule(appointment);
    const d = new Date(appointment.appointment_date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");

    setRescheduleDate(`${year}-${month}-${day}`);
    setRescheduleTime(`${hours}:${mins}`);
    setRescheduleDentistId(appointment.dentist_id || "any");
    setRescheduleNotes("");
    setIsRescheduleModalOpen(true);
  };

  const handleConfirmReschedule = async (e) => {
    e.preventDefault();
    if (!selectedAppointmentForReschedule || !rescheduleDate || !rescheduleTime) {
      toast.error("Please pick a date and time.");
      return;
    }

    try {
      setIsSubmittingReschedule(true);
      const dateTimeString = `${rescheduleDate}T${rescheduleTime}:00`;
      const newIsoDate = new Date(dateTimeString).toISOString();

      const updatePayload = {
        appointment_date: newIsoDate,
        status: "scheduled",
        dentist_id: rescheduleDentistId && rescheduleDentistId !== "any" ? rescheduleDentistId : null
      };

      if (rescheduleNotes.trim()) {
        const existingNotes = selectedAppointmentForReschedule.notes || "";
        updatePayload.notes = existingNotes 
          ? `${existingNotes} | Rescheduled: ${rescheduleNotes.trim()}` 
          : `Rescheduled by staff: ${rescheduleNotes.trim()}`;
      }

      const { error } = await supabase
        .from("appointments")
        .update(updatePayload)
        .eq("id", selectedAppointmentForReschedule.id);

      if (error) throw error;

      toast.success("Appointment successfully rescheduled and scheduled!");
      setIsRescheduleModalOpen(false);
      fetchAppointments();
    } catch (err) {
      console.error("Reschedule error:", err);
      toast.error("Failed to reschedule appointment.");
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  // Categorize appointments
  const now = new Date();
  const todayStr = now.toDateString();

  const pendingAppointments = appointments.filter(a => a.status === "pending");
  const allScheduledAppointments = appointments.filter(a => a.status === "scheduled");

  const todayScheduled = useMemo(() => {
    return allScheduledAppointments.filter(a => {
      const aptDate = new Date(a.appointment_date);
      return aptDate.toDateString() === todayStr;
    });
  }, [allScheduledAppointments, todayStr]);

  const upcomingScheduled = useMemo(() => {
    return allScheduledAppointments.filter(a => {
      const aptDate = new Date(a.appointment_date);
      const isToday = aptDate.toDateString() === todayStr;
      return aptDate > now && !isToday;
    });
  }, [allScheduledAppointments, todayStr, now]);

  const missedScheduled = useMemo(() => {
    return allScheduledAppointments.filter(a => {
      const aptDate = new Date(a.appointment_date);
      const isToday = aptDate.toDateString() === todayStr;
      return aptDate < now && !isToday;
    });
  }, [allScheduledAppointments, todayStr, now]);

  const displayedScheduled = useMemo(() => {
    let list = allScheduledAppointments;
    if (scheduleFilter === "today") {
      list = todayScheduled;
    } else if (scheduleFilter === "upcoming") {
      list = upcomingScheduled;
    } else if (scheduleFilter === "missed") {
      list = missedScheduled;
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(a => {
      const patientName = `${a.patient?.first_name || ""} ${a.patient?.last_name || ""}`.toLowerCase();
      const service = (a.service_requested || "").toLowerCase();
      const doctor = `${a.dentist?.first_name || ""} ${a.dentist?.last_name || ""}`.toLowerCase();
      return patientName.includes(q) || service.includes(q) || doctor.includes(q);
    });
  }, [allScheduledAppointments, scheduleFilter, todayScheduled, upcomingScheduled, missedScheduled, searchQuery]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading appointments...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Appointments & Scheduling</h1>
          <p className="text-sm font-medium text-slate-600 mt-1">Approve online bookings, track upcoming or missed visits, and check in patients into the live queue.</p>
        </div>
      </div>

      {/* ASSIGN DENTIST MODAL */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Assign Dentist</DialogTitle>
            <DialogDescription>
              This patient chose "Any Available" during booking. Please assign an available dentist to handle this visit.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="dentist" className="text-xs font-bold text-slate-700">Available Dentists</Label>
              <Select value={selectedDentistId} onValueChange={setSelectedDentistId}>
                <SelectTrigger id="dentist" className="rounded-xl">
                  <SelectValue placeholder="Select a dentist..." />
                </SelectTrigger>
                <SelectContent>
                  {dentists.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      Dr. {d.first_name} {d.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleAssignAndCheckIn} className="bg-slate-950 hover:bg-slate-800 text-white rounded-xl font-semibold">
              Assign & Check-In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* APPROVE / REJECT ACTION MODAL */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {actionType === "approve" ? "Approve Appointment" : "Reject & Cancel Appointment"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve" 
                ? "Are you sure you want to approve this appointment? It will be confirmed and moved to the scheduled visits."
                : "Are you sure you want to reject and cancel this appointment request? (Tip: You can also use 'Reschedule' to suggest a new time instead of rejecting)."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsActionModalOpen(false)} className="rounded-xl">Cancel</Button>
            <Button 
              onClick={confirmAction} 
              className={`rounded-xl font-semibold ${actionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"}`}
            >
              {actionType === "approve" ? "Yes, Approve Visit" : "Yes, Reject & Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RESCHEDULE MODAL */}
      <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-indigo-600" /> Reschedule Appointment
            </DialogTitle>
            <DialogDescription>
              Adjust the date, time, or assigned dentist for{" "}
              <strong className="text-slate-900">
                {selectedAppointmentForReschedule?.patient?.first_name} {selectedAppointmentForReschedule?.patient?.last_name}
              </strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmReschedule} className="space-y-4 py-2">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Requested Treatment:</span>
                <span className="font-bold text-slate-900">{selectedAppointmentForReschedule?.service_requested || "General Consultation"}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Original Time:</span>
                <span className="font-semibold text-slate-700">
                  {selectedAppointmentForReschedule && new Date(selectedAppointmentForReschedule.appointment_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">New Date *</Label>
                <Input 
                  type="date" 
                  value={rescheduleDate} 
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="rounded-xl font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">New Time Slot *</Label>
                <Select value={rescheduleTime} onValueChange={setRescheduleTime}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select Time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[220px]">
                    {["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"].map((time) => {
                      const [h, m] = time.split(':');
                      const hourNum = parseInt(h);
                      const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
                      const ampm = hourNum >= 12 ? 'PM' : 'AM';
                      return (
                        <SelectItem key={time} value={time}>
                          {displayHour}:{m} {ampm}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Assigned Dentist</Label>
              <Select value={rescheduleDentistId} onValueChange={setRescheduleDentistId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choose Dentist" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Available Dentist</SelectItem>
                  {dentists.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      Dr. {d.first_name} {d.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Reschedule Reason / Staff Note (Optional)</Label>
              <Textarea 
                placeholder="e.g. Patient missed yesterday / requested morning slot" 
                value={rescheduleNotes}
                onChange={(e) => setRescheduleNotes(e.target.value)}
                className="rounded-xl text-xs min-h-[60px]"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsRescheduleModalOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmittingReschedule}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm"
              >
                {isSubmittingReschedule ? "Updating..." : "Confirm & Reschedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PENDING REQUESTS (AI & Online) */}
      {pendingAppointments.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" /> Pending Requests (Online Bookings)
            </h2>
            <Badge className="bg-amber-100 text-amber-800 font-bold border-amber-200">{pendingAppointments.length} Pending Approval</Badge>
          </div>
          <Card className="border-amber-200 shadow-sm overflow-hidden border-2 rounded-2xl bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-700 font-bold uppercase bg-amber-50/70 border-b border-amber-200">
                  <tr>
                    <th className="px-5 py-3.5 font-bold">Requested Date & Time</th>
                    <th className="px-5 py-3.5 font-bold">Patient</th>
                    <th className="px-5 py-3.5 font-bold">Service</th>
                    <th className="px-5 py-3.5 font-bold">Dentist</th>
                    <th className="px-5 py-3.5 font-bold text-right">Staff Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100/70">
                  {pendingAppointments.map((apt) => {
                    const aptDate = new Date(apt.appointment_date);
                    return (
                      <tr key={apt.id} className="bg-white hover:bg-amber-50/40 transition-colors">
                        <td className="px-5 py-4 align-top">
                          <div className="flex items-center gap-2 font-bold text-slate-900">
                            <Calendar className="h-4 w-4 text-indigo-600" />
                            {aptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 mt-1 text-xs font-semibold">
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                            {aptDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="font-bold text-slate-900">
                            {apt.patient ? `${apt.patient.first_name} ${apt.patient.last_name}` : "Unknown Patient"}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            {apt.patient?.is_email_verified ? (
                              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 font-bold text-[10px]">
                                ● Portal Active
                              </span>
                            ) : (
                              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60 font-bold text-[10px]">
                                ○ Walk-In Record
                              </span>
                            )}
                          </div>
                          {apt.patient?.contact_number && (
                            <div className="text-slate-500 text-xs mt-1">
                              📞 {apt.patient.contact_number}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="font-medium text-slate-800">
                            {apt.service_requested || "General Consultation"}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {apt.dentist ? `Dr. ${apt.dentist.first_name} ${apt.dentist.last_name}` : <span className="italic text-slate-400">Any Available</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* APPROVE */}
                            <Button 
                              onClick={() => handleApproveClick(apt.id)}
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>

                            {/* RESCHEDULE */}
                            <Button 
                              onClick={() => handleOpenReschedule(apt)}
                              variant="outline"
                              size="sm"
                              className="text-indigo-700 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 rounded-xl text-xs font-semibold"
                            >
                              <CalendarClock className="h-3.5 w-3.5 mr-1" /> Reschedule
                            </Button>

                            {/* REJECT */}
                            <Button 
                              onClick={() => handleRejectClick(apt.id)}
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* SCHEDULED APPOINTMENTS CONTAINER */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-indigo-600" /> Confirmed Appointments
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Filter between upcoming sessions, today's schedule, and missed appointments.</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setScheduleFilter("today")}
              className={`h-8 text-xs font-bold rounded-lg transition-all ${
                scheduleFilter === "today" ? "bg-white text-slate-950 shadow-xs" : "text-slate-600"
              }`}
            >
              Today's Schedule
              <Badge className="ml-1.5 bg-emerald-600 text-white text-[10px] px-1.5 py-0">{todayScheduled.length}</Badge>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setScheduleFilter("upcoming")}
              className={`h-8 text-xs font-bold rounded-lg transition-all ${
                scheduleFilter === "upcoming" ? "bg-white text-slate-950 shadow-xs" : "text-slate-600"
              }`}
            >
              Upcoming Bookings
              <Badge className="ml-1.5 bg-indigo-600 text-white text-[10px] px-1.5 py-0">{upcomingScheduled.length}</Badge>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setScheduleFilter("missed")}
              className={`h-8 text-xs font-bold rounded-lg transition-all ${
                scheduleFilter === "missed" ? "bg-white text-rose-700 shadow-xs" : "text-slate-600"
              }`}
            >
              Missed Visits
              {missedScheduled.length > 0 && (
                <Badge className="ml-1.5 bg-rose-500 text-white text-[10px] px-1.5 py-0">{missedScheduled.length}</Badge>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setScheduleFilter("all")}
              className={`h-8 text-xs font-bold rounded-lg transition-all ${
                scheduleFilter === "all" ? "bg-white text-slate-950 shadow-xs" : "text-slate-600"
              }`}
            >
              All ({allScheduledAppointments.length})
            </Button>
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/70 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Date & Time</th>
                  <th className="px-5 py-3.5 font-bold">Patient</th>
                  <th className="px-5 py-3.5 font-bold">Service</th>
                  <th className="px-5 py-3.5 font-bold">Assigned Dentist</th>
                  <th className="px-5 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedScheduled.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-5 py-12 text-center text-slate-500">
                      <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">
                        {scheduleFilter === "today" 
                          ? "No appointments scheduled for today." 
                          : scheduleFilter === "missed" 
                          ? "No missed appointments! All past visits were handled." 
                          : scheduleFilter === "upcoming" 
                          ? "No upcoming future appointments found." 
                          : "No scheduled appointments found for this branch."}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">Confirmed patient appointments will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  displayedScheduled.map((apt) => {
                    const aptDate = new Date(apt.appointment_date);
                    const isToday = aptDate.toDateString() === todayStr;
                    const isMissed = aptDate < now && !isToday;
                    const isFuture = aptDate > now && !isToday;
                    
                    return (
                      <tr key={apt.id} className={`transition-colors ${isMissed ? "bg-rose-50/30 hover:bg-rose-50/60" : "bg-white hover:bg-slate-50/50"}`}>
                        <td className="px-5 py-4 align-top">
                          <div className="flex items-center gap-2 font-bold text-slate-900">
                            <Calendar className="h-4 w-4 text-indigo-600" />
                            {aptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 mt-1 text-xs font-semibold">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {aptDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            {isToday && <Badge className="ml-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none px-1.5 py-0 text-[10px] font-bold">Today</Badge>}
                            {isFuture && <Badge className="ml-1 bg-blue-50 text-blue-700 border-blue-200 border px-1.5 py-0 text-[10px] font-bold">Upcoming</Badge>}
                            {isMissed && (
                              <Badge className="ml-1 bg-rose-100 text-rose-800 border-rose-200 border text-[10px] font-bold">
                                Missed / Past
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="font-bold text-slate-900">
                            {apt.patient ? `${apt.patient.first_name} ${apt.patient.last_name}` : "Unknown Patient"}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            {apt.patient?.is_email_verified ? (
                              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 font-bold text-[10px]">
                                ● Portal Active
                              </span>
                            ) : (
                              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60 font-bold text-[10px]">
                                ○ Walk-In Record
                              </span>
                            )}
                          </div>
                          {apt.patient?.contact_number && (
                            <div className="text-slate-500 text-xs mt-1">
                              📞 {apt.patient.contact_number}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="font-medium text-slate-800">
                            {apt.service_requested || "General Consultation"}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {apt.dentist ? `Dr. ${apt.dentist.first_name} ${apt.dentist.last_name}` : <span className="italic text-slate-400">Any Available</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* RESCHEDULE */}
                            <Button 
                              onClick={() => handleOpenReschedule(apt)}
                              variant="outline"
                              size="sm"
                              className={`${isMissed ? "text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100" : "text-slate-700 hover:text-indigo-600 border-slate-200"} rounded-xl text-xs font-semibold`}
                            >
                              <CalendarClock className="h-3.5 w-3.5 mr-1" /> Reschedule
                            </Button>

                            {/* CHECK-IN (ENABLED FOR TODAY ONLY, DISABLED ON FUTURE DATES) */}
                            {isToday ? (
                              <Button 
                                onClick={() => handleCheckIn(apt)}
                                size="sm"
                                className="bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm gap-1"
                              >
                                <CheckSquare className="h-3.5 w-3.5" /> Check-In
                              </Button>
                            ) : isMissed ? (
                              <Button 
                                onClick={() => handleOpenReschedule(apt)}
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm gap-1"
                              >
                                <CalendarClock className="h-3.5 w-3.5" /> Reschedule
                              </Button>
                            ) : (
                              <Button 
                                disabled
                                size="sm"
                                title={`Check-in opens on ${aptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                                className="bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed rounded-xl text-xs font-semibold shadow-none gap-1 opacity-75"
                              >
                                <Clock className="h-3.5 w-3.5" /> Opens on {aptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
