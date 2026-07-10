import React, { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Users,
  MessageSquare,
  AlertTriangle,
  FileCheck,
  Search,
  Eye,
  Send,
  Building2,
  Calendar,
  CheckCircle2,
  UserCheck,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { PatientAdherenceRecord } from "../types/admin";

export default function AdminDashboard() {
  const { selectedBranch } = useOutletContext<{ selectedBranch: string }>();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientAdherenceRecord | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  
  const [patients, setPatients] = useState<PatientAdherenceRecord[]>([
    {
      id: "P-10024",
      name: "Delfin Cruz",
      branch: "Pasig Branch",
      procedureType: "Dental Implant Surgery",
      status: "high_risk",
      riskScore: 84,
      phone: "+63 917 123 4567",
      lastVisit: "2026-06-15",
      nextAppointment: "2026-07-12",
      aiTriageSummary: "Patient reported intense anxiety. AI classified intent as 'anxiety_appointment_phobia'. Highly reluctant to attend surgical follow-ups.",
      unverifiedReceiptAmount: 8500,
      billingStatus: "pending"
    },
    {
      id: "P-10031",
      name: "Clara Santos",
      branch: "Fairview Branch",
      procedureType: "Bracket Adjustment",
      status: "likely",
      riskScore: 12,
      phone: "+63 928 234 5678",
      lastVisit: "2026-07-02",
      nextAppointment: "2026-08-02",
      aiTriageSummary: "Confirmed next appointment date. Routine adjustment care plan is proceeding normally.",
      unverifiedReceiptAmount: 0,
      billingStatus: "none"
    },
    {
      id: "P-10045",
      name: "Marc Lopez",
      branch: "San Juan Branch",
      procedureType: "Root Canal Therapy",
      status: "high_risk",
      riskScore: 79,
      phone: "+63 915 345 6789",
      lastVisit: "2026-06-28",
      nextAppointment: "2026-07-14",
      aiTriageSummary: "Missed two doses of antibiotics due to side effects. AI flagged treatment non-adherence. Critical follow-up needed.",
      unverifiedReceiptAmount: 12000,
      billingStatus: "pending"
    },
    {
      id: "P-10052",
      name: "Eliza Romero",
      branch: "Pasig Branch",
      procedureType: "Veneers Installation",
      status: "likely",
      riskScore: 8,
      phone: "+63 908 456 7890",
      lastVisit: "2026-07-08",
      nextAppointment: "2026-07-22",
      aiTriageSummary: "Patient fully compliant with medication and payment schedule. Ready for final veneers verification.",
      unverifiedReceiptAmount: 0,
      billingStatus: "verified"
    },
    {
      id: "P-10068",
      name: "Gabriel Tiongson",
      branch: "Fairview Branch",
      procedureType: "Wisdom Tooth Extraction",
      status: "high_risk",
      riskScore: 68,
      phone: "+63 916 567 8901",
      lastVisit: "2026-07-05",
      nextAppointment: "2026-07-19",
      aiTriageSummary: "Unverified GCash screenshot uploaded (PHP 6,000). The image is cropped, missing confirmation number.",
      unverifiedReceiptAmount: 6000,
      billingStatus: "pending"
    },
    {
      id: "P-10079",
      name: "Sofia Villareal",
      branch: "San Juan Branch",
      procedureType: "Laser Gingivectomy",
      status: "moderate",
      riskScore: 45,
      phone: "+63 919 678 9012",
      lastVisit: "2026-07-01",
      nextAppointment: "2026-07-16",
      aiTriageSummary: "Complied with saline wash questions, but ignored medication confirmations twice in chatbot flow.",
      unverifiedReceiptAmount: 0,
      billingStatus: "none"
    }
  ]);

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const matchesBranch = selectedBranch === "All Branches" || patient.branch === selectedBranch;
      const matchesSearch =
        patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.procedureType.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesBranch && matchesSearch;
    });
  }, [patients, selectedBranch, searchQuery]);

  const telemetry = useMemo(() => {
    const activeToday = selectedBranch === "All Branches" ? 142 : selectedBranch === "Pasig Branch" ? 54 : selectedBranch === "Fairview Branch" ? 48 : 40;
    const aiConversations = selectedBranch === "All Branches" ? 38 : selectedBranch === "Pasig Branch" ? 15 : selectedBranch === "Fairview Branch" ? 12 : 11;
    const highRiskCount = patients.filter(p => (selectedBranch === "All Branches" || p.branch === selectedBranch) && p.status === "high_risk").length;
    const pendingBilling = patients.filter(p => (selectedBranch === "All Branches" || p.branch === selectedBranch) && p.billingStatus === "pending").length;

    return { activeToday, aiConversations, highRiskCount, pendingBilling };
  }, [patients, selectedBranch]);

  const handleOpenReview = (patient: PatientAdherenceRecord) => {
    setSelectedPatient(patient);
    setIsReviewModalOpen(true);
  };

  const handleSendReminder = () => {
    if (!selectedPatient) return;
    toast.success(`Intervention SMS alert successfully sent to ${selectedPatient.name}.`);
    setIsReviewModalOpen(false);
  };

  const handleVerifyBilling = (patientId: string) => {
    setPatients(prev =>
      prev.map(p => (p.id === patientId ? { ...p, billingStatus: "verified", unverifiedReceiptAmount: 0 } : p))
    );
    toast.success(`Payment verified successfully.`);
    setIsReviewModalOpen(false);
  };

  const handleMarkCompliant = (patientId: string) => {
    setPatients(prev =>
      prev.map(p => (p.id === patientId ? { ...p, status: "likely", riskScore: 10 } : p))
    );
    toast.success(`Patient compliance updated.`);
    setIsReviewModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Clinical Dashboard</h1>
          <p className="text-slate-500 text-xs mt-0.5">{selectedBranch} Overview</p>
        </div>
      </div>

      {/* Telemetry Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <Card className="border-slate-200 bg-white border-t-2 border-t-slate-950 shadow-sm">
          <CardHeader className="pb-1.5 pt-4">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Active Patients Today</span>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between pb-4">
            <span className="text-2xl font-bold text-slate-955">{telemetry.activeToday}</span>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              +12%
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white border-t-2 border-t-slate-800 shadow-sm">
          <CardHeader className="pb-1.5 pt-4">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">AI Chat Sessions</span>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between pb-4">
            <span className="text-2xl font-bold text-slate-955">{telemetry.aiConversations}</span>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              Active
            </span>
          </CardContent>
        </Card>

        <Card className={`border-slate-200 bg-white border-t-2 shadow-sm ${
          telemetry.highRiskCount > 0 ? "border-t-red-600 bg-red-50/5" : "border-t-slate-300"
        }`}>
          <CardHeader className="pb-1.5 pt-4">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">High Risk Alerts</span>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between pb-4">
            <span className={`text-2xl font-bold ${telemetry.highRiskCount > 0 ? "text-red-650" : "text-slate-955"}`}>
              {telemetry.highRiskCount}
            </span>
            {telemetry.highRiskCount > 0 && (
              <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase">
                Action Required
              </span>
            )}
          </CardContent>
        </Card>

        <Card className={`border-slate-200 bg-white border-t-2 shadow-sm ${
          telemetry.pendingBilling > 0 ? "border-t-red-600 bg-red-50/5" : "border-t-slate-300"
        }`}>
          <CardHeader className="pb-1.5 pt-4">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Pending Payments</span>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between pb-4">
            <span className={`text-2xl font-bold ${telemetry.pendingBilling > 0 ? "text-red-650" : "text-slate-955"}`}>
              {telemetry.pendingBilling}
            </span>
            {telemetry.pendingBilling > 0 && (
              <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase">
                GCash/Bank
              </span>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Adherence Risk Center */}
      <Card className="border-slate-200 bg-white shadow-sm">
        
        {/* Table Header Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/40">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Adherence Monitoring Grid</h2>
            <p className="text-[10px] text-slate-500">AI triage analysis status</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient, ID or treatment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* Table Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Patient ID</th>
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Clinic Branch</th>
                <th className="py-3 px-4">Procedure</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Adherence Flag</th>
                <th className="py-3 px-4 text-right">Intervention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-650">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-400">{patient.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-950">{patient.name}</div>
                      <div className="text-[10px] text-slate-400">{patient.phone}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{patient.branch}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{patient.procedureType}</td>
                    <td className="py-3 px-4">
                      <span className={`font-bold ${
                        patient.riskScore > 75 
                          ? "text-red-650 font-extrabold" 
                          : patient.riskScore > 40 
                          ? "text-amber-600" 
                          : "text-slate-900"
                      }`}>{patient.riskScore}%</span>
                    </td>
                    <td className="py-3 px-4">
                      {patient.status === "high_risk" && (
                        <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border border-red-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide">
                          High Risk
                        </Badge>
                      )}
                      {patient.status === "moderate" && (
                        <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-250/60 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide">
                          Moderate Risk
                        </Badge>
                      )}
                      {patient.status === "likely" && (
                        <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide">
                          Likely to Comply
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        onClick={() => handleOpenReview(patient)}
                        size="sm"
                        variant="outline"
                        className="border-slate-200 text-slate-700 hover:bg-slate-950 hover:text-white hover:border-slate-950 font-bold text-[10px]"
                      >
                        Review Flow
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Simplified Review Modal */}
      {isReviewModalOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsReviewModalOpen(false)} />
          
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-10 animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Review Patient Flow</h3>
                <p className="text-[10px] text-slate-500">ID: {selectedPatient.id}</p>
              </div>
              <button onClick={() => setIsReviewModalOpen(false)} className="text-slate-400 hover:text-slate-650">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              
              {/* Quick info */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div>
                  <span className="text-[9px] font-bold text-slate-450 uppercase">Name / Contact</span>
                  <p className="font-semibold text-slate-900">{selectedPatient.name}</p>
                  <p className="text-[10px] text-slate-500">{selectedPatient.phone}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-450 uppercase">Next Appointment</span>
                  <p className="font-semibold text-slate-900">{selectedPatient.nextAppointment}</p>
                  <p className="text-[10px] text-slate-500">{selectedPatient.branch}</p>
                </div>
              </div>

              {/* AI Triage context */}
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 uppercase text-[9px] tracking-wider">AI Intent Triage Summary</h4>
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg leading-relaxed text-slate-700 font-medium">
                  {selectedPatient.aiTriageSummary}
                </div>
              </div>

              {/* GCash verification alert */}
              {selectedPatient.unverifiedReceiptAmount > 0 && (
                <div className="p-3 bg-red-50/20 border border-red-100 rounded-lg flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800 text-red-900">Unverified payment screenshot: PHP {selectedPatient.unverifiedReceiptAmount.toLocaleString()}</p>
                    <p className="text-[9px] text-slate-500">Confirm payment matches transaction ledger.</p>
                  </div>
                  <Button
                    onClick={() => handleVerifyBilling(selectedPatient.id)}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px]"
                  >
                    Verify Payment
                  </Button>
                </div>
              )}

            </div>

            {/* Modal Actions */}
            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3.5 flex justify-between gap-2">
              <div className="flex gap-2">
                <Button
                  onClick={handleSendReminder}
                  size="sm"
                  className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-[10px] flex items-center gap-1"
                >
                  <Send className="h-3 w-3" />
                  <span>Send SMS Reminder</span>
                </Button>
                <Button
                  onClick={() => handleMarkCompliant(selectedPatient.id)}
                  size="sm"
                  variant="outline"
                  className="border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-[10px]"
                >
                  Mark Compliant
                </Button>
              </div>

              <Button
                onClick={() => setIsReviewModalOpen(false)}
                size="sm"
                variant="outline"
                className="border-slate-200 text-slate-500 hover:bg-slate-100 font-semibold text-[10px]"
              >
                Close
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
