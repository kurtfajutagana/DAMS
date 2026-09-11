import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { 
  Building2, 
  ClipboardList, 
  CheckCircle2, 
  Search, 
  Calendar, 
  User, 
  Stethoscope, 
  Banknote, 
  FileText, 
  TrendingUp, 
  RotateCcw,
  Users
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import UniversalPatientRecordModal from "../../components/UniversalPatientRecordModal";

export default function VisitLogs() {
  const { profile } = useAuth();
  const [visitLogs, setVisitLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // "all" | "today" | "week" | "month" | "custom"
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dentistFilter, setDentistFilter] = useState("all");
  const [treatmentFilter, setTreatmentFilter] = useState("all");

  // Universal Patient Record Viewer State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedPatientName, setSelectedPatientName] = useState("");

  const fetchVisitLogs = async () => {
    try {
      setLoading(true);
      let url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/staff/visit-logs`;
      if (profile?.branch_id) {
        url += `?branch_id=${encodeURIComponent(profile.branch_id)}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      const formattedLogs = (data || []).map((item) => {
        const d = new Date(item.created_at || item.appointment_date);
        return {
          id: item.id,
          patientId: item.patient_id,
          rawDate: d,
          date: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          patient: `${item.patient?.first_name || ''} ${item.patient?.last_name || ''}`.trim() || "Patient",
          dentist: item.dentist ? `Dr. ${item.dentist.first_name} ${item.dentist.last_name}` : "Any Available",
          branch: item.branch?.branch_name || "Pasig",
          treatment: item.service_requested || "General Consultation",
          rawFee: typeof item.consultation_fee === "number" ? item.consultation_fee : (parseFloat(item.consultation_fee) || 0),
          fee: item.consultation_fee && item.consultation_fee !== "N/A" ? `₱${Number(item.consultation_fee).toLocaleString()}.00` : "₱ N/A"
        };
      });
      setVisitLogs(formattedLogs);
    } catch (error) {
      console.error("Error fetching visit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitLogs();
  }, [profile?.branch_id]);

  // Dynamic filter options
  const uniqueDentists = useMemo(() => {
    const set = new Set();
    visitLogs.forEach(l => {
      if (l.dentist && l.dentist !== "Any Available") set.add(l.dentist);
    });
    return Array.from(set);
  }, [visitLogs]);

  const uniqueTreatments = useMemo(() => {
    const set = new Set();
    visitLogs.forEach(l => {
      if (l.treatment) set.add(l.treatment);
    });
    return Array.from(set);
  }, [visitLogs]);

  // Filtered logs calculation
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();

    return visitLogs.filter(log => {
      // 1. Search query filter
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        !searchQuery ||
        log.patient.toLowerCase().includes(q) ||
        log.dentist.toLowerCase().includes(q) ||
        log.treatment.toLowerCase().includes(q) ||
        log.branch.toLowerCase().includes(q);

      // 2. Dentist filter
      const matchesDentist = dentistFilter === "all" || log.dentist === dentistFilter;

      // 3. Treatment filter
      const matchesTreatment = treatmentFilter === "all" || log.treatment === treatmentFilter;

      // 4. Date filter
      let matchesDate = true;
      const logDate = log.rawDate;

      if (dateFilter === "today") {
        matchesDate = logDate.toDateString() === todayStr;
      } else if (dateFilter === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        matchesDate = logDate >= weekAgo;
      } else if (dateFilter === "month") {
        matchesDate = logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
      } else if (dateFilter === "custom") {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (logDate < start) matchesDate = false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (logDate > end) matchesDate = false;
        }
      }

      return matchesSearch && matchesDentist && matchesTreatment && matchesDate;
    });
  }, [visitLogs, searchQuery, dentistFilter, treatmentFilter, dateFilter, startDate, endDate]);

  // Summary Metrics
  const stats = useMemo(() => {
    const totalVisits = filteredLogs.length;
    const totalRevenue = filteredLogs.reduce((sum, log) => sum + (log.rawFee || 0), 0);
    const uniquePatients = new Set(filteredLogs.map(l => l.patient)).size;
    
    // Top treatment
    const counts = {};
    filteredLogs.forEach(l => {
      counts[l.treatment] = (counts[l.treatment] || 0) + 1;
    });
    let topTreatment = "None";
    let topCount = 0;
    Object.entries(counts).forEach(([t, c]) => {
      if (c > topCount) {
        topCount = c;
        topTreatment = t;
      }
    });

    return { totalVisits, totalRevenue, uniquePatients, topTreatment };
  }, [filteredLogs]);

  const handleOpenRecord = (log) => {
    if (log.patientId) {
      setSelectedPatientId(log.patientId);
      setSelectedPatientName(log.patient);
      setIsRecordModalOpen(true);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setDateFilter("all");
    setStartDate("");
    setEndDate("");
    setDentistFilter("all");
    setTreatmentFilter("all");
  };

  const hasActiveFilters = searchQuery || dateFilter !== "all" || dentistFilter !== "all" || treatmentFilter !== "all" || startDate || endDate;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2.5">
            <ClipboardList className="h-6 w-6 text-indigo-600" /> Patient Visit Logs
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">Archived patient check-ins, completed clinical sessions, and consultation history.</p>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed Visits</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.totalVisits}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Archived clinical sessions</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue / Fees</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-1">₱{stats.totalRevenue.toLocaleString()}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">From completed visits</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Banknote className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unique Patients</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.uniquePatients}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Individuals served</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Top Procedure</p>
              <h3 className="text-base font-bold text-slate-900 mt-1 truncate max-w-[150px]" title={stats.topTreatment}>
                {stats.topTreatment}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Most frequent service</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card with Filter Controls */}
      <Card className="border border-slate-200/80 shadow-md bg-white rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 p-5 bg-slate-50/50 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">Historical Check-Ins & Clinical Sessions</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Showing {filteredLogs.length} of {visitLogs.length} total completed visits
              </CardDescription>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-slate-600 hover:text-slate-900 h-8 gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
              </Button>
            )}
          </div>

          {/* Interactive Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search patient, doctor, treatment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-white rounded-xl border-slate-200"
              />
            </div>

            {/* Timeframe Presets */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-9 text-xs bg-white rounded-xl border-slate-200">
                <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                <SelectValue placeholder="Filter by Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today Only</SelectItem>
                <SelectItem value="week">Past 7 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="custom">Custom Date Range</SelectItem>
              </SelectContent>
            </Select>

            {/* Dentist Dropdown */}
            <Select value={dentistFilter} onValueChange={setDentistFilter}>
              <SelectTrigger className="h-9 text-xs bg-white rounded-xl border-slate-200">
                <User className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                <SelectValue placeholder="All Dentists" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dentists</SelectItem>
                {uniqueDentists.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Treatment Dropdown */}
            <Select value={treatmentFilter} onValueChange={setTreatmentFilter}>
              <SelectTrigger className="h-9 text-xs bg-white rounded-xl border-slate-200">
                <Stethoscope className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                <SelectValue placeholder="All Treatments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Treatments</SelectItem>
                {uniqueTreatments.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range Picker Row (Only visible when 'custom' is selected) */}
          {dateFilter === "custom" && (
            <div className="flex flex-wrap items-center gap-3 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="text-xs font-semibold text-slate-600">Date Range:</span>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-xs bg-white rounded-lg border-slate-200 w-36"
                />
                <span className="text-xs text-slate-400">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-xs bg-white rounded-lg border-slate-200 w-36"
                />
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-16 text-center text-slate-400 font-medium">Loading visit logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">No completed visit logs match your criteria.</p>
              <p className="text-xs text-slate-400">Try adjusting your search query, date filter, or dropdown options.</p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-2 text-xs rounded-xl">
                  Clear All Filters
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-100/80 border-b border-slate-200">
                <TableRow className="border-b border-slate-200">
                  <TableHead className="px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">Date & Time</TableHead>
                  <TableHead className="py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">Patient Name</TableHead>
                  <TableHead className="py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">Branch</TableHead>
                  <TableHead className="py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">Attending Dentist</TableHead>
                  <TableHead className="py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">Treatment</TableHead>
                  <TableHead className="py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">Fee</TableHead>
                  <TableHead className="py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                    <TableCell className="px-6 py-4 text-sm whitespace-nowrap">
                      <span className="font-bold text-slate-900 block">{log.date}</span>
                      <span className="text-slate-500 text-xs font-medium">{log.time}</span>
                    </TableCell>
                    <TableCell className="py-4 font-semibold text-slate-900">
                      {log.patient}
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className="text-xs font-semibold bg-slate-50 text-slate-700 border-slate-200">
                        <Building2 className="w-3 h-3 mr-1 text-slate-400" />
                        {log.branch} Branch
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 text-slate-700 text-sm font-medium">{log.dentist}</TableCell>
                    <TableCell className="py-4 text-slate-800 text-sm font-semibold">{log.treatment}</TableCell>
                    <TableCell className="py-4 text-emerald-700 font-bold text-sm font-mono">{log.fee}</TableCell>
                    <TableCell className="py-4">
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-50 rounded-full font-bold text-xs">
                        Completed
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      {log.patientId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenRecord(log)}
                          className="h-8 text-xs font-semibold rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1 text-indigo-600" /> View Record
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Universal Patient Record Modal */}
      {selectedPatientId && (
        <UniversalPatientRecordModal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          patientId={selectedPatientId}
          patientName={selectedPatientName}
        />
      )}
    </div>
  );
}

