import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { Pill, Calendar, Send, UserSearch, Stethoscope, AlertCircle } from 'lucide-react';

export default function StaffPrescription() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    patientId: '',
    medicationName: '',
    dosageInstructions: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: '',
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/staff/patients');
      const data = await res.json();
      setPatients(data);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to load patient list');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePatientSelect = (value) => {
    setFormData((prev) => ({ ...prev, patientId: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.patientId) {
      toast.error('Please select a patient first.');
      return;
    }
    if (!formData.medicationName || !formData.dosageInstructions || !formData.endDate) {
      toast.error('Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        patient_id: formData.patientId,
        dentist_id: user?.id, // Assuming current staff/admin is the dentist. In a real scenario, this might need an override.
        medication_name: formData.medicationName,
        dosage_instructions: formData.dosageInstructions,
        start_date: new Date(formData.startDate).toISOString(),
        end_date: new Date(formData.endDate).toISOString(),
        notes: formData.notes
      };

      const res = await fetch('http://localhost:8000/api/staff/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || 'Failed');
      
      toast.success('Prescription generated successfully!');
      toast.info(`Automated Engine Scheduled ${data.reminders_scheduled} Reminders.`);
      
      // Reset form
      setFormData({
        patientId: '',
        medicationName: '',
        dosageInstructions: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        notes: '',
      });
      
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to issue prescription.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Issue Digital Prescription</h1>
        <p className="text-slate-500 mt-1">Generate a new medical script and schedule automated reminders.</p>
      </div>

      <Card className="border-t-4 border-t-red-600 shadow-md">
        <CardHeader className="bg-slate-50/50 border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 text-red-600 rounded-xl">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl">Prescription Details</CardTitle>
              <CardDescription>Fill out the medication and dosage instructions clearly.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Patient Selection */}
            <div className="space-y-2">
              <Label className="text-slate-700 flex items-center gap-2">
                <UserSearch className="w-4 h-4 text-slate-400" />
                Select Patient <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.patientId} onValueChange={handlePatientSelect} disabled={loading}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loading ? "Loading patients..." : "Search and select a patient"} />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} {p.contact_number ? `(${p.contact_number})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Medication Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-700 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-slate-400" />
                  Medication Name <span className="text-red-500">*</span>
                </Label>
                <Input 
                  name="medicationName" 
                  placeholder="e.g. Amoxicillin 500mg" 
                  value={formData.medicationName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-slate-400" />
                  Dosage Instructions <span className="text-red-500">*</span>
                </Label>
                <Input 
                  name="dosageInstructions" 
                  placeholder="e.g. Take 1 pill every 8 hours" 
                  value={formData.dosageInstructions}
                  onChange={handleChange}
                  required
                />
                <p className="text-[10px] text-slate-400">Our engine detects "every X hours" or "X times a day" to auto-schedule SMS reminders.</p>
              </div>
            </div>

            {/* Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Input 
                  type="date" 
                  name="startDate" 
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  End Date <span className="text-red-500">*</span>
                </Label>
                <Input 
                  type="date" 
                  name="endDate" 
                  value={formData.endDate}
                  onChange={handleChange}
                  min={formData.startDate}
                  required
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-slate-700">Special Clinical Notes (Optional)</Label>
              <textarea 
                name="notes"
                placeholder="Add any specific dietary warnings or side effects to watch out for..."
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="flex w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white gap-2 px-8">
                {submitting ? 'Processing...' : 'Digitally Sign & Issue'}
                <Send className="w-4 h-4" />
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
