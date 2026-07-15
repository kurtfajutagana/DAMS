import React from "react";
import { FileText, FileSpreadsheet } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { useOutletContext } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ReportsGenerator() {
  const { selectedBranch } = useOutletContext<{ selectedBranch: string }>();

  const fetchCSVData = async (reportName: string) => {
    const typeMap: any = {
      "Patient Medication Adherence Review": "Clinical",
      "AI Triage Intent Performance Matrix": "AI Logs",
      "Clinic Billing Verification Ledger": "Financial"
    };
    const reportType = typeMap[reportName];
    
    const response = await fetch(`http://localhost:8000/api/admin/reports/${encodeURIComponent(reportType)}`);
    if (!response.ok) throw new Error("Failed to generate report");
    
    return { text: await response.text(), reportType };
  };

  const triggerDownloadCSV = async (reportName: string) => {
    try {
      const { text, reportType } = await fetchCSVData(reportName);
      const blob = new Blob([text], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType.replace(' ', '_').toLowerCase()}_report.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`CSV Report downloaded successfully.`);
    } catch (error) {
      toast.error("Failed to download CSV");
    }
  };

  const triggerDownloadPDF = async (reportName: string) => {
    try {
      const { text, reportType } = await fetchCSVData(reportName);
      
      const doc = new jsPDF();
      
      // Parse CSV simply
      const rows = text.split('\n').filter((row: string) => row.trim() !== '').map((row: string) => row.split(','));
      if (rows.length < 2) {
        toast.error("Not enough data to generate PDF");
        return;
      }

      // Add Header
      doc.setFontSize(18);
      doc.text("Teeth Talk Dental Clinic", 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Report: ${reportType} Report`, 14, 30);
      doc.text(`Branch: ${selectedBranch}`, 14, 36);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 42);

      autoTable(doc, {
        head: [rows[0]],
        body: rows.slice(1),
        startY: 50,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [15, 23, 42] },
      });

      doc.save(`${reportType.replace(' ', '_').toLowerCase()}_report.pdf`);
      toast.success(`PDF Report generated successfully.`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF");
    }
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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports Generator - {selectedBranch}</h1>
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
              <CardContent className="pt-2 flex flex-col gap-2">
                <Button
                  onClick={() => triggerDownloadPDF(report.title)}
                  size="sm"
                  className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center gap-1"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </Button>
                <Button
                  onClick={() => triggerDownloadCSV(report.title)}
                  size="sm"
                  variant="outline"
                  className="w-full border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-[10px] flex items-center justify-center gap-1"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Download CSV</span>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

    </div>
  );
}
