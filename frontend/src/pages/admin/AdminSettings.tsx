import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import {
  Building2,
  CalendarCheck,
  Brain,
  ShieldCheck,
  Clock,
  Phone,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  Sliders,
  History,
  RefreshCw,
  Save,
  Users
} from "lucide-react";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AdminSettings() {
  // Tab 1: Branches
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);

  // Tab 2: Master Dentist Schedules
  const [dentists, setDentists] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [newScheduleDentistId, setNewScheduleDentistId] = useState("");
  const [newScheduleBranchId, setNewScheduleBranchId] = useState("");
  const [newScheduleDay, setNewScheduleDay] = useState("1"); // Monday
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);

  // Tab 3: AI Classifier Settings
  const [temperature, setTemperature] = useState(0.2);
  const [systemPrompt, setSystemPrompt] = useState(
    "You are TeethTalk AI, a triage assistant for a dental clinic. Prioritize identifying severe pain, bleeding, or trauma. Route urgent symptoms directly to emergency booking."
  );
  const [isSavingAI, setIsSavingAI] = useState(false);

  // Tab 4: Reschedule Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const fetchBranches = useCallback(async () => {
    try {
      const { data } = await supabase.from("branches").select("*").order("branch_name");
      if (data) setBranches(data);
    } catch (err) {
      console.error("Error fetching branches:", err);
    } finally {
      setLoadingBranches(false);
    }
  }, []);

  const fetchDentistsAndSchedules = useCallback(async () => {
    try {
      const { data: dData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, specialization, branch_id")
        .eq("role", "dentist")
        .eq("is_active", true);

      if (dData) setDentists(dData);

      const { data: sData } = await supabase
        .from("dentist_schedules")
        .select(`
          id,
          dentist_id,
          branch_id,
          day_of_week,
          start_time,
          end_time,
          is_active,
          branch:branches!dentist_schedules_branch_id_fkey(branch_name),
          dentist:profiles!dentist_schedules_dentist_id_fkey(first_name, last_name, specialization)
        `)
        .order("day_of_week");

      if (sData) setSchedules(sData);
    } catch (err) {
      console.error("Error fetching duty schedules:", err);
    } finally {
      setLoadingSchedules(false);
    }
  }, []);

  const fetchRescheduleLogs = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("appointment_reschedule_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) setAuditLogs(data);
    } catch (err) {
      console.error("Error fetching reschedule logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
    fetchDentistsAndSchedules();
    fetchRescheduleLogs();
  }, [fetchBranches, fetchDentistsAndSchedules, fetchRescheduleLogs]);

  // Branch Closure / Active Toggle
  const handleToggleBranch = async (branch: any) => {
    const newStatus = !branch.is_active;
    try {
      const { error } = await supabase
        .from("branches")
        .update({ is_active: newStatus })
        .eq("id", branch.id);

      if (error) throw error;
      toast.success(`${branch.branch_name} Branch marked as ${newStatus ? 'OPEN' : 'TEMPORARILY CLOSED'}`);
      fetchBranches();
    } catch (err: any) {
      toast.error("Failed to update branch status: " + err.message);
    }
  };

  // Add Duty Schedule
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheduleDentistId || !newScheduleBranchId) {
      toast.error("Please select both a dentist and a branch.");
      return;
    }

    setIsAddingSchedule(true);
    try {
      const { error } = await supabase.from("dentist_schedules").insert({
        dentist_id: newScheduleDentistId,
        branch_id: newScheduleBranchId,
        day_of_week: parseInt(newScheduleDay, 10),
        start_time: "09:00",
        end_time: "17:00",
        is_active: true
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("This dentist already has a duty schedule for this branch and weekday.");
        } else {
          throw error;
        }
      } else {
        toast.success("Duty schedule added successfully!");
        fetchDentistsAndSchedules();
      }
    } catch (err: any) {
      toast.error("Failed to add duty schedule: " + err.message);
    } finally {
      setIsAddingSchedule(false);
    }
  };

  // Delete Duty Schedule
  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase.from("dentist_schedules").delete().eq("id", scheduleId);
      if (error) throw error;
      toast.success("Duty schedule removed.");
      fetchDentistsAndSchedules();
    } catch (err: any) {
      toast.error("Failed to remove schedule: " + err.message);
    }
  };

  // Save AI Intent Settings
  const handleSaveAI = async () => {
    setIsSavingAI(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/ai-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temperature, system_prompt: systemPrompt })
      });
      if (!response.ok) throw new Error("Failed to save settings");
      toast.success("AI Triage Classifier configuration updated!");
    } catch (err: any) {
      toast.error("Failed to update AI settings: " + err.message);
    } finally {
      setIsSavingAI(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Clinic System Settings & Master Controls</h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Manage physical clinic branches, weekly dentist duty rosters, AI assistant parameters, and reschedule audit trails.
          </p>
        </div>
        <Badge className="bg-red-600 text-white font-bold px-3 py-1 text-xs uppercase tracking-wider">
          Master Administration
        </Badge>
      </div>

      <Tabs defaultValue="branches" className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full bg-slate-100 p-1 rounded-xl h-auto gap-1">
          <TabsTrigger value="branches" className="text-xs font-bold py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs">
            <Building2 className="w-3.5 h-3.5 mr-1.5" /> Branches & Closures
          </TabsTrigger>
          <TabsTrigger value="roster" className="text-xs font-bold py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs">
            <CalendarCheck className="w-3.5 h-3.5 mr-1.5" /> Dentist Duty Master
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-xs font-bold py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs">
            <Brain className="w-3.5 h-3.5 mr-1.5" /> AI Triage Settings
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs font-bold py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs">
            <History className="w-3.5 h-3.5 mr-1.5" /> Reschedule Audit Log
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CLINIC BRANCHES & HOLIDAY CLOSURES */}
        <TabsContent value="branches" className="mt-4 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg">Clinic Branches & Emergency Closure Controls</CardTitle>
              </div>
              <CardDescription>
                Configure operating status for each branch. Marking a branch closed disables online reservations for that location during typhoons or public holidays.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {branches.map(branch => {
                  const isOpen = branch.is_active !== false;
                  return (
                    <div
                      key={branch.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isOpen ? "bg-white border-slate-200 shadow-2xs" : "bg-rose-50/50 border-rose-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{branch.branch_name} Branch</span>
                        <Badge className={isOpen ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-rose-100 text-rose-800 border-rose-200"}>
                          {isOpen ? "Operating" : "Closed"}
                        </Badge>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-slate-600">
                        <p className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> Mon - Sat: 09:00 AM - 05:00 PM
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {branch.branch_name === "Pasig" ? "(02) 8642-1190" : branch.branch_name === "Fairview" ? "(02) 8931-4455" : "(02) 8724-8899"}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleBranch(branch)}
                          className={`rounded-lg text-xs font-semibold ${
                            isOpen ? "text-rose-600 hover:bg-rose-50 border-rose-200" : "text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                          }`}
                        >
                          {isOpen ? "Mark Emergency Closed" : "Re-open Branch"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: DENTIST DUTY MASTER SCHEDULER */}
        <TabsContent value="roster" className="mt-4 space-y-4">
          {/* Add New Duty Form */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-base font-bold">Add Weekly Duty Day to Doctor Roster</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddSchedule} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Dentist</Label>
                  <Select value={newScheduleDentistId} onValueChange={setNewScheduleDentistId}>
                    <SelectTrigger className="rounded-xl text-xs">
                      <SelectValue placeholder="Select Dentist" />
                    </SelectTrigger>
                    <SelectContent>
                      {dentists.map(d => (
                        <SelectItem key={d.id} value={d.id} className="text-xs">
                          Dr. {d.first_name} {d.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Branch</Label>
                  <Select value={newScheduleBranchId} onValueChange={setNewScheduleBranchId}>
                    <SelectTrigger className="rounded-xl text-xs">
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(b => (
                        <SelectItem key={b.id} value={b.id} className="text-xs">
                          {b.branch_name} Branch
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Day of Week</Label>
                  <Select value={newScheduleDay} onValueChange={setNewScheduleDay}>
                    <SelectTrigger className="rounded-xl text-xs">
                      <SelectValue placeholder="Select Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_NAMES.map((day, idx) => (
                        <SelectItem key={idx} value={String(idx)} className="text-xs">
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    type="submit"
                    disabled={isAddingSchedule}
                    className="w-full bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold h-9"
                  >
                    {isAddingSchedule ? "Adding..." : "Assign Duty Day"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Master Roster List */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-indigo-600" /> Active Agreed Duty Schedules ({schedules.length})
                </CardTitle>
                <Button variant="outline" size="sm" onClick={fetchDentistsAndSchedules} className="rounded-xl text-xs gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Doctor</th>
                    <th className="p-3.5">Weekday</th>
                    <th className="p-3.5">Branch</th>
                    <th className="p-3.5">Duty Hours</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedules.map(sched => {
                    const docName = sched.dentist ? `Dr. ${sched.dentist.first_name} ${sched.dentist.last_name}` : "Doctor";
                    const bName = sched.branch?.branch_name || "Pasig";
                    const dayName = DAY_NAMES[sched.day_of_week] || `Day ${sched.day_of_week}`;
                    return (
                      <tr key={sched.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-bold text-slate-900">{docName}</td>
                        <td className="p-3.5 font-semibold text-indigo-700">{dayName}</td>
                        <td className="p-3.5">{bName} Branch</td>
                        <td className="p-3.5 text-slate-500 font-mono">{sched.start_time?.slice(0, 5)} - {sched.end_time?.slice(0, 5)}</td>
                        <td className="p-3.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSchedule(sched.id)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg h-7 px-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 3: AI ASSISTANT TRIAGE SETTINGS */}
        <TabsContent value="ai" className="mt-4 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg">TeethTalk AI Triage & Classifier Controls</CardTitle>
              </div>
              <CardDescription>
                Adjust triage sensitivity, temperature, and emergency escalation instructions for the patient conversational assistant.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Temperature (Response Variability): {temperature}</span>
                  <span className="text-slate-400 font-normal">0.1 (Strict) &bull; 0.7 (Creative)</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.7"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">System Instruction Prompt</Label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTemperature(0.1);
                    setSystemPrompt("Strict Clinical Triage Mode: Evaluate symptoms objectively. Flag acute trauma, severe pain (>=7/10), or fever/swelling as HIGH RISK emergency.");
                  }}
                  className="rounded-lg text-xs"
                >
                  Strict Triage Preset
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTemperature(0.3);
                    setSystemPrompt("Empathetic Patient Assistant Mode: Reassure anxious patients while assessing symptoms. Use comforting language and guide them to schedule an evaluation.");
                  }}
                  className="rounded-lg text-xs"
                >
                  Empathetic Support Preset
                </Button>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50/50 border-t border-slate-100 py-3 flex justify-end">
              <Button onClick={handleSaveAI} disabled={isSavingAI} className="bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {isSavingAI ? "Saving..." : "Save AI Parameters"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* TAB 4: RESCHEDULE AUDIT TRAIL */}
        <TabsContent value="audit" className="mt-4 space-y-4">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <History className="h-5 w-5 text-indigo-600" /> Appointment Rescheduling Audit Log
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Records every date/time adjustment made by patients or front-desk staff.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchRescheduleLogs} className="rounded-xl text-xs gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
                </Button>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Rescheduled By</th>
                    <th className="p-3.5">Previous Date</th>
                    <th className="p-3.5">New Date</th>
                    <th className="p-3.5">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-mono text-slate-500">
                          {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3.5">
                          <Badge className={log.rescheduled_by_role === "patient" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}>
                            {log.rescheduled_by_role?.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-3.5 font-medium text-slate-600">
                          {new Date(log.previous_date).toLocaleDateString()} {new Date(log.previous_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          {new Date(log.new_date).toLocaleDateString()} {new Date(log.new_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3.5 text-slate-600 italic">"{log.reason || 'No note provided'}"</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-xs text-slate-500">
                        No rescheduling events recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

