import React, { useState } from "react";
import { Sliders, Bot } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

export default function AIIntentSettings() {
  const [temperature, setTemperature] = useState(0.2);

  const handleSaveSettings = () => {
    toast.success("AI Intent Classifier settings updated.");
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI Intent Settings</h1>
          <p className="text-slate-500 text-xs mt-0.5">Calibrate intent weights and clinical chatbot prompts</p>
        </div>
        <Button
          onClick={handleSaveSettings}
          className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs"
        >
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Generative weights */}
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="h-4.5 w-4.5 text-slate-950" />
              <span>Model Hyperparameters</span>
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-500">
              Fine-tune the triage classification engine behavior.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span>Creativity / Temperature</span>
                <span className="text-white bg-slate-950 px-1.5 py-0.5 rounded font-mono">{temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-950 focus:outline-none"
              />
              <p className="text-[9px] text-slate-450">
                Lower values guarantee deterministic, clinical responses. Keep at 0.2 for production triage.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Triage Prompt prefix */}
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Bot className="h-4.5 w-4.5 text-slate-950" />
              <span>Triage Instructions Context</span>
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-500">
              Instruction prompts sent to the 24/7 AI virtual assistant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">System Context Prefix</label>
              <textarea
                rows={5}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-slate-950"
                defaultValue={`You are a professional assistant for Teeth Talk Dental Clinic. Your goals:
1. Detect pain, bleeding, billing issues, and appointments.
2. Be precise, polite, and clinical.
3. Escalate severe cases to a human doctor.`}
              />
            </div>
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
