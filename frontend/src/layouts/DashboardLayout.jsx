import { useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, User, LayoutDashboard, Calendar, Pill, History, MessageSquareText } from "lucide-react";
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
    url: "/patient/dashboard",
    icon: Calendar,
  },
  {
    title: "Prescriptions",
    url: "/patient/dashboard",
    icon: Pill,
  },
  {
    title: "Treatments",
    url: "/patient/dashboard",
    icon: History,
  },
  {
    title: "AI Assistant",
    url: "/patient/dashboard",
    icon: MessageSquareText,
  },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      toast.error("Failed to log out");
    }
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-4">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              D
            </div>
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="font-semibold text-lg tracking-tight">DAMS</span>
              <span className="text-xs text-muted-foreground">Dental Clinic</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {patientNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                <LogOut />
                <span>Log out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            <User className="h-4 w-4" />
            <span>{user?.email || "patient@example.com"}</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-slate-50/50 p-6 md:p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
