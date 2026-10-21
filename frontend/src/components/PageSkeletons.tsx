import React from "react";
import { Skeleton } from "./ui/skeleton";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Sparkles, Stethoscope, Activity, ShieldCheck, HeartPulse } from "lucide-react";

/**
 * Premium Fullscreen Application Preloader
 * Displays a branded glowing healthcare loader during auth validation and session initialization.
 */
export function AppLoadingScreen({ message = "Initializing TeethTalk Clinical Session..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-emerald-600/20 blur-3xl pointer-events-none animate-pulse delay-700" />
      
      <div className="relative flex flex-col items-center max-w-sm px-6 text-center space-y-6">
        {/* Animated Brand Emblem */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-indigo-500 to-emerald-400 blur-lg opacity-40 animate-pulse" />
          <div className="relative h-20 w-20 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center pulse-glow">
            <HeartPulse className="h-10 w-10 text-emerald-400 animate-pulse" />
          </div>
        </div>

        {/* Brand Title & Typography */}
        <div className="space-y-1.5">
          <h2 className="text-xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            TeethTalk <span className="text-emerald-400 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 font-bold uppercase tracking-wider">DAMS</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium">Dental Appointment &amp; Treatment Monitoring System</p>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden shimmer-sweep">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-emerald-400 to-indigo-500 rounded-full animate-pulse" />
        </div>

        <p className="text-[11px] font-mono text-slate-500 tracking-wide uppercase">{message}</p>
      </div>
    </div>
  );
}

/**
 * Skeleton Loader for Patient Dashboard
 */
export function PatientDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Welcome Banner Skeleton */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 p-6 text-white border border-slate-800 shimmer-sweep">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2.5">
            <Skeleton className="h-7 w-64 bg-slate-800/80 rounded-lg" />
            <Skeleton className="h-4 w-96 bg-slate-800/60 rounded-md" />
          </div>
          <Skeleton className="h-10 w-36 bg-slate-800 rounded-xl" />
        </div>
      </div>

      {/* 4 Telemetry Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-slate-200/80 shadow-sm rounded-2xl p-5 shimmer-sweep space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3.5 w-24 bg-slate-200 rounded" />
              <Skeleton className="h-8 w-8 rounded-xl bg-slate-100" />
            </div>
            <Skeleton className="h-8 w-16 bg-slate-200 rounded-md" />
            <Skeleton className="h-3 w-32 bg-slate-100 rounded" />
          </Card>
        ))}
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Visit & Active Prescriptions (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm rounded-2xl p-6 shimmer-sweep space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-48 bg-slate-200 rounded-md" />
              <Skeleton className="h-6 w-20 bg-slate-100 rounded-full" />
            </div>
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full bg-slate-200" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-40 bg-slate-200 rounded" />
                  <Skeleton className="h-3 w-28 bg-slate-100 rounded" />
                </div>
              </div>
              <Skeleton className="h-3 w-full bg-slate-100 rounded" />
            </div>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-2xl p-6 shimmer-sweep space-y-4">
            <Skeleton className="h-5 w-40 bg-slate-200 rounded-md" />
            <div className="space-y-3">
              {[1, 2].map((j) => (
                <div key={j} className="flex justify-between items-center p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-36 bg-slate-200 rounded" />
                    <Skeleton className="h-3 w-24 bg-slate-100 rounded" />
                  </div>
                  <Skeleton className="h-8 w-24 bg-slate-200 rounded-lg" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Clinical Health & AI Assistant Card (1 Col) */}
        <Card className="border-slate-200 shadow-sm rounded-2xl p-6 shimmer-sweep space-y-5">
          <Skeleton className="h-5 w-36 bg-slate-200 rounded-md" />
          <div className="flex justify-center py-4">
            <Skeleton className="h-32 w-32 rounded-full bg-slate-100 border-4 border-slate-200" />
          </div>
          <div className="space-y-2.5">
            <Skeleton className="h-3.5 w-full bg-slate-100 rounded" />
            <Skeleton className="h-3.5 w-3/4 bg-slate-100 rounded" />
          </div>
          <Skeleton className="h-10 w-full bg-slate-200 rounded-xl" />
        </Card>
      </div>
    </div>
  );
}

/**
 * Skeleton Loader for Patient Appointments Page
 */
export function PatientAppointmentsSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 bg-slate-200 rounded-lg" />
          <Skeleton className="h-4 w-96 bg-slate-100 rounded-md" />
        </div>
        <Skeleton className="h-10 w-44 bg-slate-900/80 rounded-xl" />
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <Skeleton className="h-9 w-32 bg-slate-200 rounded-xl" />
        <Skeleton className="h-9 w-32 bg-slate-100 rounded-xl" />
      </div>

      {/* Appointment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((k) => (
          <Card key={k} className="border-slate-200 shadow-sm rounded-2xl p-5 shimmer-sweep space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-32 bg-slate-200 rounded" />
                <Skeleton className="h-3 w-24 bg-slate-100 rounded" />
              </div>
              <Skeleton className="h-6 w-20 bg-slate-100 rounded-full" />
            </div>
            <div className="space-y-2 py-2 border-y border-slate-100">
              <Skeleton className="h-3 w-full bg-slate-100 rounded" />
              <Skeleton className="h-3 w-3/4 bg-slate-100 rounded" />
            </div>
            <div className="flex justify-between items-center pt-1">
              <Skeleton className="h-8 w-24 bg-slate-100 rounded-lg" />
              <Skeleton className="h-8 w-20 bg-slate-200 rounded-lg" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton Loader for Staff Live Queue Console
 */
export function QueueSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48 bg-slate-200 rounded-lg" />
          <Skeleton className="h-4 w-72 bg-slate-100 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36 bg-slate-100 rounded-xl" />
          <Skeleton className="h-9 w-32 bg-slate-900/80 rounded-xl" />
        </div>
      </div>

      {/* 3 Queue Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((idx) => (
          <Card key={idx} className="border-slate-200 p-5 rounded-2xl shimmer-sweep space-y-2">
            <Skeleton className="h-3.5 w-24 bg-slate-200 rounded" />
            <Skeleton className="h-8 w-12 bg-slate-300 rounded" />
            <Skeleton className="h-3 w-28 bg-slate-100 rounded" />
          </Card>
        ))}
      </div>

      {/* Queue Table Skeleton */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden shimmer-sweep">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <Skeleton className="h-5 w-40 bg-slate-200 rounded" />
          <Skeleton className="h-8 w-48 bg-slate-100 rounded-lg" />
        </div>
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full bg-slate-200" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36 bg-slate-200 rounded" />
                  <Skeleton className="h-3 w-24 bg-slate-100 rounded" />
                </div>
              </div>
              <Skeleton className="h-4 w-28 bg-slate-100 rounded hidden md:block" />
              <Skeleton className="h-6 w-20 bg-slate-100 rounded-full" />
              <Skeleton className="h-8 w-24 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/**
 * Skeleton Loader for Admin Analytics Dashboard
 */
export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Multi-Branch Filter Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-60 bg-slate-200 rounded-lg" />
          <Skeleton className="h-4 w-80 bg-slate-100 rounded" />
        </div>
        <Skeleton className="h-10 w-52 bg-slate-100 rounded-xl" />
      </div>

      {/* 4 Telemetry Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-slate-200 p-5 rounded-2xl shimmer-sweep space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3.5 w-24 bg-slate-200 rounded" />
              <Skeleton className="h-8 w-8 rounded-xl bg-slate-100" />
            </div>
            <Skeleton className="h-8 w-20 bg-slate-300 rounded" />
            <Skeleton className="h-3 w-32 bg-slate-100 rounded" />
          </Card>
        ))}
      </div>

      {/* Dual Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 p-5 rounded-2xl shimmer-sweep space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-44 bg-slate-200 rounded" />
            <Skeleton className="h-4 w-24 bg-slate-100 rounded" />
          </div>
          <Skeleton className="h-64 w-full bg-slate-100 rounded-xl" />
        </Card>
        <Card className="border-slate-200 p-5 rounded-2xl shimmer-sweep space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-44 bg-slate-200 rounded" />
            <Skeleton className="h-4 w-24 bg-slate-100 rounded" />
          </div>
          <Skeleton className="h-64 w-full bg-slate-100 rounded-xl" />
        </Card>
      </div>

      {/* Clinical Adherence Grid Skeleton */}
      <Card className="border-slate-200 rounded-2xl overflow-hidden shimmer-sweep">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <Skeleton className="h-5 w-52 bg-slate-200 rounded" />
          <Skeleton className="h-8 w-44 bg-slate-100 rounded-lg" />
        </div>
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4].map((r) => (
            <div key={r} className="p-4 flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40 bg-slate-200 rounded" />
                <Skeleton className="h-3 w-28 bg-slate-100 rounded" />
              </div>
              <Skeleton className="h-6 w-24 bg-slate-100 rounded-full" />
              <Skeleton className="h-8 w-20 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
