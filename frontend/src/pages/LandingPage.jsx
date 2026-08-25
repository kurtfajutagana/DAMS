import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Stethoscope,
  Calendar as CalendarIcon,
  Sparkles,
  Clock,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Award,
  CheckCircle2,
  MessageSquare,
  CreditCard,
  ChevronRight,
  User,
  UserCheck,
  Star,
  Heart,
  ArrowRight,
  Activity,
  Bell,
  Wallet,
  Smartphone,
  Laptop,
  HelpCircle,
  X,
  Send,
  Zap,
  Check,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { format, parseISO } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import { cn } from "../lib/utils";

export default function LandingPage() {
  const navigate = useNavigate();

  const openLoginModal = () => navigate("/login");
  const openSignupModal = () => navigate("/signup");

  // State for Branch Filter/Selection
  const [activeBranch, setActiveBranch] = useState("all");
  const [selectedService, setSelectedService] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Booking Form Draft State
  const [bookingBranch, setBookingBranch] = useState("pasig");
  const [bookingService, setBookingService] = useState("Consultation");
  const [bookingDoctor, setBookingDoctor] = useState("any");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("09:00 AM");

  // Multi-step Wizard Progress State (1: Patient Info, 2: Service & Schedule)
  const [bookingStep, setBookingStep] = useState(1);

  // Guest Patient Information State (for direct clinic confirmation)
  const [bookingFirstName, setBookingFirstName] = useState("");
  const [bookingLastName, setBookingLastName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");

  // AI Chat Simulation State
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "ai",
      text: "Hello! 👋 Welcome to Teeth Talk Dental Clinic. This is a limited preview of our AI Assistant. Ask me about services, branch locations, or booking! Log in to fully use our AI Chatbot services."
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isAiWidgetOpen, setIsAiWidgetOpen] = useState(false);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Branches Data
  const branches = [
    {
      id: "pasig",
      name: "Pasig Branch",
      tagline: "Flagship Clinic & Surgical Suite",
      address: "2nd Floor, Capitol Commons Plaza, Meralco Ave, Pasig City",
      hours: "Mon - Sat: 9:00 AM - 7:00 PM | Sun: 10:00 AM - 5:00 PM",
      phone: "(02) 8632-1188",
      mobile: "+63 917 888 1234",
      email: "pasig@teethtalk.ph",
      mapUrl: "https://maps.google.com/?q=Capitol+Commons+Pasig",
      features: ["Digital 3D Intraoral Scanner", "Full Panoramic X-Ray", "Surgical Suite", "VIP Lounge"],
      badge: "Flagship Branch"
    },
    {
      id: "fairview",
      name: "Fairview Branch",
      tagline: "Family & Pediatric Care Specialist Center",
      address: "G/F Regalado Center, Regalado Ave, Fairview, Quezon City",
      hours: "Mon - Sat: 9:00 AM - 6:30 PM | Sun: 10:00 AM - 4:00 PM",
      phone: "(02) 8935-4422",
      mobile: "+63 917 888 5678",
      email: "fairview@teethtalk.ph",
      mapUrl: "https://maps.google.com/?q=Regalado+Center+Fairview",
      features: ["Kids Dental Room", "Gentle Ultrasonic Cleansing", "Teeth Whitening Studio", "Weekend Appointments"],
      badge: "Family & Kids Specialty"
    },
    {
      id: "sanjuan",
      name: "San Juan Branch",
      tagline: "Cosmetic & Orthodontic Excellence Center",
      address: "3rd Floor, Greenhills Town Center, Annapolis St, San Juan City",
      hours: "Mon - Sat: 9:00 AM - 7:00 PM | Sun: Closed",
      phone: "(02) 8724-9900",
      mobile: "+63 917 888 9012",
      email: "sanjuan@teethtalk.ph",
      mapUrl: "https://maps.google.com/?q=Greenhills+San+Juan",
      features: ["Advanced Ortho Suite", "Implantology Care", "Veneers & Aesthetics", "Digital Smile Design"],
      badge: "Cosmetic & Braces Hub"
    }
  ];

  // Services Offered Data
  const services = [
    {
      id: "consultation",
      title: "Consultation & Comprehensive Oral Examination",
      category: "General",
      icon: Stethoscope,
      description: "Thorough assessment of teeth, gums, and jaw alignment using digital intraoral inspection and custom treatment planning.",
      duration: "30 - 45 mins",
      priceRange: "₱500 - ₱1,000",
      benefits: ["Detailed digital diagnostic report", "Personalized oral health roadmap", "Early cavity detection"]
    },
    {
      id: "cleaning",
      title: "Professional Oral Cleanings (Scaling & Polishing)",
      category: "Preventive",
      icon: Sparkles,
      description: "Painless ultrasonic plaque and tartar removal paired with polishing to protect against gum disease and maintain fresh breath.",
      duration: "45 mins",
      priceRange: "₱1,200 - ₱2,500",
      benefits: ["Removes stubborn plaque & stains", "Fluoride enamel treatment", "Helps prevent gingivitis"]
    },
    {
      id: "extraction",
      title: "Dental Extractions",
      category: "Surgical",
      icon: Heart,
      description: "Gentle and pain-free removal of unsavable or severely crowded teeth, including complex surgical wisdom tooth extractions.",
      duration: "45 - 90 mins",
      priceRange: "₱1,500 - ₱7,500",
      benefits: ["Local pain-free anesthesia", "Post-op care instructions & meds", "Minimally invasive techniques"]
    },
    {
      id: "root-canal",
      title: "Root Canal Therapy (Endodontics)",
      category: "Restorative",
      icon: Activity,
      description: "Preserve your natural tooth by removing pulp infection, thoroughly disinfecting root canals, and sealing with precision restoration.",
      duration: "60 - 90 mins",
      priceRange: "₱6,000 - ₱12,000",
      benefits: ["Relieves deep toothaches", "Saves natural tooth structure", "Prevents jaw infection spread"]
    },
    {
      id: "crowns",
      title: "Dental Crowns & Bridges",
      category: "Restorative",
      icon: ShieldCheck,
      description: "Custom-crafted ceramic or zirconia crowns to reinforce weak teeth or bridge empty gaps for a natural, seamless bite.",
      duration: "2 Visits",
      priceRange: "₱8,000 - ₱18,000",
      benefits: ["100% natural shade matching", "High durability & strength", "Restores chewing efficiency"]
    },
    {
      id: "implants",
      title: "Dental Implants & Restorative Surgery",
      category: "Specialty",
      icon: Award,
      description: "Permanent titanium implant posts topped with natural-looking prosthetic crowns, offering lifelong stability.",
      duration: "Multi-phase",
      priceRange: "₱45,000 - ₱85,000",
      benefits: ["Feels & looks like natural teeth", "Prevents bone loss", "Lifelong restoration solution"]
    },
    {
      id: "ortho-adjustment",
      title: "Monthly Orthodontic Adjustments",
      category: "Orthodontics",
      icon: CalendarIcon,
      description: "Routine bracket & wire adjustments, aligner progress checks, rubber band changes, and bite progression monitoring.",
      duration: "30 mins",
      priceRange: "₱1,500 - ₱3,000 / visit",
      benefits: ["Continuous alignment tracking", "Free wire repair & elastic replacement", "Digital smile transformation logging"]
    }
  ];

  // Payment Methods Data
  const paymentMethods = [
    { name: "Cash", type: "In-Clinic Counter", desc: "Settled at front desk after checkup", icon: Wallet, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
    { name: "Credit / Debit Cards", type: "Front Desk Terminal", desc: "Visa, Mastercard, JCB at counter", icon: CreditCard, color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
    { name: "GCash QR", type: "Front Desk Scan", desc: "Scan QR code at front desk", icon: Smartphone, color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300" },
    { name: "PayMaya (Maya)", type: "Front Desk Scan", desc: "Scan QR at clinic counter", icon: Smartphone, color: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300" },
    { name: "Zero Online Prepayment", type: "Pay Post-Checkup", desc: "Free booking, pay after evaluation", icon: Laptop, color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" }
  ];

  // FAQ Items
  const faqList = [
    {
      q: "Do you accept walk-in patients or is booking required?",
      a: "Walk-in patients are always welcome at our Pasig, Fairview, and San Juan branches! However, we strongly recommend booking online through our platform to lock in your preferred time slot and enjoy priority doctor availability without waiting."
    },
    {
      q: "Who is the lead dentist and founder of Teeth Talk Dental Clinic?",
      a: "Teeth Talk Dental Clinic was founded by Dr. Meg Cyrene Arellano, a renowned dental practitioner dedicated to gentle, high-quality, and affordable oral care. Dr. Arellano and her handpicked team of dental specialists oversee operations across all branches."
    },
    {
      q: "How does the 24/7 AI-powered chat support help patients?",
      a: "Our smart AI assistant is available 24/7 on the website to answer dental health queries, explain treatment procedures, check real-time doctor availability across branches, and assist with instant booking or rescheduling."
    },
    {
      q: "Why is payment settled at the physical front desk instead of online during booking?",
      a: "Booking online reserves your preferred schedule slot with zero upfront payment required! All payment channels (Cash, GCash, Cards, PayMaya) are completed at our physical front desk after your doctor performs an initial physical checkup. This ensures pricing is 100% accurate because your clinical needs may evolve during examination — for example, if a patient initially requests a tooth extraction, but doctor evaluation shows that a tooth-saving dental filling (pasta) or root canal therapy is a better approach. You only pay for the finalized, agreed-upon treatment solution after your checkup."
    },
    {
      q: "How do monthly orthodontic adjustments work for braces patients?",
      a: "Orthodontic patients can schedule their monthly adjustments at any of our branches. Our digital platform sends automated reminders via SMS and portal alerts so you never miss a routine wire check or bracket tightening."
    },
    {
      q: "How can I access my digital prescriptions and treatment records?",
      a: "Once registered, both online and walk-in patients gain access to their secure Patient Portal where digital prescriptions, dosage instructions, treatment histories, and upcoming schedules are available anytime."
    }
  ];

  // Patient Reviews / Testimonials
  const testimonials = [
    {
      quote: "Dr. Meg Cyrene Arellano and her team made my wisdom tooth extraction completely painless! The Fairview branch staff were so caring, and I loved getting SMS reminders for my meds.",
      name: "Alyssa Mendoza",
      branch: "Fairview Branch",
      rating: 5,
      service: "Wisdom Tooth Extraction"
    },
    {
      quote: "The 24/7 AI chatbot helped me book an emergency root canal consultation at the Pasig branch within minutes on a Friday night. Exceptional web platform and top-tier clinical service!",
      name: "Mark Anthony Santos",
      branch: "Pasig Branch",
      rating: 5,
      service: "Root Canal Therapy"
    },
    {
      quote: "I've been getting my monthly braces adjustments at San Juan branch. Transparent pricing, no long waiting lines, and GCash payment makes it super convenient for busy professionals like me.",
      name: "Camille Reyes",
      branch: "San Juan Branch",
      rating: 5,
      service: "Orthodontic Adjustments"
    }
  ];

  // Quick Chat Prompts
  const samplePrompts = [
    "What are your operating hours in Pasig?",
    "How much is dental cleaning?",
    "Do you accept GCash and PayMaya?",
    "How do I schedule an orthodontic adjustment?"
  ];

  // AI Chat Simulation Handler
  const handleSendMessage = (textToSend) => {
    const query = textToSend || chatInput;
    if (!query.trim()) return;

    // Add User Message
    const updatedMessages = [...chatMessages, { sender: "user", text: query }];
    setChatMessages(updatedMessages);
    if (!textToSend) setChatInput("");

    // Simulate AI Response
    setTimeout(() => {
      let reply = "Thank you for asking! Dr. Meg Cyrene Arellano and our team offer comprehensive dental care across our Pasig, Fairview, and San Juan branches. You can book an appointment online or walk in anytime!";
      const q = query.toLowerCase();

      if (q.includes("pasig")) {
        reply = "📍 Our Pasig Branch is located at 2nd Floor, Capitol Commons Plaza, Meralco Ave. Open Mon-Sun 10 AM - 5 PM. Phone: (02) 8632-1188.";
      } else if (q.includes("fairview")) {
        reply = "📍 Our Fairview Branch is located at G/F Regalado Center, Fairview, QC. Open Mon-Sun 10 AM - 5 PM. Phone: (02) 8935-4422.";
      } else if (q.includes("san juan")) {
        reply = "📍 Our San Juan Branch is located at 3rd Floor, Greenhills Town Center, Annapolis St. Open Mon-Sun 10 AM - 5 PM. Phone: (02) 8724-9900.";
      } else if (q.includes("cleaning") || q.includes("price") || q.includes("cost") || q.includes("how much")) {
        reply = "✨ Professional Oral Cleaning ranges from ₱1,200 - ₱2,500. Consultations start at ₱500! We offer clear, transparent pricing with no hidden fees.";
      } else if (q.includes("payment") || q.includes("gcash") || q.includes("paymaya") || q.includes("card") || q.includes("desk")) {
        reply = "💳 Payments are done at our physical front desk after your doctor checkup! We accept Cash, GCash, Cards, and PayMaya. We don't charge online in advance because your treatment plan may change during consultation (e.g. from extraction to pasta or root canal), ensuring you only pay for the finalized treatment!";
      } else if (q.includes("ortho") || q.includes("braces") || q.includes("adjustment")) {
        reply = "🦷 Monthly Orthodontic Adjustments are ₱1,500 - ₱3,000 per visit. You can easily schedule your monthly visits online to skip queue lines!";
      }

      reply += "\n\n⚠️ Please log in to fully use our AI Chatbot services for booking and detailed assistance!";

      setChatMessages((prev) => [...prev, { sender: "ai", text: reply }]);
    }, 600);
  };

  const handleNextStep = (e) => {
    if (e) e.preventDefault();
    if (!bookingFirstName.trim() || !bookingLastName.trim() || !bookingPhone.trim() || !bookingEmail.trim()) {
      alert("Please fill in all patient contact details (First Name, Last Name, Phone Number, and Email) before proceeding to schedule selection.");
      return;
    }
    setBookingStep(2);
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (!bookingDate) {
      alert("Please select your preferred appointment date.");
      return;
    }

    const bookingDraft = {
      firstName: bookingFirstName.trim(),
      lastName: bookingLastName.trim(),
      phone: bookingPhone.trim(),
      email: bookingEmail.trim(),
      branch: bookingBranch,
      service: bookingService,
      doctor: bookingDoctor,
      date: bookingDate,
      time: bookingTime,
    };

    // Store reservation draft so it gets attached to signup
    localStorage.setItem("pendingBookingDraft", JSON.stringify(bookingDraft));
    setIsBookingModalOpen(false);
    setBookingStep(1); // Reset to step 1 for future bookings

    // Redirect to standalone signup page
    navigate('/signup');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans selection:bg-teal-500 selection:text-white">
      {/* ---------------- NAVIGATION HEADER ---------------- */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/85 dark:bg-slate-900/85 border-b border-slate-200/80 dark:border-slate-800 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Brand Name - Official Teeth Talk Dental Clinic Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="flex aspect-square h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 p-1 border border-slate-900 shadow-md overflow-hidden">
              <img src="/teeth_talk_logo.png" alt="Teeth Talk Dental Clinic Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">Teeth Talk</span>
                <span className="text-[9px] font-extrabold bg-slate-950 border border-slate-800 text-teal-400 px-1.5 py-0.5 rounded uppercase">CLINIC</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block -mt-0.5">
                Dental Clinic Platform
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#about" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">About Us</a>
            <a href="#branches" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Branches</a>
            <a href="#services" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Services</a>
            <a href="#system" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Web Platform</a>
            <a href="#payments" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Payments</a>
            <a href="#faq" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">FAQ</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={openLoginModal}
              className="text-slate-700 dark:text-slate-200 hover:text-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs"
            >
              Patient Portal / Login
            </Button>
            <Button
              onClick={() => setIsBookingModalOpen(true)}
              className="bg-slate-950 hover:bg-slate-900 text-white shadow-md font-semibold text-xs rounded-xl px-4 py-2"
            >
              <CalendarIcon className="w-4 h-4 mr-1.5 text-teal-400" />
              Book Appointment
            </Button>
          </div>
        </div>
      </header>

      {/* ---------------- MAIN CONTENT ---------------- */}
      <main>
        {/* ---------------- HERO SECTION ---------------- */}
        <section id="hero" className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-teal-50/60 via-slate-50 to-white dark:from-slate-900/60 dark:via-slate-950 dark:to-slate-950">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-400/10 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <Badge variant="outline" className="px-4 py-1.5 rounded-full border-teal-200 dark:border-teal-800 bg-white/80 dark:bg-slate-900/80 text-teal-800 dark:text-teal-300 font-semibold text-xs sm:text-sm shadow-sm inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Quality & Affordable Dental Care • Founded by Dr. Meg Cyrene Arellano
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                Your Brightest, Healthiest{" "}
                <span className="bg-gradient-to-r from-teal-600 via-cyan-600 to-emerald-600 bg-clip-text text-transparent">
                  Smile Begins Here
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Welcome to <strong>Teeth Talk Dental Clinic</strong>. We combine compassionate, world-class oral healthcare with a 24/7 web-based patient platform for online and walk-in patients across <strong>Pasig</strong>, <strong>Fairview</strong>, and <strong>San Juan</strong>.
              </p>

              {/* Action CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Button
                  size="lg"
                  onClick={() => setIsBookingModalOpen(true)}
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold text-base px-8 py-6 rounded-xl shadow-lg shadow-teal-600/25 transition-all hover:scale-[1.02]"
                >
                  <CalendarIcon className="w-5 h-5 mr-2.5" />
                  Book Your Appointment Now
                </Button>

                <a href="#system">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-slate-300 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-base px-6 py-6 rounded-xl"
                  >
                    <Laptop className="w-5 h-5 mr-2 text-teal-600 dark:text-teal-400" />
                    Explore Platform Features
                  </Button>
                </a>
              </div>

              {/* Trust Badges Bar */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">15,000+</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Happy Patients</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">3 Branches</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pasig, Fairview, San Juan</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                    <Star className="w-5 h-5 fill-amber-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">4.9 / 5.0</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Patient Satisfaction</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">24/7 AI</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Smart Support</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Glow backdrop */}
                <div className="absolute -inset-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-3xl blur-xl opacity-30 dark:opacity-40 animate-pulse" />

                {/* Main Hero Card Container */}
                <div className="relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-2xl overflow-hidden">
                  <div className="relative h-72 sm:h-80 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src="/teeth_talk_hero.png"
                      alt="Teeth Talk Dental Clinic"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    
                    {/* Floating Doctor Badge */}
                    <div className="absolute bottom-4 left-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl p-3 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-teal-500 bg-teal-100">
                          <img src="/dr_meg_arellano.png" alt="Dr. Meg Cyrene Arellano" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Dr. Meg Cyrene Arellano</p>
                          <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">Founder & Head Dentist</p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5">
                        Accepting Patients
                      </Badge>
                    </div>
                  </div>

                  {/* Feature Highlights Grid */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                      <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Real-Time Booking</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Zero wait queues</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Flexible Payments</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">GCash, Cards, Cash</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- ABOUT US SECTION ---------------- */}
      <section id="about" className="py-20 bg-white dark:bg-slate-900 border-t border-b border-slate-200/60 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <Badge variant="outline" className="px-3 py-1 rounded-full border-teal-300 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold text-xs uppercase tracking-wider">
              About Teeth Talk
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Gentle Care, Modern Science, Exceptional Smiles
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed">
              Founded by <strong>Dr. Meg Cyrene Arellano</strong>, Teeth Talk Dental Clinic started with a clear vision: to revolutionize community dental care in the Philippines by offering compassionate treatments, state-of-the-art diagnostic technology, and transparent pricing for every patient.
            </p>
          </div>

          {/* Founder Spotlight Card */}
          <div className="mt-12 rounded-3xl bg-gradient-to-br from-teal-900 via-slate-900 to-cyan-950 text-white p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="grid md:grid-cols-12 gap-8 items-center relative z-10">
              <div className="md:col-span-4 flex justify-center">
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden border-4 border-teal-400/40 shadow-2xl bg-teal-900">
                  <img src="/dr_meg_arellano.png" alt="Dr. Meg Cyrene Arellano" className="w-full h-full object-cover" />
                </div>
              </div>

              <div className="md:col-span-8 space-y-4 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-400/30">
                  <Award className="w-3.5 h-3.5" /> Founder & Lead Dental Practitioner
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white">Dr. Meg Cyrene Arellano</h3>
                <p className="text-teal-100/90 text-base sm:text-lg italic leading-relaxed font-light">
                  &ldquo;Every patient deserves a healthy, confident smile without fear or financial strain. Our goal at Teeth Talk is to combine advanced dental expertise with a gentle touch, backed by digital convenience that respects our patients&apos; time.&rdquo;
                </p>
                <div className="pt-2 flex flex-wrap gap-4 text-xs font-medium text-teal-200/80">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-teal-400" /> General & Cosmetic Dentistry</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-teal-400" /> Endodontics & Surgery</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-teal-400" /> Patient-First Philosophy</span>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------- BRANCHES SHOWCASE ---------------- */}
          <div id="branches" className="mt-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
              <div>
                <Badge variant="outline" className="px-3 py-1 rounded-full border-cyan-300 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-semibold text-xs uppercase tracking-wider">
                  Our Strategic Locations
                </Badge>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                  Serving You Across 3 Modern Branches
                </h3>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 md:mt-0 max-w-md">
                Equipped with identical high standards of care, sterilization protocols, and digital record syncing.
              </p>
            </div>

            {/* Branches Filter Buttons */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <Button
                variant={activeBranch === "all" ? "default" : "outline"}
                onClick={() => setActiveBranch("all")}
                className={activeBranch === "all" ? "bg-teal-600 hover:bg-teal-700 text-white font-semibold" : "font-semibold"}
              >
                All Branches (3)
              </Button>
              {branches.map((b) => (
                <Button
                  key={b.id}
                  variant={activeBranch === b.id ? "default" : "outline"}
                  onClick={() => setActiveBranch(b.id)}
                  className={activeBranch === b.id ? "bg-teal-600 hover:bg-teal-700 text-white font-semibold" : "font-semibold"}
                >
                  {b.name}
                </Button>
              ))}
            </div>

            {/* Branches Cards Grid */}
            <div className="grid md:grid-cols-3 gap-8">
              {branches
                .filter((b) => activeBranch === "all" || activeBranch === b.id)
                .map((b) => (
                  <Card key={b.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group">
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 text-xs font-bold px-3 py-1">
                          {b.badge}
                        </Badge>
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
                          <MapPin className="w-4 h-4" />
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                          {b.name}
                        </h4>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{b.tagline}</p>
                      </div>

                      <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                          <span>{b.address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                          <span>{b.hours}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                          <span>{b.phone} • {b.mobile}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                          <span>{b.email}</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Branch Highlights</p>
                        <div className="flex flex-wrap gap-1.5">
                          {b.features.map((feat, i) => (
                            <span key={i} className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md font-medium">
                              {feat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <a href={b.mapUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1">
                        View Map <ExternalLink className="w-3 h-3" />
                      </a>
                      <Button
                        size="sm"
                        onClick={() => {
                          setBookingBranch(b.id);
                          setIsBookingModalOpen(true);
                        }}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg"
                      >
                        Book Here
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- SERVICES OFFERED SECTION ---------------- */}
      <section id="services" className="py-20 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <Badge variant="outline" className="px-3 py-1 rounded-full border-teal-300 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold text-xs uppercase tracking-wider">
              Comprehensive Oral Care
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Services Offered at Teeth Talk
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg">
              From routine dental cleanings to advanced root canal treatments and monthly orthodontic adjustments, our experienced dental practitioners deliver gentle, high-quality care.
            </p>
          </div>

          {/* Services Grid */}
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((s) => {
              const IconComp = s.icon;
              return (
                <Card key={s.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl transition-all duration-300 p-6 flex flex-col justify-between group">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-all">
                        <IconComp className="w-6 h-6" />
                      </div>
                      <Badge variant="secondary" className="text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {s.category}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        {s.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                        {s.description}
                      </p>
                    </div>

                    <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Est. Duration:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{s.duration}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Fee Range:</span>
                        <span className="font-bold text-teal-600 dark:text-teal-400">{s.priceRange}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {s.benefits.map((b, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                          <Check className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedService(s)}
                      className="text-xs font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                    >
                      View Details
                    </button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setBookingService(s.title);
                        setIsBookingModalOpen(true);
                      }}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg"
                    >
                      Book Service
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------- SYSTEM OVERVIEW SECTION ---------------- */}
      <section id="system" className="py-20 bg-white dark:bg-slate-900 border-t border-b border-slate-200/60 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <Badge variant="outline" className="px-3 py-1 rounded-full border-cyan-300 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-semibold text-xs uppercase tracking-wider">
              Smart Patient Management Platform
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Empowering Both Online & Walk-In Patients
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg">
              Our custom web-based platform automates scheduling, prescription tracking, and treatment reminders — offering a effortless digital dental experience 24/7.
            </p>
          </div>

          {/* 5 System Features Grid */}
          <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1: 24/7 AI Chat Support */}
            <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-6 space-y-4 shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center justify-center font-bold">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">24/7 AI-Powered Chat Support</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Instant answers to your dental health questions, branch operating hours, preparation guidelines, and booking help anytime, day or night.
              </p>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold">
                  <Zap className="w-3.5 h-3.5" /> Instant Smart Assistance
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Simulates doctor guidance for symptoms and guides walk-in vs online booking.
                </p>
              </div>
            </Card>

            {/* Feature 2: Real-time Online Appointment Booking */}
            <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-6 space-y-4 shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 flex items-center justify-center font-bold">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Real-Time Doctor Availability</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Browse live schedule slots per dentist and branch (Pasig, Fairview, San Juan) and lock in your appointment without waiting on hold.
              </p>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Live Schedule Sync
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Prevents double-booking and lets you pick preferred dentists.
                </p>
              </div>
            </Card>

            {/* Feature 3: Digital Prescription Tracking */}
            <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-6 space-y-4 shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 flex items-center justify-center font-bold">
                <Laptop className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Digital Prescription Tracking</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                No more lost paper receipts! Access your e-prescriptions, dosage schedules, duration, and dentist instructions on your patient portal.
              </p>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Secure E-Record Storage
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Fully HIPAA-compliant e-prescriptions accessible on phone or PC.
                </p>
              </div>
            </Card>

            {/* Feature 4: Automated Treatment Reminders */}
            <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-6 space-y-4 shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center font-bold">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Automated Treatment Reminders</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Automated SMS, email, and portal notifications for upcoming dental appointments, monthly orthodontic adjustments, and follow-up care.
              </p>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                  <Clock className="w-3.5 h-3.5" /> Multi-Channel Alerts
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Never miss an ortho tune-up or post-treatment cleaning.
                </p>
              </div>
            </Card>

            {/* Feature 5: Physical Front Desk Payment & Post-Checkup Billing */}
            <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-6 space-y-4 shadow-sm hover:shadow-md transition-all md:col-span-2 lg:col-span-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Physical Front Desk Payment & Post-Checkup Billing</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                  Online booking reserves your slot with <strong>zero advance payment</strong>. All payment channels (Cash, GCash, Cards, PayMaya) are completed at our physical front desk after your doctor performs an initial physical checkup.
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold">
                  <ShieldCheck className="w-4 h-4 shrink-0" /> Clinical Flexibility Guarantee
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  If your doctor finds during checkup that a different approach is better (e.g., saving a tooth with a dental filling/pasta or root canal instead of an extraction), your final cost is accurately adjusted at the desk before treatment.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs px-3 py-1 font-bold">
                  💵 Front Desk Cash
                </Badge>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-xs px-3 py-1 font-bold">
                  💳 Visa / Mastercard Terminal
                </Badge>
                <Badge className="bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 text-xs px-3 py-1 font-bold">
                  📱 GCash QR Code
                </Badge>
                <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 text-xs px-3 py-1 font-bold">
                  📱 PayMaya (Maya) QR
                </Badge>
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs px-3 py-1 font-bold">
                  ✨ 0 Online Prepayment
                </Badge>
              </div>
            </Card>
          </div>

          {/* Interactive AI Chat Simulator Embedded in System Overview */}
          <div className="mt-16 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-2xl border border-teal-800/40">
            <div className="max-w-3xl mx-auto text-center space-y-3">
              <Badge className="bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-semibold px-3 py-1">
                Interactive Interactive AI Chat Demo
              </Badge>
              <h3 className="text-2xl sm:text-3xl font-extrabold">Try our 24/7 AI Patient Assistant Now</h3>
              <p className="text-slate-300 text-sm">
                Click a sample question below or type your query to test how our smart AI assistant answers patient inquiries instantly!
              </p>
            </div>

            <div className="mt-8 max-w-2xl mx-auto bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
              {/* Simulator Chat Header */}
              <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-200">Teeth Talk AI Assistant (Live Demo)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">24/7 Active</span>
              </div>

              {/* Chat Message Thread */}
              <div className="p-4 h-64 overflow-y-auto space-y-3 text-xs">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                        msg.sender === "user"
                          ? "bg-teal-600 text-white rounded-br-none"
                          : "bg-slate-800 text-slate-200 border border-slate-700/60 rounded-bl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Sample Prompts */}
              <div className="px-4 py-2 bg-slate-900/60 border-t border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] text-slate-400 font-bold shrink-0">Sample Prompts:</span>
                {samplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="text-[10px] bg-slate-800 hover:bg-teal-900/80 text-teal-300 px-2.5 py-1 rounded-full border border-slate-700 shrink-0 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 bg-slate-900 flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Ask about clinic hours, cleaning prices, GCash..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
                <Button
                  size="sm"
                  onClick={() => handleSendMessage()}
                  className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs px-4"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- PAYMENT OPTIONS SECTION ---------------- */}
      <section id="payments" className="py-16 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <Badge variant="outline" className="px-3 py-1 rounded-full border-teal-300 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold text-xs uppercase tracking-wider">
              Transparent & Convenient Billing
            </Badge>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Physical Front Desk Payment Channels</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Booking online is 100% free with zero advance payment. All transactions are comfortably settled at our physical front desk after your consultation.
            </p>
          </div>

          {/* In-Clinic Payment & Clinical Examination Rationale Banner */}
          <div className="mt-6 bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-emerald-500/10 border border-teal-200 dark:border-teal-800/80 rounded-2xl p-5 sm:p-6 text-left max-w-4xl mx-auto shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-teal-600 text-white shrink-0 shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-2 text-xs sm:text-sm">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Why Payment is Done at the Physical Front Desk
                </h4>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  At Teeth Talk Dental Clinic, we <strong>do not require online advance payments</strong> when you reserve an appointment online. All payment channels are processed conveniently at our <strong>physical front desk</strong> after your initial physical examination with the doctor.
                </p>
                <div className="text-slate-600 dark:text-slate-300 leading-relaxed bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-xl border border-teal-200/60 dark:border-slate-800 space-y-1">
                  <span className="font-bold text-teal-700 dark:text-teal-300 block">💡 Clinical Examination Rationale:</span>
                  <span>
                    During your in-person checkup, the dentist evaluates your exact dental condition. For example, a patient may initially request a tooth extraction, but upon physical examination the doctor may find that saving the tooth with a <strong>dental filling (pasta)</strong> or <strong>root canal therapy</strong> is a better approach. Because the final treatment solution and pricing cannot be finalized prior to a full checkup, settling payment at the front desk guarantees you only pay for the exact treatment you receive.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {paymentMethods.map((pm, i) => {
              const PMIcon = pm.icon;
              return (
                <div key={i} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-2 hover:border-teal-500 transition-colors">
                  <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center ${pm.color}`}>
                    <PMIcon className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">{pm.name}</h4>
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    {pm.type}
                  </Badge>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{pm.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------- PATIENT TESTIMONIALS ---------------- */}
      <section className="py-20 bg-white dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <Badge variant="outline" className="px-3 py-1 rounded-full border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold text-xs uppercase tracking-wider">
              Patient Experiences
            </Badge>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Loved by Patients Across Metro Manila</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <Card key={idx} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-lg transition-all">
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{t.name}</p>
                    <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">{t.branch}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-300">
                    {t.service}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- FREQUENTLY ASKED QUESTIONS (FAQ) ---------------- */}
      <section id="faq" className="py-20 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-12">
            <Badge variant="outline" className="px-3 py-1 rounded-full border-teal-300 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold text-xs uppercase tracking-wider">
              Got Questions?
            </Badge>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {faqList.map((faq, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                  className="w-full px-6 py-5 text-left font-bold text-slate-900 dark:text-white flex items-center justify-between gap-4 text-sm sm:text-base hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                    {faq.q}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${openFaqIndex === i ? "rotate-180" : ""}`} />
                </button>

                {openFaqIndex === i && (
                  <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CALL TO ACTION BANNER ---------------- */}
      <section className="py-16 bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Ready for a Brighter, Healthier Smile?</h2>
          <p className="text-teal-100 max-w-xl mx-auto text-base">
            Book an appointment online in under 60 seconds or visit any of our 3 branches in Pasig, Fairview, and San Juan today!
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Button
              size="lg"
              onClick={() => setIsBookingModalOpen(true)}
              className="bg-white text-teal-900 hover:bg-slate-100 font-bold px-8 py-6 rounded-xl shadow-xl"
            >
              <CalendarIcon className="w-5 h-5 mr-2 text-teal-600" />
              Book Appointment Now
            </Button>
            <Button
              size="lg"
              onClick={openLoginModal}
              className="bg-teal-950/80 hover:bg-teal-900 text-white border-2 border-white/40 font-bold px-8 py-6 rounded-xl shadow-xl backdrop-blur-md transition-all hover:scale-105 flex items-center gap-2"
            >
              <UserCheck className="w-5 h-5 text-teal-300" />
              Sign In to Patient Portal
            </Button>
          </div>
        </div>
      </section>
      </main>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="bg-slate-950 text-slate-400 py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
            {/* Column 1: Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 p-1 border border-slate-800 flex items-center justify-center overflow-hidden">
                  <img src="/teeth_talk_logo.png" alt="Teeth Talk Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight">Teeth Talk</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Premier dental care clinic founded by <strong>Dr. Meg Cyrene Arellano</strong>. Serving Pasig, Fairview, and San Juan with modern dentistry and 24/7 web platform support.
              </p>
              <p className="text-[11px] text-teal-400 font-semibold">Emergency Line: (02) 8632-1188</p>
            </div>

            {/* Column 2: Branches */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Our Branches</h4>
              <ul className="space-y-2 text-xs">
                <li><strong className="text-slate-200">Pasig:</strong> Capitol Commons Plaza, Meralco Ave</li>
                <li><strong className="text-slate-200">Fairview:</strong> Regalado Center, Regalado Ave, QC</li>
                <li><strong className="text-slate-200">San Juan:</strong> Greenhills Town Center, Annapolis St</li>
              </ul>
            </div>

            {/* Column 3: Quick Links */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Quick Links</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#about" className="hover:text-teal-400 transition-colors">About Dr. Meg Cyrene Arellano</a></li>
                <li><a href="#services" className="hover:text-teal-400 transition-colors">Services Offered</a></li>
                <li><a href="#system" className="hover:text-teal-400 transition-colors">24/7 AI Platform</a></li>
                <li><a href="#payments" className="hover:text-teal-400 transition-colors">Payment Methods</a></li>
                <li><Link to="/login" className="hover:text-teal-400 transition-colors">Patient Portal Login</Link></li>
                <li><Link to="/signup" className="hover:text-teal-400 transition-colors">New Patient Registration</Link></li>
              </ul>
            </div>

            {/* Column 4: Hours & Emergency */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Clinic Hours</h4>
              <p className="text-xs leading-relaxed">
                Mon - Sat: 9:00 AM - 7:00 PM<br />
                Sunday: 10:00 AM - 5:00 PM (Pasig & Fairview)<br />
                Walk-ins & Online Bookings Welcome 24/7
              </p>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>© {new Date().getFullYear()} Teeth Talk Dental Clinic. All Rights Reserved. Founded by Dr. Meg Cyrene Arellano.</p>
            <div className="flex gap-6">
              <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
              <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
              <span className="hover:text-slate-400 cursor-pointer">HIPAA Compliance</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ---------------- FLOATING 24/7 AI ASSISTANT WIDGET ---------------- */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isAiWidgetOpen ? (
          <button
            onClick={() => setIsAiWidgetOpen(true)}
            className="group flex items-center gap-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-5 py-3.5 rounded-full shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-white/20"
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            </div>
            <span className="text-xs font-bold tracking-wide">24/7 AI Assistant</span>
          </button>
        ) : (
          <div className="w-80 sm:w-96 bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col h-[480px]">
            {/* Widget Header */}
            <div className="p-4 bg-gradient-to-r from-teal-700 to-cyan-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">Teeth Talk AI Support</h4>
                  <p className="text-[10px] text-teal-100">Always online for patients</p>
                </div>
              </div>
              <button
                onClick={() => setIsAiWidgetOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Widget Messages */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3 text-xs bg-slate-950">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${msg.sender === "user" ? "bg-teal-600 text-white rounded-br-none" : "bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none"}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Widget Input */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ask AI anything..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
              <Button
                size="sm"
                onClick={() => handleSendMessage()}
                className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs px-3"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ---------------- BOOK APPOINTMENT MODAL (2-STEP PROGRESS WIZARD) ---------------- */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Modal Header & Step Bar */}
            <div className="p-6 bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Book an Appointment</h3>
                  <p className="text-xs text-teal-100">
                    {bookingStep === 1
                      ? "Step 1 of 2: Fill in Patient Identity & Contact Details"
                      : "Step 2 of 2: Choose Service, Doctor & Preferred Schedule"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsBookingModalOpen(false);
                    setBookingStep(1);
                  }}
                  className="text-white/80 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Bar Steps Indicator */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs font-bold">
                <div
                  onClick={() => setBookingStep(1)}
                  className={`py-2 px-3 rounded-xl cursor-pointer transition-all border flex items-center justify-center gap-1.5 ${
                    bookingStep === 1
                      ? "bg-white text-teal-900 border-white shadow-md"
                      : "bg-teal-700/60 text-teal-100 border-teal-500/40 hover:bg-teal-700/80"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>1. Patient Info</span>
                  {bookingStep > 1 && <span className="text-emerald-500 font-bold">✓</span>}
                </div>
                <div
                  onClick={() => {
                    if (bookingFirstName && bookingLastName && bookingPhone && bookingEmail) {
                      setBookingStep(2);
                    }
                  }}
                  className={`py-2 px-3 rounded-xl transition-all border flex items-center justify-center gap-1.5 ${
                    bookingStep === 2
                      ? "bg-white text-teal-900 border-white shadow-md cursor-default"
                      : "bg-teal-700/60 text-teal-100 border-teal-500/40 cursor-pointer hover:bg-teal-700/80"
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>2. Schedule & Service</span>
                </div>
              </div>
            </div>

            {/* STEP 1: PATIENT INFORMATION FORM */}
            {bookingStep === 1 ? (
              <form onSubmit={handleNextStep} className="p-6 space-y-4">
                <div className="p-3 bg-teal-50 dark:bg-teal-950/60 rounded-2xl border border-teal-200 dark:border-teal-800/80 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  👋 <strong>First-Time or Guest Patient?</strong> Please complete your contact info below so our front-desk team can verify your appointment when you visit the clinic.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Juan"
                      value={bookingFirstName}
                      onChange={(e) => setBookingFirstName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Dela Cruz"
                      value={bookingLastName}
                      onChange={(e) => setBookingLastName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-teal-600" /> Mobile / Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0917 123 4567"
                    value={bookingPhone}
                    onChange={(e) => setBookingPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block font-medium">Used for SMS reminders & clinic front-desk check-in</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-teal-600" /> Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="juan@example.com"
                    value={bookingEmail}
                    onChange={(e) => setBookingEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block font-medium">Used for booking confirmation & portal account linking</span>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsBookingModalOpen(false);
                      setBookingStep(1);
                    }}
                    className="text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold text-xs rounded-xl px-5 flex items-center gap-1.5"
                  >
                    Next: Choose Service & Schedule <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            ) : (
              /* STEP 2: SERVICE & SCHEDULE FORM */
              <form onSubmit={handleBookingSubmit} className="p-6 space-y-4">
                {/* Patient Summary Badge */}
                <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-teal-600" /> {bookingFirstName} {bookingLastName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      📱 {bookingPhone} | ✉️ {bookingEmail}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBookingStep(1)}
                    className="text-[11px] text-teal-600 dark:text-teal-400 font-bold hover:underline"
                  >
                    Edit Info
                  </button>
                </div>

                {/* Select Branch */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
                    1. Select Clinic Branch
                  </label>
                  <select
                    value={bookingBranch}
                    onChange={(e) => setBookingBranch(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  >
                    <option value="pasig">Pasig Branch - Capitol Commons</option>
                    <option value="fairview">Fairview Branch - Regalado Center</option>
                    <option value="sanjuan">San Juan Branch - Greenhills Town Center</option>
                  </select>
                </div>

                {/* Select Service */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
                    2. Select Treatment Service
                  </label>
                  <select
                    value={bookingService}
                    onChange={(e) => setBookingService(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.title}>
                        {s.title} ({s.priceRange})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Preferred Doctor / System Recommendation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase flex items-center justify-between">
                    <span>3. Preferred Dentist</span>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">1st-Time Friendly</span>
                  </label>
                  <select
                    value={bookingDoctor}
                    onChange={(e) => setBookingDoctor(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  >
                    <option value="any">✨ Let System Choose (Recommended for 1st-Time Patients)</option>
                    <option value="dr-meg-arellano">Dr. Meg Cyrene Arellano (Founder & Head Dentist)</option>
                    <option value="dr-kevin-reyes">Dr. Kevin Reyes (Orthodontics & Braces Specialist)</option>
                    <option value="dr-sarah-lim">Dr. Sarah Lim (Pediatric & Preventive Care)</option>
                    <option value="dr-mark-santos">Dr. Mark Anthony Santos (Oral Surgery & Root Canal)</option>
                  </select>
                </div>

                {/* Preferred Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
                      4. Preferred Date
                    </label>
                    <Popover modal={true}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800",
                            !bookingDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {bookingDate ? format(parseISO(bookingDate), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                        <Calendar
                          mode="single"
                          selected={bookingDate ? parseISO(bookingDate) : undefined}
                          onSelect={(date) => setBookingDate(date ? format(date, "yyyy-MM-dd") : "")}
                          disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                          initialFocus
                          captionLayout="dropdown"
                          fromYear={new Date().getFullYear()}
                          toYear={new Date().getFullYear() + 5}
                        />
                      </PopoverContent>
                    </Popover>
                    <span className="text-[10px] text-slate-400 mt-1 block font-medium">🚫 Past dates disabled</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
                      5. Time (Working Hours)
                    </label>
                    <select
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                    >
                      <option value="10:00 AM">10:00 AM (Morning Slot)</option>
                      <option value="11:00 AM">11:00 AM (Morning Slot)</option>
                      <option value="01:00 PM">01:00 PM (Afternoon Slot)</option>
                      <option value="02:00 PM">02:00 PM (Afternoon Slot)</option>
                      <option value="03:00 PM">03:00 PM (Afternoon Slot)</option>
                      <option value="04:00 PM">04:00 PM (Late Afternoon)</option>
                    </select>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 mt-1 block font-semibold">⏰ Hours: 10 AM - 5 PM</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBookingStep(1)}
                    className="text-xs font-semibold"
                  >
                    ← Back to Patient Info
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold text-xs rounded-xl px-5"
                  >
                    Confirm & Book Appointment ✨
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ---------------- SERVICE DETAILS MODAL ---------------- */}
      {selectedService && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase">{selectedService.category}</span>
              </div>
              <button onClick={() => setSelectedService(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{selectedService.title}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{selectedService.description}</p>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Estimated Duration:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedService.duration}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fee Range:</span>
                <span className="font-bold text-teal-600 dark:text-teal-400">{selectedService.priceRange}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white mb-2">Key Clinical Benefits:</p>
              <div className="space-y-1.5">
                {selectedService.benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setSelectedService(null)} className="text-xs font-semibold">
                Close
              </Button>
              <Button
                onClick={() => {
                  setBookingService(selectedService.title);
                  setSelectedService(null);
                  setIsBookingModalOpen(true);
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl"
              >
                Book This Service
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- AUTH MODAL REMOVED ---------------- */}
    </div>
  );
}
