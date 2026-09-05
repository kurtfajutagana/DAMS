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
import { Plus, Trash2, CheckCircle2, Activity, Save } from "lucide-react";

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
        const { data, error } = await supabase
          .from("tooth_conditions")
          .select("tooth_number, status")
          .eq("patient_id", patientId);
        
        if (!error && data && !ignore) {
          const teethMap = {};
          data.forEach(t => { teethMap[t.tooth_number] = t.status; });
          setDentalChartData(prev => ({ ...prev, teeth: teethMap }));
        }
        
        // Load quick stats for this patient
        const { data: treatmentsData } = await supabase.from('treatments').select('id, treatment_date').eq('patient_id', patientId);
        const { data: apptsData } = await supabase.from('appointments').select('id, appointment_date, status').eq('patient_id', patientId);
        
        if ((treatmentsData || apptsData) && !ignore) {
          const pastTreatments = treatmentsData || [];
          const appts = apptsData || [];
          const upcoming = appts.filter(a => new Date(a.appointment_date) > new Date() && a.status === 'scheduled').length;
          
          // Generate mock monthly data based on visits for the chart
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
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadPatientTeeth();

    return () => {
      ignore = true;
    };
  }, [queueItem?.patient_id]);



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
      const toothEntries = Object.entries(dentalChartData.teeth || {});
      if (toothEntries.length > 0) {
        const conditionsToUpsert = toothEntries.map(([num, status]) => ({
          patient_id: queueItem.patient_id,
          tooth_number: parseInt(num),
          status: status,
          updated_at: new Date().toISOString()
        }));
        const { error: toothError } = await supabase.from("tooth_conditions").upsert(conditionsToUpsert, { onConflict: 'patient_id, tooth_number' });
        if (toothError) console.warn("Tooth upsert error:", toothError);
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
        <DialogHeader className="px-6 py-4 bg-white border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-slate-955">
                <Activity className="h-6 w-6 text-slate-900" />
                Clinical Logger
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-slate-500">
                Logging treatment session for <span className="font-bold text-slate-900">{queueItem.patient?.first_name} {queueItem.patient?.last_name}</span>
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold uppercase">
                Queue Tag: Q-{queueItem.id.substring(0,4).toUpperCase()}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="general" className="w-full flex flex-col h-full">
            <TabsList className="mb-6 w-full justify-start border-b border-slate-200 rounded-none pb-px h-auto bg-transparent p-0 space-x-6">
              <TabsTrigger value="general" className="data-[state=active]:border-b-2 data-[state=active]:border-slate-950 rounded-none shadow-none py-2.5 px-2 bg-transparent text-xs font-bold uppercase tracking-wider text-slate-600 data-[state=active]:text-slate-950">General & Timeline</TabsTrigger>
              <TabsTrigger value="chart" className="data-[state=active]:border-b-2 data-[state=active]:border-slate-950 rounded-none shadow-none py-2.5 px-2 bg-transparent text-xs font-bold uppercase tracking-wider text-slate-600 data-[state=active]:text-slate-950">Interactive Dental Chart</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-0 flex-1 outline-none h-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                
                {/* Left Col: General & Analytics */}
                <div className="space-y-6">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2 uppercase tracking-wider">General Details</h3>
                    <div className="grid gap-2">
                      <Label className="text-xs font-semibold text-slate-800">Procedure Performed</Label>
                      <Input value={procedureName} onChange={(e) => setProcedureName(e.target.value)} placeholder="e.g. Root Canal Therapy" className="h-10 text-sm font-medium border-slate-300" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs font-semibold text-slate-800">Clinical Notes</Label>
                      <Textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Record your observations, anesthetics used, and clinical outcome..." className="min-h-[110px] text-sm font-medium border-slate-300" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 shrink-0">
                    <h3 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2 uppercase tracking-wider">Patient Activity Analytics</h3>
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
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col h-full">
                  <div className="border-b border-slate-200 pb-2">
                    <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Procedure Timeline</h3>
                    <p className="text-xs text-slate-500 mt-1">Break the procedure into steps. This updates the patient's tracker.</p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
                    {steps.map((step, index) => (
                      <div key={step.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50/70 flex gap-3 group relative">
                        <div className="pt-1">
                          {step.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <div className="h-5 w-5 rounded-full border-2 border-slate-300 bg-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs text-slate-900">Step {index + 1}: {step.title}</span>
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

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 mt-auto shrink-0">
                    <h4 className="text-xs font-bold uppercase text-slate-800 tracking-wider">Add Next Step</h4>
                    <div className="grid gap-2">
                      <Input value={newStepTitle} onChange={(e) => setNewStepTitle(e.target.value)} placeholder="Step Title (e.g., Crown Placement)" className="h-9 text-xs font-medium bg-white border-slate-300" />
                      <Input value={newStepDesc} onChange={(e) => setNewStepDesc(e.target.value)} placeholder="Short description..." className="h-9 text-xs font-medium bg-white border-slate-300" />
                      <Button onClick={addStep} size="sm" className="w-full bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs h-9 gap-2 mt-1">
                        <Plus className="h-4 w-4" /> Add to Timeline
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="chart" className="mt-0 flex-1 outline-none h-full">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 h-full relative flex flex-col items-center">
                <div className="w-full text-left">
                  <h3 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2 uppercase tracking-wider">Active Odontogram</h3>
                  <p className="text-xs text-slate-500 mb-4 mt-2">Click a tooth to update its condition in real time.</p>
                </div>
                
                <div className="w-full max-w-4xl">
                  <InteractiveDentalChart
                    initialTeeth={dentalChartData.teeth}
                    initialScreening={dentalChartData.screening}
                    onChange={(newData) => setDentalChartData(newData)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="px-6 py-4 bg-white border-t border-slate-100 shrink-0 flex items-center justify-between">
          <Button variant="outline" onClick={onClose} disabled={loading} className="text-sm font-semibold border-slate-300">Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-slate-950 hover:bg-slate-900 text-white font-semibold text-sm h-10 px-6 gap-2">
            <Save className="h-4 w-4" /> {loading ? "Saving..." : "Save & Complete Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
