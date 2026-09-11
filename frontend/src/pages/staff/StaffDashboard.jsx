import { useState, useMemo, useEffect } from "react";
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
  Star,
  Clock,
  ArrowRight,
  UserPlus,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Link } from "react-router-dom";

export default function StaffDashboard() {
  const { profile } = useAuth();
  const selectedBranch = profile?.branch_id || "All Branches";
  const [branchName, setBranchName] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [queueItems, setQueueItems] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  
  useEffect(() => {
    const loadBranchName = async () => {
      if (!profile?.branch_id) {
        setBranchName("All Branches");
        return;
      }
      if (profile?.branches?.branch_name) {
        setBranchName(profile.branches.branch_name);
        return;
      }
      if (!profile.branch_id.includes("-")) {
        setBranchName(profile.branch_id);
        return;
      }
      try {
        const { data } = await supabase.from("branches").select("branch_name").eq("id", profile.branch_id).single();
        if (data?.branch_name) {
          setBranchName(data.branch_name);
        } else {
          setBranchName(profile.branch_id);
        }
      } catch (err) {
        console.error("Error loading branch name:", err);
        setBranchName(profile.branch_id);
      }
    };
    loadBranchName();
  }, [profile]);
  
  const [patients, setPatients] = useState([]);
  const [liveTelemetry, setLiveTelemetry] = useState({ activeToday: 0, aiConversations: 0, pendingBilling: 0 });
  const [analytics, setAnalytics] = useState({ financials: [], procedures: [], demographics: [], history: [], topDentists: [] });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async (retryCount = 0) => {
    setLoading(true);
    try {
      let url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/dashboard`;
      if (selectedBranch && selectedBranch !== "All Branches") {
        url += `?branch_id=${encodeURIComponent(selectedBranch)}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      const data = await response.json();
      
      const formattedData = data.records.map((record) => ({
        id: record.patient_id,
        name: `${record.profiles?.first_name || ''} ${record.profiles?.last_name || ''}`.trim() || "Patient",
        branch: record.branch || (record.branch_name ? `${record.branch_name} Branch` : "Pasig Branch"), 
        procedureType: record.procedure_type,
        status: record.status,
        riskScore: record.risk_score,
        phone: record.profiles?.contact_number || "N/A",
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

  const fetchQueueData = async () => {
    if (!profile?.branch_id) return;
    setQueueLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/staff/queue?branch_id=${profile.branch_id}`);
      if (response.ok) {
        const data = await response.json();
        setQueueItems(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch queue in dashboard:", err);
    } finally {
      setQueueLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchAnalyticsData();
    fetchQueueData();

    if (profile?.branch_id) {
      const channel = supabase
        .channel("staff_dashboard_queue")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "appointments",
            filter: `branch_id=eq.${profile.branch_id}`,
          },
          () => {
            fetchQueueData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedBranch, profile?.branch_id]);

  const activeQueueList = useMemo(() => {
    return (queueItems || []).filter(item => item.status === "waiting" || item.status === "in_progress");
  }, [queueItems]);

  const telemetry = useMemo(() => {
    const activeToday = liveTelemetry.activeToday;
    const aiConversations = liveTelemetry.aiConversations;
    const highRiskCount = patients.filter(p => (selectedBranch === "All Branches" || p.branch === selectedBranch || p.branch === branchName) && p.status === "high_risk").length;
    const pendingBilling = liveTelemetry.pendingBilling;

    return { activeToday, aiConversations, highRiskCount, pendingBilling };
  }, [patients, selectedBranch, branchName, liveTelemetry]);

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Branch Analytics Dashboard</h1>
          <p className="text-sm font-medium text-slate-600 mt-1">{branchName || selectedBranch} Operational Overview</p>
        </div>
      </div>

      {/* Telemetry Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 bg-white border-t-2 border-t-slate-950 shadow-sm">
          <CardHeader className="pb-1.5 pt-4">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Active Patients Today</span>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between pb-4">
            <span className="text-2xl font-bold text-slate-950">{telemetry.activeToday}</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
              +12%
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white border-t-2 border-t-slate-800 shadow-sm">
          <CardHeader className="pb-1.5 pt-4">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">AI Chat Sessions</span>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between pb-4">
            <span className="text-2xl font-bold text-slate-950">{telemetry.aiConversations}</span>
            <span className="text-[10px] font-bold text-slate-700 bg-slate-150 px-2 py-0.5 rounded">
              Active
            </span>
          </CardContent>
        </Card>

        <Card className={`border-slate-200 bg-white border-t-2 shadow-sm ${
          telemetry.highRiskCount > 0 ? "border-t-red-600 bg-red-50/5" : "border-t-slate-300"
        }`}>
          <CardHeader className="pb-1.5 pt-4">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">High Risk Alerts</span>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between pb-4">
            <span className={`text-2xl font-bold ${telemetry.highRiskCount > 0 ? "text-red-600" : "text-slate-950"}`}>
              {telemetry.highRiskCount}
            </span>
            {telemetry.highRiskCount > 0 && (
              <span className="text-[10px] font-extrabold text-red-700 bg-red-100 px-2 py-0.5 rounded uppercase">
                Action Required
              </span>
            )}
          </CardContent>
        </Card>

        <Card className={`border-slate-200 bg-white border-t-2 shadow-sm ${
          telemetry.pendingBilling > 0 ? "border-t-red-600 bg-red-50/5" : "border-t-slate-300"
        }`}>
          <CardHeader className="pb-1.5 pt-4">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Pending Payments</span>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between pb-4">
            <span className={`text-2xl font-bold ${telemetry.pendingBilling > 0 ? "text-red-600" : "text-slate-950"}`}>
              {telemetry.pendingBilling}
            </span>
            {telemetry.pendingBilling > 0 && (
              <span className="text-[10px] font-extrabold text-red-700 bg-red-100 px-2 py-0.5 rounded uppercase">
                GCash/Bank
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* TODAY'S LIVE QUEUE & NEXT PATIENTS SHORTCUT WIDGET */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden rounded-2xl">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900">Today's Live Queue & Next Patients</CardTitle>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Real-time patient flow for {branchName || selectedBranch}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/staff/add-patient?walkin=true">
              <Button size="sm" variant="outline" className="h-8 text-xs font-semibold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100">
                <UserPlus className="h-3.5 w-3.5 mr-1 text-slate-500" />
                Add Walk-in
              </Button>
            </Link>
            <Link to="/staff/queue">
              <Button size="sm" className="h-8 text-xs font-semibold rounded-xl bg-slate-950 hover:bg-slate-800 text-white shadow-xs">
                Open Full Queue
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {queueLoading ? (
            <div className="p-6 text-center text-xs text-slate-400 font-medium">Loading live queue...</div>
          ) : activeQueueList.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center">
              <Clock className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No patients currently in the live queue</p>
              <p className="text-xs text-slate-400 mt-0.5 max-w-sm">Patients checked in from today's schedule or registered as walk-ins will appear here automatically.</p>
              <div className="mt-4 flex gap-2">
                <Link to="/staff/appointments">
                  <Button size="sm" variant="outline" className="h-8 text-xs font-semibold rounded-xl">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    Check-in Appointments
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              <div className="grid grid-cols-12 px-5 py-2.5 bg-slate-50/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span className="col-span-2">Queue #</span>
                <span className="col-span-4">Patient Name</span>
                <span className="col-span-3">Service Requested</span>
                <span className="col-span-3 text-right">Status / Attending</span>
              </div>
              {activeQueueList.slice(0, 5).map((item, index) => {
                const qNum = `Q-${(item.id || "").substring(0, 3).toUpperCase()}`;
                const patientName = `${item.patient?.first_name || ""} ${item.patient?.last_name || ""}`.trim() || "Patient";
                const dentistName = item.dentist ? `Dr. ${item.dentist.first_name} ${item.dentist.last_name}` : "Any Available";
                const isInProgress = item.status === "in_progress";

                return (
                  <div key={item.id || index} className="grid grid-cols-12 px-5 py-3 items-center hover:bg-slate-50/80 transition-colors text-xs">
                    <div className="col-span-2 flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                        {qNum}
                      </span>
                    </div>
                    <div className="col-span-4 font-bold text-slate-900">
                      {patientName}
                    </div>
                    <div className="col-span-3 text-slate-600 truncate font-medium">
                      {item.service_requested || "Dental Consultation"}
                    </div>
                    <div className="col-span-3 flex items-center justify-end gap-2">
                      <span className="text-[11px] text-slate-500 hidden sm:inline truncate">
                        {dentistName}
                      </span>
                      {isInProgress ? (
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-full px-2 py-0.5">
                          In Chair
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 font-bold text-[10px] rounded-full px-2 py-0.5">
                          Waiting #{index + 1}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment History Chart */}
        <Card className="border-slate-200 bg-white shadow-sm flex flex-col">
          <CardHeader className="pb-2 border-b border-slate-50">
            <h2 className="text-sm font-bold text-slate-900">Appointment History</h2>
            <p className="text-[10px] text-slate-500">Monthly booking trends</p>
          </CardHeader>
          <CardContent className="flex-1 pt-4 min-h-[250px]">
            {analytics?.history && analytics.history.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
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
