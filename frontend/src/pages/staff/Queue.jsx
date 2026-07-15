import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Users, Clock, CheckCircle2, Play, UserCheck, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Queue() {
  const [queue, setQueue] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Walk-In State
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [patientsList, setPatientsList] = useState([]);
  const [dentistsList, setDentistsList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedDentistId, setSelectedDentistId] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [isSubmittingWalkIn, setIsSubmittingWalkIn] = useState(false);

  useEffect(() => {
    fetchQueue();
    fetchDropdownData();
  }, []);

  useEffect(() => {
    if (location.state?.walkInPatientId && patientsList.length > 0) {
      setIsWalkInModalOpen(true);
      setSelectedPatientId(location.state.walkInPatientId);
      navigate(".", { replace: true, state: {} });
    }
  }, [location.state, patientsList, navigate]);

  const fetchDropdownData = async () => {
    try {
      const pRes = await supabase.from("profiles").select("id, first_name, last_name").eq("role", "patient");
      if (pRes.data) setPatientsList(pRes.data);
      const dRes = await supabase.from("profiles").select("id, first_name, last_name").eq("role", "dentist");
      if (dRes.data) setDentistsList(dRes.data);
      const sRes = await supabase.from("billing_services").select("service_name");
      if (sRes.data) setServicesList(sRes.data);
    } catch (err) {
      console.error("Error loading dropdowns", err);
    }
  };

  const handleAddWalkIn = async (e) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedDentistId || !selectedService) {
      toast.error("Please fill all fields.");
      return;
    }
    setIsSubmittingWalkIn(true);
    try {
      const payload = {
        patient_id: selectedPatientId,
        dentist_id: selectedDentistId,
        service_requested: selectedService,
        priority_score: 0
      };
      const response = await fetch("http://localhost:8000/api/staff/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Failed to add to queue");
      
      toast.success("Walk-in patient added to queue!");
      setIsWalkInModalOpen(false);
      setSelectedPatientId("");
      setSelectedService("");
      fetchQueue();
    } catch (error) {
      toast.error("Failed to add walk-in.");
    } finally {
      setIsSubmittingWalkIn(false);
    }
  };

  const fetchQueue = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/staff/queue");
      const data = await response.json();
      const formattedQueue = data.map(item => ({
        id: item.id,
        number: `Q-${item.id.substring(0, 3).toUpperCase()}`,
        patient: item.patient,
        service: item.service_requested,
        dentist: item.dentist,
        status: formatStatus(item.status)
      }));
      setQueue(formattedQueue);
    } catch (error) {
      console.error("Error fetching queue:", error);
    }
  };

  const formatStatus = (status) => {
    switch (status) {
      case "in_progress": return "In Progress";
      case "completed": return "Completed";
      case "cancelled": return "Cancelled";
      default: return "Waiting";
    }
  };

  const dbStatus = (status) => {
    switch (status) {
      case "In Progress": return "in_progress";
      case "Completed": return "completed";
      case "Cancelled": return "cancelled";
      default: return "waiting";
    }
  };

  const updateStatus = async (id, nextStatus) => {
    try {
      await fetch(`http://localhost:8000/api/staff/queue/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: dbStatus(nextStatus) })
      });
      fetchQueue();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "In Progress":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white rounded-full">In Progress</Badge>;
      case "Waiting":
        return <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50 rounded-full">Waiting</Badge>;
      case "Completed":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full">Completed</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Daily Queue</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage and monitor today's patient flow efficiently.</p>
        </div>
        <Button 
          onClick={() => setIsWalkInModalOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/10"
        >
          Add Queue
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="border-none shadow-xl shadow-slate-100/50 bg-white p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total in Queue</p>
            <h3 className="text-2xl font-bold text-slate-800">{queue.filter(q => q.status !== "Completed").length} Patients</h3>
          </div>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-100/50 bg-white p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Avg. Wait Time</p>
            <h3 className="text-2xl font-bold text-slate-800">18 Mins</h3>
          </div>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-100/50 bg-white p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Serving Now</p>
            <h3 className="text-2xl font-bold text-slate-800">{queue.filter(q => q.status === "In Progress").length} Patients</h3>
          </div>
        </Card>
      </div>

      <Card className="border-none shadow-xl shadow-slate-100/50 bg-white rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-50 px-8 py-6">
          <CardTitle className="text-lg font-bold text-slate-800">Queue List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100">
                <TableHead className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Queue No.</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Name</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Service</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Dentist</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</TableHead>
                <TableHead className="px-8 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((item) => (
                <TableRow key={item.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/50 group">
                  <TableCell className="px-8 py-5 font-bold text-slate-900">{item.number}</TableCell>
                  <TableCell className="py-5 font-semibold text-slate-800">
                    {item.patient ? `${item.patient.first_name} ${item.patient.last_name}` : "Unknown"}
                  </TableCell>
                  <TableCell className="py-5 text-sm font-medium text-slate-700">{item.service}</TableCell>
                  <TableCell className="py-5">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Stethoscope className="h-4 w-4 text-slate-400" />
                      {item.dentist ? `Dr. ${item.dentist.first_name} ${item.dentist.last_name}` : "Any Available"}
                    </div>
                  </TableCell>
                  <TableCell className="py-5">{getStatusBadge(item.status)}</TableCell>
                  <TableCell className="px-8 py-5 text-right space-x-2">
                    {item.status === "Waiting" && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateStatus(item.id, "Cancelled")}
                        className="text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg gap-1 border-slate-200 shadow-sm"
                      >
                        Cancel
                      </Button>
                    )}
                    {item.status === "In Progress" && (
                      <span className="text-amber-500 text-xs font-semibold px-3">With Dentist</span>
                    )}
                    {item.status === "Completed" && (
                      <span className="text-emerald-500 text-xs font-semibold px-3">Done</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Walk-In Modal */}
      <Dialog open={isWalkInModalOpen} onOpenChange={setIsWalkInModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Walk-In to Queue</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddWalkIn} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Select Patient</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a registered patient" />
                </SelectTrigger>
                <SelectContent>
                  {patientsList.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-slate-500 pt-1 flex items-center justify-between">
                <span>Patient not listed?</span>
                <Link to="/staff/add-patient?walkin=true" className="text-red-600 hover:text-red-700 hover:underline font-medium">
                  Register New Patient &rarr;
                </Link>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Assign Dentist</Label>
              <Select value={selectedDentistId} onValueChange={setSelectedDentistId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a dentist" />
                </SelectTrigger>
                <SelectContent>
                  {dentistsList.map(d => (
                    <SelectItem key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Service Requested</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a service" />
                </SelectTrigger>
                <SelectContent>
                  {servicesList.map(s => (
                    <SelectItem key={s.service_name} value={s.service_name}>{s.service_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsWalkInModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmittingWalkIn} className="bg-red-600 hover:bg-red-700 text-white">
                {isSubmittingWalkIn ? "Adding..." : "Add to Queue"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
