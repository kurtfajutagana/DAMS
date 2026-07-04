import React from "react";
import { Link } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "../components/ui/card";
import { useAuth } from "../contexts/AuthContext";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { 
  Calendar, 
  Clock, 
  Pill, 
  Activity, 
  MessageSquareText, 
  ChevronRight,
  FileText
} from "lucide-react";

interface UpcomingAppointment {
  id: string;
  date: string;
  time: string;
  dentist: string;
  type: string;
  status: "Confirmed" | "Pending" | "Cancelled";
}

interface Prescription {
  id: number;
  name: string;
  instructions: string;
  end: string;
}

interface Treatment {
  id: number;
  date: string;
  procedure: string;
  dentist: string;
}

export default function PatientDashboard() {
  const { user } = useAuth();
  
  // Placeholder Data
  const upcomingAppointment: UpcomingAppointment = {
    id: "app-1",
    date: "July 15, 2026",
    time: "10:00 AM",
    dentist: "Dr. Sarah Smith",
    type: "Routine Checkup",
    status: "Confirmed"
  };

  const activePrescriptions: Prescription[] = [
    { id: 1, name: "Amoxicillin 500mg", instructions: "Take 1 pill every 8 hours", end: "July 5, 2026" },
    { id: 2, name: "Ibuprofen 400mg", instructions: "Take 1 pill as needed for pain", end: "July 7, 2026" }
  ];

  const recentTreatments: Treatment[] = [
    { id: 1, date: "Jan 10, 2026", procedure: "Teeth Cleaning", dentist: "Dr. Sarah Smith" },
    { id: 2, date: "Nov 05, 2025", procedure: "Cavity Filling", dentist: "Dr. John Doe" }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/10">
            <AvatarFallback className="bg-primary text-primary-foreground text-xl">
              {user?.email?.charAt(0).toUpperCase() || 'P'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {user?.email ? user.email.split('@')[0] : 'Patient'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here is an overview of your dental health and upcoming schedules.
            </p>
          </div>
        </div>
        <Button variant="default" className="gap-2" asChild>
          <Link to="/patient/appointments">
            <Calendar className="h-4 w-4" />
            Book Appointment
          </Link>
        </Button>
      </div>

      <Separator />

      {/* Bento Grid Layout */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Next Appointment Card - Highlighted */}
        <Card className="col-span-full lg:col-span-2 border-primary/20 shadow-sm bg-card relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 -mt-8 -mr-8 bg-primary/5 rounded-full transition-transform duration-500 group-hover:scale-150" />
          <CardHeader className="relative z-10 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Next Appointment
              </CardTitle>
              <Badge variant="outline" className="bg-background">{upcomingAppointment.status}</Badge>
            </div>
            <CardDescription>Your upcoming visit details</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex flex-col sm:flex-row gap-6 sm:items-center bg-muted/30 p-4 rounded-lg border border-border/50">
              <div className="flex-1 space-y-1">
                <p className="text-2xl font-bold tracking-tight">{upcomingAppointment.date}</p>
                <div className="flex items-center text-muted-foreground gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  {upcomingAppointment.time}
                </div>
              </div>
              <div className="w-px h-12 bg-border hidden sm:block" />
              <div className="flex-1 space-y-1">
                <p className="font-semibold">{upcomingAppointment.type}</p>
                <p className="text-sm text-muted-foreground">with {upcomingAppointment.dentist}</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="relative z-10 pt-2 pb-6">
            <Button variant="link" className="px-0 text-primary" asChild>
              <Link to="/patient/appointments">
                Reschedule <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* AI Assistant Card */}
        <Card className="col-span-full lg:col-span-1 shadow-sm border-primary/20 bg-primary text-primary-foreground relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-8 -mt-4 -mr-4 bg-primary-foreground/10 rounded-full" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-lg flex items-center gap-2 text-primary-foreground">
              <MessageSquareText className="h-5 w-5" />
              AI Dental Assistant
            </CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Have a question about your treatment or need immediate advice?
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 mt-auto">
            <Button variant="secondary" className="w-full gap-2 shadow-sm font-semibold" asChild>
              <Link to="/patient/ai-assistant">
                <Activity className="h-4 w-4" />
                Start Chat
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Active Prescriptions */}
        <Card className="col-span-full lg:col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Pill className="h-5 w-5 text-muted-foreground" />
              Active Prescriptions
            </CardTitle>
            <CardDescription>Currently prescribed medications</CardDescription>
          </CardHeader>
          <CardContent>
            {activePrescriptions.length > 0 ? (
              <div className="space-y-4">
                {activePrescriptions.map((med) => (
                  <div key={med.id} className="flex items-start justify-between border-b last:border-0 pb-4 last:pb-0">
                    <div className="space-y-1">
                      <p className="font-medium text-sm leading-none">{med.name}</p>
                      <p className="text-xs text-muted-foreground">{med.instructions}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">Until {med.end}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                <Pill className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No active prescriptions.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Treatments */}
        <Card className="col-span-full lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Recent Treatments
              </CardTitle>
              <CardDescription>Your past dental procedures</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="hidden sm:flex" asChild>
              <Link to="/patient/treatments">
                View All
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentTreatments.length > 0 ? (
              <div className="rounded-md border">
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4 p-4 text-sm font-medium text-muted-foreground bg-muted/50 border-b">
                  <div className="col-span-1 md:col-span-1">Date</div>
                  <div className="col-span-2 md:col-span-2">Procedure</div>
                  <div className="hidden md:block col-span-1 text-right">Dentist</div>
                </div>
                {recentTreatments.map((treatment) => (
                  <div key={treatment.id} className="grid grid-cols-3 md:grid-cols-4 gap-4 p-4 text-sm items-center border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <div className="col-span-1 md:col-span-1 font-medium">{treatment.date}</div>
                    <div className="col-span-2 md:col-span-2">{treatment.procedure}</div>
                    <div className="hidden md:block col-span-1 text-right text-muted-foreground">{treatment.dentist}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Activity className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No recent treatments recorded.</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
