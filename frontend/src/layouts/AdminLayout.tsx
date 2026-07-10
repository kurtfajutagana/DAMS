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
  LogOut,
  User,
  ShieldCheck,
  Check
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
  const [selectedBranch, setSelectedBranch] = useState<string>("All Branches");

  const branchRef = useRef<HTMLDivElement>(null);
  const branches = ["All Branches", "Fairview Branch", "Pasig Branch", "San Juan Branch"];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (branchRef.current && !branchRef.current.contains(event.target as Node)) {
        setIsBranchOpen(false);
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

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white">
        
        {/* Sidebar Header - Black & Red Teeth Talk Brand */}
        <SidebarHeader className="pt-6 pb-4 border-b border-slate-100 transition-all duration-300 ease-in-out group-data-[collapsible=icon]:pt-4 group-data-[collapsible=icon]:pb-2">
          <div className="flex items-center gap-3 px-4 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center transition-all duration-300">
            <div className="flex aspect-square h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-md transition-all duration-300 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
              <ShieldCheck className="h-5 w-5 stroke-[2.2] text-red-500 transition-all duration-300 group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:w-4" />
            </div>
            <div className="flex flex-col gap-0 transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-slate-900">Teeth Talk</span>
                <span className="text-[9px] font-extrabold bg-red-600 text-white px-1.5 py-0.5 rounded uppercase scale-90">ADMIN</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest -mt-0.5">Teeth Talk Dental Clinic</span>
            </div>
          </div>
        </SidebarHeader>

        {/* Sidebar Navigation Items */}
        <SidebarContent className="px-2 pt-4">
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 text-[10px] font-bold text-slate-400 tracking-widest mb-3 uppercase group-data-[collapsible=icon]:opacity-0">
              Admin Control Panel
            </SidebarGroupLabel>
            
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
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
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
                        }`}
                      >
                        <Link to={item.url}>
                          <item.icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${isActive ? 'text-red-500' : 'text-slate-400 group-hover:text-slate-900'}`} />
                          <span className="text-xs transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">{item.title}</span>
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
                  <LogOut className="h-4.5 w-4.5 shrink-0 text-red-500" />
                  <span className="font-semibold text-xs transition-all duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">Log out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </div>

            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                className="h-auto py-2 px-2.5 flex items-center justify-start group-data-[collapsible=icon]:justify-center gap-3 w-full rounded-lg border border-slate-150 bg-slate-50 hover:bg-slate-100 transition-all duration-200 group"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white border border-slate-900 transition-colors">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex flex-col text-left transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">
                  <span className="font-bold text-xs text-slate-800 group-hover:text-slate-950 transition-colors">
                    {user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : "Admin"}
                  </span>
                  <span className="text-[9px] text-slate-450 font-semibold tracking-wider uppercase -mt-0.5">Systems Operator</span>
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
            <Separator orientation="vertical" className="h-4 bg-slate-200" />
            
            {/* Branch Switcher Dropdown */}
            <div className="relative" ref={branchRef}>
              <button
                onClick={() => setIsBranchOpen(!isBranchOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-200 shadow-sm transition-all"
              >
                <Building2 className="h-4 w-4 text-red-500" />
                <span>{selectedBranch}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-405" />
              </button>

              {isBranchOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {branches.map((branch) => (
                    <button
                      key={branch}
                      onClick={() => {
                        setSelectedBranch(branch);
                        setIsBranchOpen(false);
                        toast.success(`Showing ${branch}`);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors flex items-center justify-between ${
                        selectedBranch === branch ? "bg-slate-100 text-slate-900 font-bold" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{branch}</span>
                      {selectedBranch === branch && <div className="h-1.5 w-1.5 rounded-full bg-red-650" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-[10px] text-slate-450 font-extrabold uppercase tracking-widest hidden sm:block">
            Teeth Talk Admin Console
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
