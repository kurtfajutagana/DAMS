import { useState, useEffect } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Info, Check, RotateCcw, Activity, ShieldCheck, Stethoscope } from "lucide-react";

// Complete Legend definitions matching physical Intraoral Examination sheet
export const DENTAL_LEGENDS = {
  condition: [
    { code: "/", label: "Present Teeth", bg: "bg-emerald-100 text-emerald-800 border-emerald-300", description: "Tooth present and healthy" },
    { code: "D", label: "Decayed (Caries)", bg: "bg-rose-500 text-white border-rose-600", description: "Indicated for filling" },
    { code: "M", label: "Missing (Caries)", bg: "bg-slate-700 text-white border-slate-900", description: "Missing due to caries" },
    { code: "MO", label: "Missing (Other)", bg: "bg-slate-500 text-white border-slate-600", description: "Missing due to other causes" },
    { code: "Im", label: "Impacted Tooth", bg: "bg-purple-100 text-purple-800 border-purple-300", description: "Impacted in bone/gum" },
    { code: "Sp", label: "Supernumerary", bg: "bg-amber-100 text-amber-800 border-amber-300", description: "Extra tooth present" },
    { code: "Rf", label: "Root Fragment", bg: "bg-orange-100 text-orange-800 border-orange-300", description: "Remaining root fragment" },
    { code: "Un", label: "Unerupted", bg: "bg-sky-100 text-sky-800 border-sky-300", description: "Has not erupted yet" },
  ],
  restorations: [
    { code: "Am", label: "Amalgam Filling", bg: "bg-slate-300 text-slate-800 border-slate-400", description: "Silver amalgam restoration" },
    { code: "Co", label: "Composite Filling", bg: "bg-blue-500 text-white border-blue-600", description: "Tooth-colored composite" },
    { code: "JC", label: "Jacket Crown", bg: "bg-indigo-500 text-white border-indigo-600", description: "Full jacket crown" },
    { code: "Ab", label: "Abutment", bg: "bg-teal-100 text-teal-800 border-teal-300", description: "Bridge support tooth" },
    { code: "Att", label: "Attachment", bg: "bg-teal-50 text-teal-700 border-teal-200", description: "Precision attachment" },
    { code: "P", label: "Pontic", bg: "bg-cyan-500 text-white border-cyan-600", description: "Artificial bridge tooth" },
    { code: "In", label: "Inlay / Onlay", bg: "bg-blue-100 text-blue-800 border-blue-300", description: "Custom inlay or onlay" },
    { code: "Imp", label: "Implant", bg: "bg-emerald-600 text-white border-emerald-700", description: "Dental implant fixture" },
    { code: "S", label: "Sealant", bg: "bg-lime-100 text-lime-800 border-lime-300", description: "Pit and fissure sealant" },
    { code: "Rm", label: "Removable Denture", bg: "bg-violet-100 text-violet-800 border-violet-300", description: "Partial removable denture" },
  ],
  surgery: [
    { code: "X", label: "Extraction (Caries)", bg: "bg-red-700 text-white border-red-800", description: "Indicated extraction due to caries" },
    { code: "XO", label: "Extraction (Other)", bg: "bg-red-500 text-white border-red-600", description: "Indicated extraction due to other causes" },
  ]
};

// FDI Tooth Notation Groups
const UPPER_PRIMARY_RIGHT = [55, 54, 53, 52, 51];
const UPPER_PRIMARY_LEFT = [61, 62, 63, 64, 65];

const UPPER_PERMANENT_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_PERMANENT_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];

const LOWER_PERMANENT_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_PERMANENT_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];

const LOWER_PRIMARY_RIGHT = [85, 84, 83, 82, 81];
const LOWER_PRIMARY_LEFT = [71, 72, 73, 74, 75];

export default function InteractiveDentalChart({
  initialTeeth = {},
  initialScreening = {},
  onChange,
  readOnly = false
}) {
  const [teeth, setTeeth] = useState(initialTeeth || {});

  useEffect(() => {
    if (initialTeeth && Object.keys(initialTeeth).length > 0) {
      setTeeth(initialTeeth);
    }
  }, [initialTeeth]);

  const [screening, setScreening] = useState({
    periodontal: initialScreening?.periodontal || {},
    occlusion: initialScreening?.occlusion || {},
    appliances: initialScreening?.appliances || {},
    tmd: initialScreening?.tmd || {},
    xray: initialScreening?.xray || {}
  });

  useEffect(() => {
    if (initialScreening && Object.keys(initialScreening).length > 0) {
      setScreening(prev => ({
        periodontal: { ...prev.periodontal, ...(initialScreening.periodontal || {}) },
        occlusion: { ...prev.occlusion, ...(initialScreening.occlusion || {}) },
        appliances: { ...prev.appliances, ...(initialScreening.appliances || {}) },
        tmd: { ...prev.tmd, ...(initialScreening.tmd || {}) },
        xray: { ...prev.xray, ...(initialScreening.xray || {}) }
      }));
    }
  }, [initialScreening]);

  const [selectedTooth, setSelectedTooth] = useState(11);
  const [activeTab, setActiveTab] = useState("condition");

  // Trigger parent callback whenever state changes
  const notifyChange = (updatedTeeth, updatedScreening) => {
    if (onChange) {
      onChange({
        teeth: updatedTeeth !== undefined ? updatedTeeth : teeth,
        screening: updatedScreening !== undefined ? updatedScreening : screening
      });
    }
  };

  const setToothCode = (toothNum, code) => {
    if (readOnly) return;
    const updated = { ...teeth, [toothNum]: code };
    setTeeth(updated);
    notifyChange(updated, screening);
  };

  const clearToothCode = (toothNum) => {
    if (readOnly) return;
    const updated = { ...teeth };
    delete updated[toothNum];
    setTeeth(updated);
    notifyChange(updated, screening);
  };

  const handleScreeningCheck = (category, key, value) => {
    if (readOnly) return;
    const updatedScreening = {
      ...screening,
      [category]: {
        ...screening[category],
        [key]: value
      }
    };
    setScreening(updatedScreening);
    notifyChange(teeth, updatedScreening);
  };

  const getLegendInfo = (code) => {
    if (!code) return null;
    const all = [...DENTAL_LEGENDS.condition, ...DENTAL_LEGENDS.restorations, ...DENTAL_LEGENDS.surgery];
    return all.find(item => item.code === code) || { code, label: code, bg: "bg-slate-200 text-slate-800" };
  };

  // Helper renderer for a single tooth cell in the interactive chart
  const renderToothCell = (toothNum, isPrimary = false) => {
    const code = teeth[toothNum];
    const legend = getLegendInfo(code);
    const isSelected = selectedTooth === toothNum;

    return (
      <div
        key={toothNum}
        onClick={() => setSelectedTooth(toothNum)}
        className={`relative cursor-pointer transition-all duration-150 rounded-lg p-1.5 flex flex-col items-center border ${
          isSelected
            ? "border-blue-600 bg-blue-50/80 shadow-md ring-2 ring-blue-400 ring-offset-1"
            : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50"
        } ${isPrimary ? "w-11" : "w-12"}`}
      >
        <span className="text-[10px] font-bold text-slate-500 font-mono">
          {toothNum}
        </span>

        {/* Anatomical 5-Surface Circular Diagram */}
        <div className="relative w-8 h-8 my-1 flex items-center justify-center">
          <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-sm">
            {/* Outer Tooth Circle */}
            <circle cx="20" cy="20" r="18" fill="none" stroke="#64748b" strokeWidth="1.5" />
            {/* Inner Center Circle */}
            <circle cx="20" cy="20" r="7" fill={code ? "#e2e8f0" : "#ffffff"} stroke="#64748b" strokeWidth="1.2" />
            {/* Cross Dividers (Mesial, Distal, Buccal, Lingual) */}
            <line x1="6.8" y1="6.8" x2="15" y2="15" stroke="#94a3b8" strokeWidth="1.2" />
            <line x1="33.2" y1="6.8" x2="25" y2="15" stroke="#94a3b8" strokeWidth="1.2" />
            <line x1="6.8" y1="33.2" x2="15" y2="25" stroke="#94a3b8" strokeWidth="1.2" />
            <line x1="33.2" y1="33.2" x2="25" y2="25" stroke="#94a3b8" strokeWidth="1.2" />
          </svg>

          {/* Condition Code Overlay Badge */}
          {code && (
            <div className={`absolute inset-0 m-auto w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-inner border ${legend?.bg || 'bg-slate-800 text-white'}`}>
              {code}
            </div>
          )}
        </div>

        {/* Status Label Under Tooth */}
        <div className="h-4 flex items-center justify-center">
          {code ? (
            <span className="text-[9px] font-bold truncate max-w-full text-slate-700">
              {code}
            </span>
          ) : (
            <span className="text-[9px] text-slate-300">-</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 bg-slate-50/50 p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">Interactive Dental Chart (Intraoral Examination)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            FDI Two-Digit Standard Charting for Adult (Permanent 11-48) & Pediatric (Primary 51-85) Teeth.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 text-slate-600"
              onClick={() => {
                setTeeth({});
                notifyChange({}, screening);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Clear Chart
            </Button>
          )}
          <Badge variant="secondary" className="font-mono text-xs bg-blue-50 text-blue-700 border-blue-200">
            {Object.keys(teeth).length} Teeth Marked
          </Badge>
        </div>
      </div>

      {/* Main Chart Grid & Editor Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left 8 Cols: Complete Anatomical Tooth Grid */}
        <div className="xl:col-span-8 space-y-6 bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs">
          
          {/* Status Label Box Top */}
          <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b pb-2">
            <span>RIGHT</span>
            <span className="text-blue-600 font-extrabold text-xs">UPPER ARCH (MAXILLARY)</span>
            <span>LEFT</span>
          </div>

          {/* 1. UPPER PRIMARY TEETH (55-51 | 61-65) */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase text-center tracking-widest">
              Temporary / Primary Teeth (Upper)
            </p>
            <div className="flex justify-center items-center gap-1 sm:gap-2 flex-wrap">
              <div className="flex gap-1">
                {UPPER_PRIMARY_RIGHT.map(num => renderToothCell(num, true))}
              </div>
              <div className="w-px h-10 bg-slate-300 mx-2" />
              <div className="flex gap-1">
                {UPPER_PRIMARY_LEFT.map(num => renderToothCell(num, true))}
              </div>
            </div>
          </div>

          {/* 2. UPPER PERMANENT TEETH (18-11 | 21-28) */}
          <div className="space-y-1 pt-2">
            <p className="text-[10px] font-bold text-slate-600 uppercase text-center tracking-widest">
              Permanent Teeth (Upper)
            </p>
            <div className="flex justify-center items-center gap-1 sm:gap-1.5 flex-wrap">
              <div className="flex gap-1">
                {UPPER_PERMANENT_RIGHT.map(num => renderToothCell(num, false))}
              </div>
              <div className="w-0.5 h-12 bg-slate-400 mx-2" />
              <div className="flex gap-1">
                {UPPER_PERMANENT_LEFT.map(num => renderToothCell(num, false))}
              </div>
            </div>
          </div>

          {/* MIDLINE ARCH DIVIDER */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-dashed border-slate-300" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border border-slate-200 rounded-full">
                Occlusal Plane / Midline
              </span>
            </div>
          </div>

          {/* 3. LOWER PERMANENT TEETH (48-41 | 31-38) */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-600 uppercase text-center tracking-widest">
              Permanent Teeth (Lower)
            </p>
            <div className="flex justify-center items-center gap-1 sm:gap-1.5 flex-wrap">
              <div className="flex gap-1">
                {LOWER_PERMANENT_RIGHT.map(num => renderToothCell(num, false))}
              </div>
              <div className="w-0.5 h-12 bg-slate-400 mx-2" />
              <div className="flex gap-1">
                {LOWER_PERMANENT_LEFT.map(num => renderToothCell(num, false))}
              </div>
            </div>
          </div>

          {/* 4. LOWER PRIMARY TEETH (85-81 | 71-75) */}
          <div className="space-y-1 pt-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase text-center tracking-widest">
              Temporary / Primary Teeth (Lower)
            </p>
            <div className="flex justify-center items-center gap-1 sm:gap-2 flex-wrap">
              <div className="flex gap-1">
                {LOWER_PRIMARY_RIGHT.map(num => renderToothCell(num, true))}
              </div>
              <div className="w-px h-10 bg-slate-300 mx-2" />
              <div className="flex gap-1">
                {LOWER_PRIMARY_LEFT.map(num => renderToothCell(num, true))}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-wider border-t pt-2">
            <span>RIGHT</span>
            <span className="text-blue-600 font-extrabold text-xs">LOWER ARCH (MANDIBULAR)</span>
            <span>LEFT</span>
          </div>

        </div>

        {/* Right 4 Cols: Tooth Inspector & Interactive Legend Tool */}
        <div className="xl:col-span-4 space-y-4">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="bg-slate-50/80 border-b pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  Tooth #{selectedTooth} Inspector
                </CardTitle>
                {teeth[selectedTooth] && (
                  <Badge variant="outline" className={`font-bold ${getLegendInfo(teeth[selectedTooth])?.bg}`}>
                    {teeth[selectedTooth]}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {readOnly ? (
                <div className="text-sm text-slate-600 p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs font-bold text-slate-500 uppercase">Current Status:</p>
                  <p className="font-semibold text-slate-800 mt-1">
                    {teeth[selectedTooth] ? (
                      `${teeth[selectedTooth]} - ${getLegendInfo(teeth[selectedTooth])?.label}`
                    ) : (
                      "Sound / Normal Tooth"
                    )}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">Select Legend Code to Apply:</span>
                    {teeth[selectedTooth] && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => clearToothCode(selectedTooth)}
                      >
                        Remove Status
                      </Button>
                    )}
                  </div>

                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid grid-cols-3 w-full bg-slate-100 p-1">
                      <TabsTrigger value="condition" className="text-xs font-semibold">Condition</TabsTrigger>
                      <TabsTrigger value="restorations" className="text-xs font-semibold">Restorations</TabsTrigger>
                      <TabsTrigger value="surgery" className="text-xs font-semibold">Surgery</TabsTrigger>
                    </TabsList>

                    {/* Condition Legend Tab */}
                    <TabsContent value="condition" className="mt-3 space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                      {DENTAL_LEGENDS.condition.map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => setToothCode(selectedTooth, item.code)}
                          className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between border transition-colors ${
                            teeth[selectedTooth] === item.code
                              ? "border-blue-500 bg-blue-50 font-bold"
                              : "border-slate-100 hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] border ${item.bg}`}>
                              {item.code}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-800">{item.label}</p>
                              <p className="text-[10px] text-slate-400">{item.description}</p>
                            </div>
                          </div>
                          {teeth[selectedTooth] === item.code && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </button>
                      ))}
                    </TabsContent>

                    {/* Restorations Legend Tab */}
                    <TabsContent value="restorations" className="mt-3 space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                      {DENTAL_LEGENDS.restorations.map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => setToothCode(selectedTooth, item.code)}
                          className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between border transition-colors ${
                            teeth[selectedTooth] === item.code
                              ? "border-blue-500 bg-blue-50 font-bold"
                              : "border-slate-100 hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] border ${item.bg}`}>
                              {item.code}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-800">{item.label}</p>
                              <p className="text-[10px] text-slate-400">{item.description}</p>
                            </div>
                          </div>
                          {teeth[selectedTooth] === item.code && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </button>
                      ))}
                    </TabsContent>

                    {/* Surgery Legend Tab */}
                    <TabsContent value="surgery" className="mt-3 space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                      {DENTAL_LEGENDS.surgery.map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => setToothCode(selectedTooth, item.code)}
                          className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between border transition-colors ${
                            teeth[selectedTooth] === item.code
                              ? "border-blue-500 bg-blue-50 font-bold"
                              : "border-slate-100 hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] border ${item.bg}`}>
                              {item.code}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-800">{item.label}</p>
                              <p className="text-[10px] text-slate-400">{item.description}</p>
                            </div>
                          </div>
                          {teeth[selectedTooth] === item.code && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </button>
                      ))}
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Clinical Screening & Examination Section */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="bg-slate-50/80 border-b py-3">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            Clinical Examination & Screening Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 text-xs">
            
            {/* 1. Periodontal Screening */}
            <div className="space-y-2 border-r pr-4 border-slate-100">
              <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] border-b pb-1">
                Periodontal Screening
              </h4>
              {["Gingivitis", "Early Periodontitis", "Moderate Periodontitis", "Advanced Periodontitis"].map(item => (
                <div key={item} className="flex items-center space-x-2">
                  <Checkbox
                    id={`perio-${item}`}
                    disabled={readOnly}
                    checked={!!screening.periodontal[item]}
                    onCheckedChange={(val) => handleScreeningCheck("periodontal", item, val)}
                  />
                  <Label htmlFor={`perio-${item}`} className="text-xs text-slate-700 cursor-pointer">{item}</Label>
                </div>
              ))}
            </div>

            {/* 2. Occlusion */}
            <div className="space-y-2 border-r pr-4 border-slate-100">
              <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] border-b pb-1">
                Occlusion Assessment
              </h4>
              {["Class (Molar)", "Overjet", "Overbite", "Midline Deviation", "Crossbite"].map(item => (
                <div key={item} className="flex items-center space-x-2">
                  <Checkbox
                    id={`occlusion-${item}`}
                    disabled={readOnly}
                    checked={!!screening.occlusion[item]}
                    onCheckedChange={(val) => handleScreeningCheck("occlusion", item, val)}
                  />
                  <Label htmlFor={`occlusion-${item}`} className="text-xs text-slate-700 cursor-pointer">{item}</Label>
                </div>
              ))}
            </div>

            {/* 3. Appliances */}
            <div className="space-y-2 border-r pr-4 border-slate-100">
              <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] border-b pb-1">
                Appliances
              </h4>
              {["Orthodontic", "Stayplate", "Removable Retainer", "Night Guard"].map(item => (
                <div key={item} className="flex items-center space-x-2">
                  <Checkbox
                    id={`appliance-${item}`}
                    disabled={readOnly}
                    checked={!!screening.appliances[item]}
                    onCheckedChange={(val) => handleScreeningCheck("appliances", item, val)}
                  />
                  <Label htmlFor={`appliance-${item}`} className="text-xs text-slate-700 cursor-pointer">{item}</Label>
                </div>
              ))}
            </div>

            {/* 4. TMD & X-Rays */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] border-b pb-1">
                  TMD Symptoms
                </h4>
                {["Clenching", "Clicking", "Trismus", "Muscle Spasm"].map(item => (
                  <div key={item} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tmd-${item}`}
                      disabled={readOnly}
                      checked={!!screening.tmd[item]}
                      onCheckedChange={(val) => handleScreeningCheck("tmd", item, val)}
                    />
                    <Label htmlFor={`tmd-${item}`} className="text-xs text-slate-700 cursor-pointer">{item}</Label>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] border-b pb-1">
                  X-Rays Taken
                </h4>
                {["Periapical", "Panoramic", "Cephalometric", "Occlusal"].map(item => (
                  <div key={item} className="flex items-center space-x-2">
                    <Checkbox
                      id={`xray-${item}`}
                      disabled={readOnly}
                      checked={!!screening.xray[item]}
                      onCheckedChange={(val) => handleScreeningCheck("xray", item, val)}
                    />
                    <Label htmlFor={`xray-${item}`} className="text-xs text-slate-700 cursor-pointer">{item}</Label>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Legend Reference Sheet Footer */}
      <Card className="bg-slate-50 text-slate-800 border border-slate-200 shadow-sm">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <Info className="h-4 w-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800">
              Intraoral Clinical Legend Reference Key
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[11px]">
            <div>
              <p className="font-bold text-blue-600 uppercase tracking-wider mb-2">1. Condition</p>
              <div className="space-y-1 text-slate-600">
                {DENTAL_LEGENDS.condition.map(c => (
                  <p key={c.code}><span className="font-bold text-slate-900 font-mono w-6 inline-block">{c.code}</span> - {c.label}</p>
                ))}
              </div>
            </div>

            <div>
              <p className="font-bold text-blue-600 uppercase tracking-wider mb-2">2. Restorations & Prosthetics</p>
              <div className="space-y-1 text-slate-600">
                {DENTAL_LEGENDS.restorations.map(c => (
                  <p key={c.code}><span className="font-bold text-slate-900 font-mono w-6 inline-block">{c.code}</span> - {c.label}</p>
                ))}
              </div>
            </div>

            <div>
              <p className="font-bold text-blue-600 uppercase tracking-wider mb-2">3. Surgery & Procedures</p>
              <div className="space-y-1 text-slate-600">
                {DENTAL_LEGENDS.surgery.map(c => (
                  <p key={c.code}><span className="font-bold text-slate-900 font-mono w-6 inline-block">{c.code}</span> - {c.label}</p>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
