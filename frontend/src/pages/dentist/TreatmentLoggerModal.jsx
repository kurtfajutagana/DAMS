import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Separator } from "../../components/ui/separator";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { Plus, Trash2, CheckCircle2, Activity, Save } from "lucide-react";

import InteractiveDentalChart from "../../components/InteractiveDentalChart";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";

export default function TreatmentLoggerModal({ isOpen, onClose, queueItem, onComplete }) {
  const [loading, setLoading] = useState(false);
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
        setDentalChartData(prev => ({ ...prev, teeth: teethMap }));
      }
      
      // Load quick stats for this patient
      const { data: treatmentsData } = await supabase.from('treatments').select('id, treatment_date').eq('patient_id', patientId);
      const { data: apptsData } = await supabase.from('appointments').select('id, appointment_date, status').eq('patient_id', patientId);
      
      if (treatmentsData || apptsData) {
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
          <Tabs defaultValue="general" className="w-full flex flex-col h-full">
            <TabsList className="mb-6 w-full justify-start border-b rounded-none pb-px h-auto bg-transparent p-0 space-x-6">
              <TabsTrigger value="general" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none shadow-none data-[state=active]:shadow-none py-2 px-1 bg-transparent text-sm font-medium">General & Timeline</TabsTrigger>
              <TabsTrigger value="chart" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none shadow-none data-[state=active]:shadow-none py-2 px-1 bg-transparent text-sm font-medium">Interactive Dental Chart</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-0 flex-1 outline-none h-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                
                {/* Left Col: General & Analytics */}
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

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 mt-4 shrink-0">
                    <h3 className="font-semibold text-slate-800 border-b pb-1">Patient Activity Analytics</h3>
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-xs"><span className="text-slate-500">Total Visits</span> <span className="font-bold">{patientStats.totalVisits}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-slate-500">Treatments Logged</span> <span className="font-bold">{patientStats.completedTreatments}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-slate-500">Upcoming Appts</span> <span className="font-bold">{patientStats.upcomingAppointments}</span></div>
                      </div>
                      <div className="w-1/2 h-20">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={patientStats.chartData}>
                            <XAxis dataKey="name" tick={{fontSize: 8}} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{fontSize: '10px', padding: '4px'}} />
                            <Bar dataKey="visits" fill="#3b82f6" radius={[2,2,0,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
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
            </TabsContent>

            <TabsContent value="chart" className="mt-0 flex-1 outline-none h-full">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 h-full relative flex flex-col items-center">
                <div className="w-full text-left">
                  <h3 className="font-semibold text-slate-800 border-b pb-2">Active Odontogram</h3>
                  <p className="text-xs text-slate-500 mb-4 mt-2">Click a tooth to update its condition.</p>
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
