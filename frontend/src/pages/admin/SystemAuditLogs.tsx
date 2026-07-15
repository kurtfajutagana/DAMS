import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export default function SystemAuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/admin/audit-logs");
        if (!response.ok) throw new Error("Failed to fetch logs");
        const data = await response.json();
        
        const formattedLogs = data.map((log: any) => ({
          id: log.id,
          timestamp: new Date(log.timestamp).toLocaleString(),
          component: log.component,
          action: log.action,
          severity: log.severity
        }));
        setLogs(formattedLogs);
      } catch (error) {
        console.error("Error fetching logs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

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
