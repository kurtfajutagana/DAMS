import React, { useState, useEffect, useMemo } from "react";
import { Search, Filter, ChevronLeft, ChevronRight, X, ShieldAlert, CheckCircle2, Info, Terminal } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

export default function SystemAuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pure UI Filters & Inspector State
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/audit-logs`);
        if (!response.ok) throw new Error("Failed to fetch logs");
        const data = await response.json();
        
        const formattedLogs = data.map((log: any) => ({
          id: log.id,
          timestamp: new Date(log.timestamp).toLocaleString(),
          component: log.component,
          action: log.action,
          severity: log.severity,
          rawData: log
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

  const filteredLogs = useMemo(() => {
    return logs.filter(
      log => {
        const matchesSearch =
          log.action.toLowerCase().includes(search.toLowerCase()) ||
          log.component.toLowerCase().includes(search.toLowerCase());
        const matchesSeverity = severityFilter === "all" || log.severity === severityFilter;
        return matchesSearch && matchesSeverity;
      }
    );
  }, [logs, search, severityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, severityFilter]);

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-955">System Audit Logs</h1>
        <p className="text-slate-500 text-sm mt-1">Database write actions, AI engine intents, and payment approvals</p>
      </div>

      {/* Grid */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Audit Trail</h2>
            <p className="text-xs text-slate-500">Click any row to inspect raw event payload details</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Severity Filter Pills */}
            <div className="flex items-center gap-1.5 bg-white p-1 border border-slate-200 rounded-lg text-xs font-semibold">
              {["all", "success", "info", "warning"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-md capitalize transition-colors ${
                    severityFilter === sev
                      ? "bg-slate-950 text-white font-bold"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit trail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-950/20 focus:border-slate-900 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Component</th>
                <th className="py-3.5 px-4">Event Details</th>
                <th className="py-3.5 px-4">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 text-xs font-mono font-medium text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">{log.component}</td>
                    <td className="py-3.5 px-4 text-slate-800 leading-relaxed font-medium">{log.action}</td>
                    <td className="py-3.5 px-4">
                      {log.severity === "success" && (
                        <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase">
                          Success
                        </Badge>
                      )}
                      {log.severity === "info" && (
                        <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase">
                          Info
                        </Badge>
                      )}
                      {log.severity === "warning" && (
                        <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase">
                          Warning
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 text-sm font-medium">
                    No matching audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer Controls */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredLogs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length} events
          </span>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-8 border-slate-300 text-xs font-semibold disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <span className="text-xs font-bold text-slate-700 px-2">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="h-8 border-slate-300 text-xs font-semibold disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Log Detail Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedLog(null)} />
          
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-10 animate-in zoom-in-95 duration-150">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-slate-900" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Audit Log Payload Inspector</h3>
                  <p className="text-xs text-slate-500">Log ID: {selectedLog.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</span>
                  <p className="font-semibold text-slate-900 text-xs mt-0.5">{selectedLog.timestamp}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Component</span>
                  <p className="font-bold text-slate-950 text-sm mt-0.5">{selectedLog.component}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Raw Event Payload</span>
                <pre className="p-4 bg-slate-950 text-emerald-400 rounded-lg text-xs font-mono overflow-x-auto max-h-60 leading-relaxed border border-slate-900">
                  {JSON.stringify(selectedLog.rawData, null, 2)}
                </pre>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex justify-end">
              <Button
                onClick={() => setSelectedLog(null)}
                size="sm"
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs px-4"
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
