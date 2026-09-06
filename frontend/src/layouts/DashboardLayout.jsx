import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, User, LayoutDashboard, CalendarCheck, Pill, History, MessageSquareText, Settings, ClipboardList, PhilippinePeso, Bell, ChevronRight, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { supabase } from "../lib/supabase";
import { formatTimeAgo } from "../lib/utils";

const patientNavItems = [
  {
    title: "Overview",
    url: "/patient/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Appointments",
    url: "/patient/appointments",
    icon: CalendarCheck,
  },
  {
    title: "My Record",
    url: "/patient/my-record",
    icon: ClipboardList,
  },
  {
    title: "Prescriptions",
    url: "/patient/prescriptions",
    icon: Pill,
  },
  {
    title: "Treatments",
    url: "/patient/treatments",
    icon: History,
  },
  {
    title: "AI Assistant",
    url: "/patient/ai-assistant",
    icon: MessageSquareText,
  },
  {
    title: "Billing & Payments",
    url: "/patient/billing",
    icon: PhilippinePeso,
  },
];

export default function DashboardLayout() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [notifications, setNotifications] = useState([]);

  const patientFullName = profile?.first_name 
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : user?.user_metadata?.first_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
      : user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : "Patient";

  const patientInitial = (profile?.first_name || user?.user_metadata?.first_name)
    ? (profile?.first_name || user?.user_metadata?.first_name).charAt(0).toUpperCase()
    : (user?.email ? user.email.charAt(0).toUpperCase() : "P");

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const storageKey = `dams_notif_cleared_patient_${user.id}`;
      const clearedTime = localStorage.getItem(storageKey);

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
        
      if (!error && data) {
        let valid = data;
        if (clearedTime) {
          const clearedDate = new Date(clearedTime).getTime();
          valid = data.filter(n => new Date(n.created_at).getTime() > clearedDate);
        }
        setNotifications(valid);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const subscription = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `patient_id=eq.${user?.id}` }, () => {
        fetchNotifications();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const markAsRead = async (id) => {
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("patient_id", user.id)
        .eq("is_read", false);
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const clearNotifications = async () => {
    if (!user) return;
    try {
      const storageKey = `dams_notif_cleared_patient_${user.id}`;
      localStorage.setItem(storageKey, new Date().toISOString());
      setNotifications([]);
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("patient_id", user.id)
        .eq("is_read", false);
      toast.success("Notifications cleared");
    } catch (err) {
      console.error("Error clearing notifications:", err);
    }
  };

  // Onboarding Check
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("medical_histories")
          .select("id")
          .eq("patient_id", user.id)
          .single();
          
        if (error || !data) {
          navigate("/patient/onboarding", { replace: true });
        }
      } catch (err) {
        console.error("Error checking onboarding status:", err);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };
    
    checkOnboarding();
  }, [user, navigate]);

  if (isCheckingOnboarding) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-950 border-r-transparent"></div>
      </div>
    );
  }

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
    const matched = patientNavItems.find(item => item.url === pathname);
    if (matched) return matched.title;
    if (pathname.includes("settings")) return "Settings";
    return "Patient Portal";
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
                <span className="text-[10px] font-extrabold bg-red-600 text-white px-2 py-0.5 rounded uppercase tracking-wider">PATIENT</span>
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Teeth Talk Dental Clinic</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 pt-4">
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 text-xs font-bold text-slate-500 tracking-wider mb-3 uppercase group-data-[collapsible=icon]:opacity-0">
              Patient Portal
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1.5">
                {patientNavItems.map((item) => {
                  const isActive = location.pathname === item.url;
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

        <SidebarFooter className="p-4 pb-6 border-t border-slate-100 transition-all duration-300 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:pb-3">
          <SidebarMenu>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isDropdownOpen ? 'max-h-32 opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'}`}>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  className="w-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-start group-data-[collapsible=icon]:justify-center gap-3 px-3.5 py-2.5 rounded-lg border border-transparent transition-all duration-200 mb-1"
                >
                  <Link to="/patient/settings">
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
                  {patientInitial}
                </div>
                <div className="flex flex-col text-left transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap min-w-0">
                  <span className="font-bold text-sm text-slate-900 group-hover:text-slate-950 transition-colors truncate max-w-[140px]" title={patientFullName}>
                    {patientFullName}
                  </span>
                  <span className="text-xs text-slate-500 font-medium tracking-wide">Registered Patient</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      
      <SidebarInset className="bg-slate-50/20">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6 backdrop-blur-md justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="-ml-1 text-slate-500 hover:text-slate-800 transition-colors" />
            <Separator orientation="vertical" className="h-5 bg-slate-200" />
            
            {/* Dynamic Breadcrumb Route Display */}
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
              <span className="text-slate-400">Patient</span>
              <ChevronRight className="h-4 w-4 text-slate-300" />
              <span className="text-slate-950 font-bold">{getHeaderTitle(location.pathname)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Live Portal Indicator Badge */}
            <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border-slate-200 bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs">
              <Building2 className="h-3.5 w-3.5 text-slate-500" />
              <span>Teeth Talk Patient Care</span>
            </Badge>

            {/* Notifications Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="relative p-2 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
                  <Bell className="h-5 w-5 text-slate-600" />
                  {notifications.filter(n => !n.is_read).length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-600 text-[10px] font-extrabold text-white shadow-xs animate-pulse">
                      {notifications.filter(n => !n.is_read).length}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 sm:w-96 p-0 mr-4 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden" align="end">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm">Notifications</h4>
                    {notifications.filter(n => !n.is_read).length > 0 && (
                      <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0.2">
                        {notifications.filter(n => !n.is_read).length} new
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {notifications.filter(n => !n.is_read).length > 0 && (
                      <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-slate-500 hover:text-slate-800 font-semibold" onClick={markAllAsRead}>
                        Mark read
                      </Button>
                    )}
                    {notifications.length > 0 && (
                      <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-slate-500 hover:text-slate-800 font-semibold" onClick={clearNotifications}>
                        Clear all
                      </Button>
                    )}
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 space-y-2">
                      <Bell className="h-8 w-8 mx-auto text-slate-300" />
                      <p className="text-xs font-medium">No notifications yet</p>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {notifications.map((notification) => (
                        <div 
                          key={notification.id} 
                          className={`p-4 border-b last:border-b-0 cursor-pointer transition-colors hover:bg-slate-50 ${!notification.is_read ? 'bg-red-50/30' : ''}`}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <h5 className={`text-xs font-bold ${!notification.is_read ? 'text-red-600' : 'text-slate-900'}`}>{notification.title}</h5>
                            {!notification.is_read && <div className="h-2 w-2 rounded-full bg-red-600 mt-1 shrink-0" />}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{notification.message}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-slate-400 font-medium">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                            <span className="text-[9px] text-slate-300">
                              {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8">
          <div className="mx-auto max-w-7xl w-full min-w-0">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
