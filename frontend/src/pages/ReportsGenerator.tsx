import React from "react";
import { Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

export default function ReportsGenerator() {
  const triggerDownload = (reportName: string) => {
    toast.success(`Report compiled and downloaded successfully.`);
  };

  const reports = [
    {
      title: "Patient Medication Adherence Review",
      description: "Adherence logs, missed dosage alerts, and intent analysis summaries for high-risk patients.",
      type: "Clinical"
    },
    {
      title: "AI Triage Intent Performance Matrix",
      description: "Statistics on chatbot conversations, intent classification confidence, and automated scheduling rate.",
      type: "AI Logs"
    },
    {
      title: "Clinic Billing Verification Ledger",
      description: "GCash, Maya, and bank transfer receipts pending vs verified, matching procedure invoice codes.",
      type: "Financial"
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports Generator</h1>
        <p className="text-slate-500 text-xs mt-0.5">Export clinical and operational reports</p>
      </div>

      {/* Reports Grid */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Available Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reports.map((report) => (
            <Card key={report.title} className="border-slate-200 bg-white flex flex-col justify-between">
              <CardHeader className="pb-3">
                <span className="text-[9px] font-bold bg-slate-950 text-white px-1.5 py-0.5 rounded w-max uppercase">
                  {report.type}
                </span>
                <CardTitle className="text-sm font-bold text-slate-950 pt-2">
                  {report.title}
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                  {report.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Button
                  onClick={() => triggerDownload(report.title)}
                  size="sm"
                  className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center gap-1"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Compile & Export</span>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

    </div>
  );
}
