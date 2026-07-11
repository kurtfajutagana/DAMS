import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, User, LayoutDashboard, Calendar, Pill, History, MessageSquareText, ShieldPlus } from "lucide-react";
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

// Menu items for the patient dashboard sidebar.
const patientNavItems = [
  {
    title: "Overview",
    url: "/patient/dashboard",
    icon: LayoutDashboard,
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
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const branchRef = useRef(null);
  const branches = ["All Branches", "Fairview Branch", "Pasig Branch", "San Juan Branch"];

  useEffect(() => {
    function handleClickOutside(event) {
      if (branchRef.current && !branchRef.current.contains(event.target)) {
        setIsBranchOpen(false);
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
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isDropdownOpen ? 'max-h-20 opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'}`}>
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
          
          {/* Branch Switcher Dropdown */}
          <div className="relative" ref={branchRef}>
            <button
              onClick={() => setIsBranchOpen(!isBranchOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-250 shadow-sm transition-all"
            >
              <Building2 className="h-4 w-4 text-red-500" />
              <span>{selectedBranch}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
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
          
          <div className="flex-1" />
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet context={{ selectedBranch }} />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
