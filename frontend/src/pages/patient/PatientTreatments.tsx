import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { Separator } from "../../components/ui/separator";
import { 
  Activity, 
  CheckCircle2, 
  CircleDashed, 
  Stethoscope, 
  Info,
  ShieldCheck
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

interface TreatmentStep {
  id: string;
  title: string;
  date: string;
  status: "completed" | "current" | "pending";
  description: string;
}

interface ToothCondition {
  number: number;
  status: "healthy" | "treated" | "needs-attention" | "missing";
  notes?: string;
}

export default function PatientTreatments() {
  const { user } = useAuth() as any;
  const [rootCanalTimeline, setRootCanalTimeline] = useState<TreatmentStep[]>([]);
  const [teethChart, setTeethChart] = useState<ToothCondition[]>([]);
  const [latestTreatmentName, setLatestTreatmentName] = useState<string | null>(null);
  const [recoveryProgress, setRecoveryProgress] = useState<number>(0);
  const [loading, setLoading] = useState(true);

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
          .select('id, procedure_name')
          .eq('patient_id', user.id)
          .order('treatment_date', { ascending: false })
          .limit(1);
        
        if (treatmentError) throw treatmentError;
        
        if (treatmentData && treatmentData.length > 0) {
          const latestTreatmentId = treatmentData[0].id;
          setLatestTreatmentName(treatmentData[0].procedure_name);
          
          const { data: stepsData, error: stepsError } = await supabase
            .from('treatment_steps')
            .select('*')
            .eq('treatment_id', latestTreatmentId)
            .order('step_order', { ascending: true });
            
          if (stepsError) throw stepsError;
          
          if (stepsData) {
            const mappedSteps = stepsData.map((s: any) => ({
              id: s.id,
              title: s.title,
              date: s.step_date ? new Date(s.step_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD',
              status: s.status,
              description: s.description
            }));
            setRootCanalTimeline(mappedSteps);
            const completed = stepsData.filter((s: any) => s.status === 'completed').length;
            setRecoveryProgress(stepsData.length > 0 ? Math.round((completed / stepsData.length) * 100) : 0);
          }
        }

      } catch (error) {
        console.error("Error fetching treatments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTreatments();
  }, [user]);

  const getToothColor = (status: string) => {
    switch (status) {
      case "treated": return "bg-blue-100 border-blue-400 text-blue-700";
      case "needs-attention": return "bg-amber-100 border-amber-400 text-amber-700";
      case "missing": return "bg-slate-100 border-slate-300 text-slate-400 opacity-60";
      default: return "bg-white border-slate-200 text-slate-600";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Treatment Trajectory</h1>
        <p className="text-muted-foreground mt-1">
          Monitor your ongoing dental procedures, clinical charts, and recovery progress.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Timeline & Progress */}
        <div className="col-span-1 lg:col-span-2 space-y-8">
          
          {/* Post-Operative Compliance Metrics Indicator */}
          {latestTreatmentName ? (
            <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                    <ShieldCheck className="h-5 w-5" />
                    Treatment Progress Status
                  </CardTitle>
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 border-0">
                    {recoveryProgress === 100 ? "Completed" : "In Progress"}
                  </Badge>
                </div>
                <CardDescription className="text-emerald-700/70 dark:text-emerald-500">
                  Compliance metrics based on your recent {latestTreatmentName.toLowerCase()} procedure.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium text-emerald-800 dark:text-emerald-400">
                    <span>Recovery Progress</span>
                    <span>{recoveryProgress}%</span>
                  </div>
                  <Progress value={recoveryProgress} className="h-2 bg-emerald-200 dark:bg-emerald-950" />
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-500 pt-2 flex items-center gap-1">
                    <Info className="h-3 w-3" /> Please follow all prescribed instructions for optimal recovery.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 bg-slate-50 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <Info className="h-4 w-4" /> No active treatment progress to track.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Longitudinal Care Timeline Component */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                {latestTreatmentName ? `Ongoing Procedure: ${latestTreatmentName}` : "No Ongoing Procedures"}
              </CardTitle>
              <CardDescription>
                {latestTreatmentName ? "Step-by-step tracking of your multi-stage treatment." : "You have no ongoing treatments at this time."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rootCanalTimeline.length > 0 ? (
                <div className="relative border-l-2 border-muted ml-3 space-y-8 mt-4 pb-4">
                  {rootCanalTimeline.map((step, index) => (
                    <div key={step.id} className="relative pl-8">
                      {/* Timeline Node */}
                      <div className="absolute -left-[11px] top-0.5 bg-background p-0.5">
                        {step.status === "completed" ? (
                          <CheckCircle2 className="h-5 w-5 text-primary fill-primary/10" />
                        ) : step.status === "current" ? (
                          <CircleDashed className="h-5 w-5 text-amber-500 animate-[spin_4s_linear_infinite]" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-muted" />
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <h4 className={`text-base font-semibold ${step.status === 'pending' ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {step.title}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1 max-w-md">{step.description}</p>
                        </div>
                        <Badge variant={step.status === "completed" ? "secondary" : step.status === "current" ? "default" : "outline"} className="w-fit shrink-0">
                          {step.date}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500">
                  <p>No timeline data available.</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Column: Active Dental Chart Canvas UI */}
        <div className="col-span-1 space-y-6">
          <Card className="shadow-sm h-full max-h-[800px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-muted-foreground" />
                Active Clinical Chart
              </CardTitle>
              <CardDescription>Reader-only visual representation.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              
              {/* Simulated Dental Chart Canvas UI */}
              <div className="bg-slate-50 border rounded-lg p-6 flex-1 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
                
                <div className="text-center w-full z-10 space-y-8">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Upper Arch</p>
                    <div className="flex justify-center gap-1 flex-wrap px-4">
                      {/* Generating a few mock teeth blocks */}
                      {[8, 9, 10, 11, 12, 13, 14, 15].map(num => {
                        const tooth = teethChart.find(t => t.number === num);
                        const status = tooth?.status || "healthy";
                        return (
                          <div 
                            key={`upper-${num}`} 
                            title={tooth?.notes || `Tooth #${num}`}
                            className={`w-8 h-10 border rounded-t-md rounded-b-sm flex items-center justify-center text-xs font-medium cursor-help transition-all hover:scale-110 shadow-sm ${getToothColor(status)}`}
                          >
                            {num}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <Separator className="bg-slate-200" />
                  
                  <div>
                    <div className="flex justify-center gap-1 flex-wrap px-4 mb-4">
                      {[25, 26, 27, 28, 29, 30, 31, 32].map(num => {
                        const tooth = teethChart.find(t => t.number === num);
                        const status = tooth?.status || "healthy";
                        return (
                          <div 
                            key={`lower-${num}`} 
                            title={tooth?.notes || `Tooth #${num}`}
                            className={`w-8 h-10 border rounded-b-md rounded-t-sm flex items-center justify-center text-xs font-medium cursor-help transition-all hover:scale-110 shadow-sm ${getToothColor(status)}`}
                          >
                            {num}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Lower Arch</p>
                  </div>
                </div>
              </div>

              {/* Chart Legend */}
              <div className="mt-6 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
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
        </div>

      </div>
    </div>
  );
}
