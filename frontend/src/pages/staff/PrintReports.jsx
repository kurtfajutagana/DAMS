import { useState, useEffect } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Printer, Download, Search, FileText, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

export default function PrintReports() {
  const [activeTab, setActiveTab] = useState("intake");
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [upperTeeth, setUpperTeeth] = useState([]);
  const [lowerTeeth, setLowerTeeth] = useState([]);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/staff/patients");
        const data = await res.json();
        setPatients(data || []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchPatients();
  }, []);

  const handleSelectPatient = async (id) => {
    setSelectedPatientId(id);
    try {
      const res = await fetch(`http://localhost:8000/api/staff/patients/${id}/full-record`);
      const data = await res.json();
      
      const p = data.profile || {};
      const pp = data.patient_profile || {};
      const mh = data.medical_history || {};
      const tc = data.tooth_conditions || [];

      setSelectedPatient({
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown",
        age: pp.date_of_birth ? new Date().getFullYear() - new Date(pp.date_of_birth).getFullYear() : "N/A",
        gender: pp.gender || "N/A",
        birthdate: pp.date_of_birth || "N/A",
        phone: p.contact_number || "N/A",
        address: pp.address || "N/A",
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
        dentist: "",
        extraction: pp.previous_extraction ? "Yes" : "No",
        prevDentist: pp.previous_dentist || "None",
        lastVisit: pp.last_dental_visit || "N/A",
        medicalAnswers: {
          q1: mh.q_good_health ? "Yes" : "No", 
          q2: mh.q_medical_treatment ? "Yes" : "No", 
          q2_detail: mh.q_medical_treatment_details || "", 
          q3: mh.q_surgical_operation ? "Yes" : "No", 
          q3_detail: mh.q_surgical_operation_details || "", 
          q4: mh.q_medication ? "Yes" : "No", 
          q4_detail: mh.q_medication_details || "", 
          q5: mh.q_tobacco ? "Yes" : "No",
          q6: mh.q_drugs_alcohol ? "Yes" : "No", 
          q7: mh.q_allergic ? "Yes" : "No", 
          q8: mh.bleeding_time ? "Yes" : "No", 
          q8_detail: mh.bleeding_time || "", 
          q9: mh.bleeding_time || "N/A",
          q10_preg: mh.q_pregnant ? "Yes" : "No", 
          q10_nurse: mh.q_nursing ? "Yes" : "No", 
          q10_pill: mh.q_birth_control ? "Yes" : "No"
        },
        diseases: mh.underlying_conditions ? Object.keys(mh.underlying_conditions).filter(k => mh.underlying_conditions[k]) : [],
        symptoms: []
      });

      const upper = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map(num => {
        const t = tc.find(x => parseInt(x.tooth_number) === num);
        let s = "";
        if (t) {
            if (t.status === "needs-attention") s = "D";
            else if (t.status === "missing") s = "M";
            else if (t.status === "treated") s = "F";
            else if (t.status === "healthy") s = "S";
        }
        return { num, status: s };
      });
      const lower = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(num => {
        const t = tc.find(x => parseInt(x.tooth_number) === num);
        let s = "";
        if (t) {
            if (t.status === "needs-attention") s = "D";
            else if (t.status === "missing") s = "M";
            else if (t.status === "treated") s = "F";
            else if (t.status === "healthy") s = "S";
        }
        return { num, status: s };
      });

      setUpperTeeth(upper);
      setLowerTeeth(lower);

    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Printable Area Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report, #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Print Reports & Forms</h1>
          <p className="text-slate-500 text-sm">Generate and print clinical records, intake sheets, and dental charts</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handlePrint} className="bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-600/10 gap-2">
            <Printer className="h-4 w-4" /> Print Document
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left column: Patient Selection Sidebar (No Print) */}
        <div className="lg:col-span-1 space-y-4 no-print">
          <Card className="border-none shadow-md bg-white rounded-2xl p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search patient..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-50/50 border-slate-200 text-xs rounded-xl" 
              />
            </div>
            <div className="space-y-2 h-[60vh] overflow-y-auto pr-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2">Active Patients</span>
              {patients
                .filter(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => handleSelectPatient(patient.id)}
                  className={`w-full text-left p-3 rounded-xl flex items-center gap-3 border transition-colors ${
                    selectedPatientId === patient.id 
                      ? "bg-red-50 text-red-600 border-red-100" 
                      : "bg-slate-50/50 hover:bg-slate-50 text-slate-700 border-slate-100"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                    selectedPatientId === patient.id ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400"
                  }`}>
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className={`font-semibold text-xs truncate ${selectedPatientId === patient.id ? "font-bold" : ""}`}>
                      {patient.first_name} {patient.last_name}
                    </h4>
                    <p className={`text-[10px] truncate ${selectedPatientId === patient.id ? "text-red-400" : "text-slate-400"}`}>
                      {patient.contact_number || "No contact"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column: Document Previews */}
        <div className="lg:col-span-3 space-y-6">
          {!selectedPatient ? (
            <Card className="border-none shadow-xl bg-white rounded-3xl p-10 flex flex-col items-center justify-center min-h-[60vh] text-center">
               <div className="h-16 w-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                 <FileText className="h-8 w-8" />
               </div>
               <h3 className="text-xl font-bold text-slate-800">No Patient Selected</h3>
               <p className="text-sm text-slate-500 max-w-sm mt-2">Select a patient from the sidebar to view and print their intake forms and dental charts.</p>
            </Card>
          ) : (
            <>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full no-print">
                <TabsList className="bg-slate-100/80 p-1 rounded-xl h-10 border border-slate-200/50">
                  <TabsTrigger value="intake" className="rounded-lg text-xs font-semibold px-6 data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm">Intake & Medical Form</TabsTrigger>
                  <TabsTrigger value="dental-chart" className="rounded-lg text-xs font-semibold px-6 data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm">Dental Tooth Chart</TabsTrigger>
                </TabsList>
              </Tabs>

          {/* Printable Container wrapper */}
          <Card id="printable-report" className="border-none shadow-xl bg-white rounded-3xl p-10 font-sans text-slate-800 border-t-8 border-red-600">
            {/* Document Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-red-600 uppercase">TeethTalk Dental Clinic</h2>
                <p className="text-xs text-slate-500 font-medium">123 Sixto Antonio Ave, Pasig | +63 917 123 4567</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded-full uppercase tracking-wider mb-2 no-print">Official Record</span>
                <p className="text-xs text-slate-400 font-semibold">DATE: {selectedPatient.date}</p>
              </div>
            </div>

            {/* PREVIEW 1: INTAKE & MEDICAL FORM */}
            {activeTab === "intake" ? (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* PATIENTS INFORMATION SECTION */}
                <div className="space-y-4">
                  <div className="bg-slate-900 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded">
                    Patients Information
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="col-span-2 border-b border-slate-200 pb-1.5">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Name</span>
                      <span className="font-bold text-slate-800">{selectedPatient.name}</span>
                    </div>
                    <div className="border-b border-slate-200 pb-1.5">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Birthdate</span>
                      <span className="font-semibold text-slate-700">{selectedPatient.birthdate}</span>
                    </div>
                    <div className="border-b border-slate-200 pb-1.5">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Gender</span>
                      <span className="font-semibold text-slate-700">{selectedPatient.gender}</span>
                    </div>
                    <div className="col-span-2 border-b border-slate-200 pb-1.5">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Home Address</span>
                      <span className="font-semibold text-slate-700">{selectedPatient.address}</span>
                    </div>
                    <div className="border-b border-slate-200 pb-1.5">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Phone</span>
                      <span className="font-semibold text-slate-700">{selectedPatient.phone}</span>
                    </div>
                    <div className="border-b border-slate-200 pb-1.5">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Age</span>
                      <span className="font-semibold text-slate-700">{selectedPatient.age}</span>
                    </div>
                  </div>
                </div>

                {/* DENTAL & MEDICAL HISTORY GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* DENTAL SECTION */}
                  <div className="space-y-4">
                    <div className="bg-slate-900 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded">
                      Dental History
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Previous Dentist:</span>
                        <span className="font-semibold text-slate-800">{selectedPatient.prevDentist}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Last Dental Visit:</span>
                        <span className="font-semibold text-slate-800">{selectedPatient.lastVisit}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Previous Extraction:</span>
                        <span className="font-semibold text-slate-800">{selectedPatient.extraction}</span>
                      </div>
                    </div>
                  </div>

                  {/* FOR MINORS */}
                  <div className="space-y-4">
                    <div className="bg-slate-900 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded">
                      For Minors
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Parent/Guardian:</span>
                        <span className="font-semibold text-slate-800">N/A</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Parent Occupation:</span>
                        <span className="font-semibold text-slate-800">N/A</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MEDICAL HISTORY TABLES */}
                <div className="space-y-4">
                  <div className="bg-slate-900 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded">
                    Medical History
                  </div>
                  <table className="w-full text-xs text-left border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-2 border-r border-slate-200 w-12 text-center">No.</th>
                        <th className="p-2 border-r border-slate-200">Question Details</th>
                        <th className="p-2 border-r border-slate-200 w-16 text-center">YES</th>
                        <th className="p-2 w-16 text-center">NO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { id: 1, text: "Are you in good health?", val: selectedPatient.medicalAnswers.q1 },
                        { id: 2, text: "Are you under medical treatment now?", val: selectedPatient.medicalAnswers.q2 },
                        { id: 3, text: "Have you ever had a serious illness or surgical operation?", val: selectedPatient.medicalAnswers.q3 },
                        { id: 4, text: "Have you ever been hospitalized?", val: selectedPatient.medicalAnswers.q4 },
                        { id: 5, text: "Are you taking any prescription/non-prescription medication?", val: selectedPatient.medicalAnswers.q5 }
                      ].map((row) => (
                        <tr key={row.id} className="border-b border-slate-200">
                          <td className="p-2 border-r border-slate-200 text-center font-semibold">{row.id}</td>
                          <td className="p-2 border-r border-slate-200">{row.text}</td>
                          <td className="p-2 border-r border-slate-200 text-center font-bold text-red-600">{row.val === "Yes" ? "✓" : ""}</td>
                          <td className="p-2 text-center font-bold text-slate-500">{row.val === "No" ? "✓" : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* SYSTEM CHECKS & CONDITIONS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
                  <div className="border border-slate-200 p-4 rounded-xl space-y-3">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1.5">Underlying Conditions</h4>
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      {["High Blood Pressure", "Low Blood Pressure", "Epilepsy/Convulsion", "Heart Disease", "Hay Fever/Allergies", "Asthma", "Diabetes", "Stroke"].map(item => (
                        <div key={item} className="flex items-center gap-2">
                          <input type="checkbox" checked={selectedPatient.diseases.includes(item)} readOnly className="h-3 w-3 accent-red-600 rounded" />
                          <span className={selectedPatient.diseases.includes(item) ? "font-semibold text-slate-800" : ""}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-slate-200 p-4 rounded-xl space-y-3">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1.5">Symptoms & Diagnosis</h4>
                    <div className="space-y-2 text-slate-600">
                      {["New and persistent cough", "Shortness of breath", "Fever", "NO SYMPTOMS"].map(item => (
                        <div key={item} className="flex items-center gap-2">
                          <input type="checkbox" checked={selectedPatient.symptoms.includes(item)} readOnly className="h-3 w-3 accent-red-600 rounded" />
                          <span className={selectedPatient.symptoms.includes(item) ? "font-semibold text-slate-800" : ""}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* SIGNATURE FIELDS */}
                <div className="grid grid-cols-2 gap-12 pt-12 text-xs">
                  <div className="text-center space-y-1">
                    <div className="border-b border-slate-800 font-bold py-1 text-slate-800">{selectedPatient.name}</div>
                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-semibold">Patient's Name & Signature</span>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="border-b border-slate-800 font-bold py-1 text-slate-800">{selectedPatient.date}</div>
                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-semibold">Date Signed</span>
                  </div>
                </div>
              </div>
            ) : (
              /* PREVIEW 2: DENTAL TOOTH CHART */
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* PATIENT MINI HEADER */}
                <div className="grid grid-cols-4 gap-4 border border-slate-200 bg-slate-50 p-4 rounded-xl text-xs font-semibold text-slate-700">
                  <div>Name: <span className="font-bold text-slate-900">{selectedPatient.name}</span></div>
                  <div>Age: <span className="font-bold text-slate-900">{selectedPatient.age}</span></div>
                  <div>Gender: <span className="font-bold text-slate-900">{selectedPatient.gender}</span></div>
                  <div>Date Examined: <span className="font-bold text-slate-900">{selectedPatient.date}</span></div>
                </div>

                <div className="text-center">
                  <h3 className="text-sm font-black tracking-wider uppercase text-slate-800 pb-2 border-b border-slate-100">INTRAORAL EXAMINATION</h3>
                </div>

                {/* TOOTH CHART REPRESENTATION */}
                <div className="space-y-6 border border-slate-200 p-6 rounded-2xl">
                  {/* UPPER ARCH */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">UPPER ARCH</span>
                    <div className="grid gap-1 border-b border-slate-100 pb-3" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
                      {upperTeeth.map((tooth) => (
                        <div key={tooth.num} className="text-center">
                          <span className="text-[9px] font-bold text-slate-400 block">{tooth.num}</span>
                          <div className={`h-8 w-full border border-slate-300 rounded flex items-center justify-center font-black text-xs ${tooth.status ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-400'}`}>
                            {tooth.status || "-"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* LOWER ARCH */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">LOWER ARCH</span>
                    <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
                      {lowerTeeth.map((tooth) => (
                        <div key={tooth.num} className="text-center">
                          <span className="text-[9px] font-bold text-slate-400 block">{tooth.num}</span>
                          <div className={`h-8 w-full border border-slate-300 rounded flex items-center justify-center font-black text-xs ${tooth.status ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-400'}`}>
                            {tooth.status || "-"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* LEGEND SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[10px] text-slate-600 border border-slate-200 p-4 rounded-xl">
                  <div>
                    <h5 className="font-bold uppercase tracking-wider text-slate-800 mb-1 border-b pb-1">Conditions</h5>
                    <ul className="space-y-0.5">
                      <li><strong>/</strong> - Present Teeth</li>
                      <li><strong>D</strong> - Decayed (Caries)</li>
                      <li><strong>M</strong> - Missing due to Caries</li>
                      <li><strong>MO</strong> - Missing due to Other Causes</li>
                      <li><strong>Im</strong> - Impacted Tooth</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-bold uppercase tracking-wider text-slate-800 mb-1 border-b pb-1">Restorations</h5>
                    <ul className="space-y-0.5">
                      <li><strong>Am</strong> - Amalgam Filling</li>
                      <li><strong>Co</strong> - Composite Filling</li>
                      <li><strong>JC</strong> - Jacket Crown</li>
                      <li><strong>Ab</strong> - Abutment</li>
                      <li><strong>P</strong> - Pontic</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-bold uppercase tracking-wider text-slate-800 mb-1 border-b pb-1">Surgery / X-Ray</h5>
                    <ul className="space-y-0.5">
                      <li><strong>X</strong> - Extraction due to Caries</li>
                      <li><strong>XO</strong> - Extraction due to Other Causes</li>
                      <li><strong>Rx</strong> - Periapical X-Ray Taken</li>
                      <li><strong>Pan</strong> - Panoramic X-Ray Taken</li>
                    </ul>
                  </div>
                </div>

                {/* CHECKLIST FIELDS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[9px] leading-relaxed">
                  <div className="border p-3 rounded-lg">
                    <h6 className="font-bold text-slate-800 border-b pb-1 mb-1 uppercase">Periodontal Screening</h6>
                    <ul>
                      <li>[ ] Gingivitis</li>
                      <li>[ ] Early Periodontitis</li>
                      <li>[ ] Moderate Periodontitis</li>
                      <li>[ ] Advanced Periodontitis</li>
                    </ul>
                  </div>
                  <div className="border p-3 rounded-lg">
                    <h6 className="font-bold text-slate-800 border-b pb-1 mb-1 uppercase">Occlusion</h6>
                    <ul>
                      <li>Class (Molar): Normal</li>
                      <li>Overjet: Normal</li>
                      <li>Overbite: Normal</li>
                      <li>Midline Deviation: None</li>
                    </ul>
                  </div>
                  <div className="border p-3 rounded-lg">
                    <h6 className="font-bold text-slate-800 border-b pb-1 mb-1 uppercase">Appliances</h6>
                    <ul>
                      <li>[ ] Orthodontic</li>
                      <li>[ ] Stayplate</li>
                      <li>[ ] Others</li>
                    </ul>
                  </div>
                  <div className="border p-3 rounded-lg">
                    <h6 className="font-bold text-slate-800 border-b pb-1 mb-1 uppercase">TMD</h6>
                    <ul>
                      <li>[ ] Clenching</li>
                      <li>[ ] Clicking</li>
                      <li>[ ] Trismus</li>
                      <li>[ ] Muscle Spasm</li>
                    </ul>
                  </div>
                </div>

                {/* SIGNATURE FIELDS */}
                <div className="grid grid-cols-2 gap-12 pt-12 text-xs">
                  <div className="text-center space-y-1">
                    <div className="border-b border-slate-800 font-bold py-1 text-slate-800">{selectedPatient.dentist}</div>
                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-semibold">Attending Dentist's Signature</span>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="border-b border-slate-800 font-bold py-1 text-slate-800">{selectedPatient.date}</div>
                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-semibold">Date Signed</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
