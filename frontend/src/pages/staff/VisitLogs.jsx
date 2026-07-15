import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";

export default function VisitLogs() {
  const [visitLogs, setVisitLogs] = useState([]);

  useEffect(() => {
    const fetchVisitLogs = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/staff/visit-logs");
        const data = await response.json();
        const formattedLogs = data.map((item, index) => {
          const d = new Date(item.created_at);
          return {
            id: item.id,
            date: d.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
            time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            patient: `${item.patient?.first_name || ''} ${item.patient?.last_name || ''}`,
            dentist: item.dentist ? `Dr. ${item.dentist.first_name} ${item.dentist.last_name}` : "Any Available",
            treatment: item.service_requested,
            fee: item.consultation_fee !== "N/A" ? `₱ ${item.consultation_fee}` : "₱ N/A"
          };
        });
        setVisitLogs(formattedLogs);
      } catch (error) {
        console.error("Error fetching visit logs:", error);
      }
    };
    fetchVisitLogs();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Patient Visit Logs</h1>
        <p className="text-slate-500 text-sm">Archived patient check-ins and completed sessions</p>
      </div>

      <Card className="border-none shadow-xl shadow-slate-100/50 bg-white rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-50 px-8 py-6">
          <CardTitle className="text-lg font-bold text-slate-800">Historical Check-Ins</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100">
                <TableHead className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date & Time</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Name</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Dentist</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Treatment</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Consultation Fee</TableHead>
                <TableHead className="px-8 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visitLogs.map((log) => (
                <TableRow key={log.id} className="border-b border-slate-50 hover:bg-slate-50/20 transition-colors">
                  <TableCell className="px-8 py-5 text-sm">
                    <span className="font-semibold text-slate-800 block">{log.date}</span>
                    <span className="text-slate-400 text-xs">{log.time}</span>
                  </TableCell>
                  <TableCell className="py-5 font-semibold text-slate-700">{log.patient}</TableCell>
                  <TableCell className="py-5 text-slate-600 text-sm">{log.dentist}</TableCell>
                  <TableCell className="py-5 text-slate-600 text-sm">{log.treatment}</TableCell>
                  <TableCell className="py-5 text-slate-800 font-semibold text-sm">{log.fee}</TableCell>
                  <TableCell className="px-8 py-5 text-right">
                    <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-50 rounded-full">Completed</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
