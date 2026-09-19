import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Printer,
  FileSpreadsheet,
  Download,
  Calendar,
  Users,
  Stethoscope,
  Activity,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Building2
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../lib/supabase";

export default function DailyClinicalReportModal({
  isOpen,
  onClose,
  initialBranchId = null,
  initialBranchName = "All Branches",
  lockedBranchId = null, // If passed (e.g. for receptionist/dentist), strictly locks report to this branch
  lockedDentistId = null, // If passed, limits report to this doctor
  dentistName = null
}) {
  const [activeTab, setActiveTab] = useState("patients"); // "patients" | "procedures"
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  const [branches, setBranches] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedDentist, setSelectedDentist] = useState(lockedDentistId || "all");

  // Helper to map branch name or ID to an existing branch ID in DB
  const resolveBranchId = (bInput, branchList) => {
    if (!bInput || bInput === "all" || bInput === "All Branches") return "all";
    if (branchList.some(b => b.id === bInput)) return bInput;
    const clean = String(bInput).replace(/branch/i, "").trim().toLowerCase();
    const found = branchList.find(b => 
      b.branch_name.toLowerCase().includes(clean) || 
      clean.includes(b.branch_name.toLowerCase())
    );
    if (found) return found.id;
    return bInput;
  };

  useEffect(() => {
    const target = lockedBranchId || initialBranchId;
    if (!target || target === "all" || target === "All Branches") {
      setSelectedBranch("all");
    } else {
      setSelectedBranch(resolveBranchId(target, branches));
    }
  }, [lockedBranchId, initialBranchId, isOpen, branches]);

  const activeBranch = lockedBranchId ? resolveBranchId(lockedBranchId, branches) : selectedBranch;

  // Filter dentists so staff only see dentists assigned to their station branch
  const visibleDentists = useMemo(() => {
    if (activeBranch && activeBranch !== "all" && activeBranch !== "All Branches") {
      return dentists.filter(d => d.branch_id === activeBranch);
    }
    return dentists;
  }, [dentists, activeBranch]);

  useEffect(() => {
    if (selectedDentist !== "all") {
      const exists = visibleDentists.some(d => d.id === selectedDentist);
      if (!exists) setSelectedDentist("all");
    }
  }, [visibleDentists, selectedDentist]);

  const currentBranchName = useMemo(() => {
    if (!activeBranch || activeBranch === "all" || activeBranch === "All Branches") return "All Branches";
    const found = branches.find(b => b.id === activeBranch);
    if (found) return `${found.branch_name} Branch`;
    if (typeof initialBranchName === "string" && initialBranchName !== "All Branches") return initialBranchName;
    if (typeof activeBranch === "string" && !activeBranch.includes("-")) return activeBranch;
    return "Clinic Branch";
  }, [branches, activeBranch, initialBranchName]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({
    appointments: [],
    treatments: [],
    procedure_breakdown: [],
    status_summary: { total: 0, waiting: 0, in_progress: 0, completed: 0, scheduled: 0, pending: 0, cancelled: 0 }
  });

  const printRef = useRef(null);

  // Fetch branches and dentists
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [bRes, dRes] = await Promise.all([
          supabase.from("branches").select("id, branch_name").eq("is_active", true),
          supabase.from("profiles").select("id, first_name, last_name, branch_id").eq("role", "dentist")
        ]);
        if (bRes.data) setBranches(bRes.data);
        if (dRes.data) setDentists(dRes.data);
      } catch (err) {
        console.error("Error loading branches/dentists for report:", err);
      }
    };
    if (isOpen) {
      fetchMetadata();
    }
  }, [isOpen]);

  // Fetch report data
  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/staff/reports/daily-summary?target_date=${selectedDate}`;
      if (activeBranch && activeBranch !== "all") {
        url += `&branch_id=${activeBranch}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        // Direct Supabase fallback
        const dayStart = `${selectedDate}T00:00:00`;
        const dayEnd = `${selectedDate}T23:59:59`;
        let q = supabase
          .from("appointments")
          .select("*, patient:profiles!appointments_patient_id_fkey(first_name, last_name, contact_number), dentist:profiles!appointments_dentist_id_fkey(first_name, last_name), branch:branches!appointments_branch_id_fkey(id, branch_name)")
          .gte("appointment_date", dayStart)
          .lte("appointment_date", dayEnd);

        if (activeBranch && activeBranch !== "all") {
          q = q.eq("branch_id", activeBranch);
        }
        const { data: apts } = await q;

        const appointments = apts || [];
        const procCounts = {};
        appointments.forEach(a => {
          const s = a.service_requested || "General Consultation";
          if (!procCounts[s]) procCounts[s] = { count: 0, total_fee: 500 };
          procCounts[s].count++;
        });

        setReportData({
          date: selectedDate,
          appointments,
          procedure_breakdown: Object.entries(procCounts).map(([k, v]) => ({
            procedure_name: k,
            count: v.count,
            estimated_fee: v.count * 500
          })),
          status_summary: {
            total: appointments.length,
            waiting: appointments.filter(a => a.status === "waiting").length,
            in_progress: appointments.filter(a => a.status === "in_progress").length,
            completed: appointments.filter(a => a.status === "completed").length,
            scheduled: appointments.filter(a => a.status === "scheduled").length,
            pending: appointments.filter(a => a.status === "pending").length,
            cancelled: appointments.filter(a => a.status === "cancelled").length
          }
        });
      }
    } catch (err) {
      console.error("Failed to load report data:", err);
      toast.error("Could not load report data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReport();
    }
  }, [isOpen, selectedDate, activeBranch]);

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return (reportData.appointments || []).filter(apt => {
      // Dentist filter
      const targetDoc = lockedDentistId || (selectedDentist !== "all" ? selectedDentist : null);
      if (targetDoc && apt.dentist_id !== targetDoc) return false;

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const pName = `${apt.patient?.first_name || ""} ${apt.patient?.last_name || ""}`.toLowerCase();
      const service = (apt.service_requested || "").toLowerCase();
      const doctor = `${apt.dentist?.first_name || ""} ${apt.dentist?.last_name || ""}`.toLowerCase();
      return pName.includes(q) || service.includes(q) || doctor.includes(q);
    });
  }, [reportData.appointments, selectedDentist, lockedDentistId, searchQuery]);

  // Filter procedures
  const filteredProcedures = useMemo(() => {
    return (reportData.procedure_breakdown || []).filter(item => {
      if (!searchQuery.trim()) return true;
      return item.procedure_name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [reportData.procedure_breakdown, searchQuery]);

  const getStatusBadge = (status) => {
    switch ((status || "").toLowerCase()) {
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[10px]">In Progress</Badge>;
      case "waiting":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-bold text-[10px]">Waiting</Badge>;
      case "scheduled":
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 font-bold text-[10px]">Scheduled</Badge>;
      case "cancelled":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-[10px]">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-600 text-[10px]">{status || "Pending"}</Badge>;
    }
  };

  // PDF Export
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF("landscape");
      doc.setFontSize(16);
      doc.text("TEETH TALK DENTAL CLINIC", 14, 15);
      doc.setFontSize(11);
      doc.setTextColor(100);
      const bText = selectedBranch === "all" ? "All Clinic Branches" : (branches.find(b => b.id === selectedBranch)?.branch_name || "Clinic Branch");
      doc.text(`Daily Clinical Roster & Procedure Report • ${bText}`, 14, 22);
      doc.text(`Date of Report: ${selectedDate} | Generated at: ${new Date().toLocaleTimeString()}`, 14, 28);

      if (activeTab === "patients") {
        const tableRows = filteredAppointments.map((apt, idx) => [
          idx + 1,
          new Date(apt.appointment_date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          `${apt.patient?.first_name || ""} ${apt.patient?.last_name || "Walk-In Patient"}`,
          apt.patient?.contact_number || "N/A",
          apt.service_requested || "General Consultation",
          apt.dentist ? `Dr. ${apt.dentist.first_name} ${apt.dentist.last_name}` : "Any Doctor",
          apt.status?.toUpperCase() || "PENDING"
        ]);

        autoTable(doc, {
          startY: 34,
          head: [["#", "Time", "Patient Name", "Contact", "Service / Procedure", "Attending Dentist", "Status"]],
          body: tableRows,
          theme: "grid",
          headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [248, 250, 252] }
        });
      } else {
        const tableRows = filteredProcedures.map((item, idx) => [
          idx + 1,
          item.procedure_name,
          item.count,
          `PHP ${(item.estimated_fee || 0).toLocaleString()}`
        ]);

        autoTable(doc, {
          startY: 34,
          head: [["#", "Procedure Name", "Total Cases Scheduled / Performed", "Estimated Procedure Value"]],
          body: tableRows,
          theme: "grid",
          headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [248, 250, 252] }
        });
      }

      doc.save(`TeethTalk_${activeTab}_report_${selectedDate}.pdf`);
      toast.success("PDF report downloaded successfully!");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to generate PDF.");
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    try {
      let csvContent = "";
      if (activeTab === "patients") {
        csvContent = "Number,Time,Patient Name,Contact,Procedure,Attending Dentist,Status\n";
        filteredAppointments.forEach((apt, idx) => {
          const time = new Date(apt.appointment_date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
          const pName = `"${apt.patient?.first_name || ""} ${apt.patient?.last_name || "Walk-In"}"`;
          const contact = `"${apt.patient?.contact_number || "N/A"}"`;
          const service = `"${apt.service_requested || "General Consultation"}"`;
          const doc = `"${apt.dentist ? `Dr. ${apt.dentist.first_name} ${apt.dentist.last_name}` : "Pending"}"`;
          const status = `"${apt.status || "pending"}"`;
          csvContent += `${idx + 1},${time},${pName},${contact},${service},${doc},${status}\n`;
        });
      } else {
        csvContent = "Number,Procedure Name,Total Cases,Estimated Value (PHP)\n";
        filteredProcedures.forEach((item, idx) => {
          csvContent += `${idx + 1},"${item.procedure_name}",${item.count},${item.estimated_fee || 0}\n`;
        });
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `TeethTalk_${activeTab}_report_${selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV export downloaded successfully!");
    } catch (err) {
      console.error("CSV export error:", err);
      toast.error("Failed to export CSV.");
    }
  };

  // Native Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-slate-200">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black tracking-tight text-slate-950">
                    Daily Clinical &amp; Procedure Report
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Operational summaries, today's patient roster, and procedure breakdowns
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Quick Export Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-8 text-xs font-semibold gap-1.5 rounded-lg border-slate-200 hover:bg-slate-100"
              >
                <Printer className="h-3.5 w-3.5 text-slate-600" /> Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                className="h-8 text-xs font-semibold gap-1.5 rounded-lg border-slate-200 hover:bg-slate-100 text-rose-700"
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-8 text-xs font-semibold gap-1.5 rounded-lg border-slate-200 hover:bg-slate-100 text-emerald-700"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200/60 mt-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Select Date
              </label>
              <Input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="h-8 text-xs rounded-lg font-medium"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Clinic Branch
              </label>
              {lockedBranchId ? (
                <div className="h-8 px-2.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between gap-1.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">{currentBranchName}</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-indigo-200 text-indigo-700 bg-indigo-50 shrink-0 font-bold">
                    Station Locked
                  </Badge>
                </div>
              ) : (
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="h-8 text-xs rounded-lg">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Branches (3)</SelectItem>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">
                        {b.branch_name} Branch
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Attending Dentist
              </label>
              {lockedDentistId ? (
                <div className="h-8 px-2.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center">
                  Dr. {dentistName || "Assigned Doctor"}
                </div>
              ) : (
                <Select value={selectedDentist} onValueChange={setSelectedDentist}>
                  <SelectTrigger className="h-8 text-xs rounded-lg">
                    <SelectValue placeholder="All Dentists" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      {lockedBranchId ? `All ${currentBranchName} Dentists` : "All Dentists"}
                    </SelectItem>
                    {visibleDentists.map(d => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">
                        Dr. {d.first_name} {d.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Search Roster
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Patient, procedure, doctor..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-8 text-xs pl-8 rounded-lg"
                />
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-6 space-y-5" ref={printRef}>
          {/* Telemetry Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Patients</span>
              <span className="text-xl font-black text-slate-900 mt-0.5 block">{reportData.status_summary?.total || 0}</span>
            </div>
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block">Waiting</span>
              <span className="text-xl font-black text-blue-900 mt-0.5 block">{reportData.status_summary?.waiting || 0}</span>
            </div>
            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
              <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider block">In Progress</span>
              <span className="text-xl font-black text-amber-900 mt-0.5 block">{reportData.status_summary?.in_progress || 0}</span>
            </div>
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">Completed</span>
              <span className="text-xl font-black text-emerald-900 mt-0.5 block">{reportData.status_summary?.completed || 0}</span>
            </div>
            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">Scheduled</span>
              <span className="text-xl font-black text-indigo-900 mt-0.5 block">{reportData.status_summary?.scheduled || 0}</span>
            </div>
          </div>

          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              <TabsTrigger value="patients" className="rounded-lg text-xs font-bold gap-1.5 px-4">
                <Users className="h-3.5 w-3.5" /> All Patients Today ({filteredAppointments.length})
              </TabsTrigger>
              <TabsTrigger value="procedures" className="rounded-lg text-xs font-bold gap-1.5 px-4">
                <Stethoscope className="h-3.5 w-3.5" /> All Procedures Summary ({filteredProcedures.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: ALL PATIENTS TODAY */}
            <TabsContent value="patients" className="pt-3">
              {loading ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  <p className="text-xs font-medium">Loading clinical roster...</p>
                </div>
              ) : filteredAppointments.length > 0 ? (
                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Time</th>
                        <th className="py-2.5 px-3">Patient Name</th>
                        <th className="py-2.5 px-3">Contact</th>
                        <th className="py-2.5 px-3">Procedure Requested</th>
                        <th className="py-2.5 px-3">Attending Dentist</th>
                        <th className="py-2.5 px-3">Branch</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {filteredAppointments.map((apt, idx) => {
                        const d = new Date(apt.appointment_date);
                        const bName = apt.branch?.branch_name || apt.branch || "Pasig Branch";
                        return (
                          <tr key={apt.id || idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                              {d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {apt.patient ? `${apt.patient.first_name} ${apt.patient.last_name}` : "Walk-In Patient"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {apt.patient?.contact_number || "—"}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-700">
                              {apt.service_requested || "General Consultation"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {apt.dentist ? `Dr. ${apt.dentist.first_name} ${apt.dentist.last_name}` : "Any Doctor"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-medium">
                              {bName.replace(/\s+Branch$/i, "")}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {getStatusBadge(apt.status)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                  <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">No appointments scheduled for this day</h4>
                  <p className="text-xs text-slate-400 mt-1">Try selecting another date or clinic branch above.</p>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: ALL PROCEDURES SUMMARY */}
            <TabsContent value="procedures" className="pt-3">
              {loading ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  <p className="text-xs font-medium">Aggregating procedures...</p>
                </div>
              ) : filteredProcedures.length > 0 ? (
                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <tr>
                        <th className="py-2.5 px-4">#</th>
                        <th className="py-2.5 px-4">Procedure / Treatment Name</th>
                        <th className="py-2.5 px-4 text-center">Total Cases Today</th>
                        <th className="py-2.5 px-4 text-right">Estimated Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {filteredProcedures.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-teal-600 shrink-0" />
                            {item.procedure_name}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge className="bg-slate-100 text-slate-800 border-slate-200 font-extrabold text-xs px-2.5 py-0.5">
                              {item.count} {item.count === 1 ? "case" : "cases"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-emerald-600 text-sm">
                            ₱{(item.estimated_fee || 0).toLocaleString()}.00
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                  <Stethoscope className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">No procedures logged for this date</h4>
                  <p className="text-xs text-slate-400 mt-1">Procedure statistics will populate as appointments are booked and completed.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl font-bold text-xs h-9 px-4">
            Close Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

