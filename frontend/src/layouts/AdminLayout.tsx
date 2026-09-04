import React, { useState, useEffect, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import {
  LayoutDashboard,
  FileBarChart,
  Activity,
  Users,
  Brain,
  Building2,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  ShieldCheck,
  Check,
  Bell,
  AlertCircle,
  CheckCircle2,
  Info,
  X
} from "lucide-react";
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

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>("All Branches");

  const [notifications, setNotifications] = useState([
    { id: 1, title: "High Risk Alert", text: "Patient Maria Santos flagged with severe post-op pain score 85%.", time: "10m ago", type: "alert" },
    { id: 2, title: "Payment Receipt Submitted", text: "GCash ref #982371 pending verification for Pasig Branch.", time: "30m ago", type: "info" },
    { id: 3, title: "AI Triage Model Calibrated", text: "Hyperparameters updated to temperature 0.2.", time: "2h ago", type: "success" }
  ]);

  const branchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const branches = ["All Branches", "Fairview Branch", "Pasig Branch", "San Juan Branch"];

  const routeLabels: Record<string, string> = {
    "/admin/dashboard": "Clinical Dashboard",
    "/admin/reports": "Reports Generator",
    "/admin/audit-logs": "System Audit Logs",
    "/admin/accounts": "Manage Accounts",
    "/admin/ai-settings": "AI Intent Settings",
  };
  const currentRouteName = routeLabels[location.pathname] || "Control Panel";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (branchRef.current && !branchRef.current.contains(event.target as Node)) {
        setIsBranchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Successfully logged out");
      navigate("/login");
    } catch (err) {
      console.error(err);
      toast.error("Failed to sign out");
    }
  };

  const adminNavItems = [
    { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
    { title: "Reports Generator", url: "/admin/reports", icon: FileBarChart },
    { title: "System Audit Logs", url: "/admin/audit-logs", icon: Activity },
    { title: "Manage Accounts", url: "/admin/accounts", icon: Users },
    { title: "AI Intent Settings", url: "/admin/ai-settings", icon: Brain }
  ];

  const clearNotifications = () => {
    setNotifications([]);
    toast.success("Notifications cleared");
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white">
        
        {/* Sidebar Header - Black & Red Teeth Talk Brand */}
        <SidebarHeader className="pt-6 pb-4 border-b border-slate-100 transition-all duration-300 ease-in-out group-data-[collapsible=icon]:pt-4 group-data-[collapsible=icon]:pb-2">
          <div className="flex items-center gap-3 px-4 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center transition-all duration-300">
            <div className="flex aspect-square h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 p-1 text-white shadow-md border border-slate-900 transition-all duration-300 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 overflow-hidden">
              <img src="/teeth_talk_logo.png" alt="Teeth Talk Logo" className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-col gap-0.5 transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-950">Teeth Talk</span>
                <span className="text-[10px] font-extrabold bg-red-600 text-white px-2 py-0.5 rounded uppercase tracking-wider">ADMIN</span>
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Teeth Talk Dental Clinic</span>
            </div>
          </div>
        </SidebarHeader>

        {/* Sidebar Navigation Items */}
        <SidebarContent className="px-2 pt-4">
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 text-xs font-bold text-slate-500 tracking-wider mb-3 uppercase group-data-[collapsible=icon]:opacity-0">
              Admin Control Panel
            </SidebarGroupLabel>
            
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1.5">
                {adminNavItems.map((item) => {
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

        {/* Sidebar Footer Account Info */}
        <SidebarFooter className="p-4 pb-6 border-t border-slate-100">
          <SidebarMenu>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isDropdownOpen ? 'max-h-20 opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'}`}>
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

            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                className="h-auto py-2.5 px-3 flex items-center justify-start group-data-[collapsible=icon]:justify-center gap-3 w-full rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all duration-200 group"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white border border-slate-900 transition-colors">
                  <User className="h-4.5 w-4.5" />
                </div>
                <div className="flex flex-col text-left transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">
                  <span className="font-bold text-sm text-slate-900 group-hover:text-slate-950 transition-colors">
                    {user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : "Admin"}
                  </span>
                  <span className="text-xs text-slate-500 font-medium tracking-wide">Systems Operator</span>
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
              <span className="text-slate-400">Admin</span>
              <ChevronRight className="h-4 w-4 text-slate-300" />
              <span className="text-slate-950 font-bold">{currentRouteName}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Branch Switcher Dropdown */}
            <div className="relative" ref={branchRef}>
              <button
                onClick={() => setIsBranchOpen(!isBranchOpen)}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-900 rounded-lg text-sm font-semibold border border-slate-200 shadow-xs transition-all"
              >
                <Building2 className="h-4.5 w-4.5 text-red-600" />
                <span>{selectedBranch}</span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {isBranchOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {branches.map((branch) => (
                    <button
                      key={branch}
                      onClick={() => {
                        setSelectedBranch(branch);
                        setIsBranchOpen(false);
                        toast.success(`Showing ${branch}`);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-between ${
                        selectedBranch === branch ? "bg-slate-100 text-slate-950 font-bold" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{branch}</span>
                      {selectedBranch === branch && <div className="h-2 w-2 rounded-full bg-red-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell Popover */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2.5 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                title="System Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs">
                    {notifications.length}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-950">Notifications</span>
                      <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        {notifications.length} New
                      </span>
                    </div>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearNotifications}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length > 0 ? (
                      notifications.map((item) => (
                        <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-3 items-start">
                          {item.type === "alert" && <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
                          {item.type === "info" && <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />}
                          {item.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline">
                              <h4 className="font-bold text-xs text-slate-900">{item.title}</h4>
                              <span className="text-[10px] text-slate-400 font-medium">{item.time}</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.text}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-400 font-medium">
                        No unread notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Dashboard Main View Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet context={{ selectedBranch }} />
        </main>

      </SidebarInset>

    </SidebarProvider>
  );
}
