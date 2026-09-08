import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/dialog";
import { Search, Loader2, Printer, Phone, Save, Globe, UserCheck, KeyRound, Mail, CheckCircle2, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function StaffPatientRecords() {
  const location = useLocation();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [accountFilter, setAccountFilter] = useState("all"); // "all" | "portal" | "walk_in" | "duplicates"
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [fullRecord, setFullRecord] = useState(null);
  const [patientInvoices, setPatientInvoices] = useState([]);
  const [loadingRecord, setLoadingRecord] = useState(false);

  // Activate Portal Modal State
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [portalEmail, setPortalEmail] = useState("");
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    if (location.state?.searchPatient) {
      setSearchTerm(location.state.searchPatient);
    } else if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
    }
  }, [location.state]);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id, first_name, last_name, contact_number, is_email_verified, created_at
        `)
        .eq("role", "patient")
        .order("first_name", { ascending: true });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load patient records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleViewProfile = async (patient) => {
    setSelectedPatient(patient);
    setLoadingRecord(true);
    setFullRecord(null);
    setPatientInvoices([]);
    try {
      // Fetch full clinical record
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/staff/patients/${patient.id}/full-record`);
      if (!res.ok) throw new Error("Failed to fetch full record");
      const data = await res.json();
      setFullRecord(data);

      // Fetch financial invoices
      const { data: invData, error: invErr } = await supabase
        .from("invoices")
        .select("*")
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false });
      
      if (!invErr && invData) {
        setPatientInvoices(invData);
      }

    } catch (err) {
      console.error(err);
      toast.error("Failed to load full medical history.");
    } finally {
      setLoadingRecord(false);
    }
  };

  const handleOpenActivateModal = (patient) => {
    setSelectedPatient(patient);
    setPortalEmail("");
    setIsActivateModalOpen(true);
  };

  const handleActivatePortal = async (e) => {
    e.preventDefault();
    if (!portalEmail || !portalEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setIsActivating(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/staff/patients/${selectedPatient.id}/activate-portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: portalEmail })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to activate portal account");
      }
      const data = await res.json();
      toast.success("Patient portal account activated successfully!");
      setIsActivateModalOpen(false);
      
      // Update local state
      setPatients(prev => prev.map(p => p.id === selectedPatient.id ? { ...p, is_email_verified: true } : p));
      if (selectedPatient) {
        setSelectedPatient(prev => ({ ...prev, is_email_verified: true }));
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to activate portal account.");
    } finally {
      setIsActivating(false);
    }
  };

  // Calculate potential duplicate records
  const duplicateInfoMap = useMemo(() => {
    const map = new Map();
    const phoneGroups = new Map();
    const nameGroups = new Map();

    patients.forEach(p => {
      const cleanPhone = (p.contact_number || "").replace(/\D/g, "");
      if (cleanPhone.length >= 7) {
        if (!phoneGroups.has(cleanPhone)) phoneGroups.set(cleanPhone, []);
        phoneGroups.get(cleanPhone).push(p.id);
      }

      const fullName = `${p.first_name || ""} ${p.last_name || ""}`.trim().toLowerCase();
      if (fullName.length > 2) {
        if (!nameGroups.has(fullName)) nameGroups.set(fullName, []);
        nameGroups.get(fullName).push(p.id);
      }
    });

    patients.forEach(p => {
      const reasons = [];
      const cleanPhone = (p.contact_number || "").replace(/\D/g, "");
      if (cleanPhone.length >= 7 && (phoneGroups.get(cleanPhone)?.length || 0) > 1) {
        reasons.push("Shares phone number with another record");
      }

      const fullName = `${p.first_name || ""} ${p.last_name || ""}`.trim().toLowerCase();
      if (fullName.length > 2 && (nameGroups.get(fullName)?.length || 0) > 1) {
        reasons.push("Shares identical name with another record");
      }

      if (reasons.length > 0) {
        map.set(p.id, { isDuplicate: true, reasons });
      }
    });

    return map;
  }, [patients]);

  const filteredPatients = patients.filter(p => {
    const full = `${p.first_name} ${p.last_name}`.toLowerCase();
    const matchesSearch = full.includes(searchTerm.toLowerCase()) || p.contact_number?.includes(searchTerm);
    
    let matchesAccount = true;
    if (accountFilter === "portal") {
      matchesAccount = Boolean(p.is_email_verified);
    } else if (accountFilter === "walk_in") {
      matchesAccount = !p.is_email_verified;
    } else if (accountFilter === "duplicates") {
      matchesAccount = duplicateInfoMap.has(p.id);
    }

    return matchesSearch && matchesAccount;
  });

  const portalCount = patients.filter(p => p.is_email_verified).length;
  const walkInCount = patients.filter(p => !p.is_email_verified).length;
  const duplicatesCount = duplicateInfoMap.size;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Patient Directory</h1>
          <p className="text-sm font-medium text-slate-600 mt-1">Search, identify online portal vs. walk-in patients, detect duplicates, and view clinical records.</p>
        </div>
      </div>

      <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-4">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            {/* Search Input */}
            <div className="flex items-center relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search by patient name or phone..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 bg-white rounded-xl border-slate-200 text-sm font-medium focus-visible:ring-0"
              />
            </div>

            {/* Account Type Filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "all", label: "All Patients", count: patients.length },
                { id: "portal", label: "Portal Active", count: portalCount, icon: Globe },
                { id: "walk_in", label: "Walk-In Only", count: walkInCount, icon: UserCheck },
                { id: "duplicates", label: "Potential Duplicates", count: duplicatesCount, icon: AlertTriangle, isWarning: true }
              ].map(tab => (
                <Button
                  key={tab.id}
                  variant="outline"
                  size="sm"
                  onClick={() => setAccountFilter(tab.id)}
                  className={`h-8 text-xs font-bold rounded-lg transition-all ${
                    accountFilter === tab.id
                      ? tab.isWarning 
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs" 
                        : "bg-slate-950 text-white border-slate-950 shadow-xs"
                      : tab.isWarning && tab.count > 0
                        ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {tab.isWarning && <AlertTriangle className="h-3.5 w-3.5 mr-1" />}
                  {tab.label}
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    accountFilter === tab.id 
                      ? "bg-black/20 text-white" 
                      : tab.isWarning && tab.count > 0 
                        ? "bg-amber-200 text-amber-900" 
                        : "bg-slate-100 text-slate-600"
                  }`}>
                    {tab.count}
                  </span>
                </Button>
              ))}
            </div>
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
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 font-bold">Patient Name</th>
                    <th className="px-6 py-4 font-bold">Account Status</th>
                    <th className="px-6 py-4 font-bold">Contact</th>
                    <th className="px-6 py-4 font-bold">Registered Date</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        No patients found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                      filteredPatients.map(patient => (
                      <tr key={patient.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-bold text-xs">
                              {patient.first_name?.[0]}{patient.last_name?.[0]}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-slate-900">{patient.first_name} {patient.last_name}</p>
                                {duplicateInfoMap.has(patient.id) && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300/80 px-1.5 py-0.5 rounded">
                                    <AlertTriangle className="h-3 w-3 text-amber-600" /> Potential Duplicate
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-[10px] text-slate-400 font-mono">ID: {patient.id.substring(0,8).toUpperCase()}</p>
                                {duplicateInfoMap.get(patient.id)?.reasons?.map((r, idx) => (
                                  <span key={idx} className="text-[10px] text-amber-700 font-medium">· {r}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {patient.is_email_verified ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              <ShieldCheck className="h-3.5 w-3.5" /> Portal Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                              <UserCheck className="h-3.5 w-3.5" /> Walk-In Only
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-slate-400" /> {patient.contact_number || "No Phone"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs font-medium">
                          {new Date(patient.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {!patient.is_email_verified && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleOpenActivateModal(patient)}
                              className="text-xs font-semibold h-8 rounded-lg border-amber-300 text-amber-800 hover:bg-amber-50"
                            >
                              <KeyRound className="h-3.5 w-3.5 mr-1" /> Activate Portal
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewProfile(patient)}
                            className="text-xs font-semibold h-8 rounded-lg border-slate-300 text-slate-800 hover:bg-slate-100"
                          >
                            View Record
                          </Button>
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

      {/* Patient Profile Modal - PDF / Report Style */}
      {selectedPatient && (
        <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-white rounded-none border-none sm:rounded-sm print:max-h-none print:w-full print:m-0 print:p-0">
            
            {/* Action Bar (Hidden when printing) */}
            <div className="bg-slate-100 p-3 flex justify-between items-center border-b print:hidden sticky top-0 z-10">
              <span className="text-sm font-semibold text-slate-600">Patient Clinical Record & Dental Chart</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedPatient(null)}>Close</Button>
                <Button size="sm" className="bg-slate-800 text-white gap-2" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" /> Print Record
                </Button>
              </div>
            </div>

            {/* Formal Report Document */}
            <div className="p-10 bg-white text-slate-900 max-w-4xl mx-auto print:p-4" id="printable-record">
              
              {/* Clinic Header */}
              <div className="text-center border-b-2 border-slate-800 pb-6 mb-6">
                <h1 className="text-2xl font-black tracking-widest uppercase text-slate-900">Teeth Talk Dental Clinic</h1>
                <p className="text-sm text-slate-500 uppercase tracking-widest mt-1">Patient Clinical & Financial Record</p>
                <p className="text-xs text-slate-400 mt-2 font-mono">Generated: {new Date().toLocaleString()}</p>
              </div>

              {/* Loading State Overlay */}
              {loadingRecord && (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                  <span className="ml-3 text-slate-500 uppercase tracking-widest text-sm">Retrieving Data...</span>
                </div>
              )}

              {!loadingRecord && (
                <div className="space-y-8">
                  
                  {/* Section 1: Demographics Grid */}
                  <div>
                    <h2 className="bg-slate-800 text-white uppercase tracking-widest text-xs font-bold py-1.5 px-3 mb-2">1. Demographic Information</h2>
                    <div className="grid grid-cols-4 border-t border-l border-slate-800">
                      
                      <div className="col-span-2 border-r border-b border-slate-800 p-2">
                        <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Full Name</p>
                        <p className="text-sm font-semibold uppercase">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                      </div>
                      
                      <div className="col-span-1 border-r border-b border-slate-800 p-2">
                        <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Patient ID</p>
                        <p className="text-sm font-mono">{selectedPatient.id.substring(0,8).toUpperCase()}</p>
                      </div>

                      <div className="col-span-1 border-r border-b border-slate-800 p-2">
                        <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Reg. Date</p>
                        <p className="text-sm">{new Date(selectedPatient.created_at).toLocaleDateString()}</p>
                      </div>

                      <div className="col-span-1 border-r border-b border-slate-800 p-2">
                        <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Phone Number</p>
                        <p className="text-sm font-mono">{selectedPatient.contact_number || "N/A"}</p>
                      </div>

                      <div className="col-span-1 border-r border-b border-slate-800 p-2">
                        <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Date of Birth</p>
                        <p className="text-sm">{fullRecord?.patient_profile?.date_of_birth || "N/A"}</p>
                      </div>

                      <div className="col-span-1 border-r border-b border-slate-800 p-2">
                        <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Gender</p>
                        <p className="text-sm capitalize">{fullRecord?.patient_profile?.gender || "N/A"}</p>
                      </div>

                      <div className="col-span-1 border-r border-b border-slate-800 p-2">
                        <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Occupation</p>
                        <p className="text-sm capitalize truncate">{fullRecord?.patient_profile?.occupation || "N/A"}</p>
                      </div>

                      <div className="col-span-2 border-r border-b border-slate-800 p-2 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Portal Access Status</p>
                          <p className="text-sm font-semibold">
                            {selectedPatient.is_email_verified ? (
                              <span className="text-emerald-600 font-bold">● Active Portal Account (Online Login Enabled)</span>
                            ) : (
                              <span className="text-amber-600 font-bold">○ Walk-In Clinical Record (No Online Login)</span>
                            )}
                          </p>
                        </div>
                        {!selectedPatient.is_email_verified && (
                          <Button 
                            size="sm" 
                            onClick={() => handleOpenActivateModal(selectedPatient)}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-7 rounded px-2.5 print:hidden"
                          >
                            <KeyRound className="h-3 w-3 mr-1" /> Create Login
                          </Button>
                        )}
                      </div>

                    </div>
                  </div>



                  {/* Section 2: Medical History Questionnaire */}
                  <div>
                    <h2 className="bg-slate-800 text-white uppercase tracking-widest text-xs font-bold py-1.5 px-3 mb-2">2. Clinical Questionnaire & History</h2>
                    {fullRecord?.medical_history && Object.keys(fullRecord.medical_history).length > 0 ? (
                      <div className="border border-slate-800">
                        {(() => {
                          const mh = fullRecord.medical_history; 
                          return (
                            <table className="w-full text-sm">
                              <tbody className="divide-y divide-slate-800">
                                <tr>
                                  <td className="p-2 border-r border-slate-800 w-3/4">1. Is the patient in generally good health?</td>
                                  <td className="p-2 font-bold text-center w-1/4 uppercase">{mh.q_good_health ? "Yes" : "No"}</td>
                                </tr>
                                <tr>
                                  <td className="p-2 border-r border-slate-800">2. Is the patient currently under medical treatment?</td>
                                  <td className="p-2 font-bold text-center uppercase">{mh.q_medical_treatment ? "Yes" : "No"}</td>
                                </tr>
                                {mh.q_medical_treatment_details && (
                                  <tr className="bg-slate-50">
                                    <td colSpan={2} className="p-2 pl-6 text-xs text-slate-600"><span className="font-bold">Condition:</span> {mh.q_medical_treatment_details}</td>
                                  </tr>
                                )}
                                <tr>
                                  <td className="p-2 border-r border-slate-800">3. Has the patient been had a serious illness or surgical operation?</td>
                                  <td className="p-2 font-bold text-center uppercase">{mh.q_surgical_operation ? "Yes" : "No"}</td>
                                </tr>
                                {mh.q_surgical_operation_details && (
                                  <tr className="bg-slate-50">
                                    <td colSpan={2} className="p-2 pl-6 text-xs text-slate-600"><span className="font-bold">Illness/Operation:</span> {mh.q_surgical_operation_details}</td>
                                  </tr>
                                )}
                                <tr>
                                  <td className="p-2 border-r border-slate-800">4. Has the patient been hospitalized recently?</td>
                                  <td className="p-2 font-bold text-center uppercase">{mh.q_hospitalized ? "Yes" : "No"}</td>
                                </tr>
                                {mh.q_hospitalized_details && (
                                  <tr className="bg-slate-50">
                                    <td colSpan={2} className="p-2 pl-6 text-xs text-slate-600"><span className="font-bold">When/Why:</span> {mh.q_hospitalized_details}</td>
                                  </tr>
                                )}
                                <tr>
                                  <td className="p-2 border-r border-slate-800">5. Is the patient taking any prescription/non-prescription medications?</td>
                                  <td className="p-2 font-bold text-center uppercase">{mh.q_medication ? "Yes" : "No"}</td>
                                </tr>
                                {mh.q_medication_details && (
                                  <tr className="bg-slate-50">
                                    <td colSpan={2} className="p-2 pl-6 text-xs text-slate-600"><span className="font-bold">Medications:</span> {mh.q_medication_details}</td>
                                  </tr>
                                )}
                                <tr>
                                  <td className="p-2 border-r border-slate-800">6. Does the patient use Tobacco products?</td>
                                  <td className="p-2 font-bold text-center uppercase">{mh.q_tobacco ? "Yes" : "No"}</td>
                                </tr>
                                <tr>
                                  <td className="p-2 border-r border-slate-800">7. Does the patient use alcohol, cocaine or other dangerous drugs?</td>
                                  <td className="p-2 font-bold text-center uppercase">{mh.q_drugs_alcohol ? "Yes" : "No"}</td>
                                </tr>
                                <tr>
                                  <td className="p-2 border-r border-slate-800">8. Does the patient have any known allergies?</td>
                                  <td className={`p-2 font-bold text-center uppercase ${mh.q_allergic ? 'text-red-700' : ''}`}>{mh.q_allergic ? "Yes" : "No"}</td>
                                </tr>
                                {mh.allergies && Object.keys(mh.allergies).length > 0 && (
                                  <tr className="bg-slate-50">
                                    <td colSpan={2} className="p-2 pl-6 text-xs text-slate-600">
                                      <span className="font-bold">Allergies:</span> {
                                        Object.entries(mh.allergies)
                                          .filter(([k, v]) => k !== "others_detail" && v)
                                          .map(([k]) => k).join(", ")
                                      } 
                                      {mh.allergies.others_detail && ` (Others: ${mh.allergies.others_detail})`}
                                    </td>
                                  </tr>
                                )}
                                <tr>
                                  <td className="p-2 border-r border-slate-800">9. Bleeding Time</td>
                                  <td className={`p-2 font-bold text-center uppercase ${mh.bleeding_time ? 'text-red-700' : ''}`}>{mh.bleeding_time || "No"}</td>
                                </tr>
                                <tr>
                                  <td className="p-2 border-r border-slate-800 font-bold uppercase" colSpan={2}>10. For WOMEN Only:</td>
                                </tr>
                                <tr>
                                  <td className="p-2 pl-6 border-r border-slate-800 text-xs">- Are you pregnant?</td>
                                  <td className="p-2 text-xs font-bold text-center uppercase">{mh.q_pregnant ? "Yes" : "No"}</td>
                                </tr>
                                <tr>
                                  <td className="p-2 pl-6 border-r border-slate-800 text-xs">- Are you nursing?</td>
                                  <td className="p-2 text-xs font-bold text-center uppercase">{mh.q_nursing ? "Yes" : "No"}</td>
                                </tr>
                                <tr>
                                  <td className="p-2 pl-6 border-r border-slate-800 text-xs">- Are you taking birth control pills?</td>
                                  <td className="p-2 text-xs font-bold text-center uppercase">{mh.q_birth_control ? "Yes" : "No"}</td>
                                </tr>

                                <tr className="bg-slate-100 border-t-2 border-slate-800">
                                  <td colSpan={2} className="p-3">
                                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Declared Underlying Conditions & Symptoms</p>
                                    {(() => {
                                      const conds = Array.isArray(mh.underlying_conditions) 
                                        ? mh.underlying_conditions 
                                        : Object.keys(mh.underlying_conditions || {}).filter(k => k !== "others_detail" && mh.underlying_conditions[k]);
                                      const othersDetail = mh.underlying_conditions?.others_detail;
                                      
                                      if (conds.length > 0 || othersDetail) {
                                        return (
                                          <p className="text-sm font-semibold uppercase text-red-700">
                                            {conds.join(", ")}
                                            {othersDetail ? (conds.length > 0 ? `, Others: ${othersDetail}` : `Others: ${othersDetail}`) : ""}
                                          </p>
                                        );
                                      }
                                      return <p className="text-sm font-mono text-slate-500">NIL</p>;
                                    })()}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="border border-slate-300 p-8 text-center text-slate-400 font-mono text-sm uppercase tracking-widest">
                        [ NO CLINICAL HISTORY ON FILE ]
                      </div>
                    )}
                  </div>

                  {/* Section 3: Financial Ledger */}
                  <div>
                    <h2 className="bg-slate-800 text-white uppercase tracking-widest text-xs font-bold py-1.5 px-3 mb-2">3. Financial Ledger & Invoices</h2>
                    {patientInvoices.length > 0 ? (
                      <table className="w-full text-sm border border-slate-800">
                        <thead className="bg-slate-100 border-b border-slate-800">
                          <tr>
                            <th className="p-2 text-left border-r border-slate-800 text-[10px] uppercase tracking-wider font-bold">Date Issued</th>
                            <th className="p-2 text-left border-r border-slate-800 text-[10px] uppercase tracking-wider font-bold">Procedure / Description</th>
                            <th className="p-2 text-right border-r border-slate-800 text-[10px] uppercase tracking-wider font-bold">Amount Due</th>
                            <th className="p-2 text-center text-[10px] uppercase tracking-wider font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {patientInvoices.map(inv => (
                            <tr key={inv.id}>
                              <td className="p-2 border-r border-slate-800 font-mono text-xs">{new Date(inv.created_at).toLocaleDateString()}</td>
                              <td className="p-2 border-r border-slate-800 uppercase text-xs">{inv.procedure_name}</td>
                              <td className="p-2 border-r border-slate-800 text-right font-mono font-bold">₱{inv.amount_due?.toLocaleString()}</td>
                              <td className="p-2 text-center uppercase text-[10px] font-bold">
                                {inv.status === 'paid' ? 'PAID' : inv.status === 'pending_verification' ? 'UNDER VERIFICATION' : 'PENDING'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="border border-slate-300 p-8 text-center text-slate-400 font-mono text-sm uppercase tracking-widest">
                        [ NO FINANCIAL RECORDS ]
                      </div>
                    )}
                  </div>

                  {/* Footer Signature Box */}
                  <div className="mt-16 flex justify-between items-end">
                    <div className="text-[10px] text-slate-400 uppercase font-mono w-1/3">
                      * This document is computer generated and is strictly confidential.
                    </div>
                    <div className="w-1/3 border-t border-slate-800 text-center pt-1 mt-10">
                      <p className="text-[10px] uppercase font-bold tracking-wider">Authorized Signature</p>
                    </div>
                  </div>

                </div>
              )}
            </div>
            
          </DialogContent>
        </Dialog>
      )}

      {/* Activate Portal Dialog */}
      <Dialog open={isActivateModalOpen} onOpenChange={setIsActivateModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <div className="h-10 w-10 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mb-2">
              <KeyRound className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Activate Online Portal Account
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create web portal credentials for <strong className="text-slate-800">{selectedPatient?.first_name} {selectedPatient?.last_name}</strong>. They will be able to log in to view charts, appointment history, and bills.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleActivatePortal} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Patient Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  placeholder="patient@example.com"
                  value={portalEmail}
                  onChange={(e) => setPortalEmail(e.target.value)}
                  required
                  className="pl-9 text-sm rounded-xl"
                />
              </div>
              <p className="text-[11px] text-slate-400">Login instructions and a temporary password will be sent to this email.</p>
            </div>

            <DialogFooter className="pt-3 flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsActivateModalOpen(false)} className="rounded-xl h-10 text-xs font-bold">
                Cancel
              </Button>
              <Button type="submit" disabled={isActivating} className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-10 text-xs font-bold px-4">
                {isActivating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
                Activate Portal Login
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
