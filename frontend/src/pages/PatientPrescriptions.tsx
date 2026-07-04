import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Pill, FileText, Download, Printer, UserCircle2 } from "lucide-react";

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
  const prescriptions: PrescriptionRecord[] = [
    {
      id: "rx-101",
      dateIssued: "July 1, 2026",
      prescribingDentist: "Dr. Sarah Smith",
      medicationName: "Amoxicillin 500mg",
      dosageRules: "Take 1 capsule by mouth every 8 hours",
      duration: "7 Days (Until July 8, 2026)",
      isActive: true,
      notes: "Take with food to prevent stomach upset."
    },
    {
      id: "rx-102",
      dateIssued: "June 25, 2026",
      prescribingDentist: "Dr. John Doe",
      medicationName: "Ibuprofen 400mg",
      dosageRules: "Take 1 tablet every 6 hours as needed for pain",
      duration: "5 Days (Until June 30, 2026)",
      isActive: false,
    },
    {
      id: "rx-103",
      dateIssued: "January 10, 2026",
      prescribingDentist: "Dr. Sarah Smith",
      medicationName: "Chlorhexidine Gluconate 0.12%",
      dosageRules: "Rinse with 15ml twice daily",
      duration: "14 Days",
      isActive: false,
    }
  ];

  const activeRx = prescriptions.filter(p => p.isActive);
  const [selectedRx, setSelectedRx] = useState<PrescriptionRecord | null>(null);

  const ScriptViewerDialog = ({ rx, children }: { rx: PrescriptionRecord, children: React.ReactNode }) => (
    <Dialog>
      <DialogTrigger asChild onClick={() => setSelectedRx(rx)}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md md:max-w-2xl bg-white text-slate-900 border shadow-2xl">
        <DialogHeader className="border-b pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl font-serif text-slate-800 tracking-tight">TEETH TALK CLINIC</DialogTitle>
              <DialogDescription className="text-sm font-medium text-slate-500 mt-1">Official Digital Prescription</DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" title="Print Script">
                <Printer className="h-4 w-4" />
              </Button>
              <Button variant="default" size="icon" title="Download Offline">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 px-2 pb-6 pt-2 font-mono text-sm">
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Prescriptions</h1>
          <p className="text-muted-foreground mt-1">
            Track your active medications and view your prescription history.
          </p>
        </div>
        <Button variant="outline" className="gap-2 shrink-0">
          <Download className="h-4 w-4" />
          Download All Records
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
              <ScriptViewerDialog key={rx.id} rx={rx}>
                <Card className="cursor-pointer hover:border-primary/50 transition-colors shadow-sm bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-primary">{rx.medicationName}</CardTitle>
                    <CardDescription className="text-xs">Issued on {rx.dateIssued}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 pb-4">
                    <p className="text-sm font-medium leading-tight">{rx.dosageRules}</p>
                    <Badge variant="outline" className="bg-background/50 border-primary/20 text-xs">
                      {rx.duration}
                    </Badge>
                  </CardContent>
                </Card>
              </ScriptViewerDialog>
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
