import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, User, LayoutDashboard, Calendar, Pill, History, MessageSquareText, ShieldPlus } from "lucide-react";
import { toast } from "sonner";
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
    title: "Appointments",
    url: "/patient/appointments",
    icon: Calendar,
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
              <span className="font-semibold text-base tracking-tight text-foreground">DAMS</span>
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
                        className={`transition-all duration-300 ease-in-out ${isActive ? 'bg-primary/5 text-primary font-medium' : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'}`}
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
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={handleLogout} 
                className="text-muted-foreground transition-all duration-300 ease-in-out hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="opacity-70 transition-colors" />
                <span className="font-medium transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">Log out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      
      <SidebarInset className="bg-muted/10">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border/40 bg-background/70 px-4 backdrop-blur-xl transition-all">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
          <Separator orientation="vertical" className="mr-2 h-4 bg-border/40" />
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border/40 bg-background pl-3 pr-1 py-1 shadow-sm transition-colors hover:bg-accent/20 cursor-pointer">
              <span className="text-xs font-medium text-muted-foreground">
                {user?.email || "patient@example.com"}
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-3 w-3" />
              </div>
            </div>
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
