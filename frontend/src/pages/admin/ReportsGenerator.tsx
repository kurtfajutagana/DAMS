import { useState, useMemo } from "react";
import {
  FileText,
  FileSpreadsheet,
  Eye,
  X,
  Search,
  Calendar,
  Banknote,
  Stethoscope,
  Users,
  CalendarCheck,
  Award,
  HeartPulse,
  Bot,
  Activity,
  Building2,
  Printer,
  ArrowUpDown,
  Filter
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../components/ui/select";
import { toast } from "sonner";
import { useOutletContext } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/dialog";
import DailyClinicalReportModal from "../../components/DailyClinicalReportModal";

export default function ReportsGenerator() {
  const { selectedBranch } = useOutletContext<{ selectedBranch: string }>();
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
  const [activeReportName, setActiveReportName] = useState("");
  const [previewData, setPreviewData] = useState<{ headers: string[], rows: string[][] } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Pure UI Filters
  const [searchPreviewQuery, setSearchPreviewQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedSort, setSelectedSort] = useState<string>("payment-desc");

  const fetchCSVData = async (reportName: string) => {
    const typeMap: Record<string, string> = {
      "Clinic Financial Status & Revenue Collection": "Financial",
      "Clinic Billing Verification Ledger": "Financial",
      "Dental Procedures": "Procedures",
      "Dental Procedures Only": "Procedures",
      "Top Dental Procedures & Treatments Breakdown": "Procedures",
      "Patient Demographics & Age Distribution": "Demographics",
      "Appointment History & Scheduling Log": "Appointments",
      "Top Performing Doctors & Clinical Ratings": "Dentists",
      "Patient Medication Adherence Review": "Clinical",
      "AI Triage Intent Performance Matrix": "AI Logs"
    };
    const reportType = typeMap[reportName] || reportName;
    
    let url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/reports/${encodeURIComponent(reportType)}`;
    if (selectedBranch && selectedBranch !== "All Branches") {
      url += `?branch_id=${encodeURIComponent(selectedBranch)}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to generate report");
    
    return { text: await response.text(), reportType };
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n').filter((row: string) => row.trim() !== '');
    if (lines.length < 1) return { headers: [], rows: [] };
    
    // Parse CSV line taking quotes into account
    const parseLine = (text: string) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(parseLine);
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
      setSelectedMonth("all");
      const isFin = /financial|revenue|billing/i.test(reportName);
      setSelectedSort(isFin ? "payment-desc" : "patient-asc");
      setIsPreviewOpen(true);
    } catch (error) {
      toast.error("Failed to generate report preview.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to parse numeric amount from strings like "₱1,500.00", "1,500.00", "1500"
  const parseAmount = (val: string | undefined): number => {
    if (!val) return 0;
    const clean = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const isFinancialReport = useMemo(() => {
    const name = activeReportName.toLowerCase();
    return name.includes("financial") || name.includes("revenue") || name.includes("billing");
  }, [activeReportName]);

  const columnIndices = useMemo(() => {
    if (!previewData || !previewData.headers) {
      return { branchIdx: -1, idIdx: 0, amountIdx: -1, statusIdx: -1, dateIdx: -1, patientIdx: -1 };
    }
    const headers = previewData.headers;
    const branchIdx = headers.findIndex(h => /branch/i.test(h));
    
    let idIdx = headers.findIndex(h => /invoice\s*id/i.test(h));
    if (idIdx === -1) {
      idIdx = headers.findIndex(h => /id$/i.test(h) || /^id/i.test(h) || /rank/i.test(h));
    }
    if (idIdx === -1) idIdx = 0;

    const amountIdx = headers.findIndex(h =>
      /amount|revenue|income|price|cost|fee/i.test(h) && !/rating|review/i.test(h)
    );

    const statusIdx = headers.findIndex(h => /status/i.test(h));
    const dateIdx = headers.findIndex(h => /date/i.test(h));
    const patientIdx = headers.findIndex(h => /patient|name/i.test(h) && !/branch/i.test(h));

    return { branchIdx, idIdx, amountIdx, statusIdx, dateIdx, patientIdx };
  }, [previewData]);

  // Dynamically extract all available months from the active report dataset
  const availableMonths = useMemo(() => {
    if (!previewData || !previewData.rows) return [];
    const { dateIdx } = columnIndices;
    if (dateIdx === -1) return [];
    const monthMap = new Map<string, string>();
    previewData.rows.forEach(r => {
      const dVal = (r[dateIdx] || '').trim();
      const match = dVal.match(/^(\d{4})-(\d{2})/);
      if (match) {
        const key = `${match[1]}-${match[2]}`;
        if (!monthMap.has(key)) {
          const year = parseInt(match[1]);
          const monthNum = parseInt(match[2]) - 1;
          const dateObj = new Date(year, monthNum, 1);
          const label = dateObj.toLocaleDateString("en-US", { month: "long", year: "numeric" });
          monthMap.set(key, label);
        }
      }
    });
    return Array.from(monthMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, label]) => ({ key, label }));
  }, [previewData, columnIndices]);

  // Available Sort Options based on active report columns
  const availableSortOptions = useMemo(() => {
    const { amountIdx, patientIdx, dateIdx } = columnIndices;
    const options: { id: string, label: string }[] = [];
    if (amountIdx !== -1) {
      options.push({ id: "payment-desc", label: "Payment: High → Low" });
      options.push({ id: "payment-asc", label: "Payment: Low → High" });
    }
    if (patientIdx !== -1) {
      options.push({ id: "patient-asc", label: "Patient Name: A → Z" });
      options.push({ id: "patient-desc", label: "Patient Name: Z → A" });
    }
    if (dateIdx !== -1) {
      options.push({ id: "date-desc", label: "Date: Newest First" });
      options.push({ id: "date-asc", label: "Date: Oldest First" });
    }
    options.push({ id: "id-asc", label: "Record / Invoice ID (Ascending)" });
    options.push({ id: "id-desc", label: "Record / Invoice ID (Descending)" });
    return options;
  }, [columnIndices]);

  const activeSortLabel = useMemo(() => {
    const found = availableSortOptions.find(s => s.id === selectedSort);
    return found ? found.label : (isFinancialReport ? "Payment: High → Low" : "Patient Name: A → Z");
  }, [selectedSort, availableSortOptions, isFinancialReport]);

  const activeReportingPeriod = useMemo(() => {
    if (selectedMonth !== "all") {
      const found = availableMonths.find(m => m.key === selectedMonth);
      return found ? found.label : selectedMonth;
    }
    if (availableMonths.length > 0) {
      return `All Records (${availableMonths[availableMonths.length - 1]?.label} – ${availableMonths[0]?.label})`;
    }
    return "All Available Records";
  }, [selectedMonth, availableMonths]);

  // Helper to sort rows based on selected sort option
  const sortRows = (rows: string[][]) => {
    const { amountIdx, patientIdx, idIdx, dateIdx } = columnIndices;
    return [...rows].sort((a, b) => {
      if (selectedSort === "payment-desc" && amountIdx !== -1) {
        const amtA = parseAmount(a[amountIdx]);
        const amtB = parseAmount(b[amountIdx]);
        if (amtB !== amtA) return amtB - amtA;
        if (patientIdx !== -1) {
          const pComp = (a[patientIdx] || '').localeCompare(b[patientIdx] || '', undefined, { sensitivity: 'base' });
          if (pComp !== 0) return pComp;
        }
      } else if (selectedSort === "payment-asc" && amountIdx !== -1) {
        const amtA = parseAmount(a[amountIdx]);
        const amtB = parseAmount(b[amountIdx]);
        if (amtA !== amtB) return amtA - amtB;
        if (patientIdx !== -1) {
          const pComp = (a[patientIdx] || '').localeCompare(b[patientIdx] || '', undefined, { sensitivity: 'base' });
          if (pComp !== 0) return pComp;
        }
      } else if (selectedSort === "patient-asc" && patientIdx !== -1) {
        const pComp = (a[patientIdx] || '').localeCompare(b[patientIdx] || '', undefined, { sensitivity: 'base' });
        if (pComp !== 0) return pComp;
      } else if (selectedSort === "patient-desc" && patientIdx !== -1) {
        const pComp = (b[patientIdx] || '').localeCompare(a[patientIdx] || '', undefined, { sensitivity: 'base' });
        if (pComp !== 0) return pComp;
      } else if (selectedSort === "date-desc" && dateIdx !== -1) {
        const dComp = (b[dateIdx] || '').localeCompare(a[dateIdx] || '');
        if (dComp !== 0) return dComp;
      } else if (selectedSort === "date-asc" && dateIdx !== -1) {
        const dComp = (a[dateIdx] || '').localeCompare(b[dateIdx] || '');
        if (dComp !== 0) return dComp;
      } else if (selectedSort === "id-desc") {
        const idA = (a[idIdx] || '').trim();
        const idB = (b[idIdx] || '').trim();
        return idB.localeCompare(idA, undefined, { numeric: true, sensitivity: 'base' });
      }
      // Fallback: Invoice / Record ID (Ascending)
      const idA = (a[idIdx] || '').trim();
      const idB = (b[idIdx] || '').trim();
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  // Redundant branch column is omitted from tables when records are already partitioned into branch sections!
  const visibleColumns = useMemo(() => {
    if (!previewData || !previewData.headers) return [];
    const { branchIdx } = columnIndices;
    return previewData.headers
      .map((name, origIdx) => ({ name, origIdx }))
      .filter(col => col.origIdx !== branchIdx);
  }, [previewData, columnIndices]);

  // Group report records by branch into separate tables, and sort each table by selectedSort!
  const groupedByBranch = useMemo(() => {
    if (!previewData || !previewData.rows) return [];
    const { branchIdx, amountIdx, dateIdx } = columnIndices;

    let filtered = previewData.rows;

    // 1. Month Filter (if selected)
    if (selectedMonth !== "all" && dateIdx !== -1) {
      filtered = filtered.filter(row => {
        const dVal = (row[dateIdx] || '').trim();
        return dVal.startsWith(selectedMonth);
      });
    }

    // 2. Search query filter
    if (searchPreviewQuery.trim()) {
      const q = searchPreviewQuery.toLowerCase();
      filtered = filtered.filter(row =>
        row.some(cell => cell.toLowerCase().includes(q))
      );
    }

    if (branchIdx === -1) {
      const sorted = sortRows(filtered);
      const total = amountIdx !== -1
        ? sorted.reduce((sum, r) => sum + parseAmount(r[amountIdx]), 0)
        : 0;
      return [{
        branchName: selectedBranch !== "All Branches" ? selectedBranch : "General System",
        rows: sorted,
        branchTotal: total
      }];
    }

    const groupsMap: Record<string, string[][]> = {};
    filtered.forEach(row => {
      const bName = (row[branchIdx] || "Unassigned Branch").trim() || "Unassigned Branch";
      if (!groupsMap[bName]) {
        groupsMap[bName] = [];
      }
      groupsMap[bName].push(row);
    });

    const sortedBranchNames = Object.keys(groupsMap).sort((a, b) => a.localeCompare(b));

    return sortedBranchNames.map(branchName => {
      const sortedRows = sortRows(groupsMap[branchName]);
      const branchTotal = amountIdx !== -1
        ? sortedRows.reduce((sum, r) => sum + parseAmount(r[amountIdx]), 0)
        : 0;
      return {
        branchName,
        rows: sortedRows,
        branchTotal
      };
    });
  }, [previewData, searchPreviewQuery, selectedMonth, selectedSort, columnIndices, selectedBranch]);

  const grandTotalIncome = useMemo(() => {
    return groupedByBranch.reduce((sum, g) => sum + g.branchTotal, 0);
  }, [groupedByBranch]);

  const totalMatchingRecords = useMemo(() => {
    return groupedByBranch.reduce((sum, g) => sum + g.rows.length, 0);
  }, [groupedByBranch]);

  // Financial status breakdown (Settled vs Pending) accurately scoped to filtered records
  const financialSummary = useMemo(() => {
    if (!isFinancialReport || !previewData) {
      return { totalPaid: 0, totalPending: 0, paidCount: 0, pendingCount: 0 };
    }
    const { amountIdx, statusIdx } = columnIndices;
    let totalPaid = 0;
    let totalPending = 0;
    let paidCount = 0;
    let pendingCount = 0;

    groupedByBranch.forEach(group => {
      group.rows.forEach(row => {
        const amt = amountIdx !== -1 ? parseAmount(row[amountIdx]) : 0;
        const st = statusIdx !== -1 ? (row[statusIdx] || '').toLowerCase() : '';
        if (st.includes('paid') || st.includes('completed') || st.includes('settled')) {
          totalPaid += amt;
          paidCount++;
        } else {
          totalPending += amt;
          pendingCount++;
        }
      });
    });

    return { totalPaid, totalPending, paidCount, pendingCount };
  }, [isFinancialReport, previewData, columnIndices, groupedByBranch]);

  const triggerDownloadCSV = async () => {
    try {
      if (!previewData || previewData.rows.length === 0) {
        toast.error("No data to download");
        return;
      }

      const { amountIdx } = columnIndices;
      const csvLines: string[] = [];
      
      // Header
      csvLines.push(previewData.headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","));

      // For each branch group
      groupedByBranch.forEach(group => {
        group.rows.forEach(row => {
          csvLines.push(row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(","));
        });

        // Branch Subtotal if financial report
        if (isFinancialReport && amountIdx !== -1) {
          const subtotalRow = new Array(previewData.headers.length).fill("");
          subtotalRow[0] = `"Total Income (${group.branchName})"`;
          subtotalRow[amountIdx] = `"${group.branchTotal.toFixed(2)}"`;
          csvLines.push(subtotalRow.join(","));
        }
      });

      // Overall Grand Total if financial report
      if (isFinancialReport && amountIdx !== -1) {
        csvLines.push("");
        const grandTotalRow = new Array(previewData.headers.length).fill("");
        grandTotalRow[0] = `"GRAND TOTAL INCOME (ALL BRANCHES)"`;
        grandTotalRow[amountIdx] = `"${grandTotalIncome.toFixed(2)}"`;
        csvLines.push(grandTotalRow.join(","));
      }

      const cleanText = csvLines.join("\n").replace(/[₱±]/g, '').replace(/â‚±/g, '');
      const blob = new Blob(["\uFEFF" + cleanText], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filePeriod = selectedMonth !== "all" ? selectedMonth : "all_records";
      a.download = `${activeReportName.replace(/\s+/g, '_').toLowerCase()}_${filePeriod}.csv`;
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
      const { amountIdx } = columnIndices;
      
      const doc = new jsPDF({
        orientation: visibleColumns.length > 6 ? "landscape" : "portrait",
        unit: "mm",
        format: "a4"
      });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Formal Letterhead
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont("helvetica", "bold");
      doc.text("TEETHTALK DENTAL CLINIC", 14, 16);
      
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.setFont("helvetica", "bold");
      doc.text("CLINICAL INFORMATION MANAGEMENT SYSTEM - OFFICIAL REPORT", 14, 21);

      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFont("helvetica", "normal");
      doc.text("Fairview Branch  *  Novaliches Branch  *  Manila Central Clinic", 14, 25.5);

      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`DOC-REF: REP-${activeReportName.replace(/[^A-Za-z]/g, '').substring(0, 5).toUpperCase()}-2026`, pageWidth - 65, 16);
      doc.text(`Printed: ${new Date().toLocaleString()}`, pageWidth - 65, 20.5);
      doc.text("Classification: OFFICIAL AUDIT", pageWidth - 65, 25);

      // Divider rule
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.6);
      doc.line(14, 28, pageWidth - 14, 28);

      // Metadata Box
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.3);
      doc.roundedRect(14, 31, pageWidth - 28, 14, 1.5, 1.5, "FD");

      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text("REPORT DOCUMENT:", 18, 35.5);
      doc.text("BRANCH SCOPE:", 85, 35.5);
      doc.text("PERIOD:", 135, 35.5);
      doc.text("AUDITED RECORDS:", pageWidth - 55, 35.5);

      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(activeReportName.length > 32 ? activeReportName.substring(0, 30) + '...' : activeReportName, 18, 41);
      doc.text(selectedBranch, 85, 41);
      doc.text(activeReportingPeriod, 135, 41);
      doc.text(`${totalMatchingRecords} (${groupedByBranch.length} branches)`, pageWidth - 55, 41);

      let currentY = 49;

      // If Financial: Total Gross Highlights Card
      if (isFinancialReport) {
        doc.setFillColor(240, 253, 244); // emerald-50
        doc.setDrawColor(134, 239, 172); // emerald-300
        doc.roundedRect(14, currentY, pageWidth - 28, 14, 2, 2, "FD");

        doc.setFontSize(7.5);
        doc.setTextColor(22, 101, 52); // emerald-800
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL CLINIC GROSS REVENUE (ALL BRANCHES):", 18, currentY + 5.5);
        
        doc.setFontSize(12);
        doc.setTextColor(21, 128, 61); // emerald-700
        doc.text(`PHP ${grandTotalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 18, currentY + 11);

        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "normal");
        doc.text(`Settled (Paid): PHP ${financialSummary.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${financialSummary.paidCount} inv)`, pageWidth - 100, currentY + 6);
        doc.text(`Pending: PHP ${financialSummary.totalPending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${financialSummary.pendingCount} inv)`, pageWidth - 100, currentY + 11);

        currentY += 18;
      }

      const visibleHeaders = visibleColumns.map(c => c.name.replace(/[₱±]/g, '').trim());
      const visibleAmountIdx = visibleColumns.findIndex(c => c.origIdx === amountIdx);

      // Render each branch table
      groupedByBranch.forEach((group) => {
        if (group.rows.length === 0) return;

        // Check page overflow for section header
        if (currentY > pageHeight - 35) {
          doc.addPage();
          currentY = 20;
        }

        // Branch Section Header Bar (Dark Slate Theme like Daily Clinical Report)
        doc.setFillColor(15, 23, 42); // slate-900
        doc.setDrawColor(15, 23, 42);
        doc.roundedRect(14, currentY, pageWidth - 28, 7.5, 1.2, 1.2, "FD");

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255); // White text
        doc.text(`Branch: ${group.branchName}`, 18, currentY + 5);

        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(203, 213, 225); // Slate-300
        let branchMetaText = `(${group.rows.length} ${group.rows.length === 1 ? 'record' : 'records'}, sorted by ${activeSortLabel})`;
        doc.text(branchMetaText, 70, currentY + 5);

        if (isFinancialReport) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(167, 243, 208); // Emerald-300
          const bTotText = `Branch Total: PHP ${group.branchTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          doc.text(bTotText, pageWidth - 18, currentY + 5, { align: "right" });
        }

        currentY += 10.5;

        const sanitizedRows = group.rows.map(row =>
          visibleColumns.map(col => {
            const cell = row[col.origIdx];
            return typeof cell === 'string' ? cell.replace(/[₱±]/g, '').trim() : (cell || '');
          })
        );

        let footRows: string[][] | undefined = undefined;
        if (isFinancialReport && visibleAmountIdx !== -1) {
          const footRow = new Array(visibleColumns.length).fill("");
          footRow[0] = `Subtotal (${group.branchName}):`;
          footRow[visibleAmountIdx] = `PHP ${group.branchTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          footRows = [footRow];
        }

        const columnStyles: Record<number, any> = {};
        if (visibleAmountIdx !== -1) {
          columnStyles[visibleAmountIdx] = { halign: 'right', fontStyle: 'bold' };
        }

        autoTable(doc, {
          head: [visibleHeaders],
          body: sanitizedRows,
          foot: footRows,
          startY: currentY,
          margin: { left: 14, right: 14 },
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          footStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
          columnStyles
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;
      });

      // If Financial Report and multiple branches: Render Final Grand Total Summary Table
      if (isFinancialReport && groupedByBranch.length > 1) {
        if (currentY > pageHeight - 45) {
          doc.addPage();
          currentY = 20;
        }

        const summaryBody = groupedByBranch.map(g => [
          g.branchName,
          `${g.rows.length} invoices`,
          `PHP ${g.branchTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `${grandTotalIncome > 0 ? ((g.branchTotal / grandTotalIncome) * 100).toFixed(1) : 0}%`
        ]);

        autoTable(doc, {
          head: [["Branch Summary", "Invoice Volume", "Branch Revenue (PHP)", "% Share"]],
          body: summaryBody,
          foot: [["GRAND TOTAL CLINIC REVENUE", `${totalMatchingRecords} invoices`, `PHP ${grandTotalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "100.0%"]],
          startY: currentY,
          margin: { left: 14, right: 14 },
          styles: { fontSize: 7.5, cellPadding: 2.2 },
          headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
          footStyles: { fillColor: [22, 101, 52], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'right', fontStyle: 'bold' },
            3: { halign: 'right' }
          }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      // Certification Block
      if (currentY > pageHeight - 35) {
        doc.addPage();
        currentY = 25;
      }

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(14, currentY, pageWidth - 14, currentY);
      currentY += 15;

      const colW = (pageWidth - 28) / 3;
      // 3 signature lines
      const sigTitles = [
        { name: "Prepared by: Billing & Records Officer", dept: "Administrative Directorate" },
        { name: "Audited by: Branch Operations Manager", dept: "Branch Operations & Audit" },
        { name: "Approved by: Medical Director / Lead Dentist", dept: "Clinical Executive Council" }
      ];

      sigTitles.forEach((sig, i) => {
        const x = 14 + i * colW + 4;
        const lineW = colW - 8;
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.4);
        doc.line(x, currentY, x + lineW, currentY);

        doc.setFontSize(6.8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(sig.name, x + lineW / 2, currentY + 3.5, { align: "center" });

        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(sig.dept, x + lineW / 2, currentY + 6.8, { align: "center" });
      });

      const filePeriod = selectedMonth !== "all" ? selectedMonth : "all_records";
      doc.save(`${reportType.replace(/\s+/g, '_').toLowerCase()}_report_${filePeriod}.pdf`);
      toast.success(`PDF Report generated successfully.`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF");
    }
  };

  // Generates clean, corporate, high-standard printable document HTML
  const generateDocumentHTML = () => {
    if (!previewData || previewData.rows.length === 0) return "";
    const { amountIdx, statusIdx, idIdx } = columnIndices;
    const dateGeneratedStr = new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short"
    });

    const isFinancial = isFinancialReport;
    const visibleCols = visibleColumns;

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${activeReportName} - TeethTalk Dental Clinic</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 14mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 8.5pt;
      line-height: 1.35;
    }
    .doc-wrap {
      width: 100%;
      max-width: 100%;
    }
    /* Clinic Formal Letterhead */
    .letterhead {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 8px;
      border-bottom: 2px solid #0f172a;
      margin-bottom: 12px;
    }
    .brand-col {
      flex: 1;
    }
    .clinic-title {
      font-size: 16pt;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #0f172a;
      text-transform: uppercase;
      line-height: 1.1;
      margin: 0;
    }
    .clinic-subtitle {
      font-size: 7.8pt;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-top: 3px;
    }
    .clinic-branches {
      font-size: 7.2pt;
      color: #64748b;
      margin-top: 2px;
    }
    .meta-col {
      text-align: right;
      font-size: 7.5pt;
      color: #475569;
    }
    .badge-pill {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-weight: 800;
      font-size: 7pt;
      padding: 2px 7px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .meta-line {
      margin-top: 1px;
    }

    /* Metadata Info Grid */
    .info-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 12px;
      display: table;
      width: 100%;
    }
    .info-row {
      display: table-row;
    }
    .info-cell {
      display: table-cell;
      padding: 3px 6px;
      width: 25%;
      vertical-align: top;
    }
    .info-label {
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.4px;
      margin-bottom: 2px;
    }
    .info-val {
      font-size: 8.5pt;
      font-weight: 800;
      color: #0f172a;
    }

    /* Executive Highlights */
    .highlights-wrap {
      display: table;
      width: 100%;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .highlight-card {
      display: table-cell;
      width: 33.333%;
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      background: #f8fafc;
      vertical-align: top;
    }
    .highlight-card:not(:last-child) {
      border-right: 6px solid #ffffff;
    }
    .highlight-card.primary {
      background: #f0fdf4;
      border-color: #86efac;
    }
    .highlight-label {
      font-size: 6.8pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.4px;
    }
    .highlight-card.primary .highlight-label {
      color: #166534;
    }
    .highlight-value {
      font-size: 13pt;
      font-weight: 900;
      color: #0f172a;
      margin-top: 2px;
    }
    .highlight-card.primary .highlight-value {
      color: #15803d;
    }
    .highlight-sub {
      font-size: 7pt;
      color: #64748b;
      margin-top: 1px;
    }

    /* Consolidated Branch Breakdown */
    .consolidated-box {
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 8pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #334155;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    /* Branch Sections */
    .branch-section {
      margin-bottom: 16px;
      page-break-inside: auto !important; /* CRITICAL: Enables natural multi-page flow without blanking page 1! */
    }
    .branch-header {
      background: #0f172a !important;
      color: #ffffff !important;
      border: 1px solid #0f172a;
      border-bottom: none;
      padding: 6px 10px;
      border-radius: 4px 4px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      page-break-after: avoid !important;
      page-break-inside: avoid !important;
    }
    .branch-header-title {
      font-size: 8.8pt;
      font-weight: 800;
      letter-spacing: 0.2px;
      color: #ffffff !important;
    }
    .branch-header-meta {
      font-size: 7.2pt;
      color: #cbd5e1 !important;
      font-weight: 600;
    }
    .branch-header-meta strong {
      color: #4ade80 !important;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto !important;
      font-size: 7.2pt;
      border: 1px solid #cbd5e1;
    }
    thead {
      display: table-header-group !important; /* Repeats table header across pages! */
    }
    tr {
      page-break-inside: avoid !important;
      page-break-after: auto;
    }
    th {
      background: #f8fafc;
      color: #1e293b;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 6.6pt;
      letter-spacing: 0.4px;
      padding: 4px 6px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }
    th.text-right, td.text-right {
      text-align: right;
    }
    th.text-center, td.text-center {
      text-align: center;
    }
    td {
      padding: 4px 6px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .mono-id {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
      color: #334155;
    }
    .currency-val {
      font-weight: 800;
      color: #0f172a;
    }
    .badge-status {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 2px;
      font-weight: 700;
      font-size: 6.2pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .status-paid {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #86efac;
    }
    .status-pending {
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
    }
    .status-default {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
    }
    tfoot td {
      background: #0f172a !important;
      color: #ffffff !important;
      font-weight: 800;
      border-top: 1px solid #1e293b;
      padding: 5px 8px;
    }
    tfoot td.subtotal-label {
      color: #cbd5e1 !important;
      text-transform: uppercase;
      font-size: 7.2pt;
      letter-spacing: 0.4px;
    }
    tfoot td.subtotal-val {
      color: #4ade80 !important;
      font-size: 8.5pt;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 900;
    }

    /* Grand Total Banner */
    .grand-total-strip {
      background: #f0fdf4;
      border: 1.5px solid #86efac;
      color: #14532d;
      padding: 7px 12px;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .grand-total-lbl {
      font-size: 8.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #166534;
    }
    .grand-total-amount {
      font-size: 13pt;
      font-weight: 900;
      color: #15803d;
    }

    /* Sign-off & Legal Certification Block */
    .cert-section {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px dashed #cbd5e1;
      page-break-inside: avoid !important;
    }
    .sign-table {
      width: 100%;
      border: none;
      margin-top: 24px;
      margin-bottom: 14px;
    }
    .sign-table td {
      border: none;
      background: transparent !important;
      padding: 0 14px;
      vertical-align: top;
      text-align: center;
    }
    .sign-rule {
      border-top: 1px solid #0f172a;
      margin-bottom: 4px;
    }
    .sign-officer {
      font-size: 7.8pt;
      font-weight: 800;
      color: #0f172a;
    }
    .sign-title {
      font-size: 6.8pt;
      color: #64748b;
    }
    .disclaimer-text {
      font-size: 6.5pt;
      color: #64748b;
      text-align: center;
      line-height: 1.3;
      margin-top: 8px;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="doc-wrap">
    <!-- Letterhead -->
    <div class="letterhead">
      <div class="brand-col">
        <h1 class="clinic-title">TeethTalk Dental Clinic</h1>
        <div class="clinic-subtitle">Clinical Information Management System &bull; Official Operations Ledger</div>
        <div class="clinic-branches">Fairview Branch &bull; Novaliches Branch &bull; Manila Central Clinic</div>
      </div>
      <div class="meta-col">
        <div><span class="badge-pill">Official Ledger</span></div>
        <div class="meta-line">Document Ref: <strong>DOC-${activeReportName.replace(/[^A-Za-z]/g, '').substring(0, 6).toUpperCase()}-2026</strong></div>
        <div class="meta-line">Classification: <strong>Confidential / Audited</strong></div>
        <div class="meta-line">Printed: <strong>${dateGeneratedStr}</strong></div>
      </div>
    </div>

    <!-- Metadata Grid -->
    <div class="info-card">
      <div class="info-row">
        <div class="info-cell">
          <div class="info-label">Report Document</div>
          <div class="info-val">${activeReportName}</div>
        </div>
        <div class="info-cell">
          <div class="info-label">Branch Scope</div>
          <div class="info-val">${selectedBranch}</div>
        </div>
        <div class="info-cell">
          <div class="info-label">Reporting Period</div>
          <div class="info-val">${activeReportingPeriod}</div>
        </div>
        <div class="info-cell">
          <div class="info-label">Audited Records</div>
          <div class="info-val">${totalMatchingRecords} Across ${groupedByBranch.length} Branch Table(s)</div>
        </div>
      </div>
    </div>
`;

    if (isFinancial) {
      html += `
    <!-- Executive Financial Highlights -->
    <div class="highlights-wrap">
      <div class="highlight-card primary">
        <div class="highlight-label">Total Gross Clinic Income</div>
        <div class="highlight-value">PHP ${grandTotalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div class="highlight-sub">${totalMatchingRecords} Total Invoices Billed</div>
      </div>
      <div class="highlight-card">
        <div class="highlight-label">Settled / Collected (Paid)</div>
        <div class="highlight-value">PHP ${financialSummary.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div class="highlight-sub">${financialSummary.paidCount} Invoices Settled</div>
      </div>
      <div class="highlight-card">
        <div class="highlight-label">Pending Receivables</div>
        <div class="highlight-value">PHP ${financialSummary.totalPending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div class="highlight-sub">${financialSummary.pendingCount} Invoices Awaiting Settlement</div>
      </div>
    </div>
`;

      if (groupedByBranch.length > 1) {
        html += `
    <!-- Consolidated Branch Summary Table -->
    <div class="consolidated-box">
      <div class="section-title">Consolidated Branch Revenue Summary</div>
      <table>
        <thead>
          <tr>
            <th>Branch Name</th>
            <th class="text-center">Total Invoices</th>
            <th class="text-right">Total Revenue (PHP)</th>
            <th class="text-right">% Share of Clinic Income</th>
          </tr>
        </thead>
        <tbody>
          ${groupedByBranch.map(g => {
            const share = grandTotalIncome > 0 ? (g.branchTotal / grandTotalIncome) * 100 : 0;
            return `
            <tr>
              <td><strong>${g.branchName}</strong></td>
              <td class="text-center">${g.rows.length}</td>
              <td class="text-right currency-val">PHP ${g.branchTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="text-right">${share.toFixed(1)}%</td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td>GRAND TOTAL (ALL BRANCHES)</td>
            <td class="text-center">${totalMatchingRecords}</td>
            <td class="text-right currency-val" style="color: #15803d; font-size: 8pt;">PHP ${grandTotalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right">100.0%</td>
          </tr>
        </tfoot>
      </table>
    </div>
`;
      }
    }

    groupedByBranch.forEach(group => {
      if (group.rows.length === 0) return;

      let branchMeta = `${group.rows.length} ${group.rows.length === 1 ? 'record' : 'records'} (Sorted by ${activeSortLabel})`;
      if (isFinancial) {
        branchMeta += ` &bull; <strong>Branch Total: PHP ${group.branchTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>`;
      }

      html += `
    <div class="branch-section">
      <div class="branch-header">
        <span class="branch-header-title">Branch: ${group.branchName}</span>
        <span class="branch-header-meta">${branchMeta}</span>
      </div>
      <table>
        <thead>
          <tr>
            ${visibleCols.map(col => {
              const isAmt = col.origIdx === amountIdx;
              const isSt = col.origIdx === statusIdx;
              const alignClass = isAmt ? ' class="text-right"' : (isSt ? ' class="text-center"' : '');
              return `<th${alignClass}>${col.name}</th>`;
            }).join('')}
          </tr>
        </thead>
        <tbody>
          ${group.rows.map(row => `
            <tr>
              ${visibleCols.map(col => {
                const val = row[col.origIdx] || '';
                const isId = col.origIdx === idIdx;
                const isAmt = col.origIdx === amountIdx;
                const isSt = col.origIdx === statusIdx;

                if (isId) {
                  return `<td class="mono-id">${val}</td>`;
                }
                if (isAmt) {
                  return `<td class="text-right currency-val">PHP ${val}</td>`;
                }
                if (isSt) {
                  const lower = val.toLowerCase();
                  const badgeClass = lower.includes('paid') || lower.includes('completed') || lower.includes('settled')
                    ? 'status-paid'
                    : (lower.includes('pending') ? 'status-pending' : 'status-default');
                  return `<td class="text-center"><span class="badge-status ${badgeClass}">${val}</span></td>`;
                }
                return `<td>${val}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
`;

      if (isFinancial && amountIdx !== -1) {
        const visibleAmountIdx = visibleCols.findIndex(c => c.origIdx === amountIdx);
        const colSpanBefore = visibleAmountIdx > 0 ? visibleAmountIdx : 1;
        const colSpanAfter = visibleCols.length - colSpanBefore - 1;

        html += `
        <tfoot>
          <tr>
            <td colspan="${colSpanBefore}" class="subtotal-label" style="text-align: right;">
              Subtotal Income (${group.branchName}):
            </td>
            <td class="text-right subtotal-val">
              PHP ${group.branchTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            ${colSpanAfter > 0 ? `<td colspan="${colSpanAfter}"></td>` : ''}
          </tr>
        </tfoot>
`;
      }

      html += `
      </table>
    </div>
`;
    });

    if (isFinancial) {
      html += `
    <div class="grand-total-strip">
      <div class="grand-total-lbl">Grand Total Clinic Income (All Branches)</div>
      <div class="grand-total-amount">PHP ${grandTotalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>
`;
    }

    html += `
    <!-- Sign-off & Audit Certification -->
    <div class="cert-section">
      <table class="sign-table">
        <tr>
          <td>
            <div class="sign-rule"></div>
            <div class="sign-officer">Prepared by: Billing & Records Officer</div>
            <div class="sign-title">Administrative Operations Directorate</div>
          </td>
          <td>
            <div class="sign-rule"></div>
            <div class="sign-officer">Audited by: Branch Operations Manager</div>
            <div class="sign-title">Quality Assurance & Branch Audit</div>
          </td>
          <td>
            <div class="sign-rule"></div>
            <div class="sign-officer">Approved by: Medical Director / Lead Dentist</div>
            <div class="sign-title">TeethTalk Clinical Executive Council</div>
          </td>
        </tr>
      </table>
      <div class="disclaimer-text">
        CONFIDENTIAL & CERTIFIED: This document is an official administrative and clinical operational ledger generated by the TeethTalk Dental Clinic Management System. Records contained herein are deemed authentic and valid for clinical compliance, administrative audit, and financial reconciliation.
      </div>
    </div>
  </div>
</body>
</html>`;

    return html;
  };

  const handlePrint = () => {
    try {
      if (!previewData || previewData.rows.length === 0) {
        toast.error("Not enough data to print");
        return;
      }

      const html = generateDocumentHTML();

      // Avoid opening empty about:blank tab by printing via hidden iframe
      let printFrame = document.getElementById('report-print-frame') as HTMLIFrameElement | null;
      if (printFrame) {
        printFrame.remove();
      }

      printFrame = document.createElement('iframe') as HTMLIFrameElement;
      printFrame.id = 'report-print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.style.visibility = 'hidden';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow?.document;
      if (!frameDoc) {
        window.print();
        return;
      }

      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();

      setTimeout(() => {
        try {
          printFrame?.contentWindow?.focus();
          printFrame?.contentWindow?.print();
        } catch (e) {
          console.error("Print frame trigger failed:", e);
        }
      }, 350);
    } catch (err) {
      console.error("Print error:", err);
      toast.error("Failed to initialize print dialog.");
    }
  };

  const reports = [
    {
      title: "Daily Clinical Operations & Patient Roster",
      description: "Real-time daily patient roster, attending doctor allocations, visit attendance statuses, and procedure breakdown.",
      type: "Daily Clinical",
      icon: Activity,
      accentColor: "border-t-indigo-600",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      iconBg: "bg-indigo-50 text-indigo-600",
      buttonColor: "bg-indigo-600 hover:bg-indigo-700",
      isDailyModal: true
    },
    {
      title: "Clinic Financial Status & Revenue Collection",
      description: "Itemized billing invoices, collection status, procedure invoice codes, payment methods, and revenue.",
      type: "Financial",
      icon: Banknote,
      accentColor: "border-t-emerald-500",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      iconBg: "bg-emerald-50 text-emerald-600",
      buttonColor: "bg-emerald-600 hover:bg-emerald-700"
    },
    {
      title: "Dental Procedures",
      description: "Procedure frequencies, most popular treatments, estimated revenue contribution, and average pricing.",
      type: "Procedures",
      icon: Stethoscope,
      accentColor: "border-t-indigo-500",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      iconBg: "bg-indigo-50 text-indigo-600",
      buttonColor: "bg-indigo-600 hover:bg-indigo-700"
    },
    {
      title: "Patient Demographics & Age Distribution",
      description: "Patient population distribution, age categories (child, young adult, adult, senior), and branch mapping.",
      type: "Demographics",
      icon: Users,
      accentColor: "border-t-sky-500",
      badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
      iconBg: "bg-sky-50 text-sky-600",
      buttonColor: "bg-sky-600 hover:bg-sky-700"
    },
    {
      title: "Appointment History & Scheduling Log",
      description: "Complete appointment booking history, attending dentist assignments, requested procedures, and attendance status.",
      type: "Appointments",
      icon: CalendarCheck,
      accentColor: "border-t-amber-500",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      iconBg: "bg-amber-50 text-amber-600",
      buttonColor: "bg-amber-600 hover:bg-amber-700"
    },
    {
      title: "Top Performing Doctors & Clinical Ratings",
      description: "Doctor clinical ratings, review counts, completed patient consultations, and performance tiers.",
      type: "Dentists",
      icon: Award,
      accentColor: "border-t-rose-500",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      iconBg: "bg-rose-50 text-rose-600",
      buttonColor: "bg-rose-600 hover:bg-rose-700"
    },
    {
      title: "Patient Medication Adherence Review",
      description: "Adherence logs, missed dosage alerts, and intent analysis summaries for high-risk patients.",
      type: "Clinical",
      icon: HeartPulse,
      accentColor: "border-t-purple-500",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      iconBg: "bg-purple-50 text-purple-600",
      buttonColor: "bg-purple-600 hover:bg-purple-700"
    },
    {
      title: "AI Triage Intent Performance Matrix",
      description: "Statistics on chatbot conversations, intent classification confidence, and automated scheduling rate.",
      type: "AI Logs",
      icon: Bot,
      accentColor: "border-t-teal-500",
      badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
      iconBg: "bg-teal-50 text-teal-600",
      buttonColor: "bg-teal-600 hover:bg-teal-700"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Reports Generator - {selectedBranch}</h1>
          <p className="text-slate-500 text-sm mt-1">Export clinical and operational reports</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Available Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <Card key={report.title} className={`border-slate-200 bg-white flex flex-col justify-between shadow-sm border-t-4 ${report.accentColor} hover:shadow-md transition-all rounded-2xl`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${report.badgeColor} uppercase tracking-wider`}>
                      {report.type}
                    </span>
                    <div className={`p-2 rounded-xl ${report.iconBg}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <CardTitle className="text-base font-bold text-slate-950 pt-2">
                    {report.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 pt-1 leading-relaxed">
                    {report.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2 flex flex-col gap-2">
                  <Button
                    onClick={() => report.isDailyModal ? setIsDailyReportOpen(true) : handleGeneratePreview(report.title)}
                    size="sm"
                    disabled={isGenerating && !report.isDailyModal}
                    className={`w-full ${report.buttonColor} text-white font-semibold text-xs h-10 flex items-center justify-center gap-1.5 shadow-xs rounded-xl`}
                  >
                    <Eye className="h-4 w-4" />
                    <span>Generate Report</span>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl w-[96vw] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-2xl">
          {/* Top Control & Action Bar */}
          <div className="bg-white px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 text-slate-900 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-2xs">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-950 flex items-center gap-2">
                  <span>{activeReportName}</span>
                  <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 border-slate-200 font-bold">
                    {selectedBranch}
                  </Badge>
                </DialogTitle>
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                  <span>{totalMatchingRecords} total records across {groupedByBranch.length} branch table(s)</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[10px]">
                    Period: {activeReportingPeriod}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handlePrint} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8.5 px-3.5 rounded-xl shadow-xs gap-1.5">
                <Printer className="h-3.5 w-3.5" />
                Print Document
              </Button>
              <Button onClick={triggerDownloadPDF} size="sm" variant="outline" className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold h-8.5 px-3 rounded-xl shadow-2xs gap-1.5">
                <FileText className="h-3.5 w-3.5 text-rose-500" />
                Export PDF
              </Button>
              <Button onClick={triggerDownloadCSV} size="sm" variant="outline" className="bg-white hover:bg-slate-50 text-emerald-700 border border-slate-200 text-xs font-semibold h-8.5 px-3 rounded-xl shadow-2xs gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                CSV
              </Button>
              <Button onClick={() => setIsPreviewOpen(false)} size="sm" variant="ghost" className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 h-8.5 w-8.5 p-0 rounded-xl">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Interactive Customization Toolbar (Month, Sort, Search) like Daily Clinical Report */}
          <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center shrink-0">
            {/* SELECT MONTH */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-400" />
                Select Month
              </label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-8.5 text-xs bg-white border-slate-200 rounded-xl font-medium shadow-2xs">
                  <SelectValue placeholder="All Recorded Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Recorded Months (Full Period)</SelectItem>
                  {availableMonths.map(m => (
                    <SelectItem key={m.key} value={m.key}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SELECT SORT */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <ArrowUpDown className="h-3 w-3 text-slate-400" />
                Sort Records By
              </label>
              <Select value={selectedSort} onValueChange={setSelectedSort}>
                <SelectTrigger className="h-8.5 text-xs bg-white border-slate-200 rounded-xl font-medium shadow-2xs">
                  <SelectValue placeholder="Sort order..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSortOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SEARCH FILTER */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Search className="h-3 w-3 text-slate-400" />
                Search Filter
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter records, patient, service..."
                  value={searchPreviewQuery}
                  onChange={(e) => setSearchPreviewQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 h-8.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors shadow-2xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Canvas Container with Realistic Centered Paper Sheet */}
          <div className="flex-1 overflow-y-auto bg-slate-100/70 p-4 sm:p-6">
            <div className="mx-auto w-full max-w-4xl bg-white text-slate-900 shadow-sm border border-slate-200/90 rounded-2xl p-6 sm:p-10 font-sans space-y-6">
              
              {/* Formal Letterhead */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-3 border-b border-slate-200">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight text-slate-950">
                    TeethTalk Dental Clinic
                  </h1>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-0.5">
                    Clinical Information Management System &bull; Official Operations Ledger
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Fairview Branch &bull; Novaliches Branch &bull; Manila Central Clinic
                  </p>
                </div>

                <div className="text-left sm:text-right text-xs text-slate-500 space-y-0.5">
                  <div>
                    <span className="inline-block bg-slate-100 text-slate-800 border border-slate-200 font-extrabold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">
                      Official Audit Ledger
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Doc Ref: <strong className="text-slate-900">DOC-{activeReportName.replace(/[^A-Za-z]/g, '').substring(0, 6).toUpperCase()}-2026</strong>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Classification: <strong className="text-slate-900">Confidential / Audited</strong>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Printed: {new Date().toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Metadata Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Report Document</span>
                  <strong className="text-slate-900 text-xs block truncate" title={activeReportName}>{activeReportName}</strong>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branch Scope</span>
                  <strong className="text-slate-900 text-xs block">{selectedBranch}</strong>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reporting Period</span>
                  <strong className="text-slate-900 text-xs block">{activeReportingPeriod}</strong>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Audited Records</span>
                  <strong className="text-slate-900 text-xs block">{totalMatchingRecords} Across {groupedByBranch.length} Branch Table(s)</strong>
                </div>
              </div>

              {/* Executive Financial Highlights (if Financial Report) */}
              {isFinancialReport && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5">
                      <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Total Gross Clinic Income</span>
                      <span className="text-xl font-black text-emerald-950 block mt-1 font-mono">
                        ₱{grandTotalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-emerald-700/80 mt-0.5 block font-medium">
                        {totalMatchingRecords} Invoices Billed
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Settled / Collected (Paid)</span>
                      <span className="text-xl font-black text-slate-900 block mt-1 font-mono">
                        ₱{financialSummary.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block font-medium">
                        {financialSummary.paidCount} Invoices Settled
                      </span>
                    </div>

                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5">
                      <span className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider">Pending Receivables</span>
                      <span className="text-xl font-black text-amber-950 block mt-1 font-mono">
                        ₱{financialSummary.totalPending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-amber-700/80 mt-0.5 block font-medium">
                        {financialSummary.pendingCount} Invoices Awaiting Settlement
                      </span>
                    </div>
                  </div>

                  {/* Consolidated Branch Revenue Summary Table */}
                  {groupedByBranch.length > 1 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-100/70 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Consolidated Branch Revenue Summary</span>
                        <span className="text-[10px] text-slate-400 font-medium">3 Branch Facilities</span>
                      </div>
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                          <tr>
                            <th className="px-3.5 py-2 text-left">Branch Name</th>
                            <th className="px-3.5 py-2 text-center">Total Invoices</th>
                            <th className="px-3.5 py-2 text-right">Branch Revenue</th>
                            <th className="px-3.5 py-2 text-right">% Share</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {groupedByBranch.map((g, i) => {
                            const share = grandTotalIncome > 0 ? (g.branchTotal / grandTotalIncome) * 100 : 0;
                            return (
                              <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-3.5 py-2 font-bold text-slate-900">{g.branchName}</td>
                                <td className="px-3.5 py-2 text-center text-slate-600">{g.rows.length}</td>
                                <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-900">
                                  ₱{g.branchTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3.5 py-2 text-right text-slate-500 font-semibold">{share.toFixed(1)}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-950">
                          <tr>
                            <td className="px-3.5 py-2 font-black uppercase text-[11px]">Grand Total (All Branches)</td>
                            <td className="px-3.5 py-2 text-center">{totalMatchingRecords}</td>
                            <td className="px-3.5 py-2 text-right font-mono font-black text-emerald-700 text-sm">
                              ₱{grandTotalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-3.5 py-2 text-right text-slate-900">100.0%</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Branch Partitioned Sections */}
              <div className="space-y-6 pt-2">
                {groupedByBranch.length > 0 && totalMatchingRecords > 0 ? (
                  groupedByBranch.map((group, gIdx) => {
                    if (group.rows.length === 0) return null;
                    const { amountIdx, idIdx, statusIdx } = columnIndices;
                    return (
                      <div key={gIdx} className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                        {/* Branch Title Ribbon (Dark Themed like Daily Clinical Report) */}
                        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-white">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-indigo-400" />
                            <span className="font-extrabold text-sm tracking-wide text-white">Branch: {group.branchName}</span>
                            <span className="text-[10px] text-slate-300 font-medium">
                              ({group.rows.length} {group.rows.length === 1 ? 'record' : 'records'})
                            </span>
                            <span className="text-[10px] font-semibold text-slate-200 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md">
                              Sorted by: {activeSortLabel}
                            </span>
                          </div>

                          {isFinancialReport && (
                            <div className="text-right flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 uppercase font-semibold">Branch Total:</span>
                              <span className="font-mono font-black text-emerald-400 text-sm bg-slate-800/90 border border-slate-700 px-2.5 py-0.5 rounded-md">
                                ₱{group.branchTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Clean Light Table (Redundant branch column omitted) */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[9.5px] tracking-wider border-b border-slate-200">
                              <tr>
                                {visibleColumns.map((col, cIdx) => {
                                  const isAmt = col.origIdx === amountIdx;
                                  const isSt = col.origIdx === statusIdx;
                                  return (
                                    <th
                                      key={cIdx}
                                      className={`px-3.5 py-2.5 whitespace-nowrap ${isAmt ? 'text-right' : (isSt ? 'text-center' : 'text-left')}`}
                                    >
                                      {col.name}
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-800">
                              {group.rows.map((row, rIdx) => (
                                <tr key={rIdx} className={rIdx % 2 === 1 ? "bg-slate-50/50" : "bg-white"}>
                                  {visibleColumns.map((col, cIdx) => {
                                    const val = row[col.origIdx] || '';
                                    const isId = col.origIdx === idIdx;
                                    const isAmt = col.origIdx === amountIdx;
                                    const isSt = col.origIdx === statusIdx;

                                    if (isId) {
                                      return (
                                        <td key={cIdx} className="px-3.5 py-2.5 whitespace-nowrap font-mono font-bold text-slate-900">
                                          {val}
                                        </td>
                                      );
                                    }
                                    if (isAmt) {
                                      return (
                                        <td key={cIdx} className="px-3.5 py-2.5 whitespace-nowrap text-right font-mono font-bold text-slate-900">
                                          ₱{val}
                                        </td>
                                      );
                                    }
                                    if (isSt) {
                                      const lower = val.toLowerCase();
                                      const isPaid = lower.includes('paid') || lower.includes('completed') || lower.includes('settled');
                                      const isPending = lower.includes('pending');
                                      return (
                                        <td key={cIdx} className="px-3.5 py-2.5 whitespace-nowrap text-center">
                                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                            isPending ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                            'bg-slate-100 text-slate-700 border border-slate-200'
                                          }`}>
                                            {val}
                                          </span>
                                        </td>
                                      );
                                    }
                                    return (
                                      <td key={cIdx} className="px-3.5 py-2.5 whitespace-nowrap text-slate-700 font-medium">
                                        {val}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>

                            {/* Branch Subtotal Row (Dark Themed like Daily Clinical Report) */}
                            {isFinancialReport && amountIdx !== -1 && (
                              <tfoot className="bg-slate-900 text-white border-t border-slate-800 font-bold">
                                <tr>
                                  {(() => {
                                    const visibleAmountIdx = visibleColumns.findIndex(c => c.origIdx === amountIdx);
                                    const colSpanBefore = visibleAmountIdx > 0 ? visibleAmountIdx : 1;
                                    const colSpanAfter = visibleColumns.length - colSpanBefore - 1;
                                    return (
                                      <>
                                        <td colSpan={colSpanBefore} className="px-3.5 py-2.5 text-right font-extrabold uppercase text-[10px] text-slate-300">
                                          Subtotal Income ({group.branchName}):
                                        </td>
                                        <td className="px-3.5 py-2.5 text-right font-mono font-black text-emerald-400 text-sm whitespace-nowrap">
                                          ₱{group.branchTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        {colSpanAfter > 0 && <td colSpan={colSpanAfter} className="px-3.5 py-2.5" />}
                                      </>
                                    );
                                  })()}
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    <Search className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700">No matching records found.</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try refining your search filter.</p>
                  </div>
                )}
              </div>

              {/* Grand Total Strip (if Financial) */}
              {isFinancialReport && (
                <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
                      Grand Total Clinic Revenue (All Branches)
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      Consolidated from {groupedByBranch.length} active dental facility ledgers
                    </span>
                  </div>
                  <span className="text-2xl font-black text-emerald-700 tracking-tight font-mono">
                    ₱{grandTotalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Sign-off & Audit Certification Block */}
              <div className="pt-8 border-t border-dashed border-slate-200 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center pt-4">
                  <div>
                    <div className="h-0.5 bg-slate-900 w-3/4 mx-auto mb-2" />
                    <strong className="text-xs text-slate-900 block font-extrabold">Prepared by: Billing &amp; Records Officer</strong>
                    <span className="text-[10px] text-slate-500 block">Administrative Operations Directorate</span>
                  </div>
                  <div>
                    <div className="h-0.5 bg-slate-900 w-3/4 mx-auto mb-2" />
                    <strong className="text-xs text-slate-900 block font-extrabold">Audited by: Branch Operations Manager</strong>
                    <span className="text-[10px] text-slate-500 block">Quality Assurance &amp; Branch Audit</span>
                  </div>
                  <div>
                    <div className="h-0.5 bg-slate-900 w-3/4 mx-auto mb-2" />
                    <strong className="text-xs text-slate-900 block font-extrabold">Approved by: Medical Director / Lead Dentist</strong>
                    <span className="text-[10px] text-slate-500 block">TeethTalk Clinical Executive Council</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 text-center italic leading-relaxed pt-2">
                  CONFIDENTIAL &amp; CERTIFIED: This document is an official administrative and clinical operational ledger generated by the TeethTalk Dental Clinic Management System. Records contained herein are deemed authentic and valid for clinical compliance, administrative audit, and financial reconciliation.
                </p>
              </div>

            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DAILY CLINICAL REPORT MODAL */}
      <DailyClinicalReportModal
        isOpen={isDailyReportOpen}
        onClose={() => setIsDailyReportOpen(false)}
        initialBranchId={selectedBranch}
        initialBranchName={selectedBranch}
      />
    </div>
  );
}
