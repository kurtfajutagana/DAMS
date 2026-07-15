import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ArrowLeft, CheckCircle2, ChevronRight, UserCheck, ShieldAlert, HeartPulse, Stethoscope, Building2 } from "lucide-react";
import { Checkbox } from "../../components/ui/checkbox";

const steps = [
  { id: 1, title: "Select Branch" },
  { id: 2, title: "Patient Information" },
  { id: 3, title: "Medical History" },
  { id: 4, title: "Preview" },
];

export default function StaffAddPatient() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedBranch, setSelectedBranch] = useState("Fairview");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [createdPatientId, setCreatedPatientId] = useState(null);
  
  const location = useLocation();
  const navigate = useNavigate();

  // Form States
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    nickname: "",
    birthdate: "",
    age: "",
    gender: "male",
    height: "",
    weight: "",
    address: "",
    phone: "",
    nationality: "",
    religion: "",
    occupation: "",
    parentName: "",
    parentOccupation: "",
    referrer: "",
    consultationReason: "",
    prevDentist: "",
    lastVisit: "",
    extraction: "no",
    email: "", // Added email field for account creation
  });

  const [medicalAnswers, setMedicalAnswers] = useState({
    q0: "yes", // good health
    q1: "no",  // under medical treatment
    q1_detail: "",
    q2: "no",  // surgical operation
    q2_detail: "",
    q3: "no",  // hospitalized
    q3_detail: "",
    q4: "no",  // medication
    q4_detail: "",
    q5: "no",  // Tobacco
    q6: "no",  // alcohol/drugs
    q7: "no",  // allergic
    q8: "", // bleeding time
    q9_preg: "no",
    q9_nurse: "no",
    q9_pill: "no"
  });

  const [allergies, setAllergies] = useState({
    "Local Anesthetics": false,
    "Lidocaine": false,
    "Penicillin": false,
    "Antibiotics": false,
    "Sulfate Drugs": false,
    "Aspirin": false,
    "Latex": false,
    "Others": false,
    "others_detail": ""
  });

  const [diseases, setDiseases] = useState({
    "High Blood Pressure": false,
    "Low Blood Pressure": false,
    "Epilepsy/Convulsion": false,
    "AID or HIV Infection": false,
    "Sexually Transmitted Disease": false,
    "Fainting Seizure": false,
    "Rapid Weight Loss": false,
    "Radiation Therapy": false,
    "Joint Replacement/Implant": false,
    "Heart Surgery": false,
    "Heart Attack": false,
    "Thyroid Problems": false,
    "Heart Disease": false,
    "Heart Murmur": false,
    "Hepatitis/Liver Disease": false,
    "Rheumatic Heart Fever": false,
    "Hay Fever/Allergies": false,
    "Respiratory Problems": false,
    "Hepatitis/Jaundice": false,
    "Tuberculosis": false,
    "Swollen Ankles": false,
    "Kidney Disease": false,
    "Diabetes": false,
    "Chest Pain": false,
    "Stroke": false,
    "Cancer/Tumor": false,
    "Anemia": false,
    "Angina": false,
    "Asthma": false,
    "Emphysema": false,
    "Bleeding Problems": false,
    "Blood Diseases": false,
    "Head Injuries": false,
    "Arthritis/Rheumatism": false,
    "Arthritis/Rheumatism": false,
    "Stomach Troubles/Ulcers": false,
    "Others": false,
    "others_detail": ""
  });

  const [symptoms, setSymptoms] = useState({
    "New and persistent cough": false,
    "Shortness of Breath or difficulty in breathing": false,
    "Fever": false,
    "NO SYMPTOMS": false
  });

  // Teeth Chart State: 1 to 32. T = Condition ('Sound', 'Decayed', 'Missing', 'Filled')
  const [teethChart, setTeethChart] = useState(
    Array.from({ length: 32 }, (_, i) => ({
      toothNumber: i + 1,
      condition: "Sound"
    }))
  );

  const handleInputChange = (field, value) => {
    if (field === "birthdate") {
      let age = "";
      if (value) {
        const today = new Date();
        const birthDate = new Date(value);
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
        age = calculatedAge > 0 ? calculatedAge.toString() : "0";
      }
      setFormData(prev => ({ ...prev, birthdate: value, age }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleMedicalChange = (field, value) => {
    setMedicalAnswers(prev => ({ ...prev, [field]: value }));
  };

  const toggleAllergy = (allergy) => {
    setAllergies(prev => ({ ...prev, [allergy]: !prev[allergy] }));
  };

  const toggleDisease = (disease) => {
    setDiseases(prev => ({ ...prev, [disease]: !prev[disease] }));
  };

  const toggleSymptom = (symptom) => {
    if (symptom === "NO SYMPTOMS") {
      setSymptoms({
        "New and persistent cough": false,
        "Shortness of Breath or difficulty in breathing": false,
        "Fever": false,
        "NO SYMPTOMS": !symptoms["NO SYMPTOMS"]
      });
    } else {
      setSymptoms(prev => ({ ...prev, [symptom]: !prev[symptom], "NO SYMPTOMS": false }));
    }
  };

  const cycleToothCondition = (toothNumber) => {
    const conditions = ["Sound", "Decayed", "Missing", "Filled"];
    setTeethChart(prev => prev.map(t => {
      if (t.toothNumber === toothNumber) {
        const nextIndex = (conditions.indexOf(t.condition) + 1) % conditions.length;
        return { ...t, condition: conditions[nextIndex] };
      }
      return t;
    }));
  };

  const getToothColor = (condition) => {
    switch (condition) {
      case "Decayed": return "bg-red-500 text-white border-red-600";
      case "Missing": return "bg-slate-400 text-white border-slate-500";
      case "Filled": return "bg-blue-500 text-white border-blue-600";
      case "Sound":
      default:
        return "bg-emerald-500 text-white border-emerald-600";
    }
  };

  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, 4));
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));
  const handleSubmitForm = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/staff/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formData,
          medicalAnswers,
          allergies,
          diseases: { ...diseases, ...symptoms },
          teethChart
        })
      });

      if (!response.ok) {
        throw new Error("Failed to create patient");
      }
      
      const data = await response.json();
      setCreatedPatientId(data.patient_id);
      setIsSubmitted(true);
    } catch (error) {
      console.error(error);
      alert("Error adding patient. Please check the logs.");
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in-95 duration-500 space-y-6">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center shadow-lg shadow-emerald-100/50">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 animate-bounce" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-slate-800">Record Created Successfully!</h3>
          <p className="text-slate-500 max-w-md">Patient record for <strong className="text-slate-800">{formData.firstName} {formData.lastName}</strong> has been saved under <strong>TeethTalk - {selectedBranch}</strong> branch.</p>
        </div>
        <div className="flex gap-4">
          {new URLSearchParams(location.search).get("walkin") === "true" ? (
            <Button onClick={() => navigate("/staff/queue", { state: { walkInPatientId: createdPatientId } })} className="bg-red-600 hover:bg-red-700 text-white px-8 rounded-xl shadow-lg shadow-red-600/10">
              Return to Queue
            </Button>
          ) : (
            <Button onClick={() => { setIsSubmitted(false); setCurrentStep(1); setCreatedPatientId(null); setFormData(prev => ({...prev, firstName:"", lastName:"", nickname:"", birthdate:"", age:"", email:""})) }} className="bg-red-600 hover:bg-red-700 text-white px-8 rounded-xl shadow-lg shadow-red-600/10">
              Add Another Record
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {currentStep > 1 && (
          <Button variant="outline" size="sm" className="h-8 gap-1 rounded-full px-4 border-slate-300 text-slate-600 hover:bg-slate-100" onClick={handleBack}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Add New Record</h1>
      </div>

      {/* Stepper */}
      <div className="px-4 py-4 mb-4">
        <div className="relative flex justify-between">
          <div className="absolute left-0 top-1/2 w-full h-[2px] bg-slate-200 -z-10 -translate-y-1/2"></div>
          {steps.map((step) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            return (
              <div key={step.id} className="flex flex-col items-center gap-2 bg-slate-50 px-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${isCompleted ? 'bg-red-600 text-white' : isCurrent ? 'bg-red-600 text-white scale-110 shadow-md shadow-red-600/20' : 'bg-slate-200 text-slate-500'}`}>
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : step.id}
                </div>
                <span className={`text-[10px] font-semibold tracking-wide uppercase transition-colors ${isCurrent ? 'text-red-600' : 'text-slate-400'}`}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm shadow-slate-200/50 rounded-2xl overflow-hidden">
        <CardContent className="p-8">
          
          {/* STEP 1: SELECT BRANCH */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center max-w-md mx-auto space-y-2 mb-8">
                <h3 className="text-lg font-bold text-slate-800">Assign Clinic Branch</h3>
                <p className="text-sm text-slate-500">Select which branch the patient is currently checking in for treatment.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { name: "Fairview", label: "TeethTalk - Fairview (Main)", address: "Fairview" },
                  { name: "Pasig", label: "TeethTalk - Pasig", address: "Pasig" },
                  { name: "San Juan", label: "TeethTalk - San Juan", address: "San Juan" }
                ].map((branch) => (
                  <div
                    key={branch.name}
                    onClick={() => setSelectedBranch(branch.name)}
                    className={`cursor-pointer p-6 rounded-2xl border-2 flex flex-col justify-between h-40 transition-all duration-300 ${selectedBranch === branch.name ? 'border-red-600 bg-red-50/20 shadow-md' : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`p-2.5 rounded-xl ${selectedBranch === branch.name ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Building2 className="h-5 w-5" />
                      </div>
                      {selectedBranch === branch.name && <CheckCircle2 className="h-5 w-5 text-red-600" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{branch.label}</h4>
                      <p className="text-xs text-slate-400 mt-1">{branch.address}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: PATIENT INFORMATION */}
          {currentStep === 2 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">First Name</Label>
                  <Input value={formData.firstName} onChange={(e) => handleInputChange("firstName", e.target.value)} className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Last Name</Label>
                  <Input value={formData.lastName} onChange={(e) => handleInputChange("lastName", e.target.value)} className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Nickname</Label>
                  <Input value={formData.nickname} onChange={(e) => handleInputChange("nickname", e.target.value)} className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Email Address (Optional)</Label>
                  <Input type="email" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} placeholder="For patient portal access" className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Birthdate</Label>
                  <Input type="date" value={formData.birthdate} onChange={(e) => handleInputChange("birthdate", e.target.value)} className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Age</Label>
                  <Input type="number" value={formData.age} readOnly placeholder="Auto" className="bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed focus-visible:ring-0 shadow-none" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Gender</Label>
                  <select value={formData.gender} onChange={(e) => handleInputChange("gender", e.target.value)} className="flex h-9 w-full rounded-md border border-slate-200 bg-slate-50/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500/20">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Height(cm)</Label>
                  <Input type="number" value={formData.height} onChange={(e) => handleInputChange("height", e.target.value)} className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Weight(kg)</Label>
                  <Input type="number" value={formData.weight} onChange={(e) => handleInputChange("weight", e.target.value)} className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Home Address</Label>
                  <Input value={formData.address} onChange={(e) => handleInputChange("address", e.target.value)} className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Phone Number</Label>
                  <Input value={formData.phone} onChange={(e) => handleInputChange("phone", e.target.value)} className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Nationality</Label>
                  <Input value={formData.nationality} onChange={(e) => handleInputChange("nationality", e.target.value)} className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Religion</Label>
                  <Input value={formData.religion} onChange={(e) => handleInputChange("religion", e.target.value)} className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Occupation</Label>
                  <Input value={formData.occupation} onChange={(e) => handleInputChange("occupation", e.target.value)} className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">For Minors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Parent/Guardian Name</Label>
                    <Input value={formData.parentName} onChange={(e) => handleInputChange("parentName", e.target.value)} placeholder="Enter parent or guardian name" className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Occupation</Label>
                    <Input value={formData.parentOccupation} onChange={(e) => handleInputChange("parentOccupation", e.target.value)} placeholder="Enter occupation" className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Whom may we thank for referring you?</Label>
                    <Input value={formData.referrer} onChange={(e) => handleInputChange("referrer", e.target.value)} placeholder="Referral name" className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">What is your reason for dental consultation?</Label>
                    <Input value={formData.consultationReason} onChange={(e) => handleInputChange("consultationReason", e.target.value)} placeholder="Reason for consultation" className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Dental History</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Previous Dentist</Label>
                    <Input value={formData.prevDentist} onChange={(e) => handleInputChange("prevDentist", e.target.value)} placeholder="Name of previous dentist" className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Last Dental Visit</Label>
                    <Input type="date" value={formData.lastVisit} onChange={(e) => handleInputChange("lastVisit", e.target.value)} className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Previous Extraction</Label>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center space-x-2">
                      <input type="radio" id="pe-yes" name="pe" value="yes" checked={formData.extraction === "yes"} onChange={() => handleInputChange("extraction", "yes")} className="h-4 w-4 text-red-600 border-slate-300 focus:ring-red-500" />
                      <Label htmlFor="pe-yes" className="font-normal cursor-pointer">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="radio" id="pe-no" name="pe" value="no" checked={formData.extraction === "no"} onChange={() => handleInputChange("extraction", "no")} className="h-4 w-4 text-red-600 border-slate-300 focus:ring-red-500" />
                      <Label htmlFor="pe-no" className="font-normal cursor-pointer">No</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: MEDICAL HISTORY */}
          {currentStep === 3 && (
             <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-0 border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 bg-slate-100 border-b border-slate-200">
                    <div className="flex-[5] p-3 border-r border-slate-200">MEDICAL HISTORY</div>
                    <div className="flex-1 p-3 text-center border-r border-slate-200">YES</div>
                    <div className="flex-1 p-3 text-center">NO</div>
                  </div>

                  {[
                    "Are you in good health?",
                    "Are you under medical treatment now?",
                    "Have you ever had a serious illness or surgical operation?",
                    "Have you ever been hospitalized?",
                    "Are you taking any prescription/non-prescription medication?",
                    "Do you use Tobacco products?",
                    "Do you use alcohol, cocaine or other dangerous drugs?"
                  ].map((question, i) => (
                    <div key={i} className="flex items-stretch border-b border-slate-200 last:border-0 hover:bg-slate-50/50">
                       <div className="flex-[5] p-3 border-r border-slate-200 flex gap-3">
                          <span className="font-semibold text-slate-700">{i+1}</span>
                          <div className="flex-1 space-y-2">
                            <Label className="text-sm text-slate-700">{question}</Label>
                            {i === 1 && <div className="flex items-end gap-2 mt-1"><span className="text-[13px] text-slate-600">- if yes, what is the condition being treated?</span><Input value={medicalAnswers.q1_detail} onChange={(e) => handleMedicalChange("q1_detail", e.target.value)} className="h-5 text-sm bg-transparent border-0 border-b border-slate-400 rounded-none focus-visible:ring-0 px-1 flex-1 shadow-none" /></div>}
                            {i === 2 && <div className="flex items-end gap-2 mt-1"><span className="text-[13px] text-slate-600">- if so, what illness or operation?</span><Input value={medicalAnswers.q2_detail} onChange={(e) => handleMedicalChange("q2_detail", e.target.value)} className="h-5 text-sm bg-transparent border-0 border-b border-slate-400 rounded-none focus-visible:ring-0 px-1 flex-1 shadow-none" /></div>}
                            {i === 3 && <div className="flex items-end gap-2 mt-1"><span className="text-[13px] text-slate-600">- if so, when and why?</span><Input value={medicalAnswers.q3_detail} onChange={(e) => handleMedicalChange("q3_detail", e.target.value)} className="h-5 text-sm bg-transparent border-0 border-b border-slate-400 rounded-none focus-visible:ring-0 px-1 flex-1 shadow-none" /></div>}
                            {i === 4 && <div className="flex items-end gap-2 mt-1"><span className="text-[13px] text-slate-600">- if so, please specify</span><Input value={medicalAnswers.q4_detail} onChange={(e) => handleMedicalChange("q4_detail", e.target.value)} className="h-5 text-sm bg-transparent border-0 border-b border-slate-400 rounded-none focus-visible:ring-0 px-1 flex-1 shadow-none" /></div>}
                          </div>
                       </div>
                       <div className="flex-1 flex items-center justify-center border-r border-slate-200 cursor-pointer" onClick={() => handleMedicalChange(`q${i}`, "yes")}>
                          {medicalAnswers[`q${i}`] === "yes" && <span className="text-lg font-bold text-slate-700">✓</span>}
                       </div>
                       <div className="flex-1 flex items-center justify-center cursor-pointer" onClick={() => handleMedicalChange(`q${i}`, "no")}>
                          {medicalAnswers[`q${i}`] === "no" && <span className="text-lg font-bold text-slate-700">✓</span>}
                       </div>
                    </div>
                  ))}

                  <div className="flex items-stretch border-b border-slate-200 hover:bg-slate-50/50">
                    <div className="flex-[5] p-3 border-r border-slate-200 flex gap-3">
                      <span className="font-semibold text-slate-700">8</span>
                      <div className="flex-1 space-y-2">
                        <Label className="text-sm text-slate-700">Are you allergic to any of the following:</Label>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 pl-1 mt-1">
                          {Object.keys(allergies).filter(k => k !== "others_detail").map(allergy => (
                            <div key={allergy} className="flex items-center gap-1.5 cursor-pointer" onClick={() => toggleAllergy(allergy)}>
                              <span className="text-slate-600">( {allergies[allergy] ? "✓" : "\u00A0\u00A0"} )</span>
                              <Label className="text-[13px] text-slate-700 cursor-pointer">{allergy}</Label>
                            </div>
                          ))}
                        </div>
                        {allergies["Others"] && <Input placeholder="If others, please specify" value={allergies.others_detail} onChange={(e) => setAllergies(prev => ({ ...prev, others_detail: e.target.value }))} className="h-5 text-sm bg-transparent border-0 border-b border-slate-400 rounded-none focus-visible:ring-0 px-1 w-full max-w-sm mt-2 shadow-none" />}
                      </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center border-r border-slate-200 cursor-pointer" onClick={() => handleMedicalChange("q7", "yes")}>
                      {medicalAnswers.q7 === "yes" && <span className="text-lg font-bold text-slate-700">✓</span>}
                    </div>
                    <div className="flex-1 flex items-center justify-center cursor-pointer" onClick={() => handleMedicalChange("q7", "no")}>
                      {medicalAnswers.q7 === "no" && <span className="text-lg font-bold text-slate-700">✓</span>}
                    </div>
                  </div>

                  <div className="flex items-stretch border-b border-slate-200 hover:bg-slate-50/50">
                    <div className="flex-[5] p-3 border-r border-slate-200 flex gap-3">
                      <span className="font-semibold text-slate-700">9</span>
                      <div className="flex-1 flex items-end gap-2">
                        <Label className="text-sm text-slate-700 whitespace-nowrap">Bleeding time</Label>
                        <Input value={medicalAnswers.q8} onChange={(e) => handleMedicalChange("q8", e.target.value)} className="h-5 text-sm bg-transparent border-0 border-b border-slate-400 rounded-none focus-visible:ring-0 px-1 flex-1 shadow-none" />
                      </div>
                    </div>
                    <div className="flex-1 border-r border-slate-200 bg-slate-50"></div>
                    <div className="flex-1 bg-slate-50"></div>
                  </div>

                  <div className="flex items-stretch border-slate-200 hover:bg-slate-50/50">
                    <div className="flex-[5] p-3 border-r border-slate-200 flex gap-3">
                      <span className="font-semibold text-slate-700">10</span>
                      <div className="flex-1 space-y-1">
                        <Label className="text-sm text-slate-700 block mb-2">for WOMEN only:</Label>
                        {[
                          { key: "q9_preg", label: "Are you pregnant?" },
                          { key: "q9_nurse", label: "Are you nursing?" },
                          { key: "q9_pill", label: "Are you taking birth control pills?" }
                        ].map((q) => (
                          <div key={q.key} className="flex items-center justify-between">
                            <Label className="text-[13px] text-slate-700 ml-4">{q.label}</Label>
                            <div className="flex gap-4 pr-10">
                              <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => handleMedicalChange(q.key, "yes")}>
                                <span className="text-slate-600 text-xs">Y( {medicalAnswers[q.key] === "yes" ? "✓" : "\u00A0\u00A0"} )</span>
                              </div>
                              <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => handleMedicalChange(q.key, "no")}>
                                <span className="text-slate-600 text-xs">N( {medicalAnswers[q.key] === "no" ? "✓" : "\u00A0\u00A0"} )</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 border-r border-slate-200"></div>
                    <div className="flex-1"></div>
                  </div>
                </div>

                <div className="space-y-4 pt-6 mt-6 border-t border-slate-200">
                  <Label className="text-sm text-slate-700 block">Do you have or have you had any of the following? Please check which apply.</Label>
                  <div className="border border-slate-300 bg-white grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-300">
                    <div className="p-4 space-y-2">
                      {Object.keys(diseases).slice(0, 13).map(disease => (
                        <div key={disease} className="flex items-center gap-2 cursor-pointer" onClick={() => toggleDisease(disease)}>
                           <div className="w-3.5 h-3.5 border border-slate-600 flex items-center justify-center bg-white shrink-0">
                             {diseases[disease] && <span className="text-xs font-bold -mt-0.5">✓</span>}
                           </div>
                           <Label className="text-[13px] text-slate-700 cursor-pointer">{disease}</Label>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 space-y-2">
                      {Object.keys(diseases).slice(13, 26).map(disease => (
                        <div key={disease} className="flex items-center gap-2 cursor-pointer" onClick={() => toggleDisease(disease)}>
                           <div className="w-3.5 h-3.5 border border-slate-600 flex items-center justify-center bg-white shrink-0">
                             {diseases[disease] && <span className="text-xs font-bold -mt-0.5">✓</span>}
                           </div>
                           <Label className="text-[13px] text-slate-700 cursor-pointer">{disease}</Label>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 space-y-2">
                      {Object.keys(diseases).slice(26, Object.keys(diseases).length).filter(k => k !== "others_detail").map(disease => (
                        <div key={disease} className="flex items-center gap-2 cursor-pointer" onClick={() => toggleDisease(disease)}>
                           <div className="w-3.5 h-3.5 border border-slate-600 flex items-center justify-center bg-white shrink-0">
                             {diseases[disease] && <span className="text-xs font-bold -mt-0.5">✓</span>}
                           </div>
                           <Label className="text-[13px] text-slate-700 cursor-pointer">{disease}</Label>
                        </div>
                      ))}
                      {diseases["Others"] && (
                        <Input 
                          placeholder="Please specify..." 
                          value={diseases.others_detail || ""} 
                          onChange={(e) => setDiseases(prev => ({ ...prev, others_detail: e.target.value }))} 
                          className="h-5 text-sm bg-transparent border-0 border-b border-slate-400 rounded-none focus-visible:ring-0 px-1 mt-2 w-full shadow-none" 
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <Label className="text-sm text-slate-700 block">Do you have any of these symptoms? Please put a check if yes.</Label>
                  <div className="space-y-2 pl-2">
                    {Object.keys(symptoms).map(symptom => (
                      <div key={symptom} className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSymptom(symptom)}>
                         <div className="w-3.5 h-3.5 border border-slate-600 flex items-center justify-center bg-white shrink-0">
                           {symptoms[symptom] && <span className="text-xs font-bold -mt-0.5 text-red-600">✓</span>}
                         </div>
                         <Label className={`text-[13px] cursor-pointer ${symptom === "NO SYMPTOMS" ? "uppercase font-bold text-slate-500" : "text-slate-700"}`}>
                           {symptom}
                         </Label>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
          )}

          {/* STEP 4: PREVIEW & REVIEW */}
          {currentStep === 4 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="text-center max-w-md mx-auto space-y-2 mb-6">
                <h3 className="text-lg font-bold text-slate-800">Review Patient Details</h3>
                <p className="text-sm text-slate-500">Confirm all information before registering this new record.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Side: General Profile Summary */}
                <div className="space-y-6">
                  <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50/50 space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <UserCheck className="h-5 w-5 text-red-600" />
                      <h4 className="font-bold text-slate-800 text-sm">Personal Profile</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Name</span>
                        <span className="font-semibold text-slate-800">{formData.firstName} {formData.lastName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Nickname</span>
                        <span className="font-semibold text-slate-800">{formData.nickname}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Email</span>
                        <span className="font-semibold text-slate-800">{formData.email || "No Email Provided"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Assigned Branch</span>
                        <span className="font-semibold text-slate-800">TeethTalk - {selectedBranch}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Contact</span>
                        <span className="font-semibold text-slate-800">{formData.phone}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Birthdate (Age)</span>
                        <span className="font-semibold text-slate-800">{formData.birthdate} ({formData.age} y/o)</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Address</span>
                        <span className="font-semibold text-slate-800">{formData.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50/50 space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <HeartPulse className="h-5 w-5 text-red-600" />
                      <h4 className="font-bold text-slate-800 text-sm">Dental History Summary</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Previous Dentist</span>
                        <span className="font-semibold text-slate-800">{formData.prevDentist || "None"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Last Visit</span>
                        <span className="font-semibold text-slate-800">{formData.lastVisit || "N/A"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block mb-0.5">Previous Extraction?</span>
                        <span className="font-semibold text-slate-800 capitalize">{formData.extraction}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Medical History Summary */}
                <div className="space-y-6">
                  <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50/50 space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <ShieldAlert className="h-5 w-5 text-red-600" />
                      <h4 className="font-bold text-slate-800 text-sm">Medical Alerts</h4>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-1 font-semibold uppercase tracking-wider">Allergies Detected</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {Object.keys(allergies).filter(k => allergies[k] && k !== "others_detail").map(k => (
                            <span key={k} className="px-2 py-1 bg-red-100 text-red-600 rounded-full font-medium">{k}</span>
                          ))}
                          {allergies["Others"] && <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full font-medium">{allergies.others_detail}</span>}
                          {Object.keys(allergies).filter(k => allergies[k]).length === 0 && <span className="text-slate-500 font-medium italic">No Allergies</span>}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-1 font-semibold uppercase tracking-wider">Underlying Conditions</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {Object.keys(diseases).filter(k => diseases[k]).map(k => (
                            <span key={k} className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">{k}</span>
                          ))}
                          {Object.keys(diseases).filter(k => diseases[k]).length === 0 && <span className="text-slate-500 font-medium italic">None Selected</span>}
                        </div>
                      </div>
                    </div>
                  </div>


                </div>
              </div>
            </div>
          )}

          {/* Stepper controls */}
          <div className="flex items-center justify-between mt-12 pt-6 border-t border-slate-100">
            {currentStep > 1 ? (
              <Button 
                variant="outline" 
                onClick={handleBack} 
                className="px-8 border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Back
              </Button>
            ) : (
              <div />
            )}
            {currentStep < 4 ? (
              <Button 
                onClick={handleNext}
                className="px-8 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md shadow-red-600/10 transition-colors"
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleSubmitForm}
                className="px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-md shadow-emerald-600/10 transition-colors"
              >
                Submit Record
              </Button>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
