import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { UserCircle, FileText, CheckCircle2 } from "lucide-react";

export default function PatientMyRecord() {
  const { user } = useAuth();
  
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [medicalHistory, setMedicalHistory] = useState(null);
  
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [personalInfo, setPersonalInfo] = useState({ firstName: "", lastName: "", dob: "", gender: "" });

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, contact_number")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          if (profile.contact_number) setPhone(profile.contact_number);
          setPersonalInfo(prev => ({ ...prev, firstName: profile.first_name, lastName: profile.last_name }));
        }

        const { data: patientProfile } = await supabase
          .from("patient_profiles")
          .select("address, date_of_birth, gender")
          .eq("patient_id", user.id)
          .single();
          
        if (patientProfile) {
          if (patientProfile.address) setAddress(patientProfile.address);
          setPersonalInfo(prev => ({ ...prev, dob: patientProfile.date_of_birth, gender: patientProfile.gender }));
        }

        const { data: mh } = await supabase
          .from("medical_histories")
          .select("*")
          .eq("patient_id", user.id)
          .single();
          
        if (mh) setMedicalHistory(mh);
        
      } catch (err) {
        console.error("Failed to fetch record:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    
    try {
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) throw emailError;
        toast.info("A confirmation email has been sent to your new and old email address to verify the change.");
      }

      // Use the backend to bypass RLS and safely update profile records
      const response = await fetch("http://localhost:8000/api/auth/update-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          contact_number: phone,
          address: address,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to update profile via backend.");
      }

      toast.success("Contact details updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update: " + err.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading your record...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Medical Record</h1>
        <p className="text-muted-foreground mt-1 text-sm">View your official clinical record and update your contact information.</p>
      </div>

      <Card className="border-border/40 shadow-sm">
        <form onSubmit={handleUpdateProfile}>
          <CardHeader className="bg-slate-50/50 border-b border-border/40 pb-4">
            <div className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </div>
            <CardDescription>
              Keep your contact details up to date. Changing your email requires verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={`${personalInfo.firstName} ${personalInfo.lastName}`} disabled className="bg-slate-50 cursor-not-allowed" />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input value={personalInfo.dob || "N/A"} disabled className="bg-slate-50 cursor-not-allowed" />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Input value={personalInfo.gender || "N/A"} disabled className="bg-slate-50 cursor-not-allowed" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Home Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter complete home address"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t border-border/40 py-4 flex justify-end">
            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isUpdatingProfile}
            >
              {isUpdatingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="border-border/40 shadow-sm opacity-90">
        <CardHeader className="bg-slate-50/50 border-b border-border/40 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-500" />
              <CardTitle className="text-lg text-slate-700">Official Medical History</CardTitle>
            </div>
          </div>
          <CardDescription>
            This information is securely managed by the clinic. Please keep this up to date to ensure clinical accuracy for your upcoming treatments.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {!medicalHistory ? (
            <p className="text-sm text-slate-500 text-center py-4">No medical history on record.</p>
          ) : (
            <div className="space-y-6">
              
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1">General Health & Questionnaire</h3>
                <div className="grid grid-cols-1 gap-2 text-sm text-slate-600">
                  <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                    <span>1. Good Health?</span><span className="font-semibold text-slate-800">{medicalHistory.q_good_health ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                    <span>2. Under Medical Treatment?</span><span className="font-semibold text-slate-800">{medicalHistory.q_medical_treatment ? "Yes" : "No"}</span>
                  </div>
                  {medicalHistory.q_medical_treatment_details && <div className="pl-6 text-xs text-slate-500">- {medicalHistory.q_medical_treatment_details}</div>}
                  
                  <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                    <span>3. Serious Illness/Operation?</span><span className="font-semibold text-slate-800">{medicalHistory.q_surgical_operation ? "Yes" : "No"}</span>
                  </div>
                  {medicalHistory.q_surgical_operation_details && <div className="pl-6 text-xs text-slate-500">- {medicalHistory.q_surgical_operation_details}</div>}
                  
                  <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                    <span>4. Hospitalized?</span><span className="font-semibold text-slate-800">{medicalHistory.q_hospitalized ? "Yes" : "No"}</span>
                  </div>
                  {medicalHistory.q_hospitalized_details && <div className="pl-6 text-xs text-slate-500">- {medicalHistory.q_hospitalized_details}</div>}
                  
                  <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                    <span>5. Taking Medications?</span><span className="font-semibold text-slate-800">{medicalHistory.q_medication ? "Yes" : "No"}</span>
                  </div>
                  {medicalHistory.q_medication_details && <div className="pl-6 text-xs text-slate-500">- {medicalHistory.q_medication_details}</div>}
                  
                  <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                    <span>6. Tobacco Products?</span><span className="font-semibold text-slate-800">{medicalHistory.q_tobacco ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                    <span>7. Alcohol/Drugs?</span><span className="font-semibold text-slate-800">{medicalHistory.q_drugs_alcohol ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                    <span>8. Bleeding Time:</span><span className="font-semibold text-slate-800">{medicalHistory.bleeding_time || "None"}</span>
                  </div>
                  
                  <div className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-500 pl-3">For WOMEN Only:</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="flex justify-between p-3 bg-slate-50 rounded-lg"><span>Pregnant?</span><span className="font-semibold text-slate-800">{medicalHistory.q_pregnant ? "Yes" : "No"}</span></div>
                    <div className="flex justify-between p-3 bg-slate-50 rounded-lg"><span>Nursing?</span><span className="font-semibold text-slate-800">{medicalHistory.q_nursing ? "Yes" : "No"}</span></div>
                    <div className="flex justify-between p-3 bg-slate-50 rounded-lg"><span>Birth control?</span><span className="font-semibold text-slate-800">{medicalHistory.q_birth_control ? "Yes" : "No"}</span></div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1">Underlying Conditions & Symptoms</h3>
                {(() => {
                  const conds = Array.isArray(medicalHistory.underlying_conditions) 
                    ? medicalHistory.underlying_conditions 
                    : Object.keys(medicalHistory.underlying_conditions || {}).filter(k => k !== "others_detail" && medicalHistory.underlying_conditions[k]);
                  const othersDetail = medicalHistory.underlying_conditions?.others_detail;
                  
                  if (conds.length > 0 || othersDetail) {
                    return (
                      <div className="flex flex-wrap gap-2">
                        {conds.map(condition => (
                          <div key={condition} className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-red-100">
                            <CheckCircle2 className="h-3 w-3" />
                            {condition}
                          </div>
                        ))}
                        {othersDetail && (
                          <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-red-100">
                            <CheckCircle2 className="h-3 w-3" />
                            Others: {othersDetail}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return <p className="text-sm text-slate-500 italic">No underlying conditions flagged.</p>;
                })()}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1">Allergies</h3>
                {medicalHistory.allergies && Object.keys(medicalHistory.allergies).some(k => k !== "others_detail" && medicalHistory.allergies[k]) ? (
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(medicalHistory.allergies)
                      .filter(k => k !== "others_detail" && medicalHistory.allergies[k])
                      .map(allergy => (
                        <div key={allergy} className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-orange-100">
                          <CheckCircle2 className="h-3 w-3" />
                          {allergy}
                        </div>
                    ))}
                    {medicalHistory.allergies.others_detail && (
                      <div className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-orange-100">
                        <CheckCircle2 className="h-3 w-3" />
                        Others: {medicalHistory.allergies.others_detail}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No allergies flagged.</p>
                )}
              </div>

            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
