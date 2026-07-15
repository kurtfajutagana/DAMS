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
import { Calendar, Clock, User, Plus, X, CalendarCheck, FileText } from "lucide-react";
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

export default function PatientAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [clinicServices, setClinicServices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Booking Form State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [selectedDentist, setSelectedDentist] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [otherService, setOtherService] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [branches, setBranches] = useState([]);

  useEffect(() => {
    if (user) {
      fetchAppointments();
      fetchDentists();
      fetchServices();
      fetchBranches();
    }
  }, [user]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
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
        .select("id, first_name, last_name")
        .eq("role", "dentist");
        
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
        .select("service_name")
        .order("service_name");
        
      if (!error && data) {
        setClinicServices(data.map(d => d.service_name));
      }
    } catch (err) {
      console.error("Failed to fetch services:", err);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("branch_name")
        .eq("is_active", true)
        .order("branch_name");
        
      if (!error && data) {
        setBranches(data.map(b => b.branch_name));
      }
    } catch (err) {
      console.error("Failed to fetch branches:", err);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!bookingDate || !bookingTime) {
      toast.error("Please select a date and time.");
      return;
    }
    if (!selectedBranch) {
      toast.error("Please select a preferred branch.");
      return;
    }
    if (!selectedService) {
      toast.error("Please select a reason for your visit.");
      return;
    }
    if (selectedService === "Others" && !otherService.trim()) {
      toast.error("Please specify your reason for visit.");
      return;
    }

    setIsSubmitting(true);
    
    // Set dentistId to null if "any" or empty
    const dentistId = (selectedDentist === "any" || !selectedDentist) ? null : selectedDentist;

    // Combine date and time into a single timestamp
    const dateTimeString = `${bookingDate}T${bookingTime}:00`;
    const appointmentDate = new Date(dateTimeString).toISOString();
    const finalService = selectedService === "Others" ? `Others: ${otherService}` : selectedService;

    try {
      const { error } = await supabase
        .from("appointments")
        .insert({
          patient_id: user.id,
          dentist_id: dentistId,
          appointment_date: appointmentDate,
          branch: selectedBranch,
          service_requested: finalService,
          status: "scheduled",
          notes: bookingNotes
        });

      if (error) throw error;
      
      toast.success("Appointment booked successfully!");
      setIsBookingOpen(false);
      
      // Reset form
      setBookingDate("");
      setBookingTime("");
      setSelectedDentist("");
      setSelectedBranch("");
      setSelectedService("");
      setOtherService("");
      setBookingNotes("");
      
      fetchAppointments();
      
    } catch (err) {
      console.error(err);
      toast.error("Failed to book appointment: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentId);
        
      if (error) throw error;
      
      toast.success("Appointment cancelled.");
      fetchAppointments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to cancel appointment.");
    }
  };

  const getStatusBadge = (status) => {
    switch(status?.toLowerCase()) {
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Scheduled</Badge>;
      case "checked-in":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Checked-In</Badge>;
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const upcomingAppointments = appointments.filter(a => 
    a.status === "scheduled" || a.status === "checked-in"
  );
  const pastAppointments = appointments.filter(a => 
    a.status === "completed" || a.status === "cancelled" || (new Date(a.appointment_date) <= new Date() && a.status !== "checked-in")
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Appointments</h1>
          <p className="text-muted-foreground mt-1 text-sm">Schedule and manage your visits to the clinic.</p>
        </div>
        
        <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-md">
              <Plus className="h-4 w-4" /> Book Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleBookAppointment}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <CalendarCheck className="h-5 w-5 text-primary" /> Schedule Visit
                </DialogTitle>
                <DialogDescription>
                  Choose a convenient date, time, and your preferred dentist.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="branch">Preferred Branch <span className="text-red-500">*</span></Label>
                    <Select value={selectedBranch} onValueChange={setSelectedBranch} required>
                      <SelectTrigger id="branch">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map(b => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dentist">Preferred Dentist</Label>
                    <Select value={selectedDentist} onValueChange={setSelectedDentist}>
                      <SelectTrigger id="dentist">
                        <SelectValue placeholder="Any Available" />
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
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="service">Reason for Visit <span className="text-red-500">*</span></Label>
                  <Select value={selectedService} onValueChange={setSelectedService} required>
                    <SelectTrigger id="service">
                      <SelectValue placeholder="Select a service or reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {clinicServices.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                      <SelectItem value="Others">Others (Please specify)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedService === "Others" && (
                  <div className="grid gap-2 animate-in fade-in zoom-in-95 duration-200">
                    <Label htmlFor="other-service">Specify Reason <span className="text-red-500">*</span></Label>
                    <Input 
                      id="other-service"
                      placeholder="e.g. Broken bracket, Tooth pain"
                      value={otherService}
                      onChange={e => setOtherService(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="date">Date</Label>
                    <Input 
                      id="date" 
                      type="date" 
                      value={bookingDate}
                      onChange={e => setBookingDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="time">Time</Label>
                    <Input 
                      id="time" 
                      type="time" 
                      value={bookingTime}
                      onChange={e => setBookingTime(e.target.value)}
                      min="09:00" max="18:00"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Input 
                    id="notes" 
                    placeholder="Any specific instructions or context for the dentist"
                    value={bookingNotes}
                    onChange={e => setBookingNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Booking..." : "Confirm Booking"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">Upcoming Visits</h2>
        {loading ? (
          <p className="text-slate-500 text-sm">Loading appointments...</p>
        ) : upcomingAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingAppointments.map((apt) => {
              const d = new Date(apt.appointment_date);
              return (
                <Card key={apt.id} className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-700 font-semibold">
                          <Calendar className="h-4 w-4 text-primary" />
                          {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <Clock className="h-4 w-4" />
                          {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {getStatusBadge(apt.status)}
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-slate-800">{apt.service_requested || "General Consultation"}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center text-xs text-slate-500">
                        <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> 
                          {(() => {
                            const dentist = dentists.find(d => d.id === apt.dentist_id);
                            return dentist ? `Dr. ${dentist.first_name} ${dentist.last_name}` : "Assigned Dentist Pending";
                          })()}
                        </span>
                        {apt.branch && (
                          <span className="flex items-center gap-1.5 sm:border-l sm:pl-2 border-slate-200">
                            <span className="h-3.5 w-3.5 shrink-0 flex items-center justify-center bg-slate-100 rounded-sm">📍</span> {apt.branch}
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
                  {apt.status === "scheduled" && (
                    <CardFooter className="bg-slate-50/50 p-3 flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleCancelAppointment(apt.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8"
                      >
                        <X className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-slate-50/50 border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <CalendarCheck className="h-10 w-10 text-slate-300 mb-3" />
              <h3 className="text-lg font-medium text-slate-700">No Upcoming Appointments</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                You don't have any scheduled visits. Click the button above to book your next appointment.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6 pt-6">
        <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">Past & Cancelled</h2>
        {!loading && pastAppointments.length > 0 ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                  <tr>
                    <th className="px-5 py-4">Date & Time</th>
                    <th className="px-5 py-4">Service</th>
                    <th className="px-5 py-4">Dentist & Location</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pastAppointments.map((apt) => {
                    const d = new Date(apt.appointment_date);
                    return (
                      <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">
                            {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="text-slate-500 text-xs">
                            {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {apt.service_requested || "General Consultation"}
                          {apt.notes && <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]" title={apt.notes}>Note: {apt.notes}</div>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-slate-800 font-medium">
                            {(() => {
                              const dentist = dentists.find(d => d.id === apt.dentist_id);
                              return dentist ? `Dr. ${dentist.first_name} ${dentist.last_name}` : "Any Dentist";
                            })()}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            📍 {apt.branch || "Main Clinic"}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {getStatusBadge(apt.status)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          !loading && <p className="text-sm text-slate-500 italic">No past appointments found.</p>
        )}
      </div>
    </div>
  );
}
