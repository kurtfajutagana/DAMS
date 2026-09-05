import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Search, UserCircle, Phone, Activity, Loader2, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { toast } from "sonner";

export default function DentistPatientRecords() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [fullRecord, setFullRecord] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    let isMounted = true;

    const fetchPatients = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(`
            id, first_name, last_name, contact_number, created_at
          `)
          .eq("role", "patient")
          .order("first_name", { ascending: true });

        if (error) throw error;
        if (isMounted) {
          setPatients(data || []);
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load patient records.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPatients();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleViewProfile = async (patient) => {
    setSelectedPatient(patient);
    setLoadingRecord(true);
    setFullRecord(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/staff/patients/${patient.id}/full-record`);
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

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const full = `${p.first_name || ''} ${p.last_name || ''} ${p.contact_number || ''}`.toLowerCase();
      return full.includes(searchTerm.toLowerCase());
    });
  }, [patients, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPatients.slice(start, start + pageSize);
  }, [filteredPatients, currentPage, pageSize]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-955">Patient Records</h1>
          <p className="text-slate-500 mt-1 text-sm">View comprehensive clinical profiles and medical histories of registered patients.</p>
        </div>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        
        {/* Search Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient name, phone number..."
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
                <th className="py-3.5 px-4">Patient Name</th>
                <th className="py-3.5 px-4">Contact Number</th>
                <th className="py-3.5 px-4">Registration Date</th>
                <th className="py-3.5 px-4 text-right">Clinical Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {loading && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 animate-pulse text-sm">
                    Loading patient database...
                  </td>
                </tr>
              )}
              {!loading && paginatedPatients.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 text-sm font-medium">
                    No patients found matching your search.
                  </td>
                </tr>
              )}
              {!loading && paginatedPatients.map(patient => (
                <tr key={patient.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-950 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                        {patient.first_name?.[0]}{patient.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-955 text-sm">{patient.first_name} {patient.last_name}</p>
                        <p className="text-xs text-slate-500 font-mono">ID: {patient.id.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="flex items-center gap-1.5 font-medium text-slate-700 text-sm">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {patient.contact_number || "N/A"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium text-sm">
                    {new Date(patient.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleViewProfile(patient)}
                      className="h-8 border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold text-xs px-3"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1 text-slate-600" />
                      View Profile
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredPatients.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredPatients.length)} of {filteredPatients.length} patients
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

      {/* Patient Profile Modal Inspector */}
      {selectedPatient && (
        <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
          <DialogContent className="max-w-2xl bg-white border-slate-200">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-slate-955">
                <UserCircle className="h-7 w-7 text-slate-900" />
                {selectedPatient.first_name} {selectedPatient.last_name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Full Demographic & Clinical Medical History Profile
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              
              {/* Demographics Card */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2 uppercase tracking-wider">
                  Demographic Info
                </h3>
                {loadingRecord ? (
                  <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                ) : (
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between bg-slate-50 p-2.5 rounded border border-slate-200">
                      <span className="text-slate-500 font-semibold text-xs">Phone:</span>
                      <span className="font-bold text-slate-900 text-xs">{selectedPatient.contact_number || "N/A"}</span>
                    </div>
                    <div className="flex justify-between bg-slate-50 p-2.5 rounded border border-slate-200">
                      <span className="text-slate-500 font-semibold text-xs">Date of Birth:</span>
                      <span className="font-bold text-slate-900 text-xs">{fullRecord?.patient_profile?.date_of_birth || "N/A"}</span>
                    </div>
                    <div className="flex justify-between bg-slate-50 p-2.5 rounded border border-slate-200">
                      <span className="text-slate-500 font-semibold text-xs">Gender:</span>
                      <span className="font-bold text-slate-900 text-xs capitalize">{fullRecord?.patient_profile?.gender || "N/A"}</span>
                    </div>
                    <div className="flex justify-between bg-slate-50 p-2.5 rounded border border-slate-200">
                      <span className="text-slate-500 font-semibold text-xs">Occupation:</span>
                      <span className="font-bold text-slate-900 text-xs">{fullRecord?.patient_profile?.occupation || "N/A"}</span>
                    </div>
                    <div className="flex justify-between bg-slate-50 p-2.5 rounded border border-slate-200">
                      <span className="text-slate-500 font-semibold text-xs">Registered Date:</span>
                      <span className="font-bold text-slate-900 text-xs">{new Date(selectedPatient.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Medical History Card */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-600" /> Medical History
                </h3>
                {loadingRecord ? (
                  <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                ) : fullRecord?.medical_history && Object.keys(fullRecord.medical_history).length > 0 ? (
                  <div className="space-y-2 text-xs">
                    {(() => {
                      const mh = fullRecord.medical_history; 
                      return (
                        <>
                        <table className="w-full text-xs text-left">
                          <tbody className="divide-y divide-slate-100">
                            <tr><td className="py-1 w-3/4 text-slate-600 font-medium">1. Good Health?</td><td className="py-1 font-bold text-slate-900">{mh.q_good_health ? "Yes" : "No"}</td></tr>
                            <tr><td className="py-1 text-slate-600 font-medium">2. Medical Treatment?</td><td className="py-1 font-bold text-slate-900">{mh.q_medical_treatment ? "Yes" : "No"}</td></tr>
                            {mh.q_medical_treatment_details && <tr><td colSpan={2} className="py-1 pl-4 text-slate-500">- {mh.q_medical_treatment_details}</td></tr>}
                            <tr><td className="py-1 text-slate-600 font-medium">3. Serious illness / surgery?</td><td className="py-1 font-bold text-slate-900">{mh.q_surgical_operation ? "Yes" : "No"}</td></tr>
                            {mh.q_surgical_operation_details && <tr><td colSpan={2} className="py-1 pl-4 text-slate-500">- {mh.q_surgical_operation_details}</td></tr>}
                            <tr><td className="py-1 text-slate-600 font-medium">4. Hospitalized recently?</td><td className="py-1 font-bold text-slate-900">{mh.q_hospitalized ? "Yes" : "No"}</td></tr>
                            {mh.q_hospitalized_details && <tr><td colSpan={2} className="py-1 pl-4 text-slate-500">- {mh.q_hospitalized_details}</td></tr>}
                            <tr><td className="py-1 text-slate-600 font-medium">5. Taking medications?</td><td className="py-1 font-bold text-slate-900">{mh.q_medication ? "Yes" : "No"}</td></tr>
                            {mh.q_medication_details && <tr><td colSpan={2} className="py-1 pl-4 text-slate-500">- {mh.q_medication_details}</td></tr>}
                            <tr><td className="py-1 text-slate-600 font-medium">6. Tobacco products?</td><td className="py-1 font-bold text-slate-900">{mh.q_tobacco ? "Yes" : "No"}</td></tr>
                            <tr><td className="py-1 text-slate-600 font-medium">7. Alcohol/Drugs?</td><td className="py-1 font-bold text-slate-900">{mh.q_drugs_alcohol ? "Yes" : "No"}</td></tr>
                            <tr><td className="py-1 text-slate-600 font-medium">8. Allergies?</td><td className={`py-1 font-bold ${mh.q_allergic ? 'text-red-600' : 'text-slate-900'}`}>{mh.q_allergic ? "Yes" : "No"}</td></tr>
                            {mh.allergies && Object.keys(mh.allergies).length > 0 && (
                              <tr>
                                <td colSpan={2} className="py-1 pl-4 text-slate-500">
                                  {Object.entries(mh.allergies).filter(([k,v])=>k!=="others_detail" && v).map(([k])=>k).join(", ")}
                                  {mh.allergies.others_detail && ` (Others: ${mh.allergies.others_detail})`}
                                </td>
                              </tr>
                            )}
                            <tr><td className="py-1 text-slate-600 font-medium">9. Bleeding Time</td><td className={`py-1 font-bold ${mh.bleeding_time ? 'text-red-600' : 'text-slate-900'}`}>{mh.bleeding_time || "No"}</td></tr>
                          </tbody>
                        </table>
                        
                        <div className="pt-2 border-t border-slate-200">
                          <span className="text-slate-700 text-xs font-bold block mb-1">Reported Conditions & Allergies:</span> 
                          {(() => {
                            const conds = Array.isArray(mh.underlying_conditions) 
                              ? mh.underlying_conditions 
                              : Object.keys(mh.underlying_conditions || {}).filter(k => k !== "others_detail" && mh.underlying_conditions[k]);
                            const othersDetail = mh.underlying_conditions?.others_detail;
                            
                            if (conds.length > 0 || othersDetail) {
                              return (
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {conds.map((cond, i) => (
                                    <Badge key={i} className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold">{cond}</Badge>
                                  ))}
                                  {othersDetail && <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold">Others: {othersDetail}</Badge>}
                                </div>
                              );
                            }
                            return <span className="text-emerald-700 font-bold text-xs">None reported</span>;
                          })()}
                        </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-lg text-center text-xs text-slate-500 italic border border-slate-200">
                    No medical history on file.
                  </div>
                )}
              </div>

            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

