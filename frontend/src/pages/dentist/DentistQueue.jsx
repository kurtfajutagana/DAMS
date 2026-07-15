import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { Users, Clock, CheckCircle2, Play, UserCheck, Stethoscope } from "lucide-react";
import TreatmentLoggerModal from "./TreatmentLoggerModal";

export default function DentistQueue() {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isLoggerOpen, setIsLoggerOpen] = useState(false);
  const [activeQueueItem, setActiveQueueItem] = useState(null);

  useEffect(() => {
    if (user?.id) fetchQueue();
  }, [user?.id]);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Fetch queue entries assigned to this dentist for today
      const { data, error } = await supabase
        .from("queue_entries")
        .select(`
          *,
          patient:profiles!queue_entries_patient_id_fkey(first_name, last_name, contact_number)
        `)
        .or(`dentist_id.eq.${user.id},dentist_id.is.null`)
        .gte("created_at", todayStart.toISOString())
        .order("created_at", { ascending: true });

      if (error) {
        // Fallback for foreign key issues
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
  };

  const fetchQueueFallback = async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: qData, error: qError } = await supabase
        .from("queue_entries")
        .select("*")
        .or(`dentist_id.eq.${user.id},dentist_id.is.null`)
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
  };

  const updateStatus = async (queueItem, status) => {
    try {
      const { error } = await supabase
        .from("queue_entries")
        .update({ status })
        .eq("id", queueItem.id);

      if (error) throw error;

      // Sync status back to the appointment if they finish or cancel
      if (status === "completed" || status === "cancelled") {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const { data: apts } = await supabase
          .from("appointments")
          .select("id")
          .eq("patient_id", queueItem.patient_id)
          .eq("status", "checked-in")
          .gte("appointment_date", todayStart.toISOString())
          .limit(1);
          
        if (apts && apts.length > 0) {
          await supabase
            .from("appointments")
            .update({ status })
            .eq("id", apts[0].id);
        }
      }

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
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white rounded-full">In Progress</Badge>;
      case "waiting":
        return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 rounded-full">Waiting</Badge>;
      case "completed":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="rounded-full">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="rounded-full">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Live Queue</h1>
          <p className="text-slate-500 mt-1 text-sm">Patients physically waiting for you right now.</p>
        </div>
        <Button onClick={fetchQueue} variant="outline" disabled={loading} className="border-blue-200 text-blue-700 hover:bg-blue-50">
          {loading ? "Refreshing..." : "Refresh Queue"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        {/* Main Queue Table */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">No.</th>
                  <th className="px-4 py-3">Patient Name</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.length === 0 && !loading && (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                      Your queue is currently empty.
                    </td>
                  </tr>
                )}
                {queue.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4 font-mono font-bold text-slate-400 text-xs">
                      Q-{item.id.substring(0, 4).toUpperCase()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">
                        {item.patient ? `${item.patient.first_name} ${item.patient.last_name}` : "Unknown Patient"}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Stethoscope className="h-3.5 w-3.5 text-blue-400" />
                        {item.service_requested || "General Consultation"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {item.status === "waiting" && (
                        <Button 
                          onClick={() => updateStatus(item, "in_progress")}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                        >
                          <Play className="h-3.5 w-3.5" /> Call In
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
                            className="bg-amber-500 hover:bg-amber-600 text-white gap-1"
                          >
                            <Stethoscope className="h-3.5 w-3.5" /> Log Treatment
                          </Button>
                          <Button 
                            onClick={() => updateStatus(item, "completed")}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Side Summary */}
        <div className="space-y-4">
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Patients</p>
                  <p className="text-2xl font-bold text-blue-900">{queue.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-amber-50 border-amber-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-600">Currently Waiting</p>
                  <p className="text-2xl font-bold text-amber-900">
                    {queue.filter(q => q.status === "waiting").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {activeQueueItem && (
        <TreatmentLoggerModal
          isOpen={isLoggerOpen}
          onClose={() => setIsLoggerOpen(false)}
          queueItem={activeQueueItem}
          onComplete={(item) => updateStatus(item, "completed")}
        />
      )}
    </div>
  );
}
