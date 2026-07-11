import { useState } from "react";
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
  { id: 4, title: "Intraoral Examination" },
  { id: 5, title: "Preview" },
];

export default function StaffAddPatient() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedBranch, setSelectedBranch] = useState("Pasig");
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    name: "Juan Dela Cruz",
    nickname: "Juaning",
    birthdate: "1998-06-15",
    age: "28",
    gender: "male",
    height: "172",
    weight: "68",
    address: "Pasig Greenpark Village, Pasig City",
    phone: "09171234567",
    nationality: "Filipino",
    religion: "Catholic",
    occupation: "Software Engineer",
    parentName: "",
    parentOccupation: "",
    referrer: "Google Search",
    consultationReason: "Regular cleaning and check-up",
    prevDentist: "Dr. Santos",
    lastVisit: "2025-06-10",
    extraction: "no",
  });

  const [medicalAnswers, setMedicalAnswers] = useState({
    q0: "yes", // good health
    q1: "no",  // medical treatment
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
    q8: "1 minute", // bleeding time
    q9_preg: "no",
    q9_nurse: "no",
    q9_pill: "no"
  });

  const [allergies, setAllergies] = useState({
    "Local Anesthetics": false,
    "Lidocaine": false,
    "Penicillin": true,
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
    "Hay Fever/Allergies": true,
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
    "Asthma": true,
    "Emphysema": false,
    "Bleeding Problems": false,
    "Blood Diseases": false,
    "Head Injuries": false,
    "Arthritis/Rheumatism": false,
    "Stomach Troubles/Ulcers": false,
    "Others": false
  });

  // Teeth Chart State: 1 to 32. T = Condition ('Sound', 'Decayed', 'Missing', 'Filled')
  const [teethChart, setTeethChart] = useState(
    Array.from({ length: 32 }, (_, i) => ({
      toothNumber: i + 1,
      condition: "Sound"
    }))
  );

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, 5));
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));
  const handleSubmitForm = () => setIsSubmitted(true);

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in-95 duration-500 space-y-6">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center shadow-lg shadow-emerald-100/50">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 animate-bounce" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-slate-800">Record Created Successfully!</h3>
          <p className="text-slate-500 max-w-md">Patient record for <strong className="text-slate-800">{formData.name}</strong> has been saved under <strong>TeethTalk - {selectedBranch}</strong> branch.</p>
        </div>
        <Button onClick={() => { setIsSubmitted(false); setCurrentStep(1); }} className="bg-red-600 hover:bg-red-700 text-white px-8 rounded-xl shadow-lg shadow-red-600/10">
          Add Another Record
        </Button>
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
                  { name: "Pasig", label: "TeethTalk - Pasig (Main)", address: "123 Sixto Antonio Ave, Pasig" },
                  { name: "Makati", label: "TeethTalk - Makati", address: "456 Chino Roces Ave, Makati" },
                  { name: "Quezon", label: "TeethTalk - Quezon City", address: "789 Katipunan Ave, QC" }
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
                  <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Name</Label>
                  <Input value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Nickname</Label>
                  <Input value={formData.nickname} onChange={(e) => handleInputChange("nickname", e.target.value)} className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Birthdate</Label>
                  <Input type="date" value={formData.birthdate} onChange={(e) => handleInputChange("birthdate", e.target.value)} className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Age</Label>
                  <Input type="number" value={formData.age} onChange={(e) => handleInputChange("age", e.target.value)} className="bg-slate-50/50 border-slate-200 focus-visible:ring-red-500/20" />
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
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <div className="flex-1">No.</div>
                  <div className="flex-[4]">Questions</div>
                  <div className="flex-1 text-center">Choices</div>
                </div>

                <div className="space-y-6">
                  {[
                    "Are you in a good health?",
                    "Are you under medical treatment now?",
                    "Have you ever had a serious illness or surgical operation?",
                    "Have you ever been hospitalized?",
                    "Are you taking any prescription/non-prescription medication?",
                    "Do you use Tobacco products?",
                    "Do you use alcohol, cocaine or other dangerous drugs?"
                  ].map((question, i) => (
                    <div key={i} className="flex items-start gap-4 py-2 border-b border-slate-50 last:border-0">
                       <div className="w-8 pt-1 text-slate-400 font-medium text-sm">{i+1}</div>
                       <div className="flex-1 space-y-3">
                          <Label className="text-sm text-slate-700 leading-tight">{question}</Label>
                          {i === 1 && <Input placeholder="If yes, what is the condition being treated?" value={medicalAnswers.q1_detail} onChange={(e) => handleMedicalChange("q1_detail", e.target.value)} className="h-8 text-xs bg-slate-50/50" />}
                          {i === 2 && <Input placeholder="If so, what illness or operation?" value={medicalAnswers.q2_detail} onChange={(e) => handleMedicalChange("q2_detail", e.target.value)} className="h-8 text-xs bg-slate-50/50" />}
                          {i === 3 && <Input placeholder="If so, when and why?" value={medicalAnswers.q3_detail} onChange={(e) => handleMedicalChange("q3_detail", e.target.value)} className="h-8 text-xs bg-slate-50/50" />}
                          {i === 4 && <Input placeholder="If so, please specify?" value={medicalAnswers.q4_detail} onChange={(e) => handleMedicalChange("q4_detail", e.target.value)} className="h-8 text-xs bg-slate-50/50" />}
                       </div>
                       <div className="w-32 pt-1 flex justify-center">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center space-x-1.5">
                              <input type="radio" id={`q${i}-yes`} name={`q${i}`} value="yes" checked={medicalAnswers[`q${i}`] === "yes"} onChange={() => handleMedicalChange(`q${i}`, "yes")} className="h-3.5 w-3.5 text-red-600 border-slate-300 focus:ring-red-500" />
                              <Label htmlFor={`q${i}-yes`} className="font-normal text-xs cursor-pointer">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <input type="radio" id={`q${i}-no`} name={`q${i}`} value="no" checked={medicalAnswers[`q${i}`] === "no"} onChange={() => handleMedicalChange(`q${i}`, "no")} className="h-3.5 w-3.5 text-red-600 border-slate-300 focus:ring-red-500" />
                              <Label htmlFor={`q${i}-no`} className="font-normal text-xs cursor-pointer">No</Label>
                            </div>
                          </div>
                       </div>
                    </div>
                  ))}

                  <div className="flex items-start gap-4 py-2 border-b border-slate-50">
                    <div className="w-8 pt-1 text-slate-400 font-medium text-sm">8</div>
                    <div className="flex-1 space-y-4">
                      <Label className="text-sm text-slate-700 leading-tight">Are you allergic to any of the following:</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2">
                        {Object.keys(allergies).filter(k => k !== "others_detail").map(allergy => (
                           <div key={allergy} className="flex items-center space-x-2">
                             <Checkbox id={`al-${allergy}`} checked={allergies[allergy]} onCheckedChange={() => toggleAllergy(allergy)} className="border-slate-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" />
                             <Label htmlFor={`al-${allergy}`} className="text-xs font-normal text-slate-600 cursor-pointer">{allergy}</Label>
                           </div>
                        ))}
                      </div>
                      {allergies["Others"] && <Input placeholder="If others, please specify" value={allergies.others_detail} onChange={(e) => setAllergies(prev => ({ ...prev, others_detail: e.target.value }))} className="h-8 text-xs bg-slate-50/50 mt-2" />}
                    </div>
                    <div className="w-32 pt-1 flex justify-center">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center space-x-1.5">
                            <input type="radio" id="q7-yes" name="q7" value="yes" checked={medicalAnswers.q7 === "yes"} onChange={() => handleMedicalChange("q7", "yes")} className="h-3.5 w-3.5 text-red-600 border-slate-300 focus:ring-red-500" />
                            <Label htmlFor="q7-yes" className="font-normal text-xs cursor-pointer">Yes</Label>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <input type="radio" id="q7-no" name="q7" value="no" checked={medicalAnswers.q7 === "no"} onChange={() => handleMedicalChange("q7", "no")} className="h-3.5 w-3.5 text-red-600 border-slate-300 focus:ring-red-500" />
                            <Label htmlFor="q7-no" className="font-normal text-xs cursor-pointer">No</Label>
                          </div>
                        </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 py-2 border-b border-slate-50">
                    <div className="w-8 pt-1 text-slate-400 font-medium text-sm">9</div>
                    <div className="flex-1 space-y-3">
                      <Label className="text-sm text-slate-700 leading-tight">Bleeding Time</Label>
                      <Input placeholder="Indicate the time/date" value={medicalAnswers.q8} onChange={(e) => handleMedicalChange("q8", e.target.value)} className="h-8 text-xs bg-slate-50/50" />
                    </div>
                  </div>

                  <div className="flex items-start gap-4 py-2 border-b border-slate-50">
                    <div className="w-8 pt-1 text-slate-400 font-medium text-sm">10</div>
                    <div className="flex-1 space-y-4">
                      <Label className="text-sm text-slate-700 font-semibold uppercase tracking-wider">For WOMEN only:</Label>
                      <div className="space-y-3 pl-2">
                        {[
                          { key: "q9_preg", label: "Are you pregnant?" },
                          { key: "q9_nurse", label: "Are you nursing?" },
                          { key: "q9_pill", label: "Are you taking birth control pills?" }
                        ].map((q) => (
                          <div key={q.key} className="flex items-center justify-between max-w-sm">
                             <Label className="text-xs text-slate-600">{q.label}</Label>
                             <div className="flex items-center gap-4">
                              <div className="flex items-center space-x-1.5">
                                <input type="radio" id={`${q.key}-yes`} name={q.key} value="yes" checked={medicalAnswers[q.key] === "yes"} onChange={() => handleMedicalChange(q.key, "yes")} className="h-3.5 w-3.5 text-red-600 border-slate-300 focus:ring-red-500" />
                                <Label htmlFor={`${q.key}-yes`} className="font-normal text-xs cursor-pointer">Yes</Label>
                              </div>
                              <div className="flex items-center space-x-1.5">
                                <input type="radio" id={`${q.key}-no`} name={q.key} value="no" checked={medicalAnswers[q.key] === "no"} onChange={() => handleMedicalChange(q.key, "no")} className="h-3.5 w-3.5 text-red-600 border-slate-300 focus:ring-red-500" />
                                <Label htmlFor={`${q.key}-no`} className="font-normal text-xs cursor-pointer">No</Label>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <Label className="text-sm font-semibold text-slate-700 mb-4 block">Do you have or have you had any of the following? Please check which applies.</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                       {Object.keys(diseases).map(disease => (
                          <div key={disease} className="flex items-center space-x-2">
                             <Checkbox id={`ds-${disease}`} checked={diseases[disease]} onCheckedChange={() => toggleDisease(disease)} className="border-slate-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" />
                             <Label htmlFor={`ds-${disease}`} className="text-[11px] font-normal text-slate-600 cursor-pointer">{disease}</Label>
                           </div>
                       ))}
                    </div>
                  </div>

                </div>
             </div>
          )}

          {/* STEP 4: INTRAORAL EXAMINATION */}
          {currentStep === 4 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="text-center max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-bold text-slate-800">Intraoral Exam Chart</h3>
                <p className="text-sm text-slate-500">Tap on any tooth to toggle its state: Sound, Decayed, Missing, Filled.</p>
              </div>

              {/* Tooth Chart Legend */}
              <div className="flex flex-wrap items-center justify-center gap-6 py-2 border border-slate-100 bg-slate-50/50 rounded-xl max-w-lg mx-auto text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500"></div>
                  <span>Sound (S)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-red-500"></div>
                  <span>Decayed (D)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-slate-400"></div>
                  <span>Missing (M)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-blue-500"></div>
                  <span>Filled (F)</span>
                </div>
              </div>

              {/* Teeth Grid Upper (1-16) & Lower (17-32) */}
              <div className="space-y-6 max-w-xl mx-auto pt-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Upper Arch</h4>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
                    {teethChart.slice(0, 16).map(tooth => (
                      <button
                        key={tooth.toothNumber}
                        onClick={() => cycleToothCondition(tooth.toothNumber)}
                        className={`aspect-square rounded-xl border flex flex-col items-center justify-center font-bold text-xs p-1.5 transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm ${getToothColor(tooth.condition)}`}
                      >
                        <span className="text-[10px] opacity-75">{tooth.toothNumber}</span>
                        <span className="text-sm mt-0.5">{tooth.condition[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Lower Arch</h4>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
                    {teethChart.slice(16, 32).map(tooth => (
                      <button
                        key={tooth.toothNumber}
                        onClick={() => cycleToothCondition(tooth.toothNumber)}
                        className={`aspect-square rounded-xl border flex flex-col items-center justify-center font-bold text-xs p-1.5 transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm ${getToothColor(tooth.condition)}`}
                      >
                        <span className="text-[10px] opacity-75">{tooth.toothNumber}</span>
                        <span className="text-sm mt-0.5">{tooth.condition[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: PREVIEW & REVIEW */}
          {currentStep === 5 && (
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
                        <span className="font-semibold text-slate-800">{formData.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Nickname</span>
                        <span className="font-semibold text-slate-800">{formData.nickname}</span>
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

                  <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50/50 space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <Stethoscope className="h-5 w-5 text-red-600" />
                      <h4 className="font-bold text-slate-800 text-sm">Intraoral Examination Summary</h4>
                    </div>
                    <div className="space-y-2 text-xs text-slate-600">
                      <p>
                        Total Teeth Inspected: <strong>32</strong>
                      </p>
                      <div className="flex items-center gap-4 pt-1 font-semibold">
                        <span className="text-emerald-600">Sound: {teethChart.filter(t => t.condition === "Sound").length}</span>
                        <span className="text-red-500">Decayed: {teethChart.filter(t => t.condition === "Decayed").length}</span>
                        <span className="text-slate-500">Missing: {teethChart.filter(t => t.condition === "Missing").length}</span>
                        <span className="text-blue-500">Filled: {teethChart.filter(t => t.condition === "Filled").length}</span>
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
            {currentStep < 5 ? (
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
