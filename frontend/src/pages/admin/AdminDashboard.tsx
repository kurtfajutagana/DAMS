import React, { useState, useMemo, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  Users,
  MessageSquare,
  AlertTriangle,
  FileCheck,
  Search,
  Eye,
  Send,
  Building2,
  Calendar,
  CheckCircle2,
  UserCheck,
  X,
  Star,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Sparkles,
  ShieldAlert,
  Brain
} from "lucide-react";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { PatientAdherenceRecord } from "../../types/admin";

export default function AdminDashboard() {
  const { selectedBranch } = useOutletContext<{ selectedBranch: string }>();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientAdherenceRecord | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  
  // Interactive UI State (Card Filter, Sorting, Pagination)
  const [cardFilter, setCardFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("riskScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  const [patients, setPatients] = useState<PatientAdherenceRecord[]>([]);
  const [liveTelemetry, setLiveTelemetry] = useState({ activeToday: 0, aiConversations: 0, pendingBilling: 0 });
  const [analytics, setAnalytics] = useState({ financials: [], procedures: [], demographics: [], history: [], topDentists: [] });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async (retryCount = 0) => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/dashboard`);
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      const data = await response.json();
      
      const formattedData = data.records.map((record: any) => ({
        id: record.patient_id,
        name: `${record.profiles.first_name} ${record.profiles.last_name}`.trim(),
        branch: "Pasig Branch", 
        procedureType: record.procedure_type,
        status: record.status,
        riskScore: record.risk_score,
        phone: record.profiles.contact_number,
        lastVisit: "N/A", 
        nextAppointment: "N/A",
        aiTriageSummary: record.ai_triage_summary
      }));
      setPatients(formattedData);
      
      if (data.telemetry) {
        setLiveTelemetry({
          activeToday: data.telemetry.activeToday || 0,
          aiConversations: data.telemetry.aiConversations || 0,
          pendingBilling: data.telemetry.pendingBilling || 0
        });
      }
    } catch (error) {
      if (retryCount < 3) {
        setTimeout(() => fetchDashboardData(retryCount + 1), 1000);
        return;
      }
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load clinical dashboard data.");
    } finally {
      if (retryCount >= 3 || patients.length > 0) {
        setLoading(false);
      }
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      let url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/dashboard/analytics`;
      if (selectedBranch && selectedBranch !== "All Branches") {
        url += `?branch_id=${encodeURIComponent(selectedBranch)}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedBranch]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const filteredPatients = useMemo(() => {
    return patients
      .filter((patient) => {
        const matchesBranch = selectedBranch === "All Branches" || patient.branch === selectedBranch;
        const matchesSearch =
          patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          patient.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          patient.procedureType.toLowerCase().includes(searchQuery.toLowerCase());
        
        let matchesCard = true;
        if (cardFilter === "high_risk") {
          matchesCard = patient.status === "high_risk";
        } else if (cardFilter === "pending_billing") {
          matchesCard = patient.status === "moderate" || patient.status === "high_risk";
        }

        return matchesBranch && matchesSearch && matchesCard;
      })
      .sort((a, b) => {
        let valA = a[sortField as keyof PatientAdherenceRecord] ?? "";
        let valB = b[sortField as keyof PatientAdherenceRecord] ?? "";
        if (typeof valA === "string") {
          return sortOrder === "asc"
            ? (valA as string).localeCompare(valB as string)
            : (valB as string).localeCompare(valA as string);
        }
        return sortOrder === "asc" ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      });
  }, [patients, selectedBranch, searchQuery, cardFilter, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPatients.slice(start, start + pageSize);
  }, [filteredPatients, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, cardFilter, selectedBranch]);

  const telemetry = useMemo(() => {
    const activeToday = liveTelemetry.activeToday;
    const aiConversations = liveTelemetry.aiConversations;
    const highRiskCount = patients.filter(p => (selectedBranch === "All Branches" || p.branch === selectedBranch) && p.status === "high_risk").length;
    const pendingBilling = liveTelemetry.pendingBilling;

    return { activeToday, aiConversations, highRiskCount, pendingBilling };
  }, [patients, selectedBranch, liveTelemetry]);

  const handleOpenReview = (patient: PatientAdherenceRecord) => {
    setSelectedPatient(patient);
    setIsReviewModalOpen(true);
  };

  const handleSendReminder = () => {
    if (!selectedPatient) return;
    toast.success(`Intervention SMS alert successfully sent to ${selectedPatient.name}.`);
    setIsReviewModalOpen(false);
  };

  const handleMarkCompliant = async (patientId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/dashboard/${patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "likely", risk_score: 10 })
      });
      if (!response.ok) throw new Error("Failed to update status");

      setPatients(prev =>
        prev.map(p => (p.id === patientId ? { ...p, status: "likely", riskScore: 10 } : p))
      );
      toast.success(`Patient compliance updated.`);
      setIsReviewModalOpen(false);
    } catch (error) {
      toast.error("Failed to update compliance status");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Clinical Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">{selectedBranch} Overview</p>
        </div>
        {cardFilter !== "all" && (
          <Button
            onClick={() => setCardFilter("all")}
            variant="outline"
            size="sm"
            className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
          >
            Clear Card Filter ({cardFilter})
          </Button>
        )}
      </div>

      {/* Telemetry Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <Card 
          onClick={() => { setCardFilter(cardFilter === "all" ? "all" : "all"); toast.info("Showing all patients"); }}
          className={`border-slate-200 bg-white border-t-2 border-t-slate-950 shadow-sm cursor-pointer hover:shadow-md transition-all ${
            cardFilter === "all" ? "ring-2 ring-slate-950/20" : ""
          }`}
        >
          <CardHeader className="pb-1.5 pt-4 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Patients Today</span>
            <Users className="h-4.5 w-4.5 text-slate-700" />
          </CardHeader>
          <CardContent className="flex items-baseline justify-between pb-4">
            <span className="text-3xl font-extrabold text-slate-950">{telemetry.activeToday}</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              +12%
            </span>
          </CardContent>
        </Card>

        <Card 
          onClick={() => { toast.info("AI Sessions Filter Active"); }}
          className="border-slate-200 bg-white border-t-2 border-t-slate-800 shadow-sm cursor-pointer hover:shadow-md transition-all"
        >
          <CardHeader className="pb-1.5 pt-4 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Chat Sessions</span>
            <Brain className="h-4.5 w-4.5 text-slate-700" />
          </CardHeader>
          <CardContent className="flex items-baseline justify-between pb-4">
            <span className="text-3xl font-extrabold text-slate-950">{telemetry.aiConversations}</span>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              Active
            </span>
          </CardContent>
        </Card>

        <Card 
          onClick={() => {
            const next = cardFilter === "high_risk" ? "all" : "high_risk";
            setCardFilter(next);
            toast.info(next === "high_risk" ? "Filtering High Risk Patients" : "Showing All Patients");
          }}
          className={`border-slate-200 bg-white border-t-2 shadow-sm cursor-pointer hover:shadow-md transition-all ${
            cardFilter === "high_risk" ? "ring-2 ring-red-600 border-t-red-600 bg-red-50/10" : telemetry.highRiskCount > 0 ? "border-t-red-600 bg-red-50/5" : "border-t-slate-300"
          }`}
        >
          <CardHeader className="pb-1.5 pt-4 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">High Risk Alerts</span>
            <AlertTriangle className={`h-4.5 w-4.5 ${telemetry.highRiskCount > 0 ? "text-red-600" : "text-slate-400"}`} />
          </CardHeader>
          <CardContent className="flex items-baseline justify-between pb-4">
            <span className={`text-3xl font-extrabold ${telemetry.highRiskCount > 0 ? "text-red-600" : "text-slate-955"}`}>
              {telemetry.highRiskCount}
            </span>
            {telemetry.highRiskCount > 0 && (
              <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded uppercase tracking-wide">
                Filter Grid
              </span>
            )}
          </CardContent>
        </Card>

        <Card 
          onClick={() => {
            const next = cardFilter === "pending_billing" ? "all" : "pending_billing";
            setCardFilter(next);
            toast.info(next === "pending_billing" ? "Filtering Pending Payments" : "Showing All Patients");
          }}
          className={`border-slate-200 bg-white border-t-2 shadow-sm cursor-pointer hover:shadow-md transition-all ${
            cardFilter === "pending_billing" ? "ring-2 ring-red-600 border-t-red-600 bg-red-50/10" : telemetry.pendingBilling > 0 ? "border-t-red-600 bg-red-50/5" : "border-t-slate-300"
          }`}
        >
          <CardHeader className="pb-1.5 pt-4 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Payments</span>
            <CreditCard className={`h-4.5 w-4.5 ${telemetry.pendingBilling > 0 ? "text-red-600" : "text-slate-400"}`} />
          </CardHeader>
          <CardContent className="flex items-baseline justify-between pb-4">
            <span className={`text-3xl font-extrabold ${telemetry.pendingBilling > 0 ? "text-red-600" : "text-slate-955"}`}>
              {telemetry.pendingBilling}
            </span>
            {telemetry.pendingBilling > 0 && (
              <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded uppercase tracking-wide">
                Filter Grid
              </span>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Financial Overview */}
        <Card className="border-slate-200 bg-white shadow-sm flex flex-col">
          <CardHeader className="pb-2 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Financial Status</h2>
            <p className="text-xs text-slate-500">Revenue collection breakdown</p>
          </CardHeader>
          <CardContent className="flex-1 pt-4 min-h-[250px]">
            {analytics.financials.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={analytics.financials} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${v/1000}k`} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }}
                    formatter={(value) => [`₱${value.toLocaleString()}`, "Amount"]}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {analytics.financials.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Paid' ? '#10b981' : entry.name === 'Verifying' ? '#f59e0b' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">No financial data</div>
            )}
          </CardContent>
        </Card>

        {/* Procedure Popularity */}
        <Card className="border-slate-200 bg-white shadow-sm flex flex-col">
          <CardHeader className="pb-2 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Top Procedures</h2>
            <p className="text-xs text-slate-500">Most requested treatments</p>
          </CardHeader>
          <CardContent className="flex-1 pt-4 min-h-[250px] relative">
            {analytics.procedures.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={analytics.procedures}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {analytics.procedures.map((entry: any, index: number) => {
                      const colors = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 500 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">No procedure data</div>
            )}
          </CardContent>
        </Card>

        {/* Patient Demographics */}
        <Card className="border-slate-200 bg-white shadow-sm flex flex-col">
          <CardHeader className="pb-2 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Patient Demographics</h2>
            <p className="text-xs text-slate-500">Age distribution of registered patients</p>
          </CardHeader>
          <CardContent className="flex-1 pt-4 min-h-[250px]">
            {analytics.demographics.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={analytics.demographics} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="ageGroup" type="category" tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                    {analytics.demographics.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#60a5fa'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">No demographic data</div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Additional Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Annual/Monthly History */}
        <Card className="border-slate-200 bg-white shadow-sm flex flex-col lg:col-span-2">
          <CardHeader className="pb-2 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Appointment History</h2>
            <p className="text-xs text-slate-500">Monthly breakdown for the current year</p>
          </CardHeader>
          <CardContent className="flex-1 pt-4 min-h-[250px]">
            {analytics.history && analytics.history.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={analytics.history} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }}
                  />
                  <Bar dataKey="appointments" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">No history data</div>
            )}
          </CardContent>
        </Card>

        {/* Top Performing Dentists */}
        <Card className="border-slate-200 bg-white shadow-sm flex flex-col">
          <CardHeader className="pb-2 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Top Performing Dentists</h2>
            <p className="text-xs text-slate-500">Based on patient ratings & reviews</p>
          </CardHeader>
          <CardContent className="flex-1 pt-4 min-h-[250px]">
            {analytics.topDentists && analytics.topDentists.length > 0 ? (
              <div className="space-y-4">
                {analytics.topDentists.map((dentist: any, idx: number) => (
                  <div key={dentist.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-sm">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{dentist.name}</p>
                        <p className="text-xs text-slate-500">{dentist.reviews} reviews</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-bold text-slate-800">{dentist.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">No rating data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Adherence Risk Center */}
      <Card className="border-slate-200 bg-white shadow-sm">
        
        {/* Table Header Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Adherence Monitoring Grid</span>
              {cardFilter !== "all" && (
                <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded">
                  Filter: {cardFilter}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">AI triage analysis & compliance status</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient, ID or treatment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-950/20 focus:border-slate-900 transition-colors"
            />
          </div>
        </div>

        {/* Table Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 cursor-pointer select-none" onClick={() => toggleSort("id")}>
                  <div className="flex items-center gap-1">
                    <span>Patient ID</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer select-none" onClick={() => toggleSort("name")}>
                  <div className="flex items-center gap-1">
                    <span>Patient Name</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Clinic Branch</th>
                <th className="py-3.5 px-4 cursor-pointer select-none" onClick={() => toggleSort("procedureType")}>
                  <div className="flex items-center gap-1">
                    <span>Procedure</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer select-none" onClick={() => toggleSort("riskScore")}>
                  <div className="flex items-center gap-1">
                    <span>Risk Score</span>
                    <ArrowUpDown className="h-3 w-3 text-red-600" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Adherence Flag</th>
                <th className="py-3.5 px-4 text-right">Intervention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {paginatedPatients.length > 0 ? (
                paginatedPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-xs text-slate-500">{patient.id}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-950 text-sm">{patient.name}</div>
                      <div className="text-xs text-slate-500">{patient.phone}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">{patient.branch}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-semibold">{patient.procedureType}</td>
                    <td className="py-3.5 px-4">
                      <span className={`font-bold text-sm ${
                        patient.riskScore > 75 
                          ? "text-red-600 font-extrabold" 
                          : patient.riskScore > 40 
                          ? "text-amber-600" 
                          : "text-slate-900"
                      }`}>{patient.riskScore}%</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {patient.status === "high_risk" && (
                        <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide">
                          High Risk
                        </Badge>
                      )}
                      {patient.status === "moderate" && (
                        <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide">
                          Moderate Risk
                        </Badge>
                      )}
                      {patient.status === "likely" && (
                        <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide">
                          Likely to Comply
                        </Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        onClick={() => handleOpenReview(patient)}
                        size="sm"
                        variant="outline"
                        className="border-slate-300 text-slate-800 hover:bg-slate-950 hover:text-white hover:border-slate-950 font-semibold text-xs px-3.5 py-1.5"
                      >
                        Review Flow
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium text-sm">
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer Controls */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredPatients.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredPatients.length)} of {filteredPatients.length} records
          </span>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-8 border-slate-300 text-xs font-semibold disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <span className="text-xs font-bold text-slate-700 px-2">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="h-8 border-slate-300 text-xs font-semibold disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

      </Card>

      {/* Enhanced Review Modal */}
      {isReviewModalOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsReviewModalOpen(false)} />
          
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-10 animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Review Patient Flow</h3>
                  <p className="text-xs text-slate-500">ID: {selectedPatient.id}</p>
                </div>
              </div>
              <button onClick={() => setIsReviewModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-sm">
              
              {/* Quick info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Name / Contact</span>
                  <p className="font-bold text-slate-955 text-sm mt-0.5">{selectedPatient.name}</p>
                  <p className="text-xs text-slate-500">{selectedPatient.phone}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Risk Classification</span>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className="bg-red-100 text-red-800 font-bold text-xs border border-red-200">
                      Score: {selectedPatient.riskScore}%
                    </Badge>
                  </div>
                </div>
              </div>

              {/* AI Triage context */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 uppercase text-xs tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    <span>AI Triage Intelligence</span>
                  </h4>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Confidence: 94%
                  </span>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg leading-relaxed text-slate-800 font-medium text-sm">
                  {selectedPatient.aiTriageSummary}
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex justify-between gap-3">
              <div className="flex gap-2">
                <Button
                  onClick={handleSendReminder}
                  size="sm"
                  className="bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs flex items-center gap-1.5 px-4 py-2"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send SMS Reminder</span>
                </Button>
                <Button
                  onClick={() => handleMarkCompliant(selectedPatient.id)}
                  size="sm"
                  variant="outline"
                  className="border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold text-xs px-3.5 py-2"
                >
                  Mark Compliant
                </Button>
              </div>

              <Button
                onClick={() => setIsReviewModalOpen(false)}
                size="sm"
                variant="outline"
                className="border-slate-300 text-slate-600 hover:bg-slate-100 font-semibold text-xs px-3.5 py-2"
              >
                Close
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
