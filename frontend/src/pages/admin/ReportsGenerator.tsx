import React, { useState, useMemo } from "react";
import { FileText, FileSpreadsheet, Eye, X, Search, Calendar } from "lucide-react";
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

  // Pure UI Filters
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-09-05");
  const [searchPreviewQuery, setSearchPreviewQuery] = useState("");

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
      setSearchPreviewQuery("");
      setIsPreviewOpen(true);
    } catch (error) {
      toast.error("Failed to generate report preview.");
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredPreviewRows = useMemo(() => {
    if (!previewData || !previewData.rows) return [];
    if (!searchPreviewQuery.trim()) return previewData.rows;
    return previewData.rows.filter(row =>
      row.some(cell => cell.toLowerCase().includes(searchPreviewQuery.toLowerCase()))
    );
  }, [previewData, searchPreviewQuery]);

  const triggerDownloadCSV = async () => {
    try {
      const { text, reportType } = await fetchCSVData(activeReportName);
      const blob = new Blob([text], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType.replace(' ', '_').toLowerCase()}_report_${startDate}_to_${endDate}.csv`;
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
      doc.text(`Date Range: ${startDate} to ${endDate}`, 14, 42);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 48);

      autoTable(doc, {
        head: [previewData.headers],
        body: filteredPreviewRows,
        startY: 54,
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Reports Generator - {selectedBranch}</h1>
          <p className="text-slate-500 text-sm mt-1">Export clinical and operational reports</p>
        </div>

        {/* Date Range Selector Controls */}
        <div className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-lg shadow-xs">
          <Calendar className="h-4 w-4 text-slate-400 ml-1" />
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <span>From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            <span>To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Available Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {reports.map((report) => (
            <Card key={report.title} className="border-slate-200 bg-white flex flex-col justify-between shadow-sm">
              <CardHeader className="pb-3">
                <span className="text-xs font-bold bg-slate-950 text-white px-2.5 py-0.5 rounded-md w-max uppercase tracking-wider">
                  {report.type}
                </span>
                <CardTitle className="text-base font-bold text-slate-955 pt-2">
                  {report.title}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 pt-1 leading-relaxed">
                  {report.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 flex flex-col gap-2">
                <Button
                  onClick={() => handleGeneratePreview(report.title)}
                  size="sm"
                  disabled={isGenerating}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-10 flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Eye className="h-4 w-4" />
                  <span>Generate Report</span>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold text-slate-955">Report Preview: {activeReportName}</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 flex items-center justify-between">
              <span>Date Range: {startDate} to {endDate} ({filteredPreviewRows.length} matching rows)</span>
            </DialogDescription>

            {/* Preview Modal Search Input */}
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search within report preview..."
                value={searchPreviewQuery}
                onChange={(e) => setSearchPreviewQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-950/20 focus:border-slate-900 transition-colors"
              />
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto border border-slate-200 rounded-lg my-3">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  {previewData?.headers.map((h, i) => (
                    <th key={i} className="px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredPreviewRows.length > 0 ? (
                  filteredPreviewRows.slice(0, 100).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      {row.map((cell, j) => (
                        <td key={j} className="px-4 py-3 text-slate-700">{cell}</td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={previewData?.headers.length || 1} className="py-8 text-center text-slate-400 text-sm font-medium">
                      No matching records found in preview.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter className="flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)} className="text-slate-600 text-sm font-semibold h-10 border-slate-300">
              Close Preview
            </Button>
            <div className="flex gap-2">
              <Button onClick={triggerDownloadCSV} variant="outline" className="text-slate-800 text-sm font-semibold h-10 border-slate-300">
                <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                CSV Export
              </Button>
              <Button onClick={triggerDownloadPDF} className="bg-slate-950 text-white hover:bg-slate-900 text-sm font-semibold h-10 px-5">
                <FileText className="h-4 w-4 mr-1.5" />
                PDF Export
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
