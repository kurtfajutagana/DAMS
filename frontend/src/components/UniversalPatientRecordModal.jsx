import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { supabase } from "../lib/supabase";
import InteractiveDentalChart from "./InteractiveDentalChart";
import { User, Activity, FileText, Stethoscope, Clock, ShieldAlert, CheckCircle2, Loader2, HeartPulse, X } from "lucide-react";
import { formatPhoneDisplay } from "../lib/validation";

export default function UniversalPatientRecordModal({ isOpen, onClose, patientId, patientName }) {
  const [activeTab, setActiveTab] = useState("chart");
  const [loading, setLoading] = useState(true);
  const [recordData, setRecordData] = useState(null);
  const [dentalChartData, setDentalChartData] = useState({ teeth: {}, screening: {} });

  useEffect(() => {
    if (!isOpen || !patientId) return;

    let ignore = false;
    const fetchFullRecord = async () => {
      setLoading(true);
      try {
        let data = null;

        // Try backend API first
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/staff/patients/${patientId}/full-record`);
          if (res.ok) {
            data = await res.json();
          }
        } catch (err) {
          console.warn("Backend full-record fetch warning:", err);
        }

        // Direct Supabase fallback
        if (!data || !data.profile) {
          const [pRes, mhRes, tcRes, trRes, appRes] = await Promise.all([
            supabase.from("profiles").select("*").eq("id", patientId).maybeSingle(),
            supabase.from("medical_histories").select("*").eq("patient_id", patientId).maybeSingle(),
            supabase.from("tooth_conditions").select("*").eq("patient_id", patientId),
            supabase.from("treatments").select("*, dentist:profiles!dentist_id(first_name, last_name), treatment_steps(*)").eq("patient_id", patientId).order("created_at", { ascending: false }),
            supabase.from("appointments").select("*, dentist:profiles!dentist_id(first_name, last_name)").eq("patient_id", patientId).order("created_at", { ascending: false })
          ]);

          data = {
            profile: pRes.data || {},
            medical_history: mhRes.data || {},
            tooth_conditions: tcRes.data || [],
            treatments: trRes.data || [],
            appointments: appRes.data || []
          };
        }

        if (ignore) return;
        setRecordData(data);

        // Map tooth conditions for the odontogram
        const teethMap = {};
        (data.tooth_conditions || []).forEach(tc => {
          teethMap[tc.tooth_number] = tc.status;
        });
        setDentalChartData({ teeth: teethMap, screening: {} });

      } catch (e) {
        console.error("Error loading patient record:", e);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchFullRecord();

    return () => {
      ignore = true;
    };
  }, [isOpen, patientId]);

  if (!isOpen) return null;

  const profile = recordData?.profile || {};
  const mh = recordData?.medical_history || {};
  const treatments = recordData?.treatments || [];
  const appointments = recordData?.appointments || [];

  const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || patientName || "Patient";
  const formattedDob = profile.date_of_birth
    ? new Date(profile.date_of_birth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : "N/A";
  const calculatedAge = profile.date_of_birth
    ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
    : "N/A";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] overflow-hidden flex flex-col bg-slate-50 p-0 border-0 shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="px-6 py-4 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-extrabold text-sm shadow-sm">
                {profile.first_name ? profile.first_name[0] : "P"}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-950">
                  {fullName}
                  {profile.is_email_verified && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                      Portal Active
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  ID: <span className="font-mono text-slate-700 font-semibold">{patientId?.slice(0, 8).toUpperCase()}</span> • DOB: {formattedDob} ({calculatedAge} yrs) • Phone: {formatPhoneDisplay(profile.contact_number || "N/A")}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
              <p className="text-sm font-semibold">Loading comprehensive clinical record...</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-full">
              <TabsList className="mb-6 w-full justify-start border-b border-slate-200 rounded-none pb-px h-auto bg-transparent p-0 space-x-6">
                <TabsTrigger value="chart" className="data-[state=active]:border-b-2 data-[state=active]:border-slate-950 rounded-none shadow-none py-2.5 px-2 bg-transparent text-xs font-bold uppercase tracking-wider text-slate-600 data-[state=active]:text-slate-950 flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-blue-600" /> Interactive Dental Chart
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:border-b-2 data-[state=active]:border-slate-950 rounded-none shadow-none py-2.5 px-2 bg-transparent text-xs font-bold uppercase tracking-wider text-slate-600 data-[state=active]:text-slate-950 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-600" /> Treatment History & Procedures
                </TabsTrigger>
                <TabsTrigger value="intake" className="data-[state=active]:border-b-2 data-[state=active]:border-slate-950 rounded-none shadow-none py-2.5 px-2 bg-transparent text-xs font-bold uppercase tracking-wider text-slate-600 data-[state=active]:text-slate-950 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" /> Medical Questionnaire & Intake
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: DENTAL CHART */}
              <TabsContent value="chart" className="mt-0 flex-1 outline-none">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col items-center">
                  <div className="w-full flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Patient Dental Odontogram</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Current tooth condition mapping from clinical treatment logs and initial assessment.</p>
                    </div>
                  </div>
                  <div className="w-full max-w-4xl py-2">
                    <InteractiveDentalChart
                      initialTeeth={dentalChartData.teeth}
                      initialScreening={dentalChartData.screening}
                      readOnly={true}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: TREATMENT HISTORY */}
              <TabsContent value="history" className="mt-0 flex-1 outline-none space-y-4">
                <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-600" /> Clinical Procedure Log
                    </h3>
                    <Badge variant="outline" className="text-xs font-bold font-mono">
                      {treatments.length} Completed / In-Progress Records
                    </Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase">
                        <tr>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Procedure</th>
                          <th className="py-3 px-4">Attending Doctor</th>
                          <th className="py-3 px-4">Clinical Notes</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {treatments.length === 0 && appointments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-slate-400 italic">
                              No clinical treatment sessions recorded yet.
                            </td>
                          </tr>
                        ) : (
                          treatments.map((t, idx) => (
                            <tr key={t.id || idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                                {new Date(t.treatment_date || t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-950">
                                {t.procedure_name || "Dental Treatment"}
                              </td>
                              <td className="py-3 px-4 text-slate-800">
                                {t.dentist ? `Dr. ${t.dentist.first_name} ${t.dentist.last_name}` : "Assigned Dentist"}
                              </td>
                              <td className="py-3 px-4 text-slate-600 max-w-md">
                                {t.clinical_notes || "Procedure executed per standard clinical protocol."}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold uppercase">
                                  Completed
                                </Badge>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </TabsContent>

              {/* TAB 3: INTAKE & MEDICAL QUESTIONNAIRE */}
              <TabsContent value="intake" className="mt-0 flex-1 outline-none space-y-6">
                {/* Contact & Personal Information */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                    Patient Demographics & Contact
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-semibold">Full Name</span>
                      <span className="font-bold text-slate-900 text-sm">{fullName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Date of Birth</span>
                      <span className="font-bold text-slate-900">{formattedDob} ({calculatedAge} yrs)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Gender</span>
                      <span className="font-bold text-slate-900 capitalize">{profile.gender || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Contact Number</span>
                      <span className="font-bold text-slate-900 font-mono">{formatPhoneDisplay(profile.contact_number || "N/A")}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Home Address</span>
                      <span className="font-bold text-slate-900">{profile.address || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Account Type</span>
                      <span className="font-bold text-slate-900">{profile.is_email_verified ? "Online Portal Account" : "In-Clinic Walk-In Record"}</span>
                    </div>
                  </div>
                </div>

                {/* Medical History & Allergies */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>Clinical Health Questionnaire</span>
                    {mh.q_allergic && (
                      <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] font-bold">
                        ⚠️ High Allergy Alert
                      </Badge>
                    )}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-slate-600">Good general health:</span>
                      <span className="font-bold text-slate-900">{mh.q_good_health ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-slate-600">Under medical treatment:</span>
                      <span className="font-bold text-slate-900">{mh.q_medical_treatment ? `Yes (${mh.q_medical_treatment_details || 'Specified'})` : "No"}</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-slate-600">Past surgical operation:</span>
                      <span className="font-bold text-slate-900">{mh.q_surgical_operation ? `Yes (${mh.q_surgical_operation_details || 'Specified'})` : "No"}</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-slate-600">Taking prescription meds:</span>
                      <span className="font-bold text-slate-900">{mh.q_medication ? `Yes (${mh.q_medication_details || 'Specified'})` : "No"}</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-slate-600">Known Drug/Latex Allergies:</span>
                      <span className={`font-bold ${mh.q_allergic ? 'text-red-600' : 'text-slate-900'}`}>
                        {mh.q_allergic ? "YES (Allergies Logged)" : "No Known Allergies"}
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-slate-600">Bleeding time / clotting issues:</span>
                      <span className="font-bold text-slate-900">{mh.bleeding_time || "Normal"}</span>
                    </div>
                  </div>

                  {mh.allergies && Object.keys(mh.allergies).length > 0 && (
                    <div className="p-3 bg-red-50/60 border border-red-200 rounded-xl space-y-1.5 text-xs">
                      <span className="font-bold text-red-900 uppercase tracking-wide text-[11px] block">
                        Documented Allergies:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(mh.allergies).filter(([k, v]) => v && k !== "others_detail").map(([allergy]) => (
                          <span key={allergy} className="bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 rounded font-bold text-[11px]">
                            {allergy}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 shrink-0 flex justify-end">
          <Button onClick={onClose} variant="outline" className="text-xs font-semibold border-slate-300">
            Close Record Viewer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
