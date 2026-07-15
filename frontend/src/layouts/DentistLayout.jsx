import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, User, Users, FileText, ClipboardList, Stethoscope, Pill, Settings } from "lucide-react";
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

// General navigation items for dentist side
const dentistNavItemsGeneral = [
  { title: "Live Queue", url: "/dentist/queue", icon: Users },
  { title: "Patient Records", url: "/dentist/records", icon: FileText },
  { title: "Treatment Logs", url: "/dentist/treatments", icon: ClipboardList },
  { title: "Prescriptions", url: "/dentist/prescriptions", icon: Pill },
];

export default function DentistLayout() {
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
        
        {/* Sidebar Header Logo - Medical Blue theme */}
        <SidebarHeader className="pt-6 pb-4 border-b border-slate-100 transition-all duration-300 ease-in-out group-data-[collapsible=icon]:pt-4 group-data-[collapsible=icon]:pb-2">
          <div className="flex items-center gap-3 px-4 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center transition-all duration-300">
            <div className="flex aspect-square h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-900 text-white shadow-md transition-all duration-300 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
              <Stethoscope className="h-5 w-5 transition-all duration-300 group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:w-4 text-blue-300" />
            </div>
            <div className="flex flex-col gap-0 transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-slate-900">Teeth Talk</span>
                <span className="text-[9px] font-extrabold bg-blue-600 text-white px-1.5 py-0.5 rounded uppercase scale-90">CLINICAL</span>
              </div>
              <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest -mt-0.5">Dentist Portal</span>
            </div>
          </div>
        </SidebarHeader>

        {/* Sidebar Navigation Items */}
        <SidebarContent className="px-2 pt-4">
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 text-[10px] font-bold text-slate-400 tracking-widest mb-3 uppercase group-data-[collapsible=icon]:opacity-0">
              Clinical Tools
            </SidebarGroupLabel>
            
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
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
                            ? 'bg-blue-50 text-blue-900 font-semibold shadow-sm border border-blue-100' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-blue-900'
                        }`}
                      >
                        <Link to={item.url}>
                          <item.icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`} />
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
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isDropdownOpen ? 'max-h-32 opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'}`}>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  className="w-full text-slate-600 hover:bg-slate-50 hover:text-blue-900 flex items-center justify-start group-data-[collapsible=icon]:justify-center gap-3 px-3.5 py-2.5 rounded-lg border border-transparent transition-all duration-200 mb-1"
                >
                  <Link to="/dentist/settings">
                    <Settings className="h-4.5 w-4.5 shrink-0 text-slate-500" />
                    <span className="font-semibold text-xs transition-all duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
                className="h-auto py-2 px-2.5 flex items-center justify-start group-data-[collapsible=icon]:justify-center gap-3 w-full rounded-lg border border-slate-150 bg-slate-50 hover:bg-blue-50 transition-all duration-200 group"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-900 text-white border border-blue-900 transition-colors">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex flex-col text-left transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">
                  <span className="font-bold text-xs text-blue-950 group-hover:text-blue-800 transition-colors">
                    {user?.email ? "Dr. " + user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : "Dentist"}
                  </span>
                  <span className="text-[9px] text-blue-500 font-semibold tracking-wider uppercase -mt-0.5">Attending Doctor</span>
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
            <SidebarTrigger className="-ml-1 text-slate-550 hover:text-blue-800 transition-colors" />
            <Separator orientation="vertical" className="h-4 bg-slate-200" />
            
            <div className="flex items-center text-xs font-semibold text-slate-500 whitespace-nowrap">
              <span>Teeth Talk</span> 
              <span className="mx-2 text-slate-200">|</span> 
              <span className="text-blue-900 font-bold capitalize">{getHeaderTitle(location.pathname).replace('-', ' ')}</span>
            </div>
          </div>
          
          <div className="text-[10px] text-blue-500 font-extrabold uppercase tracking-widest hidden sm:block">
            Clinical Operations
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
