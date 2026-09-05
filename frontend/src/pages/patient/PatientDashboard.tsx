import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "../../components/ui/card";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import {
  Pill,
  Activity,
  MessageSquareText,
  FileText,
  Sparkles,
  ShieldCheck,
  CalendarCheck,
  Clock,
  User,
  ArrowRight,
  Plus,
  CreditCard,
  Building2,
  ChevronRight,
  CheckCircle2
} from "lucide-react";

interface Prescription {
  id: string;
  name: string;
  instructions: string;
  end: string;
}

interface Treatment {
  id: string;
  date: string;
  procedure: string;
  dentist: string;
}

export default function PatientDashboard() {
  const { user } = useAuth() as any;

  const [activePrescriptions, setActivePrescriptions] = useState<Prescription[]>([]);
  const [recentTreatments, setRecentTreatments] = useState<Treatment[]>([]);
  const [upcomingAppointment, setUpcomingAppointment] = useState<any>(null);
  const [treatmentCount, setTreatmentCount] = useState<number>(0);
  const [unpaidInvoicesCount, setUnpaidInvoicesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch active prescriptions
        const { data: rxData } = await supabase
          .from('prescriptions')
          .select('*')
          .eq('patient_id', user.id)
          .eq('is_active', true);

        if (rxData) {
          const mappedRx = rxData.map((rx: any) => ({
            id: rx.id,
            name: rx.medication_name,
            instructions: rx.dosage_instructions,
            end: new Date(rx.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          }));
          setActivePrescriptions(mappedRx);
        }

        // Fetch recent treatments
        const { data: trData, count: trCount } = await supabase
          .from('treatments')
          .select('*, profiles!treatments_dentist_id_fkey(first_name, last_name)', { count: 'exact' })
          .eq('patient_id', user.id)
          .order('treatment_date', { ascending: false })
          .limit(3);

        if (trCount !== null) {
          setTreatmentCount(trCount);
        }

        if (trData) {
          const mappedTr = trData.map((tr: any) => ({
            id: tr.id,
            date: new Date(tr.treatment_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            procedure: tr.procedure_name,
            dentist: tr.profiles?.first_name ? `Dr. ${tr.profiles.first_name} ${tr.profiles.last_name}` : 'Assigned Dentist'
          }));
          setRecentTreatments(mappedTr);
        }

        // Fetch upcoming appointment
        const { data: aptData } = await supabase
          .from('appointments')
          .select('*')
          .eq('patient_id', user.id)
          .in('status', ['scheduled', 'pending'])
          .gte('appointment_date', new Date().toISOString())
          .order('appointment_date', { ascending: true })
          .limit(1);

        if (aptData && aptData.length > 0) {
          const appointment = aptData[0];
          if (appointment.dentist_id) {
            const { data: dData } = await supabase.from('profiles').select('first_name, last_name').eq('id', appointment.dentist_id).single();
            if (dData) {
              appointment.dentist = dData;
            }
          }
          setUpcomingAppointment(appointment);
        }

        // Fetch billing status
        const { count: invCount } = await supabase
          .from('invoices')
          .select('id', { count: 'exact' })
          .eq('patient_id', user.id)
          .eq('payment_status', 'unpaid');
        
        if (invCount !== null) {
          setUnpaidInvoicesCount(invCount);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const firstName = user?.user_metadata?.first_name || (user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 'Patient');

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Patient Overview</h1>
            <Badge className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] uppercase px-2.5 py-0.5 tracking-wider">
              Teeth Talk Care
            </Badge>
          </div>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Welcome back, <span className="font-bold text-slate-900">{firstName}</span>! Here is your dental health summary and appointment schedule.
          </p>
        </div>
        <Button className="bg-slate-950 hover:bg-slate-900 text-white shadow-sm gap-2 shrink-0 font-semibold" asChild>
          <Link to="/patient/appointments">
            <Plus className="h-4 w-4 text-red-500" />
            Book Appointment
          </Link>
        </Button>
      </div>

      {/* Telemetry Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Next Visit Card */}
        <Card className="border-slate-200 bg-white border-t-2 border-t-slate-950 shadow-sm">
          <CardHeader className="pb-1.5 pt-4">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Upcoming Visit</span>
          </CardHeader>
          <CardContent className="pb-4">
            {loading ? (
              <span className="text-sm font-semibold text-slate-400">Loading schedule...</span>
            ) : upcomingAppointment ? (
              <div>
                <span className="text-base font-bold text-slate-950 block truncate">
                  {new Date(upcomingAppointment.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {new Date(upcomingAppointment.appointment_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-sm font-semibold text-slate-700 block">No Active Visit</span>
                <Link to="/patient/appointments" className="text-[11px] font-bold text-red-600 hover:underline">
                  Schedule now &rarr;
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Prescriptions Card */}
        <Card className="border-slate-200 bg-white border-t-2 border-t-slate-800 shadow-sm">
          <CardHeader className="pb-1.5 pt-4">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Active Prescriptions</span>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between pb-4">
            <span className="text-2xl font-bold text-slate-950">{activePrescriptions.length}</span>
            <Badge variant="outline" className="text-[10px] font-bold border-slate-200 text-slate-700 bg-slate-50">
              Rx Active
            </Badge>
          </CardContent>
        </Card>

        {/* Completed Procedures Card */}
        <Card className="border-slate-200 bg-white border-t-2 border-t-emerald-600 shadow-sm">
          <CardHeader className="pb-1.5 pt-4">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Completed Procedures</span>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between pb-4">
            <span className="text-2xl font-bold text-slate-950">{treatmentCount}</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
              Verified
            </span>
          </CardContent>
        </Card>

        {/* Billing Status Card */}
        <Card className={`border-slate-200 bg-white border-t-2 shadow-sm ${
          unpaidInvoicesCount > 0 ? "border-t-red-600 bg-red-50/5" : "border-t-slate-300"
        }`}>
          <CardHeader className="pb-1.5 pt-4">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Billing Status</span>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between pb-4">
            <span className={`text-2xl font-bold ${unpaidInvoicesCount > 0 ? "text-red-600" : "text-slate-950"}`}>
              {unpaidInvoicesCount > 0 ? `${unpaidInvoicesCount} Pending` : "Paid"}
            </span>
            {unpaidInvoicesCount > 0 ? (
              <span className="text-[10px] font-extrabold text-red-700 bg-red-100 px-2 py-0.5 rounded uppercase">
                Action Req.
              </span>
            ) : (
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                Cleared
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointment Alert Spotlight */}
      {!loading && upcomingAppointment ? (
        <Card className="border-slate-200 bg-white shadow-sm border-l-4 border-l-slate-950">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="bg-slate-950 p-3 rounded-xl text-white shrink-0 shadow-md">
                <CalendarCheck className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                    Next Scheduled Visit
                  </span>
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 font-bold text-[10px]">
                    {upcomingAppointment.status || "Confirmed"}
                  </Badge>
                </div>
                <h3 className="text-lg font-bold text-slate-950 mt-1">
                  {new Date(upcomingAppointment.appointment_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at {new Date(upcomingAppointment.appointment_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-600 font-medium">
                  <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-slate-400" /> {upcomingAppointment.service_requested || "General Consultation"}</span>
                  <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-slate-400" /> {upcomingAppointment.dentist ? `Dr. ${upcomingAppointment.dentist.first_name} ${upcomingAppointment.dentist.last_name}` : "Assigned Dentist Pending"}</span>
                  {upcomingAppointment.branch && <span className="flex items-center gap-1 text-slate-500">📍 {upcomingAppointment.branch}</span>}
                </div>
              </div>
            </div>
            <Button className="w-full sm:w-auto bg-slate-950 hover:bg-slate-900 text-white shrink-0 font-semibold text-xs" asChild>
              <Link to="/patient/appointments">
                Manage Schedule &rarr;
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : !loading && !upcomingAppointment ? (
        <Card className="border-slate-200 bg-slate-50/50 shadow-sm border-dashed">
          <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-slate-200 p-3 rounded-xl text-slate-600 shrink-0">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">No Upcoming Dental Visits</h3>
                <p className="text-xs text-slate-500 font-medium">Keep your smile healthy with routine dental checkups.</p>
              </div>
            </div>
            <Button variant="outline" className="w-full sm:w-auto border-slate-300 text-slate-900 hover:bg-slate-100 font-semibold text-xs" asChild>
              <Link to="/patient/appointments">
                Schedule Appointment
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Main Grid Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

        {/* AI Assistant Spotlight Card */}
        <Card className="col-span-full lg:col-span-1 shadow-sm border-slate-200 bg-slate-950 text-white relative overflow-hidden flex flex-col justify-between p-6">
          <div className="absolute top-0 right-0 p-16 -mt-8 -mr-8 bg-red-600/10 rounded-full blur-xl" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-600 text-white rounded-lg shadow-sm">
                  <MessageSquareText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight text-white">AI Dental Assistant</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Instant Clinical Guidance</p>
                </div>
              </div>
              <Badge className="bg-red-600/20 text-red-400 border-red-500/30 text-[10px]">
                24/7 Active
              </Badge>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium mb-6">
              Have questions regarding teeth care, post-procedure symptoms, or clinic schedules? Ask our AI assistant anytime.
            </p>
          </div>
          <Button className="w-full gap-2 font-semibold bg-white text-slate-950 hover:bg-slate-100 transition-all text-xs" asChild>
            <Link to="/patient/ai-assistant">
              <Activity className="h-4 w-4 text-red-600" />
              Launch Assistant
            </Link>
          </Button>
        </Card>

        {/* Active Prescriptions Summary Card */}
        <Card className="col-span-full lg:col-span-1 border-slate-200 bg-white shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Pill className="h-4 w-4 text-red-600" /> Active Prescriptions
              </h2>
              <p className="text-[10px] text-slate-500">Currently active medications</p>
            </div>
            <Button variant="ghost" size="sm" className="text-[11px] text-slate-600 hover:text-slate-950 h-7" asChild>
              <Link to="/patient/prescriptions">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 pt-4">
            {activePrescriptions.length > 0 ? (
              <div className="space-y-3">
                {activePrescriptions.map((med) => (
                  <div key={med.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{med.name}</span>
                      <Badge variant="outline" className="text-[9px] font-bold border-emerald-200 bg-emerald-50 text-emerald-800">
                        Until {med.end}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-600">{med.instructions}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[140px] flex flex-col items-center justify-center text-center text-slate-400 space-y-1">
                <Pill className="h-6 w-6 opacity-30" />
                <p className="text-xs font-medium">No active prescriptions.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Treatments Summary Card */}
        <Card className="col-span-full lg:col-span-1 border-slate-200 bg-white shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-950" /> Treatment History
              </h2>
              <p className="text-[10px] text-slate-500">Recent completed sessions</p>
            </div>
            <Button variant="ghost" size="sm" className="text-[11px] text-slate-600 hover:text-slate-950 h-7" asChild>
              <Link to="/patient/treatments">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 pt-4">
            {recentTreatments.length > 0 ? (
              <div className="space-y-3">
                {recentTreatments.map((treatment) => (
                  <div key={treatment.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">{treatment.procedure}</span>
                      <span className="text-[10px] text-slate-500 font-medium">{treatment.date} &bull; {treatment.dentist}</span>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[140px] flex flex-col items-center justify-center text-center text-slate-400 space-y-1">
                <Activity className="h-6 w-6 opacity-30" />
                <p className="text-xs font-medium">No treatment records yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
