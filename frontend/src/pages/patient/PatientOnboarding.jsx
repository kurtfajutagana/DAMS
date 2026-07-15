import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { toast } from "sonner";
import { ClipboardList, Stethoscope, Activity, CheckCircle2 } from "lucide-react";

export default function PatientOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Step 1: Demographics
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");

  // Step 2: General Health
  const [qGoodHealth, setQGoodHealth] = useState(true);
  const [qMedicalTreatment, setQMedicalTreatment] = useState(false);
  const [qSurgicalOperation, setQSurgicalOperation] = useState(false);
  const [qHospitalized, setQHospitalized] = useState(false);

  // Step 3: Medical Answers, Conditions and Allergies
  const [medicalAnswers, setMedicalAnswers] = useState({
    q0: "yes", q1: "no", q1_detail: "", q2: "no", q2_detail: "", q3: "no", q3_detail: "",
    q4: "no", q4_detail: "", q5: "no", q6: "no", q7: "no", q8: "", q9_preg: "no", q9_nurse: "no", q9_pill: "no"
  });

  const [conditions, setConditions] = useState({
    "High Blood Pressure": false, "Low Blood Pressure": false, "Epilepsy/Convulsion": false,
    "AID or HIV Infection": false, "Sexually Transmitted Disease": false, "Fainting Seizure": false,
    "Rapid Weight Loss": false, "Radiation Therapy": false, "Joint Replacement/Implant": false,
    "Heart Surgery": false, "Heart Attack": false, "Thyroid Problems": false, "Heart Disease": false,
    "Heart Murmur": false, "Hepatitis/Liver Disease": false, "Rheumatic Heart Fever": false,
    "Hay Fever/Allergies": false, "Respiratory Problems": false, "Hepatitis/Jaundice": false,
    "Tuberculosis": false, "Swollen Ankles": false, "Kidney Disease": false, "Diabetes": false,
    "Chest Pain": false, "Stroke": false, "Cancer/Tumor": false, "Anemia": false, "Angina": false,
    "Asthma": false, "Emphysema": false, "Bleeding Problems": false, "Blood Diseases": false,
    "Head Injuries": false, "Arthritis/Rheumatism": false, "Stomach Troubles/Ulcers": false,
    "Others": false, "others_detail": ""
  });

  const [symptoms, setSymptoms] = useState({
    "New and persistent cough": false, "Shortness of Breath or difficulty in breathing": false,
    "Fever": false, "NO SYMPTOMS": false
  });

  const [allergies, setAllergies] = useState({
    "Local Anesthetics": false, "Lidocaine": false, "Penicillin": false, "Antibiotics": false,
    "Sulfa Drugs": false, "Aspirin": false, "Latex": false, "Others": false, "others_detail": ""
  });

  const handleNext = () => setStep((s) => s + 1);
  const handlePrev = () => setStep((s) => s - 1);

  const handleMedicalChange = (field, value) => {
    setMedicalAnswers(prev => ({ ...prev, [field]: value }));
  };

  const toggleCondition = (key) => setConditions((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleAllergy = (key) => setAllergies((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleSymptom = (symptom) => {
    if (symptom === "NO SYMPTOMS") {
      setSymptoms({ "New and persistent cough": false, "Shortness of Breath or difficulty in breathing": false, "Fever": false, "NO SYMPTOMS": !symptoms["NO SYMPTOMS"] });
    } else {
      setSymptoms(prev => ({ ...prev, [symptom]: !prev[symptom], "NO SYMPTOMS": false }));
    }
  };

  useEffect(() => {
    if (!user) return;
    const loadExistingData = async () => {
      try {
        const { data: ppData } = await supabase.from("patient_profiles").select("date_of_birth, gender").eq("patient_id", user.id).single();
        if (ppData) {
          if (ppData.date_of_birth) setDob(ppData.date_of_birth);
          if (ppData.gender) setGender(ppData.gender);
        }
        const { data: mhData } = await supabase.from("medical_histories").select("*").eq("patient_id", user.id).single();
        if (mhData) {
          setIsEditMode(true);
          setMedicalAnswers({
            q0: mhData.q_good_health ? "yes" : "no",
            q1: mhData.q_medical_treatment ? "yes" : "no", q1_detail: mhData.q_medical_treatment_details || "",
            q2: mhData.q_surgical_operation ? "yes" : "no", q2_detail: mhData.q_surgical_operation_details || "",
            q3: mhData.q_hospitalized ? "yes" : "no", q3_detail: mhData.q_hospitalized_details || "",
            q4: mhData.q_medication ? "yes" : "no", q4_detail: mhData.q_medication_details || "",
            q5: mhData.q_tobacco ? "yes" : "no",
            q6: mhData.q_drugs_alcohol ? "yes" : "no",
            q7: mhData.q_allergic ? "yes" : "no",
            q8: mhData.bleeding_time || "",
            q9_preg: mhData.q_pregnant ? "yes" : "no",
            q9_nurse: mhData.q_nursing ? "yes" : "no",
            q9_pill: mhData.q_birth_control ? "yes" : "no",
          });
          if (mhData.underlying_conditions) {
            setConditions(prev => ({ ...prev, ...mhData.underlying_conditions }));
            setSymptoms(prev => ({ ...prev, ...mhData.underlying_conditions })); // symptoms were saved here too
          }
          if (mhData.allergies) setAllergies(prev => ({ ...prev, ...mhData.allergies }));
        }
      } catch (e) {
        console.error("Error loading existing medical history", e);
      }
    };
    loadExistingData();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      // 1. Upsert Patient Profile for DOB and Gender
      const { error: ppError } = await supabase
        .from("patient_profiles")
        .upsert({
          patient_id: user.id,
          date_of_birth: dob,
          gender: gender,
        });
      
      if (ppError) throw ppError;

      // 2. Upsert Medical History
      const { error: mhError } = await supabase
        .from("medical_histories")
        .upsert({
          patient_id: user.id,
          q_good_health: medicalAnswers.q0 === "yes",
          q_medical_treatment: medicalAnswers.q1 === "yes",
          q_medical_treatment_details: medicalAnswers.q1_detail,
          q_surgical_operation: medicalAnswers.q2 === "yes",
          q_surgical_operation_details: medicalAnswers.q2_detail,
          q_hospitalized: medicalAnswers.q3 === "yes",
          q_hospitalized_details: medicalAnswers.q3_detail,
          q_medication: medicalAnswers.q4 === "yes",
          q_medication_details: medicalAnswers.q4_detail,
          q_tobacco: medicalAnswers.q5 === "yes",
          q_drugs_alcohol: medicalAnswers.q6 === "yes",
          q_allergic: medicalAnswers.q7 === "yes",
          bleeding_time: medicalAnswers.q8,
          q_pregnant: medicalAnswers.q9_preg === "yes",
          q_nursing: medicalAnswers.q9_nurse === "yes",
          q_birth_control: medicalAnswers.q9_pill === "yes",
          underlying_conditions: { ...conditions, ...symptoms },
          allergies: allergies,
        }, { onConflict: 'patient_id' });

      if (mhError) throw mhError;

      toast.success("Medical profile setup complete!");
      // Send them to the dashboard, preserving the context so layout re-renders properly
      navigate("/patient/dashboard", { replace: true });
      window.location.reload(); // Quick refresh to clear interceptor cache

    } catch (err) {
      console.error(err);
      toast.error("Failed to save medical history: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{isEditMode ? "Update Medical History" : "Welcome to Teeth Talk"}</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            {isEditMode ? "Please update your medical history to ensure clinical accuracy for your upcoming treatments." : "Before you can access your dashboard, we need to collect your medical history. This ensures your safety during treatments."}
          </p>
        </div>

        <Card className="border-border/50 shadow-lg bg-white/70 backdrop-blur-xl">
          <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
            <CardHeader className="border-b border-border/40 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  {step === 1 && <><UserCircleIcon className="h-5 w-5 text-blue-500" /> Personal Details</>}
                  {step === 2 && <><Activity className="h-5 w-5 text-red-500" /> Medical History</>}
                </CardTitle>
                <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  Step {step} of 2
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={gender} onValueChange={setGender} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
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
                        {Object.keys(conditions).slice(0, 13).map(disease => (
                          <div key={disease} className="flex items-center gap-2 cursor-pointer" onClick={() => toggleCondition(disease)}>
                             <div className="w-3.5 h-3.5 border border-slate-600 flex items-center justify-center bg-white shrink-0">
                               {conditions[disease] && <span className="text-xs font-bold -mt-0.5">✓</span>}
                             </div>
                             <Label className="text-[13px] text-slate-700 cursor-pointer">{disease}</Label>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 space-y-2">
                        {Object.keys(conditions).slice(13, 26).map(disease => (
                          <div key={disease} className="flex items-center gap-2 cursor-pointer" onClick={() => toggleCondition(disease)}>
                             <div className="w-3.5 h-3.5 border border-slate-600 flex items-center justify-center bg-white shrink-0">
                               {conditions[disease] && <span className="text-xs font-bold -mt-0.5">✓</span>}
                             </div>
                             <Label className="text-[13px] text-slate-700 cursor-pointer">{disease}</Label>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 space-y-2">
                        {Object.keys(conditions).slice(26, Object.keys(conditions).length).filter(k => k !== "others_detail").map(disease => (
                          <div key={disease} className="flex items-center gap-2 cursor-pointer" onClick={() => toggleCondition(disease)}>
                             <div className="w-3.5 h-3.5 border border-slate-600 flex items-center justify-center bg-white shrink-0">
                               {conditions[disease] && <span className="text-xs font-bold -mt-0.5">✓</span>}
                             </div>
                             <Label className="text-[13px] text-slate-700 cursor-pointer">{disease}</Label>
                          </div>
                        ))}
                        {conditions["Others"] && (
                          <Input 
                            placeholder="Please specify..." 
                            value={conditions.others_detail || ""} 
                            onChange={(e) => setConditions(prev => ({ ...prev, others_detail: e.target.value }))} 
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

            </CardContent>
            
            <CardFooter className="flex justify-between border-t border-border/40 p-6 bg-slate-50/50">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrev}
                disabled={step === 1 || isSubmitting}
                className={step === 1 ? "opacity-0" : ""}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-white"
                disabled={isSubmitting}
              >
                {step === 2 ? (isSubmitting ? "Saving..." : isEditMode ? "Update Record" : "Complete Setup") : "Continue"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

// Simple icon for step 1
function UserCircleIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
    </svg>
  );
}
