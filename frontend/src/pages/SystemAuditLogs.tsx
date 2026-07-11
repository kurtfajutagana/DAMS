import React, { useState } from "react";
import { Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export default function SystemAuditLogs() {
  const [logs] = useState([
    {
      id: "LOG-50021",
      timestamp: "2026-07-10 22:15:30",
      component: "LLM Triage Service",
      action: "Intent classification: Patient P-10024 classified as 'appointment_phobia_anxiety' (confidence: 94%)",
      severity: "info"
    },
    {
      id: "LOG-50020",
      timestamp: "2026-07-10 21:55:12",
      component: "Payment Verification",
      action: "GCash billing invoice verify: ID P-10052, amount PHP 45,000",
      severity: "success"
    },
    {
      id: "LOG-50019",
      timestamp: "2026-07-10 20:42:05",
      component: "Monitoring Daemon",
      action: "Missed appointment alert dispatched: Patient P-10088 flagged non-compliant",
      severity: "warning"
    },
    {
      id: "LOG-50017",
      timestamp: "2026-07-10 18:30:20",
      component: "Access Control",
      action: "Admin session init: authenticated session for user admin@teethtalk.com",
      severity: "success"
    }
  ]);

  const [search, setSearch] = useState("");

  const filteredLogs = logs.filter(
    log =>
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.component.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Audit Logs</h1>
        <p className="text-slate-500 text-xs mt-0.5">Database write actions, AI engine intents, and payment approvals</p>
      </div>

      {/* Grid */}
      <Card className="border-slate-200 bg-white">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Audit Trail</h2>
            <p className="text-[10px] text-slate-500">Verified transaction history</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-950"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Component</th>
                <th className="py-3 px-4">Event Details</th>
                <th className="py-3 px-4">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-3 px-4 font-bold text-slate-700 whitespace-nowrap">{log.component}</td>
                    <td className="py-3 px-4 text-slate-800 leading-normal">{log.action}</td>
                    <td className="py-3 px-4">
                      {log.severity === "success" && (
                        <Badge className="bg-slate-100 text-slate-850 hover:bg-slate-100 border border-slate-250 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                          Success
                        </Badge>
                      )}
                      {log.severity === "info" && (
                        <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                          Info
                        </Badge>
                      )}
                      {log.severity === "warning" && (
                        <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                          Warning
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No matching logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
