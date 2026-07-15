import React, { useState, useEffect } from "react";
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

// Realistic Tooth SVG Components
const MolarSvg = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 5 6 C 5 2, 19 2, 19 6 C 19 11, 16.5 13, 15 13 C 15 13, 15 16, 14 20 C 13.5 22, 12.5 22, 12 18 C 11.5 22, 10.5 22, 10 20 C 9 16, 9 13, 9 13 C 7.5 13, 5 11, 5 6 Z" />
  </svg>
);

const IncisorSvg = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 8 6 C 8 2, 16 2, 16 6 C 16 11, 14 13, 14 13 C 14 13, 13 18, 12.5 21 C 12 22, 12 22, 11.5 21 C 11 18, 10 13, 10 13 C 10 13, 8 11, 8 6 Z" />
  </svg>
);

const ToothIcon = ({ number, status, notes }: { number: number, status: string, notes?: string }) => {
  const isMolar = [1,2,3,4,5, 12,13,14,15,16, 17,18,19,20,21, 28,29,30,31,32].includes(number);
  const isUpper = number <= 16;
  
  let colorClass = "text-slate-100 fill-slate-100 stroke-slate-300";
  if (status === "treated") colorClass = "text-blue-100 fill-blue-100 stroke-blue-500";
  if (status === "needs-attention") colorClass = "text-amber-100 fill-amber-100 stroke-amber-500";
  if (status === "missing") colorClass = "opacity-20 fill-transparent stroke-slate-400 stroke-dashed";

  const rotationClass = isUpper ? "rotate-180" : "";

  return (
    <div title={notes || `Tooth #${number}`} className="flex flex-col items-center gap-1 cursor-help transition-transform hover:scale-110 p-1">
      {isUpper && <span className="text-[9px] font-bold text-slate-400">{number}</span>}
      <div className={`w-6 h-8 flex items-center justify-center ${rotationClass}`}>
        {isMolar ? <MolarSvg className={`w-full h-full ${colorClass}`} /> : <IncisorSvg className={`w-full h-full ${colorClass}`} />}
      </div>
      {!isUpper && <span className="text-[9px] font-bold text-slate-400">{number}</span>}
    </div>
  );
};

interface Treatment {
  id: string;
  procedure_name: string;
  treatment_date: string;
  clinical_notes: string;
}

interface ToothCondition {
  number: number;
  status: "healthy" | "treated" | "needs-attention" | "missing";
  notes?: string;
}

export default function PatientTreatments() {
  const { user } = useAuth() as any;
  const [treatmentHistory, setTreatmentHistory] = useState<Treatment[]>([]);
  const [teethChart, setTeethChart] = useState<ToothCondition[]>([]);
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
          const mappedTeeth = toothData.map((t: any) => ({
            number: t.tooth_number,
            status: t.status,
            notes: t.notes || undefined
          }));
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
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Treatment History</h1>
        <p className="text-muted-foreground mt-1">
          Review your past clinical procedures and active dental chart.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Active Dental Chart Canvas UI */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-blue-600" />
                Active Clinical Chart
              </CardTitle>
              <CardDescription>Visual representation of your current dental status.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              
              <div className="bg-white border rounded-lg p-6 flex-1 flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
                
                <div className="text-center w-full z-10 space-y-6">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Upper Arch</p>
                    <div className="flex justify-center gap-1 flex-wrap px-2">
                      {Array.from({length: 16}, (_, i) => i + 1).map(num => {
                        const tooth = teethChart.find(t => t.number === num);
                        const status = tooth?.status || "healthy";
                        return (
                          <ToothIcon 
                            key={`upper-${num}`} 
                            number={num} 
                            status={status} 
                            notes={tooth?.notes} 
                          />
                        );
                      })}
                    </div>
                  </div>
                  
                  <Separator className="bg-slate-200 w-3/4 mx-auto" />
                  
                  <div>
                    <div className="flex justify-center gap-1 flex-wrap px-2 mb-4">
                      {Array.from({length: 16}, (_, i) => i + 17).map(num => {
                        const tooth = teethChart.find(t => t.number === num);
                        const status = tooth?.status || "healthy";
                        return (
                          <ToothIcon 
                            key={`lower-${num}`} 
                            number={num} 
                            status={status} 
                            notes={tooth?.notes} 
                          />
                        );
                      })}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lower Arch</p>
                  </div>
                </div>
              </div>

              {/* Chart Legend */}
              <div className="mt-6 flex justify-center gap-6 text-xs text-muted-foreground bg-slate-50 p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-white border border-slate-300"></div>
                  <span>Healthy</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                  <span>Treated</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <span>Needs Attention</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                  <span>Missing/Extracted</span>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Treatment History List */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-600" />
                  Past Procedures
                </CardTitle>
                <CardDescription>
                  A chronological log of all your completed dental treatments.
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search procedures..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {treatmentHistory.length > 0 ? (
                <div className="overflow-x-auto p-4">
                  <table className="w-full text-left text-sm border-collapse border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 text-xs uppercase text-slate-600 font-semibold">
                      <tr>
                        <th className="px-4 py-3 border border-slate-200 w-32">Date</th>
                        <th className="px-4 py-3 border border-slate-200 w-1/3">Procedure Name</th>
                        <th className="px-4 py-3 border border-slate-200">Clinical Notes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {treatmentHistory
                        .filter(t => t.procedure_name.toLowerCase().includes(searchTerm.toLowerCase()) || (t.clinical_notes && t.clinical_notes.toLowerCase().includes(searchTerm.toLowerCase())))
                        .map((treatment) => (
                        <tr key={treatment.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 border border-slate-200 whitespace-nowrap text-slate-600">
                            {new Date(treatment.treatment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 border border-slate-200 font-medium text-slate-800">
                            {treatment.procedure_name}
                          </td>
                          <td className="px-4 py-3 border border-slate-200 text-slate-600">
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
                  <p className="text-sm mt-1">You have no logged dental procedures at this time.</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
