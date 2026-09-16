import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Separator } from "../../components/ui/separator";
import { Send, Bot, User, Sparkles, AlertTriangle, Loader2, Users, MapPin, Calendar, Clock } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../components/ui/sheet";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
}

interface Branch {
  id: string;
  branch_name: string;
}

interface AvailableDentist {
  id: string;
  first_name: string;
  last_name: string;
  specialization?: string;
  is_available: boolean;
  branch_id?: string;
  branches?: {
    id: string;
    branch_name: string;
  } | null;
}

export default function PatientAIAssistant() {
  const { user } = useAuth() as any;
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      sender: "bot",
      text: "Hello! I am your AI Dental Assistant. How can I help you with your post-treatment care or clinic inquiries today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [availableDentists, setAvailableDentists] = useState<AvailableDentist[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");

  const quickQueries = [
    "Explain my medication dose",
    "Can I eat after my extraction?",
    "Teeth Talk clinic fees",
    "How to manage swelling?"
  ];

  // Helper to check if current Manila time is within 9:00 AM - 5:00 PM operating hours
  const isWithinOperatingHours = () => {
    const now = new Date();
    const manilaOffset = 8 * 60; // Manila UTC+8 in minutes
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const manilaDate = new Date(utc + (manilaOffset * 60000));
    const hour = manilaDate.getHours();
    return hour >= 9 && hour < 17;
  };

  // Fetch Branches and Available Dentists
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const { data, error } = await supabase
          .from('branches')
          .select('id, branch_name')
          .eq('is_active', true)
          .order('branch_name');
        
        if (!error && data) {
          setBranches(data);
        }
      } catch (err) {
        console.error("Error fetching branches:", err);
      }
    };

    const fetchDentists = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, specialization, is_available, branch_id, branches(id, branch_name)')
          .eq('role', 'dentist')
          .eq('is_available', true);
        
        if (!error && data) {
          setAvailableDentists(data as unknown as AvailableDentist[]);
        }
      } catch (err) {
        console.error("Error fetching available dentists:", err);
      }
    };
    
    fetchBranches();
    fetchDentists();

    // Subscribe to realtime changes on profiles
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: "role=eq.dentist"
        },
        () => {
          fetchDentists();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch chat history on load
  useEffect(() => {
    let isMounted = true;
    
    const fetchHistory = async () => {
      if (!user?.id) return;
      
      try {
        const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
        const response = await fetch(`${baseUrl}/api/chat/history/${user.id}`);
        if (response.ok && isMounted) {
          const data = await response.json();
          if (data && data.length > 0) {
            const historyMessages: ChatMessage[] = [];
            data.forEach((log: any, index: number) => {
              const timeString = new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              historyMessages.push({
                id: `hist-u-${index}`,
                sender: "user",
                text: log.message_prompt,
                timestamp: timeString
              });
              historyMessages.push({
                id: `hist-b-${index}`,
                sender: "bot",
                text: log.ai_response,
                timestamp: timeString
              });
            });
            
            // Prepend the default greeting
            setMessages([
              {
                id: "msg-1",
                sender: "bot",
                text: "Hello! I am your AI Dental Assistant. How can I help you with your post-treatment care or clinic inquiries today?",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              },
              ...historyMessages
            ]);
          }
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    };
    
    fetchHistory();
    
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    // Add User Message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${baseUrl}/api/chat/generative`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient_id: user?.id || "00000000-0000-0000-0000-000000000000",
          message: text
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from AI");
      }

      const data = await response.json();
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("Chat API Error:", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: "I'm sorry, I'm having trouble connecting to my servers right now. Please try again later.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDentists = availableDentists.filter((doc) => {
    if (selectedBranchId === "all") return true;
    return doc.branch_id === selectedBranchId || doc.branches?.id === selectedBranchId;
  });

  const inOperatingHours = isWithinOperatingHours();

  const renderBranchFilters = () => (
    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none shrink-0">
      <button
        onClick={() => setSelectedBranchId("all")}
        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
          selectedBranchId === "all"
            ? "bg-slate-900 text-white shadow-xs"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        }`}
      >
        All Branches ({availableDentists.length})
      </button>
      {branches.map((b) => {
        const count = availableDentists.filter(
          (d) => d.branch_id === b.id || d.branches?.id === b.id
        ).length;
        return (
          <button
            key={b.id}
            onClick={() => setSelectedBranchId(b.id)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
              selectedBranchId === b.id
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {b.branch_name} ({count})
          </button>
        );
      })}
    </div>
  );

  const renderDoctorsList = () => (
    <div className="space-y-3">
      {renderBranchFilters()}

      {filteredDentists.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-lg border border-dashed border-slate-200 bg-white/50">
          <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700">No doctors online for this branch</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Check another branch or select "All Branches".
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDentists.map((doctor) => {
            const branchName = doctor.branches?.branch_name || "Unassigned Branch";
            return (
              <div
                key={doctor.id}
                className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-xs hover:shadow-sm transition-all space-y-2.5"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 border border-red-100 shrink-0">
                    <AvatarFallback className="bg-red-50 text-red-700 text-xs font-bold">
                      {doctor.first_name?.[0]}{doctor.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-slate-900">
                      Dr. {doctor.first_name} {doctor.last_name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate font-medium">
                      {doctor.specialization || "General Dentistry"}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {/* Branch Badge */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-100">
                        <MapPin className="h-2.5 w-2.5" />
                        {branchName}
                      </span>

                      {/* Online & Shift Status */}
                      {inOperatingHours ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online • On-Duty
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-100" title="Regular clinic hours are 9:00 AM – 5:00 PM">
                          <Clock className="h-2.5 w-2.5" />
                          Online • Off-Duty (9AM-5PM)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Direct Appointment Booking Link */}
                <Link
                  to="/patient/appointments"
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg border border-red-200 transition-colors"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Book Appointment
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-[calc(100dvh-5.5rem)] sm:h-[calc(100vh-140px)] w-full min-w-0 flex flex-col space-y-2 sm:space-y-4">
      
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 sm:pb-4 shrink-0 gap-2">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-slate-950 flex items-center gap-1.5 sm:gap-2">
            <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 shrink-0" />
            <span className="truncate">AI Clinical Assistant</span>
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5 hidden sm:block">Instant 24/7 guidance for post-procedure care, symptoms, and clinic schedules.</p>
        </div>

        {/* Mobile/Laptop Doctors Trigger */}
        <div className="2xl:hidden shrink-0">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs shadow-xs px-2.5">
                <Users className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Available</span> Doctors
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] flex flex-col rounded-t-xl sm:max-w-none">
              <SheetHeader className="shrink-0 text-left">
                <SheetTitle className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Available Doctors
                </SheetTitle>
                <SheetDescription>
                  Doctors currently online and ready for appointments.
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto mt-4 px-1">
                {renderDoctorsList()}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden relative">
        <Card className="flex-1 flex flex-col shadow-sm overflow-hidden border-primary/20 bg-background relative min-w-0">
          
          {/* Chat Area */}
          <CardContent 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-6 scroll-smooth bg-slate-50/50 dark:bg-slate-900/20"
          >
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-2 sm:gap-3 max-w-[92%] sm:max-w-[85%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                <Avatar className={`h-7 w-7 sm:h-8 sm:w-8 shrink-0 ${msg.sender === "bot" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <AvatarFallback>
                    {msg.sender === "bot" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className={`space-y-1 min-w-0 ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                  <div 
                    className={`px-3 py-2 sm:px-4 sm:py-3 rounded-2xl ${
                      msg.sender === "user" 
                        ? "bg-primary text-primary-foreground rounded-tr-sm" 
                        : "bg-white dark:bg-slate-800 border shadow-sm rounded-tl-sm text-foreground overflow-x-auto"
                    }`}
                  >
                    {msg.sender === "bot" ? (
                      <div className="text-xs sm:text-sm prose prose-sm dark:prose-invert max-w-none break-words">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({node, ...props}: any) => <p className="mb-1.5 last:mb-0 leading-relaxed" {...props} />,
                            ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-1.5" {...props} />,
                            ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-1.5" {...props} />,
                            li: ({node, ...props}: any) => <li className="mb-0.5" {...props} />
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                    )}
                  </div>
                  <p className={`text-[9px] sm:text-[10px] text-muted-foreground px-1 flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 sm:gap-3 max-w-[85%] mr-auto items-center animate-in fade-in slide-in-from-bottom-2">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 bg-primary text-primary-foreground">
                  <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div className="bg-white dark:bg-slate-800 border shadow-sm rounded-2xl rounded-tl-sm px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin text-primary" />
                  <span className="text-xs sm:text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
          </CardContent>

          <Separator />

          {/* Input Area */}
          <CardFooter className="p-2.5 sm:p-4 flex flex-col gap-2 sm:gap-3 bg-card shrink-0 rounded-b-xl border-t min-w-0">
            
            {/* Quick-Query Context Tags */}
            <div className="flex gap-1.5 overflow-x-auto w-full pb-1 scrollbar-none items-center">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              {quickQueries.map((query, i) => (
                <button 
                  key={i}
                  onClick={() => handleSend(query)}
                  disabled={isLoading}
                  className="whitespace-nowrap px-2.5 py-0.5 sm:py-1 bg-muted/50 hover:bg-muted border rounded-full text-[11px] sm:text-xs font-medium text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {query}
                </button>
              ))}
            </div>

            <div className="flex w-full gap-2 items-end relative">
              <div className="relative flex-1 bg-background border rounded-lg shadow-xs focus-within:ring-1 focus-within:ring-primary overflow-hidden">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(input);
                    }
                  }}
                  disabled={isLoading}
                  placeholder="Type your message here..."
                  className="w-full min-h-[38px] sm:min-h-[50px] max-h-[120px] bg-transparent border-0 resize-none p-2 sm:p-3 text-xs sm:text-sm focus:outline-none focus:ring-0 disabled:opacity-50"
                  rows={1}
                />
              </div>
              <Button 
                size="icon" 
                className="h-[38px] w-[38px] sm:h-[50px] sm:w-[50px] shrink-0 rounded-lg shadow-xs"
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isLoading}
              >
                <Send className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
            
          </CardFooter>

          {/* Safety Disclaimer Footnote */}
          <div className="bg-red-50 dark:bg-red-950/30 border-t border-red-200 dark:border-red-900/50 py-1.5 px-3 flex items-center justify-center gap-1.5 shrink-0 rounded-b-xl min-w-0 w-full">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-500 shrink-0" />
            <p className="text-[9px] sm:text-xs text-red-800 dark:text-red-400 font-medium text-center leading-tight line-clamp-2 sm:line-clamp-none max-w-4xl w-full">
              Informational guidance only • Cannot diagnose X-rays or render medical decisions. For urgent clinical concerns, consult your dentist immediately.
            </p>
          </div>
        </Card>

        {/* Available Dentists Sidebar */}
        <div className="hidden 2xl:flex flex-col w-80 shrink-0 gap-4 overflow-hidden">
          <Card className="flex-1 overflow-y-auto border-primary/20 shadow-sm flex flex-col bg-slate-50/30">
            <CardHeader className="p-4 border-b bg-muted/20 shrink-0">
               <CardTitle className="text-sm flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 Available Doctors
               </CardTitle>
               <CardDescription className="text-[11px] leading-tight mt-1">
                 Doctors currently online and ready for appointments.
               </CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto">
               {renderDoctorsList()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
