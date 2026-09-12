import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { UploadCloud, CheckCircle2, PhilippinePeso, Building2, QrCode, Calendar, Clock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function PatientBilling() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) fetchInvoices();
  }, [user]);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, branch:branches(id, branch_name)')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setInvoices(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoice || !file) {
      toast.error('Please select an invoice or monthly installment and upload a receipt image.');
      return;
    }

    try {
      setSubmitting(true);
      
      // Upload the file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `payments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error("Failed to upload image to storage.");
      }

      const { data: publicUrlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      const receiptUrl = publicUrlData.publicUrl;

      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'pending_verification',
          receipt_url: receiptUrl,
          payment_method: 'Centralized QR'
        })
        .eq('id', selectedInvoice);
      
      if (error) throw error;
      
      toast.success('Monthly installment receipt uploaded successfully!', {
        description: 'Our branch reception staff will verify your payment shortly.',
      });
      
      setFile(null);
      setSelectedInvoice("");
      fetchInvoices();
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload receipt.');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingInvoices = invoices.filter(i => i.status === 'pending');
  const historyInvoices = invoices.filter(i => i.status !== 'pending');

  // Group active installment plans for progress display
  const installmentPlansSummary = useMemo(() => {
    const plans = {};
    invoices.forEach(inv => {
      const isInstallment = (inv.total_installments && inv.total_installments > 1) || (inv.procedure_name && (inv.procedure_name.includes("Month ") || inv.procedure_name.includes("Downpayment")));
      if (isInstallment) {
        // Base procedure name
        const baseName = inv.procedure_name.replace(/\s*\((Month \d+ of \d+|Downpayment)\)/, '').trim();
        const planKey = inv.parent_plan_id || baseName;
        if (!plans[planKey]) {
          plans[planKey] = {
            name: baseName,
            branch: inv.branch?.branch_name || 'Pasig',
            totalInstallments: inv.total_installments || 6,
            totalAmount: 0,
            paidAmount: 0,
            paidCount: 0,
            pendingCount: 0,
            nextDueInvoice: null
          };
        }
        plans[planKey].totalAmount += parseFloat(inv.amount_due || 0);
        if (inv.status === 'paid') {
          plans[planKey].paidAmount += parseFloat(inv.amount_due || 0);
          plans[planKey].paidCount += 1;
        } else {
          plans[planKey].pendingCount += 1;
          if (!plans[planKey].nextDueInvoice && inv.status === 'pending') {
            plans[planKey].nextDueInvoice = inv;
          }
        }
      }
    });
    return Object.values(plans);
  }, [invoices]);

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
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3 sm:pb-5 gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-950">Billing & Monthly Installments</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">Upload monthly payments for treatment installment plans or review payment history across all clinic branches.</p>
        </div>
      </div>

      {/* Active Installment Plans Tracker (if patient has ongoing plans) */}
      {installmentPlansSummary.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 sm:gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" /> Your Active Installment Plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {installmentPlansSummary.map((plan, idx) => {
              const progressPct = plan.totalAmount > 0 ? Math.round((plan.paidAmount / plan.totalAmount) * 100) : 0;
              return (
                <Card key={idx} className="border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-white shadow-2xs rounded-xl sm:rounded-2xl p-4 sm:p-5 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">{plan.name}</h3>
                      <Badge variant="outline" className="mt-1 text-[11px] sm:text-xs font-semibold bg-white text-indigo-700 border-indigo-200">
                        <Building2 className="w-3 h-3 mr-1 text-indigo-400" />
                        {plan.branch} Branch
                      </Badge>
                    </div>
                    <Badge className="bg-indigo-600 text-white font-bold text-xs shrink-0">
                      {progressPct}% Paid
                    </Badge>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5 mt-3 sm:mt-4 overflow-hidden">
                    <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }}></div>
                  </div>

                  <div className="flex justify-between items-center text-[11px] sm:text-xs mt-2.5 sm:mt-3 text-slate-600 font-medium">
                    <span>Paid: <strong className="text-emerald-700">₱{plan.paidAmount.toLocaleString()}.00</strong></span>
                    <span>Total: <strong>₱{plan.totalAmount.toLocaleString()}.00</strong></span>
                  </div>

                  {plan.nextDueInvoice && (
                    <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-slate-100 flex justify-between items-center text-[11px] sm:text-xs min-w-0">
                      <span className="text-slate-500 font-medium flex items-center gap-1 shrink-0">
                        <Clock className="w-3.5 h-3.5 text-amber-500" /> Next Due:
                      </span>
                      <span className="font-bold text-slate-900 truncate ml-2">
                        {plan.nextDueInvoice.procedure_name} (₱{plan.nextDueInvoice.amount_due?.toLocaleString()}.00)
                      </span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
        
        {/* Left Col: Centralized Payment Info */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          <Card className="shadow-2xs border-slate-200 text-center overflow-hidden h-full flex flex-col justify-center rounded-xl sm:rounded-2xl">
            <div className="bg-blue-600 p-3.5 sm:p-4 text-white">
              <QrCode className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-2" />
              <h3 className="font-bold text-base sm:text-lg">Monthly Installment Payments</h3>
              <p className="text-blue-100 text-xs sm:text-sm opacity-90">Scan to pay via GCash or Maya</p>
            </div>
            <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4 flex-1 flex flex-col justify-center px-3 sm:px-6">
              <div className="bg-white p-2 rounded-xl border-2 sm:border-4 border-slate-100 inline-block mx-auto">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TeethTalkClinicPayments" 
                  alt="Clinic QR Code" 
                  className="w-28 h-28 sm:w-36 sm:h-36 object-contain mx-auto"
                />
              </div>
              <div className="space-y-3 sm:space-y-4 px-1 sm:px-2">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Pay your monthly installment on or before your due date.
                </p>
                <div className="bg-blue-50 p-3 sm:p-4 rounded-xl border border-blue-100 text-left space-y-1">
                  <p className="text-xs text-blue-900 font-bold">
                    Automatic Branch Verification:
                  </p>
                  <p className="text-[11px] sm:text-xs text-blue-800 leading-relaxed">
                    Your monthly receipt is automatically routed to the reception team of the branch managing your treatment.
                  </p>
                </div>
                <div className="space-y-0.5 pt-1">
                  <p className="text-lg sm:text-xl font-bold tracking-tight text-slate-800">Teeth Talk Clinic</p>
                  <p className="text-xs sm:text-sm font-medium text-slate-500">GCash / Maya: 0917-123-4567</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Upload Form */}
        <div className="lg:col-span-2">
          <Card className="border-t-4 border-t-emerald-500 shadow-2xs h-full rounded-xl sm:rounded-2xl">
            <CardHeader className="bg-slate-50/50 border-b pb-3 sm:pb-4 p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <PhilippinePeso className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" /> Pay a Monthly Installment
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Select the monthly installment you are paying and upload your transaction receipt.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm text-slate-700 font-semibold">Select Due Installment / Invoice *</Label>
                  <Select value={selectedInvoice} onValueChange={setSelectedInvoice}>
                    <SelectTrigger className="w-full rounded-xl text-xs sm:text-sm">
                      <SelectValue placeholder="-- Select an installment to pay --" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[260px]">
                      {pendingInvoices.length === 0 && <SelectItem value="none" disabled>No pending installments</SelectItem>}
                      {pendingInvoices.map(inv => (
                        <SelectItem key={inv.id} value={inv.id} className="text-xs sm:text-sm">
                          {inv.procedure_name} - ₱{inv.amount_due?.toLocaleString()}.00 ({inv.branch?.branch_name || 'Pasig'} Branch)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm text-slate-700 font-semibold">Upload GCash / Maya Screenshot *</Label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 sm:p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                    <Input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      required
                    />
                    {file ? (
                      <div className="flex flex-col items-center gap-1.5 sm:gap-2 text-emerald-600">
                        <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8" />
                        <span className="font-semibold text-xs sm:text-sm break-all">{file.name} selected</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 sm:gap-2 text-slate-500">
                        <UploadCloud className="w-6 h-6 sm:w-8 sm:h-8 opacity-50" />
                        <span className="font-medium text-xs sm:text-sm">Click to browse or drag and drop</span>
                        <span className="text-[10px] sm:text-xs opacity-75">PNG, JPG up to 5MB</span>
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={submitting || !selectedInvoice || selectedInvoice === "none"} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-xl shadow-xs"
                >
                  {submitting ? 'Uploading...' : 'Submit Monthly Payment for Verification'}
                </Button>

              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="pt-4 sm:pt-6">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-800 border-b pb-2 mb-4 sm:mb-6">Installment & Payment History</h2>
        <Card className="shadow-2xs border-slate-200 overflow-hidden rounded-xl sm:rounded-2xl">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm min-w-[640px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] sm:text-xs uppercase text-slate-500 font-semibold">
                <tr>
                  <th className="px-3 sm:px-5 py-3 sm:py-4">Date</th>
                  <th className="px-3 sm:px-5 py-3 sm:py-4">Invoice ID</th>
                  <th className="px-3 sm:px-5 py-3 sm:py-4">Branch</th>
                  <th className="px-3 sm:px-5 py-3 sm:py-4">Procedure / Term</th>
                  <th className="px-3 sm:px-5 py-3 sm:py-4 font-mono text-right">Amount</th>
                  <th className="px-3 sm:px-5 py-3 sm:py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyInvoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs sm:text-sm">No historical invoices found.</td>
                  </tr>
                )}
                {historyInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 sm:px-5 py-3 sm:py-4 text-slate-600 font-medium whitespace-nowrap">
                      {new Date(inv.paid_at || inv.updated_at || inv.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4 font-mono text-slate-500 text-[11px] sm:text-xs">INV-{inv.id.substring(0,8).toUpperCase()}</td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
                      <Badge variant="outline" className="text-[10px] sm:text-xs font-semibold bg-slate-50 text-slate-700 border-slate-200">
                        <Building2 className="w-3 h-3 mr-1 text-slate-400" />
                        {inv.branch?.branch_name || 'Pasig'} Branch
                      </Badge>
                    </td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4 text-slate-800 font-medium">
                      {inv.procedure_name}
                      {getProcedureBadge(inv)}
                    </td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4 font-mono font-bold text-slate-900 text-right whitespace-nowrap">₱ {inv.amount_due?.toLocaleString()}.00</td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4 text-center whitespace-nowrap">
                      {inv.status === 'pending_verification' ? (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold text-[10px] sm:text-xs">Verifying</Badge>
                      ) : inv.status === 'paid' ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold text-[10px] sm:text-xs">Paid</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] sm:text-xs">{inv.status}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
