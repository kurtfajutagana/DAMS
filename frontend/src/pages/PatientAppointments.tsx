import React from "react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Calendar as CalendarIcon, Clock, ArrowRight, ChevronDown } from "lucide-react";

interface ScheduleEntry {
  id: string;
  date: string;
  time: string;
  specialist: string;
  procedure: string;
  status: "Upcoming" | "Pending Verification" | "Past";
}

export default function PatientAppointments() {
  const schedules: ScheduleEntry[] = [
    {
      id: "appt-1",
      date: "July 15, 2026",
      time: "10:00 AM",
      specialist: "Dr. Sarah Smith",
      procedure: "Routine Checkup",
      status: "Upcoming"
    },
    {
      id: "appt-2",
      date: "August 20, 2026",
      time: "02:30 PM",
      specialist: "Dr. John Doe",
      procedure: "Orthodontic Adjustment",
      status: "Pending Verification"
    },
    {
      id: "appt-3",
      date: "January 10, 2026",
      time: "09:00 AM",
      specialist: "Dr. Sarah Smith",
      procedure: "Teeth Cleaning",
      status: "Past"
    }
  ];

  const upcoming = schedules.filter(s => s.status === "Upcoming");
  const pending = schedules.filter(s => s.status === "Pending Verification");
  const past = schedules.filter(s => s.status === "Past");

  const ScheduleCard = ({ entry }: { entry: ScheduleEntry }) => (
    <div className="group relative rounded-2xl border border-border/40 bg-card p-6 transition-all hover:bg-accent/20">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-foreground">{entry.procedure}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{entry.specialist}</p>
        </div>
        <Badge 
          variant={entry.status === 'Upcoming' ? 'default' : entry.status === 'Pending Verification' ? 'secondary' : 'outline'} 
          className="rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-medium opacity-80"
        >
          {entry.status}
        </Badge>
      </div>
      
      <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 opacity-50" />
          <span>{entry.date}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 opacity-50" />
          <span>{entry.time}</span>
        </div>
      </div>

      {entry.status !== "Past" && (
        <div className="mt-6 flex gap-3 opacity-0 transition-opacity group-hover:opacity-100 sm:absolute sm:bottom-6 sm:right-6 sm:mt-0">
          <Button variant="outline" size="sm" className="h-8 rounded-full px-4 text-xs font-normal shadow-none">Reschedule</Button>
          <Button variant="ghost" size="sm" className="h-8 rounded-full px-4 text-xs font-normal text-destructive hover:bg-destructive/10 hover:text-destructive">Cancel</Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-12 py-8 animate-in fade-in duration-700 px-4 sm:px-6 lg:px-8">
      
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Appointments</h1>
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          Manage your upcoming visits, schedule new procedures, and review your treatment history in one place.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12">
        
        {/* Main Content: Schedules */}
        <div className="space-y-8">
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="h-10 w-full justify-start rounded-none border-b bg-transparent p-0 gap-6">
              <TabsTrigger 
                value="upcoming" 
                className="relative h-10 rounded-none border-b-2 border-b-transparent bg-transparent px-1 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Upcoming
              </TabsTrigger>
              <TabsTrigger 
                value="pending" 
                className="relative h-10 rounded-none border-b-2 border-b-transparent bg-transparent px-1 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Pending
              </TabsTrigger>
              <TabsTrigger 
                value="past" 
                className="relative h-10 rounded-none border-b-2 border-b-transparent bg-transparent px-1 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                History
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upcoming" className="mt-8 space-y-4 focus-visible:outline-none">
              {upcoming.length > 0 ? (
                upcoming.map(entry => <ScheduleCard key={entry.id} entry={entry} />)
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground border border-dashed border-border/50 rounded-2xl">
                  No upcoming appointments.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="pending" className="mt-8 space-y-4 focus-visible:outline-none">
              {pending.length > 0 ? (
                pending.map(entry => <ScheduleCard key={entry.id} entry={entry} />)
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground border border-dashed border-border/50 rounded-2xl">
                  No pending requests.
                </div>
              )}
            </TabsContent>

            <TabsContent value="past" className="mt-8 space-y-4 focus-visible:outline-none">
              {past.length > 0 ? (
                past.map(entry => <ScheduleCard key={entry.id} entry={entry} />)
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground border border-dashed border-border/50 rounded-2xl">
                  No past visits recorded.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar: Booking Interface & Alerts */}
        <aside className="space-y-8">
          
          {/* Minimalist Notice */}
          <div className="rounded-2xl bg-amber-500/10 p-5 border border-amber-500/20">
            <h4 className="text-sm font-medium text-amber-900 dark:text-amber-400 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              Action Required
            </h4>
            <p className="mt-2.5 text-xs text-amber-800/80 dark:text-amber-400/80 leading-relaxed">
              Orthodontic adjustment required before September 2026. Please secure a slot with Dr. John Doe.
            </p>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-sm">
            <h3 className="font-medium text-foreground">Book a Slot</h3>
            <p className="mt-1 mb-6 text-xs text-muted-foreground">Select a date for your next visit.</p>
            
            <div className="space-y-5">
              <div className="flex h-32 cursor-pointer items-center justify-center rounded-xl border border-dashed border-border/60 bg-accent/30 transition-colors hover:bg-accent/50">
                <span className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
                  <CalendarIcon className="h-4 w-4" /> Pick a Date
                </span>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Specialist</label>
                <button className="flex h-10 w-full items-center justify-between rounded-xl border border-border/60 bg-background px-3 text-sm transition-colors hover:bg-accent/50">
                  <span className="text-foreground">Any Available Doctor</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground opacity-50" />
                </button>
              </div>
              
              <Button className="w-full h-10 rounded-xl mt-2 font-normal shadow-none hover:translate-y-[-1px] transition-transform">
                Continue <ArrowRight className="ml-2 h-4 w-4 opacity-70" />
              </Button>
            </div>
          </div>
          
        </aside>

      </div>
    </div>
  );
}
