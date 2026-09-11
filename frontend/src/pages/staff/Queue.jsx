import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Input } from "../../components/ui/input";
import { Users, Clock, CheckCircle2, Play, UserCheck, Stethoscope, Search, Ban, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function Queue() {
  const { profile } = useAuth();
  const [queue, setQueue] = useState([]);
  const [statusFilter, setStatusFilter] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
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
    if (profile?.branch_id) {
      fetchQueue();
      fetchDropdownData();

      const channel = supabase
        .channel("queue_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "appointments",
            filter: `branch_id=eq.${profile.branch_id}`,
          },
          () => {
            fetchQueue();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile]);

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
      
      let dQuery = supabase.from("profiles").select("id, first_name, last_name, branch_id").eq("role", "dentist");
      if (profile?.branch_id) {
        dQuery = dQuery.eq("branch_id", profile.branch_id);
      }
      const dRes = await dQuery;
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
        priority_score: 0,
        branch_id: profile?.branch_id
      };
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/staff/queue`, {
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
    if (!profile?.branch_id) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/staff/queue?branch_id=${profile.branch_id}`);
      const data = await response.json();
      const formattedQueue = (data || []).map(item => ({
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/staff/queue/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: dbStatus(nextStatus) })
      });
      if (!response.ok) throw new Error("Failed to update status");
      toast.success(`Queue item marked as ${nextStatus.toLowerCase()}.`);
      fetchQueue();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status.");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "In Progress":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white rounded-full font-semibold">In Progress</Badge>;
      case "Waiting":
        return <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 rounded-full font-semibold">Waiting</Badge>;
      case "Completed":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-semibold">Completed</Badge>;
      case "Cancelled":
        return <Badge variant="outline" className="text-rose-600 bg-rose-50 border-rose-200 rounded-full font-semibold">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50 rounded-full">{status}</Badge>;
    }
  };

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    return queue.filter(item => {
      // Search matching
      const matchesSearch = !searchQuery.trim() || 
        (item.number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (`${item.patient?.first_name || ""} ${item.patient?.last_name || ""}`).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.service || "").toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Status tab filtering
      if (statusFilter === "active") {
        return item.status === "Waiting" || item.status === "In Progress";
      }
      if (statusFilter === "waiting") {
        return item.status === "Waiting";
      }
      if (statusFilter === "in_progress") {
        return item.status === "In Progress";
      }
      if (statusFilter === "completed") {
        return item.status === "Completed";
      }
      if (statusFilter === "cancelled") {
        return item.status === "Cancelled";
      }
      return true; // "all"
    });
  }, [queue, statusFilter, searchQuery]);

  const activeQueueCount = queue.filter(q => q.status === "Waiting" || q.status === "In Progress").length;
  const inProgressCount = queue.filter(q => q.status === "In Progress").length;
  const completedCount = queue.filter(q => q.status === "Completed").length;
  const cancelledCount = queue.filter(q => q.status === "Cancelled").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Daily Patient Queue</h1>
          <p className="text-sm font-medium text-slate-600 mt-1">Live tracking of patient flow, doctor assignments, and consultation status.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsWalkInModalOpen(true)} className="bg-slate-950 hover:bg-slate-800 text-white font-semibold text-sm h-10 px-5 shadow-sm rounded-xl">
            + Add Walk-In Patient
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <Card 
          onClick={() => setStatusFilter("active")}
          className={`border bg-white shadow-sm hover:shadow transition-all cursor-pointer rounded-2xl ${statusFilter === "active" ? "ring-2 ring-slate-950 bg-slate-50/40 border-slate-950" : "border-slate-200"}`}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active in Queue</p>
              <h3 className="text-2xl font-extrabold text-slate-950 mt-1">{activeQueueCount} Patients</h3>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setStatusFilter("in_progress")}
          className={`border bg-white shadow-sm hover:shadow transition-all cursor-pointer rounded-2xl ${statusFilter === "in_progress" ? "ring-2 ring-amber-500 bg-amber-50/40 border-amber-500" : "border-slate-200"}`}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Serving Now</p>
              <h3 className="text-2xl font-extrabold text-slate-950 mt-1">{inProgressCount} Patients</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl">
              <UserCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setStatusFilter("completed")}
          className={`border bg-white shadow-sm hover:shadow transition-all cursor-pointer rounded-2xl ${statusFilter === "completed" ? "ring-2 ring-emerald-500 bg-emerald-50/40 border-emerald-500" : "border-slate-200"}`}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Completed Today</p>
              <h3 className="text-2xl font-extrabold text-slate-950 mt-1">{completedCount} Patients</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setStatusFilter("cancelled")}
          className={`border bg-white shadow-sm hover:shadow transition-all cursor-pointer rounded-2xl ${statusFilter === "cancelled" ? "ring-2 ring-rose-500 bg-rose-50/40 border-rose-500" : "border-slate-200"}`}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Cancelled</p>
              <h3 className="text-2xl font-extrabold text-slate-950 mt-1">{cancelledCount} Patients</h3>
            </div>
            <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl">
              <XCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Queue Table Card */}
      <Card className="border border-slate-200/80 shadow-md bg-white rounded-2xl overflow-hidden">
        {/* Toolbar with Search and Status Filter Pills */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search queue no., patient name, service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white rounded-xl border-slate-200 text-sm font-medium focus-visible:ring-0"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {[
              { id: "active", label: "Active Queue", count: activeQueueCount },
              { id: "waiting", label: "Waiting", count: queue.filter(q => q.status === "Waiting").length },
              { id: "in_progress", label: "In Progress", count: inProgressCount },
              { id: "completed", label: "Completed", count: completedCount },
              { id: "cancelled", label: "Cancelled", count: cancelledCount },
              { id: "all", label: "All Today", count: queue.length }
            ].map((tab) => (
              <Button
                key={tab.id}
                variant="outline"
                size="sm"
                onClick={() => setStatusFilter(tab.id)}
                className={`h-8 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === tab.id
                    ? "bg-slate-950 text-white border-slate-950 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  statusFilter === tab.id ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {tab.count}
                </span>
              </Button>
            ))}
          </div>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/70">
              <TableRow className="border-b border-slate-100">
                <TableHead className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Queue No.</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Name</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Service</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Dentist</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</TableHead>
                <TableHead className="px-8 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQueue.length === 0 ? (
                <TableRow>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No patients in this queue view.</p>
                    <p className="text-xs text-slate-400 mt-1">Walk-ins or scheduled arrivals will appear here in real-time.</p>
                  </td>
                </TableRow>
              ) : (
                filteredQueue.map((item) => (
                  <TableRow key={item.id} className={`border-b border-slate-50 transition-colors hover:bg-slate-50/60 ${item.status === "Cancelled" ? "opacity-60 bg-slate-50/30" : ""}`}>
                    <TableCell className="px-8 py-5 font-bold text-slate-900">{item.number}</TableCell>
                    <TableCell className="py-5 font-semibold text-slate-800">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{item.patient ? `${item.patient.first_name} ${item.patient.last_name}` : "Unknown"}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {item.patient?.is_email_verified ? (
                            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 font-bold text-[10px]">
                              ● Portal Active
                            </span>
                          ) : (
                            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60 font-bold text-[10px]">
                              ○ Walk-In Record
                            </span>
                          )}
                        </div>
                      </div>
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
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => updateStatus(item.id, "In Progress")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1 text-xs font-semibold shadow-sm h-8"
                          >
                            <Play className="w-3.5 h-3.5" /> Call In
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateStatus(item.id, "Cancelled")}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg gap-1 border-rose-200 shadow-sm h-8 text-xs font-semibold"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                      {item.status === "In Progress" && (
                        <div className="flex justify-end gap-2 items-center">
                          <span className="text-amber-600 text-xs font-semibold px-2 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> In Consultation
                          </span>
                          <Button 
                            size="sm" 
                            onClick={() => updateStatus(item.id, "Completed")}
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg gap-1 text-xs font-semibold shadow-sm h-8"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
                          </Button>
                        </div>
                      )}
                      {item.status === "Completed" && (
                        <span className="text-emerald-600 text-xs font-semibold px-3 flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Finished
                        </span>
                      )}
                      {item.status === "Cancelled" && (
                        <span className="text-rose-500 text-xs font-semibold px-3 flex items-center justify-end gap-1">
                          <XCircle className="w-4 h-4" /> Cancelled
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Walk-In Modal */}
      <Dialog open={isWalkInModalOpen} onOpenChange={setIsWalkInModalOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Add Walk-In Patient to Queue</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddWalkIn} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Select Patient *</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choose a registered patient" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {patientsList.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-slate-500 pt-1 flex items-center justify-between">
                <span>Patient not registered?</span>
                <Link to="/staff/add-patient?walkin=true" className="text-blue-600 hover:text-blue-700 hover:underline font-bold">
                  + Register New Patient
                </Link>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Assign Dentist *</Label>
              <Select value={selectedDentistId} onValueChange={setSelectedDentistId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choose an on-duty dentist" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {dentistsList.map(d => (
                    <SelectItem key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Service Requested *</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choose a treatment/procedure" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {servicesList.map(s => (
                    <SelectItem key={s.service_name} value={s.service_name}>{s.service_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsWalkInModalOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingWalkIn} className="bg-slate-950 hover:bg-slate-800 text-white rounded-xl font-semibold shadow-sm">
                {isSubmittingWalkIn ? "Adding..." : "Add to Live Queue"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
