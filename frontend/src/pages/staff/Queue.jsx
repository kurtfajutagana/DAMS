import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Users, Clock, CheckCircle2, Play, UserCheck } from "lucide-react";

export default function Queue() {
  const [queue, setQueue] = useState([
    { id: 1, number: "Q-015", name: "Maria Clara", service: "Tooth Extraction", dentist: "Dr. Santos", status: "In Progress" },
    { id: 2, number: "Q-016", name: "Juan Dela Cruz", service: "Oral Prophylaxis", dentist: "Dr. Reyes", status: "Waiting" },
    { id: 3, number: "Q-017", name: "Jose Rizal", service: "Dental Braces Adj.", dentist: "Dr. Santos", status: "Waiting" },
    { id: 4, number: "Q-018", name: "Andres Bonifacio", service: "Root Canal Therapy", dentist: "Dr. Cruz", status: "Waiting" },
  ]);

  const updateStatus = (id, nextStatus) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, status: nextStatus } : item));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "In Progress":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white rounded-full">In Progress</Badge>;
      case "Waiting":
        return <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50 rounded-full">Waiting</Badge>;
      case "Completed":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full">Completed</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Daily Queue Dashboard</h1>
          <p className="text-slate-500 text-sm">Manage live patient queue and assignments</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/10">Add Walk-In Patient</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="border-none shadow-xl shadow-slate-100/50 bg-white p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total in Queue</p>
            <h3 className="text-2xl font-bold text-slate-800">{queue.filter(q => q.status !== "Completed").length} Patients</h3>
          </div>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-100/50 bg-white p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Avg. Wait Time</p>
            <h3 className="text-2xl font-bold text-slate-800">18 Mins</h3>
          </div>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-100/50 bg-white p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Serving Now</p>
            <h3 className="text-2xl font-bold text-slate-800">{queue.filter(q => q.status === "In Progress").length} Patients</h3>
          </div>
        </Card>
      </div>

      <Card className="border-none shadow-xl shadow-slate-100/50 bg-white rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-50 px-8 py-6">
          <CardTitle className="text-lg font-bold text-slate-800">Queue List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100">
                <TableHead className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Queue No.</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Name</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Service</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Dentist</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</TableHead>
                <TableHead className="px-8 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((patient) => (
                <TableRow key={patient.id} className="border-b border-slate-50 hover:bg-slate-50/20 transition-colors">
                  <TableCell className="px-8 py-5 font-semibold text-slate-800">{patient.number}</TableCell>
                  <TableCell className="py-5 font-medium text-slate-700">{patient.name}</TableCell>
                  <TableCell className="py-5 text-slate-600 text-sm">{patient.service}</TableCell>
                  <TableCell className="py-5 text-slate-600 text-sm">{patient.dentist}</TableCell>
                  <TableCell className="py-5">{getStatusBadge(patient.status)}</TableCell>
                  <TableCell className="px-8 py-5 text-right space-x-2">
                    {patient.status === "Waiting" && (
                      <Button 
                        size="sm" 
                        onClick={() => updateStatus(patient.id, "In Progress")}
                        className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg h-8 gap-1.5"
                      >
                        <Play className="h-3 w-3" /> Start
                      </Button>
                    )}
                    {patient.status === "In Progress" && (
                      <Button 
                        size="sm" 
                        onClick={() => updateStatus(patient.id, "Completed")}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg h-8 gap-1.5"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Complete
                      </Button>
                    )}
                    {patient.status === "Completed" && (
                      <span className="text-emerald-500 text-xs font-semibold">Done</span>
                    )}
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
