import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { Calendar, User, FileText, CheckSquare, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Label } from "../../components/ui/label";

export default function StaffAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dentists, setDentists] = useState([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAppointmentForAssign, setSelectedAppointmentForAssign] = useState(null);
  const [selectedDentistId, setSelectedDentistId] = useState("");

  useEffect(() => {
    fetchAppointments();
    fetchDentists();
  }, []);

  const fetchDentists = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("role", "dentist")
        .eq("is_active", true);
      
      if (!error && data) {
        setDentists(data);
      }
    } catch (err) {
      console.error("Error fetching dentists:", err);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      // Fetch appointments where status is scheduled
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          patient:profiles!appointments_patient_id_fkey(first_name, last_name, contact_number),
          dentist:profiles!appointments_dentist_id_fkey(first_name, last_name)
        `)
        .eq("status", "scheduled")
        .order("appointment_date", { ascending: true });

      if (error) {
        // If the explicit join fails (e.g. dentist_id foreign key issue), fallback to raw query
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
  };

  const fetchAppointmentsFallback = async () => {
    try {
      const { data: aptData, error: aptError } = await supabase
        .from("appointments")
        .select("*")
        .eq("status", "scheduled")
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
  };

  const handleCheckIn = async (appointment) => {
    if (!appointment.dentist_id) {
      setSelectedAppointmentForAssign(appointment);
      setSelectedDentistId(""); // Reset
      setIsAssignModalOpen(true);
      return;
    }
    
    // Proceed with check-in since dentist is already assigned
    await processCheckIn(appointment.id, appointment.patient_id, appointment.dentist_id, appointment.service_requested, appointment.notes);
  };

  const handleAssignAndCheckIn = async () => {
    if (!selectedDentistId) {
      toast.error("Please select a dentist.");
      return;
    }
    
    setIsAssignModalOpen(false);
    await processCheckIn(
      selectedAppointmentForAssign.id, 
      selectedAppointmentForAssign.patient_id, 
      selectedDentistId, 
      selectedAppointmentForAssign.service_requested, 
      selectedAppointmentForAssign.notes
    );
  };

  const processCheckIn = async (appointmentId, patientId, dentistId, serviceRequested, notes) => {
    try {
      // 1. Add to queue_entries
      const { error: queueError } = await supabase
        .from("queue_entries")
        .insert({
          patient_id: patientId,
          dentist_id: dentistId,
          service_requested: serviceRequested || "General Consultation",
          notes: `Checked-in from appointment. ${notes || ""}`,
          status: "waiting"
        });

      if (queueError) throw queueError;

      // 2. Update appointment status (and dentist if it was newly assigned)
      const { error: aptError } = await supabase
        .from("appointments")
        .update({ status: "checked-in", dentist_id: dentistId })
        .eq("id", appointmentId);

      if (aptError) throw aptError;

      toast.success("Patient successfully checked into the daily queue!");
      fetchAppointments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to check-in patient.");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading appointments...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Scheduled Appointments</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage upcoming visits and check patients into the daily queue.</p>
        </div>

        <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Assign Dentist</DialogTitle>
              <DialogDescription>
                This patient chose "Any Available" during booking. Please assign an available dentist to handle this visit.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="dentist">Available Dentists</Label>
                <Select value={selectedDentistId} onValueChange={setSelectedDentistId}>
                  <SelectTrigger id="dentist">
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
              <Button onClick={handleAssignAndCheckIn} className="bg-primary hover:bg-primary/90 text-white">
                Assign & Check-In
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/40 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-border/40">
              <tr>
                <th className="px-4 py-3 font-medium">Date & Time</th>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Service / Branch</th>
                <th className="px-4 py-3 font-medium">Assigned Dentist</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                    No scheduled appointments found.
                  </td>
                </tr>
              ) : (
                appointments.map((apt) => {
                  const aptDate = new Date(apt.appointment_date);
                  const isToday = aptDate.toDateString() === new Date().toDateString();
                  
                  return (
                    <tr key={apt.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-2 font-medium text-slate-900">
                          <Calendar className="h-4 w-4 text-primary" />
                          {aptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 mt-1 text-xs">
                          <Clock className="h-3.5 w-3.5" />
                          {aptDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          {isToday && <Badge className="ml-1 bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-1.5 py-0 text-[10px]">Today</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-slate-800">
                          {apt.patient ? `${apt.patient.first_name} ${apt.patient.last_name}` : "Unknown Patient"}
                        </div>
                        {apt.patient?.contact_number && (
                          <div className="text-slate-500 text-xs mt-1">
                            {apt.patient.contact_number}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          {apt.service_requested || "General Consultation"}
                        </div>
                        <div className="text-slate-500 text-xs mt-1">
                          📍 {apt.branch || "Any Branch"}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          {apt.dentist ? `Dr. ${apt.dentist.first_name} ${apt.dentist.last_name}` : <span className="italic text-slate-400">Any Available</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <Button 
                          onClick={() => handleCheckIn(apt)}
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-white shadow-sm gap-1.5"
                        >
                          <CheckSquare className="h-4 w-4" />
                          Check-In
                        </Button>
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
  );
}
