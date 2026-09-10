import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Pill, FileText, Download, Printer, UserCircle2, CheckCircle2, Check, Loader2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { useReactToPrint } from "react-to-print";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface PrescriptionRecord {
  id: string;
  dateIssued: string;
  prescribingDentist: string;
  medicationName: string;
  dosageRules: string;
  duration: string;
  isActive: boolean;
  notes?: string;
}

export default function PatientPrescriptions() {
  const { user } = useAuth() as any;
  const location = useLocation();
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;

    const fetchPrescriptions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('prescriptions')
          .select('*, profiles!prescriptions_dentist_id_fkey(first_name, last_name)')
          .eq('patient_id', user.id)
          .order('start_date', { ascending: false });

        if (error) throw error;

        if (data) {
          const mappedData: PrescriptionRecord[] = data.map((rx: any) => {
            const start = new Date(rx.start_date);
            const end = new Date(rx.end_date);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return {
              id: rx.id,
              dateIssued: start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
              prescribingDentist: rx.profiles?.first_name ? `Dr. ${rx.profiles.first_name} ${rx.profiles.last_name}` : 'Unknown Dentist',
              medicationName: rx.medication_name,
              dosageRules: rx.dosage_instructions,
              duration: `${diffDays} Days (Until ${end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })})`,
              isActive: rx.is_active,
            };
          });
          setPrescriptions(mappedData);

          // Fetch taken reminders for these prescriptions
          const rxIds = data.map((p: any) => p.id);
          if (rxIds.length > 0) {
            const { data: takenReminders } = await supabase
              .from('reminders')
              .select('prescription_id')
              .in('prescription_id', rxIds)
              .eq('status', 'taken');
            if (takenReminders) {
              const ids = takenReminders.map((r: any) => r.prescription_id).filter(Boolean);
              setLoggedIds(new Set(ids));
            }
          }
        }
      } catch (error) {
        console.error("Error fetching prescriptions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrescriptions();
  }, [user]);

  const activeRx = prescriptions.filter(p => p.isActive);
  const [selectedRx, setSelectedRx] = useState<PrescriptionRecord | null>(null);

  const handleLogDose = async (prescriptionId: string, medName: string) => {
    setLoggingId(prescriptionId);
    try {
      let success = false;
      try {
        const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
        const res = await fetch(`${baseUrl}/api/patient/prescriptions/${prescriptionId}/log-dose`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patient_id: user?.id })
        });
        if (res.ok) success = true;
      } catch (apiErr) {
        // Fallback to direct Supabase
      }

      if (!success) {
        const { data: existingRem } = await supabase
          .from("reminders")
          .select("id")
          .eq("prescription_id", prescriptionId)
          .in("status", ["pending", "sent"])
          .limit(1);

        if (existingRem && existingRem.length > 0) {
          await supabase
            .from("reminders")
            .update({ status: "taken", sent_at: new Date().toISOString() })
            .eq("id", existingRem[0].id);
        } else {
          await supabase.from("reminders").insert({
            prescription_id: prescriptionId,
            patient_id: user?.id,
            scheduled_time: new Date().toISOString(),
            status: "taken",
            sent_at: new Date().toISOString()
          });
        }

        if (user?.id) {
          try {
            const { data: adh } = await supabase
              .from("patient_adherence_records")
              .select("id, risk_score")
              .eq("patient_id", user.id)
              .maybeSingle();

            if (adh) {
              await supabase
                .from("patient_adherence_records")
                .update({
                  risk_score: Math.max(5, (adh.risk_score || 50) - 25),
                  status: "likely"
                })
                .eq("patient_id", user.id);
            }
          } catch (adhErr) {}
        }
      }

      setLoggedIds(prev => new Set([...prev, prescriptionId]));
      toast.success(`✓ Dose logged for ${medName}! Recovery compliance score updated.`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to log dose intake.");
    } finally {
      setLoggingId(null);
    }
  };

  // Auto-confirmation via email links (e.g. ?confirm_rx=... or ?confirm_dose=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const confirmRxId = params.get("confirm_rx") || params.get("confirm_dose");
    if (confirmRxId && user?.id && prescriptions.length > 0) {
      const matched = prescriptions.find(p => p.id === confirmRxId);
      handleLogDose(confirmRxId, matched ? matched.medicationName : "Prescribed Medication");
    }
  }, [location.search, user, prescriptions]);

  const handleDownloadAllCSV = () => {
    if (!prescriptions.length) return;
    
    const headers = ["Rx ID", "Date Issued", "Medication", "Dosage & Rules", "Duration", "Dentist"];
    const rows = prescriptions.map(rx => [
      rx.id,
      `"${rx.dateIssued}"`,
      `"${rx.medicationName}"`,
      `"${rx.dosageRules}"`,
      `"${rx.duration}"`,
      `"${rx.prescribingDentist}"`
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "My_Prescriptions_Record.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ScriptViewerDialog = ({ rx, children }: { rx: PrescriptionRecord, children: React.ReactNode }) => {
    const printRef = useRef<HTMLDivElement>(null);
    
    const handlePrint = useReactToPrint({
      contentRef: printRef,
      documentTitle: `Prescription_${rx.id}`,
    });

    const handleDownloadPDF = async () => {
      if (!printRef.current) return;
      try {
        const canvas = await html2canvas(printRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: 'a4'
        });
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Prescription_${rx.id}.pdf`);
      } catch (err) {
        console.error("Failed to generate PDF", err);
      }
    };

    return (
      <Dialog>
        <DialogTrigger asChild onClick={() => setSelectedRx(rx)}>
          {children}
        </DialogTrigger>
        <DialogContent className="max-w-md md:max-w-2xl bg-white text-slate-900 border shadow-2xl">
          <DialogHeader className="border-b pb-4 mb-4">
            <div className="flex justify-between items-start gap-2">
              <div>
                <DialogTitle className="text-2xl font-serif text-slate-800 tracking-tight">TEETH TALK CLINIC</DialogTitle>
                <DialogDescription className="text-sm font-medium text-slate-500 mt-1">Official Digital Prescription</DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {rx.isActive && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs font-semibold gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-8"
                    onClick={() => handleLogDose(rx.id, rx.medicationName)}
                    disabled={loggingId === rx.id || loggedIds.has(rx.id)}
                  >
                    {loggedIds.has(rx.id) ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" /> Dose Logged
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Log Dose
                      </>
                    )}
                  </Button>
                )}
                <Button variant="outline" size="icon" className="h-8 w-8" title="Print Script" onClick={() => handlePrint()}>
                  <Printer className="h-4 w-4" />
                </Button>
                <Button variant="default" size="icon" className="h-8 w-8" title="Download Offline" onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div ref={printRef} className="space-y-6 px-2 pb-6 pt-2 font-mono text-sm bg-white">
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-md border border-slate-100">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Date Issued</p>
              <p className="font-semibold text-slate-800">{rx.dateIssued}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Rx ID</p>
              <p className="font-semibold text-slate-800">#{rx.id.toUpperCase()}</p>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-serif text-slate-800 font-bold italic pr-2">Rx</span>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>
            <div className="pl-8 space-y-4">
              <div>
                <p className="text-lg font-bold text-slate-900">{rx.medicationName}</p>
                <p className="text-slate-700 mt-1 font-medium">{rx.dosageRules}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-slate-300 text-slate-600 bg-white">Duration: {rx.duration}</Badge>
              </div>
              {rx.notes && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-3 mt-4 text-amber-900 rounded-r-md text-sm">
                  <strong>Notes:</strong> {rx.notes}
                </div>
              )}
            </div>
          </div>

          <div className="pt-8 flex justify-end">
            <div className="text-center w-48">
              <div className="border-b-2 border-slate-800 pb-1 mb-2 px-4">
                <span className="font-script text-2xl text-blue-900 opacity-80">{rx.prescribingDentist}</span>
              </div>
              <p className="text-xs text-slate-500 font-sans uppercase tracking-widest">{rx.prescribingDentist}</p>
              <p className="text-[10px] text-slate-400 font-sans mt-1">Lic: PR-092834</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Prescriptions & Medications</h1>
          <p className="text-sm font-medium text-slate-600 mt-1">Track your active medical scripts, dosage rules, and prescription history.</p>
        </div>
        <Button variant="outline" className="border-slate-300 text-slate-900 hover:bg-slate-100 font-semibold text-xs gap-2 shrink-0 shadow-xs" onClick={handleDownloadAllCSV} disabled={prescriptions.length === 0}>
          <Download className="h-4 w-4 text-slate-500" />
          Export All Records
        </Button>
      </div>

      {/* Active Prescription Header Summary */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" /> Active Medications
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeRx.length > 0 ? (
            activeRx.map((rx) => (
              <Card key={rx.id} className="transition-colors shadow-sm bg-primary/5 border-primary/20 flex flex-col justify-between">
                <div>
                  <ScriptViewerDialog rx={rx}>
                    <CardHeader className="pb-2 cursor-pointer hover:opacity-85 transition-opacity">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base text-primary hover:underline">{rx.medicationName}</CardTitle>
                        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 text-[10px] text-white">Active</Badge>
                      </div>
                      <CardDescription className="text-xs">Issued on {rx.dateIssued}</CardDescription>
                    </CardHeader>
                  </ScriptViewerDialog>
                  <CardContent className="space-y-2 pb-3">
                    <p className="text-sm font-medium leading-tight">{rx.dosageRules}</p>
                    <Badge variant="outline" className="bg-background/50 border-primary/20 text-xs">
                      {rx.duration}
                    </Badge>
                  </CardContent>
                </div>
                <CardFooter className="pt-0 pb-3 px-4 flex gap-2">
                  <Button
                    size="sm"
                    className={`w-full text-xs font-semibold gap-1.5 h-8 ${
                      loggedIds.has(rx.id)
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                    }`}
                    disabled={loggingId === rx.id || loggedIds.has(rx.id)}
                    onClick={() => handleLogDose(rx.id, rx.medicationName)}
                  >
                    {loggingId === rx.id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Logging...
                      </>
                    ) : loggedIds.has(rx.id) ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Dose Taken Today
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark as Taken
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <Card className="col-span-full border-dashed shadow-none bg-transparent">
              <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Pill className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No active prescriptions.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Historical Prescription Log Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Prescription History
          </CardTitle>
          <CardDescription>A complete log of all digitally generated scripts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date Issued</th>
                    <th className="px-4 py-3 font-medium">Medication Name</th>
                    <th className="px-4 py-3 font-medium">Dosage &amp; Frequency</th>
                    <th className="px-4 py-3 font-medium">Duration</th>
                    <th className="px-4 py-3 font-medium">Dentist</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {prescriptions.map((rx) => (
                    <ScriptViewerDialog key={rx.id} rx={rx}>
                      <tr className="hover:bg-muted/30 transition-colors cursor-pointer group">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{rx.dateIssued}</td>
                        <td className="px-4 py-3 font-medium text-foreground group-hover:text-primary transition-colors">
                          {rx.medicationName}
                          {rx.isActive && <Badge variant="default" className="ml-2 h-5 text-[9px] px-1.5">ACTIVE</Badge>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">{rx.dosageRules}</td>
                        <td className="px-4 py-3 text-muted-foreground">{rx.duration}</td>
                        <td className="px-4 py-3 text-muted-foreground flex items-center gap-2">
                          <UserCircle2 className="h-4 w-4 opacity-50" />
                          {rx.prescribingDentist}
                        </td>
                      </tr>
                    </ScriptViewerDialog>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
