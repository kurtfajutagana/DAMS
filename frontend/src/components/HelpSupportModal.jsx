import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  HelpCircle,
  AlertTriangle,
  CalendarCheck,
  ShieldAlert,
} from "lucide-react";

export default function HelpSupportModal({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-7">
        <DialogHeader className="text-left pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-600/10 text-red-600 flex items-center justify-center font-bold">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                Help & Contact Support
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 mt-0.5">
                Teeth Talk Dental Clinic Client Care & Support Center
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-3">
          {/* Emergency Notice */}
          <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-red-950">Dental Emergency Hotline</h4>
              <p className="text-xs text-red-800 mt-1 leading-relaxed">
                If you are experiencing severe bleeding, acute swelling, or sudden dental trauma, please contact our emergency response desk immediately:
              </p>
              <div className="mt-2 flex flex-wrap gap-2 items-center">
                <a
                  href="tel:+639178338482"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition"
                >
                  <Phone className="h-3.5 w-3.5" /> +63 917 833 8482 (24/7 Hotline)
                </a>
                <span className="text-xs font-medium text-red-700">or call (02) 8632-1234</span>
              </div>
            </div>
          </div>

          {/* Branch Contact Details */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Our Clinic Branches & Operating Hours
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Pasig Branch */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold bg-slate-900 text-white px-2 py-0.5 rounded uppercase">
                    Pasig (Main)
                  </span>
                  <p className="text-xs font-semibold text-slate-900 mt-2 flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
                    Pasig City Center
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1 flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-slate-500" />
                    +63 917 833 8482
                  </p>
                </div>
                <p className="text-[10px] text-slate-600 mt-3 pt-2 border-t border-slate-200 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-500" /> Mon - Sat: 9:00 AM - 5:00 PM
                </p>
              </div>

              {/* Fairview Branch */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold bg-slate-900 text-white px-2 py-0.5 rounded uppercase">
                    Fairview Branch
                  </span>
                  <p className="text-xs font-semibold text-slate-900 mt-2 flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
                    Fairview, Quezon City
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1 flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-slate-500" />
                    +63 918 844 9593
                  </p>
                </div>
                <p className="text-[10px] text-slate-600 mt-3 pt-2 border-t border-slate-200 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-500" /> Mon - Sat: 9:00 AM - 5:00 PM
                </p>
              </div>

              {/* San Juan Branch */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold bg-slate-900 text-white px-2 py-0.5 rounded uppercase">
                    San Juan Branch
                  </span>
                  <p className="text-xs font-semibold text-slate-900 mt-2 flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
                    Greenhills, San Juan
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1 flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-slate-500" />
                    +63 919 855 0604
                  </p>
                </div>
                <p className="text-[10px] text-slate-600 mt-3 pt-2 border-t border-slate-200 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-500" /> Mon - Sat: 9:00 AM - 5:00 PM
                </p>
              </div>
            </div>
          </div>

          {/* Electronic Support */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              General Inquiries & Portal Support
            </h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="mailto:support@teethtalk.com"
                className="flex-1 p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-100 transition flex items-center gap-3"
              >
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Email Support</p>
                  <p className="text-[11px] text-slate-600 font-medium">support@teethtalk.com</p>
                </div>
              </a>

              <div className="flex-1 p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CalendarCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Online AI Assistant</p>
                  <p className="text-[11px] text-slate-600 font-medium">Available 24/7 on your dashboard</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
          <Button onClick={onClose} variant="outline" className="px-5 text-xs font-bold">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

