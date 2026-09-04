import React, { useState, useMemo, useEffect } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  Users,
  MessageSquare,
  AlertTriangle,
  FileCheck,
  Search,
  Eye,
  Building2,
  Calendar,
  CheckCircle2,
  UserCheck,
  Star
} from "lucide-react";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";

export default function StaffDashboard() {
  const { profile } = useAuth();
  const selectedBranch = profile?.branch_id || "All Branches";

  const [searchQuery, setSearchQuery] = useState("");
  
  const [patients, setPatients] = useState([]);
  const [liveTelemetry, setLiveTelemetry] = useState({ activeToday: 0, aiConversations: 0, pendingBilling: 0 });
  const [analytics, setAnalytics] = useState({ financials: [], procedures: [], demographics: [], history: [], topDentists: [] });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async (retryCount = 0) => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/dashboard`);
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      const data = await response.json();
      
      const formattedData = data.records.map((record) => ({
        id: record.patient_id,
        name: `${record.profiles.first_name} ${record.profiles.last_name}`.trim(),
        branch: record.profiles.branch_id || "Pasig Branch", 
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

  const telemetry = useMemo(() => {
    const activeToday = liveTelemetry.activeToday;
    const aiConversations = liveTelemetry.aiConversations;
    const highRiskCount = patients.filter(p => (selectedBranch === "All Branches" || p.branch === selectedBranch) && p.status === "high_risk").length;
    const pendingBilling = liveTelemetry.pendingBilling;

    return { activeToday, aiConversations, highRiskCount, pendingBilling };
  }, [patients, selectedBranch, liveTelemetry]);

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Branch Analytics Dashboard</h1>
          <p className="text-slate-500 text-xs mt-0.5">{selectedBranch} Overview</p>
        </div>
      </div>

      {/* Telemetry Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 bg-white border-t-2 border-t-slate-950 shadow-sm">
          <CardHeader className="pb-1.5 pt-4">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Active Patients Today</span>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between pb-4">
            <span className="text-2xl font-bold text-slate-955">{telemetry.activeToday}</span>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              +12%
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white border-t-2 border-t-slate-800 shadow-sm">
          <CardHeader className="pb-1.5 pt-4">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">AI Chat Sessions</span>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between pb-4">
            <span className="text-2xl font-bold text-slate-955">{telemetry.aiConversations}</span>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              Active
            </span>
          </CardContent>
        </Card>

        <Card className={`border-slate-200 bg-white border-t-2 shadow-sm ${
          telemetry.highRiskCount > 0 ? "border-t-red-600 bg-red-50/5" : "border-t-slate-300"
        }`}>
          <CardHeader className="pb-1.5 pt-4">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">High Risk Alerts</span>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between pb-4">
            <span className={`text-2xl font-bold ${telemetry.highRiskCount > 0 ? "text-red-650" : "text-slate-955"}`}>
              {telemetry.highRiskCount}
            </span>
            {telemetry.highRiskCount > 0 && (
              <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase">
                Action Required
              </span>
            )}
          </CardContent>
        </Card>

        <Card className={`border-slate-200 bg-white border-t-2 shadow-sm ${
          telemetry.pendingBilling > 0 ? "border-t-red-600 bg-red-50/5" : "border-t-slate-300"
        }`}>
          <CardHeader className="pb-1.5 pt-4">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Pending Payments</span>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between pb-4">
            <span className={`text-2xl font-bold ${telemetry.pendingBilling > 0 ? "text-red-650" : "text-slate-955"}`}>
              {telemetry.pendingBilling}
            </span>
            {telemetry.pendingBilling > 0 && (
              <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase">
                GCash/Bank
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment History Chart */}
        <Card className="border-slate-200 bg-white shadow-sm flex flex-col">
          <CardHeader className="pb-2 border-b border-slate-50">
            <h2 className="text-sm font-bold text-slate-900">Appointment History</h2>
            <p className="text-[10px] text-slate-500">Monthly booking trends</p>
          </CardHeader>
          <CardContent className="flex-1 pt-4 min-h-[250px]">
            {analytics.history.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  />
                  <Bar dataKey="appointments" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[11px] text-slate-400">No appointment data available.</div>
            )}
          </CardContent>
        </Card>

        {/* Top Dentists Leaderboard */}
        <Card className="border-slate-200 bg-white shadow-sm flex flex-col">
          <CardHeader className="pb-2 border-b border-slate-50 flex flex-row items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Top Performing Dentists</h2>
              <p className="text-[10px] text-slate-500">Based on patient ratings</p>
            </div>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="flex-1 pt-4">
            <div className="space-y-4">
              {analytics.topDentists.length > 0 ? (
                analytics.topDentists.map((dentist, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-800">{dentist.name}</p>
                        <p className="text-[10px] text-slate-500">{dentist.branch}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-bold text-slate-900">
                        {dentist.rating.toFixed(1)} <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      </div>
                      <p className="text-[9px] text-slate-400">{dentist.reviews} reviews</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-[200px] flex items-center justify-center text-[11px] text-slate-400">
                  No ratings data available yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
