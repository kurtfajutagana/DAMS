import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";

export default function VisitLogs() {
  const visitLogs = [
    { id: 1, date: "July 09, 2026", time: "10:30 AM", patient: "Maria Clara", dentist: "Dr. Santos", treatment: "Tooth Extraction", fee: "₱1,500.00" },
    { id: 2, date: "July 08, 2026", time: "02:15 PM", patient: "Juan Dela Cruz", dentist: "Dr. Reyes", treatment: "Oral Prophylaxis", fee: "₱800.00" },
    { id: 3, date: "July 07, 2026", time: "09:00 AM", patient: "Jose Rizal", dentist: "Dr. Santos", treatment: "Braces Cleaning", fee: "₱2,000.00" },
    { id: 4, date: "July 05, 2026", time: "04:30 PM", patient: "Andres Bonifacio", dentist: "Dr. Cruz", treatment: "Root Canal Therapy", fee: "₱4,500.00" },
  ];

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
