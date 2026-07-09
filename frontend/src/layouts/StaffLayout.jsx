import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, User, FileText, Users, Building2, ClipboardList, Settings, ShieldPlus, Printer } from "lucide-react";
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

const staffNavItemsGeneral = [
  { title: "Forms", url: "/staff/add-patient", icon: FileText },
  { title: "Queue", url: "/staff/queue", icon: Users },
  { title: "Branches", url: "/staff/branches", icon: Building2 },
  { title: "Visit Logs", url: "/staff/visit-logs", icon: ClipboardList },
  { title: "Print Reports", url: "/staff/print-reports", icon: Printer },
];

const staffNavItemsManagement = [
  { title: "Manage Accounts", url: "/staff/manage-accounts", icon: Settings },
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

  const renderNavItems = (items) => {
    return items.map((item) => {
      const isActive = location.pathname === item.url || (location.pathname.startsWith(item.url) && item.url !== "/staff");
      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton 
            asChild 
            tooltip={item.title} 
            isActive={isActive}
            className={`transition-all duration-300 ease-in-out ${isActive ? 'bg-primary/10 text-primary font-semibold relative after:absolute after:left-0 after:top-1/2 after:-translate-y-1/2 after:h-2/3 after:w-1 after:bg-primary after:rounded-r-md' : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'}`}
          >
            <Link to={item.url}>
              <item.icon className={`transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground/70'}`} />
              <span className="transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });
  };

  const getHeaderTitle = (pathname) => {
    if (pathname.includes("add-patient")) return "Forms";
    if (pathname.includes("queue")) return "Queue";
    if (pathname.includes("branches")) return "Branches";
    if (pathname.includes("visit-logs")) return "Visit Logs";
    if (pathname.includes("manage-accounts")) return "Manage Accounts";
    if (pathname.includes("print-reports")) return "Print Reports";
    return "Portal";
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
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Staff Portal</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2 transition-all duration-300 group-data-[collapsible=icon]:px-1">
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 text-xs font-medium text-muted-foreground/60 mb-2 transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">
              GENERAL
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {renderNavItems(staffNavItemsGeneral)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="px-4 text-xs font-medium text-muted-foreground/60 mb-2 transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden whitespace-nowrap">
              MANAGEMENT
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {renderNavItems(staffNavItemsManagement)}
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
                  {user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : "Staff"}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      
      <SidebarInset className="bg-muted/10">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border/40 bg-background/70 px-4 backdrop-blur-xl transition-all">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
          <Separator orientation="vertical" className="mr-2 h-4 bg-border/40" />
          <div className="flex-1 flex items-center text-sm font-medium text-muted-foreground">
             <span className="hover:text-foreground cursor-pointer transition-colors">TeethTalk</span> 
             <span className="mx-2 text-border">|</span> 
             <span className="text-foreground">{getHeaderTitle(location.pathname)}</span>
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
