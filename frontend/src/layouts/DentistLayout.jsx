import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  LogOut,
  User,
  Users,
  FileText,
  ClipboardList,
  Pill,
  Settings,
  Building2,
  ChevronRight,
  Bell,
  AlertCircle,
  CheckCircle2,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { formatTimeAgo } from "../lib/utils";
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
} from "../components/ui/sidebar";
import { Separator } from "../components/ui/separator";

const dentistNavItemsGeneral = [
  { title: "Live Queue", url: "/dentist/queue", icon: Users },
  { title: "Patient Records", url: "/dentist/records", icon: FileText },
  { title: "Treatment Logs", url: "/dentist/treatments", icon: ClipboardList },
  { title: "Prescriptions", url: "/dentist/prescriptions", icon: Pill },
];

export default function DentistLayout() {
  const { user, logout, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [branchName, setBranchName] = useState("Pasig Branch");

  const dentistFullName = profile?.first_name 
    ? `Dr. ${profile.first_name} ${profile.last_name || ''}`.trim()
    : user?.user_metadata?.first_name
      ? `Dr. ${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
      : user?.email ? "Dr. " + user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : "Dentist";

  const dentistInitial = (profile?.first_name || user?.user_metadata?.first_name)
    ? (profile?.first_name || user?.user_metadata?.first_name).charAt(0).toUpperCase()
    : (user?.email ? user.email.charAt(0).toUpperCase() : "D");

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

  const fetchDentistNotifications = async () => {
    try {
      const storageKey = `dams_notif_cleared_dentist_${user?.id || 'default'}`;
      const clearedTime = localStorage.getItem(storageKey);
      
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, timestamp, component, action, severity")
        .order("timestamp", { ascending: false })
        .limit(15);

      if (!error && data) {
        let validLogs = data;
        if (clearedTime) {
          const clearedDate = new Date(clearedTime).getTime();
          validLogs = data.filter(log => new Date(log.timestamp).getTime() > clearedDate);
        }
        const mapped = validLogs.map(item => ({
          id: item.id,
          title: item.component || "Clinical Alert",
          text: item.action,
          time: formatTimeAgo(item.timestamp),
          rawTime: item.timestamp,
          type: item.severity === "success" ? "success" : (item.severity === "warning" || item.severity === "error" ? "alert" : "info")
        }));
        setNotifications(mapped);
      }
    } catch (err) {
      console.error("Error fetching dentist notifications:", err);
    }
  };

  useEffect(() => {
    fetchDentistNotifications();
    const interval = setInterval(fetchDentistNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const clearNotifications = () => {
    const storageKey = `dams_notif_cleared_dentist_${user?.id || 'default'}`;
    localStorage.setItem(storageKey, new Date().toISOString());
    setNotifications([]);
    toast.success("Notifications cleared");
  };

  const notifRef = useRef(null);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("is_available")
          .eq("id", user.id)
          .single();
        if (error) throw error;
        if (data) setIsAvailable(data.is_available);
      } catch (err) {
        console.error("Failed to fetch availability status:", err);
      }
    };
    fetchStatus();
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleAvailability = async () => {
    if (!user?.id || isLoadingStatus) return;
    setIsLoadingStatus(true);
    const newStatus = !isAvailable;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_available: newStatus })
        .eq("id", user.id);
      if (error) throw error;
      setIsAvailable(newStatus);
      toast.success(`You are now marked as ${newStatus ? 'Available' : 'Offline'}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update availability");
    } finally {
      setIsLoadingStatus(false);
    }
  };

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
    if (pathname.includes("queue")) return "Live Queue";
    if (pathname.includes("records")) return "Patient Records";
    if (pathname.includes("treatments")) return "Treatment Logs";
    if (pathname.includes("prescriptions")) return "Prescriptions";
    if (pathname.includes("settings")) return "Settings";
    return "Clinical Portal";
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white">
        
        {/* Sidebar Header Logo - Dark Obsidian & Red Teeth Talk Brand */}
        <SidebarHeader className="pt-6 pb-4 border-b border-slate-100 transition-all duration-300 ease-in-out group-data-[collapsible=icon]:pt-4 group-data-[collapsible=icon]:pb-2">
          <div className="flex items-center gap-3 px-4 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center transition-all duration-300">
            <div className="flex aspect-square h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 p-1 text-white shadow-md border border-slate-900 transition-all duration-300 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 overflow-hidden">
              <img src="/teeth_talk_logo.png" alt="Teeth Talk Logo" className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-col gap-0.5 transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-950">Teeth Talk</span>
                <span className="text-[10px] font-extrabold bg-red-600 text-white px-2 py-0.5 rounded uppercase tracking-wider">DENTIST</span>
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Teeth Talk Dental Clinic</span>
            </div>
          </div>
        </SidebarHeader>

        {/* Sidebar Navigation Items */}
        <SidebarContent className="px-2 pt-4">
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 text-xs font-bold text-slate-500 tracking-wider mb-3 uppercase group-data-[collapsible=icon]:opacity-0">
              Clinical Tools
            </SidebarGroupLabel>
            
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1.5">
                {dentistNavItemsGeneral.map((item) => {
                  const isActive = location.pathname === item.url || (location.pathname.startsWith(item.url) && item.url !== "/dentist");
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
                        <Link to={item.url}>
                          <item.icon className={`h-5 w-5 shrink-0 transition-colors ${isActive ? 'text-red-500' : 'text-slate-400 group-hover:text-slate-900'}`} />
                          <span className="text-sm font-medium transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Sidebar Footer Account Info */}
        <SidebarFooter className="p-4 pb-6 border-t border-slate-100 transition-all duration-300 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:pb-3">
          <SidebarMenu>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isDropdownOpen ? 'max-h-32 opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'}`}>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  className="w-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-start group-data-[collapsible=icon]:justify-center gap-3 px-3.5 py-2.5 rounded-lg border border-transparent transition-all duration-200 mb-1"
                >
                  <Link to="/dentist/settings">
                    <Settings className="h-5 w-5 shrink-0 text-slate-500" />
                    <span className="font-semibold text-sm transition-all duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
                  {dentistInitial}
                </div>
                <div className="flex flex-col text-left transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap min-w-0">
                  <span className="font-bold text-sm text-slate-900 group-hover:text-slate-950 transition-colors truncate max-w-[140px]" title={dentistFullName}>
                    {dentistFullName}
                  </span>
                  <span className="text-xs text-slate-500 font-medium tracking-wide">Attending Doctor</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

      </Sidebar>
      
      {/* Main Panel Area */}
      <SidebarInset className="bg-slate-50/20">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6 backdrop-blur-md justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="-ml-1 text-slate-500 hover:text-slate-800 transition-colors" />
            <Separator orientation="vertical" className="h-5 bg-slate-200" />
            
            {/* Dynamic Breadcrumb Route Display */}
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
              <span className="text-slate-400">Dentist</span>
              <ChevronRight className="h-4 w-4 text-slate-300" />
              <span className="text-slate-950 font-bold">{getHeaderTitle(location.pathname)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Availability Status Toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg shadow-xs">
              <span className={`text-xs font-bold uppercase tracking-wider ${isAvailable ? 'text-emerald-600' : 'text-slate-500'}`}>
                {isAvailable ? 'Available' : 'Offline'}
              </span>
              <button 
                onClick={toggleAvailability}
                disabled={isLoadingStatus}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isAvailable ? 'bg-emerald-600' : 'bg-slate-300'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAvailable ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Static Assigned Branch Badge */}
            <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 text-slate-800 rounded-lg text-sm font-semibold border border-slate-200 shadow-xs">
              <Building2 className="h-4.5 w-4.5 text-red-600" />
              <span>{branchName}</span>
            </div>

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
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">Notifications</span>
                      <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">
                        {notifications.length} New
                      </span>
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

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div key={notif.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-3">
                          <div className="mt-0.5 shrink-0">
                            {notif.type === "alert" && <AlertCircle className="h-5 w-5 text-red-500" />}
                            {notif.type === "info" && <Info className="h-5 w-5 text-blue-500" />}
                            {notif.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-xs font-bold text-slate-900 truncate">{notif.title}</h4>
                              <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">{notif.time}</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{notif.text}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-400 space-y-2">
                        <Bell className="h-8 w-8 mx-auto text-slate-300" />
                        <p className="text-xs font-medium">No new notifications</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
