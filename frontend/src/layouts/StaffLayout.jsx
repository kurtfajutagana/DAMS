import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  LogOut,
  User,
  FileText,
  Users,
  ClipboardList,
  Printer,
  Settings,
  FolderOpen,
  Calendar,
  PhilippinePeso,
  LayoutDashboard,
  Building2,
  ChevronRight,
  Bell,
  AlertCircle,
  CheckCircle2,
  Info,
  HelpCircle,
  Clock,
  Stethoscope,
  Activity,
  Volume2,
  VolumeX
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarInset,
  useSidebar
} from "../components/ui/sidebar";
import { Separator } from "../components/ui/separator";
import { Button } from "../components/ui/button";
import { supabase } from "../lib/supabase";
import { formatTimeAgo } from "../lib/utils";
import HelpSupportModal from "../components/HelpSupportModal";

const staffNavItemsGeneral = [
  { title: "Dashboard", url: "/staff/dashboard", icon: LayoutDashboard },
  { title: "Appointments", url: "/staff/appointments", icon: Calendar },
  { title: "Forms & Records", url: "/staff/add-patient", icon: FileText },
  { title: "Patient Directory", url: "/staff/patients", icon: FolderOpen },
  { title: "Queue", url: "/staff/queue", icon: Users },
  { title: "Billing & Payments", url: "/staff/billing", icon: PhilippinePeso },
  { title: "Visit Logs", url: "/staff/visit-logs", icon: ClipboardList },
  { title: "Print Reports", url: "/staff/print-reports", icon: Printer },
];

function StaffSidebarNav({ navItems, location }) {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarMenu className="space-y-1.5">
      {navItems.map((item) => {
        const isActive = location.pathname === item.url || (location.pathname.startsWith(item.url) && item.url !== "/staff");
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton 
              asChild 
              tooltip={item.title} 
              isActive={isActive}
              className={`transition-all duration-150 rounded-lg px-3.5 py-2.5 h-auto group-data-[collapsible=icon]:justify-center ${
                isActive 
                  ? 'bg-slate-950 text-white font-semibold shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <Link to={item.url} onClick={() => { if (isMobile) setOpenMobile(false); }}>
                <item.icon className={`h-5 w-5 shrink-0 transition-colors ${isActive ? 'text-red-500' : 'text-slate-400 group-hover:text-slate-900'}`} />
                <span className="text-sm font-medium transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

function StaffSettingsLink() {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton 
        asChild
        className="w-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-start group-data-[collapsible=icon]:justify-center gap-3 px-3.5 py-2.5 rounded-lg border border-transparent transition-all duration-200 mb-1"
      >
        <Link to="/staff/settings" onClick={() => { if (isMobile) setOpenMobile(false); }}>
          <Settings className="h-5 w-5 shrink-0 text-slate-500" />
          <span className="font-semibold text-sm transition-all duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">Settings</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export default function StaffLayout() {
  const { user, logout, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const staffFullName = profile?.first_name 
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : user?.user_metadata?.first_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
      : user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : "Staff";

  const staffInitial = (profile?.first_name || user?.user_metadata?.first_name)
    ? (profile?.first_name || user?.user_metadata?.first_name).charAt(0).toUpperCase()
    : (user?.email ? user.email.charAt(0).toUpperCase() : "S");

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [branchName, setBranchName] = useState("Pasig Branch");

  useEffect(() => {
    const loadBranchName = async () => {
      if (!profile?.branch_id) return;
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
        }
      } catch (err) {
        console.error("Error loading branch name:", err);
      }
    };
    loadBranchName();
  }, [profile]);

  const [notifications, setNotifications] = useState([]);
  const [notifFilter, setNotifFilter] = useState("all");

  const fetchStaffNotifications = async () => {
    try {
      const storageKey = `dams_notif_cleared_staff_${user?.id || 'default'}`;
      const clearedTime = localStorage.getItem(storageKey);
      
      let logs = [];
      // 1. Fetch via backend endpoint (bypasses RLS)
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/api/staff/notifications?limit=50`);
        if (res.ok) {
          const json = await res.json();
          if (json?.data && Array.isArray(json.data)) {
            logs = json.data;
          }
        }
      } catch (apiErr) {
        console.warn("Backend notification fetch error, trying direct supabase:", apiErr);
      }

      // 2. Direct Supabase query fallback
      if (logs.length === 0) {
        const { data, error } = await supabase
          .from("audit_logs")
          .select("id, timestamp, component, action, severity")
          .neq("component", "System Backup & Recovery")
          .order("timestamp", { ascending: false })
          .limit(40);
        if (!error && data) {
          logs = data;
        }
      }

      if (logs && logs.length > 0) {
        let validLogs = logs;
        if (clearedTime) {
          const clearedDate = new Date(clearedTime).getTime();
          validLogs = logs.filter(log => new Date(log.timestamp).getTime() > clearedDate);
        }
        const mapped = validLogs.map(item => ({
          id: item.id,
          title: item.component || "Clinic Procedure",
          text: item.action,
          time: formatTimeAgo(item.timestamp),
          rawTime: item.timestamp,
          type: item.severity === "success" ? "success" : (item.severity === "warning" || item.severity === "error" ? "alert" : "info")
        }));
        setNotifications(mapped);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error("Error fetching staff notifications:", err);
    }
  };

  useEffect(() => {
    fetchStaffNotifications();

    const handleIncomingAlert = (item) => {
      fetchStaffNotifications();
      if (item) {
        const { component, action, severity } = item;
        if (severity === "success") {
          toast.success(component || "Procedure Completed", { description: action, duration: 5000 });
        } else if (severity === "warning" || severity === "error") {
          toast.warning(component || "Procedure Alert", { description: action, duration: 5000 });
        } else {
          toast.info(component || "Procedure Update", { description: action, duration: 5000 });
        }

        // Audio alert chime if enabled
        try {
          const prefs = profile?.preferences;
          if (prefs?.soundChimeEnabled !== false) {
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
            audio.volume = 0.25;
            audio.play().catch(() => {});
          }
        } catch (_) {}
      }
    };

    // Supabase Realtime channel for instant procedure alerts (postgres changes + broadcast)
    let channel = null;
    try {
      const existing = supabase.getChannels().find(
        c => c.topic === "realtime:clinic_realtime_alerts" || c.topic === "clinic_realtime_alerts"
      );
      if (existing) {
        supabase.removeChannel(existing);
      }

      channel = supabase
        .channel("clinic_realtime_alerts")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "audit_logs"
          },
          (payload) => {
            handleIncomingAlert(payload.new);
          }
        )
        .on(
          "broadcast",
          { event: "clinic_alert" },
          (payload) => {
            handleIncomingAlert(payload.payload);
          }
        )
        .subscribe();
    } catch (channelErr) {
      console.warn("Could not attach clinic_realtime_alerts in StaffLayout:", channelErr);
    }

    const interval = setInterval(fetchStaffNotifications, 10000);
    return () => {
      clearInterval(interval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, profile]);

  const filteredNotifications = useMemo(() => {
    if (notifFilter === "all") return notifications;
    if (notifFilter === "procedure") {
      return notifications.filter(n => {
        const combined = `${n.title || ''} ${n.text || ''}`.toLowerCase();
        return combined.includes("procedure") || combined.includes("treatment") || combined.includes("clinical");
      });
    }
    if (notifFilter === "queue") {
      return notifications.filter(n => {
        const combined = `${n.title || ''} ${n.text || ''}`.toLowerCase();
        return combined.includes("queue") || combined.includes("check-in") || combined.includes("checked in");
      });
    }
    if (notifFilter === "appointment") {
      return notifications.filter(n => {
        const combined = `${n.title || ''} ${n.text || ''}`.toLowerCase();
        return combined.includes("appointment") || combined.includes("schedul") || combined.includes("book") || combined.includes("reschedul");
      });
    }
    return notifications;
  }, [notifications, notifFilter]);

  const getNotifIcon = (notif) => {
    const combined = `${notif.title || ''} ${notif.text || ''}`.toLowerCase();
    if (combined.includes("appointment") || combined.includes("schedul") || combined.includes("book")) {
      return <Calendar className="h-4 w-4 text-blue-600" />;
    }
    if (combined.includes("queue") || combined.includes("check")) {
      return <Clock className="h-4 w-4 text-purple-600" />;
    }
    if (combined.includes("procedure") || combined.includes("treatment")) {
      return <Stethoscope className="h-4 w-4 text-emerald-600" />;
    }
    if (notif.type === "alert") return <AlertCircle className="h-4 w-4 text-rose-500" />;
    if (notif.type === "success") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    return <Info className="h-4 w-4 text-blue-500" />;
  };

  const getNotifCategoryBadge = (title = "", text = "") => {
    const combined = `${title} ${text}`.toLowerCase();
    if (combined.includes("appointment") || combined.includes("schedul") || combined.includes("book")) {
      return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase">Appointment</span>;
    }
    if (combined.includes("queue") || combined.includes("check")) {
      return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 uppercase">Queue</span>;
    }
    if (combined.includes("procedure") || combined.includes("treatment")) {
      return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">Procedure</span>;
    }
    return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase">Alert</span>;
  };

  const clearNotifications = () => {
    const storageKey = `dams_notif_cleared_staff_${user?.id || 'default'}`;
    localStorage.setItem(storageKey, new Date().toISOString());
    setNotifications([]);
    toast.success("Notifications cleared");
  };

  const notifRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (err) {
      console.error(err);
      toast.error("Failed to log out");
    }
  };

  const getHeaderTitle = (pathname) => {
    if (pathname.includes("dashboard")) return "Dashboard";
    if (pathname.includes("appointments")) return "Appointments";
    if (pathname.includes("add-patient")) return "Forms & Records";
    if (pathname.includes("patients")) return "Patient Directory";
    if (pathname.includes("queue")) return "Live Queue";
    if (pathname.includes("billing")) return "Billing & Payments";
    if (pathname.includes("visit-logs")) return "Visit Logs";
    if (pathname.includes("prescriptions")) return "Prescriptions";
    if (pathname.includes("print-reports")) return "Print Reports";
    if (pathname.includes("settings")) return "Settings";
    return "Staff Portal";
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white">
        
        {/* Sidebar Header - Obsidian & Red Teeth Talk Brand */}
        <SidebarHeader className="pt-6 pb-4 border-b border-slate-100 transition-all duration-300 ease-in-out group-data-[collapsible=icon]:pt-4 group-data-[collapsible=icon]:pb-2">
          <div className="flex items-center gap-3 px-4 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center transition-all duration-300">
            <div className="flex aspect-square h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 p-1 text-white shadow-md border border-slate-900 transition-all duration-300 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 overflow-hidden">
              <img src="/teeth_talk_logo.png" alt="Teeth Talk Logo" className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-col gap-0.5 transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-950">Teeth Talk</span>
                <span className="text-[10px] font-extrabold bg-red-600 text-white px-2 py-0.5 rounded uppercase tracking-wider">STAFF</span>
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Teeth Talk Dental Clinic</span>
            </div>
          </div>
        </SidebarHeader>

        {/* Sidebar Navigation Items */}
        <SidebarContent className="px-2 pt-4">
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 text-xs font-bold text-slate-500 tracking-wider mb-3 uppercase group-data-[collapsible=icon]:opacity-0">
              Staff Portal
            </SidebarGroupLabel>
            
            <SidebarGroupContent>
              <StaffSidebarNav navItems={staffNavItemsGeneral} location={location} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Sidebar Footer Account Info */}
        <SidebarFooter className="p-4 pb-6 border-t border-slate-100 transition-all duration-300 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:pb-3">
          <SidebarMenu>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isDropdownOpen ? 'max-h-32 opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'}`}>
              <StaffSettingsLink />
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={handleLogout}
                  className="w-full text-red-650 hover:bg-red-50 hover:text-red-700 flex items-center justify-start group-data-[collapsible=icon]:justify-center gap-3 px-3.5 py-2.5 rounded-lg border border-transparent hover:border-red-100 transition-all duration-200"
                >
                  <LogOut className="h-5 w-5 shrink-0 text-red-500" />
                  <span className="font-semibold text-sm transition-all duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">Log out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </div>

            <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
              <SidebarMenuButton 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                className="h-auto py-2.5 px-3 flex items-center justify-start group-data-[collapsible=icon]:justify-center gap-3 w-full rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all duration-200 group group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:gap-0"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white font-bold text-xs border border-slate-900 transition-all duration-200 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 shadow-xs">
                  {staffInitial}
                </div>
                <div className="flex flex-col text-left transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap min-w-0">
                  <span className="font-bold text-sm text-slate-900 group-hover:text-slate-950 transition-colors truncate max-w-[140px]" title={staffFullName}>
                    {staffFullName}
                  </span>
                  <span className="text-xs text-slate-500 font-medium tracking-wide">Clinic Personnel</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

      </Sidebar>

      {/* Main Panel Area */}
      <SidebarInset className="bg-slate-50/20">
        
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6 backdrop-blur-md justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="-ml-1 text-slate-500 hover:text-slate-800 transition-colors" />
            <Separator orientation="vertical" className="h-5 bg-slate-200" />
            
            {/* Dynamic Breadcrumb Route Display */}
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
              <span className="text-slate-400">Staff</span>
              <ChevronRight className="h-4 w-4 text-slate-300" />
              <span className="text-slate-950 font-bold">{getHeaderTitle(location.pathname)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Static Assigned Branch Badge */}
            <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 text-slate-800 rounded-lg text-sm font-semibold border border-slate-200 shadow-xs">
              <Building2 className="h-4.5 w-4.5 text-red-600" />
              <span>{branchName}</span>
            </div>

            {/* Help & Contact Support Modal Trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-slate-700 hover:text-slate-950 border-slate-200 bg-slate-50/80 hover:bg-slate-100"
              title="Help & Clinic Contact Information"
            >
              <HelpCircle className="h-4 w-4 text-red-600" />
              <span className="hidden md:inline">Help & Contact</span>
            </Button>

            {/* Notification Bell Popover */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                aria-label="View notifications"
              >
                <Bell className="h-5 w-5 text-slate-600" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs">
                    {notifications.length}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-84 sm:w-[420px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">Procedure & Clinic Alerts</span>
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      {notifications.length > 0 && (
                        <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                          {notifications.length} New
                        </span>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearNotifications}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100/70 border-b border-slate-100 overflow-x-auto text-[11px] font-semibold text-slate-600">
                    {[
                      { id: "all", label: "All" },
                      { id: "procedure", label: "Procedures" },
                      { id: "queue", label: "Queue In" },
                      { id: "appointment", label: "Appointments" }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setNotifFilter(tab.id)}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          notifFilter === tab.id
                            ? "bg-slate-900 text-white shadow-2xs font-bold"
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-88 overflow-y-auto divide-y divide-slate-100">
                    {filteredNotifications.length > 0 ? (
                      filteredNotifications.map((notif) => (
                        <div key={notif.id} className="p-3.5 hover:bg-slate-50/80 transition-colors flex gap-3">
                          <div className="mt-0.5 shrink-0 p-2 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                            {getNotifIcon(notif)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1.5 truncate">
                                <h4 className="text-xs font-bold text-slate-900 truncate">{notif.title}</h4>
                                {getNotifCategoryBadge(notif.title, notif.text)}
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-1 font-mono">{notif.time}</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed font-normal">{notif.text}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-400 space-y-2">
                        <Bell className="h-8 w-8 mx-auto text-slate-300" />
                        <p className="text-xs font-semibold text-slate-600">No procedure notifications</p>
                        <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                          New procedures like appointments, reschedules, queue check-ins, and doctor treatments will stream here in real time.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content View Outlet */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </SidebarInset>

      {/* Universal Help & Support Modal */}
      <HelpSupportModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </SidebarProvider>
  );
}
