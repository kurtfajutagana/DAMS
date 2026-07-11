import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { User, Shield, ShieldCheck } from "lucide-react";

export default function ManageAccounts() {
  const users = [
    { id: 1, name: "Dr. Jose Santos", email: "j.santos@teethtalk.com", role: "Dentist", status: "Active" },
    { id: 2, name: "TeethTalk Staff", email: "staff@teethtalk.com", role: "Staff", status: "Active" },
    { id: 3, name: "Dr. Anna Reyes", email: "a.reyes@teethtalk.com", role: "Dentist", status: "Active" },
    { id: 4, name: "Jane Smith", email: "j.smith@teethtalk.com", role: "Staff", status: "Inactive" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Manage Accounts</h1>
          <p className="text-slate-500 text-sm">Control staff roles, statuses, and permissions</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/10">Add Employee Account</Button>
      </div>

      <Card className="border-none shadow-xl shadow-slate-100/50 bg-white rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-50 px-8 py-6">
          <CardTitle className="text-lg font-bold text-slate-800">Employee List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100">
                <TableHead className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Employee Name</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Role</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</TableHead>
                <TableHead className="px-8 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((employee) => (
                <TableRow key={employee.id} className="border-b border-slate-50 hover:bg-slate-50/20 transition-colors">
                  <TableCell className="px-8 py-5 flex items-center gap-3">
                    <div className="h-9 w-9 bg-red-50 text-red-600 flex items-center justify-center rounded-full">
                      <User className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-slate-800">{employee.name}</span>
                  </TableCell>
                  <TableCell className="py-5 text-slate-600 text-sm">{employee.email}</TableCell>
                  <TableCell className="py-5">
                    <div className="flex items-center gap-1.5 text-slate-700 text-sm">
                      {employee.role === "Dentist" ? <ShieldCheck className="h-4 w-4 text-indigo-500" /> : <Shield className="h-4 w-4 text-slate-400" />}
                      <span>{employee.role}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-5">
                    {employee.status === "Active" ? (
                      <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full hover:bg-emerald-50">Active</Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-500 border border-slate-200 rounded-full hover:bg-slate-100">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-8 py-5 text-right space-x-2">
                    <Button variant="outline" size="sm" className="h-8 rounded-lg border-slate-200 text-slate-600">Edit</Button>
                    <Button variant="outline" size="sm" className="h-8 rounded-lg border-slate-200 text-red-500 hover:bg-red-50">Suspend</Button>
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
