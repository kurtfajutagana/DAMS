import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Search, UserCircle, Phone, Activity, Loader2, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { toast } from "sonner";
import UniversalPatientRecordModal from "../../components/UniversalPatientRecordModal";

export default function DentistPatientRecords() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Universal Record Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordPatient, setRecordPatient] = useState(null);

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

  const handleOpenRecordModal = (patient) => {
    setRecordPatient(patient);
    setIsRecordModalOpen(true);
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
                      onClick={() => handleOpenRecordModal(patient)}
                      className="h-8 border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold text-xs px-3"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1 text-slate-600" />
                      View Record
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

      {/* Universal Patient Record Modal */}
      {recordPatient && (
        <UniversalPatientRecordModal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          patientId={recordPatient.id}
          patientName={`${recordPatient.first_name || ''} ${recordPatient.last_name || ''}`}
        />
      )}
    </div>
  );
}

