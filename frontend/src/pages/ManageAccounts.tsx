import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

export default function ManageAccounts() {
  const [users] = useState([
    {
      id: "U-4001",
      name: "Dr. Arthur Pendelton",
      email: "arthur.p@teethtalk.com",
      role: "dentist",
      branch: "Pasig Branch",
      license: "PRC-0084712",
      specialization: "Implants & Surgery"
    },
    {
      id: "U-4002",
      name: "Maria Santos",
      email: "maria.s@teethtalk.com",
      role: "staff",
      branch: "Pasig Branch",
      license: "None",
      specialization: "Receptionist & Billing Admin"
    },
    {
      id: "U-4003",
      name: "Dr. Sarah Lim",
      email: "sarah.lim@teethtalk.com",
      role: "dentist",
      branch: "Fairview Branch",
      license: "PRC-0091242",
      specialization: "Orthodontics & Pediatric"
    },
    {
      id: "U-4004",
      name: "Admin User",
      email: "admin@teethtalk.com",
      role: "admin",
      branch: "All Branches",
      license: "PRC-SYSADMIN",
      specialization: "Systems Admin"
    }
  ]);

  const handlePermissions = (name: string) => {
    toast.success(`Access permission drawer opened for ${name}.`);
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manage Accounts</h1>
          <p className="text-slate-500 text-xs mt-0.5">Control staff accounts, permissions, and doctor licenses</p>
        </div>
        <Button
          onClick={() => toast.success("Provisioning flow opened.")}
          className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs"
        >
          Add Staff Account
        </Button>
      </div>

      {/* Grid */}
      <Card className="border-slate-200 bg-white">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Account Register</h2>
          <p className="text-[10px] text-slate-500">Authorized personnel credentials</p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Account ID</th>
                <th className="py-3 px-4">Operator Name</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">License / Focus</th>
                <th className="py-3 px-4 text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-650">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-400">{u.id}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-955">{u.name}</div>
                    <div className="text-[10px] text-slate-400">{u.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    {u.role === "admin" && (
                      <Badge className="bg-slate-950 text-white border border-slate-950 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                        Admin
                      </Badge>
                    )}
                    {u.role === "dentist" && (
                      <Badge className="bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                        Dentist
                      </Badge>
                    )}
                    {u.role === "staff" && (
                      <Badge className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                        Staff
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">{u.branch}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{u.specialization}</div>
                    {u.license !== "None" && (
                      <div className="text-[9px] text-slate-400 mt-0.5">{u.license}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      onClick={() => handlePermissions(u.name)}
                      size="sm"
                      variant="outline"
                      className="border-slate-200 text-slate-700 hover:bg-slate-950 hover:text-white hover:border-slate-950 font-bold text-[10px]"
                    >
                      Permissions
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
