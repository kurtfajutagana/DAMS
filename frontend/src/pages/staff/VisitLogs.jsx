import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Building2, ClipboardList, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export default function VisitLogs() {
  const { profile } = useAuth();
  const [visitLogs, setVisitLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisitLogs = async () => {
      try {
        setLoading(true);
        let url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/staff/visit-logs`;
        if (profile?.branch_id) {
          url += `?branch_id=${encodeURIComponent(profile.branch_id)}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        const formattedLogs = (data || []).map((item) => {
          const d = new Date(item.created_at);
          return {
            id: item.id,
            date: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            patient: `${item.patient?.first_name || ''} ${item.patient?.last_name || ''}`,
            dentist: item.dentist ? `Dr. ${item.dentist.first_name} ${item.dentist.last_name}` : "Any Available",
            branch: item.branch?.branch_name || "Pasig",
            treatment: item.service_requested,
            fee: item.consultation_fee !== "N/A" ? `₱${Number(item.consultation_fee).toLocaleString()}.00` : "₱ N/A"
          };
        });
        setVisitLogs(formattedLogs);
      } catch (error) {
        console.error("Error fetching visit logs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVisitLogs();
  }, [profile?.branch_id]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2.5">
            <ClipboardList className="h-6 w-6 text-indigo-600" /> Patient Visit Logs
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">Archived patient check-ins, completed clinical sessions, and consultation history.</p>
        </div>
      </div>

      <Card className="border border-slate-200/80 shadow-md bg-white rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 px-8 py-5 bg-slate-50/50">
          <CardTitle className="text-lg font-bold text-slate-900">Historical Check-Ins & Clinical Sessions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading visit logs...</div>
          ) : visitLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold">No completed visit logs found for this branch.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-100/80 border-b border-slate-200">
                <TableRow className="border-b border-slate-200">
                  <TableHead className="px-8 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">Date & Time</TableHead>
                  <TableHead className="py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">Patient Name</TableHead>
                  <TableHead className="py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">Branch</TableHead>
                  <TableHead className="py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">Dentist</TableHead>
                  <TableHead className="py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">Treatment</TableHead>
                  <TableHead className="py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">Consultation Fee</TableHead>
                  <TableHead className="px-8 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitLogs.map((log) => (
                  <TableRow key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <TableCell className="px-8 py-4 text-sm">
                      <span className="font-bold text-slate-900 block">{log.date}</span>
                      <span className="text-slate-600 text-xs font-medium">{log.time}</span>
                    </TableCell>
                    <TableCell className="py-5 font-semibold text-slate-700">{log.patient}</TableCell>
                    <TableCell className="py-5">
                      <Badge variant="outline" className="text-xs font-semibold bg-slate-50 text-slate-700 border-slate-200">
                        <Building2 className="w-3 h-3 mr-1 text-slate-400" />
                        {log.branch} Branch
                      </Badge>
                    </TableCell>
                    <TableCell className="py-5 text-slate-600 text-sm">{log.dentist}</TableCell>
                    <TableCell className="py-5 text-slate-600 text-sm font-medium">{log.treatment}</TableCell>
                    <TableCell className="py-5 text-emerald-700 font-bold text-sm">{log.fee}</TableCell>
                    <TableCell className="px-8 py-5 text-right">
                      <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-50 rounded-full font-semibold text-xs">
                        Completed
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
