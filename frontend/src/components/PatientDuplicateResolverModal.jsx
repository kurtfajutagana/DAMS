import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  UserCheck, 
  Calendar, 
  Stethoscope, 
  FileText, 
  Receipt, 
  Pill, 
  Trash2, 
  Loader2, 
  HelpCircle,
  Clock,
  Sparkles,
  Phone,
  Mail,
  User,
  Activity,
  Layers,
  Check,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { formatPhoneDisplay } from "../lib/validation";

export default function PatientDuplicateResolverModal({ 
  isOpen, 
  onClose, 
  patientId, 
  patientName,
  onSuccess 
}) {
  const [loading, setLoading] = useState(true);
  const [duplicateData, setDuplicateData] = useState(null);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);
  
  // Master record selection: "target" | "candidate"
  const [masterRecord, setMasterRecord] = useState("target");
  
  // Overrides if staff wants specific demographics on master
  const [selectedPhone, setSelectedPhone] = useState("");
  const [selectedDob, setSelectedDob] = useState("");
  const [selectedGender, setSelectedGender] = useState("");

  // Confirmation modal states
  const [isMerging, setIsMerging] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmMerge, setShowConfirmMerge] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (!isOpen || !patientId) return;

    const fetchDuplicateDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/staff/patients/${patientId}/duplicate-details`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Failed to load duplicate candidate details.");
        }
        const data = await res.json();
        setDuplicateData(data);
        setSelectedCandidateIndex(0);

        // Determine smart initial master record
        // Default to portal user or the one with more clinical history
        const target = data.target_patient;
        const candidate = data.candidates?.[0];

        if (candidate) {
          const targetIsPortal = Boolean(target.profile?.is_email_verified);
          const candIsPortal = Boolean(candidate.profile?.is_email_verified);
          
          if (!targetIsPortal && candIsPortal) {
            setMasterRecord("candidate");
          } else if (target.total_clinical_records < candidate.total_clinical_records && !targetIsPortal) {
            setMasterRecord("candidate");
          } else {
            setMasterRecord("target");
          }

          // Preset demographics choice
          setSelectedPhone(target.profile?.contact_number || candidate.profile?.contact_number || "");
          setSelectedDob(target.profile?.date_of_birth || candidate.profile?.date_of_birth || "");
          setSelectedGender(target.profile?.gender || candidate.profile?.gender || "");
        }
      } catch (err) {
        console.error("Error loading duplicate info:", err);
        toast.error(err.message || "Could not retrieve duplicate records.");
      } finally {
        setLoading(false);
      }
    };

    fetchDuplicateDetails();
  }, [isOpen, patientId]);

  if (!isOpen) return null;

  const target = duplicateData?.target_patient;
  const candidates = duplicateData?.candidates || [];
  const currentCandidate = candidates[selectedCandidateIndex] || null;

  const primaryProfile = masterRecord === "target" ? target : currentCandidate;
  const secondaryProfile = masterRecord === "target" ? currentCandidate : target;

  const handleCandidateChange = (index) => {
    setSelectedCandidateIndex(index);
    const cand = candidates[index];
    if (cand) {
      if (!target.profile?.is_email_verified && cand.profile?.is_email_verified) {
        setMasterRecord("candidate");
      } else {
        setMasterRecord("target");
      }
      setSelectedPhone(target.profile?.contact_number || cand.profile?.contact_number || "");
      setSelectedDob(target.profile?.date_of_birth || cand.profile?.date_of_birth || "");
      setSelectedGender(target.profile?.gender || cand.profile?.gender || "");
    }
  };

  const handleExecuteMerge = async () => {
    if (!primaryProfile || !secondaryProfile) return;

    setIsMerging(true);
    try {
      const payload = {
        primary_patient_id: primaryProfile.profile.id,
        secondary_patient_id: secondaryProfile.profile.id,
        demographics_to_keep: {
          contact_number: selectedPhone || primaryProfile.profile.contact_number,
          date_of_birth: selectedDob || primaryProfile.profile.date_of_birth,
          gender: selectedGender || primaryProfile.profile.gender
        }
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/staff/patients/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to merge patient records.");
      }

      const result = await res.json();
      toast.success("Patient records merged successfully without any data loss!");
      setShowConfirmMerge(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to complete merge.");
    } finally {
      setIsMerging(false);
    }
  };

  const handleDismissDuplicate = async () => {
    if (!target || !currentCandidate) return;

    setIsDismissing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/staff/patients/dismiss-duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id_1: target.profile.id,
          patient_id_2: currentCandidate.profile.id,
          reason: "Marked as separate distinct patients by clinic staff"
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to dismiss duplicate.");
      }

      toast.success("Duplicate warning dismissed. Records kept separate.");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to dismiss duplicate.");
    } finally {
      setIsDismissing(false);
    }
  };

  const handleDeleteEmpty = async () => {
    if (!secondaryProfile) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/staff/patients/delete-empty-duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: secondaryProfile.profile.id
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to delete empty record.");
      }

      toast.success("Empty duplicate record deleted cleanly.");
      setShowConfirmDelete(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to delete record.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl bg-slate-50">
          {/* Header */}
          <div className="bg-white p-6 border-b border-slate-200 sticky top-0 z-20 shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-extrabold text-slate-900">
                      Resolve Duplicate Patient Records
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 mt-0.5">
                      Review matching profiles side-by-side, verify attached appointments & treatments, and merge into a unified master record.
                    </DialogDescription>
                  </div>
                </div>
              </div>
            </div>

            {/* Candidate Selector if multiple duplicates found */}
            {!loading && candidates.length > 1 && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
                <span className="text-xs font-bold text-slate-500 shrink-0">Matching Matches ({candidates.length}):</span>
                {candidates.map((cand, idx) => (
                  <Button
                    key={cand.profile.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleCandidateChange(idx)}
                    className={`h-8 text-xs font-bold rounded-lg ${
                      selectedCandidateIndex === idx
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    Match #{idx + 1}: {cand.profile.first_name} {cand.profile.last_name}
                    <Badge variant="secondary" className="ml-1.5 text-[9px] px-1 py-0 uppercase">
                      {cand.confidence}
                    </Badge>
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                <p className="text-sm font-medium">Scanning clinical history and matching records...</p>
              </div>
            ) : !currentCandidate ? (
              <div className="text-center py-16 space-y-3">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No duplicate records detected</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  No overlapping active records or phone numbers were found for {patientName}.
                </p>
                <Button onClick={onClose} variant="outline" className="rounded-xl mt-2 text-xs font-bold">
                  Close Window
                </Button>
              </div>
            ) : (
              <>
                {/* Match Reasons Alert */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900">
                  <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold">Duplicate Match Detected ({currentCandidate.confidence.toUpperCase()} CONFIDENCE)</p>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-800 font-medium">
                      {currentCandidate.reasons?.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Master Record Selector Banner */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-indigo-950 font-medium">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>
                      Select which record to keep as the <strong>Primary Master Profile</strong>. All clinical history from the secondary will be merged into it.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 bg-white p-1 rounded-lg border border-indigo-100 shadow-2xs">
                    <Button
                      size="sm"
                      variant={masterRecord === "target" ? "default" : "ghost"}
                      onClick={() => setMasterRecord("target")}
                      className={`h-7 px-3 text-xs font-bold rounded-md ${
                        masterRecord === "target" ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-slate-600"
                      }`}
                    >
                      Keep Record A as Master
                    </Button>
                    <Button
                      size="sm"
                      variant={masterRecord === "candidate" ? "default" : "ghost"}
                      onClick={() => setMasterRecord("candidate")}
                      className={`h-7 px-3 text-xs font-bold rounded-md ${
                        masterRecord === "candidate" ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-slate-600"
                      }`}
                    >
                      Keep Record B as Master
                    </Button>
                  </div>
                </div>

                {/* Side-by-Side Comparison Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* RECORD A (Target) */}
                  <ProfileComparisonCard
                    recordLabel="Record A"
                    isMaster={masterRecord === "target"}
                    data={target}
                    onSelectMaster={() => setMasterRecord("target")}
                  />

                  {/* RECORD B (Candidate) */}
                  <ProfileComparisonCard
                    recordLabel="Record B"
                    isMaster={masterRecord === "candidate"}
                    data={currentCandidate}
                    onSelectMaster={() => setMasterRecord("candidate")}
                  />
                </div>

                {/* Merge Action Details & Demographics Preference */}
                <Card className="border border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Merge Configuration & Verification
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Master ID: {primaryProfile?.profile?.id?.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Preferred Phone */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600">Preserved Contact Number</label>
                        <select
                          value={selectedPhone}
                          onChange={(e) => setSelectedPhone(e.target.value)}
                          className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                        >
                          <option value={primaryProfile?.profile?.contact_number || ""}>
                            Master: {formatPhoneDisplay(primaryProfile?.profile?.contact_number) || "None"}
                          </option>
                          {secondaryProfile?.profile?.contact_number && secondaryProfile?.profile?.contact_number !== primaryProfile?.profile?.contact_number && (
                            <option value={secondaryProfile?.profile?.contact_number || ""}>
                              Secondary: {formatPhoneDisplay(secondaryProfile?.profile?.contact_number)}
                            </option>
                          )}
                        </select>
                      </div>

                      {/* Preferred DOB */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600">Preserved Date of Birth</label>
                        <select
                          value={selectedDob}
                          onChange={(e) => setSelectedDob(e.target.value)}
                          className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                        >
                          <option value={primaryProfile?.profile?.date_of_birth || ""}>
                            Master: {primaryProfile?.profile?.date_of_birth || "None"}
                          </option>
                          {secondaryProfile?.profile?.date_of_birth && secondaryProfile?.profile?.date_of_birth !== primaryProfile?.profile?.date_of_birth && (
                            <option value={secondaryProfile?.profile?.date_of_birth || ""}>
                              Secondary: {secondaryProfile?.profile?.date_of_birth}
                            </option>
                          )}
                        </select>
                      </div>

                      {/* Preferred Gender */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600">Preserved Gender</label>
                        <select
                          value={selectedGender}
                          onChange={(e) => setSelectedGender(e.target.value)}
                          className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                        >
                          <option value={primaryProfile?.profile?.gender || ""}>
                            Master: {primaryProfile?.profile?.gender || "Not specified"}
                          </option>
                          {secondaryProfile?.profile?.gender && secondaryProfile?.profile?.gender !== primaryProfile?.profile?.gender && (
                            <option value={secondaryProfile?.profile?.gender || ""}>
                              Secondary: {secondaryProfile?.profile?.gender}
                            </option>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Safe Transfer Guarantee */}
                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-[11px] text-emerald-900 flex items-start gap-2.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Zero Data Loss Guarantee:</strong> All past appointments ({secondaryProfile?.appointments_count || 0}), procedure treatments ({secondaryProfile?.treatments_count || 0}), marked tooth conditions ({secondaryProfile?.teeth_count || 0}), billing invoices ({secondaryProfile?.invoices_count || 0}), and prescriptions ({secondaryProfile?.prescriptions_count || 0}) from the secondary record will be transferred automatically into the master record.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Footer Actions */}
          {!loading && currentCandidate && (
            <div className="bg-white p-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sticky bottom-0 z-20">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDismissDuplicate}
                  disabled={isDismissing || isMerging || isDeleting}
                  className="h-9 text-xs font-bold rounded-xl text-slate-700 hover:bg-slate-100"
                  title="Dismiss duplicate warning for this pair if they are separate people sharing a phone"
                >
                  {isDismissing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <HelpCircle className="h-3.5 w-3.5 mr-1 text-slate-400" />}
                  Dismiss Flag (Keep Separate)
                </Button>

                {secondaryProfile?.total_clinical_records === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConfirmDelete(true)}
                    disabled={isDismissing || isMerging || isDeleting}
                    className="h-9 text-xs font-bold rounded-xl text-rose-700 border-rose-200 hover:bg-rose-50"
                    title="Delete empty duplicate record since it has 0 clinical history"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete Empty Duplicate
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={isMerging || isDismissing || isDeleting}
                  className="h-9 text-xs font-bold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowConfirmMerge(true)}
                  disabled={isMerging || isDismissing || isDeleting}
                  className="h-9 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs px-4"
                >
                  <Layers className="h-3.5 w-3.5 mr-1.5" />
                  Merge into Master Record
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Merge Confirmation Dialog */}
      <Dialog open={showConfirmMerge} onOpenChange={setShowConfirmMerge}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <div className="h-10 w-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center mb-2">
              <Layers className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Confirm Patient Record Merge
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              You are about to merge secondary record <strong>{secondaryProfile?.profile?.first_name} {secondaryProfile?.profile?.last_name}</strong> (ID: {secondaryProfile?.profile?.id?.substring(0,8).toUpperCase()}) into master profile <strong>{primaryProfile?.profile?.first_name} {primaryProfile?.profile?.last_name}</strong> (ID: {primaryProfile?.profile?.id?.substring(0,8).toUpperCase()}).
            </DialogDescription>
          </DialogHeader>

          <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-2 text-slate-700 border border-slate-200">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Transfer Summary:
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>• {secondaryProfile?.appointments_count || 0} Appointments</div>
              <div>• {secondaryProfile?.treatments_count || 0} Treatment Logs</div>
              <div>• {secondaryProfile?.teeth_count || 0} Marked Teeth</div>
              <div>• {secondaryProfile?.invoices_count || 0} Invoices</div>
            </div>
            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
              After transfer, the secondary record will be removed and cannot be undone.
            </p>
          </div>

          <DialogFooter className="pt-3 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmMerge(false)}
              disabled={isMerging}
              className="rounded-xl h-10 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExecuteMerge}
              disabled={isMerging}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 text-xs font-bold px-4"
            >
              {isMerging ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Layers className="h-4 w-4 mr-1" />}
              Yes, Merge Records Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Empty Confirmation Dialog */}
      <Dialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <div className="h-10 w-10 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mb-2">
              <Trash2 className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Delete Empty Duplicate Record?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Secondary record <strong>{secondaryProfile?.profile?.first_name} {secondaryProfile?.profile?.last_name}</strong> has 0 appointments, 0 treatments, and 0 invoices. Deleting it will permanently remove this unused profile.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDelete(false)}
              disabled={isDeleting}
              className="rounded-xl h-10 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteEmpty}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-10 text-xs font-bold px-4"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Yes, Delete Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProfileComparisonCard({ recordLabel, isMaster, data, onSelectMaster }) {
  if (!data) return null;
  const p = data.profile || {};
  const isPortal = Boolean(p.is_email_verified);

  return (
    <Card 
      onClick={onSelectMaster}
      className={`border-2 rounded-2xl overflow-hidden cursor-pointer transition-all ${
        isMaster 
          ? "border-indigo-600 bg-white shadow-md ring-2 ring-indigo-600/10" 
          : "border-slate-200 bg-white/70 hover:border-slate-300 opacity-90"
      }`}
    >
      {/* Top Banner */}
      <div className={`px-4 py-2.5 flex items-center justify-between text-xs font-bold border-b ${
        isMaster ? "bg-indigo-600 text-white border-indigo-700" : "bg-slate-100 text-slate-700 border-slate-200"
      }`}>
        <div className="flex items-center gap-1.5">
          <span>{recordLabel}</span>
          <span className="font-normal opacity-80">({p.id?.substring(0, 8).toUpperCase()})</span>
        </div>
        <div>
          {isMaster ? (
            <span className="inline-flex items-center gap-1 bg-white text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase">
              <Check className="h-3 w-3" /> Master Profile
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-medium hover:text-slate-900">
              Click to make Master
            </span>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Name & Status */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-extrabold text-base text-slate-900">
              {p.first_name} {p.last_name}
            </h4>
            {p.nickname && (
              <p className="text-xs text-slate-500 font-medium">Nickname: "{p.nickname}"</p>
            )}
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Registered: {p.created_at ? new Date(p.created_at).toLocaleDateString() : "Unknown"}
            </p>
          </div>
          <div>
            {isPortal ? (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                <ShieldCheck className="h-3 w-3 mr-1 text-emerald-600" /> Portal Active
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
                <UserCheck className="h-3 w-3 mr-1 text-amber-600" /> Walk-In Only
              </Badge>
            )}
          </div>
        </div>

        {/* Demographics Grid */}
        <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs border border-slate-100">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Phone</span>
            <span className="font-bold text-slate-800">
              {formatPhoneDisplay(p.contact_number) || "No Phone"}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Email</span>
            <span className="font-medium text-slate-700 truncate block">
              {data.email || "No Email"}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Birthdate</span>
            <span className="font-medium text-slate-700">
              {p.date_of_birth || "Not specified"}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Gender</span>
            <span className="font-medium text-slate-700">
              {p.gender || "Not specified"}
            </span>
          </div>
        </div>

        {/* Clinical History Assets Summary */}
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
            Clinical History & Linked Records
          </span>
          <div className="grid grid-cols-2 gap-2">
            {/* Appointments */}
            <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                <span>Appointments</span>
              </div>
              <Badge variant="secondary" className="font-bold text-xs h-5 px-1.5">
                {data.appointments_count || 0}
              </Badge>
            </div>

            {/* Treatments */}
            <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Stethoscope className="h-3.5 w-3.5 text-blue-500" />
                <span>Treatments</span>
              </div>
              <Badge variant="secondary" className="font-bold text-xs h-5 px-1.5">
                {data.treatments_count || 0}
              </Badge>
            </div>

            {/* Tooth Chart */}
            <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Activity className="h-3.5 w-3.5 text-emerald-500" />
                <span>Marked Teeth</span>
              </div>
              <Badge variant="secondary" className="font-bold text-xs h-5 px-1.5">
                {data.teeth_count || 0}
              </Badge>
            </div>

            {/* Invoices */}
            <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Receipt className="h-3.5 w-3.5 text-amber-500" />
                <span>Invoices</span>
              </div>
              <Badge variant="secondary" className="font-bold text-xs h-5 px-1.5">
                {data.invoices_count || 0}
              </Badge>
            </div>
          </div>

          {/* Quick Assets Detail Snippet */}
          {data.appointments_count > 0 && (
            <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-700">Latest Appt:</span> {data.appointments?.[0]?.appointment_date} ({data.appointments?.[0]?.status}) - {data.appointments?.[0]?.reason || "General Visit"}
            </div>
          )}

          {data.treatments_count > 0 && (
            <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-700">Latest Treatment:</span> {data.treatments?.[0]?.procedure_name} (Tooth {data.treatments?.[0]?.tooth_number || "All"})
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
