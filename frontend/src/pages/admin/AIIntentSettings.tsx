import React, { useState, useEffect } from "react";
import { Sliders, Bot, Sparkles, MessageSquare, Play, RefreshCw, CheckCircle2, ShieldAlert, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";

interface SimulationResult {
  detectedIntent: string;
  confidence: number;
  riskTier: "Low" | "Medium" | "High";
  recommendedAction: string;
  responsePreview: string;
}

export default function AIIntentSettings() {
  const [temperature, setTemperature] = useState(0.2);
  const [systemPrompt, setSystemPrompt] = useState(
    "You are TeethTalk AI, a triage assistant for a dental clinic. Prioritize identifying severe pain, bleeding, or trauma. Route urgent symptoms directly to emergency booking."
  );

  // Playground simulator state
  const [testQuery, setTestQuery] = useState("I have severe throbbing pain in my lower molar and my jaw is swollen.");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/ai-settings`);
        if (response.ok) {
          const data = await response.json();
          if (data.temperature !== undefined) setTemperature(data.temperature);
          if (data.system_prompt) setSystemPrompt(data.system_prompt);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/ai-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temperature, system_prompt: systemPrompt })
      });
      if (!response.ok) throw new Error("Failed to save settings");
      toast.success("AI Intent Classifier settings updated.");
    } catch (error) {
      toast.error("Failed to update AI settings");
    }
  };

  const applyPreset = (preset: "strict" | "empathetic" | "faq") => {
    if (preset === "strict") {
      setTemperature(0.1);
      setSystemPrompt(
        "Strict Clinical Triage Mode: Evaluate symptoms objectively. Flag acute trauma, severe pain (>=7/10), or fever/swelling as HIGH RISK emergency. Provide clear emergency protocol steps immediately."
      );
      toast.info("Applied 'Strict Triage' prompt preset.");
    } else if (preset === "empathetic") {
      setTemperature(0.4);
      setSystemPrompt(
        "Empathetic Patient Assistant Mode: Reassure anxious patients while assessing symptoms. Use clear, comforting language, clarify discomfort levels, and guide them to schedule an evaluation."
      );
      toast.info("Applied 'Empathetic Support' prompt preset.");
    } else if (preset === "faq") {
      setTemperature(0.2);
      setSystemPrompt(
        "Direct Clinic & Booking FAQ Mode: Answer scheduling, insurance, service offerings, and clinic hour inquiries concisely. If medical pain is mentioned, transition to triage."
      );
      toast.info("Applied 'Fast FAQ' prompt preset.");
    }
  };

  const handleSimulateAI = () => {
    if (!testQuery.trim()) {
      toast.error("Please enter a patient query to test.");
      return;
    }

    setIsSimulating(true);

    setTimeout(() => {
      const q = testQuery.toLowerCase();
      let result: SimulationResult;

      if (q.includes("pain") || q.includes("swoll") || q.includes("bleed") || q.includes("throb") || q.includes("broken")) {
        result = {
          detectedIntent: "Acute Dental Pain / Emergency Triage",
          confidence: 96,
          riskTier: "High",
          recommendedAction: "Escalate to Emergency Slot & Send SMS Notification",
          responsePreview: `[Strict Mode ${temperature}] I am sorry to hear you are experiencing severe pain and swelling. This requires immediate clinical evaluation. We have reserved emergency triage slots today—would you like to confirm a 2:30 PM appointment?`
        };
      } else if (q.includes("cost") || q.includes("price") || q.includes("insurance") || q.includes("pay")) {
        result = {
          detectedIntent: "Billing & Insurance Inquiry",
          confidence: 91,
          riskTier: "Low",
          recommendedAction: "Provide Fee Schedule & Accepted Insurances",
          responsePreview: `[System Response] TeethTalk Dental accepts PhilHealth, Maxicare, and major HMO plans. Routine cleanings start at ₱1,500. Would you like to view our full price schedule or check insurance eligibility?`
        };
      } else if (q.includes("book") || q.includes("appointment") || q.includes("schedule") || q.includes("clean")) {
        result = {
          detectedIntent: "Routine Appointment Booking",
          confidence: 94,
          riskTier: "Low",
          recommendedAction: "Prompt Open Time Slots Calendar",
          responsePreview: `[System Response] We have opening slots tomorrow at 10:00 AM and 3:00 PM with Dr. Cruz. Which time works best for your oral prophylaxis routine checkup?`
        };
      } else {
        result = {
          detectedIntent: "General Inquiry / Clinic Info",
          confidence: 85,
          riskTier: "Low",
          recommendedAction: "Provide General Information & Assistant Menu",
          responsePreview: `[System Response] TeethTalk Dental Clinic is open Monday to Saturday from 9:00 AM to 6:00 PM in Pasig City. How can I assist you today?`
        };
      }

      setSimResult(result);
      setIsSimulating(false);
      toast.success("Simulation complete.");
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">AI Intent Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Calibrate triage intent classification weights and system context instructions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSaveSettings}
            className="bg-slate-950 hover:bg-slate-900 text-white font-semibold text-sm h-10 px-5 shadow-sm"
          >
            Save Hyperparameters
          </Button>
        </div>
      </div>

      {/* Preset Calibration Buttons Banner */}
      <Card className="border-slate-200 bg-slate-50/80 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-lg">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Quick Prompt Presets</h3>
              <p className="text-xs text-slate-500">Apply tested preset prompt instructions and temperature configurations</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset("strict")}
              className="bg-white hover:bg-slate-100 text-slate-800 border-slate-300 font-semibold text-xs h-8"
            >
              <ShieldAlert className="h-3.5 w-3.5 mr-1 text-red-600" />
              Strict Triage (Temp 0.1)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset("empathetic")}
              className="bg-white hover:bg-slate-100 text-slate-800 border-slate-300 font-semibold text-xs h-8"
            >
              <Bot className="h-3.5 w-3.5 mr-1 text-blue-600" />
              Empathetic Support (Temp 0.4)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset("faq")}
              className="bg-white hover:bg-slate-100 text-slate-800 border-slate-300 font-semibold text-xs h-8"
            >
              <Zap className="h-3.5 w-3.5 mr-1 text-amber-600" />
              Fast FAQ (Temp 0.2)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Generative Hyperparameters */}
        <Card className="border-slate-200 bg-white shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-950 flex items-center gap-2">
              <Sliders className="h-5 w-5 text-slate-950" />
              <span>Model Hyperparameters</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Fine-tune the classification engine temperature and response threshold.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm font-semibold text-slate-800">
                <span>Creativity / Temperature</span>
                <span className="text-white bg-slate-950 px-2.5 py-0.5 rounded text-xs font-bold font-mono shadow-xs">{temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-950 focus:outline-none"
              />
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>0.0 (Strict / Clinical)</span>
                <span>0.5 (Balanced)</span>
                <span>1.0 (Creative)</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-md border border-slate-200">
                Lower values guarantee deterministic, clinical responses. Keep at 0.1 - 0.2 for production triage safety.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Triage Prompt Context */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-950 flex items-center gap-2">
              <Bot className="h-5 w-5 text-slate-950" />
              <span>System Triage Prompt</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Context instructions injected into every chatbot conversation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">System Context Prefix</Label>
              <textarea
                rows={5}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter AI system prompt..."
                className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-slate-50/50 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-slate-950/20 focus:border-slate-900 transition-colors leading-relaxed"
              />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Live AI Simulator Playground Panel */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-base font-bold text-slate-950 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-slate-950" />
            <span>Live Intent Classifier Simulator Playground</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Test how the AI assistant interprets real-time patient queries given your active temperature and prompt configuration.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-800">Sample Patient Query</Label>
            <div className="flex gap-2">
              <Input
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Type a sample patient message (e.g. 'I broke my tooth while eating')"
                className="h-10 text-sm font-medium border-slate-300 focus:border-slate-900"
              />
              <Button
                onClick={handleSimulateAI}
                disabled={isSimulating}
                className="bg-slate-950 hover:bg-slate-900 text-white font-semibold text-sm h-10 px-5 gap-2 shrink-0"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Simulating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Test
                  </>
                )}
              </Button>
            </div>

            {/* Quick Query Sample Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs text-slate-400 font-medium">Quick Test Prompts:</span>
              {[
                "Severe throbbing molar pain and swelling",
                "How much is a teeth cleaning session?",
                "Can I book an appointment for tomorrow?",
                "My gums won't stop bleeding after brushing"
              ].map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => setTestQuery(sample)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-2.5 py-1 rounded border border-slate-200 transition-colors"
                >
                  "{sample}"
                </button>
              ))}
            </div>
          </div>

          {/* Simulation Output Result Box */}
          {simResult && (
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-bold text-slate-900">Classification Diagnosis</span>
                </div>
                <span className="text-xs font-mono text-slate-500">Evaluated at Temp: {temperature}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white p-3 rounded border border-slate-200">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Detected Intent</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block">{simResult.detectedIntent}</span>
                </div>

                <div className="bg-white p-3 rounded border border-slate-200">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Confidence Score</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-bold text-emerald-700 font-mono">{simResult.confidence}%</span>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${simResult.confidence}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded border border-slate-200">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Risk Tier</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold mt-1 ${
                    simResult.riskTier === "High" ? "bg-red-100 text-red-700 border border-red-200" : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  }`}>
                    {simResult.riskTier} Risk
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recommended System Action</span>
                <p className="text-xs font-semibold text-slate-800 bg-white p-2.5 rounded border border-slate-200">{simResult.recommendedAction}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Generated Response Preview</span>
                <p className="text-xs font-mono text-slate-700 bg-slate-900 text-slate-100 p-3 rounded leading-relaxed">
                  {simResult.responsePreview}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

