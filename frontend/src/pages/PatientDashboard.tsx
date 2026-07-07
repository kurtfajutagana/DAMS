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
  Pill,
  Activity,
  MessageSquareText,
  FileText,
  Sparkles,
  ShieldCheck
} from "lucide-react";

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
          <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-sm">
            <AvatarFallback className="bg-primary/5 text-primary text-xl font-bold">
              {user?.email?.charAt(0).toUpperCase() || 'P'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
              Welcome back, {user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 'Patient'}
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed mt-1">
              Here is an overview of your dental health and upcoming schedules.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Bento Grid Layout */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">

        {/* AI Assistant Card */}
        <Card className="h-full col-span-full lg:col-span-1 shadow-md border-0 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground relative overflow-hidden flex flex-col justify-between group">
          <div className="absolute top-0 right-0 p-16 -mt-8 -mr-8 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all duration-700" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-lg flex items-center gap-3 text-primary-foreground">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm shadow-inner shadow-white/20">
                <MessageSquareText className="h-5 w-5" />
              </div>
              AI Dental Assistant
            </CardTitle>
            <CardDescription className="text-primary-foreground/80 mt-2 text-sm leading-relaxed">
              Have a question about your treatment or need immediate advice?
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 mt-auto">
            <Button variant="secondary" className="w-full gap-2 font-semibold bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] text-white hover:text-white" asChild>
              <Link to="/patient/ai-assistant">
                <Activity className="h-4 w-4" />
                Start Chat
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Active Prescriptions */}
        <Card className="h-full col-span-full lg:col-span-1 shadow-sm border-border/50 flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Pill className="h-5 w-5 text-primary" />
              Active Prescriptions
            </CardTitle>
            <CardDescription className="text-slate-500">Currently prescribed medications</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pr-2">
            {activePrescriptions.length > 0 ? (
              <div className="space-y-4">
                {activePrescriptions.map((med, index) => {
                  const isExpiringSoon = index === 0; // Just for mockup purposes
                  return (
                    <div key={med.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 last:border-0 pb-4 last:pb-0">
                      <div className="space-y-1">
                        <p className="font-semibold text-sm leading-none text-slate-800 dark:text-slate-200">{med.name}</p>
                        <p className="text-xs text-slate-500">{med.instructions}</p>
                      </div>
                      <Badge variant="secondary" className={`px-2.5 py-0.5 whitespace-nowrap text-[10px] font-medium rounded-full ${isExpiringSoon ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                        Until {med.end}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-6 text-center text-slate-400">
                <Pill className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No active prescriptions.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Treatments */}
        <Card className="col-span-full lg:col-span-2 shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/30">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <FileText className="h-5 w-5 text-primary" />
                Recent Treatments
              </CardTitle>
              <CardDescription className="text-slate-500">Your past dental procedures</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="hidden sm:flex text-primary hover:text-primary hover:bg-primary/10" asChild>
              <Link to="/patient/treatments">
                View All
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentTreatments.length > 0 ? (
              <div className="w-full">
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4 px-6 py-3 text-xs font-semibold tracking-wider text-slate-500 uppercase bg-slate-50/50 dark:bg-slate-900/20 border-b border-border/50">
                  <div className="col-span-1 md:col-span-1">Date</div>
                  <div className="col-span-2 md:col-span-2">Procedure</div>
                  <div className="hidden md:block col-span-1 text-right">Dentist</div>
                </div>
                <div className="divide-y divide-border/40">
                  {recentTreatments.map((treatment) => (
                    <div key={treatment.id} className="grid grid-cols-3 md:grid-cols-4 gap-4 px-6 py-4 text-sm items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                      <div className="col-span-1 md:col-span-1 font-medium text-slate-600 dark:text-slate-300">{treatment.date}</div>
                      <div className="col-span-2 md:col-span-2 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                        {treatment.procedure.includes('Cleaning') ? (
                          <Sparkles className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <ShieldCheck className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="font-medium">{treatment.procedure}</span>
                      </div>
                      <div className="hidden md:block col-span-1 text-right font-medium text-primary hover:underline cursor-pointer transition-all">
                        {treatment.dentist}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                <Activity className="h-8 w-8 mb-3 opacity-20" />
                <p className="text-sm">No recent treatments recorded.</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
