import React, { useState, useRef, useEffect } from "react";
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
import { Send, Bot, User, Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
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

  const quickQueries = [
    "Explain my medication dose",
    "Can I eat after my extraction?",
    "Teeth Talk clinic fees",
    "How to manage swelling?"
  ];

  // Fetch chat history on load
  useEffect(() => {
    let isMounted = true;
    
    const fetchHistory = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/chat/history/${user.id}`);
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
      const response = await fetch("http://127.0.0.1:8000/api/chat/generative", {
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

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col animate-in fade-in duration-500 max-w-5xl mx-auto">
      
      <div className="mb-4 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Bot className="h-8 w-8 text-primary" />
          AI Assistant
        </h1>
        <p className="text-muted-foreground mt-1">
          Instant answers for post-treatment care and clinic information.
        </p>
      </div>

      <Card className="flex-1 flex flex-col shadow-sm overflow-hidden border-primary/20 bg-background relative">
        
        {/* Chat Area */}
        <CardContent 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth bg-slate-50/50 dark:bg-slate-900/20"
        >
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
            >
              <Avatar className={`h-8 w-8 shrink-0 ${msg.sender === "bot" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <AvatarFallback>
                  {msg.sender === "bot" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className={`space-y-1 ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                <div 
                  className={`px-4 py-3 rounded-2xl ${
                    msg.sender === "user" 
                      ? "bg-primary text-primary-foreground rounded-tr-sm" 
                      : "bg-white dark:bg-slate-800 border shadow-sm rounded-tl-sm text-foreground"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
                <p className={`text-[10px] text-muted-foreground px-1 flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.timestamp}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 max-w-[85%] mr-auto items-center animate-in fade-in slide-in-from-bottom-2">
              <Avatar className="h-8 w-8 shrink-0 bg-primary text-primary-foreground">
                <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
              </Avatar>
              <div className="bg-white dark:bg-slate-800 border shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </CardContent>

        <Separator />

        {/* Input Area */}
        <CardFooter className="p-4 flex flex-col gap-3 bg-card shrink-0 rounded-b-xl pb-16 lg:pb-12">
          
          {/* Quick-Query Context Tags */}
          <div className="flex gap-2 overflow-x-auto w-full pb-2 scrollbar-hide">
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            {quickQueries.map((query, i) => (
              <button 
                key={i}
                onClick={() => handleSend(query)}
                disabled={isLoading}
                className="whitespace-nowrap px-3 py-1 bg-muted/50 hover:bg-muted border rounded-full text-xs font-medium text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {query}
              </button>
            ))}
          </div>

          <div className="flex w-full gap-2 items-end relative">
            <div className="relative flex-1 bg-background border rounded-lg shadow-sm focus-within:ring-1 focus-within:ring-primary overflow-hidden">
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
                className="w-full min-h-[60px] max-h-[150px] bg-transparent border-0 resize-none p-3 text-sm focus:outline-none focus:ring-0 disabled:opacity-50"
                rows={1}
              />
            </div>
            <Button 
              size="icon" 
              className="h-[60px] w-[60px] shrink-0 rounded-lg shadow-sm"
              onClick={() => handleSend(input)}
              disabled={!input.trim() || isLoading}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          
        </CardFooter>

        {/* Safety Disclaimer Footnote (Absolute Fixed) */}
        <div className="absolute bottom-0 left-0 right-0 bg-red-50 dark:bg-red-950/30 border-t border-red-200 dark:border-red-900/50 p-2 px-4 flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-500 shrink-0" />
          <p className="text-[10px] sm:text-xs text-red-800 dark:text-red-400 font-medium text-center leading-tight max-w-4xl">
            The AI assistant handles text-based post-treatment care informational guidance only. It is incapable of reading/diagnosing medical images (X-rays) or rendering predictive medical decisions. For all urgent clinical concerns, consult your dentist immediately.
          </p>
        </div>

      </Card>
    </div>
  );
}
