import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { PhilippinePeso, CheckCircle2, ExternalLink, Clock, History, Banknote, Building2, Plus, Search, Calendar, Layers, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

export default function StaffBilling() {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("unpaid");
  const [searchQuery, setSearchQuery] = useState("");

  // Direct Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  // Create Invoice / Installment Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [billingType, setBillingType] = useState("full"); // "full" | "installment"
  const [patientsList, setPatientsList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [newInvoicePatientId, setNewInvoicePatientId] = useState("");
  const [newInvoiceProcedure, setNewInvoiceProcedure] = useState("");
  const [newInvoiceAmount, setNewInvoiceAmount] = useState("");
  const [newInvoiceStatus, setNewInvoiceStatus] = useState("pending");
  const [newInvoiceMethod, setNewInvoiceMethod] = useState("Cash");
  
  // Installment Plan Fields
  const [installmentMonths, setInstallmentMonths] = useState("6");
  const [downpaymentAmount, setDownpaymentAmount] = useState("");
  const [isDownpaymentPaid, setIsDownpaymentPaid] = useState("paid"); // "paid" | "pending"
  const [downpaymentMethod, setDownpaymentMethod] = useState("Cash");

  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [profile?.branch_id]);

  const fetchDropdowns = async () => {
    try {
      const pRes = await supabase.from("profiles").select("id, first_name, last_name, branch_id").eq("role", "patient");
      if (pRes.data) setPatientsList(pRes.data);

      const sRes = await supabase.from("billing_services").select("service_name, cost");
      if (sRes.data) setServicesList(sRes.data);
    } catch (err) {
      console.error("Error loading dropdown data:", err);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      let url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/staff/billing/all`;
      if (profile?.branch_id) {
        url += `?branch_id=${encodeURIComponent(profile.branch_id)}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch invoices");
      const data = await response.json();
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load billing records.");
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (recordId, method = null) => {
    try {
      const payload = method ? { payment_method: method } : {};
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/staff/billing/verify/${recordId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Failed to verify");
      
      toast.success("Payment recorded! Invoice moved to Transaction History.");
      setIsPaymentModalOpen(false);
      await fetchInvoices();
      setActiveTab("history");
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Failed to process payment.");
    }
  };

  const handleOpenDirectPayment = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentMethod("Cash");
    setIsPaymentModalOpen(true);
  };

  const handleServiceSelect = (serviceName) => {
    setNewInvoiceProcedure(serviceName);
    const service = servicesList.find(s => s.service_name === serviceName);
    if (service && service.cost) {
      setNewInvoiceAmount(service.cost.toString());
      // Suggest 20% downpayment for installment procedures like Braces/Implants
      if (service.cost >= 15000) {
        setBillingType("installment");
        setDownpaymentAmount((service.cost * 0.2).toString());
      } else {
        setBillingType("full");
        setDownpaymentAmount("0");
      }
    }
  };

  // Live calculation for installment plan preview
  const installmentCalculation = useMemo(() => {
    const total = parseFloat(newInvoiceAmount) || 0;
    const dp = parseFloat(downpaymentAmount) || 0;
    const months = parseInt(installmentMonths) || 1;
    const remaining = Math.max(0, total - dp);
    const monthly = months > 0 ? (remaining / months) : 0;
    return {
      total,
      downpayment: dp,
      remaining,
      months,
      monthly
    };
  }, [newInvoiceAmount, downpaymentAmount, installmentMonths]);

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!newInvoicePatientId || !newInvoiceProcedure || !newInvoiceAmount) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      setIsCreatingInvoice(true);
      const isInstallment = billingType === "installment" && parseInt(installmentMonths) > 1;

      const payload = {
        patient_id: newInvoicePatientId,
        procedure_name: newInvoiceProcedure,
        amount_due: parseFloat(newInvoiceAmount),
        status: newInvoiceStatus,
        payment_method: newInvoiceStatus === "paid" ? newInvoiceMethod : null,
        branch_id: profile?.branch_id || null,
        is_installment: isInstallment,
        months: isInstallment ? parseInt(installmentMonths) : 1,
        downpayment: isInstallment ? (parseFloat(downpaymentAmount) || 0) : 0,
        downpayment_paid: isInstallment && isDownpaymentPaid === "paid",
        downpayment_method: isInstallment && isDownpaymentPaid === "paid" ? downpaymentMethod : null
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/staff/billing/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to create invoice");

      if (isInstallment) {
        toast.success(`Installment plan created with ${installmentMonths} monthly schedules!`);
      } else {
        toast.success(newInvoiceStatus === "paid" ? "Invoice created and marked as paid!" : "Invoice created successfully!");
      }

      setIsCreateModalOpen(false);
      setNewInvoicePatientId("");
      setNewInvoiceProcedure("");
      setNewInvoiceAmount("");
      setDownpaymentAmount("");
      setBillingType("full");
      setNewInvoiceStatus("pending");
      
      await fetchInvoices();
      if (newInvoiceStatus === "paid" || (isInstallment && isDownpaymentPaid === "paid")) {
        setActiveTab("history");
      }
    } catch (err) {
      console.error("Error creating invoice:", err);
      toast.error("Failed to create invoice.");
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  // Filter invoices by search query
  const matchesSearch = (item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const patientName = `${item.patient?.first_name || ''} ${item.patient?.last_name || ''}`.toLowerCase();
    const procedure = (item.procedure_name || '').toLowerCase();
    const method = (item.payment_method || '').toLowerCase();
    return patientName.includes(query) || procedure.includes(query) || method.includes(query);
  };

  const unpaidInvoices = invoices.filter(i => i.status === "pending" && matchesSearch(i));
  const pendingVerifications = invoices.filter(i => i.status === "pending_verification" && matchesSearch(i));
  
  // Sort transaction history by most recently paid / updated first
  const historyInvoices = invoices
    .filter(i => i.status === "paid" && matchesSearch(i))
    .sort((a, b) => new Date(b.paid_at || b.updated_at || b.created_at) - new Date(a.paid_at || a.updated_at || a.created_at));

  const getBranchBadge = (item) => {
    const name = item.branch?.branch_name || "Pasig";
    return (
      <Badge variant="outline" className="text-xs font-semibold bg-slate-50 text-slate-700 border-slate-200">
        <Building2 className="w-3 h-3 mr-1 text-slate-400" />
        {name} Branch
      </Badge>
    );
  };

  const getProcedureBadge = (item) => {
    const proc = item.procedure_name || "";
    if (proc.includes("Downpayment")) {
      return <Badge className="ml-2 bg-purple-100 text-purple-800 border-purple-200 text-[10px] font-bold">Downpayment</Badge>;
    }
    if (proc.includes("Month ")) {
      const match = proc.match(/Month \d+ of \d+/);
      return <Badge className="ml-2 bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] font-bold">{match ? match[0] : "Installment"}</Badge>;
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2.5">
            <PhilippinePeso className="h-6 w-6 text-emerald-600" /> Billing & Payments
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Manage branch finances, issue monthly installment plans, accept counter cash, and verify online receipts.
          </p>
        </div>

        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm text-xs font-semibold gap-1.5"
        >
          <Plus className="h-4 w-4" /> Issue Bill or Installment Plan
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <Search className="h-4 w-4 text-slate-400 ml-2" />
        <Input 
          placeholder="Search by patient name, procedure, or payment method..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-0 shadow-none focus-visible:ring-0 text-sm placeholder:text-slate-400"
        />
        {searchQuery && (
          <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="text-xs text-slate-400">
            Clear
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100/90 p-1 mb-4 rounded-xl">
          <TabsTrigger value="unpaid" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-xs font-bold">
            <Banknote className="w-4 h-4 mr-1.5 text-rose-500" /> Unpaid Invoices & Due Installments
            {unpaidInvoices.length > 0 && (
              <Badge className="ml-2 bg-rose-500 hover:bg-rose-600 text-[10px] px-1.5 py-0">{unpaidInvoices.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="verifications" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-xs font-bold">
            <Clock className="w-4 h-4 mr-1.5 text-amber-500" /> Online Verifications
            {pendingVerifications.length > 0 && (
              <Badge className="ml-2 bg-amber-500 hover:bg-amber-600 text-[10px] px-1.5 py-0">{pendingVerifications.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-xs font-bold">
            <History className="w-4 h-4 mr-1.5 text-emerald-600" /> Transaction History
            {historyInvoices.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0">{historyInvoices.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Unpaid Invoices */}
        <TabsContent value="unpaid" className="mt-0">
          <Card className="border-t-4 border-t-rose-500 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b pb-4">
              <CardTitle className="text-lg font-bold text-slate-900">Unpaid Invoices & Due Installments</CardTitle>
              <CardDescription>Invoices and scheduled monthly installments waiting for payment. Accept counter cash or card terminals here.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center text-slate-400">Loading branch invoices...</div>
              ) : unpaidInvoices.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold">No unpaid invoices found.</p>
                  <p className="text-xs text-slate-400 mt-1">All patient bills for this branch are currently settled.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/70">
                    <TableRow className="border-b border-slate-100">
                      <TableHead className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Name</TableHead>
                      <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Branch</TableHead>
                      <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Procedure / Term</TableHead>
                      <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount Due</TableHead>
                      <TableHead className="px-8 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidInvoices.map((item) => (
                      <TableRow key={item.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <TableCell className="px-8 py-5 font-semibold text-slate-800">
                          {item.patient?.first_name} {item.patient?.last_name}
                        </TableCell>
                        <TableCell className="py-5">{getBranchBadge(item)}</TableCell>
                        <TableCell className="py-5 text-sm font-medium text-slate-700">
                          {item.procedure_name}
                          {getProcedureBadge(item)}
                        </TableCell>
                        <TableCell className="py-5">
                          <span className="font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg">
                            ₱{item.amount_due?.toLocaleString() || '0'}.00
                          </span>
                        </TableCell>
                        <TableCell className="px-8 py-5 text-right">
                          <Button 
                            size="sm" 
                            onClick={() => handleOpenDirectPayment(item)}
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl gap-1.5 text-xs font-semibold shadow-sm"
                          >
                            <Banknote className="h-4 w-4" /> Accept Payment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Online Verifications */}
        <TabsContent value="verifications" className="mt-0">
          <Card className="border-t-4 border-t-amber-500 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b pb-4">
              <CardTitle className="text-lg font-bold text-slate-900">Online Payment Verifications</CardTitle>
              <CardDescription>Review GCash, Maya, and Bank Transfer receipts submitted by patients for their monthly installments.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center text-slate-400">Loading receipts...</div>
              ) : pendingVerifications.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold">All online receipts have been verified.</p>
                  <p className="text-xs text-slate-400 mt-1">No pending digital transactions require approval.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/70">
                    <TableRow className="border-b border-slate-100">
                      <TableHead className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Name</TableHead>
                      <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Branch</TableHead>
                      <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Procedure / Term</TableHead>
                      <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Method</TableHead>
                      <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</TableHead>
                      <TableHead className="px-8 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingVerifications.map((item) => (
                      <TableRow key={item.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <TableCell className="px-8 py-5 font-semibold text-slate-800">
                          {item.patient?.first_name} {item.patient?.last_name}
                        </TableCell>
                        <TableCell className="py-5">{getBranchBadge(item)}</TableCell>
                        <TableCell className="py-5 text-sm font-medium text-slate-700">
                          {item.procedure_name}
                          {getProcedureBadge(item)}
                        </TableCell>
                        <TableCell className="py-5">
                          <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 font-semibold">
                            {item.payment_method || 'Online Transfer'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-5">
                          <span className="font-bold text-emerald-600">₱{item.amount_due?.toLocaleString() || '0'}.00</span>
                        </TableCell>
                        <TableCell className="px-8 py-5 text-right flex justify-end gap-2">
                          {item.receipt_url && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => window.open(item.receipt_url, '_blank')}
                              className="text-slate-700 hover:text-blue-600 rounded-xl gap-1.5 text-xs font-medium"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> View Receipt
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            onClick={() => verifyPayment(item.id, item.payment_method || 'Online Transfer')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 text-xs font-semibold shadow-sm"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Verify & Settle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Transaction History */}
        <TabsContent value="history" className="mt-0">
          <Card className="border-t-4 border-t-emerald-600 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b pb-4">
              <CardTitle className="text-lg font-bold text-slate-900">Transaction History</CardTitle>
              <CardDescription>A real-time ledger of all paid, verified, and settled invoices ordered chronologically.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center text-slate-400">Loading transaction logs...</div>
              ) : historyInvoices.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <p className="font-semibold">No settled transactions found.</p>
                  <p className="text-xs text-slate-400 mt-1">Paid invoices for this branch will appear here immediately after checkout.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/70">
                    <TableRow className="border-b border-slate-100">
                      <TableHead className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</TableHead>
                      <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Name</TableHead>
                      <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Branch</TableHead>
                      <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Procedure / Term</TableHead>
                      <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Method</TableHead>
                      <TableHead className="px-8 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Amount Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyInvoices.map((item) => {
                      const dateObj = new Date(item.paid_at || item.updated_at || item.created_at);
                      return (
                        <TableRow key={item.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                          <TableCell className="px-8 py-5 text-sm text-slate-600">
                            <span className="font-bold text-slate-900 block">{dateObj.toLocaleDateString()}</span>
                            <span className="text-xs text-slate-400">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </TableCell>
                          <TableCell className="py-5 font-semibold text-slate-800">
                            {item.patient?.first_name} {item.patient?.last_name}
                          </TableCell>
                          <TableCell className="py-5">{getBranchBadge(item)}</TableCell>
                          <TableCell className="py-5 text-sm font-medium text-slate-700">
                            {item.procedure_name}
                            {getProcedureBadge(item)}
                          </TableCell>
                          <TableCell className="py-5">
                            <Badge variant="secondary" className="font-medium bg-slate-100 text-slate-700">
                              {item.payment_method || 'Cash'}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-8 py-5 text-right">
                            <span className="font-extrabold text-emerald-600 text-base">
                              ₱{item.amount_due?.toLocaleString() || '0'}.00
                            </span>
                            <Badge className="ml-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-[10px] font-bold">
                              PAID
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Direct Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Accept Direct Payment</DialogTitle>
            <DialogDescription>
              Record an upfront payment for <span className="font-semibold text-slate-800">{selectedInvoice?.patient?.first_name} {selectedInvoice?.patient?.last_name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Procedure / Term</p>
                <p className="font-semibold text-slate-900 mt-0.5">{selectedInvoice?.procedure_name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Amount Due</p>
                <p className="text-xl font-black text-rose-600">₱{selectedInvoice?.amount_due?.toLocaleString()}.00</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash (Counter)</SelectItem>
                  <SelectItem value="Card Terminal">POS Card Terminal (Debit / Credit)</SelectItem>
                  <SelectItem value="Direct GCash Transfer">Direct GCash Transfer</SelectItem>
                  <SelectItem value="Maya QR">Maya QR</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={() => verifyPayment(selectedInvoice.id, paymentMethod)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm">
              Confirm & Settle Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Bill / Installment Plan Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[540px] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <PhilippinePeso className="w-5 h-5 text-emerald-600" /> Issue Dental Bill or Installment Plan
            </DialogTitle>
            <DialogDescription>
              Create a standard one-time invoice or configure a multi-month installment schedule for patient treatments.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateInvoice} className="space-y-4 py-2">
            {/* Patient Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Select Patient *</Label>
              <Select value={newInvoicePatientId} onValueChange={setNewInvoicePatientId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Search / Select Patient" />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  {patientsList.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Procedure Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Procedure / Dental Service *</Label>
              <Select value={newInvoiceProcedure} onValueChange={handleServiceSelect}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select Procedure from Pricelist" />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  {servicesList.map((s, idx) => (
                    <SelectItem key={idx} value={s.service_name}>
                      {s.service_name} (₱{s.cost?.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Total Amount Due */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Total Treatment Cost (₱) *</Label>
              <Input 
                type="number" 
                placeholder="Enter total amount" 
                value={newInvoiceAmount} 
                onChange={(e) => setNewInvoiceAmount(e.target.value)}
                className="rounded-xl font-bold text-base"
                required
              />
            </div>

            {/* Billing Type Selector (Full Payment vs Installment Plan) */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-bold text-slate-700">Billing Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={billingType === "full" ? "default" : "outline"}
                  onClick={() => setBillingType("full")}
                  className={`rounded-xl text-xs font-bold h-10 ${billingType === "full" ? "bg-slate-900 text-white" : "border-slate-200"}`}
                >
                  <Banknote className="w-4 h-4 mr-1.5" /> Full Payment (One-off)
                </Button>
                <Button
                  type="button"
                  variant={billingType === "installment" ? "default" : "outline"}
                  onClick={() => setBillingType("installment")}
                  className={`rounded-xl text-xs font-bold h-10 ${billingType === "installment" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "border-slate-200 text-indigo-700 hover:bg-indigo-50"}`}
                >
                  <Calendar className="w-4 h-4 mr-1.5" /> Monthly Installment Plan
                </Button>
              </div>
            </div>

            {/* FULL PAYMENT OPTIONS */}
            {billingType === "full" && (
              <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Payment Status *</Label>
                  <Select value={newInvoiceStatus} onValueChange={setNewInvoiceStatus}>
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Unpaid (Issue Bill to Patient)</SelectItem>
                      <SelectItem value="paid">Paid Immediately at Counter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newInvoiceStatus === "paid" && (
                  <div className="space-y-1.5 animate-in fade-in">
                    <Label className="text-xs font-bold text-slate-700">Payment Method</Label>
                    <Select value={newInvoiceMethod} onValueChange={setNewInvoiceMethod}>
                      <SelectTrigger className="rounded-xl bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash (Counter)</SelectItem>
                        <SelectItem value="Card Terminal">POS Card Terminal</SelectItem>
                        <SelectItem value="Direct GCash Transfer">Direct GCash Transfer</SelectItem>
                        <SelectItem value="Maya QR">Maya QR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* INSTALLMENT PLAN CONFIGURATION */}
            {billingType === "installment" && (
              <div className="space-y-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                  <span className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Installment Breakdown
                  </span>
                  <Badge className="bg-indigo-600 text-white text-[10px]">Monthly Schedule</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-indigo-950">Number of Months</Label>
                    <Select value={installmentMonths} onValueChange={setInstallmentMonths}>
                      <SelectTrigger className="rounded-xl bg-white border-indigo-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 Months</SelectItem>
                        <SelectItem value="6">6 Months (Standard)</SelectItem>
                        <SelectItem value="12">12 Months (1 Year)</SelectItem>
                        <SelectItem value="18">18 Months</SelectItem>
                        <SelectItem value="24">24 Months (2 Years)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-indigo-950">Initial Downpayment (₱)</Label>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={downpaymentAmount} 
                      onChange={(e) => setDownpaymentAmount(e.target.value)}
                      className="rounded-xl bg-white border-indigo-200 font-bold"
                    />
                  </div>
                </div>

                {parseFloat(downpaymentAmount) > 0 && (
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-indigo-100/60">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-indigo-950">Downpayment Status</Label>
                      <Select value={isDownpaymentPaid} onValueChange={setIsDownpaymentPaid}>
                        <SelectTrigger className="rounded-xl bg-white border-indigo-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paid">Paid Now at Counter</SelectItem>
                          <SelectItem value="pending">Pay Later</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {isDownpaymentPaid === "paid" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-indigo-950">Downpayment Method</Label>
                        <Select value={downpaymentMethod} onValueChange={setDownpaymentMethod}>
                          <SelectTrigger className="rounded-xl bg-white border-indigo-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Card Terminal">Card Terminal</SelectItem>
                            <SelectItem value="Direct GCash Transfer">Direct GCash</SelectItem>
                            <SelectItem value="Maya QR">Maya QR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                {/* Live Preview Card */}
                <div className="bg-white p-3.5 rounded-xl border border-indigo-100 space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between font-medium">
                    <span>Total Treatment Cost:</span>
                    <span className="font-bold text-slate-900">₱{installmentCalculation.total.toLocaleString()}.00</span>
                  </div>
                  {installmentCalculation.downpayment > 0 && (
                    <div className="flex justify-between font-medium text-purple-700">
                      <span>Initial Downpayment:</span>
                      <span className="font-bold">- ₱{installmentCalculation.downpayment.toLocaleString()}.00 ({isDownpaymentPaid === "paid" ? "Paid Today" : "Pending"})</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium">
                    <span>Remaining Balance:</span>
                    <span className="font-bold text-slate-900">₱{installmentCalculation.remaining.toLocaleString()}.00</span>
                  </div>
                  <div className="border-t border-slate-100 pt-2 mt-1 flex justify-between items-center">
                    <span className="font-bold text-indigo-900">Monthly Due:</span>
                    <span className="text-base font-black text-indigo-600">
                      ₱{installmentCalculation.monthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / month
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 italic">
                    Generates {installmentCalculation.months} monthly invoices due every 30 days.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="pt-3 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isCreatingInvoice}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm"
              >
                {isCreatingInvoice ? "Generating..." : billingType === "installment" ? `Generate ${installmentMonths}-Month Installment Plan` : newInvoiceStatus === "paid" ? "Create & Record Payment" : "Create Unpaid Bill"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
