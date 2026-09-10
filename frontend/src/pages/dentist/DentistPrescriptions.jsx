import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Search, Pill, Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { format, parseISO, addDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Calendar } from "../../components/ui/calendar";
import { cn, extractDurationInDays } from "../../lib/utils";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";

export default function DentistPrescriptions() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search, Status Filter & Pagination State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  
  // Write Prescription Modal State
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPrescription, setNewPrescription] = useState({
    patient_id: "",
    medication_name: "",
    dosage_instructions: "",
    start_date: "",
    end_date: ""
  });

  const handleDosageChange = (val) => {
    const updated = { ...newPrescription, dosage_instructions: val };
    const detectedDays = extractDurationInDays(val);
    if (detectedDays && updated.start_date) {
      try {
        const start = parseISO(updated.start_date);
        if (!isNaN(start.getTime())) {
          updated.end_date = format(addDays(start, detectedDays), "yyyy-MM-dd");
        }
      } catch (e) {
        // ignore
      }
    }
    setNewPrescription(updated);
  };

  const handleStartDateChange = (date) => {
    if (!date) {
      setNewPrescription({ ...newPrescription, start_date: "" });
      return;
    }
    const dateStr = format(date, "yyyy-MM-dd");
    const updated = { ...newPrescription, start_date: dateStr };
    
    // Auto compute end_date if dosage has a detected duration
    if (newPrescription.dosage_instructions) {
      const detectedDays = extractDurationInDays(newPrescription.dosage_instructions);
      if (detectedDays) {
        updated.end_date = format(addDays(date, detectedDays), "yyyy-MM-dd");
      }
    }
    setNewPrescription(updated);
  };

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;

    const loadData = async () => {
      try {
        const [prescriptionsRes, patientsRes] = await Promise.all([
          supabase
            .from("prescriptions")
            .select(`
              *,
              patient:profiles!prescriptions_patient_id_fkey(first_name, last_name)
            `)
            .eq("dentist_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .eq("role", "patient")
            .order("first_name", { ascending: true })
        ]);

        if (prescriptionsRes.error) throw prescriptionsRes.error;
        
        if (isMounted) {
          setPrescriptions(prescriptionsRes.data || []);
          if (!patientsRes.error && patientsRes.data) {
            setPatients(patientsRes.data);
          }
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load prescriptions.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleWritePrescription = async () => {
    if (!newPrescription.patient_id || !newPrescription.medication_name || !newPrescription.dosage_instructions || !newPrescription.start_date || !newPrescription.end_date) {
      toast.error("Please fill out all fields.");
      return;
    }

    if (new Date(newPrescription.end_date) < new Date(newPrescription.start_date)) {
      toast.error("End date must be after start date.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        patient_id: newPrescription.patient_id,
        dentist_id: user?.id,
        medication_name: newPrescription.medication_name,
        dosage_instructions: newPrescription.dosage_instructions,
        start_date: new Date(newPrescription.start_date).toISOString(),
        end_date: new Date(newPrescription.end_date).toISOString(),
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/staff/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || 'Failed to issue prescription.');

      toast.success("Prescription successfully issued.");
      if (data.reminders_scheduled) {
        toast.info(`Automated Engine Scheduled ${data.reminders_scheduled} Reminders.`);
      }

      const selectedPatient = patients.find(p => p.id === newPrescription.patient_id);
      const newRecord = {
        ...data.prescription,
        patient: selectedPatient ? { first_name: selectedPatient.first_name, last_name: selectedPatient.last_name } : null
      };

      setPrescriptions([newRecord, ...prescriptions]);
      setIsWriteModalOpen(false);
      setNewPrescription({ patient_id: "", medication_name: "", dosage_instructions: "", start_date: "", end_date: "" });
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to issue prescription.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const revokePrescription = async (id) => {
    if (!window.confirm("Are you sure you want to revoke this active prescription?")) return;
    
    try {
      const { error } = await supabase
        .from("prescriptions")
        .update({ is_active: false })
        .eq("id", id);
        
      if (error) throw error;
      toast.success("Prescription revoked.");
      setPrescriptions(prescriptions.map(p => p.id === id ? { ...p, is_active: false } : p));
    } catch (err) {
      console.error(err);
      toast.error("Failed to revoke prescription.");
    }
  };

  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter(p => {
      const pName = `${p.patient?.first_name || ''} ${p.patient?.last_name || ''}`.toLowerCase();
      const med = (p.medication_name || "").toLowerCase();
      const term = searchTerm.toLowerCase();
      const matchesSearch = pName.includes(term) || med.includes(term);
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? p.is_active : !p.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [prescriptions, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPrescriptions.length / pageSize));
  const paginatedPrescriptions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPrescriptions.slice(start, start + pageSize);
  }, [filteredPrescriptions, currentPage, pageSize]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-955">Prescriptions</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage and issue active clinical medications for your patients.</p>
        </div>
        <Button 
          onClick={() => setIsWriteModalOpen(true)} 
          className="bg-slate-950 hover:bg-slate-900 text-white font-semibold text-sm h-10 px-5 gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Write Prescription
        </Button>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient name, medication..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-slate-950/20 focus:border-slate-900 transition-colors"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {["all", "active", "inactive"].map((st) => (
              <Button
                key={st}
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
                className={`h-8 text-xs font-bold uppercase tracking-wider transition-all ${
                  statusFilter === st
                    ? "bg-slate-950 text-white border-slate-950 shadow-xs"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                }`}
              >
                {st}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Medication Details</th>
                <th className="py-3.5 px-4">Patient Name</th>
                <th className="py-3.5 px-4">Duration Period</th>
                <th className="py-3.5 px-4 text-right">Status & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {loading && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 animate-pulse text-sm">
                    Loading prescription database...
                  </td>
                </tr>
              )}
              {!loading && paginatedPrescriptions.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 text-sm font-medium">
                    No prescriptions found matching your criteria.
                  </td>
                </tr>
              )}
              {!loading && paginatedPrescriptions.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-slate-955 text-sm flex items-center gap-1.5">
                        <Pill className="h-4 w-4 text-slate-900" /> {p.medication_name}
                      </span>
                      <span className="text-xs text-slate-500 font-mono line-clamp-1 max-w-xs">{p.dosage_instructions}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                    {p.patient ? `${p.patient.first_name} ${p.patient.last_name}` : "Unknown Patient"}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-0.5 text-xs font-mono text-slate-600">
                      <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3 text-slate-400" /> Start: {new Date(p.start_date).toLocaleDateString()}</span>
                      <span className="text-slate-400 pl-4">End: {new Date(p.end_date).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex justify-end items-center gap-2">
                      <Badge className={p.is_active ? "bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase" : "bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase"}>
                        {p.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {p.is_active && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => revokePrescription(p.id)} 
                          className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold text-xs px-2.5"
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredPrescriptions.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredPrescriptions.length)} of {filteredPrescriptions.length} prescriptions
          </span>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-8 border-slate-300 text-xs font-semibold disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <span className="text-xs font-bold text-slate-700 px-2">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="h-8 border-slate-300 text-xs font-semibold disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

      </Card>

      {/* Write Prescription Modal */}
      <Dialog open={isWriteModalOpen} onOpenChange={setIsWriteModalOpen}>
        <DialogContent className="sm:max-w-[480px] bg-white border-slate-200">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-955">
              <Pill className="h-5 w-5 text-slate-900" /> Write New Prescription
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Issue an active medication and dosage schedule to a registered patient.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label className="text-xs font-semibold text-slate-800">Select Patient</Label>
              <Select value={newPrescription.patient_id} onValueChange={(val) => setNewPrescription({...newPrescription, patient_id: val})}>
                <SelectTrigger className="h-10 text-sm border-slate-300 font-medium">
                  <SelectValue placeholder="Select patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(pat => (
                    <SelectItem key={pat.id} value={pat.id}>{pat.first_name} {pat.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs font-semibold text-slate-800">Medication Name</Label>
              <Input 
                placeholder="e.g. Amoxicillin 500mg" 
                value={newPrescription.medication_name}
                onChange={e => setNewPrescription({...newPrescription, medication_name: e.target.value})}
                className="h-10 text-sm font-medium border-slate-300"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-slate-800">Dosage & Frequency Instructions</Label>
                {extractDurationInDays(newPrescription.dosage_instructions) && (
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <Sparkles className="w-3 h-3" /> Auto-detected {extractDurationInDays(newPrescription.dosage_instructions)} days
                  </span>
                )}
              </div>
              <Textarea 
                placeholder="e.g. Take 1 tablet every 8 hours for 7 days after meals" 
                value={newPrescription.dosage_instructions}
                onChange={e => handleDosageChange(e.target.value)}
                className="resize-none text-sm font-medium border-slate-300 min-h-[90px]"
              />
              <p className="text-[11px] text-slate-500">
                Tip: Typing durations like <span className="font-semibold text-slate-700">"for 3 days"</span> or <span className="font-semibold text-slate-700">"for 1 week"</span> automatically sets the End Date when you select a Start Date.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs font-semibold text-slate-800">Start Date</Label>
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-medium h-10 border-slate-300 text-sm",
                        !newPrescription.start_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                      {newPrescription.start_date ? format(parseISO(newPrescription.start_date), "PPP") : <span>Pick start date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                    <Calendar
                      mode="single"
                      selected={newPrescription.start_date ? parseISO(newPrescription.start_date) : undefined}
                      onSelect={handleStartDateChange}
                      initialFocus
                      captionLayout="dropdown"
                      fromYear={2020}
                      toYear={new Date().getFullYear() + 5}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold text-slate-800">End Date</Label>
                  {newPrescription.end_date && extractDurationInDays(newPrescription.dosage_instructions) && (
                    <span className="text-[10px] text-emerald-700 font-medium">Auto-populated</span>
                  )}
                </div>
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-medium h-10 border-slate-300 text-sm",
                        !newPrescription.end_date && "text-muted-foreground",
                        newPrescription.end_date && extractDurationInDays(newPrescription.dosage_instructions) && "border-emerald-300 bg-emerald-50/40 text-emerald-950"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                      {newPrescription.end_date ? format(parseISO(newPrescription.end_date), "PPP") : <span>Pick end date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                    <Calendar
                      mode="single"
                      selected={newPrescription.end_date ? parseISO(newPrescription.end_date) : undefined}
                      onSelect={(date) => setNewPrescription({...newPrescription, end_date: date ? format(date, "yyyy-MM-dd") : ""})}
                      disabled={(date) => date < (newPrescription.start_date ? parseISO(newPrescription.start_date) : new Date())}
                      initialFocus
                      captionLayout="dropdown"
                      fromYear={2020}
                      toYear={new Date().getFullYear() + 5}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-100 pt-4">
            <Button variant="outline" onClick={() => setIsWriteModalOpen(false)} disabled={isSubmitting} className="text-sm font-semibold border-slate-300">Cancel</Button>
            <Button onClick={handleWritePrescription} disabled={isSubmitting} className="text-sm font-semibold bg-slate-950 hover:bg-slate-900 text-white">
              {isSubmitting ? "Issuing..." : "Issue Prescription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

