import { format, parseISO } from "date-fns";

export interface SchedulingValidationResult {
  isValid: boolean;
  reason?: "same_branch_same_day" | "cross_branch_buffer" | "time_conflict" | "invalid_input";
  message?: string;
  conflictAppointment?: any;
}

export interface ValidateAppointmentOptions {
  targetDate: string; // YYYY-MM-DD
  targetTime: string; // e.g. "11:00 AM" or "14:00"
  targetBranchId?: string | null;
  targetBranchName?: string | null;
  existingAppointments: any[];
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

export function normalizeBranchName(name?: string | null): string {
  if (!name) return "";
  return name.toLowerCase().replace(/\s+branch$/i, "").trim();
}

/**
 * Validates realistic appointment scheduling rules:
 * 1. Same-Day Same-Branch: Cannot book multiple active appointments on the same day at the same branch.
 * 2. Cross-Branch Travel Buffer: Appointments in different branches on the same day must be at least 3.5 hours apart.
 * 3. Overlap Protection: Appointments must not overlap within 60 minutes.
 */
export function validateAppointmentScheduling(options: ValidateAppointmentOptions): SchedulingValidationResult {
  const {
    targetDate,
    targetTime,
    targetBranchId,
    targetBranchName,
    existingAppointments = [],
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

  const normalizedTargetBranch = normalizeBranchName(targetBranchName);
  const cleanTargetBranchDisplay = targetBranchName 
    ? (targetBranchName.replace(/\s+branch$/i, "") + " Branch")
    : "the selected branch";

  // Filter out cancelled, missed, or the appointment currently being rescheduled
  const activeAppointments = existingAppointments.filter((apt) => {
    if (excludeAppointmentId && apt.id === excludeAppointmentId) return false;
    const status = (apt.status || "").toLowerCase();
    return !["cancelled", "missed"].includes(status);
  });

  for (const apt of activeAppointments) {
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

