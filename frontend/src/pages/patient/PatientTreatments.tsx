import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { 
  Activity,
  Stethoscope, 
  Clock,
  Loader2,
  FileText,
  Search
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Input } from "../../components/ui/input";

import InteractiveDentalChart from "../../components/InteractiveDentalChart";

interface Treatment {
  id: string;
  procedure_name: string;
  treatment_date: string;
  clinical_notes: string;
}

export default function PatientTreatments() {
  const { user } = useAuth() as any;
  const [treatmentHistory, setTreatmentHistory] = useState<Treatment[]>([]);
  const [teethChart, setTeethChart] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!user?.id) return;

    const fetchTreatments = async () => {
      setLoading(true);
      try {
        const { data: toothData, error: toothError } = await supabase
          .from('tooth_conditions')
          .select('*')
          .eq('patient_id', user.id);
        
        if (toothError) throw toothError;
        if (toothData) {
          const mappedTeeth: Record<number, string> = {};
          toothData.forEach((t: any) => {
            mappedTeeth[t.tooth_number] = t.status;
          });
          setTeethChart(mappedTeeth);
        }

        const { data: treatmentData, error: treatmentError } = await supabase
          .from('treatments')
          .select('*')
          .eq('patient_id', user.id)
          .order('treatment_date', { ascending: false });
        
        if (treatmentError) throw treatmentError;
        setTreatmentHistory(treatmentData || []);

      } catch (error) {
        console.error("Error fetching treatments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTreatments();
  }, [user]);

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3 sm:pb-5 gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-950">Treatment History & Dental Chart</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">Review your past clinical procedures, odontogram chart, and session notes.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          
          {/* Active Dental Chart Canvas UI */}
          <InteractiveDentalChart 
            initialTeeth={teethChart}
            readOnly={true}
          />

          {/* Treatment History List */}
          <Card className="shadow-2xs border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-6">
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
                  Past Procedures
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  A chronological log of all your completed dental treatments.
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search procedures..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white text-xs sm:text-sm rounded-xl h-9 sm:h-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {treatmentHistory.length > 0 ? (
                <div className="overflow-x-auto p-2 sm:p-4">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse border border-slate-200 rounded-lg overflow-hidden min-w-[500px]">
                    <thead className="bg-slate-100 text-[11px] sm:text-xs uppercase text-slate-600 font-semibold">
                      <tr>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-200 w-28 sm:w-32">Date</th>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-200 w-1/3">Procedure Name</th>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-200">Clinical Notes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {treatmentHistory
                        .filter(t => t.procedure_name.toLowerCase().includes(searchTerm.toLowerCase()) || (t.clinical_notes && t.clinical_notes.toLowerCase().includes(searchTerm.toLowerCase())))
                        .map((treatment) => (
                        <tr key={treatment.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-200 whitespace-nowrap text-slate-600">
                            {new Date(treatment.treatment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-200 font-medium text-slate-800">
                            {treatment.procedure_name}
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-200 text-slate-600">
                            {treatment.clinical_notes || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 flex flex-col items-center justify-center text-center text-slate-500">
                  <FileText className="h-12 w-12 text-slate-200 mb-4" />
                  <p className="text-base font-medium text-slate-700">No Treatment History</p>
                  <p className="text-xs sm:text-sm mt-1">You have no logged dental procedures at this time.</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
