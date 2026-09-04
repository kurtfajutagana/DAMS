import React, { useState } from "react";
import { FileText, FileSpreadsheet, Eye, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { useOutletContext } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/dialog";

export default function ReportsGenerator() {
  const { selectedBranch } = useOutletContext<{ selectedBranch: string }>();
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeReportName, setActiveReportName] = useState("");
  const [previewData, setPreviewData] = useState<{ headers: string[], rows: string[][] } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchCSVData = async (reportName: string) => {
    const typeMap: any = {
      "Patient Medication Adherence Review": "Clinical",
      "AI Triage Intent Performance Matrix": "AI Logs",
      "Clinic Billing Verification Ledger": "Financial"
    };
    const reportType = typeMap[reportName];
    
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/reports/${encodeURIComponent(reportType)}`);
    if (!response.ok) throw new Error("Failed to generate report");
    
    return { text: await response.text(), reportType };
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n').filter((row: string) => row.trim() !== '');
    if (lines.length < 1) return { headers: [], rows: [] };
    const headers = lines[0].split(',');
    const rows = lines.slice(1).map(line => line.split(','));
    return { headers, rows };
  };

  const handleGeneratePreview = async (reportName: string) => {
    try {
      setIsGenerating(true);
      const { text } = await fetchCSVData(reportName);
      const parsed = parseCSV(text);
      if (parsed.headers.length === 0) {
        toast.error("Report data is empty.");
        return;
      }
      setPreviewData(parsed);
      setActiveReportName(reportName);
      setIsPreviewOpen(true);
    } catch (error) {
      toast.error("Failed to generate report preview.");
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerDownloadCSV = async () => {
    try {
      const { text, reportType } = await fetchCSVData(activeReportName);
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

  const triggerDownloadPDF = async () => {
    try {
      if (!previewData || previewData.rows.length === 0) {
        toast.error("Not enough data to generate PDF");
        return;
      }
      const { reportType } = await fetchCSVData(activeReportName);
      
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text("Teeth Talk Dental Clinic", 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Report: ${reportType} Report`, 14, 30);
      doc.text(`Branch: ${selectedBranch}`, 14, 36);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 42);

      autoTable(doc, {
        head: [previewData.headers],
        body: previewData.rows,
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
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports Generator - {selectedBranch}</h1>
        <p className="text-slate-500 text-xs mt-0.5">Export clinical and operational reports</p>
      </div>

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
                  onClick={() => handleGeneratePreview(report.title)}
                  size="sm"
                  disabled={isGenerating}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center justify-center gap-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Generate Report</span>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Report Preview: {activeReportName}</DialogTitle>
            <DialogDescription>
              Previewing first {previewData?.rows.length} rows of the report data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto border border-slate-200 rounded-md my-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                <tr>
                  {previewData?.headers.map((h, i) => (
                    <th key={i} className="px-4 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewData?.rows.slice(0, 100).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-2 text-slate-700">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)} className="text-slate-500">
              Close Preview
            </Button>
            <div className="flex gap-2">
              <Button onClick={triggerDownloadCSV} variant="outline" className="text-slate-700">
                <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                CSV
              </Button>
              <Button onClick={triggerDownloadPDF} className="bg-slate-950 text-white hover:bg-slate-900">
                <FileText className="h-4 w-4 mr-1.5" />
                PDF
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
