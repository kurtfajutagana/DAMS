import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { UploadCloud, CheckCircle2, PhilippinePeso, Wallet, FileText, QrCode } from 'lucide-react';
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
        .select('*')
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
      toast.error('Please select an invoice and upload a receipt image.');
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
      
      toast.success('Receipt uploaded successfully!', {
        description: 'Our staff will verify your payment shortly.',
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Billing & Payments</h1>
        <p className="text-slate-500 mt-1">Settle your exact outstanding balances via our centralized QR code.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Left Col: Centralized Payment Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm border-slate-200 text-center overflow-hidden">
            <div className="bg-blue-600 p-4 text-white">
              <QrCode className="w-8 h-8 mx-auto mb-2" />
              <h3 className="font-bold text-lg">Centralized QR Payment</h3>
              <p className="text-blue-100 text-sm opacity-90">Scan to pay via GCash or Maya</p>
            </div>
            <CardContent className="pt-6 pb-6 space-y-4">
              <div className="bg-white p-2 rounded-xl border-4 border-slate-100 inline-block">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TeethTalkClinicPayments" 
                  alt="Clinic QR Code" 
                  className="w-40 h-40 object-contain mx-auto"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-bold tracking-tight text-slate-800">Teeth Talk Clinic</p>
                <p className="text-sm font-medium text-slate-500">Acct No: 0917-123-4567</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Upload Form */}
        <div className="lg:col-span-2">
          <Card className="border-t-4 border-t-emerald-500 shadow-md h-full">
            <CardHeader className="bg-slate-50/50 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <PhilippinePeso className="w-5 h-5 text-emerald-600" /> Settle an Invoice
              </CardTitle>
              <CardDescription>Select an unpaid invoice and upload your transaction receipt.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold">Select Pending Invoice</Label>
                  <Select value={selectedInvoice} onValueChange={setSelectedInvoice}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="-- Select an exact bill --" />
                    </SelectTrigger>
                    <SelectContent>
                      {pendingInvoices.length === 0 && <SelectItem value="none" disabled>No pending invoices</SelectItem>}
                      {pendingInvoices.map(inv => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.procedure_name} - ₱{inv.amount_due.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold">Upload Transaction Screenshot</Label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                    <Input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      required
                    />
                    {file ? (
                      <div className="flex flex-col items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="w-8 h-8" />
                        <span className="font-semibold">{file.name} selected</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-500">
                        <UploadCloud className="w-8 h-8 opacity-50" />
                        <span className="font-medium text-sm">Click to browse or drag and drop</span>
                        <span className="text-xs opacity-75">PNG, JPG up to 5MB</span>
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={submitting || !selectedInvoice || selectedInvoice === "none"} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg"
                >
                  {submitting ? 'Uploading...' : 'Submit Payment for Verification'}
                </Button>

              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="pt-8">
        <h2 className="text-xl font-semibold text-slate-800 border-b pb-2 mb-6">Invoicing History</h2>
        <Card className="shadow-sm border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                <tr>
                  <th className="px-5 py-4">Date Generated</th>
                  <th className="px-5 py-4">Invoice ID</th>
                  <th className="px-5 py-4">Procedure</th>
                  <th className="px-5 py-4 font-mono text-right">Amount Due</th>
                  <th className="px-5 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyInvoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">No historical invoices found.</td>
                  </tr>
                )}
                {historyInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 text-slate-600 font-medium">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-500 text-xs">INV-{inv.id.substring(0,8).toUpperCase()}</td>
                    <td className="px-5 py-4 text-slate-800">{inv.procedure_name}</td>
                    <td className="px-5 py-4 font-mono font-semibold text-slate-900 text-right">₱ {inv.amount_due.toLocaleString()}.00</td>
                    <td className="px-5 py-4 text-center">
                      {inv.status === 'pending_verification' ? (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">Verifying</Badge>
                      ) : inv.status === 'paid' ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Paid</Badge>
                      ) : (
                        <Badge variant="outline">{inv.status}</Badge>
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
