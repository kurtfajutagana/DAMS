import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { Users, Clock, CheckCircle2, Play, Stethoscope, Search, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import TreatmentLoggerModal from "./TreatmentLoggerModal";

export default function DentistQueue() {
  const { user, profile } = useAuth();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Search, Status Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const [isLoggerOpen, setIsLoggerOpen] = useState(false);
  const [activeQueueItem, setActiveQueueItem] = useState(null);

  const fetchQueueFallback = useCallback(async () => {
    if (!profile?.branch_id || !user?.id) return;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: qData, error: qError } = await supabase
        .from("appointments")
        .select("*")
        .eq("branch_id", profile.branch_id)
        .or(`dentist_id.eq.${user.id},dentist_id.is.null`)
        .in("status", ["waiting", "in_progress", "completed", "cancelled"])
        .gte("created_at", todayStart.toISOString())
        .order("created_at", { ascending: true });

      if (qError) throw qError;
      if (!qData || qData.length === 0) {
        setQueue([]);
        return;
      }

      const { data: profiles } = await supabase.from("profiles").select("id, first_name, last_name");
      const enriched = qData.map(item => {
        const patient = profiles?.find(p => p.id === item.patient_id);
        return {
          ...item,
          patient: patient || null
        };
      });

      setQueue(enriched);
    } catch (err) {
      console.error("Fallback failed", err);
    }
  }, [profile, user]);

  const fetchQueue = useCallback(async () => {
    if (!profile?.branch_id || !user?.id) return;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          patient:profiles!appointments_patient_id_fkey(first_name, last_name, contact_number)
        `)
        .eq("branch_id", profile.branch_id)
        .or(`dentist_id.eq.${user.id},dentist_id.is.null`)
        .in("status", ["waiting", "in_progress", "completed", "cancelled"])
        .gte("created_at", todayStart.toISOString())
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("Join failed, trying raw fetch");
        await fetchQueueFallback();
      } else {
        setQueue(data || []);
      }
    } catch (error) {
      console.error("Error fetching queue:", error);
      toast.error("Failed to load your queue.");
    } finally {
      setLoading(false);
    }
  }, [profile, user, fetchQueueFallback]);

  useEffect(() => {
    if (!user?.id || !profile?.branch_id) return;

    const loadQueue = async () => {
      await fetchQueue();
    };
    loadQueue();

    const channel = supabase
      .channel("dentist_queue_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `branch_id=eq.${profile.branch_id}`,
        },
        () => {
          fetchQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, user, fetchQueue]);

  const updateStatus = async (queueItem, status) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", queueItem.id);

      if (error) throw error;

      toast.success("Status updated!");
      fetchQueue();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status.");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "in_progress":
        return <Badge className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase hover:bg-amber-100">In Progress</Badge>;
      case "waiting":
        return <Badge className="bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase hover:bg-blue-50">Waiting</Badge>;
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase hover:bg-emerald-100">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase hover:bg-rose-100">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-700 border-slate-300 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase">{status}</Badge>;
    }
  };

  // Filtered & Paginated Queue
  const filteredQueue = useMemo(() => {
    return queue.filter(item => {
      const pName = item.patient ? `${item.patient.first_name} ${item.patient.last_name}` : "Unknown Patient";
      const qCode = `Q-${item.id.substring(0, 4)}`;
      const matchesSearch = `${pName} ${qCode} ${item.service_requested || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [queue, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredQueue.length / pageSize));
  const paginatedQueue = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredQueue.slice(start, start + pageSize);
  }, [filteredQueue, currentPage, pageSize]);

  // Reset pagination when search or filter changes during render
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);
  const [prevStatusFilter, setPrevStatusFilter] = useState(statusFilter);

  if (searchQuery !== prevSearchQuery || statusFilter !== prevStatusFilter) {
    setPrevSearchQuery(searchQuery);
    setPrevStatusFilter(statusFilter);
    setCurrentPage(1);
  }

  const waitingCount = queue.filter(q => q.status === "waiting").length;
  const completedCount = queue.filter(q => q.status === "completed").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-955">My Live Queue</h1>
          <p className="text-slate-500 mt-1 text-sm">Patients physically checked-in and waiting for your clinical consultation today.</p>
        </div>
        <Button onClick={() => fetchQueue(true)} disabled={loading} variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold text-sm h-10 px-4">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? "Refreshing..." : "Refresh Queue"}
        </Button>
      </div>

      {/* Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="border-slate-200 bg-white shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Patients Today</p>
              <h3 className="text-3xl font-extrabold text-slate-950 mt-1">{queue.length}</h3>
            </div>
            <div className="p-3 bg-slate-100 rounded-xl text-slate-800">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setStatusFilter(statusFilter === "waiting" ? "all" : "waiting")}
          className={`border-slate-200 bg-white shadow-sm hover:shadow transition-all cursor-pointer ${statusFilter === "waiting" ? "ring-2 ring-blue-600 bg-blue-50/20" : ""}`}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Currently Waiting</p>
              <h3 className="text-3xl font-extrabold text-blue-900 mt-1">{waitingCount}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setStatusFilter(statusFilter === "completed" ? "all" : "completed")}
          className={`border-slate-200 bg-white shadow-sm hover:shadow transition-all cursor-pointer ${statusFilter === "completed" ? "ring-2 ring-emerald-600 bg-emerald-50/20" : ""}`}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Completed Today</p>
              <h3 className="text-3xl font-extrabold text-emerald-900 mt-1">{completedCount}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Queue Card Container */}
      <Card className="border-slate-200 bg-white shadow-sm">
        
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search queue code, patient name, service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-slate-950/20 focus:border-slate-900 transition-colors"
            />
          </div>

          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {["all", "waiting", "in_progress", "completed", "cancelled"].map((st) => (
              <Button
                key={st}
                variant="outline"
                size="sm"
                onClick={() => setStatusFilter(st)}
                className={`h-8 text-xs font-bold uppercase tracking-wider transition-all ${
                  statusFilter === st
                    ? "bg-slate-950 text-white border-slate-950 shadow-xs"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                }`}
              >
                {st.replace("_", " ")}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Queue Tag</th>
                <th className="py-3.5 px-4">Patient Name</th>
                <th className="py-3.5 px-4">Requested Service</th>
                <th className="py-3.5 px-4">Queue Status</th>
                <th className="py-3.5 px-4 text-right">Clinical Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {loading && queue.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 animate-pulse text-sm">
                    Loading live queue data...
                  </td>
                </tr>
              )}
              {!loading && paginatedQueue.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-sm font-medium">
                    No patients found in queue matching your filter criteria.
                  </td>
                </tr>
              )}
              {paginatedQueue.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-xs text-slate-900">
                    Q-{item.id.substring(0, 4).toUpperCase()}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-955 text-sm">
                      {item.patient ? `${item.patient.first_name} ${item.patient.last_name}` : "Unknown Patient"}
                    </div>
                    {item.patient?.contact_number && (
                      <div className="text-xs text-slate-500">Contact: {item.patient.contact_number}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2 font-medium text-slate-800 text-sm">
                      <Stethoscope className="h-4 w-4 text-slate-500" />
                      {item.service_requested || "General Consultation"}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {item.status === "waiting" && (
                      <Button 
                        onClick={() => updateStatus(item, "in_progress")}
                        size="sm"
                        className="bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs h-8 px-3 gap-1.5"
                      >
                        <Play className="h-3.5 w-3.5" /> Call In Patient
                      </Button>
                    )}
                    {item.status === "in_progress" && (
                      <div className="flex justify-end gap-2">
                        <Button 
                          onClick={() => {
                            setActiveQueueItem(item);
                            setIsLoggerOpen(true);
                          }}
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-8 px-3 gap-1.5"
                        >
                          <Stethoscope className="h-3.5 w-3.5" /> Log Treatment
                        </Button>
                        <Button 
                          onClick={() => updateStatus(item, "completed")}
                          size="sm"
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs h-8 px-3 gap-1.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                        </Button>
                      </div>
                    )}
                    {(item.status === "completed" || item.status === "cancelled") && (
                      <span className="text-xs text-slate-400 font-medium">Session Closed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredQueue.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredQueue.length)} of {filteredQueue.length} entries
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

      {/* Logger Modal */}
      {activeQueueItem && (
        <TreatmentLoggerModal
          key={activeQueueItem.id}
          isOpen={isLoggerOpen}
          onClose={() => setIsLoggerOpen(false)}
          queueItem={activeQueueItem}
          onComplete={(item) => updateStatus(item, "completed")}
        />
      )}
    </div>
  );
}

