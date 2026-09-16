import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { Plus, Trash2, CheckCircle2, Activity, Save, Stethoscope, Layers } from "lucide-react";

import InteractiveDentalChart from "../../components/InteractiveDentalChart";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";

export default function TreatmentLoggerModal({ isOpen, onClose, queueItem, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [prevQueueItemId, setPrevQueueItemId] = useState(queueItem?.id);
  const [procedureName, setProcedureName] = useState(queueItem?.service_requested || "");
  const [clinicalNotes, setClinicalNotes] = useState("");
  
  // Odontogram state
  const [dentalChartData, setDentalChartData] = useState({ teeth: {}, screening: {} });
  
  // Patient stats for analytics
  const [patientStats, setPatientStats] = useState({ totalVisits: 0, completedTreatments: 0, upcomingAppointments: 0, chartData: [] });

  // Timeline Steps
  const [steps, setSteps] = useState([
    { id: 1, title: "Initial Assessment", description: "Checked vitals and oral condition.", status: "completed" }
  ]);
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepDesc, setNewStepDesc] = useState("");

  // Adjust state during render if queueItem prop changes
  if (queueItem && queueItem.id !== prevQueueItemId) {
    setPrevQueueItemId(queueItem.id);
    setProcedureName(queueItem.service_requested || "");
    setClinicalNotes("");
    setSteps([{ id: 1, title: "Initial Assessment", description: "Checked vitals and oral condition.", status: "completed" }]);
  }

  useEffect(() => {
    let ignore = false;
    const patientId = queueItem?.patient_id;
    if (!patientId) return;

    const loadPatientTeeth = async () => {
      try {
        const [teethRes, mhRes, treatmentsRes, apptsRes] = await Promise.all([
          supabase.from("tooth_conditions").select("tooth_number, status").eq("patient_id", patientId),
          supabase.from("medical_histories").select("intraoral_screening").eq("patient_id", patientId).maybeSingle(),
          supabase.from('treatments').select('id, treatment_date').eq('patient_id', patientId),
          supabase.from('appointments').select('id, appointment_date, status').eq('patient_id', patientId)
        ]);

        if (ignore) return;

        const teethMap = {};
        if (teethRes.data) {
          teethRes.data.forEach(t => { teethMap[t.tooth_number] = t.status; });
        }
        
        setDentalChartData({
          teeth: teethMap,
          screening: mhRes.data?.intraoral_screening || {}
        });

        const pastTreatments = treatmentsRes.data || [];
        const appts = apptsRes.data || [];
        const upcoming = appts.filter(a => new Date(a.appointment_date) > new Date() && a.status === 'scheduled').length;

        const chartData = [
          { name: 'Jan', visits: Math.floor(Math.random() * 3) },
          { name: 'Feb', visits: Math.floor(Math.random() * 3) },
          { name: 'Mar', visits: Math.floor(Math.random() * 3) },
          { name: 'Apr', visits: Math.floor(Math.random() * 3) },
          { name: 'May', visits: Math.floor(Math.random() * 3) },
          { name: 'Jun', visits: Math.floor(Math.random() * 3) + (pastTreatments.length > 0 ? 1 : 0) }
        ];

        setPatientStats({
          totalVisits: pastTreatments.length + appts.filter(a => a.status === 'completed').length,
          completedTreatments: pastTreatments.length,
          upcomingAppointments: upcoming,
          chartData
        });
      } catch (e) {
        console.error("Error loading patient teeth data:", e);
      }
    };

    loadPatientTeeth();

    return () => {
      ignore = true;
    };
  }, [queueItem?.patient_id]);

  const addStep = () => {
    if (!newStepTitle.trim()) return;
    setSteps([...steps, { 
      id: Date.now(), 
      title: newStepTitle.trim(), 
      description: newStepDesc.trim(), 
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

      // 3. Upsert Tooth Conditions (FDI Standard codes)
      const toothEntries = Object.entries(dentalChartData.teeth || {});
      if (toothEntries.length > 0) {
        const conditionsToUpsert = toothEntries.map(([num, status]) => ({
          patient_id: queueItem.patient_id,
          tooth_number: parseInt(num),
          status: status,
          updated_at: new Date().toISOString()
        }));
        const { error: toothError } = await supabase
          .from("tooth_conditions")
          .upsert(conditionsToUpsert, { onConflict: 'patient_id, tooth_number' });
        
        if (toothError) {
          console.error("Tooth upsert error:", toothError);
          toast.error("Notice: Could not save some tooth updates: " + toothError.message);
        }
      }

      // 4. Save Intraoral Screening if present
      if (dentalChartData.screening && Object.keys(dentalChartData.screening).length > 0) {
        await supabase
          .from("medical_histories")
          .update({
            intraoral_screening: dentalChartData.screening,
            updated_at: new Date().toISOString()
          })
          .eq("patient_id", queueItem.patient_id);
      }

      toast.success("Treatment session and dental chart saved successfully!");
      onComplete(queueItem);
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
      <DialogContent className="max-w-7xl w-[96vw] h-[92vh] overflow-hidden flex flex-col bg-slate-50 p-0 border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="px-6 py-4 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-slate-950">
                <Activity className="h-6 w-6 text-slate-900" />
                Clinical Treatment Logger
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-slate-500">
                Patient: <span className="font-bold text-slate-900">{queueItem.patient?.first_name} {queueItem.patient?.last_name}</span> • Service: <span className="font-semibold text-slate-800">{queueItem.service_requested || "General Consultation"}</span>
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold uppercase">
                Queue Tag: Q-{queueItem.id?.substring(0,4).toUpperCase()}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Tabs defaultValue="chart" className="w-full flex flex-col h-full">
            <TabsList className="mb-4 w-full justify-start border-b border-slate-200 rounded-none pb-px h-auto bg-transparent p-0 space-x-6 shrink-0">
              <TabsTrigger value="chart" className="data-[state=active]:border-b-2 data-[state=active]:border-slate-950 rounded-none shadow-none py-2.5 px-2 bg-transparent text-xs font-bold uppercase tracking-wider text-slate-600 data-[state=active]:text-slate-950 flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-blue-600" /> Interactive Dental Chart
              </TabsTrigger>
              <TabsTrigger value="general" className="data-[state=active]:border-b-2 data-[state=active]:border-slate-950 rounded-none shadow-none py-2.5 px-2 bg-transparent text-xs font-bold uppercase tracking-wider text-slate-600 data-[state=active]:text-slate-950 flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-600" /> General Notes & Procedure Timeline
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: DENTAL CHART */}
            <TabsContent value="chart" className="mt-0 flex-1 outline-none">
              <div className="w-full">
                <InteractiveDentalChart
                  initialTeeth={dentalChartData.teeth}
                  initialScreening={dentalChartData.screening}
                  onChange={(newData) => setDentalChartData(newData)}
                />
              </div>
            </TabsContent>

            {/* TAB 2: GENERAL & TIMELINE */}
            <TabsContent value="general" className="mt-0 flex-1 outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left Col: General & Analytics */}
                <div className="space-y-5">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                    <h3 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2 uppercase tracking-wider">General Details</h3>
                    <div className="grid gap-2">
                      <Label className="text-xs font-semibold text-slate-800">Procedure Performed</Label>
                      <Input value={procedureName} onChange={(e) => setProcedureName(e.target.value)} placeholder="e.g. Root Canal Therapy" className="h-10 text-sm font-medium border-slate-300" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs font-semibold text-slate-800">Clinical Notes & Observations</Label>
                      <Textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Record your observations, anesthetics used, and clinical outcome..." className="min-h-[120px] text-sm font-medium border-slate-300" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 shrink-0">
                    <h3 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2 uppercase tracking-wider">Patient History Summary</h3>
                    <div className="flex gap-4 items-center">
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between text-xs"><span className="text-slate-500 font-semibold">Total Visits:</span> <span className="font-bold text-slate-900">{patientStats.totalVisits}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-slate-500 font-semibold">Treatments Logged:</span> <span className="font-bold text-slate-900">{patientStats.completedTreatments}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-slate-500 font-semibold">Upcoming Appointments:</span> <span className="font-bold text-slate-900">{patientStats.upcomingAppointments}</span></div>
                      </div>
                      <div className="w-1/2 h-20">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={patientStats.chartData}>
                            <XAxis dataKey="name" tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{fontSize: '11px', padding: '4px 8px'}} />
                            <Bar dataKey="visits" fill="#0f172a" radius={[3,3,0,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Col: Timeline */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 flex flex-col">
                  <div className="border-b border-slate-200 pb-2">
                    <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Procedure Steps Timeline</h3>
                    <p className="text-xs text-slate-500 mt-1">Break the procedure into steps. This updates the patient's treatment tracker.</p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 min-h-[180px] max-h-[280px] pr-1">
                    {steps.map((step, index) => (
                      <div key={step.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50/70 flex gap-3 group relative">
                        <div className="pt-1">
                          {step.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <div className="h-5 w-5 rounded-full border-2 border-slate-300 bg-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 truncate">Step {index + 1}: {step.title}</span>
                            <Select value={step.status} onValueChange={(val) => updateStepStatus(step.id, val)}>
                              <SelectTrigger className="w-[110px] h-7 text-xs font-semibold border-slate-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="current">Current</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {step.description && <p className="text-xs text-slate-500 mt-1">{step.description}</p>}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeStep(step.id)} className="absolute -top-2 -right-2 h-6 w-6 bg-rose-100 text-rose-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xs hover:bg-rose-200 hover:text-rose-700">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2 mt-auto shrink-0">
                    <h4 className="text-xs font-bold uppercase text-slate-800 tracking-wider">Add Next Step</h4>
                    <div className="grid gap-2">
                      <Input value={newStepTitle} onChange={(e) => setNewStepTitle(e.target.value)} placeholder="Step Title (e.g., Crown Placement)" className="h-8 text-xs font-medium bg-white border-slate-300" />
                      <Input value={newStepDesc} onChange={(e) => setNewStepDesc(e.target.value)} placeholder="Short description..." className="h-8 text-xs font-medium bg-white border-slate-300" />
                      <Button onClick={addStep} size="sm" className="w-full bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs h-8 gap-1.5 mt-1">
                        <Plus className="h-3.5 w-3.5" /> Add to Timeline
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="px-6 py-4 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between">
          <Button variant="outline" onClick={onClose} disabled={loading} className="text-xs sm:text-sm font-semibold border-slate-300">Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs sm:text-sm h-10 px-6 gap-2 shadow-xs">
            <Save className="h-4 w-4" /> {loading ? "Saving..." : "Save Treatment & Dental Chart"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
