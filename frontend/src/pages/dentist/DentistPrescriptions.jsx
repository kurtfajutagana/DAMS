import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Search, Pill, Plus, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";

export default function DentistPrescriptions() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
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

  useEffect(() => {
    if (user?.id) {
      fetchPrescriptions();
      fetchPatients();
    }
  }, [user?.id]);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("prescriptions")
        .select(`
          *,
          patient:profiles!prescriptions_patient_id_fkey(first_name, last_name)
        `)
        .eq("dentist_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load prescriptions.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("role", "patient")
        .order("first_name", { ascending: true });
        
      if (!error && data) {
        setPatients(data);
      }
    } catch (error) {
      console.error("Failed to fetch patients", error);
    }
  };

  const handleWritePrescription = async () => {
    if (!newPrescription.patient_id || !newPrescription.medication_name || !newPrescription.dosage_instructions || !newPrescription.start_date || !newPrescription.end_date) {
      toast.error("Please fill out all fields.");
      return;
    }

    // Ensure end date is after start date
    if (new Date(newPrescription.end_date) < new Date(newPrescription.start_date)) {
      toast.error("End date must be after start date.");
      return;
    }

    try {
      setIsSubmitting(true);
      const { data, error } = await supabase
        .from("prescriptions")
        .insert({
          patient_id: newPrescription.patient_id,
          dentist_id: user.id,
          medication_name: newPrescription.medication_name,
          dosage_instructions: newPrescription.dosage_instructions,
          start_date: newPrescription.start_date,
          end_date: newPrescription.end_date,
          is_active: true
        })
        .select(`*, patient:profiles!prescriptions_patient_id_fkey(first_name, last_name)`)
        .single();

      if (error) throw error;
      
      toast.success("Prescription successfully issued.");
      setPrescriptions([data, ...prescriptions]);
      setIsWriteModalOpen(false);
      setNewPrescription({ patient_id: "", medication_name: "", dosage_instructions: "", start_date: "", end_date: "" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save prescription.");
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

  const filteredPrescriptions = prescriptions.filter(p => {
    const pName = `${p.patient?.first_name} ${p.patient?.last_name}`.toLowerCase();
    const med = (p.medication_name || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    return pName.includes(term) || med.includes(term);
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Prescriptions</h1>
          <p className="text-slate-500 mt-1">Manage and issue active medications for your patients.</p>
        </div>
        <Button onClick={() => setIsWriteModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> Write Prescription
        </Button>
      </div>

      <Card>
        <CardHeader className="bg-slate-50 border-b">
          <div className="flex items-center relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by patient or medication..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-20 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-medium">Medication Details</th>
                    <th className="px-6 py-4 font-medium">Patient</th>
                    <th className="px-6 py-4 font-medium">Duration</th>
                    <th className="px-6 py-4 font-medium text-right">Status / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPrescriptions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        No prescriptions found.
                      </td>
                    </tr>
                  ) : (
                    filteredPrescriptions.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <Pill className="h-3.5 w-3.5 text-blue-500" /> {p.medication_name}
                            </span>
                            <span className="text-xs text-slate-500 line-clamp-1 max-w-xs">{p.dosage_instructions}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-medium">
                          {p.patient?.first_name} {p.patient?.last_name}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 text-xs text-slate-600">
                            <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-slate-400" /> Start: {new Date(p.start_date).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1.5 text-slate-400 ml-4.5">End: {new Date(p.end_date).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right space-y-2">
                          <div className="flex justify-end items-center gap-3">
                            <Badge variant="outline" className={p.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}>
                              {p.is_active ? "Active" : "Inactive"}
                            </Badge>
                            {p.is_active && (
                              <Button variant="ghost" size="sm" onClick={() => revokePrescription(p.id)} className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                                Revoke
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Write Prescription Modal */}
      <Dialog open={isWriteModalOpen} onOpenChange={setIsWriteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-blue-600" /> Write Prescription
            </DialogTitle>
            <DialogDescription>
              Issue a new medication to a registered patient.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select value={newPrescription.patient_id} onValueChange={(val) => setNewPrescription({...newPrescription, patient_id: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(pat => (
                    <SelectItem key={pat.id} value={pat.id}>{pat.first_name} {pat.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Medication Name</Label>
              <Input 
                placeholder="e.g. Amoxicillin 500mg" 
                value={newPrescription.medication_name}
                onChange={e => setNewPrescription({...newPrescription, medication_name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Dosage Instructions</Label>
              <Textarea 
                placeholder="e.g. Take 1 tablet every 8 hours for 7 days" 
                value={newPrescription.dosage_instructions}
                onChange={e => setNewPrescription({...newPrescription, dosage_instructions: e.target.value})}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input 
                  type="date"
                  value={newPrescription.start_date}
                  onChange={e => setNewPrescription({...newPrescription, start_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input 
                  type="date"
                  value={newPrescription.end_date}
                  onChange={e => setNewPrescription({...newPrescription, end_date: e.target.value})}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsWriteModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleWritePrescription} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSubmitting ? "Issuing..." : "Issue Prescription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
