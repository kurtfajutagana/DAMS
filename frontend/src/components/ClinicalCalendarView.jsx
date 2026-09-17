import { useState, useMemo } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Building2,
  Stethoscope,
  CheckCircle2,
  CalendarClock,
  Eye
} from "lucide-react";
import { STANDARD_CLINIC_SLOTS, formatTimeTo12h } from "../lib/schedulingValidation";

export default function ClinicalCalendarView({
  appointments = [],
  dentists = [],
  branches = [],
  lockedDentistId = null,
  onSelectAppointment = null,
  onReschedule = null,
  onCheckIn = null,
  isDentistView = false
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState("month"); // "month" | "week" | "day"
  const [selectedDentistFilter, setSelectedDentistFilter] = useState(lockedDentistId || "all");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");

  // Filtered appointments by dentist and branch
  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      const docId = lockedDentistId || (selectedDentistFilter !== "all" ? selectedDentistFilter : null);
      if (docId && apt.dentist_id !== docId) return false;
      if (selectedBranchFilter !== "all" && apt.branch_id && apt.branch_id !== selectedBranchFilter) return false;
      return true;
    });
  }, [appointments, lockedDentistId, selectedDentistFilter, selectedBranchFilter]);

  // Navigation handlers
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (calendarView === "month") {
      d.setMonth(d.getMonth() - 1);
    } else if (calendarView === "week") {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (calendarView === "month") {
      d.setMonth(d.getMonth() + 1);
    } else if (calendarView === "week") {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusBadge = (status) => {
    switch ((status || "").toLowerCase()) {
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] px-1.5 py-0">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] px-1.5 py-0">In Progress</Badge>;
      case "waiting":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] px-1.5 py-0">Waiting</Badge>;
      case "scheduled":
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 text-[10px] px-1.5 py-0">Scheduled</Badge>;
      case "cancelled":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] px-1.5 py-0">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-600 text-[10px] px-1.5 py-0">{status || "Pending"}</Badge>;
    }
  };

  // Month grid calculations
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const days = [];

    // Preceding empty/prev-month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      });
    }

    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Trailing padding to make multiple of 7
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  }, [currentDate]);

  // Week days calculations
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const monday = new Date(d.setDate(diff));

    const week = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      week.push(nextDay);
    }
    return week;
  }, [currentDate]);

  // Format header title
  const headerTitle = useMemo(() => {
    if (calendarView === "month") {
      return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } else if (calendarView === "week") {
      const start = weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const end = weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return `${start} – ${end}`;
    } else {
      return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    }
  }, [calendarView, currentDate, weekDays]);

  const isToday = (d) => {
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  return (
    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
      {/* Calendar Top Controls */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrev} className="h-8 w-8 p-0 rounded-lg">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday} className="h-8 px-2.5 text-xs font-bold rounded-lg">
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext} className="h-8 w-8 p-0 rounded-lg">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-950 ml-2">
            {headerTitle}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Branch Filter */}
          {branches.length > 0 && (
            <Select value={selectedBranchFilter} onValueChange={setSelectedBranchFilter}>
              <SelectTrigger className="h-8 text-xs rounded-lg min-w-[130px]">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Branches</SelectItem>
                {branches.map(b => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">
                    {b.branch_name} Branch
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Dentist Filter */}
          {!lockedDentistId && dentists.length > 0 && (
            <Select value={selectedDentistFilter} onValueChange={setSelectedDentistFilter}>
              <SelectTrigger className="h-8 text-xs rounded-lg min-w-[140px]">
                <SelectValue placeholder="All Doctors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Doctors</SelectItem>
                {dentists.map(d => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    Dr. {d.first_name} {d.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* View Mode Selector */}
          <div className="flex bg-slate-200/80 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setCalendarView("month")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${calendarView === "month" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              Month
            </button>
            <button
              onClick={() => setCalendarView("week")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${calendarView === "week" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              Week
            </button>
            <button
              onClick={() => setCalendarView("day")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${calendarView === "day" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              Day
            </button>
          </div>
        </div>
      </div>

      {/* MONTH VIEW */}
      {calendarView === "month" && (
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70 text-center text-xs font-bold text-slate-500 py-2">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
              {monthDays.map(({ date, isCurrentMonth }, idx) => {
                const dateStr = date.toDateString();
                const dayApts = filteredAppointments.filter(a => new Date(a.appointment_date).toDateString() === dateStr);
                const isCurrent = isToday(date);

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setCurrentDate(date);
                      setCalendarView("day");
                    }}
                    className={`min-h-[105px] p-2 transition-colors cursor-pointer group ${
                      !isCurrentMonth ? "bg-slate-50/40 text-slate-300" : "bg-white text-slate-800 hover:bg-indigo-50/30"
                    } ${isCurrent ? "bg-indigo-50/20" : ""}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-extrabold h-6 w-6 flex items-center justify-center rounded-full ${
                        isCurrent ? "bg-indigo-600 text-white shadow-xs" : isCurrentMonth ? "text-slate-700" : "text-slate-300"
                      }`}>
                        {date.getDate()}
                      </span>
                      {dayApts.length > 0 && (
                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-600">
                          {dayApts.length} {dayApts.length === 1 ? "apt" : "apts"}
                        </span>
                      )}
                    </div>

                    {/* Appointment Chips Preview */}
                    <div className="space-y-1 overflow-hidden">
                      {dayApts.slice(0, 3).map((apt) => {
                        const time = new Date(apt.appointment_date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                        return (
                          <div
                            key={apt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectAppointment) onSelectAppointment(apt);
                            }}
                            className="text-[10px] truncate rounded px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-100 text-slate-700 font-medium flex items-center justify-between gap-1 transition-colors"
                          >
                            <span className="truncate font-semibold">{time} {apt.patient?.first_name || "Patient"}</span>
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                              apt.status === "completed" ? "bg-emerald-500" : apt.status === "in_progress" ? "bg-amber-500" : "bg-indigo-500"
                            }`} />
                          </div>
                        );
                      })}
                      {dayApts.length > 3 && (
                        <p className="text-[9px] font-extrabold text-indigo-600 pl-1">
                          +{dayApts.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {calendarView === "week" && (
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Week Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center divide-x divide-slate-100 py-3">
              {weekDays.map((d, i) => {
                const current = isToday(d);
                return (
                  <div key={i} className="px-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {d.toLocaleDateString("en-US", { weekday: "short" })}
                    </p>
                    <p className={`text-sm font-extrabold mt-0.5 inline-block px-2 py-0.5 rounded-full ${
                      current ? "bg-indigo-600 text-white" : "text-slate-900"
                    }`}>
                      {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Week Columns */}
            <div className="grid grid-cols-7 divide-x divide-slate-100 min-h-[420px]">
              {weekDays.map((d, i) => {
                const dStr = d.toDateString();
                const dayApts = filteredAppointments.filter(a => new Date(a.appointment_date).toDateString() === dStr);
                return (
                  <div key={i} className="p-2 space-y-2 bg-white">
                    {dayApts.length > 0 ? (
                      dayApts.map(apt => {
                        const time = new Date(apt.appointment_date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                        return (
                          <div
                            key={apt.id}
                            onClick={() => onSelectAppointment && onSelectAppointment(apt)}
                            className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer space-y-1.5"
                          >
                            <div className="flex justify-between items-start gap-1">
                              <span className="text-[11px] font-mono font-bold text-indigo-700">{time}</span>
                              {getStatusBadge(apt.status)}
                            </div>
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {apt.patient ? `${apt.patient.first_name} ${apt.patient.last_name}` : "Walk-in Patient"}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                              <Stethoscope className="h-3 w-3" /> {apt.service_requested || "General Consultation"}
                            </p>
                            {!isDentistView && apt.dentist && (
                              <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                                <User className="h-3 w-3" /> Dr. {apt.dentist.first_name} {apt.dentist.last_name}
                              </p>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="h-28 flex items-center justify-center text-center">
                        <span className="text-[11px] text-slate-300 font-medium italic">No bookings</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DAY VIEW */}
      {calendarView === "day" && (
        <div className="p-4 space-y-3">
          <div className="divide-y divide-slate-100">
            {STANDARD_CLINIC_SLOTS.map((slot) => {
              const [h, m] = slot.split(" ")[0].split(":");
              const isPm = slot.includes("PM");
              let hourNum = parseInt(h, 10);
              if (isPm && hourNum < 12) hourNum += 12;

              // Find appointments matching this slot on currentDate
              const matchingApts = filteredAppointments.filter(a => {
                const aptDate = new Date(a.appointment_date);
                if (aptDate.toDateString() !== currentDate.toDateString()) return false;
                const aptHour = aptDate.getHours();
                return Math.abs(aptHour - hourNum) < 1;
              });

              return (
                <div key={slot} className="py-3 flex items-start gap-4">
                  <div className="w-20 pt-1 shrink-0 text-right">
                    <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md">
                      {slot}
                    </span>
                  </div>

                  <div className="flex-1 min-h-[48px] rounded-xl border border-slate-100 bg-slate-50/40 p-2">
                    {matchingApts.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {matchingApts.map(apt => (
                          <div
                            key={apt.id}
                            className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3"
                          >
                            <div className="space-y-0.5 truncate">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">
                                  {apt.patient ? `${apt.patient.first_name} ${apt.patient.last_name}` : "Walk-in Patient"}
                                </span>
                                {getStatusBadge(apt.status)}
                              </div>
                              <p className="text-[11px] text-slate-600 truncate flex items-center gap-1.5">
                                <Stethoscope className="h-3 w-3 text-slate-400" />
                                {apt.service_requested || "General Consultation"}
                              </p>
                              {apt.dentist && (
                                <p className="text-[10px] text-slate-400 truncate flex items-center gap-1.5">
                                  <User className="h-3 w-3" /> Dr. {apt.dentist.first_name} {apt.dentist.last_name}
                                </p>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {onCheckIn && apt.status === "scheduled" && (
                                <Button
                                  size="sm"
                                  onClick={() => onCheckIn(apt)}
                                  className="h-7 text-xs bg-slate-950 text-white font-semibold rounded-lg"
                                >
                                  Check In
                                </Button>
                              )}
                              {onReschedule && (apt.status === "scheduled" || apt.status === "pending") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onReschedule(apt)}
                                  className="h-7 text-xs rounded-lg text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                >
                                  Reschedule
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex items-center">
                        <span className="text-xs text-slate-300 italic font-medium pl-2">Available Slot</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

