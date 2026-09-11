import { useState, useEffect } from "react";
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
  Info
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
  
  // Rating State
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [ratingApt, setRatingApt] = useState<Appointment | null>(null);
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [ratedAppointments, setRatedAppointments] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      checkAndProcessDraftBooking();
      fetchAppointments();
      fetchDentists();
      fetchServices();
      fetchBranches();
      fetchRatings();
    }
  }, [user]);

  const checkAndProcessDraftBooking = async () => {
    const savedDraft = localStorage.getItem("pendingBookingDraft");
    if (!savedDraft || !user) return;

    try {
      const draft = JSON.parse(savedDraft);

      const parseTimeTo24h = (timeStr) => {
        if (!timeStr) return "09:00";
        if (!timeStr.includes("AM") && !timeStr.includes("PM")) return timeStr;
        const [time, modifier] = timeStr.trim().split(" ");
        let [hours, minutes] = time.split(":");
        if (hours === "12") hours = "00";
        if (modifier === "PM") hours = String(parseInt(hours, 10) + 12);
        return `${hours.padStart(2, '0')}:${minutes}`;
      };

      const time24 = parseTimeTo24h(draft.time);
      const dateTimeString = `${draft.date}T${time24}:00`;
      const appointmentDate = new Date(dateTimeString).toISOString();

      const dentistId = (draft.doctor === "any" || !draft.doctor || draft.doctor.startsWith("dr-")) ? null : draft.doctor;
      const branchFormatted = draft.branch ? (draft.branch.charAt(0).toUpperCase() + draft.branch.slice(1) + " Branch") : "Pasig Branch";

      const { error } = await supabase
        .from("appointments")
        .insert({
          patient_id: user.id,
          dentist_id: dentistId,
          appointment_date: appointmentDate,
          branch: branchFormatted,
          service_requested: draft.service || "General Consultation",
          status: "scheduled",
          notes: `Guest Online Reservation. Patient Contact: ${draft.phone || 'N/A'}`
        });

      if (!error) {
        toast.success(`Appointment confirmed for ${draft.service} on ${draft.date}!`);
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
        
      if (error) throw error;
      setDentists(data || []);
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
      if (error) throw error;
      setClinicServices(data || []);
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
      if (error) throw error;
      setBranches(data || []);
    } catch (err) {
      console.error("Failed to fetch branches:", err);
    }
  };

  const fetchRatings = async () => {
    try {
      const { data, error } = await supabase
        .from("dentist_ratings")
        .select("appointment_id")
        .eq("patient_id", user.id);
      
      if (!error && data) {
        setRatedAppointments(new Set(data.map(r => r.appointment_id)));
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

    setBookingStep(2);
  };

  const handleBookAppointment = async (e?: any) => {
    if (e) e.preventDefault();
    if (!bookingDate || !bookingTime || !selectedBranch || !selectedService) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const finalService = selectedService === "Others" ? (otherService.trim() || "Others") : selectedService;

    setIsSubmitting(true);
    try {
      const parseTimeTo24h = (timeStr: string) => {
        const [time, modifier] = timeStr.trim().split(" ");
        let [hours, minutes] = time.split(":");
        if (hours === "12") hours = "00";
        if (modifier === "PM") hours = String(parseInt(hours, 10) + 12);
        return `${hours.padStart(2, '0')}:${minutes}`;
      };

      const time24 = parseTimeTo24h(bookingTime);
      const dateTimeString = `${bookingDate}T${time24}:00`;
      const appointmentDate = new Date(dateTimeString).toISOString();

      const branchObj = branches.find(b => b.id === selectedBranch);
      const branchName = branchObj ? branchObj.branch_name : "";

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

  const submitRating = async () => {
    if (!ratingApt || ratingScore === 0) return;
    try {
      const { error } = await supabase
        .from("dentist_ratings")
        .insert({
          patient_id: user?.id,
          dentist_id: ratingApt.dentist_id,
          appointment_id: ratingApt.id,
          rating: ratingScore,
          feedback: ratingFeedback
        });
      if (!error) {
        toast.success("Thank you for your feedback!");
        setIsRatingModalOpen(false);
        fetchRatings();
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to submit rating.");
    }
  };

  const now = new Date();
  const todayStr = now.toDateString();

  const getStatusBadge = (apt: Appointment) => {
    const status = apt.status?.toLowerCase();
    const aptDate = new Date(apt.appointment_date);
    const isToday = aptDate.toDateString() === todayStr;
    const isPast = aptDate < now && !isToday;

    if (status === "scheduled" && isPast) {
      return <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-bold">Missed Visit</Badge>;
    }

    switch(status) {
      case "pending":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending Approval</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Confirmed</Badge>;
      case "waiting":
      case "in_progress":
      case "checked-in":
        return <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">In Live Queue</Badge>;
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-slate-100 text-slate-600 border-slate-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const upcomingAppointments = appointments.filter(a => {
    const aptDate = new Date(a.appointment_date);
    const isToday = aptDate.toDateString() === todayStr;
    const isFuture = aptDate > now || isToday;
    return (a.status === "scheduled" || a.status === "waiting" || a.status === "in_progress" || a.status === "pending") && isFuture;
  });

  const pastAppointments = appointments.filter(a => {
    const aptDate = new Date(a.appointment_date);
    const isToday = aptDate.toDateString() === todayStr;
    const isPast = aptDate < now && !isToday;
    return a.status === "completed" || a.status === "cancelled" || isPast;
  });

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
                          setSelectedDentist("any");
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
                      <Select value={selectedDentist} onValueChange={setSelectedDentist}>
                        <SelectTrigger id="dentist" className="h-9 text-xs">
                          <SelectValue placeholder="Any Available" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any" className="text-xs">✨ Any Available Dentist</SelectItem>
                          {dentists
                            .filter(d => !selectedBranch || !d.branch_id || d.branch_id === selectedBranch)
                            .map(d => (
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

                  <div className="grid grid-cols-2 gap-3.5">
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
                    <div className="grid gap-1.5">
                      <Label htmlFor="time" className="text-xs font-bold text-slate-800">Time Slot <span className="text-red-500">*</span></Label>
                      <Select value={bookingTime} onValueChange={setBookingTime} required>
                        <SelectTrigger id="time" className="h-9 text-xs">
                          <SelectValue placeholder="Select Slot" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10:00 AM" className="text-xs">10:00 AM</SelectItem>
                          <SelectItem value="11:00 AM" className="text-xs">11:00 AM</SelectItem>
                          <SelectItem value="01:00 PM" className="text-xs">01:00 PM</SelectItem>
                          <SelectItem value="02:00 PM" className="text-xs">02:00 PM</SelectItem>
                          <SelectItem value="03:00 PM" className="text-xs">03:00 PM</SelectItem>
                          <SelectItem value="04:00 PM" className="text-xs">04:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
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
              const branchName = selectedDetailApt.branches?.branch_name || selectedDetailApt.branch || "Pasig";
              
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
                    ) : selectedDetailApt.status === "completed" && !ratedAppointments.has(selectedDetailApt.id) ? (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setIsDetailModalOpen(false);
                          setRatingApt(selectedDetailApt);
                          setRatingScore(0);
                          setRatingFeedback("");
                          setIsRatingModalOpen(true);
                        }}
                        className="text-xs font-semibold text-amber-600 border-amber-200 hover:bg-amber-50"
                      >
                        <Star className="h-3.5 w-3.5 mr-1 fill-amber-400 text-amber-400" /> Rate Visit
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

        {/* Rating Modal */}
        <Dialog open={isRatingModalOpen} onOpenChange={setIsRatingModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Rate Your Dental Visit</DialogTitle>
              <DialogDescription>
                How was your consultation with Dr. {ratingApt?.dentist_id ? dentists.find(d => d.id === ratingApt.dentist_id)?.last_name : "the Dentist"}?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star}
                    onClick={() => setRatingScore(star)}
                    className={`w-8 h-8 cursor-pointer transition-colors ${
                      star <= ratingScore ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-200"
                    }`}
                  />
                ))}
              </div>
              <Textarea 
                placeholder="Share your feedback (optional)..." 
                value={ratingFeedback}
                onChange={e => setRatingFeedback(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRatingModalOpen(false)}>Cancel</Button>
              <Button onClick={submitRating} disabled={ratingScore === 0} className="bg-emerald-600 hover:bg-emerald-700">Submit Rating</Button>
            </DialogFooter>
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
                        {apt.branches?.branch_name && (
                          <span className="flex items-center gap-1.5 sm:border-l sm:pl-2 border-slate-200 font-semibold text-slate-700">
                            📍 {apt.branches.branch_name} Branch
                          </span>
                        )}
                      </div>
                      {apt.notes && (
                        <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-md mt-1 border border-slate-100">
                          <span className="italic">"{apt.notes}"</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  
                  <CardFooter className="bg-slate-50/60 p-3 px-5 flex justify-between items-center border-t border-slate-100">
                    <span className="text-[11px] font-bold text-indigo-600 group-hover:underline flex items-center gap-1">
                      View Details &amp; Fee &rarr;
                    </span>
                    {(apt.status === "scheduled" || apt.status === "pending") && (
                      <Button 
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
                    )}
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

      {/* Past, Missed, & Cancelled Visits */}
      <div className="space-y-4 pt-6">
        <h2 className="text-xl font-bold text-slate-900 border-b pb-2">Past, Missed & Completed Visits</h2>
        {!loading && pastAppointments.length > 0 ? (
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
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {pastAppointments.map((apt) => {
                    const d = new Date(apt.appointment_date);
                    const isRated = ratedAppointments.has(apt.id);
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
                        <td className="py-4 px-5 text-slate-600">{apt.branches?.branch_name || "Pasig"} Branch</td>
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
                                setRatingApt(apt);
                                setRatingScore(0);
                                setRatingFeedback("");
                                setIsRatingModalOpen(true);
                              }}
                              className="text-xs font-semibold text-amber-600 border-amber-200 hover:bg-amber-50"
                            >
                              <Star className="w-3.5 h-3.5 mr-1 fill-amber-400 text-amber-400" /> Rate Visit
                            </Button>
                          )}
                          {apt.status === "completed" && isRated && (
                            <span className="text-xs text-emerald-600 font-semibold flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Rated
                            </span>
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
          <p className="text-slate-400 text-sm">No past appointments recorded.</p>
        )}
      </div>
    </div>
  );
}
