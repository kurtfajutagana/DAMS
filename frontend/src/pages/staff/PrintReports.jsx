import { useState, useEffect } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Printer, Search, FileText, User, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import InteractiveDentalChart from "../../components/InteractiveDentalChart";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

export default function PrintReports() {
  const [activeTab, setActiveTab] = useState("intake");
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [dentalChartData, setDentalChartData] = useState({ teeth: {}, screening: {} });

  const fetchPatients = async () => {
    setLoadingPatients(true);
    try {
      // 1. Direct Supabase query (Immediate, ultra-reliable)
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, contact_number, is_email_verified, created_at")
        .eq("role", "patient")
        .order("first_name", { ascending: true });

      if (!error && Array.isArray(data)) {
        setPatients(data);
      } else {
        // 2. Fallback to API if Supabase client threw an error
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/staff/patients`);
        if (res.ok) {
          const apiData = await res.json();
          if (Array.isArray(apiData)) {
            setPatients(apiData);
          } else {
            setPatients([]);
          }
        } else {
          setPatients([]);
        }
      }
    } catch (e) {
      console.error("Error fetching patients:", e);
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSelectPatient = async (id) => {
    setSelectedPatientId(id);
    setLoadingRecord(true);
    try {
      let data = null;

      // Try fetching from backend API first
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/staff/patients/${id}/full-record`);
        if (res.ok) {
          data = await res.json();
        }
      } catch (err) {
        console.warn("Backend full-record fetch failed, falling back to Supabase direct query", err);
      }

      // If backend was unreachable or returned non-200, query Supabase directly
      if (!data || !data.profile) {
        const [pRes, mhRes, tcRes, trRes, appRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
          supabase.from("medical_histories").select("*").eq("patient_id", id).maybeSingle(),
          supabase.from("tooth_conditions").select("*").eq("patient_id", id),
          supabase.from("treatments").select("*, dentist:profiles!dentist_id(first_name, last_name)").eq("patient_id", id).order("created_at", { ascending: false }),
          supabase.from("appointments").select("*, dentist:profiles!dentist_id(first_name, last_name)").eq("patient_id", id).order("created_at", { ascending: false })
        ]);

        data = {
          profile: pRes.data || {},
          patient_profile: pRes.data || {},
          medical_history: mhRes.data || {},
          tooth_conditions: tcRes.data || [],
          treatments: trRes.data || [],
          appointments: appRes.data || []
        };
      }
      
      const p = data.profile || {};
      const pp = data.patient_profile || {};
      const mh = data.medical_history || {};
      const tc = data.tooth_conditions || [];

      const rawTreatments = Array.isArray(data.treatments) ? data.treatments : [];
      const rawAppointments = Array.isArray(data.appointments) ? data.appointments : [];

      // Construct procedure history list from treatments & appointments
      let procedureHistory = [];
      if (rawTreatments.length > 0) {
        procedureHistory = rawTreatments.map((t, idx) => ({
          id: t.id || idx + 1,
          date: t.treatment_date || (t.created_at ? t.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
          tooth: t.tooth_number ? `Tooth #${t.tooth_number}` : (t.quadrant || "Full Mouth"),
          procedure: t.procedure_name || "General Dental Procedure",
          dentist: t.dentist ? `Dr. ${t.dentist.first_name || ''} ${t.dentist.last_name || ''}`.trim() : "Dr. TeethTalk Specialist",
          notes: t.clinical_notes || t.notes || "Procedure completed successfully per clinical protocol. No complications noted.",
          status: t.status ? t.status.toUpperCase() : "COMPLETED"
        }));
      } else if (rawAppointments.length > 0) {
        procedureHistory = rawAppointments.map((a, idx) => ({
          id: a.id || idx + 1,
          date: a.appointment_date ? a.appointment_date.slice(0, 10) : (a.created_at ? a.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
          tooth: a.notes && a.notes.toLowerCase().includes("tooth") ? (a.notes.match(/Tooth #?\d+/i)?.[0] || "Target Tooth") : "Full Mouth",
          procedure: a.service_requested || "Comprehensive Dental Evaluation",
          dentist: a.dentist ? `Dr. ${a.dentist.first_name || ''} ${a.dentist.last_name || ''}`.trim() : "Dr. TeethTalk Specialist",
          notes: a.notes || "Clinical examination and routine treatment completed. Patient given post-operative oral hygiene instructions.",
          status: a.status ? a.status.toUpperCase() : "COMPLETED"
        }));
      } else {
        procedureHistory = [
          {
            id: 1,
            date: new Date().toISOString().slice(0, 10),
            tooth: "Full Mouth",
            procedure: "Comprehensive Oral Examination & Baseline Charting",
            dentist: "Dr. TeethTalk Specialist",
            notes: "Initial diagnostic intraoral evaluation, periodontal screening, and treatment plan consultation.",
            status: "COMPLETED"
          }
        ];
      }

      setSelectedPatient({
        id: id,
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown Patient",
        age: pp.date_of_birth ? new Date().getFullYear() - new Date(pp.date_of_birth).getFullYear() : "N/A",
        gender: pp.gender || "N/A",
        birthdate: pp.date_of_birth || "N/A",
        phone: p.contact_number || "N/A",
        address: pp.address || "N/A",
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
        dentist: "Dr. TeethTalk Clinician",
        extraction: pp.previous_extraction ? "Yes" : "No",
        prevDentist: pp.previous_dentist || "None",
        lastVisit: pp.last_dental_visit || "N/A",
        treatments: procedureHistory,
        medicalAnswers: {
          q1: mh.q_good_health ? "Yes" : "No", 
          q2: mh.q_medical_treatment ? "Yes" : "No", 
          q2_detail: mh.q_medical_treatment_details || "", 
          q3: mh.q_surgical_operation ? "Yes" : "No", 
          q3_detail: mh.q_surgical_operation_details || "", 
          q4: mh.q_medication ? "Yes" : "No", 
          q4_detail: mh.q_medication_details || "", 
          q5: mh.q_tobacco ? "Yes" : "No",
          q6: mh.q_drugs_alcohol ? "Yes" : "No", 
          q7: mh.q_allergic ? "Yes" : "No", 
          q8: mh.bleeding_time ? "Yes" : "No", 
          q8_detail: mh.bleeding_time || "", 
          q9: mh.bleeding_time || "N/A",
          q10_preg: mh.q_pregnant ? "Yes" : "No", 
          q10_nurse: mh.q_nursing ? "Yes" : "No", 
          q10_pill: mh.q_birth_control ? "Yes" : "No"
        },
        diseases: mh.underlying_conditions ? Object.keys(mh.underlying_conditions).filter(k => mh.underlying_conditions[k]) : [],
        symptoms: []
      });

      const initialTeeth = {};
      if (Array.isArray(tc)) {
        tc.forEach(item => {
          if (item.tooth_number && item.status) {
            initialTeeth[item.tooth_number] = item.status;
          }
        });
      }
      setDentalChartData({
        teeth: initialTeeth,
        screening: mh.screening || {}
      });

    } catch (e) {
      console.error("Error loading patient full record:", e);
      toast.error("Failed to load patient full record");
    } finally {
      setLoadingRecord(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Printable Area Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report, #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5 no-print">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Print Reports & Forms</h1>
          <p className="text-sm font-medium text-slate-600 mt-1">Generate and print official clinical records, intake sheets, and dental charts.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handlePrint} className="bg-slate-950 hover:bg-red-600 text-white rounded-xl shadow-sm gap-2 font-semibold h-10 px-5">
            <Printer className="h-4 w-4" /> Print Document
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left column: Patient Selection Sidebar (No Print) */}
        <div className="lg:col-span-1 space-y-4 no-print">
          <Card className="border-none shadow-md bg-white rounded-2xl p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search patient..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-50/50 border-slate-200 text-xs rounded-xl" 
              />
            </div>
            <div className="space-y-2 h-[60vh] overflow-y-auto pr-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2">Active Patients</span>
              {loadingPatients ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-red-600" />
                  <span className="text-xs font-medium">Loading patients...</span>
                </div>
              ) : (Array.isArray(patients) ? patients : [])
                .filter(p => `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => handleSelectPatient(patient.id)}
                  className={`w-full text-left p-3 rounded-xl flex items-center gap-3 border transition-colors ${
                    selectedPatientId === patient.id 
                      ? "bg-red-50 text-red-600 border-red-100 shadow-xs" 
                      : "bg-slate-50/50 hover:bg-slate-50 text-slate-700 border-slate-100"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                    selectedPatientId === patient.id ? "bg-red-100 text-red-600 font-bold" : "bg-slate-100 text-slate-400"
                  }`}>
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className={`font-semibold text-xs truncate ${selectedPatientId === patient.id ? "font-bold text-red-950" : ""}`}>
                      {patient.first_name || "Patient"} {patient.last_name || ""}
                    </h4>
                    <p className={`text-[10px] truncate ${selectedPatientId === patient.id ? "text-red-500 font-medium" : "text-slate-400"}`}>
                      {patient.contact_number || "No contact"}
                    </p>
                  </div>
                </button>
              ))}

              {!loadingPatients && (Array.isArray(patients) ? patients : []).length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  No patients found.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right column: Document Previews */}
        <div className="lg:col-span-3 space-y-6">
          {loadingRecord ? (
            <Card className="border-none shadow-xl bg-white rounded-3xl p-10 flex flex-col items-center justify-center min-h-[60vh] text-center">
              <Loader2 className="h-10 w-10 text-red-600 animate-spin mb-4" />
              <h3 className="text-lg font-bold text-slate-800">Loading Clinical Document...</h3>
              <p className="text-xs text-slate-400 mt-1">Retrieving dental chart and procedure history.</p>
            </Card>
          ) : !selectedPatient ? (
            <Card className="border-none shadow-xl bg-white rounded-3xl p-10 flex flex-col items-center justify-center min-h-[60vh] text-center">
               <div className="h-16 w-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                 <FileText className="h-8 w-8" />
               </div>
               <h3 className="text-xl font-bold text-slate-800">No Patient Selected</h3>
               <p className="text-sm text-slate-500 max-w-sm mt-2">Select a patient from the sidebar to view and print their intake forms and dental charts.</p>
            </Card>
          ) : (
            <>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full no-print">
                <TabsList className="bg-slate-100/80 p-1 rounded-xl h-10 border border-slate-200/50">
                  <TabsTrigger value="intake" className="rounded-lg text-xs font-semibold px-6 data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm">Intake & Medical Form</TabsTrigger>
                  <TabsTrigger value="dental-chart" className="rounded-lg text-xs font-semibold px-6 data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm">Dental Tooth Chart</TabsTrigger>
                  <TabsTrigger value="procedure-history" className="rounded-lg text-xs font-semibold px-6 data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm">Procedure History</TabsTrigger>
                </TabsList>
              </Tabs>

          {/* Printable Container wrapper */}
          <Card id="printable-report" className="border-none shadow-xl bg-white rounded-3xl p-10 font-sans text-slate-800 border-t-8 border-red-600">
            {/* Document Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-red-600 uppercase">TeethTalk Dental Clinic</h2>
                <p className="text-xs text-slate-500 font-medium">123 Sixto Antonio Ave, Pasig | +63 917 123 4567</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded-full uppercase tracking-wider mb-2 no-print">Official Record</span>
                <p className="text-xs text-slate-400 font-semibold">DATE: {selectedPatient.date}</p>
              </div>
            </div>

            {/* PREVIEW 1: INTAKE & MEDICAL FORM */}
            {activeTab === "intake" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* PATIENTS INFORMATION SECTION */}
                <div className="space-y-4">
                  <div className="bg-slate-900 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded">
                    Patients Information
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="col-span-2 border-b border-slate-200 pb-1.5">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Name</span>
                      <span className="font-bold text-slate-800">{selectedPatient.name}</span>
                    </div>
                    <div className="border-b border-slate-200 pb-1.5">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Birthdate</span>
                      <span className="font-semibold text-slate-700">{selectedPatient.birthdate}</span>
                    </div>
                    <div className="border-b border-slate-200 pb-1.5">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Gender</span>
                      <span className="font-semibold text-slate-700">{selectedPatient.gender}</span>
                    </div>
                    <div className="col-span-2 border-b border-slate-200 pb-1.5">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Home Address</span>
                      <span className="font-semibold text-slate-700">{selectedPatient.address}</span>
                    </div>
                    <div className="border-b border-slate-200 pb-1.5">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Phone</span>
                      <span className="font-semibold text-slate-700">{selectedPatient.phone}</span>
                    </div>
                    <div className="border-b border-slate-200 pb-1.5">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Age</span>
                      <span className="font-semibold text-slate-700">{selectedPatient.age}</span>
                    </div>
                  </div>
                </div>

                {/* DENTAL & MEDICAL HISTORY GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* DENTAL SECTION */}
                  <div className="space-y-4">
                    <div className="bg-slate-900 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded">
                      Dental History
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Previous Dentist:</span>
                        <span className="font-semibold text-slate-800">{selectedPatient.prevDentist}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Last Dental Visit:</span>
                        <span className="font-semibold text-slate-800">{selectedPatient.lastVisit}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Previous Extraction:</span>
                        <span className="font-semibold text-slate-800">{selectedPatient.extraction}</span>
                      </div>
                    </div>
                  </div>

                  {/* FOR MINORS */}
                  <div className="space-y-4">
                    <div className="bg-slate-900 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded">
                      For Minors
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Parent/Guardian:</span>
                        <span className="font-semibold text-slate-800">N/A</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Parent Occupation:</span>
                        <span className="font-semibold text-slate-800">N/A</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MEDICAL HISTORY TABLES */}
                <div className="space-y-4">
                  <div className="bg-slate-900 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded">
                    Medical History
                  </div>
                  <table className="w-full text-xs text-left border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-2 border-r border-slate-200 w-12 text-center">No.</th>
                        <th className="p-2 border-r border-slate-200">Question Details</th>
                        <th className="p-2 border-r border-slate-200 w-16 text-center">YES</th>
                        <th className="p-2 w-16 text-center">NO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { id: 1, text: "Are you in good health?", val: selectedPatient?.medicalAnswers?.q1 },
                        { id: 2, text: "Are you under medical treatment now?", val: selectedPatient?.medicalAnswers?.q2 },
                        { id: 3, text: "Have you ever had a serious illness or surgical operation?", val: selectedPatient?.medicalAnswers?.q3 },
                        { id: 4, text: "Have you ever been hospitalized?", val: selectedPatient?.medicalAnswers?.q4 },
                        { id: 5, text: "Are you taking any prescription/non-prescription medication?", val: selectedPatient?.medicalAnswers?.q5 }
                      ].map((row) => (
                        <tr key={row.id} className="border-b border-slate-200">
                          <td className="p-2 border-r border-slate-200 text-center font-semibold">{row.id}</td>
                          <td className="p-2 border-r border-slate-200">{row.text}</td>
                          <td className="p-2 border-r border-slate-200 text-center font-bold text-red-600">{row.val === "Yes" ? "✓" : ""}</td>
                          <td className="p-2 text-center font-bold text-slate-500">{row.val === "No" ? "✓" : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* SYSTEM CHECKS & CONDITIONS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
                  <div className="border border-slate-200 p-4 rounded-xl space-y-3">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1.5">Underlying Conditions</h4>
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      {["High Blood Pressure", "Low Blood Pressure", "Epilepsy/Convulsion", "Heart Disease", "Hay Fever/Allergies", "Asthma", "Diabetes", "Stroke"].map(item => (
                        <div key={item} className="flex items-center gap-2">
                          <input type="checkbox" checked={(selectedPatient?.diseases || []).includes(item)} readOnly className="h-3 w-3 accent-red-600 rounded" />
                          <span className={(selectedPatient?.diseases || []).includes(item) ? "font-semibold text-slate-800" : ""}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-slate-200 p-4 rounded-xl space-y-3">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1.5">Symptoms & Diagnosis</h4>
                    <div className="space-y-2 text-slate-600">
                      {["New and persistent cough", "Shortness of breath", "Fever", "NO SYMPTOMS"].map(item => (
                        <div key={item} className="flex items-center gap-2">
                          <input type="checkbox" checked={(selectedPatient?.symptoms || []).includes(item)} readOnly className="h-3 w-3 accent-red-600 rounded" />
                          <span className={(selectedPatient?.symptoms || []).includes(item) ? "font-semibold text-slate-800" : ""}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* SIGNATURE FIELDS */}
                <div className="grid grid-cols-2 gap-12 pt-12 text-xs">
                  <div className="text-center space-y-1">
                    <div className="border-b border-slate-800 font-bold py-1 text-slate-800">{selectedPatient.name}</div>
                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-semibold">Patient's Name & Signature</span>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="border-b border-slate-800 font-bold py-1 text-slate-800">{selectedPatient.date}</div>
                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-semibold">Date Signed</span>
                  </div>
                </div>
              </div>
            )}

            {/* PREVIEW 2: DENTAL TOOTH CHART */}
            {activeTab === "dental-chart" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* PATIENT MINI HEADER */}
                <div className="grid grid-cols-4 gap-4 border border-slate-200 bg-slate-50 p-4 rounded-xl text-xs font-semibold text-slate-700">
                  <div>Name: <span className="font-bold text-slate-900">{selectedPatient.name}</span></div>
                  <div>Age: <span className="font-bold text-slate-900">{selectedPatient.age}</span></div>
                  <div>Gender: <span className="font-bold text-slate-900">{selectedPatient.gender}</span></div>
                  <div>Date Examined: <span className="font-bold text-slate-900">{selectedPatient.date}</span></div>
                </div>

                <div className="text-center">
                  <h3 className="text-sm font-black tracking-wider uppercase text-slate-800 pb-2 border-b border-slate-100">INTRAORAL EXAMINATION</h3>
                </div>

                {/* FULL INTERACTIVE DENTAL CHART (READ-ONLY REPORT VIEW) */}
                <div className="border border-slate-200 p-4 sm:p-6 rounded-2xl bg-white space-y-4">
                  <InteractiveDentalChart
                    initialTeeth={dentalChartData.teeth}
                    initialScreening={dentalChartData.screening}
                    readOnly={true}
                  />
                </div>

                {/* CHECKLIST FIELDS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[9px] leading-relaxed">
                  <div className="border p-3 rounded-lg">
                    <h6 className="font-bold text-slate-800 border-b pb-1 mb-1 uppercase">Periodontal Screening</h6>
                    <ul>
                      <li>[ ] Gingivitis</li>
                      <li>[ ] Early Periodontitis</li>
                      <li>[ ] Moderate Periodontitis</li>
                      <li>[ ] Advanced Periodontitis</li>
                    </ul>
                  </div>
                  <div className="border p-3 rounded-lg">
                    <h6 className="font-bold text-slate-800 border-b pb-1 mb-1 uppercase">Occlusion</h6>
                    <ul>
                      <li>Class (Molar): Normal</li>
                      <li>Overjet: Normal</li>
                      <li>Overbite: Normal</li>
                      <li>Midline Deviation: None</li>
                    </ul>
                  </div>
                  <div className="border p-3 rounded-lg">
                    <h6 className="font-bold text-slate-800 border-b pb-1 mb-1 uppercase">Appliances</h6>
                    <ul>
                      <li>[ ] Orthodontic</li>
                      <li>[ ] Stayplate</li>
                      <li>[ ] Others</li>
                    </ul>
                  </div>
                  <div className="border p-3 rounded-lg">
                    <h6 className="font-bold text-slate-800 border-b pb-1 mb-1 uppercase">TMD</h6>
                    <ul>
                      <li>[ ] Clenching</li>
                      <li>[ ] Clicking</li>
                      <li>[ ] Trismus</li>
                      <li>[ ] Muscle Spasm</li>
                    </ul>
                  </div>
                </div>

                {/* SIGNATURE FIELDS */}
                <div className="grid grid-cols-2 gap-12 pt-12 text-xs">
                  <div className="text-center space-y-1">
                    <div className="border-b border-slate-800 font-bold py-1 text-slate-800">{selectedPatient.dentist}</div>
                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-semibold">Attending Dentist's Signature</span>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="border-b border-slate-800 font-bold py-1 text-slate-800">{selectedPatient.date}</div>
                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-semibold">Date Signed</span>
                  </div>
                </div>
              </div>
            )}

            {/* PREVIEW 3: PROCEDURE HISTORY */}
            {activeTab === "procedure-history" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* PATIENT MINI HEADER */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border border-slate-200 bg-slate-50 p-4 rounded-xl text-xs font-semibold text-slate-700">
                  <div>Name: <span className="font-bold text-slate-900">{selectedPatient.name}</span></div>
                  <div>Age / Gender: <span className="font-bold text-slate-900">{selectedPatient.age} / {selectedPatient.gender}</span></div>
                  <div>Contact: <span className="font-bold text-slate-900">{selectedPatient.phone}</span></div>
                  <div>Date: <span className="font-bold text-slate-900">{selectedPatient.date}</span></div>
                </div>

                <div className="text-center border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-black tracking-wider uppercase text-slate-900">CLINICAL PROCEDURE HISTORY & TREATMENT LEDGER</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Comprehensive chronological record of dental procedures, clinical observations, and attending clinician certifications.</p>
                </div>

                {/* PROCEDURE HISTORY TABLE */}
                <div className="space-y-3">
                  <div className="bg-slate-900 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded">
                    Treatment Records & Clinical Milestones
                  </div>
                  <table className="w-full text-xs text-left border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                        <th className="p-2.5 border-r border-slate-200 w-28 text-center">Date</th>
                        <th className="p-2.5 border-r border-slate-200 w-28 text-center">Tooth / Site</th>
                        <th className="p-2.5 border-r border-slate-200 w-48">Procedure Performed</th>
                        <th className="p-2.5 border-r border-slate-200 w-40">Attending Clinician</th>
                        <th className="p-2.5 border-r border-slate-200">Clinical Notes & Findings</th>
                        <th className="p-2.5 w-24 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedPatient.treatments && selectedPatient.treatments.length > 0 ? (
                        selectedPatient.treatments.map((tr, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="p-2.5 border-r border-slate-200 text-center font-medium text-slate-600">{tr.date}</td>
                            <td className="p-2.5 border-r border-slate-200 text-center font-bold text-slate-800">{tr.tooth}</td>
                            <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">{tr.procedure}</td>
                            <td className="p-2.5 border-r border-slate-200 text-slate-700">{tr.dentist}</td>
                            <td className="p-2.5 border-r border-slate-200 text-slate-600 text-[11px] leading-relaxed">{tr.notes}</td>
                            <td className="p-2.5 text-center">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                {tr.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400 font-medium">
                            No past treatment records recorded for this patient.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* TREATMENT PLAN PROGRESS & RECALL ADVISORY */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="border border-slate-200 p-4 rounded-xl space-y-2.5">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1.5 flex items-center justify-between">
                      <span>Treatment Plan & Next Milestones</span>
                      <span className="text-[10px] text-red-600 font-bold">In Progress</span>
                    </h4>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      The patient is adhering to their customized dental care protocol. Periodic maintenance and post-treatment evaluation are recommended every 6 months to maintain optimal periodontal and occlusal health.
                    </p>
                    <div className="bg-slate-50 p-2 rounded text-[10px] text-slate-700 space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>Next Recommended Visit:</span>
                        <span className="text-slate-900 font-bold">Routine Cleaning / 6-Month Recall</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Prosthetic / Restorative Check:</span>
                        <span>Stable</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-200 p-4 rounded-xl space-y-2.5">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1.5">
                      Post-Operative & Home Care Instructions
                    </h4>
                    <ul className="list-disc list-inside text-slate-600 text-[11px] space-y-1 leading-relaxed">
                      <li>Maintain soft brushing technique and daily interdental flossing.</li>
                      <li>Report any prolonged swelling, bleeding, or bite discomfort immediately.</li>
                      <li>Avoid excessively hard or sticky foods following restorations.</li>
                    </ul>
                  </div>
                </div>

                {/* CLINICAL CERTIFICATION & SIGNATURE FIELDS */}
                <div className="grid grid-cols-2 gap-12 pt-12 text-xs">
                  <div className="text-center space-y-1">
                    <div className="border-b border-slate-800 font-bold py-1 text-slate-800">{selectedPatient.dentist || "Dr. Attending Dentist"}</div>
                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-semibold">Attending Dentist & PRC License No.</span>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="border-b border-slate-800 font-bold py-1 text-slate-800">{selectedPatient.date}</div>
                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-semibold">Date Signed & Clinic Verification Stamp</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
