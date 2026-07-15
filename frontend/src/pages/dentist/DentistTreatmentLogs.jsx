import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Search, Activity, Stethoscope, Clock, CheckCircle2, FileText, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";

export default function DentistTreatmentLogs() {
  const { user } = useAuth();
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTreatment, setSelectedTreatment] = useState(null);

  useEffect(() => {
    if (user?.id) fetchTreatments();
  }, [user?.id]);

  const fetchTreatments = async () => {
    try {
      setLoading(true);
      // Fetch treatments and join patient profile + steps
      const { data, error } = await supabase
        .from("treatments")
        .select(`
          *,
          patient:profiles!treatments_patient_id_fkey(first_name, last_name),
          treatment_steps(*)
        `)
        .eq("dentist_id", user.id)
        .order("treatment_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTreatments(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load treatment logs.");
    } finally {
      setLoading(false);
    }
  };

  const filteredTreatments = treatments.filter(t => {
    const pName = `${t.patient?.first_name} ${t.patient?.last_name}`.toLowerCase();
    const proc = (t.procedure_name || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    return pName.includes(term) || proc.includes(term);
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Treatment Logs</h1>
          <p className="text-slate-500 mt-1">Review clinical procedures and step-by-step progress for your patients.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-slate-50 border-b">
          <div className="flex items-center relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by patient name or procedure..." 
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
                    <th className="px-6 py-4 font-medium">Date & Procedure</th>
                    <th className="px-6 py-4 font-medium">Patient</th>
                    <th className="px-6 py-4 font-medium">Steps Completion</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTreatments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        No treatments found.
                      </td>
                    </tr>
                  ) : (
                    filteredTreatments.map(t => {
                      const totalSteps = t.treatment_steps?.length || 0;
                      const completedSteps = t.treatment_steps?.filter(s => s.status === 'completed').length || 0;
                      const isFullyComplete = totalSteps > 0 && completedSteps === totalSteps;
                      
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-slate-800">{t.procedure_name}</span>
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <Clock className="h-3 w-3" /> {new Date(t.treatment_date).toLocaleDateString()}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-700 font-medium">
                            {t.patient?.first_name} {t.patient?.last_name}
                          </td>
                          <td className="px-6 py-4">
                            {totalSteps > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="w-full bg-slate-200 rounded-full h-1.5 max-w-[100px]">
                                  <div 
                                    className={`h-1.5 rounded-full ${isFullyComplete ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                    style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-slate-500">{completedSteps}/{totalSteps}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">No steps recorded</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedTreatment(t)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                              View Details <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Treatment Details Modal */}
      {selectedTreatment && (
        <Dialog open={!!selectedTreatment} onOpenChange={() => setSelectedTreatment(null)}>
          <DialogContent className="max-w-2xl bg-slate-50">
            <DialogHeader className="bg-white p-6 border-b -m-6 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-slate-800">
                    <Activity className="h-6 w-6 text-blue-600" />
                    {selectedTreatment.procedure_name}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    Patient: <span className="font-semibold text-slate-700">{selectedTreatment.patient?.first_name} {selectedTreatment.patient?.last_name}</span> • {new Date(selectedTreatment.treatment_date).toLocaleDateString()}
                  </DialogDescription>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {selectedTreatment.treatment_steps?.length > 0 && selectedTreatment.treatment_steps.every(s => s.status === 'completed') ? 'Completed' : 'In Progress'}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 border-b pb-2 mb-3">
                  <FileText className="h-4 w-4 text-slate-500" /> Clinical Notes
                </h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                  {selectedTreatment.clinical_notes || "No clinical notes provided for this procedure."}
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 border-b pb-2 mb-3">
                  <Stethoscope className="h-4 w-4 text-slate-500" /> Procedure Timeline
                </h3>
                
                {selectedTreatment.treatment_steps?.length > 0 ? (
                  <div className="space-y-4">
                    {selectedTreatment.treatment_steps.sort((a,b) => a.step_order - b.step_order).map((step, idx) => (
                      <div key={step.id} className="flex gap-4 relative">
                        {idx !== selectedTreatment.treatment_steps.length - 1 && (
                          <div className="absolute left-2.5 top-6 bottom-0 w-px bg-slate-200" />
                        )}
                        <div className="shrink-0 pt-0.5 z-10">
                          {step.status === 'completed' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 bg-white" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-slate-300 bg-white" />
                          )}
                        </div>
                        <div className="pb-4">
                          <p className={`font-medium text-sm ${step.status === 'completed' ? 'text-slate-800' : 'text-slate-500'}`}>
                            {step.title}
                          </p>
                          {step.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                          )}
                          {step.step_date && (
                            <p className="text-[10px] text-slate-400 mt-1">
                              Logged on {new Date(step.step_date).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic text-center py-4">No procedure steps logged.</p>
                )}
              </div>
            </div>
            
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
