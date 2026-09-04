import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, User, LayoutDashboard, Calendar, CalendarCheck, Pill, History, MessageSquareText, ShieldPlus, Building2, ChevronDown, Settings, ClipboardList, PhilippinePeso, Bell } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
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

// Menu items for the patient dashboard sidebar.
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

import { supabase } from "../lib/supabase";

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
        
      if (!error && data) {
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Setup realtime subscription
    const subscription = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `patient_id=eq.${user?.id}` }, payload => {
        fetchNotifications();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const markAsRead = async (id) => {
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error("Error marking notification as read:", err);
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
          // If no medical history, redirect to onboarding
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
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
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

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-border/40 bg-background/95 backdrop-blur-sm">
        <SidebarHeader className="pt-6 pb-4 transition-all duration-300 ease-in-out group-data-[collapsible=icon]:pt-4 group-data-[collapsible=icon]:pb-2">
          <div className="flex items-center gap-3 px-4 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center transition-all duration-300">
            <div className="flex aspect-square h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
              <ShieldPlus className="h-5 w-5 transition-all duration-300 group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:w-4" />
            </div>
            <div className="flex flex-col gap-0 transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">
              <span className="font-semibold text-base tracking-tight text-foreground">Teeth Talk</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Dental Clinic</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2 transition-all duration-300 group-data-[collapsible=icon]:px-1">
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 text-xs font-medium text-muted-foreground/60 mb-2 transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">
              MAIN MENU
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {patientNavItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        tooltip={item.title} 
                        isActive={isActive}
                        className={`transition-all duration-300 ease-in-out group-data-[collapsible=icon]:justify-center ${isActive ? 'bg-primary/10 text-primary font-semibold relative after:absolute after:left-0 after:top-1/2 after:-translate-y-1/2 after:h-2/3 after:w-1 after:bg-primary after:rounded-r-md' : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'}`}
                      >
                        <Link to={item.url}>
                          <item.icon className={`transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground/70'}`} />
                          <span className="transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4 pb-6 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:pb-4 transition-all duration-300 ease-in-out">
          <SidebarMenu>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isDropdownOpen ? 'max-h-32 opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'}`}>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  className="w-full text-muted-foreground hover:bg-accent/40 hover:text-foreground group flex items-center justify-start group-data-[collapsible=icon]:justify-center gap-3 group-data-[collapsible=icon]:gap-0 px-3 group-data-[collapsible=icon]:px-0 py-2 rounded-xl transition-all duration-300 mb-1"
                >
                  <Link to="/patient/settings">
                    <Settings className="h-5 w-5 transition-transform duration-300 group-hover:rotate-45 shrink-0" />
                    <span className="font-medium text-sm transition-all duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={handleLogout}
                  className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive group flex items-center justify-start group-data-[collapsible=icon]:justify-center gap-3 group-data-[collapsible=icon]:gap-0 px-3 group-data-[collapsible=icon]:px-0 py-2 rounded-xl transition-all duration-300"
                >
                  <LogOut className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1 shrink-0" />
                  <span className="font-medium text-sm transition-all duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">Log out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </div>

            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                className="h-auto py-2.5 px-3 group-data-[collapsible=icon]:px-0 flex items-center justify-start group-data-[collapsible=icon]:justify-center gap-3 group-data-[collapsible=icon]:gap-0 w-full rounded-xl hover:bg-primary/5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out group"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm border border-primary/20 transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-md">
                  <User className="h-4 w-4" />
                </div>
                <span className="font-semibold text-sm transition-all duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap text-slate-700 dark:text-slate-200 group-hover:text-primary">
                  {user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : "Patient"}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      
      <SidebarInset className="bg-muted/10">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border/40 bg-background/70 px-4 backdrop-blur-xl transition-all">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
          <Separator orientation="vertical" className="h-4 bg-border/40" />
          
          <div className="flex-1" />
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                <Bell className="h-5 w-5" />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full text-[10px]">
                    {notifications.filter(n => !n.is_read).length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 mr-4 mt-2" align="end">
              <div className="flex items-center justify-between p-4 border-b">
                <h4 className="font-semibold text-sm">Notifications</h4>
                <Button variant="ghost" size="sm" className="text-xs h-8 text-muted-foreground" onClick={() => {
                  notifications.filter(n => !n.is_read).forEach(n => markAsRead(n.id));
                }}>
                  Mark all as read
                </Button>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No notifications yet
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`p-4 border-b last:border-b-0 cursor-pointer transition-colors hover:bg-muted/50 ${!notification.is_read ? 'bg-primary/5' : ''}`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h5 className={`text-sm font-medium ${!notification.is_read ? 'text-primary' : ''}`}>{notification.title}</h5>
                          {!notification.is_read && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{notification.message}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8">
          <div className="mx-auto max-w-6xl w-full min-w-0">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
