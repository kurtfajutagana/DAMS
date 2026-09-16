import { useState, useEffect } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Info, 
  Check, 
  RotateCcw, 
  Activity, 
  ShieldCheck, 
  Stethoscope, 
  Layers, 
  Sparkles,
  Trash2
} from "lucide-react";

export interface DentalLegendItem {
  code: string;
  label: string;
  bg: string;
  description: string;
}

export interface DentalLegendsMap {
  condition: DentalLegendItem[];
  restorations: DentalLegendItem[];
  surgery: DentalLegendItem[];
}

// Complete Legend definitions matching physical Intraoral Examination sheet
export const DENTAL_LEGENDS: DentalLegendsMap = {
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

// Legacy status mapping for backward compatibility
const LEGACY_STATUS_MAP: Record<string, string> = {
  "healthy": "/",
  "treated": "Co",
  "needs-attention": "D",
  "missing": "M"
};

export const normalizeToothCode = (code: string | null | undefined): string | null => {
  if (!code) return null;
  return LEGACY_STATUS_MAP[code] || code;
};

// FDI Tooth Notation Groups
export const UPPER_PRIMARY_RIGHT = [55, 54, 53, 52, 51];
export const UPPER_PRIMARY_LEFT = [61, 62, 63, 64, 65];

export const UPPER_PERMANENT_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
export const UPPER_PERMANENT_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];

export const LOWER_PERMANENT_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
export const LOWER_PERMANENT_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];

export const LOWER_PRIMARY_RIGHT = [85, 84, 83, 82, 81];
export const LOWER_PRIMARY_LEFT = [71, 72, 73, 74, 75];

export const ALL_PERMANENT_UPPER = [...UPPER_PERMANENT_RIGHT, ...UPPER_PERMANENT_LEFT];
export const ALL_PERMANENT_LOWER = [...LOWER_PERMANENT_RIGHT, ...LOWER_PERMANENT_LEFT];
export const ALL_PRIMARY = [...UPPER_PRIMARY_RIGHT, ...UPPER_PRIMARY_LEFT, ...LOWER_PRIMARY_RIGHT, ...LOWER_PRIMARY_LEFT];

export const UPPER_MOLARS = [18, 17, 16, 26, 27, 28];
export const LOWER_MOLARS = [48, 47, 46, 36, 37, 38];
export const ANTERIORS = [13, 12, 11, 21, 22, 23, 43, 42, 41, 31, 32, 33];

export interface InteractiveDentalChartProps {
  initialTeeth?: Record<number | string, string>;
  initialScreening?: any;
  onChange?: (data: { teeth: Record<number, string>; screening: any }) => void;
  readOnly?: boolean;
}

export default function InteractiveDentalChart({
  initialTeeth = {},
  initialScreening = {},
  onChange,
  readOnly = false
}: InteractiveDentalChartProps) {
  const [teeth, setTeeth] = useState<Record<number, string>>({});

  useEffect(() => {
    if (initialTeeth && typeof initialTeeth === 'object') {
      const normalized: Record<number, string> = {};
      Object.entries(initialTeeth).forEach(([k, v]) => {
        if (v) {
          const norm = normalizeToothCode(v);
          if (norm) {
            normalized[Number(k)] = norm;
          }
        }
      });
      setTeeth(normalized);
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

  // Selected teeth state: array of tooth numbers
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([11]);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [activeTab, setActiveTab] = useState("condition");

  // Trigger parent callback whenever state changes
  const notifyChange = (updatedTeeth?: Record<number, string>, updatedScreening?: any) => {
    if (onChange) {
      onChange({
        teeth: updatedTeeth !== undefined ? updatedTeeth : teeth,
        screening: updatedScreening !== undefined ? updatedScreening : screening
      });
    }
  };

  // Tooth selection handler (single or multi)
  const handleToothClick = (toothNum: number, e?: React.MouseEvent) => {
    if (readOnly) {
      setSelectedTeeth([toothNum]);
      return;
    }

    if (e?.ctrlKey || e?.metaKey || e?.shiftKey || isMultiSelect) {
      setSelectedTeeth(prev => {
        if (prev.includes(toothNum)) {
          const next = prev.filter(t => t !== toothNum);
          return next.length > 0 ? next : [toothNum];
        } else {
          return [...prev, toothNum];
        }
      });
    } else {
      setSelectedTeeth([toothNum]);
    }
  };

  // Preset Selection
  const handleSelectPreset = (presetList: number[]) => {
    if (readOnly) return;
    setSelectedTeeth(presetList);
    if (presetList.length > 1) {
      setIsMultiSelect(true);
    }
  };

  const handleSelectAllMarked = () => {
    if (readOnly) return;
    const marked = Object.keys(teeth).map(Number);
    if (marked.length > 0) {
      setSelectedTeeth(marked);
      setIsMultiSelect(true);
    }
  };

  const handleDeselectAll = () => {
    setSelectedTeeth([11]);
    setIsMultiSelect(false);
  };

  // Set condition code to all currently selected teeth
  const setBatchToothCode = (code: string) => {
    if (readOnly || selectedTeeth.length === 0) return;
    const updated = { ...teeth };
    selectedTeeth.forEach(num => {
      updated[num] = code;
    });
    setTeeth(updated);
    notifyChange(updated, screening);
  };

  // Clear condition from all currently selected teeth
  const clearBatchToothCode = () => {
    if (readOnly || selectedTeeth.length === 0) return;
    const updated = { ...teeth };
    selectedTeeth.forEach(num => {
      delete updated[num];
    });
    setTeeth(updated);
    notifyChange(updated, screening);
  };

  const handleScreeningCheck = (category: string, key: string, value: any) => {
    if (readOnly) return;
    const updatedScreening = {
      ...screening,
      [category]: {
        ...(screening as any)[category],
        [key]: value
      }
    };
    setScreening(updatedScreening);
    notifyChange(teeth, updatedScreening);
  };

  const getLegendInfo = (code: string | null | undefined): DentalLegendItem | { code: string; label: string; bg: string } | null => {
    if (!code) return null;
    const normalized = normalizeToothCode(code);
    const all = [...DENTAL_LEGENDS.condition, ...DENTAL_LEGENDS.restorations, ...DENTAL_LEGENDS.surgery];
    return all.find(item => item.code === normalized) || { code: normalized || code, label: normalized || code, bg: "bg-slate-200 text-slate-800" };
  };

  // Helper renderer for a single tooth cell
  const renderToothCell = (toothNum: number, isPrimary = false) => {
    const rawCode = teeth[toothNum];
    const code = normalizeToothCode(rawCode);
    const legend = getLegendInfo(code);
    const isSelected = selectedTeeth.includes(toothNum);

    return (
      <div
        key={toothNum}
        onClick={(e) => handleToothClick(toothNum, e)}
        className={`relative cursor-pointer select-none transition-all duration-150 rounded-xl p-1.5 flex flex-col items-center border ${
          isSelected
            ? "border-blue-600 bg-blue-50/90 shadow-md ring-2 ring-blue-500 ring-offset-1 z-10 scale-105"
            : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 shadow-2xs"
        } ${isPrimary ? "w-11 sm:w-12" : "w-12 sm:w-14"}`}
        title={`Tooth #${toothNum} ${code ? `(${legend?.label || code})` : '(Sound)'}`}
      >
        {/* FDI Tooth Number */}
        <span className={`text-[10px] sm:text-xs font-bold font-mono ${isSelected ? 'text-blue-700 font-extrabold' : 'text-slate-600'}`}>
          {toothNum}
        </span>

        {/* Anatomical 5-Surface Circular Diagram */}
        <div className="relative w-8 h-8 sm:w-9 sm:h-9 my-1 flex items-center justify-center">
          <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-xs">
            {/* Outer Tooth Circle */}
            <circle cx="20" cy="20" r="18" fill="none" stroke={isSelected ? "#2563eb" : "#64748b"} strokeWidth={isSelected ? "2" : "1.5"} />
            {/* Inner Center Circle */}
            <circle cx="20" cy="20" r="7" fill={code ? "#e2e8f0" : "#ffffff"} stroke={isSelected ? "#2563eb" : "#64748b"} strokeWidth="1.2" />
            {/* Cross Dividers (Mesial, Distal, Buccal, Lingual) */}
            <line x1="6.8" y1="6.8" x2="15" y2="15" stroke="#94a3b8" strokeWidth="1.2" />
            <line x1="33.2" y1="6.8" x2="25" y2="15" stroke="#94a3b8" strokeWidth="1.2" />
            <line x1="6.8" y1="33.2" x2="15" y2="25" stroke="#94a3b8" strokeWidth="1.2" />
            <line x1="33.2" y1="33.2" x2="25" y2="25" stroke="#94a3b8" strokeWidth="1.2" />
          </svg>

          {/* Condition Code Overlay Badge */}
          {code && (
            <div className={`absolute inset-0 m-auto w-6 h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black shadow-inner border ${legend?.bg || 'bg-slate-800 text-white'}`}>
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
            <span className="text-[9px] text-slate-300 font-mono">-</span>
          )}
        </div>

        {/* Selected indicator check */}
        {isSelected && selectedTeeth.length > 1 && (
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold shadow-xs">
            ✓
          </div>
        )}
      </div>
    );
  };

  // Determine current display info for inspector
  const primarySelectedTooth = selectedTeeth[0] || 11;
  const isMultiple = selectedTeeth.length > 1;
  const markedCount = Object.keys(teeth).length;

  return (
    <div className="space-y-4 bg-slate-50/70 p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-xs dental-chart-container w-full">
      
      {/* Header Toolbar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              Intraoral Dental Chart (Odontogram)
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500">
              FDI Standard Charting (Permanent 11-48 & Primary 51-85).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
          {/* Multi-Select Toggle */}
          {!readOnly && (
            <Button
              type="button"
              variant={isMultiSelect ? "default" : "outline"}
              size="sm"
              onClick={() => setIsMultiSelect(!isMultiSelect)}
              className={`h-8 text-xs font-semibold gap-1.5 ${isMultiSelect ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs' : 'border-slate-300 text-slate-700'}`}
            >
              <Layers className="h-3.5 w-3.5" />
              {isMultiSelect ? "Multi-Select: ON" : "Multi-Select: OFF"}
            </Button>
          )}

          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 text-slate-600 border-slate-300 hover:bg-slate-100"
              onClick={() => {
                setTeeth({});
                setSelectedTeeth([11]);
                notifyChange({}, screening);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Clear All Teeth
            </Button>
          )}

          <Badge variant="secondary" className="font-mono text-xs bg-blue-50 text-blue-700 border-blue-200 py-1 px-2.5">
            {markedCount} Marked
          </Badge>
        </div>
      </div>

      {/* Quick Selection Presets Bar (For Batch Selection) */}
      {!readOnly && (
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" /> Batch Presets:
          </span>
          <button
            type="button"
            onClick={() => handleSelectPreset(ALL_PERMANENT_UPPER)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border border-slate-200"
          >
            Upper Arch (18-28)
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset(ALL_PERMANENT_LOWER)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border border-slate-200"
          >
            Lower Arch (48-38)
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset([...ALL_PERMANENT_UPPER, ...ALL_PERMANENT_LOWER])}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border border-slate-200"
          >
            All Permanent (32)
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset(ALL_PRIMARY)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border border-slate-200"
          >
            Primary Teeth (20)
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset(UPPER_MOLARS)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border border-slate-200"
          >
            Upper Molars
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset(LOWER_MOLARS)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border border-slate-200"
          >
            Lower Molars
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset(ANTERIORS)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border border-slate-200"
          >
            Anteriors
          </button>
          {markedCount > 0 && (
            <button
              type="button"
              onClick={handleSelectAllMarked}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200"
            >
              Select All Marked ({markedCount})
            </button>
          )}
          {selectedTeeth.length > 1 && (
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors border border-rose-200 ml-auto"
            >
              Reset Selection
            </button>
          )}
        </div>
      )}

      {/* Main Chart Grid & Editor Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        
        {/* Left 8 Cols: Complete Anatomical Tooth Grid */}
        <div className="xl:col-span-8 space-y-3 bg-white p-3 sm:p-5 rounded-xl border border-slate-200 shadow-xs min-w-0 overflow-hidden">
          
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 bg-slate-100/80 py-1.5 px-3 rounded-lg border border-slate-200">
            <span className="flex items-center gap-1.5">
              <span className="text-blue-600 font-bold">↔</span>
              <span>Scroll horizontally to view full dental arches</span>
            </span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">
              {isMultiSelect ? "Multi-Select Active (Click teeth to add/remove)" : "Click tooth to select"}
            </span>
          </div>

          <div className="w-full overflow-x-auto overflow-y-hidden touch-pan-x pb-3 pt-1 visible-scrollbar">
            <div className="min-w-[840px] w-max space-y-4 px-2">
              
              {/* UPPER ARCH HEADER */}
              <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2">
                <span className="text-blue-700 font-extrabold">Quadrant 1: Upper Right (UR)</span>
                <span className="text-slate-900 font-extrabold text-xs px-3 py-0.5 bg-slate-100 rounded-full border border-slate-200">
                  UPPER ARCH (MAXILLARY)
                </span>
                <span className="text-blue-700 font-extrabold">Quadrant 2: Upper Left (UL)</span>
              </div>

              {/* 1. UPPER PRIMARY TEETH (55-51 | 61-65) */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase text-center tracking-widest">
                  Primary / Deciduous Teeth (Upper)
                </p>
                <div className="flex justify-center items-center gap-1 sm:gap-2 flex-nowrap w-full">
                  <div className="flex gap-1">
                    {UPPER_PRIMARY_RIGHT.map(num => renderToothCell(num, true))}
                  </div>
                  <div className="w-0.5 h-10 bg-slate-300 mx-2" />
                  <div className="flex gap-1">
                    {UPPER_PRIMARY_LEFT.map(num => renderToothCell(num, true))}
                  </div>
                </div>
              </div>

              {/* 2. UPPER PERMANENT TEETH (18-11 | 21-28) */}
              <div className="space-y-1 pt-1">
                <p className="text-[10px] font-bold text-slate-700 uppercase text-center tracking-widest">
                  Permanent Teeth (Upper)
                </p>
                <div className="flex justify-center items-center gap-1 sm:gap-1.5 flex-nowrap w-full">
                  <div className="flex gap-1">
                    {UPPER_PERMANENT_RIGHT.map(num => renderToothCell(num, false))}
                  </div>
                  <div className="w-1 h-12 bg-slate-400 mx-2 rounded-full" />
                  <div className="flex gap-1">
                    {UPPER_PERMANENT_LEFT.map(num => renderToothCell(num, false))}
                  </div>
                </div>
              </div>

              {/* MIDLINE ARCH DIVIDER */}
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-dashed border-slate-300" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest border border-slate-300 rounded-full shadow-2xs">
                    Occlusal Midline Plane
                  </span>
                </div>
              </div>

              {/* 3. LOWER PERMANENT TEETH (48-41 | 31-38) */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-700 uppercase text-center tracking-widest">
                  Permanent Teeth (Lower)
                </p>
                <div className="flex justify-center items-center gap-1 sm:gap-1.5 flex-nowrap w-full">
                  <div className="flex gap-1">
                    {LOWER_PERMANENT_RIGHT.map(num => renderToothCell(num, false))}
                  </div>
                  <div className="w-1 h-12 bg-slate-400 mx-2 rounded-full" />
                  <div className="flex gap-1">
                    {LOWER_PERMANENT_LEFT.map(num => renderToothCell(num, false))}
                  </div>
                </div>
              </div>

              {/* 4. LOWER PRIMARY TEETH (85-81 | 71-75) */}
              <div className="space-y-1 pt-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase text-center tracking-widest">
                  Primary / Deciduous Teeth (Lower)
                </p>
                <div className="flex justify-center items-center gap-1 sm:gap-2 flex-nowrap w-full">
                  <div className="flex gap-1">
                    {LOWER_PRIMARY_RIGHT.map(num => renderToothCell(num, true))}
                  </div>
                  <div className="w-0.5 h-10 bg-slate-300 mx-2" />
                  <div className="flex gap-1">
                    {LOWER_PRIMARY_LEFT.map(num => renderToothCell(num, true))}
                  </div>
                </div>
              </div>

              {/* LOWER ARCH HEADER */}
              <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 uppercase tracking-wider border-t border-slate-200 pt-2">
                <span className="text-blue-700 font-extrabold">Quadrant 4: Lower Right (LR)</span>
                <span className="text-slate-900 font-extrabold text-xs px-3 py-0.5 bg-slate-100 rounded-full border border-slate-200">
                  LOWER ARCH (MANDIBULAR)
                </span>
                <span className="text-blue-700 font-extrabold">Quadrant 3: Lower Left (LL)</span>
              </div>

            </div>
          </div>

        </div>

        {/* Right 4 Cols: Tooth Inspector & Interactive Legend Tool */}
        <div className="xl:col-span-4 space-y-4">
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="bg-slate-50/80 border-b pb-3 pt-3.5 px-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  {isMultiple ? (
                    <span>Batch Inspector ({selectedTeeth.length} Teeth)</span>
                  ) : (
                    <span>Tooth #{primarySelectedTooth} Inspector</span>
                  )}
                </CardTitle>
                
                {!isMultiple && teeth[primarySelectedTooth] && (
                  <Badge variant="outline" className={`font-bold ${getLegendInfo(teeth[primarySelectedTooth])?.bg}`}>
                    {normalizeToothCode(teeth[primarySelectedTooth])}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3.5">
              
              {/* Selected teeth chip list when multi-selected */}
              {isMultiple && (
                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-blue-900">
                    <span>Target Teeth:</span>
                    <span className="text-[11px] font-mono text-blue-700">{selectedTeeth.length} selected</span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                    {selectedTeeth.map(num => (
                      <span
                        key={num}
                        className="px-1.5 py-0.5 bg-white text-blue-800 rounded font-mono text-[10px] font-bold border border-blue-200"
                      >
                        #{num}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {readOnly ? (
                <div className="text-sm text-slate-600 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase">Current Status:</p>
                  <p className="font-semibold text-slate-800 mt-1">
                    {teeth[primarySelectedTooth] ? (
                      `${normalizeToothCode(teeth[primarySelectedTooth])} - ${getLegendInfo(teeth[primarySelectedTooth])?.label}`
                    ) : (
                      "Sound / Normal Tooth"
                    )}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      {isMultiple ? `Apply Code to ${selectedTeeth.length} Teeth:` : "Select Code to Apply:"}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 gap-1"
                      onClick={clearBatchToothCode}
                    >
                      <Trash2 className="h-3 w-3" /> Clear Status
                    </Button>
                  </div>

                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid grid-cols-3 w-full bg-slate-100 p-1 rounded-lg">
                      <TabsTrigger value="condition" className="text-xs font-bold">Condition</TabsTrigger>
                      <TabsTrigger value="restorations" className="text-xs font-bold">Restorations</TabsTrigger>
                      <TabsTrigger value="surgery" className="text-xs font-bold">Surgery</TabsTrigger>
                    </TabsList>

                    {/* Condition Legend Tab */}
                    <TabsContent value="condition" className="mt-2.5 space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                      {DENTAL_LEGENDS.condition.map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => setBatchToothCode(item.code)}
                          className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between border transition-all hover:scale-[1.01] ${
                            !isMultiple && normalizeToothCode(teeth[primarySelectedTooth]) === item.code
                              ? "border-blue-500 bg-blue-50 font-bold shadow-xs"
                              : "border-slate-100 hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] border shrink-0 ${item.bg}`}>
                              {item.code}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate">{item.label}</p>
                              <p className="text-[10px] text-slate-400 truncate">{item.description}</p>
                            </div>
                          </div>
                          {!isMultiple && normalizeToothCode(teeth[primarySelectedTooth]) === item.code && (
                            <Check className="h-4 w-4 text-blue-600 shrink-0" />
                          )}
                        </button>
                      ))}
                    </TabsContent>

                    {/* Restorations Legend Tab */}
                    <TabsContent value="restorations" className="mt-2.5 space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                      {DENTAL_LEGENDS.restorations.map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => setBatchToothCode(item.code)}
                          className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between border transition-all hover:scale-[1.01] ${
                            !isMultiple && normalizeToothCode(teeth[primarySelectedTooth]) === item.code
                              ? "border-blue-500 bg-blue-50 font-bold shadow-xs"
                              : "border-slate-100 hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] border shrink-0 ${item.bg}`}>
                              {item.code}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate">{item.label}</p>
                              <p className="text-[10px] text-slate-400 truncate">{item.description}</p>
                            </div>
                          </div>
                          {!isMultiple && normalizeToothCode(teeth[primarySelectedTooth]) === item.code && (
                            <Check className="h-4 w-4 text-blue-600 shrink-0" />
                          )}
                        </button>
                      ))}
                    </TabsContent>

                    {/* Surgery Legend Tab */}
                    <TabsContent value="surgery" className="mt-2.5 space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                      {DENTAL_LEGENDS.surgery.map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => setBatchToothCode(item.code)}
                          className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between border transition-all hover:scale-[1.01] ${
                            !isMultiple && normalizeToothCode(teeth[primarySelectedTooth]) === item.code
                              ? "border-blue-500 bg-blue-50 font-bold shadow-xs"
                              : "border-slate-100 hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] border shrink-0 ${item.bg}`}>
                              {item.code}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate">{item.label}</p>
                              <p className="text-[10px] text-slate-400 truncate">{item.description}</p>
                            </div>
                          </div>
                          {!isMultiple && normalizeToothCode(teeth[primarySelectedTooth]) === item.code && (
                            <Check className="h-4 w-4 text-blue-600 shrink-0" />
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
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="bg-slate-50/80 border-b py-3 px-4">
          <CardTitle className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            Clinical Examination & Screening Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 text-xs">
            
            {/* 1. Periodontal Screening */}
            <div className="space-y-2 border-r pr-3 border-slate-100">
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
            <div className="space-y-2 border-r pr-3 border-slate-100">
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
            <div className="space-y-2 border-r pr-3 border-slate-100">
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
      <Card className="bg-white text-slate-800 border border-slate-200 shadow-2xs">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Info className="h-4 w-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800">
              Intraoral Clinical Legend Reference Key
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px]">
            <div>
              <p className="font-bold text-blue-600 uppercase tracking-wider mb-1.5">1. Condition</p>
              <div className="space-y-1 text-slate-600">
                {DENTAL_LEGENDS.condition.map(c => (
                  <p key={c.code}><span className="font-bold text-slate-900 font-mono w-7 inline-block">{c.code}</span> - {c.label}</p>
                ))}
              </div>
            </div>

            <div>
              <p className="font-bold text-blue-600 uppercase tracking-wider mb-1.5">2. Restorations & Prosthetics</p>
              <div className="space-y-1 text-slate-600">
                {DENTAL_LEGENDS.restorations.map(c => (
                  <p key={c.code}><span className="font-bold text-slate-900 font-mono w-7 inline-block">{c.code}</span> - {c.label}</p>
                ))}
              </div>
            </div>

            <div>
              <p className="font-bold text-blue-600 uppercase tracking-wider mb-1.5">3. Surgery & Procedures</p>
              <div className="space-y-1 text-slate-600">
                {DENTAL_LEGENDS.surgery.map(c => (
                  <p key={c.code}><span className="font-bold text-slate-900 font-mono w-7 inline-block">{c.code}</span> - {c.label}</p>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

