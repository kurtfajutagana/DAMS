import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Separator } from "../../components/ui/separator";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { Plus, Trash2, CheckCircle2, Activity, Save } from "lucide-react";

// Realistic Tooth SVG Components
const MolarSvg = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 5 6 C 5 2, 19 2, 19 6 C 19 11, 16.5 13, 15 13 C 15 13, 15 16, 14 20 C 13.5 22, 12.5 22, 12 18 C 11.5 22, 10.5 22, 10 20 C 9 16, 9 13, 9 13 C 7.5 13, 5 11, 5 6 Z" />
  </svg>
);

const IncisorSvg = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 8 6 C 8 2, 16 2, 16 6 C 16 11, 14 13, 14 13 C 14 13, 13 18, 12.5 21 C 12 22, 12 22, 11.5 21 C 11 18, 10 13, 10 13 C 10 13, 8 11, 8 6 Z" />
  </svg>
);

const ToothIcon = ({ number, status, isSelected, onClick }) => {
  const isMolar = [1,2,3,4,5, 12,13,14,15,16, 17,18,19,20,21, 28,29,30,31,32].includes(number);
  const isUpper = number <= 16;
  
  // Base colors
  let colorClass = "text-white fill-white stroke-slate-300 hover:fill-slate-50";
  if (status === "treated") colorClass = "text-blue-100 fill-blue-100 stroke-blue-500";
  if (status === "needs-attention") colorClass = "text-amber-100 fill-amber-100 stroke-amber-500";
  if (status === "missing") colorClass = "opacity-20 fill-transparent stroke-slate-400 stroke-dashed";

  // Selection ring
  const ringClass = isSelected ? "ring-2 ring-blue-500 rounded-sm" : "";
  
  // Upper arch roots point UP, lower arch roots point DOWN. 
  // Our SVGs have roots at the bottom. So upper arch needs rotate-180.
  const rotationClass = isUpper ? "rotate-180" : "";

  return (
    <div 
      onClick={() => onClick(number)} 
      className={`flex flex-col items-center gap-1 cursor-pointer transition-transform hover:scale-110 ${ringClass} p-1`}
    >
      {isUpper && <span className="text-[9px] font-bold text-slate-400">{number}</span>}
      <div className={`w-8 h-10 flex items-center justify-center ${rotationClass}`}>
        {isMolar ? <MolarSvg className={`w-full h-full ${colorClass}`} /> : <IncisorSvg className={`w-full h-full ${colorClass}`} />}
      </div>
      {!isUpper && <span className="text-[9px] font-bold text-slate-400">{number}</span>}
    </div>
  );
};

export default function TreatmentLoggerModal({ isOpen, onClose, queueItem, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [procedureName, setProcedureName] = useState(queueItem?.service_requested || "");
  const [clinicalNotes, setClinicalNotes] = useState("");
  
  // Odontogram state
  const [teeth, setTeeth] = useState({}); // { 14: "treated", 15: "needs-attention" }
  const [selectedTooth, setSelectedTooth] = useState(null);

  // Timeline Steps
  const [steps, setSteps] = useState([
    { id: 1, title: "Initial Assessment", description: "Checked vitals and oral condition.", status: "completed" }
  ]);
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepDesc, setNewStepDesc] = useState("");

  useEffect(() => {
    if (queueItem) {
      setProcedureName(queueItem.service_requested || "");
      setClinicalNotes("");
      setSteps([{ id: 1, title: "Initial Assessment", description: "Checked vitals and oral condition.", status: "completed" }]);
      loadPatientTeeth(queueItem.patient_id);
    }
  }, [queueItem]);

  const loadPatientTeeth = async (patientId) => {
    try {
      const { data, error } = await supabase
        .from("tooth_conditions")
        .select("tooth_number, status")
        .eq("patient_id", patientId);
      
      if (!error && data) {
        const teethMap = {};
        data.forEach(t => { teethMap[t.tooth_number] = t.status; });
        setTeeth(teethMap);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToothClick = (num) => {
    setSelectedTooth(num);
  };

  const updateSelectedToothStatus = (status) => {
    if (!selectedTooth) return;
    setTeeth(prev => ({ ...prev, [selectedTooth]: status }));
    setSelectedTooth(null); // Deselect after choosing
  };

  const getToothColor = (status) => {
    // Left for compatibility with old div logic if used elsewhere, but not used by ToothIcon anymore
    switch (status) {
      case "treated": return "bg-blue-100 border-blue-400 text-blue-700";
      case "needs-attention": return "bg-amber-100 border-amber-400 text-amber-700";
      case "missing": return "bg-slate-100 border-slate-300 text-slate-400 opacity-60";
      default: return "bg-white border-slate-200 text-slate-600 hover:bg-slate-50";
    }
  };

  const addStep = () => {
    if (!newStepTitle) return;
    setSteps([...steps, { 
      id: Date.now(), 
      title: newStepTitle, 
      description: newStepDesc, 
      status: "pending" 
    }]);
    setNewStepTitle("");
    setNewStepDesc("");
  };

  const updateStepStatus = (id, status) => {
    setSteps(steps.map(s => s.id === id ? { ...s, status } : s));
  };

  const removeStep = (id) => {
    setSteps(steps.filter(s => s.id !== id));
  };

  const handleSubmit = async () => {
    if (!procedureName) {
      toast.error("Procedure name is required.");
      return;
    }
    
    setLoading(true);
    try {
      // 1. Create Treatment Record
      const { data: treatmentData, error: treatmentError } = await supabase
        .from("treatments")
        .insert({
          patient_id: queueItem.patient_id,
          dentist_id: queueItem.dentist_id,
          procedure_name: procedureName,
          treatment_date: new Date().toISOString().split('T')[0],
          clinical_notes: clinicalNotes
        })
        .select()
        .single();
        
      if (treatmentError) throw treatmentError;
      const treatmentId = treatmentData.id;

      // 1.5 Auto-Generate Invoice
      // Look up cost in billing_services
      let cost = 500; // Default consultation fee
      try {
        const { data: serviceData } = await supabase
          .from("billing_services")
          .select("cost")
          .ilike("service_name", `%${procedureName}%`)
          .limit(1);
        if (serviceData && serviceData.length > 0) {
          cost = serviceData[0].cost;
        }
      } catch (err) {
        console.warn("Could not fetch service cost, defaulting to 500", err);
      }

      const { error: invoiceError } = await supabase.from("invoices").insert({
        patient_id: queueItem.patient_id,
        treatment_id: treatmentId,
        procedure_name: procedureName,
        amount_due: cost,
        status: 'pending'
      });
      if (invoiceError) console.error("Invoice generation error:", invoiceError);

      // 2. Insert Treatment Steps
      if (steps.length > 0) {
        const stepsToInsert = steps.map((s, index) => ({
          treatment_id: treatmentId,
          step_order: index + 1,
          title: s.title,
          description: s.description,
          status: s.status,
          step_date: s.status === 'completed' ? new Date().toISOString() : null
        }));
        const { error: stepsError } = await supabase.from("treatment_steps").insert(stepsToInsert);
        if (stepsError) throw stepsError;
      }

      // 3. Upsert Tooth Conditions
      const toothEntries = Object.entries(teeth);
      if (toothEntries.length > 0) {
        const conditionsToUpsert = toothEntries.map(([num, status]) => ({
          patient_id: queueItem.patient_id,
          tooth_number: parseInt(num),
          status: status,
          updated_at: new Date().toISOString()
        }));
        // Note: Supabase upsert requires unique constraints setup properly
        const { error: toothError } = await supabase.from("tooth_conditions").upsert(conditionsToUpsert, { onConflict: 'patient_id, tooth_number' });
        if (toothError) console.warn("Tooth upsert error:", toothError); // Non-fatal if schema not exact
      }

      toast.success("Treatment officially logged!");
      onComplete(queueItem); // Will mark queue as completed
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to log treatment.");
    } finally {
      setLoading(false);
    }
  };

  if (!queueItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] overflow-hidden flex flex-col bg-slate-50 p-0 border-0 shadow-2xl">
        <DialogHeader className="px-6 py-4 bg-white border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                <Activity className="h-6 w-6 text-blue-600" />
                Clinical Logger
              </DialogTitle>
              <DialogDescription className="mt-1">
                Logging treatment for <span className="font-semibold text-slate-700">{queueItem.patient?.first_name} {queueItem.patient?.last_name}</span>
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Queue: Q-{queueItem.id.substring(0,4).toUpperCase()}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Col: General & Chart */}
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-semibold text-slate-800 border-b pb-2">General Details</h3>
                <div className="space-y-2">
                  <Label>Procedure Performed</Label>
                  <Input value={procedureName} onChange={(e) => setProcedureName(e.target.value)} placeholder="e.g. Root Canal Therapy" />
                </div>
                <div className="space-y-2">
                  <Label>Clinical Notes</Label>
                  <Textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Record your observations, anesthetics used, and outcome..." className="min-h-[100px]" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 relative">
                <h3 className="font-semibold text-slate-800 border-b pb-2">Active Odontogram</h3>
                <p className="text-xs text-slate-500 mb-4">Click a tooth to update its condition.</p>
                
                {/* 32 Tooth Grid */}
                <div className="space-y-6 bg-slate-50/50 p-6 rounded-lg border border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase text-center mb-4 tracking-widest">Upper Arch</p>
                    <div className="flex justify-center gap-1.5 flex-wrap">
                      {Array.from({length: 16}, (_, i) => i + 1).map(num => (
                        <ToothIcon 
                          key={num} 
                          number={num} 
                          status={teeth[num]} 
                          isSelected={selectedTooth === num} 
                          onClick={handleToothClick} 
                        />
                      ))}
                    </div>
                  </div>
                  
                  <Separator className="my-4 bg-slate-200" />
                  
                  <div>
                    <div className="flex justify-center gap-1.5 flex-wrap mb-4">
                      {Array.from({length: 16}, (_, i) => i + 17).map(num => (
                        <ToothIcon 
                          key={num} 
                          number={num} 
                          status={teeth[num]} 
                          isSelected={selectedTooth === num} 
                          onClick={handleToothClick} 
                        />
                      ))}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase text-center tracking-widest">Lower Arch</p>
                  </div>
                </div>

                {/* Tooth Editor Popover/Inline Tool */}
                {selectedTooth && (
                  <div className="absolute bottom-4 left-4 right-4 bg-white p-3 rounded-lg border border-blue-200 shadow-xl flex items-center justify-between animate-in slide-in-from-bottom-2">
                    <span className="text-sm font-bold text-blue-900">Tooth #{selectedTooth}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200" onClick={() => updateSelectedToothStatus("healthy")}>Healthy</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" onClick={() => updateSelectedToothStatus("treated")}>Treated</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200" onClick={() => updateSelectedToothStatus("needs-attention")}>Issue</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-300" onClick={() => updateSelectedToothStatus("missing")}>Missing</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Timeline */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col h-full">
              <div className="border-b pb-2">
                <h3 className="font-semibold text-slate-800">Procedure Timeline</h3>
                <p className="text-xs text-slate-500 mt-1">Break the procedure into steps. This updates the patient's tracker.</p>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
                {steps.map((step, index) => (
                  <div key={step.id} className="border rounded-lg p-3 bg-slate-50 flex gap-3 group relative">
                    <div className="pt-1">
                      {step.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <div className="h-5 w-5 rounded-full border-2 border-slate-300" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-sm text-slate-800">Step {index + 1}: {step.title}</span>
                        <Select value={step.status} onValueChange={(val) => updateStepStatus(step.id, val)}>
                          <SelectTrigger className="w-[110px] h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="current">Current</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{step.description}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeStep(step.id)} className="absolute -top-2 -right-2 h-6 w-6 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-200 hover:text-red-700">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl space-y-3 mt-auto shrink-0">
                <h4 className="text-xs font-semibold uppercase text-blue-800 tracking-wider">Add Next Step</h4>
                <div className="grid gap-2">
                  <Input value={newStepTitle} onChange={(e) => setNewStepTitle(e.target.value)} placeholder="Step Title (e.g., Crown Placement)" className="h-8 text-sm bg-white" />
                  <Input value={newStepDesc} onChange={(e) => setNewStepDesc(e.target.value)} placeholder="Short description..." className="h-8 text-sm bg-white" />
                  <Button onClick={addStep} size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 mt-1">
                    <Plus className="h-4 w-4" /> Add to Timeline
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-white border-t shrink-0 flex items-center justify-between">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8">
            <Save className="h-4 w-4" /> {loading ? "Saving..." : "Save & Complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
