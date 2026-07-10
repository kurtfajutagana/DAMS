import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, User, FileText, Users, ClipboardList, ShieldPlus, Printer } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
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

// General navigation items for staff side (Branches and Manage Accounts removed)
const staffNavItemsGeneral = [
  { title: "Forms", url: "/staff/add-patient", icon: FileText },
  { title: "Queue", url: "/staff/queue", icon: Users },
  { title: "Visit Logs", url: "/staff/visit-logs", icon: ClipboardList },
  { title: "Print Reports", url: "/staff/print-reports", icon: Printer },
];

export default function StaffLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
    if (pathname.includes("add-patient")) return "Forms";
    if (pathname.includes("queue")) return "Queue";
    if (pathname.includes("visit-logs")) return "Visit Logs";
    if (pathname.includes("print-reports")) return "Print Reports";
    return "Portal";
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white">
        
        {/* Sidebar Header Logo - Black & Red theme */}
        <SidebarHeader className="pt-6 pb-4 border-b border-slate-100 transition-all duration-300 ease-in-out group-data-[collapsible=icon]:pt-4 group-data-[collapsible=icon]:pb-2">
          <div className="flex items-center gap-3 px-4 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center transition-all duration-300">
            <div className="flex aspect-square h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-md transition-all duration-300 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
              <ShieldPlus className="h-5 w-5 transition-all duration-300 group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:w-4 text-red-500" />
            </div>
            <div className="flex flex-col gap-0 transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-slate-900">Teeth Talk</span>
                <span className="text-[9px] font-extrabold bg-red-600 text-white px-1.5 py-0.5 rounded uppercase scale-90">STAFF</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest -mt-0.5">Staff Portal</span>
            </div>
          </div>
        </SidebarHeader>

        {/* Sidebar Navigation Items */}
        <SidebarContent className="px-2 pt-4">
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 text-[10px] font-bold text-slate-400 tracking-widest mb-3 uppercase group-data-[collapsible=icon]:opacity-0">
              Staff Portals
            </SidebarGroupLabel>
            
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {staffNavItemsGeneral.map((item) => {
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
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
                        }`}
                      >
                        <Link to={item.url}>
                          <item.icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${isActive ? 'text-red-500' : 'text-slate-400 group-hover:text-slate-900'}`} />
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
                  <span className="font-bold text-xs text-slate-850 group-hover:text-slate-955 transition-colors">
                    {user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : "Staff"}
                  </span>
                  <span className="text-[9px] text-slate-450 font-semibold tracking-wider uppercase -mt-0.5">Staff Operator</span>
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
            <SidebarTrigger className="-ml-1 text-slate-550 hover:text-slate-800 transition-colors" />
            <Separator orientation="vertical" className="h-4 bg-slate-200" />
            
            <div className="flex items-center text-xs font-semibold text-slate-500 whitespace-nowrap">
              <span>Teeth Talk</span> 
              <span className="mx-2 text-slate-200">|</span> 
              <span className="text-slate-900 font-bold">{getHeaderTitle(location.pathname)}</span>
            </div>
          </div>
          
          <div className="text-[10px] text-slate-450 font-extrabold uppercase tracking-widest hidden sm:block">
            Teeth Talk Clinic Portal
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
