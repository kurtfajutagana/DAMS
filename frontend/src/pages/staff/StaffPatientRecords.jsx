import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import { Search, Loader2, Printer, Phone } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";

export default function StaffPatientRecords() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [fullRecord, setFullRecord] = useState(null);
  const [patientInvoices, setPatientInvoices] = useState([]);
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
    setPatientInvoices([]);
    try {
      // Fetch full clinical record
      const res = await fetch(`http://localhost:8000/api/staff/patients/${patient.id}/full-record`);
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

  const filteredPatients = patients.filter(p => {
    const full = `${p.first_name} ${p.last_name}`.toLowerCase();
    return full.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Patient Directory</h1>
          <p className="text-slate-500 mt-1">Search and view comprehensive profiles of all registered patients.</p>
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
                              <p className="text-[10px] text-slate-500 font-mono">ID: {patient.id.substring(0,8).toUpperCase()}</p>
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
                            View Full Profile
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
              <span className="text-sm font-semibold text-slate-600">Patient Record Preview</span>
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
    </div>
  );
}
