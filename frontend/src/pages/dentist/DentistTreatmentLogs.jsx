import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Search, Activity, Stethoscope, Clock, CheckCircle2, FileText, ChevronRight, Loader2, ChevronLeft, Eye, Edit3, Plus, Trash2, Save, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import UniversalPatientRecordModal from "../../components/UniversalPatientRecordModal";

export default function DentistTreatmentLogs() {
  const { user } = useAuth();
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTreatment, setSelectedTreatment] = useState(null);

  // Universal Patient Record Viewer State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordPatientId, setRecordPatientId] = useState(null);
  const [recordPatientName, setRecordPatientName] = useState("");

  // Edit Treatment Record State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editProcedureName, setEditProcedureName] = useState("");
  const [editClinicalNotes, setEditClinicalNotes] = useState("");
  const [editSteps, setEditSteps] = useState([]);
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepDesc, setNewStepDesc] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const fetchTreatments = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("treatments")
        .select(`
          *,
          patient:profiles!treatments_patient_id_fkey(first_name, last_name, contact_number, date_of_birth),
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

  useEffect(() => {
    fetchTreatments();
  }, [user?.id]);

  const handleOpenRecordViewer = (patientId, name) => {
    setRecordPatientId(patientId);
    setRecordPatientName(name);
    setIsRecordModalOpen(true);
  };

  const handleOpenEditModal = (t) => {
    setEditProcedureName(t.procedure_name || "");
    setEditClinicalNotes(t.clinical_notes || "");
    const sortedSteps = (t.treatment_steps || []).map(s => ({
      id: s.id,
      title: s.title,
      description: s.description || "",
      status: s.status || "completed",
      step_order: s.step_order
    })).sort((a, b) => a.step_order - b.step_order);
    setEditSteps(sortedSteps);
    setNewStepTitle("");
    setNewStepDesc("");
    setIsEditModalOpen(true);
  };

  const handleAddEditStep = () => {
    if (!newStepTitle.trim()) {
      toast.error("Please enter a step title.");
      return;
    }
    const newStep = {
      id: `temp-${Date.now()}`,
      title: newStepTitle.trim(),
      description: newStepDesc.trim(),
      status: "pending",
      step_order: editSteps.length + 1,
      isNew: true
    };
    setEditSteps(prev => [...prev, newStep]);
    setNewStepTitle("");
    setNewStepDesc("");
  };

  const handleRemoveEditStep = (stepId) => {
    setEditSteps(prev => prev.filter(s => s.id !== stepId));
  };

  const handleUpdateStepStatus = (stepId, newStatus) => {
    setEditSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: newStatus } : s));
  };

  const handleSaveTreatmentEdits = async () => {
    if (!selectedTreatment?.id) return;
    setIsSavingEdit(true);
    try {
      // 1. Update treatments table
      const { error: tErr } = await supabase
        .from("treatments")
        .update({
          procedure_name: editProcedureName.trim(),
          clinical_notes: editClinicalNotes.trim()
        })
        .eq("id", selectedTreatment.id);

      if (tErr) throw tErr;

      // 2. Sync steps
      for (const step of editSteps) {
        if (step.isNew) {
          await supabase.from("treatment_steps").insert({
            treatment_id: selectedTreatment.id,
            title: step.title,
            description: step.description,
            status: step.status,
            step_order: step.step_order
          });
        } else {
          await supabase.from("treatment_steps").update({
            title: step.title,
            description: step.description,
            status: step.status
          }).eq("id", step.id);
        }
      }

      toast.success("Treatment record updated successfully!");
      setIsEditModalOpen(false);
      setSelectedTreatment(null);
      await fetchTreatments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update treatment record.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const filteredTreatments = useMemo(() => {
    return treatments.filter(t => {
      const pName = `${t.patient?.first_name || ''} ${t.patient?.last_name || ''}`.toLowerCase();
      const proc = (t.procedure_name || "").toLowerCase();
      const term = searchTerm.toLowerCase();
      return pName.includes(term) || proc.includes(term);
    });
  }, [treatments, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredTreatments.length / pageSize));
  const paginatedTreatments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTreatments.slice(start, start + pageSize);
  }, [filteredTreatments, currentPage, pageSize]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-955">Treatment Logs</h1>
          <p className="text-slate-500 mt-1 text-sm">Review clinical procedures, timeline steps, and patient dental records.</p>
        </div>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        
        {/* Search Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient name, procedure..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-slate-950/20 focus:border-slate-900 transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Date & Procedure</th>
                <th className="py-3.5 px-4">Patient Name</th>
                <th className="py-3.5 px-4">Steps Progress</th>
                <th className="py-3.5 px-4 text-right">Clinical Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {loading && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 text-sm">
                    <div className="flex items-center justify-center gap-2 font-medium">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                      Loading clinical treatment records...
                    </div>
                  </td>
                </tr>
              )}
              {!loading && paginatedTreatments.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 text-sm font-medium">
                    No treatment logs found matching your search.
                  </td>
                </tr>
              )}
              {!loading && paginatedTreatments.map(t => {
                const totalSteps = t.treatment_steps?.length || 0;
                const completedSteps = t.treatment_steps?.filter(s => s.status === 'completed').length || 0;
                const isFullyComplete = totalSteps > 0 && completedSteps === totalSteps;
                const patientFullName = t.patient ? `${t.patient.first_name} ${t.patient.last_name}` : "Patient";
                
                return (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-955 text-sm">{t.procedure_name}</span>
                        <span className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                          <Clock className="h-3 w-3" /> {new Date(t.treatment_date).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{patientFullName}</span>
                        <button
                          onClick={() => handleOpenRecordViewer(t.patient_id, patientFullName)}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold hover:underline flex items-center gap-1"
                        >
                          (Dental Chart)
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {totalSteps > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-slate-200 rounded-full h-2 max-w-[120px]">
                            <div 
                              className={`h-2 rounded-full ${isFullyComplete ? 'bg-emerald-600' : 'bg-blue-600'}`} 
                              style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-bold text-slate-700 font-mono">{completedSteps}/{totalSteps}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium italic">No steps logged</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSelectedTreatment(t)} 
                          className="h-8 border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold text-xs px-2.5 gap-1"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-600" />
                          View Log
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setSelectedTreatment(t);
                            handleOpenEditModal(t);
                          }} 
                          className="h-8 border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold text-xs px-2.5 gap-1"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-slate-600" />
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredTreatments.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredTreatments.length)} of {filteredTreatments.length} logs
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

      {/* Treatment Details Inspector Modal */}
      {selectedTreatment && (
        <Dialog open={!!selectedTreatment && !isEditModalOpen} onOpenChange={() => setSelectedTreatment(null)}>
          <DialogContent className="max-w-2xl bg-white border-slate-200">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-slate-955">
                    <Activity className="h-6 w-6 text-slate-900" />
                    {selectedTreatment.procedure_name}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-xs text-slate-500">
                    Patient: <span className="font-bold text-slate-900">{selectedTreatment.patient?.first_name} {selectedTreatment.patient?.last_name}</span> • Logged Date: {new Date(selectedTreatment.treatment_date).toLocaleDateString()}
                  </DialogDescription>
                </div>
                <Badge className={
                  selectedTreatment.treatment_steps?.length > 0 && selectedTreatment.treatment_steps.every(s => s.status === 'completed')
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-bold uppercase"
                    : "bg-amber-100 text-amber-800 border-amber-200 text-xs font-bold uppercase"
                }>
                  {selectedTreatment.treatment_steps?.length > 0 && selectedTreatment.treatment_steps.every(s => s.status === 'completed') ? 'Completed' : 'In Progress'}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-200 pb-1.5">
                  <FileText className="h-4 w-4 text-slate-500" /> Clinical Notes
                </h3>
                <p className="text-xs font-mono text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {selectedTreatment.clinical_notes || "No clinical notes recorded for this procedure."}
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-200 pb-1.5">
                  <Stethoscope className="h-4 w-4 text-slate-500" /> Step-by-Step Procedure Timeline
                </h3>
                
                {selectedTreatment.treatment_steps?.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    {[...selectedTreatment.treatment_steps].sort((a, b) => a.step_order - b.step_order).map((step) => (
                      <div key={step.id} className="flex gap-3 relative bg-slate-50/70 p-3 rounded border border-slate-200">
                        <div className="shrink-0 pt-0.5 z-10">
                          {step.status === 'completed' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-slate-300 bg-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <p className="font-bold text-xs text-slate-900">
                              Step {step.step_order}: {step.title}
                            </p>
                            <Badge variant="outline" className="text-[10px] uppercase font-bold">
                              {step.status}
                            </Badge>
                          </div>
                          {step.description && (
                            <p className="text-xs text-slate-600 mt-1">{step.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-4">No procedure steps logged.</p>
                )}
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenRecordViewer(selectedTreatment.patient_id, `${selectedTreatment.patient?.first_name} ${selectedTreatment.patient?.last_name}`)}
                className="text-xs font-semibold border-slate-300 text-blue-700 hover:bg-blue-50 gap-1.5"
              >
                <Stethoscope className="h-3.5 w-3.5" /> View Patient Dental Chart & Records
              </Button>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleOpenEditModal(selectedTreatment)}
                  className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold gap-1.5"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit Treatment Record
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Treatment Record Modal */}
      {isEditModalOpen && selectedTreatment && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-3xl bg-white border-slate-200">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-955">
                <Edit3 className="h-5 w-5 text-slate-900" /> Edit Treatment Record
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Update clinical notes, procedure name, or procedure steps for <strong className="text-slate-900">{selectedTreatment.patient?.first_name} {selectedTreatment.patient?.last_name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 max-h-[60vh] overflow-y-auto">
              <div className="grid gap-2">
                <Label className="text-xs font-bold text-slate-800">Procedure Name</Label>
                <Input
                  value={editProcedureName}
                  onChange={(e) => setEditProcedureName(e.target.value)}
                  placeholder="e.g. Root Canal Treatment"
                  className="h-9 text-xs font-medium"
                />
              </div>

              <div className="grid gap-2">
                <Label className="text-xs font-bold text-slate-800">Clinical Notes & Observations</Label>
                <Textarea
                  value={editClinicalNotes}
                  onChange={(e) => setEditClinicalNotes(e.target.value)}
                  placeholder="Clinical notes, medications applied, findings..."
                  className="min-h-[100px] text-xs font-medium"
                />
              </div>

              {/* Steps Management */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-slate-800">Procedure Steps Timeline</Label>
                  <span className="text-[11px] text-slate-400 font-medium">Update step status or add new steps</span>
                </div>

                <div className="space-y-2">
                  {editSteps.map((step, idx) => (
                    <div key={step.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <span className="font-bold text-xs text-slate-900 block">Step {idx + 1}: {step.title}</span>
                        {step.description && <span className="text-[11px] text-slate-500 block">{step.description}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={step.status} onValueChange={(val) => handleUpdateStepStatus(step.id, val)}>
                          <SelectTrigger className="h-7 w-28 text-[11px] font-semibold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="current">In Progress</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveEditStep(step.id)}
                          className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Step Inputs */}
                <div className="bg-slate-100/60 p-3 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">Add Procedure Step</span>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Step Title (e.g. Canal Obturation)"
                      value={newStepTitle}
                      onChange={(e) => setNewStepTitle(e.target.value)}
                      className="h-8 text-xs bg-white"
                    />
                    <Input
                      placeholder="Description (Optional)"
                      value={newStepDesc}
                      onChange={(e) => setNewStepDesc(e.target.value)}
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddEditStep}
                    className="w-full text-xs font-semibold h-8 gap-1 border-slate-300"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Step to Timeline
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSavingEdit}
                className="text-xs font-semibold border-slate-300"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveTreatmentEdits}
                disabled={isSavingEdit}
                className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold gap-1.5 shadow-sm"
              >
                <Save className="h-3.5 w-3.5" /> {isSavingEdit ? "Saving..." : "Save Record Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Universal Patient Record & Dental Chart Modal */}
      <UniversalPatientRecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        patientId={recordPatientId}
        patientName={recordPatientName}
      />

    </div>
  );
}
