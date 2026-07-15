import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Search, UserCircle, Phone, Mail, Calendar, Activity, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DentistPatientRecords() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [fullRecord, setFullRecord] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id, first_name, last_name, contact_number, created_at
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

  const handleViewProfile = async (patient) => {
    setSelectedPatient(patient);
    setLoadingRecord(true);
    setFullRecord(null);
    try {
      const res = await fetch(`http://localhost:8000/api/staff/patients/${patient.id}/full-record`);
      if (!res.ok) throw new Error("Failed to fetch full record");
      const data = await res.json();
      setFullRecord(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load full medical history.");
    } finally {
      setLoadingRecord(false);
    }
  };

  const filteredPatients = patients.filter(p => {
    const full = `${p.first_name} ${p.last_name}`.toLowerCase();
    return full.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Patient Records</h1>
          <p className="text-slate-500 mt-1">View comprehensive clinical profiles of all registered patients.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-slate-50 border-b">
          <div className="flex items-center relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search patients by name..." 
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
                    <th className="px-6 py-4 font-medium">Patient Name</th>
                    <th className="px-6 py-4 font-medium">Contact</th>
                    <th className="px-6 py-4 font-medium">Registered Date</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        No patients found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map(patient => (
                      <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                              {patient.first_name?.[0]}{patient.last_name?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{patient.first_name} {patient.last_name}</p>
                              <p className="text-xs text-slate-500">Registered Patient</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-2 text-slate-600"><Phone className="h-3 w-3" /> {patient.contact_number || "N/A"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {new Date(patient.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="outline" size="sm" onClick={() => handleViewProfile(patient)}>
                            View Profile
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

      {/* Patient Profile Modal */}
      {selectedPatient && (
        <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <UserCircle className="h-7 w-7 text-blue-600" />
                {selectedPatient.first_name} {selectedPatient.last_name}
              </DialogTitle>
              <DialogDescription>
                Full Clinical & Demographic Profile
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800 border-b pb-2">Demographics</h3>
                {loadingRecord ? (
                  <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {fullRecord?.patient_profile?.date_of_birth ? (
                      <>
                        <div className="flex justify-between"><span className="text-slate-500">Phone:</span> <span className="font-medium">{selectedPatient.contact_number || "N/A"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Date of Birth:</span> <span className="font-medium">{fullRecord.patient_profile.date_of_birth || "N/A"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Gender:</span> <span className="font-medium capitalize">{fullRecord.patient_profile.gender || "N/A"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Occupation:</span> <span className="font-medium">{fullRecord.patient_profile.occupation || "N/A"}</span></div>
                      </>
                    ) : (
                      <div className="flex justify-between"><span className="text-slate-500">Phone:</span> <span className="font-medium">{selectedPatient.contact_number || "N/A"}</span></div>
                    )}
                    <div className="flex justify-between"><span className="text-slate-500">Registered:</span> <span className="font-medium">{new Date(selectedPatient.created_at).toLocaleDateString()}</span></div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800 border-b pb-2 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-600" /> Medical History
                </h3>
                {loadingRecord ? (
                  <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
                ) : fullRecord?.medical_history && Object.keys(fullRecord.medical_history).length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {(() => {
                      const mh = fullRecord.medical_history; 
                      return (
                        <>
                        <table className="w-full text-xs text-left">
                          <tbody className="divide-y divide-slate-100">
                            <tr><td className="py-1 w-3/4">1. Good Health?</td><td className="py-1 font-semibold">{mh.q_good_health ? "Yes" : "No"}</td></tr>
                            <tr><td className="py-1">2. Medical Treatment?</td><td className="py-1 font-semibold">{mh.q_medical_treatment ? "Yes" : "No"}</td></tr>
                            {mh.q_medical_treatment_details && <tr><td colSpan={2} className="py-1 pl-4 text-slate-500">- {mh.q_medical_treatment_details}</td></tr>}
                            <tr><td className="py-1">3. Serious illness / surgery?</td><td className="py-1 font-semibold">{mh.q_surgical_operation ? "Yes" : "No"}</td></tr>
                            {mh.q_surgical_operation_details && <tr><td colSpan={2} className="py-1 pl-4 text-slate-500">- {mh.q_surgical_operation_details}</td></tr>}
                            <tr><td className="py-1">4. Hospitalized recently?</td><td className="py-1 font-semibold">{mh.q_hospitalized ? "Yes" : "No"}</td></tr>
                            {mh.q_hospitalized_details && <tr><td colSpan={2} className="py-1 pl-4 text-slate-500">- {mh.q_hospitalized_details}</td></tr>}
                            <tr><td className="py-1">5. Taking medications?</td><td className="py-1 font-semibold">{mh.q_medication ? "Yes" : "No"}</td></tr>
                            {mh.q_medication_details && <tr><td colSpan={2} className="py-1 pl-4 text-slate-500">- {mh.q_medication_details}</td></tr>}
                            <tr><td className="py-1">6. Tobacco products?</td><td className="py-1 font-semibold">{mh.q_tobacco ? "Yes" : "No"}</td></tr>
                            <tr><td className="py-1">7. Alcohol/Drugs?</td><td className="py-1 font-semibold">{mh.q_drugs_alcohol ? "Yes" : "No"}</td></tr>
                            <tr><td className="py-1">8. Allergies?</td><td className={`py-1 font-semibold ${mh.q_allergic ? 'text-red-600' : ''}`}>{mh.q_allergic ? "Yes" : "No"}</td></tr>
                            {mh.allergies && Object.keys(mh.allergies).length > 0 && (
                                <tr>
                                  <td colSpan={2} className="py-1 pl-4 text-slate-500">
                                    {Object.entries(mh.allergies).filter(([k,v])=>k!=="others_detail" && v).map(([k])=>k).join(", ")}
                                    {mh.allergies.others_detail && ` (Others: ${mh.allergies.others_detail})`}
                                  </td>
                                </tr>
                            )}
                            <tr><td className="py-1">9. Bleeding Time</td><td className={`py-1 font-semibold ${mh.bleeding_time ? 'text-red-600' : ''}`}>{mh.bleeding_time || "No"}</td></tr>
                            <tr><td colSpan={2} className="py-1 font-semibold pt-2 text-slate-600">10. For WOMEN Only:</td></tr>
                            <tr><td className="py-1 pl-4 text-slate-500">- Pregnant?</td><td className="py-1 font-semibold">{mh.q_pregnant ? "Yes" : "No"}</td></tr>
                            <tr><td className="py-1 pl-4 text-slate-500">- Nursing?</td><td className="py-1 font-semibold">{mh.q_nursing ? "Yes" : "No"}</td></tr>
                            <tr><td className="py-1 pl-4 text-slate-500">- Birth control pills?</td><td className="py-1 font-semibold">{mh.q_birth_control ? "Yes" : "No"}</td></tr>
                          </tbody>
                        </table>
                        
                        <div className="pt-3 mt-3 border-t border-slate-200">
                          <span className="text-slate-600 text-xs font-semibold block mb-1">Underlying Conditions & Symptoms:</span> 
                          {(() => {
                            const conds = Array.isArray(mh.underlying_conditions) 
                              ? mh.underlying_conditions 
                              : Object.keys(mh.underlying_conditions || {}).filter(k => k !== "others_detail" && mh.underlying_conditions[k]);
                            const othersDetail = mh.underlying_conditions?.others_detail;
                            
                            if (conds.length > 0 || othersDetail) {
                              return (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {conds.map((cond, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] rounded border border-red-100">{cond}</span>
                                  ))}
                                  {othersDetail && <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] rounded border border-red-100">Others: {othersDetail}</span>}
                                </div>
                              );
                            }
                            return <span className="text-emerald-600 font-medium text-xs">None reported</span>;
                          })()}
                        </div>
                        
                        <div className="pt-2 flex justify-between text-xs text-slate-400 mt-2 border-t border-slate-100"><span>Last Updated:</span> <span>{new Date(mh.updated_at || mh.created_at).toLocaleDateString()}</span></div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-lg text-center text-sm text-slate-500 italic">
                    No medical history on file.
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-blue-50/50 p-4 rounded-lg text-sm text-blue-800 flex items-start gap-2 border border-blue-100 mt-4">
              <Calendar className="h-5 w-5 shrink-0 text-blue-600" />
              <div>
                <p className="font-semibold">Quick Action</p>
                <p className="opacity-90">To record a new treatment, use the active Daily Queue. To prescribe medication, head to the Prescriptions tab.</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
