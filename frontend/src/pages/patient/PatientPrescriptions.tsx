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
import { Pill, FileText, Download, Printer, UserCircle2, CheckCircle2, Check, Loader2, Clock } from "lucide-react";
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

interface ReminderItem {
  id: string;
  prescription_id: string;
  scheduled_time: string;
  status: string;
  sent_at?: string;
  prescriptions?: {
    medication_name: string;
    dosage_instructions: string;
  };
}

export default function PatientPrescriptions() {
  const { user } = useAuth() as any;
  const location = useLocation();
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [remindersList, setRemindersList] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set());

  // Live clock ticker to re-evaluate due doses every 15 seconds
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const formatDoseTime = (dateStr: string, now: Date) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Scheduled Dose";
      const isToday = d.toDateString() === now.toDateString();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const isTomorrow = d.toDateString() === tomorrow.toDateString();
      const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      if (isToday) return `Today at ${timeStr}`;
      if (isTomorrow) return `Tomorrow at ${timeStr}`;
      return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${timeStr}`;
    } catch {
      return "Scheduled Dose";
    }
  };

  const getTimeCountdown = (dateStr: string, now: Date) => {
    try {
      const target = new Date(dateStr).getTime();
      const current = now.getTime();
      const diffMs = target - current;
      if (diffMs <= 0) return "due now";
      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `in ${days}d ${hours % 24}h`;
      }
      if (hours > 0) {
        return mins > 0 ? `in ${hours}h ${mins}m` : `in ${hours}h`;
      }
      return `in ${Math.max(1, mins)}m`;
    } catch {
      return "";
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
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

          // Fetch all reminders for these prescriptions
          const rxIds = data.map((p: any) => p.id);
          if (rxIds.length > 0) {
            let loadedReminders = false;
            try {
              const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
              const res = await fetch(`${baseUrl}/api/patient/reminders/${user.id}`);
              if (res.ok) {
                const remJson = await res.json();
                if (remJson.reminders) {
                  setRemindersList(remJson.reminders);
                  const takenRx = remJson.reminders
                    .filter((r: any) => r.status === 'taken' || r.status === 'acknowledged')
                    .map((r: any) => r.prescription_id);
                  if (takenRx.length > 0) {
                    setLoggedIds(new Set(takenRx));
                  }
                  loadedReminders = true;
                }
              }
            } catch (e) {}

            if (!loadedReminders) {
              const { data: remData } = await supabase
                .from('reminders')
                .select('*, prescriptions(medication_name, dosage_instructions)')
                .in('prescription_id', rxIds)
                .order('scheduled_time', { ascending: true })
                .limit(500);

              if (remData) {
                setRemindersList(remData);
                const ids = remData
                  .filter((r: any) => r.status === 'taken' || r.status === 'acknowledged')
                  .map((r: any) => r.prescription_id)
                  .filter(Boolean);
                setLoggedIds(new Set(ids));
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching prescriptions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const activeRx = prescriptions.filter(p => p.isActive);
  const [, setSelectedRx] = useState<PrescriptionRecord | null>(null);

  const handleConfirmDose = async (reminderId: string, medName: string) => {
    setLoggingId(reminderId);
    try {
      let success = false;
      try {
        const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
        const res = await fetch(`${baseUrl}/api/patient/reminders/${reminderId}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });
        if (res.ok) success = true;
      } catch (apiErr) {
        // Fallback to Supabase
      }

      if (!success) {
        await supabase.from("reminders").update({
          status: "taken",
          sent_at: new Date().toISOString()
        }).eq("id", reminderId);

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

      const confirmedReminder = remindersList.find(r => r.id === reminderId);
      if (confirmedReminder?.prescription_id) {
        setLoggedIds(prev => new Set([...prev, confirmedReminder.prescription_id]));
      }

      setRemindersList(prev => prev.map(r => r.id === reminderId ? { ...r, status: "taken" } : r));
      toast.success(`✓ Dose recorded for ${medName}! Recovery compliance score updated.`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to record dose intake.");
    } finally {
      setLoggingId(null);
    }
  };

  const handleQuickLogPrescriptionDose = async (prescriptionId: string, medName: string) => {
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
          .order("scheduled_time", { ascending: true })
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
      setRemindersList(prev => {
        const hasRx = prev.some(r => r.prescription_id === prescriptionId);
        if (hasRx) {
          return prev.map(r => r.prescription_id === prescriptionId ? { ...r, status: "taken" } : r);
        }
        return [{
          id: `local-${Date.now()}`,
          prescription_id: prescriptionId,
          scheduled_time: new Date().toISOString(),
          status: "taken"
        }, ...prev];
      });

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
    const confirmDoseId = params.get("confirm_dose");
    const confirmRxId = params.get("confirm_rx");
    
    if (confirmDoseId && user?.id) {
      handleConfirmDose(confirmDoseId, "your scheduled medication");
    } else if (confirmRxId && user?.id && prescriptions.length > 0) {
      const matched = prescriptions.find(p => p.id === confirmRxId);
      handleQuickLogPrescriptionDose(confirmRxId, matched ? matched.medicationName : "Prescribed Medication");
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
                {rx.isActive && (() => {
                  const matchingReminders = remindersList.filter(r => r.prescription_id === rx.id);
                  const totalDoses = matchingReminders.length;
                  const takenReminders = matchingReminders.filter(r => r.status === "taken" || r.status === "acknowledged");
                  const takenCount = takenReminders.length;
                  const dueReminder = matchingReminders.find(r => 
                    (r.status === "pending" || r.status === "sent") && new Date(r.scheduled_time) <= currentTime
                  );
                  const nextFutureReminder = matchingReminders.find(r => 
                    (r.status === "pending" || r.status === "sent") && new Date(r.scheduled_time) > currentTime
                  );
                  const isAllCompleted = totalDoses > 0 && takenCount >= totalDoses;
                  const isFallbackLogged = totalDoses === 0 && loggedIds.has(rx.id);

                  if (dueReminder) {
                    return (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs font-semibold gap-1 text-white bg-emerald-600 hover:bg-emerald-700 h-8"
                        onClick={() => handleConfirmDose(dueReminder.id, rx.medicationName)}
                        disabled={loggingId === dueReminder.id}
                      >
                        {loggingId === dueReminder.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Pill className="h-3.5 w-3.5 mr-1" />
                        )}
                        Mark {new Date(dueReminder.scheduled_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} Dose Taken
                      </Button>
                    );
                  }
                  if (isAllCompleted) {
                    return (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-bold py-1 px-2.5">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600 inline" /> Course Completed
                      </Badge>
                    );
                  }
                  if (nextFutureReminder) {
                    return (
                      <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300 text-xs font-bold py-1 px-2.5">
                        <Clock className="h-3.5 w-3.5 mr-1 text-slate-500 inline" /> Next: {new Date(nextFutureReminder.scheduled_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} ({getTimeCountdown(nextFutureReminder.scheduled_time, currentTime)})
                      </Badge>
                    );
                  }
                  return (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs font-semibold gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-8"
                      onClick={() => handleQuickLogPrescriptionDose(rx.id, rx.medicationName)}
                      disabled={loggingId === rx.id || isFallbackLogged}
                    >
                      {isFallbackLogged ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" /> Dose Logged
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Log Dose
                        </>
                      )}
                    </Button>
                  );
                })()}
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
          <p className="text-sm font-medium text-slate-600 mt-1">Track your active medical scripts, scheduled dose times, and prescription history.</p>
        </div>
        <Button variant="outline" className="border-slate-300 text-slate-900 hover:bg-slate-100 font-semibold text-xs gap-2 shrink-0 shadow-xs" onClick={handleDownloadAllCSV} disabled={prescriptions.length === 0}>
          <Download className="h-4 w-4 text-slate-500" />
          Export All Records
        </Button>
      </div>

      {/* Active Prescription Header Summary */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" /> Active Medications & Scheduled Doses
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeRx.length > 0 ? (
            activeRx.map((rx) => {
              const matchingReminders = remindersList.filter(r => r.prescription_id === rx.id);
              const totalDoses = matchingReminders.length;
              const takenReminders = matchingReminders.filter(r => r.status === "taken" || r.status === "acknowledged");
              const takenCount = takenReminders.length;

              // Earliest dose that is scheduled <= currentTime and not taken yet
              const dueReminder = matchingReminders.find(r => 
                (r.status === "pending" || r.status === "sent") && new Date(r.scheduled_time) <= currentTime
              );

              // Earliest upcoming dose scheduled after currentTime
              const nextFutureReminder = matchingReminders.find(r => 
                (r.status === "pending" || r.status === "sent") && new Date(r.scheduled_time) > currentTime
              );

              const isAllCompleted = totalDoses > 0 && takenCount >= totalDoses;
              const isFallbackLogged = totalDoses === 0 && loggedIds.has(rx.id);

              return (
                <Card key={rx.id} className={`transition-colors shadow-sm flex flex-col justify-between ${
                  dueReminder ? "bg-amber-50/20 border-amber-300" : "bg-primary/5 border-primary/20"
                }`}>
                  <div>
                    <ScriptViewerDialog rx={rx}>
                      <CardHeader className="pb-2 cursor-pointer hover:opacity-85 transition-opacity">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base text-primary hover:underline">{rx.medicationName}</CardTitle>
                          {dueReminder ? (
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold py-0.5 animate-pulse">
                              <Clock className="h-3 w-3 mr-1 text-amber-700" /> Due Now
                            </Badge>
                          ) : isAllCompleted ? (
                            <Badge className="bg-emerald-600 text-white text-[10px] font-bold py-0.5">
                              <CheckCircle2 className="h-3 w-3 mr-1 text-white" /> Complete
                            </Badge>
                          ) : nextFutureReminder ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold py-0.5">
                              <Check className="h-3 w-3 mr-1 text-emerald-600" /> On Schedule
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 text-[10px] text-white">Active</Badge>
                          )}
                        </div>
                        <CardDescription className="text-xs">Issued on {rx.dateIssued}</CardDescription>
                      </CardHeader>
                    </ScriptViewerDialog>
                    <CardContent className="space-y-2 pb-3">
                      <p className="text-sm font-medium leading-tight">{rx.dosageRules}</p>
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="bg-background/50 border-primary/20 text-xs">
                          {rx.duration}
                        </Badge>
                        {totalDoses > 0 && (
                          <span className="text-[11px] font-bold text-slate-600">
                            {takenCount} / {totalDoses} Doses
                          </span>
                        )}
                      </div>

                      {totalDoses > 0 && (
                        <div className="mt-2 pt-2 border-t border-primary/10">
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                              style={{ width: `${Math.min(100, Math.round((takenCount / totalDoses) * 100))}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </div>

                  <CardFooter className="pt-0 pb-3 px-4 flex flex-col gap-2">
                    {dueReminder ? (
                      <Button
                        size="sm"
                        disabled={loggingId === dueReminder.id}
                        onClick={() => handleConfirmDose(dueReminder.id, rx.medicationName)}
                        className="w-full text-xs font-bold gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      >
                        {loggingId === dueReminder.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            Logging...
                          </>
                        ) : (
                          <>
                            <Pill className="h-3.5 w-3.5 mr-1" />
                            Mark {new Date(dueReminder.scheduled_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} as Taken
                          </>
                        )}
                      </Button>
                    ) : isAllCompleted ? (
                      <Button
                        size="sm"
                        disabled={true}
                        className="w-full text-xs font-bold gap-1.5 h-8 bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                        All {totalDoses} Doses Completed
                      </Button>
                    ) : nextFutureReminder ? (
                      <Button
                        size="sm"
                        disabled={true}
                        className="w-full text-xs font-bold gap-1.5 h-8 bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed"
                        title={`Next dose scheduled for ${formatDoseTime(nextFutureReminder.scheduled_time, currentTime)}`}
                      >
                        <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                        Next: {new Date(nextFutureReminder.scheduled_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} ({getTimeCountdown(nextFutureReminder.scheduled_time, currentTime)})
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isFallbackLogged || loggingId === rx.id}
                        onClick={() => handleQuickLogPrescriptionDose(rx.id, rx.medicationName)}
                        className={`w-full text-xs font-semibold gap-1.5 h-8 ${
                          isFallbackLogged
                            ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                            : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                        }`}
                      >
                        {loggingId === rx.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            Logging...
                          </>
                        ) : isFallbackLogged ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Dose Logged
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Mark as Taken
                          </>
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })
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
