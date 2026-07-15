import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { PhilippinePeso, CheckCircle2, ExternalLink, Clock, History, Banknote } from "lucide-react";
import { toast } from "sonner";

export default function StaffBilling() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Direct Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:8000/api/staff/billing/all");
      if (!response.ok) throw new Error("Failed to fetch invoices");
      const data = await response.json();
      setInvoices(data);
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
      const response = await fetch(`http://localhost:8000/api/staff/billing/verify/${recordId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Failed to verify");
      
      toast.success("Payment successful and balance cleared.");
      setIsPaymentModalOpen(false);
      fetchInvoices();
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

  const unpaidInvoices = invoices.filter(i => i.status === "pending");
  const pendingVerifications = invoices.filter(i => i.status === "pending_verification");
  const historyInvoices = invoices.filter(i => i.status === "paid");

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Billing & Payments</h1>
        <p className="text-slate-500 mt-1">Manage clinic finances, accept direct payments, and verify online transactions.</p>
      </div>

      <Tabs defaultValue="unpaid" className="w-full">
        <TabsList className="bg-slate-100 p-1 mb-4">
          <TabsTrigger value="unpaid" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Banknote className="w-4 h-4 mr-2" /> Unpaid Invoices
            {unpaidInvoices.length > 0 && (
              <Badge className="ml-2 bg-rose-500 hover:bg-rose-600">{unpaidInvoices.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="verifications" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Clock className="w-4 h-4 mr-2" /> Online Verifications
            {pendingVerifications.length > 0 && (
              <Badge className="ml-2 bg-amber-500 hover:bg-amber-600">{pendingVerifications.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <History className="w-4 h-4 mr-2" /> Transaction History
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Unpaid Invoices */}
        <TabsContent value="unpaid" className="mt-0">
          <Card className="border-t-4 border-t-rose-500 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b pb-4">
              <CardTitle className="text-lg">Unpaid Invoices</CardTitle>
              <CardDescription>Invoices waiting for patient payment. Accept direct cash or card here.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {unpaidInvoices.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p>No unpaid invoices at the moment.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-b border-slate-100">
                      <TableHead className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Name</TableHead>
                      <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Procedure</TableHead>
                      <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount Due</TableHead>
                      <TableHead className="px-8 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidInvoices.map((item) => (
                      <TableRow key={item.id} className="border-b border-slate-50">
                        <TableCell className="px-8 py-5 font-semibold text-slate-800">
                          {item.patient?.first_name} {item.patient?.last_name}
                        </TableCell>
                        <TableCell className="py-5 text-sm font-medium text-slate-700">{item.procedure_name}</TableCell>
                        <TableCell className="py-5">
                          <span className="font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md">₱{item.amount_due?.toLocaleString() || '0'}.00</span>
                        </TableCell>
                        <TableCell className="px-8 py-5 text-right">
                          <Button 
                            size="sm" 
                            onClick={() => handleOpenDirectPayment(item)}
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg gap-1.5"
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
          <Card className="border-t-4 border-t-amber-500 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b pb-4">
              <CardTitle className="text-lg">Online Payment Verifications</CardTitle>
              <CardDescription>Review receipts uploaded by patients via the Patient Portal.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {pendingVerifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p>All uploaded receipts have been verified.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-b border-slate-100">
                      <TableHead className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Name</TableHead>
                      <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Procedure</TableHead>
                      <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Method</TableHead>
                      <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</TableHead>
                      <TableHead className="px-8 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingVerifications.map((item) => (
                      <TableRow key={item.id} className="border-b border-slate-50">
                        <TableCell className="px-8 py-5 font-semibold text-slate-800">
                          {item.patient?.first_name} {item.patient?.last_name}
                        </TableCell>
                        <TableCell className="py-5 text-sm font-medium text-slate-700">{item.procedure_name}</TableCell>
                        <TableCell className="py-5">
                          <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">
                            {item.payment_method || 'Online'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-5">
                          <span className="font-bold text-emerald-600">₱{item.amount_due?.toLocaleString() || '0'}.00</span>
                        </TableCell>
                        <TableCell className="px-8 py-5 text-right flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open(item.receipt_url, '_blank')}
                            className="text-slate-600 hover:text-blue-600 rounded-lg gap-1.5"
                          >
                            <ExternalLink className="h-4 w-4" /> View Receipt
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => verifyPayment(item.id)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg gap-1.5"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Verify
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
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b pb-4">
              <CardTitle className="text-lg">Transaction History</CardTitle>
              <CardDescription>A complete log of all paid and verified invoices.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {historyInvoices.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <p>No transaction history found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-b border-slate-100">
                      <TableHead className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</TableHead>
                      <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Name</TableHead>
                      <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Procedure</TableHead>
                      <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Method</TableHead>
                      <TableHead className="px-8 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Amount Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyInvoices.map((item) => (
                      <TableRow key={item.id} className="border-b border-slate-50">
                        <TableCell className="px-8 py-5 text-sm text-slate-500">
                          {new Date(item.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="py-5 font-semibold text-slate-800">
                          {item.patient?.first_name} {item.patient?.last_name}
                        </TableCell>
                        <TableCell className="py-5 text-sm font-medium text-slate-700">{item.procedure_name}</TableCell>
                        <TableCell className="py-5">
                          <Badge variant="secondary" className="font-normal text-slate-600">
                            {item.payment_method || 'Cash'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-8 py-5 text-right">
                          <span className="font-bold text-slate-700">₱{item.amount_due?.toLocaleString() || '0'}.00</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Direct Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Accept Direct Payment</DialogTitle>
            <DialogDescription>
              Record an upfront payment for {selectedInvoice?.patient?.first_name} {selectedInvoice?.patient?.last_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-sm text-slate-500 font-medium">Procedure</p>
                <p className="font-semibold text-slate-900">{selectedInvoice?.procedure_name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500 font-medium">Amount Due</p>
                <p className="text-xl font-bold text-rose-600">₱{selectedInvoice?.amount_due?.toLocaleString()}.00</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card Terminal">Card Terminal</SelectItem>
                  <SelectItem value="Direct GCash Transfer">Direct GCash Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
            <Button onClick={() => verifyPayment(selectedInvoice.id, paymentMethod)} className="bg-emerald-600 hover:bg-emerald-700">
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
