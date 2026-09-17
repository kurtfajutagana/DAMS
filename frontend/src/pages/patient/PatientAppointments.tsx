import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Plus, 
  X, 
  CalendarCheck, 
  FileText, 
  Star, 
  CalendarClock, 
  RotateCcw, 
  CheckCircle2,
  Building2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Info,
  Search,
  Filter,
  Phone
} from "lucide-react";
import { Textarea } from "../../components/ui/textarea";
import { format, parseISO } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Calendar } from "../../components/ui/calendar";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "../../components/ui/dialog";
import { 
  validateAppointmentScheduling, 
  parseTimeTo24h,
  formatTimeTo12h,
  STANDARD_CLINIC_SLOTS,
  isWithinRescheduleCutoff,
  getOccupiedSlots
} from "../../lib/schedulingValidation";

interface Branch {
  id: string;
  branch_name: string;
  is_active?: boolean;
}

interface Dentist {
  id: string;
  first_name: string;
  last_name: string;
  branch_id?: string;
  specialization?: string;
}

interface ClinicService {
  id: string;
  service_name: string;
  cost?: number;
}

interface Appointment {
  id: string;
  patient_id?: string;
  dentist_id?: string | null;
  appointment_date: string;
  branch?: string;
  branch_id?: string;
  service_requested?: string;
  status?: string;
  notes?: string;
  branches?: {
    branch_name: string;
  };
}

interface DentistRating {
  id: string;
  appointment_id: string;
  dentist_id: string;
  rating: number;
  feedback?: string;
  created_at?: string;
}

export default function PatientAppointments() {
  const { user } = useAuth() as any;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [clinicServices, setClinicServices] = useState<ClinicService[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Booking Form & Preview State
  const [bookingStep, setBookingStep] = useState<1 | 2>(1);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [selectedDentist, setSelectedDentist] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [otherService, setOtherService] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Appointment Details & Fee Preview Modal State
  const [selectedDetailApt, setSelectedDetailApt] = useState<Appointment | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedCancelId, setSelectedCancelId] = useState<string | null>(null);

  const [branches, setBranches] = useState<Branch[]>([]);
  
  // Rating State (Map of appointment_id -> DentistRating)
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [ratingApt, setRatingApt] = useState<Appointment | null>(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [ratingsMap, setRatingsMap] = useState<Record<string, DentistRating>>({});

  // Appointment History Search & Filter State
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [historyBranchFilter, setHistoryBranchFilter] = useState("all");

  // Self-Service Reschedule Modal States
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isCutoffAlertOpen, setIsCutoffAlertOpen] = useState(false);
  const [selectedRescheduleApt, setSelectedRescheduleApt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("09:00 AM");
  const [rescheduleDentistId, setRescheduleDentistId] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);
  const [dentistSchedules, setDentistSchedules] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      checkAndProcessDraftBooking();
      fetchAppointments();
      fetchDentists();
      fetchServices();
      fetchBranches();
      fetchRatings();
      fetchDentistSchedules();
    }
  }, [user]);

  const fetchDentistSchedules = async () => {
    try {
      const { data } = await supabase
        .from("dentist_schedules")
        .select("dentist_id, branch_id, day_of_week, start_time, end_time, is_active")
        .eq("is_active", true);
      if (data) setDentistSchedules(data);
    } catch (err) {
      console.error("Error fetching duty schedules:", err);
    }
  };

  const handleOpenPatientReschedule = (apt: Appointment) => {
    if (isWithinRescheduleCutoff(apt.appointment_date, 2)) {
      setSelectedRescheduleApt(apt);
      setIsCutoffAlertOpen(true);
      return;
    }

    setSelectedRescheduleApt(apt);
    const d = new Date(apt.appointment_date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = d.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const formattedSlot = `${String(hour12).padStart(2, "0")}:00 ${ampm}`;

    setRescheduleDate(`${y}-${m}-${day}`);
    setRescheduleTime(formattedSlot);
    setRescheduleDentistId(apt.dentist_id || "any");
    setRescheduleReason("");
    setIsRescheduleModalOpen(true);
  };

  const handleConfirmPatientReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRescheduleApt || !rescheduleDate || !rescheduleTime) {
      toast.error("Please pick a date and 1-hour time slot.");
      return;
    }

    try {
      setIsSubmittingReschedule(true);
      const time24 = parseTimeTo24h(rescheduleTime);
      const dateTimeString = `${rescheduleDate}T${time24}:00`;
      const newIsoDate = new Date(dateTimeString).toISOString();

      const dentistId = (rescheduleDentistId && rescheduleDentistId !== "any") 
        ? rescheduleDentistId 
        : selectedRescheduleApt.dentist_id;

      // Validation check
      const validation = validateAppointmentScheduling({
        targetDate: rescheduleDate,
        targetTime: rescheduleTime,
        targetDentistId: dentistId,
        allClinicAppointments: appointments,
        excludeAppointmentId: selectedRescheduleApt.id
      });

      if (!validation.isValid) {
        toast.error(validation.message || "This slot is already booked for this dentist.");
        setIsSubmittingReschedule(false);
        return;
      }

      const updatePayload: any = {
        appointment_date: newIsoDate,
        status: "scheduled",
        dentist_id: dentistId || null
      };

      if (rescheduleReason.trim()) {
        const existingNotes = selectedRescheduleApt.notes || "";
        updatePayload.notes = existingNotes
          ? `${existingNotes} | Rescheduled by patient: ${rescheduleReason.trim()}`
          : `Rescheduled by patient: ${rescheduleReason.trim()}`;
      }

      const { error } = await supabase
        .from("appointments")
        .update(updatePayload)
        .eq("id", selectedRescheduleApt.id);

      if (error) throw error;

      // Audit Log
      try {
        await supabase.from("appointment_reschedule_logs").insert({
          appointment_id: selectedRescheduleApt.id,
          rescheduled_by: user.id,
          rescheduled_by_role: "patient",
          previous_date: selectedRescheduleApt.appointment_date,
          new_date: newIsoDate,
          reason: rescheduleReason.trim() || "Rescheduled via self-service patient portal"
        });
      } catch (logErr) {
        console.warn("Reschedule audit logging error:", logErr);
      }

      toast.success("Your visit has been successfully rescheduled!");
      setIsRescheduleModalOpen(false);
      fetchAppointments();
    } catch (err: any) {
      console.error("Reschedule error:", err);
      toast.error("Failed to reschedule appointment: " + err.message);
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  const checkAndProcessDraftBooking = async () => {
    const savedDraft = localStorage.getItem("pendingBookingDraft");
    if (!savedDraft || !user) return;

    try {
      const draft = JSON.parse(savedDraft);
      const time24 = parseTimeTo24h(draft.time);
      const dateTimeString = `${draft.date}T${time24}:00`;
      const appointmentDate = new Date(dateTimeString).toISOString();

      const dentistId = (draft.doctor === "any" || !draft.doctor || draft.doctor.startsWith("dr-")) ? null : draft.doctor;
      const branchFormatted = draft.branch ? (draft.branch.charAt(0).toUpperCase() + draft.branch.slice(1) + " Branch") : "Pasig Branch";

      // Scheduling validation check
      const validation = validateAppointmentScheduling({
        targetDate: draft.date,
        targetTime: draft.time,
        targetBranchName: branchFormatted,
        existingAppointments: appointments
      });

      if (!validation.isValid) {
        toast.error(validation.message || "Conflict with existing appointments.");
        localStorage.removeItem("pendingBookingDraft");
        return;
      }

      // Match branch_id so staff and dentists in that branch can view the booking
      let matchedBranchId: string | null = null;
      try {
        const { data: bData } = await supabase.from("branches").select("id, branch_name");
        if (bData && bData.length > 0) {
          const rawBranch = (draft.branch || "pasig").toLowerCase();
          const found = bData.find(b => 
            b.branch_name.toLowerCase().includes(rawBranch) || 
            rawBranch.includes(b.branch_name.toLowerCase())
          );
          if (found) matchedBranchId = found.id;
        }
      } catch (bErr) {
        console.warn("Could not map branch_id for draft booking:", bErr);
      }

      const { error } = await supabase
        .from("appointments")
        .insert({
          patient_id: user.id,
          dentist_id: dentistId,
          appointment_date: appointmentDate,
          branch: branchFormatted,
          branch_id: matchedBranchId,
          service_requested: draft.service || "General Consultation",
          status: "pending",
          notes: `Guest Online Reservation. Patient Contact: ${draft.phone || 'N/A'}`
        });

      if (!error) {
        toast.success(`Appointment request submitted for ${draft.service} on ${draft.date}!`);
        localStorage.removeItem("pendingBookingDraft");
        fetchAppointments();
      }
    } catch (err) {
      console.error("Failed to process draft booking:", err);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          branches(branch_name)
        `)
        .eq("patient_id", user.id)
        .order("appointment_date", { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
      toast.error("Could not load your appointments.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDentists = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, branch_id, specialization")
        .eq("role", "dentist")
        .eq("is_active", true);
        
      if (!error) setDentists(data || []);
    } catch (err) {
      console.error("Failed to fetch dentists:", err);
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("billing_services")
        .select("id, service_name, cost")
        .order("service_name");
      if (!error) setClinicServices(data || []);
    } catch (err) {
      console.error("Failed to fetch clinic services:", err);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("id, branch_name")
        .eq("is_active", true);
      if (!error) setBranches(data || []);
    } catch (err) {
      console.error("Failed to fetch branches:", err);
    }
  };

  const fetchRatings = async () => {
    try {
      const { data, error } = await supabase
        .from("dentist_ratings")
        .select("id, appointment_id, dentist_id, rating, feedback, created_at")
        .eq("patient_id", user.id);
      
      if (!error && data) {
        const map: Record<string, DentistRating> = {};
        data.forEach(r => {
          if (r.appointment_id) {
            map[r.appointment_id] = r;
          }
        });
        setRatingsMap(map);
      }
    } catch (err) {
      console.error("Failed to fetch ratings:", err);
    }
  };

  const handleProceedToPreview = (e?: any) => {
    if (e) e.preventDefault();
    if (!bookingDate || !bookingTime || !selectedBranch || !selectedService) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (selectedService === "Others" && !otherService.trim()) {
      toast.error("Please specify your reason for the appointment.");
      return;
    }

    const branchObj = branches.find(b => b.id === selectedBranch);
    const branchName = branchObj ? branchObj.branch_name : "";

    // Verify dentist belongs to selected branch
    if (selectedDentist && selectedDentist !== "any") {
      const doc = dentists.find(d => d.id === selectedDentist);
      if (doc?.branch_id && doc.branch_id !== selectedBranch) {
        const docBranch = branches.find(b => b.id === doc.branch_id);
        toast.error(`Dr. ${doc.first_name} ${doc.last_name} is only available at ${docBranch?.branch_name || 'their assigned'} Branch.`);
        return;
      }
    }

    // Comprehensive realistic scheduling validation
    const validation = validateAppointmentScheduling({
      targetDate: bookingDate,
      targetTime: bookingTime,
      targetBranchId: selectedBranch,
      targetBranchName: branchName,
      existingAppointments: appointments
    });

    if (!validation.isValid) {
      toast.error(validation.message || "Invalid appointment schedule.");
      return;
    }

    setBookingStep(2);
  };

  const handleBookAppointment = async (e?: any) => {
    if (e) e.preventDefault();
    if (!bookingDate || !bookingTime || !selectedBranch || !selectedService) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const finalService = selectedService === "Others" ? (otherService.trim() || "Others") : selectedService;
    const branchObj = branches.find(b => b.id === selectedBranch);
    const branchName = branchObj ? branchObj.branch_name : "";

    // Scheduling validation failsafe
    const validation = validateAppointmentScheduling({
      targetDate: bookingDate,
      targetTime: bookingTime,
      targetBranchId: selectedBranch,
      targetBranchName: branchName,
      existingAppointments: appointments
    });

    if (!validation.isValid) {
      toast.error(validation.message || "Invalid appointment schedule.");
      return;
    }

    setIsSubmitting(true);
    try {
      const time24 = parseTimeTo24h(bookingTime);
      const dateTimeString = `${bookingDate}T${time24}:00`;
      const appointmentDate = new Date(dateTimeString).toISOString();

      const { error } = await supabase
        .from("appointments")
        .insert({
          patient_id: user?.id,
          dentist_id: selectedDentist && selectedDentist !== "any" ? selectedDentist : null,
          appointment_date: appointmentDate,
          branch: branchName,
          branch_id: selectedBranch,
          service_requested: finalService,
          status: "pending",
          notes: bookingNotes
        });

      if (error) throw error;
      
      toast.success("Appointment request submitted successfully!");
      setIsBookingOpen(false);
      setBookingStep(1);
      
      setBookingDate("");
      setBookingTime("");
      setSelectedDentist("");
      setSelectedBranch("");
      setSelectedService("");
      setOtherService("");
      setBookingNotes("");
      
      fetchAppointments();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to book appointment: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = (appointmentId: string) => {
    setSelectedCancelId(appointmentId);
    setIsCancelModalOpen(true);
  };

  const confirmCancelAppointment = async () => {
    if (!selectedCancelId) return;
    setIsCancelModalOpen(false);
    
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", selectedCancelId);
        
      if (error) throw error;
      
      toast.success("Appointment cancelled.");
      fetchAppointments();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to cancel appointment.");
    }
  };

  const handleOpenRatingModal = (apt: Appointment) => {
    setRatingApt(apt);
    const existing = ratingsMap[apt.id];
    if (existing) {
      setRatingScore(existing.rating || 5);
      setRatingFeedback(existing.feedback || "");
    } else {
      setRatingScore(5);
      setRatingFeedback("");
    }
    setIsRatingModalOpen(true);
  };

  const submitRating = async () => {
    if (!ratingApt || ratingScore === 0) return;
    const existing = ratingsMap[ratingApt.id];
    try {
      if (existing) {
        const { error } = await supabase
          .from("dentist_ratings")
          .update({
            rating: ratingScore,
            feedback: ratingFeedback,
            dentist_id: ratingApt.dentist_id
          })
          .eq("id", existing.id);
        if (error) throw error;
        toast.success("Your rating and review have been updated!");
      } else {
        const { error } = await supabase
          .from("dentist_ratings")
          .insert({
            patient_id: user?.id,
            dentist_id: ratingApt.dentist_id,
            appointment_id: ratingApt.id,
            rating: ratingScore,
            feedback: ratingFeedback
          });
        if (error) throw error;
        toast.success("Thank you! Your rating and feedback have been submitted.");
      }
      setIsRatingModalOpen(false);
      fetchRatings();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save rating: " + (err.message || ""));
    }
  };

  const now = new Date();
  const todayStr = now.toDateString();

  const getStatusBadge = (apt: Appointment) => {
    const status = apt.status?.toLowerCase();
    const aptDate = new Date(apt.appointment_date);
    const isToday = aptDate.toDateString() === todayStr;
    const isPast = aptDate < now && !isToday;

    if (isPast) {
      if (status === "scheduled" || status === "missed") {
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-bold">Missed Visit</Badge>;
      }
      if (status === "pending") {
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold">Expired Request</Badge>;
      }
      if (status === "waiting" || status === "in_progress" || status === "checked-in") {
        return <Badge className="bg-slate-200 text-slate-700 border-slate-300 font-medium">Uncompleted Visit</Badge>;
      }
    }

    switch(status) {
      case "pending":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending Approval</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Confirmed</Badge>;
      case "waiting":
      case "in_progress":
      case "checked-in":
        return isToday ? (
          <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 animate-pulse">In Live Queue</Badge>
        ) : (
          <Badge className="bg-slate-200 text-slate-700 border-slate-300 font-medium">Uncompleted Visit</Badge>
        );
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-slate-100 text-slate-600 border-slate-200">Cancelled</Badge>;
      case "missed":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-bold">Missed Visit</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Memoize occupied slots for booking form
  const bookingOccupiedSlots = useMemo(() => {
    if (!bookingDate) return [];
    return getOccupiedSlots({
      dateStr: bookingDate,
      dentistId: selectedDentist !== "any" ? selectedDentist : undefined,
      appointments: appointments
    });
  }, [bookingDate, selectedDentist, appointments]);

  // Memoize occupied slots for self-service reschedule modal
  const rescheduleOccupiedSlots = useMemo(() => {
    if (!rescheduleDate) return [];
    return getOccupiedSlots({
      dateStr: rescheduleDate,
      dentistId: rescheduleDentistId !== "any" ? rescheduleDentistId : undefined,
      appointments: appointments,
      excludeAppointmentId: selectedRescheduleApt?.id
    });
  }, [rescheduleDate, rescheduleDentistId, appointments, selectedRescheduleApt]);

  // Filter dentists by agreed weekly duty rotation
  const availableDentistsForBooking = useMemo(() => {
    if (!bookingDate || dentistSchedules.length === 0) {
      return dentists.filter(d => !selectedBranch || d.branch_id === selectedBranch);
    }
    const dayOfWeek = parseISO(bookingDate).getDay();
    const onDutyDentistIds = dentistSchedules
      .filter(s => s.day_of_week === dayOfWeek && (!selectedBranch || s.branch_id === selectedBranch))
      .map(s => s.dentist_id);

    const filtered = dentists.filter(d => onDutyDentistIds.includes(d.id));
    return filtered.length > 0 ? filtered : dentists.filter(d => !selectedBranch || d.branch_id === selectedBranch);
  }, [bookingDate, selectedBranch, dentists, dentistSchedules]);

  const upcomingAppointments = appointments.filter(a => {
    const aptDate = new Date(a.appointment_date);
    const isToday = aptDate.toDateString() === todayStr;
    const isFuture = aptDate > now || isToday;
    return (a.status === "scheduled" || ((a.status === "waiting" || a.status === "in_progress" || a.status === "checked-in") && isToday) || a.status === "pending") && isFuture;
  });

  const pastAppointments = appointments.filter(a => {
    const aptDate = new Date(a.appointment_date);
    const isToday = aptDate.toDateString() === todayStr;
    const isPast = aptDate < now && !isToday;
    return a.status === "completed" || a.status === "cancelled" || a.status === "missed" || isPast;
  });

  const filteredPastAppointments = useMemo(() => {
    return pastAppointments.filter(apt => {
      // Branch matching
      const dentist = dentists.find(d => d.id === apt.dentist_id);
      const bName = apt.branches?.branch_name 
        || (dentist?.branch_id ? branches.find(b => b.id === dentist.branch_id)?.branch_name : null)
        || apt.branch?.replace(/\s+Branch$/i, '') 
        || "Pasig";
      
      if (historyBranchFilter !== "all" && bName.toLowerCase() !== historyBranchFilter.toLowerCase()) {
        return false;
      }

      // Status matching
      if (historyStatusFilter !== "all") {
        if (historyStatusFilter === "completed" && apt.status !== "completed") return false;
        if (historyStatusFilter === "cancelled" && apt.status !== "cancelled") return false;
        if (historyStatusFilter === "missed" && apt.status !== "missed") return false;
        if (historyStatusFilter === "expired" && apt.status !== "expired") return false;
        if (historyStatusFilter === "uncompleted" && apt.status !== "uncompleted") return false;
      }

      // Search query
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const serviceMatch = (apt.service_requested || "General Consultation").toLowerCase().includes(q);
        const dentistName = dentist ? `dr. ${dentist.first_name} ${dentist.last_name}`.toLowerCase() : "assigned clinic staff";
        const dentistMatch = dentistName.includes(q);
        const branchMatch = `${bName} branch`.toLowerCase().includes(q);
        const notesMatch = (apt.notes || "").toLowerCase().includes(q);
        const statusMatch = (apt.status || "").toLowerCase().includes(q);
        if (!serviceMatch && !dentistMatch && !branchMatch && !notesMatch && !statusMatch) {
          return false;
        }
      }

      return true;
    });
  }, [pastAppointments, historySearch, historyStatusFilter, historyBranchFilter, dentists, branches]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Appointments & Scheduling</h1>
          <p className="text-sm font-medium text-slate-600 mt-1">Book, review, or reschedule your dental checkups and clinical sessions.</p>
        </div>
        
        <Dialog 
          open={isBookingOpen} 
          onOpenChange={(open) => {
            setIsBookingOpen(open);
            if (open) setBookingStep(1);
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-slate-950 hover:bg-slate-900 text-white shadow-sm gap-2 shrink-0 font-semibold">
              <Plus className="h-4 w-4 text-red-500" /> Book Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            {bookingStep === 1 ? (
              <form onSubmit={handleProceedToPreview}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-950">
                    <CalendarCheck className="h-5 w-5 text-red-600" /> Schedule Visit
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Step 1 of 2: Choose a clinic branch, procedure, date, and preferred time slot.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3.5 py-4">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="grid gap-1.5">
                      <Label htmlFor="branch" className="text-xs font-bold text-slate-800">Preferred Branch <span className="text-red-500">*</span></Label>
                      <Select 
                        value={selectedBranch} 
                        onValueChange={(val) => {
                          setSelectedBranch(val);
                          // Reset dentist if selected dentist belongs to a different branch
                          if (selectedDentist && selectedDentist !== "any") {
                            const currentDoc = dentists.find(d => d.id === selectedDentist);
                            if (currentDoc && currentDoc.branch_id && currentDoc.branch_id !== val) {
                              setSelectedDentist("any");
                            }
                          }
                        }} 
                        required
                      >
                        <SelectTrigger id="branch" className="h-9 text-xs">
                          <SelectValue placeholder="Select Branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map(b => (
                            <SelectItem key={b.id} value={b.id} className="text-xs">{b.branch_name} Branch</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="dentist" className="text-xs font-bold text-slate-800">Dentist (Optional)</Label>
                      <Select 
                        value={selectedDentist} 
                        onValueChange={(val) => {
                          setSelectedDentist(val);
                          if (val && val !== "any") {
                            const d = dentists.find(doc => doc.id === val);
                            if (d?.branch_id) {
                              setSelectedBranch(d.branch_id);
                            }
                          }
                        }}
                      >
                        <SelectTrigger id="dentist" className="h-9 text-xs">
                          <SelectValue placeholder="Any Available" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any" className="text-xs">✨ Any Available Dentist</SelectItem>
                          {availableDentistsForBooking.map(d => (
                            <SelectItem key={d.id} value={d.id} className="text-xs">
                              Dr. {d.first_name} {d.last_name} {d.specialization ? `(${d.specialization})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="service" className="text-xs font-bold text-slate-800">Dental Service / Procedure <span className="text-red-500">*</span></Label>
                    <Select value={selectedService} onValueChange={setSelectedService} required>
                      <SelectTrigger id="service" className="h-9 text-xs">
                        <SelectValue placeholder="Select Procedure" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[220px]">
                        {clinicServices.map(s => (
                          <SelectItem key={s.id} value={s.service_name} className="text-xs">
                            {s.service_name} (₱{s.cost?.toLocaleString()})
                          </SelectItem>
                        ))}
                        <SelectItem value="Others" className="text-xs">Others (Specify below)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedService === "Others" && (
                    <div className="grid gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                      <Label htmlFor="other-service" className="text-xs font-bold text-slate-800">Specify Reason <span className="text-red-500">*</span></Label>
                      <Input 
                        id="other-service"
                        placeholder="e.g. Broken bracket, Tooth pain, Consultation"
                        value={otherService}
                        onChange={e => setOtherService(e.target.value)}
                        required
                        className="h-9 text-xs"
                      />
                    </div>
                  )}

                  <div className="grid gap-3.5">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-800">Date <span className="text-red-500">*</span></Label>
                      <Popover modal={true}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-9 text-xs",
                              !bookingDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                            {bookingDate ? format(parseISO(bookingDate), "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                          <Calendar
                            mode="single"
                            selected={bookingDate ? parseISO(bookingDate) : undefined}
                            onSelect={(date) => setBookingDate(date ? format(date, "yyyy-MM-dd") : "")}
                            disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Standard 1-Hour Time Slots with Occupancy Disabling */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-800">1-Hour Clinic Time Slot <span className="text-red-500">*</span></Label>
                        <span className="text-[10px] text-slate-500 font-medium">Standard 60-min visit</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
                        {STANDARD_CLINIC_SLOTS.map((slot) => {
                          const isOccupied = bookingOccupiedSlots.includes(slot);
                          const isSelected = bookingTime === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={isOccupied}
                              onClick={() => setBookingTime(slot)}
                              className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center flex flex-col items-center justify-center ${
                                isOccupied
                                  ? "bg-rose-50 border-rose-200 text-rose-400 cursor-not-allowed opacity-60 line-through"
                                  : isSelected
                                  ? "bg-slate-950 text-white border-slate-950 shadow-xs font-bold"
                                  : "bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                              }`}
                            >
                              <span>{slot}</span>
                              {isOccupied && <span className="text-[9px] text-rose-500 font-bold no-underline uppercase tracking-wider">Booked</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="notes" className="text-xs font-bold text-slate-800">Additional Notes (Optional)</Label>
                    <Input 
                      id="notes" 
                      placeholder="Any specific symptoms, instructions, or requests"
                      value={bookingNotes}
                      onChange={e => setBookingNotes(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
                  <DialogClose asChild>
                    <Button type="button" variant="outline" size="sm" className="text-xs">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" size="sm" className="bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs gap-1.5">
                    Review Appointment <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              /* STEP 2: APPOINTMENT & ESTIMATED PRICING PREVIEW */
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5">
                      Step 2 of 2
                    </Badge>
                    <DialogTitle className="text-xl font-extrabold text-slate-950">
                      Appointment Preview
                    </DialogTitle>
                  </div>
                  <DialogDescription className="text-xs text-slate-500">
                    Review your schedule, service details, and estimated procedure fee before confirming.
                  </DialogDescription>
                </DialogHeader>

                {(() => {
                  const branchObj = branches.find(b => b.id === selectedBranch);
                  const branchName = branchObj ? branchObj.branch_name : "Selected Branch";
                  const dentistObj = dentists.find(d => d.id === selectedDentist);
                  const dentistName = dentistObj ? `Dr. ${dentistObj.first_name} ${dentistObj.last_name}` : "Any Available Dentist";
                  const matchedService = clinicServices.find(s => s.service_name === selectedService);
                  const finalServiceName = selectedService === "Others" ? (otherService.trim() || "General Consultation / Others") : selectedService;
                  const estimatedCost = matchedService?.cost;

                  return (
                    <div className="space-y-3 py-1">
                      {/* Detailed Summary Card */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200/80">
                          <div>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Clinic Branch</span>
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                              <Building2 className="h-3.5 w-3.5 text-red-600 shrink-0" />
                              {branchName} Branch
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Attending Dentist</span>
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                              <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                              {dentistName}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200/80">
                          <div>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Date</span>
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                              <CalendarIcon className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                              {bookingDate ? format(parseISO(bookingDate), "EEE, MMM d, yyyy") : "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Time Slot</span>
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                              <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                              {bookingTime || "N/A"}
                            </span>
                          </div>
                        </div>

                        {/* Service & Estimated Fee Highlight */}
                        <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-xs flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Requested Procedure</span>
                            <span className="text-xs font-bold text-slate-950 block mt-0.5">{finalServiceName}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Estimated Fee</span>
                            {estimatedCost ? (
                              <span className="text-base font-black text-emerald-600 block">
                                ₱{estimatedCost.toLocaleString()}.00
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded block">
                                Clinical Assessment
                              </span>
                            )}
                          </div>
                        </div>

                        {bookingNotes && (
                          <div className="pt-1">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Notes</span>
                            <p className="text-xs text-slate-600 italic mt-0.5">"{bookingNotes}"</p>
                          </div>
                        )}
                      </div>

                      {/* Clinical & Pricing Disclaimer Notice Box */}
                      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 flex gap-3 text-amber-950">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-extrabold text-xs text-amber-900">
                            Estimated Pricing &amp; Payment Procedure Note
                          </p>
                          <p className="text-[11.5px] leading-relaxed text-amber-800/95 font-medium">
                            The fee shown above is an <strong>estimated standard clinic rate</strong>. Actual procedure costs may vary depending on clinical diagnosis, complexity, and specific materials required.
                          </p>
                          <p className="text-[11px] text-amber-700 font-medium">
                            💡 You can freely inquire with the clinic reception or your dentist regarding the exact pricing and available payment options (Cash, GCash, Cards, or Installment plans).
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setBookingStep(1)} 
                    disabled={isSubmitting}
                    className="text-xs gap-1.5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Edit
                  </Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={handleBookAppointment} 
                    disabled={isSubmitting} 
                    className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs gap-1.5 shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Confirm &amp; Submit Booking
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Appointment Details & Fee Breakdown Preview Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="sm:max-w-[480px]">
            {selectedDetailApt && (() => {
              const d = new Date(selectedDetailApt.appointment_date);
              const dentist = dentists.find(d => d.id === selectedDetailApt.dentist_id);
              const dentistName = dentist ? `Dr. ${dentist.first_name} ${dentist.last_name}` : "Assigned Dentist Pending";
              const branchName = selectedDetailApt.branches?.branch_name 
                || (dentist?.branch_id ? branches.find(b => b.id === dentist.branch_id)?.branch_name : null)
                || selectedDetailApt.branch 
                || "Pasig";
              
              const matchedService = clinicServices.find((s: any) => 
                s.service_name?.toLowerCase().trim() === selectedDetailApt.service_requested?.toLowerCase().trim()
              );
              const estimatedCost = matchedService?.cost;

              return (
                <div className="space-y-4 animate-in fade-in-50 duration-200">
                  <DialogHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                          <CalendarCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <DialogTitle className="text-lg font-extrabold text-slate-950">
                            Appointment Details
                          </DialogTitle>
                          <DialogDescription className="text-xs text-slate-500">
                            Visit schedule, service information, and fee estimate
                          </DialogDescription>
                        </div>
                      </div>
                      <div>
                        {getStatusBadge(selectedDetailApt)}
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="space-y-3 py-1">
                    {/* Summary Card */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200/80">
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Clinic Branch</span>
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                            <Building2 className="h-3.5 w-3.5 text-red-600 shrink-0" />
                            {branchName.replace(/\s+Branch$/i, '')} Branch
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Attending Dentist</span>
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                            <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            {dentistName}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200/80">
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Date</span>
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                            <CalendarIcon className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Time Slot</span>
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                            <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Service & Estimated Fee */}
                      <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-xs flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Requested Service</span>
                          <span className="text-xs font-bold text-slate-950 block mt-0.5">
                            {selectedDetailApt.service_requested || "General Consultation"}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Estimated Fee</span>
                          {estimatedCost ? (
                            <span className="text-base font-black text-emerald-600 block">
                              ₱{estimatedCost.toLocaleString()}.00
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded block">
                              Clinical Assessment
                            </span>
                          )}
                        </div>
                      </div>

                      {selectedDetailApt.notes && (
                        <div className="pt-1">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Patient Notes</span>
                          <p className="text-xs text-slate-600 italic mt-0.5">"{selectedDetailApt.notes}"</p>
                        </div>
                      )}
                    </div>

                    {/* Disclaimer Box */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 flex gap-3 text-amber-950">
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-extrabold text-xs text-amber-900">
                          Estimated Pricing &amp; Payment Procedure Note
                        </p>
                        <p className="text-[11.5px] leading-relaxed text-amber-800/95 font-medium">
                          The fee shown above is an <strong>estimated standard clinic rate</strong>. Actual procedure costs may vary depending on clinical diagnosis, complexity, and specific materials required.
                        </p>
                        <p className="text-[11px] text-amber-700 font-medium">
                          💡 You can freely inquire with the clinic reception or your dentist regarding exact final quotes and available payment options (Cash, GCash, Cards, or Installment plans).
                        </p>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 flex items-center justify-between">
                    {(selectedDetailApt.status === "scheduled" || selectedDetailApt.status === "pending") ? (
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                          setIsDetailModalOpen(false);
                          handleCancelClick(selectedDetailApt.id);
                        }}
                        className="text-xs font-semibold"
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Cancel Visit
                      </Button>
                    ) : selectedDetailApt.status === "completed" ? (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setIsDetailModalOpen(false);
                          handleOpenRatingModal(selectedDetailApt);
                        }}
                        className="text-xs font-bold text-amber-700 bg-amber-50 border-amber-300 hover:bg-amber-100"
                      >
                        <Star className="h-3.5 w-3.5 mr-1 fill-amber-400 text-amber-400" />
                        {ratingsMap[selectedDetailApt.id] ? "View / Edit Rating" : "Rate Visit"}
                      </Button>
                    ) : (
                      <div />
                    )}
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsDetailModalOpen(false)}
                      className="text-xs font-semibold"
                    >
                      Close
                    </Button>
                  </DialogFooter>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Cancel Modal */}
        <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Cancel Appointment</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this appointment?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>Keep Appointment</Button>
              <Button onClick={confirmCancelAppointment} className="bg-red-600 hover:bg-red-700 text-white">
                Yes, Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 2-HOUR CUTOFF GUIDANCE MODAL */}
        <Dialog open={isCutoffAlertOpen} onOpenChange={setIsCutoffAlertOpen}>
          <DialogContent className="sm:max-w-[440px] rounded-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="w-5 h-5" />
                <DialogTitle className="text-base font-bold text-slate-900">Immediate Reschedule Notice</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-600 pt-2 space-y-2">
                <p>
                  This appointment is scheduled in <strong>less than 2 hours</strong>. Automated online rescheduling is closed within 2 hours of visit time to allow operatory sterilization and doctor preparation.
                </p>
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1 text-slate-800 text-left">
                  <span className="font-bold block text-indigo-950">Please Contact Reception Directly:</span>
                  <p className="font-semibold text-indigo-700 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> (02) 8642-1190 / +63 917 800 1234
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Our front-desk staff will gladly assist in rebooking your operatory slot immediately.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-2">
              <Button onClick={() => setIsCutoffAlertOpen(false)} className="w-full bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold">
                Understood, Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* SELF-SERVICE PATIENT RESCHEDULE MODAL */}
        <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
          <DialogContent className="sm:max-w-[460px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-indigo-600" /> Reschedule Your Dental Visit
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Choose a new visit date and standard 1-hour time slot.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleConfirmPatientReschedule} className="space-y-4 py-2">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Treatment:</span>
                  <span className="font-bold text-slate-900">{selectedRescheduleApt?.service_requested || "General Consultation"}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Current Schedule:</span>
                  <span className="font-semibold text-slate-700">
                    {selectedRescheduleApt && new Date(selectedRescheduleApt.appointment_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">New Date *</Label>
                  <Input 
                    type="date" 
                    value={rescheduleDate} 
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="rounded-xl font-medium text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Attending Dentist</Label>
                  <Select value={rescheduleDentistId} onValueChange={setRescheduleDentistId}>
                    <SelectTrigger className="rounded-xl text-xs">
                      <SelectValue placeholder="Choose Dentist" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any" className="text-xs">Any Available Dentist</SelectItem>
                      {dentists.map(d => (
                        <SelectItem key={d.id} value={d.id} className="text-xs">
                          Dr. {d.first_name} {d.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 1-Hour Slot Buttons */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700">Select 1-Hour Time Slot *</Label>
                  <span className="text-[10px] text-slate-500 font-medium">Standard 60-min visit</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
                  {STANDARD_CLINIC_SLOTS.map((slot) => {
                    const isOccupied = rescheduleOccupiedSlots.includes(slot);
                    const isSelected = rescheduleTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isOccupied}
                        onClick={() => setRescheduleTime(slot)}
                        className={`py-2 px-1.5 rounded-xl text-xs font-semibold border transition-all text-center flex flex-col items-center justify-center ${
                          isOccupied
                            ? "bg-rose-50 border-rose-200 text-rose-400 cursor-not-allowed opacity-60 line-through"
                            : isSelected
                            ? "bg-slate-950 text-white border-slate-950 shadow-xs font-bold"
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        <span>{slot}</span>
                        {isOccupied && <span className="text-[9px] text-rose-500 font-bold no-underline uppercase tracking-wider">Booked</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Reason for Rescheduling (Optional)</Label>
                <Input 
                  placeholder="e.g. Work conflict, family emergency, feeling unwell" 
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>

              <DialogFooter className="pt-2 gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setIsRescheduleModalOpen(false)} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmittingReschedule}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs shadow-sm"
                >
                  {isSubmittingReschedule ? "Updating Schedule..." : "Confirm & Reschedule"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View / Edit / Add Rating Modal */}
        <Dialog open={isRatingModalOpen} onOpenChange={setIsRatingModalOpen}>
          <DialogContent className="sm:max-w-[460px] p-6 rounded-2xl bg-white">
            {ratingApt && (() => {
              const existingRating = ratingsMap[ratingApt.id];
              const dentist = dentists.find(d => d.id === ratingApt.dentist_id);
              const dentistName = dentist ? `Dr. ${dentist.first_name} ${dentist.last_name}` : "Attending Dentist";
              const aptDate = new Date(ratingApt.appointment_date);
              
              const ratingLabels: Record<number, string> = {
                1: "Poor (Needs Improvement)",
                2: "Fair (Satisfactory)",
                3: "Good (Expected Quality)",
                4: "Very Good (Great Care)",
                5: "Excellent (Highly Recommended)"
              };

              return (
                <div className="space-y-4">
                  <DialogHeader>
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                        <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
                      </div>
                      <div>
                        <DialogTitle className="text-lg font-extrabold text-slate-900">
                          {existingRating ? "Your Dentist Rating & Review" : "Rate Your Dental Visit"}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 mt-0.5">
                          {dentistName} • {aptDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  {/* Star Selector */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Overall Experience
                    </span>
                    <div className="flex justify-center items-center gap-2.5 py-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingScore(star)}
                          className="p-1 rounded-lg hover:scale-115 transition-transform focus:outline-none"
                        >
                          <Star 
                            className={`w-8 h-8 transition-colors ${
                              star <= ratingScore 
                                ? "fill-amber-400 text-amber-400 drop-shadow-xs" 
                                : "text-slate-300 hover:text-amber-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <p className="text-xs font-extrabold text-amber-800">
                      {ratingScore > 0 ? `${ratingScore} Stars — ${ratingLabels[ratingScore]}` : "Select a Star Rating"}
                    </p>
                  </div>

                  {/* Feedback Textarea */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      Detailed Feedback & Comments (Optional)
                    </Label>
                    <Textarea 
                      placeholder={`How was your procedure with ${dentistName}? (e.g. gentle, fast, friendly staff)`}
                      value={ratingFeedback}
                      onChange={e => setRatingFeedback(e.target.value)}
                      className="min-h-[100px] text-xs rounded-xl"
                    />
                    {existingRating?.created_at && (
                      <p className="text-[10px] text-slate-400">
                        First submitted on {new Date(existingRating.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>

                  <DialogFooter className="pt-2 flex gap-2">
                    <Button variant="outline" onClick={() => setIsRatingModalOpen(false)} className="rounded-xl h-9 text-xs font-bold">
                      Cancel
                    </Button>
                    <Button 
                      onClick={submitRating} 
                      disabled={ratingScore === 0} 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 text-xs font-bold px-4 shadow-xs"
                    >
                      {existingRating ? "Update Rating & Review" : "Submit Rating"}
                    </Button>
                  </DialogFooter>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>

      {/* Upcoming Visits Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 border-b pb-2">Upcoming & Today's Visits</h2>
        {loading ? (
          <p className="text-slate-500 text-sm">Loading appointments...</p>
        ) : upcomingAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingAppointments.map((apt) => {
              const d = new Date(apt.appointment_date);
              return (
                <Card 
                  key={apt.id} 
                  onClick={() => {
                    setSelectedDetailApt(apt);
                    setIsDetailModalOpen(true);
                  }}
                  className="border-l-4 border-l-indigo-600 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all rounded-2xl cursor-pointer group flex flex-col justify-between"
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-900 font-bold group-hover:text-indigo-600 transition-colors">
                          <CalendarIcon className="h-4 w-4 text-indigo-600" />
                          {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold">
                          <Clock className="h-4 w-4" />
                          {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {getStatusBadge(apt)}
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span className="font-bold text-slate-800">{apt.service_requested || "General Consultation"}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center text-xs text-slate-500">
                        <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> 
                          {(() => {
                            const dentist = dentists.find(d => d.id === apt.dentist_id);
                            return dentist ? `Dr. ${dentist.first_name} ${dentist.last_name}` : "Assigned Dentist Pending";
                          })()}
                        </span>
                        <span className="flex items-center gap-1.5 sm:border-l sm:pl-2 border-slate-200 font-semibold text-slate-700">
                          📍 {(() => {
                            const dentist = dentists.find(d => d.id === apt.dentist_id);
                            const bName = apt.branches?.branch_name 
                              || (dentist?.branch_id ? branches.find(b => b.id === dentist.branch_id)?.branch_name : null)
                              || apt.branch?.replace(/\s+Branch$/i, '') 
                              || "Pasig";
                            return `${bName} Branch`;
                          })()}
                        </span>
                      </div>
                      {apt.notes && (
                        <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-md mt-1 border border-slate-100">
                          <span className="italic">"{apt.notes}"</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  
                  <CardFooter className="bg-slate-50/60 p-3 px-4 flex justify-between items-center border-t border-slate-100 flex-wrap gap-2">
                    <span className="text-[11px] font-bold text-indigo-600 group-hover:underline flex items-center gap-1">
                      View Details &amp; Fee &rarr;
                    </span>
                    <div className="flex items-center gap-2">
                      {(apt.status === "scheduled" || apt.status === "pending") && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPatientReschedule(apt);
                            }}
                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200 h-7 text-xs font-semibold px-2.5 rounded-lg gap-1"
                          >
                            <CalendarClock className="h-3.5 w-3.5" /> Reschedule
                          </Button>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelClick(apt.id);
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 text-xs font-semibold px-2"
                          >
                            <X className="h-3 w-3 mr-1" /> Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-slate-50/50 border-dashed border-2 rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <CalendarCheck className="h-10 w-10 text-slate-300 mb-3" />
              <h3 className="text-lg font-bold text-slate-700">No Upcoming Appointments</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                You don't have any scheduled visits. Click the button above to book your next appointment.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Appointment History */}
      <div className="space-y-4 pt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Appointment History</h2>
            <p className="text-xs text-slate-500 mt-0.5">View your past, missed, cancelled, and completed dental visits.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search appointments..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-8 h-9 text-xs rounded-xl bg-white border-slate-200"
              />
              {historySearch && (
                <button 
                  onClick={() => setHistorySearch("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
              <SelectTrigger className="h-9 w-full sm:w-36 text-xs rounded-xl bg-white border-slate-200">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
                <SelectItem value="missed" className="text-xs">Missed Visit</SelectItem>
                <SelectItem value="expired" className="text-xs">Expired Request</SelectItem>
                <SelectItem value="uncompleted" className="text-xs">Uncompleted Visit</SelectItem>
              </SelectContent>
            </Select>

            {/* Branch Filter */}
            <Select value={historyBranchFilter} onValueChange={setHistoryBranchFilter}>
              <SelectTrigger className="h-9 w-full sm:w-36 text-xs rounded-xl bg-white border-slate-200">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Branches</SelectItem>
                {branches.map(b => (
                  <SelectItem key={b.id} value={b.branch_name.toLowerCase()} className="text-xs">
                    {b.branch_name} Branch
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!loading && pastAppointments.length > 0 ? (
          filteredPastAppointments.length > 0 ? (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-5">Date & Time</th>
                      <th className="py-3 px-5">Service</th>
                      <th className="py-3 px-5">Branch</th>
                      <th className="py-3 px-5">Dentist</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5 text-right">Rating & Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredPastAppointments.map((apt) => {
                      const d = new Date(apt.appointment_date);
                      const ratingData = ratingsMap[apt.id];
                      const isRated = Boolean(ratingData);
                      return (
                        <tr 
                          key={apt.id} 
                          onClick={() => {
                            setSelectedDetailApt(apt);
                            setIsDetailModalOpen(true);
                          }}
                          className="hover:bg-slate-50 transition-colors cursor-pointer group"
                        >
                          <td className="py-4 px-5 font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            <span className="text-xs text-slate-400 font-normal block">
                              {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="py-4 px-5 font-medium">{apt.service_requested || "General Consultation"}</td>
                          <td className="py-4 px-5 text-slate-600">
                            {(() => {
                              const dentist = dentists.find(d => d.id === apt.dentist_id);
                              const bName = apt.branches?.branch_name 
                                || (dentist?.branch_id ? branches.find(b => b.id === dentist.branch_id)?.branch_name : null)
                                || apt.branch?.replace(/\s+Branch$/i, '') 
                                || "Pasig";
                              return `${bName} Branch`;
                            })()}
                          </td>
                          <td className="py-4 px-5">
                            {(() => {
                              const dentist = dentists.find(d => d.id === apt.dentist_id);
                              return dentist ? `Dr. ${dentist.first_name} ${dentist.last_name}` : "Assigned Clinic Staff";
                            })()}
                          </td>
                          <td className="py-4 px-5">
                            {getStatusBadge(apt)}
                          </td>
                          <td className="py-4 px-5 text-right">
                            {apt.status === "completed" && !isRated && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenRatingModal(apt);
                                }}
                                className="text-xs font-bold text-amber-700 bg-amber-50 border-amber-300 hover:bg-amber-100 h-8 rounded-lg shadow-2xs"
                              >
                                <Star className="w-3.5 h-3.5 mr-1 fill-amber-400 text-amber-400" /> Rate Visit
                              </Button>
                            )}
                            {apt.status === "completed" && isRated && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenRatingModal(apt);
                                }}
                                className="text-xs font-bold text-slate-800 bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/80 h-8 rounded-lg shadow-2xs group/rate"
                                title="Click to view or edit your dentist rating & feedback"
                              >
                                <div className="flex items-center gap-1.5">
                                  <div className="flex items-center">
                                    {Array.from({ length: ratingData.rating }).map((_, i) => (
                                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    ))}
                                  </div>
                                  <span className="font-extrabold text-emerald-900">{ratingData.rating}.0</span>
                                  <span className="text-[10px] text-emerald-700 font-medium group-hover/rate:underline">(View / Edit)</span>
                                </div>
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <Card className="bg-slate-50/50 border-dashed border rounded-2xl p-8 text-center">
              <p className="text-sm font-semibold text-slate-600">No appointments matched your search criteria.</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing or adjusting your search term and filters.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setHistorySearch("");
                  setHistoryStatusFilter("all");
                  setHistoryBranchFilter("all");
                }}
                className="mt-3 text-xs"
              >
                Reset Filters
              </Button>
            </Card>
          )
        ) : (
          <p className="text-slate-400 text-sm">No past appointments recorded.</p>
        )}
      </div>
    </div>
  );
}
