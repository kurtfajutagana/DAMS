import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  Building2,
  FileText,
  RefreshCw,
  Info,
  CalendarCheck,
  Stethoscope
} from "lucide-react";
import ClinicalCalendarView from "../../components/ClinicalCalendarView";
import DailyClinicalReportModal from "../../components/DailyClinicalReportModal";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function DentistSchedule() {
  const { user, profile } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [dutySchedules, setDutySchedules] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const fetchDoctorData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Fetch branches
      const { data: bData } = await supabase.from("branches").select("id, branch_name");
      if (bData) setBranches(bData);

      // 2. Fetch doctor's weekly duty schedule
      const { data: schedData, error: sErr } = await supabase
        .from("dentist_schedules")
        .select(`
          id,
          day_of_week,
          start_time,
          end_time,
          is_active,
          branch:branches!dentist_schedules_branch_id_fkey(id, branch_name)
        `)
        .eq("dentist_id", user.id)
        .eq("is_active", true)
        .order("day_of_week", { ascending: true });

      if (!sErr && schedData) {
        setDutySchedules(schedData);
      }

      // 3. Fetch dentist's confirmed / scheduled appointments
      const { data: aptData, error: aptErr } = await supabase
        .from("appointments")
        .select(`
          *,
          patient:profiles!appointments_patient_id_fkey(first_name, last_name, contact_number),
          branch:branches!appointments_branch_id_fkey(branch_name)
        `)
        .eq("dentist_id", user.id)
        .in("status", ["scheduled", "waiting", "in_progress", "completed"])
        .order("appointment_date", { ascending: true });

      if (aptErr) {
        console.warn("Appointments join failed, fetching raw:", aptErr);
        const { data: rawApt } = await supabase
          .from("appointments")
          .select("*")
          .eq("dentist_id", user.id)
          .in("status", ["scheduled", "waiting", "in_progress", "completed"])
          .order("appointment_date", { ascending: true });

        setAppointments(rawApt || []);
      } else {
        setAppointments(aptData || []);
      }
    } catch (err) {
      console.error("Error fetching dentist schedule:", err);
      toast.error("Failed to load clinical schedule.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDoctorData();
  }, [fetchDoctorData]);

  const doctorDisplayName = profile?.first_name 
    ? `Dr. ${profile.first_name} ${profile.last_name || ''}`.trim()
    : "Doctor";

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">My Clinical Schedule</h1>
            <Badge className="bg-indigo-100 text-indigo-800 font-bold border-indigo-200">Ahead-of-Time View</Badge>
          </div>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Review upcoming confirmed appointments, check your weekly duty rotation, and plan chairside consultations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsReportModalOpen(true)}
            variant="outline"
            className="border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold text-xs h-9 px-3 rounded-xl gap-1.5 shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            My Daily Cases Report
          </Button>

          <Button
            onClick={fetchDoctorData}
            disabled={loading}
            variant="outline"
            className="border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold text-xs h-9 px-3 rounded-xl gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Agreed Weekly Duty Roster Banner */}
      <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/50 via-white to-slate-50 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-sm font-bold text-slate-900">Agreed Weekly Duty Roster & Branch Rotations</CardTitle>
            </div>
            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-slate-400" /> Coordinated with Clinic Administration
            </span>
          </div>
          <CardDescription className="text-xs text-slate-600">
            Your recurring clinical duty schedule agreed with management. Patients can book with you during these operating windows.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {dutySchedules.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {dutySchedules.map((duty) => {
                const dayName = DAY_NAMES[duty.day_of_week] || `Day ${duty.day_of_week}`;
                const branchName = duty.branch?.branch_name || "Pasig";
                return (
                  <div
                    key={duty.id}
                    className="bg-white border border-indigo-100/80 rounded-xl p-2.5 shadow-2xs flex flex-col justify-between space-y-1 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900">{dayName}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active Duty" />
                    </div>
                    <div className="text-[11px] font-semibold text-indigo-700 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-indigo-500" />
                      {branchName}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {duty.start_time?.slice(0, 5)} - {duty.end_time?.slice(0, 5)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-100">
              No active weekly duty days recorded. Please contact clinic administration to assign your branch schedule.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Synchronized Ahead-of-Time Calendar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" /> Ahead-of-Time Appointment Calendar
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Showing {appointments.length} scheduled visits
          </span>
        </div>

        <ClinicalCalendarView
          appointments={appointments}
          branches={branches}
          lockedDentistId={user?.id}
          isDentistView={true}
        />
      </div>

      {/* Daily Clinical Report Modal for Dentist */}
      <DailyClinicalReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        lockedDentistId={user?.id}
        dentistName={doctorDisplayName}
        initialBranchId={profile?.branch_id}
      />
    </div>
  );
}

