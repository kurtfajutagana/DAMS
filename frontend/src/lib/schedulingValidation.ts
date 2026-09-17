import { format, parseISO } from "date-fns";

export const STANDARD_CLINIC_SLOTS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM"
];

export interface SchedulingValidationResult {
  isValid: boolean;
  reason?: "same_branch_same_day" | "cross_branch_buffer" | "time_conflict" | "dentist_double_booking" | "invalid_input";
  message?: string;
  conflictAppointment?: any;
}

export interface ValidateAppointmentOptions {
  targetDate: string; // YYYY-MM-DD
  targetTime: string; // e.g. "11:00 AM" or "14:00"
  targetBranchId?: string | null;
  targetBranchName?: string | null;
  targetDentistId?: string | null;
  dentistName?: string | null;
  existingAppointments?: any[]; // The patient's existing bookings
  allClinicAppointments?: any[]; // All active clinic bookings (to verify dentist collision)
  excludeAppointmentId?: string | null;
}

export function parseTimeTo24h(timeStr: string): string {
  if (!timeStr) return "09:00";
  const trimmed = timeStr.trim();
  if (!trimmed.includes("AM") && !trimmed.includes("PM")) {
    const parts = trimmed.split(":");
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    }
    return trimmed;
  }
  const [time, modifier] = trimmed.split(" ");
  let [hours, minutes] = time.split(":");
  let h = parseInt(hours, 10);
  if (modifier === "PM" && h < 12) h += 12;
  if (modifier === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

export function formatTimeTo12h(timeStr: string): string {
  if (!timeStr) return "09:00 AM";
  const trimmed = timeStr.trim();
  if (trimmed.includes("AM") || trimmed.includes("PM")) {
    return trimmed;
  }
  const [hStr, mStr = "00"] = trimmed.split(":");
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return "09:00 AM";
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${mStr.padStart(2, "0")} ${ampm}`;
}

export function normalizeBranchName(name?: string | null): string {
  if (!name) return "";
  return name.toLowerCase().replace(/\s+branch$/i, "").trim();
}

/**
 * Validates if an appointment is eligible for patient self-service rescheduling.
 * Enforces the 2-hour cutoff rule: appointments less than 2 hours away require calling reception.
 */
export function isWithinRescheduleCutoff(appointmentDateStr: string, cutoffHours: number = 2): {
  canReschedule: boolean;
  hoursRemaining: number;
} {
  if (!appointmentDateStr) return { canReschedule: false, hoursRemaining: 0 };
  const aptDate = new Date(appointmentDateStr);
  const now = new Date();
  const diffMs = aptDate.getTime() - now.getTime();
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  return {
    canReschedule: hoursRemaining >= cutoffHours,
    hoursRemaining: Math.max(0, hoursRemaining)
  };
}

/**
 * Calculates occupied time slots for a specific dentist on a given date.
 * Returns an array of standard slot strings (e.g. ["10:00 AM", "02:00 PM"]) that are already booked.
 */
export function getOccupiedSlots(options: {
  targetDate: string; // YYYY-MM-DD
  targetDentistId?: string | null;
  allClinicAppointments: any[];
  excludeAppointmentId?: string | null;
}): string[] {
  const { targetDate, targetDentistId, allClinicAppointments = [], excludeAppointmentId } = options;
  if (!targetDate || !targetDentistId || targetDentistId === "any") return [];

  const occupiedSlots: string[] = [];

  const activeAppointments = allClinicAppointments.filter(apt => {
    if (excludeAppointmentId && apt.id === excludeAppointmentId) return false;
    if (apt.dentist_id !== targetDentistId) return false;
    const status = (apt.status || "").toLowerCase();
    return !["cancelled", "missed"].includes(status);
  });

  for (const slot of STANDARD_CLINIC_SLOTS) {
    const slot24 = parseTimeTo24h(slot);
    const slotTimeMs = new Date(`${targetDate}T${slot24}:00`).getTime();

    const isBooked = activeAppointments.some(apt => {
      if (!apt.appointment_date) return false;
      const aptDate = new Date(apt.appointment_date);
      const aptDateStr = format(aptDate, "yyyy-MM-dd");
      if (aptDateStr !== targetDate) return false;

      const aptTimeMs = aptDate.getTime();
      const diffMins = Math.abs(slotTimeMs - aptTimeMs) / (60 * 1000);
      return diffMins < 50; // Overlaps within the 1-hour session
    });

    if (isBooked) {
      occupiedSlots.push(slot);
    }
  }

  return occupiedSlots;
}

/**
 * Comprehensive multi-party appointment scheduling validator:
 * 1. Dentist Double-Booking Protection: Prevents two patients from booking the same doctor within 55 minutes.
 * 2. Same-Day Same-Branch: Patient cannot hold multiple active bookings at the same branch on the same day.
 * 3. Cross-Branch Travel Buffer: Patient bookings in different branches on the same day must be >= 3.5 hours apart.
 * 4. Patient Overlap Protection: Patient appointments must not overlap within 60 minutes.
 */
export function validateAppointmentScheduling(options: ValidateAppointmentOptions): SchedulingValidationResult {
  const {
    targetDate,
    targetTime,
    targetBranchId,
    targetBranchName,
    targetDentistId,
    dentistName,
    existingAppointments = [],
    allClinicAppointments = [],
    excludeAppointmentId
  } = options;

  if (!targetDate || !targetTime) {
    return {
      isValid: false,
      reason: "invalid_input",
      message: "Please specify both appointment date and time slot."
    };
  }

  const time24 = parseTimeTo24h(targetTime);
  const targetDateTimeString = `${targetDate}T${time24}:00`;
  const targetDateTime = new Date(targetDateTimeString);
  const targetTimeMs = targetDateTime.getTime();

  if (isNaN(targetTimeMs)) {
    return {
      isValid: false,
      reason: "invalid_input",
      message: "Invalid appointment date or time specified."
    };
  }

  // 1. DENTIST DOUBLE-BOOKING CHECK (Cross-patient clinic level)
  if (targetDentistId && targetDentistId !== "any" && allClinicAppointments.length > 0) {
    const dentistAppointments = allClinicAppointments.filter(apt => {
      if (excludeAppointmentId && apt.id === excludeAppointmentId) return false;
      if (apt.dentist_id !== targetDentistId) return false;
      const status = (apt.status || "").toLowerCase();
      return !["cancelled", "missed"].includes(status);
    });

    for (const apt of dentistAppointments) {
      if (!apt.appointment_date) continue;
      const aptDate = new Date(apt.appointment_date);
      const aptDateStr = format(aptDate, "yyyy-MM-dd");
      if (aptDateStr !== targetDate) continue;

      const aptTimeMs = aptDate.getTime();
      const diffMins = Math.abs(targetTimeMs - aptTimeMs) / (60 * 1000);

      if (diffMins < 50) {
        const docDisplay = dentistName ? `Dr. ${dentistName.replace(/^Dr\.\s*/i, "")}` : "The selected dentist";
        const aptTimeDisplay = aptDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        return {
          isValid: false,
          reason: "dentist_double_booking",
          conflictAppointment: apt,
          message: `${docDisplay} is already booked for another patient at ${aptTimeDisplay} on this day. Please choose another time slot or select another available dentist.`
        };
      }
    }
  }

  // 2. PATIENT'S OWN APPOINTMENT COLLISION CHECKS
  const normalizedTargetBranch = normalizeBranchName(targetBranchName);
  const cleanTargetBranchDisplay = targetBranchName 
    ? (targetBranchName.replace(/\s+branch$/i, "") + " Branch")
    : "the selected branch";

  const activePatientAppointments = existingAppointments.filter(apt => {
    if (excludeAppointmentId && apt.id === excludeAppointmentId) return false;
    const status = (apt.status || "").toLowerCase();
    return !["cancelled", "missed"].includes(status);
  });

  for (const apt of activePatientAppointments) {
    if (!apt.appointment_date) continue;
    const aptDate = new Date(apt.appointment_date);
    const aptTimeMs = aptDate.getTime();
    if (isNaN(aptTimeMs)) continue;

    const aptDateStr = format(aptDate, "yyyy-MM-dd");
    const isSameDate = aptDateStr === targetDate;

    const existingBranchName = apt.branches?.branch_name || apt.branch || "";
    const normalizedExistingBranch = normalizeBranchName(existingBranchName);
    const cleanExistingBranchDisplay = existingBranchName 
      ? (existingBranchName.replace(/\s+branch$/i, "") + " Branch")
      : "Clinic Branch";

    const isSameBranch = Boolean(
      (targetBranchId && apt.branch_id && targetBranchId === apt.branch_id) ||
      (normalizedTargetBranch && normalizedExistingBranch && normalizedTargetBranch === normalizedExistingBranch)
    );

    const aptTimeDisplay = aptDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const aptDateDisplay = format(aptDate, "EEE, MMM d, yyyy");
    const aptService = apt.service_requested || "General Consultation";

    // RULE 1: Same Day + Same Branch Restriction
    if (isSameDate && isSameBranch) {
      return {
        isValid: false,
        reason: "same_branch_same_day",
        conflictAppointment: apt,
        message: `You already have an active appointment scheduled at ${cleanExistingBranchDisplay} on ${aptDateDisplay} (${aptTimeDisplay} - ${aptService}). A patient cannot book multiple appointments on the same day at the same branch. Please choose another date or reschedule your existing booking.`
      };
    }

    // RULE 2: Same Day + Cross-Branch Travel Buffer (minimum 3.5 hours = 210 minutes required)
    if (isSameDate && !isSameBranch) {
      const diffMinutes = Math.abs(targetTimeMs - aptTimeMs) / (60 * 1000);
      const MIN_CROSS_BRANCH_MINUTES = 210; // 3.5 hours

      if (diffMinutes < MIN_CROSS_BRANCH_MINUTES) {
        const gapHours = (diffMinutes / 60).toFixed(1);
        return {
          isValid: false,
          reason: "cross_branch_buffer",
          conflictAppointment: apt,
          message: `Inter-Branch Travel Buffer Required: You have an appointment at ${cleanExistingBranchDisplay} on ${aptDateDisplay} at ${aptTimeDisplay}. Due to treatment duration and travel time across clinic branches, same-day appointments in different branches must be scheduled at least 3.5 hours apart (currently only ${diffMinutes < 60 ? `${Math.round(diffMinutes)} mins` : `${gapHours} hrs`} apart). Please select a later time slot or another date.`
        };
      }
    }

    // RULE 3: Overlapping Time Window Protection (within 60 minutes)
    const generalDiffMinutes = Math.abs(targetTimeMs - aptTimeMs) / (60 * 1000);
    if (generalDiffMinutes < 60) {
      return {
        isValid: false,
        reason: "time_conflict",
        conflictAppointment: apt,
        message: `Schedule Conflict: You already have an appointment on ${aptDateDisplay} around ${aptTimeDisplay}. Please select another time slot.`
      };
    }
  }

  return { isValid: true };
}
