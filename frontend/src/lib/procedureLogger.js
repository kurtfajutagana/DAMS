import { supabase } from "./supabase";

/**
 * Inserts a procedure event notification into the system audit_logs table,
 * which is streamed live to staff and clinic admins via Supabase Realtime.
 */
export async function logProcedureNotification({
  component = "Clinical Procedure",
  action,
  severity = "info"
}) {
  if (!action) return;
  try {
    const payload = {
      timestamp: new Date().toISOString(),
      component,
      action,
      severity
    };
    await supabase.from("audit_logs").insert(payload);
  } catch (err) {
    console.warn("Failed to dispatch procedure notification to audit_logs:", err);
  }
}

/**
 * 1. Notification for new appointment booking (Online / Guest / Front-desk)
 */
export async function notifyAppointmentBooked({
  patientName = "Patient",
  service = "General Consultation",
  appointmentDate,
  branch = "Pasig Branch"
}) {
  const formattedDate = appointmentDate
    ? new Date(appointmentDate).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "Upcoming date";

  await logProcedureNotification({
    component: "Appointment Scheduling",
    action: `New appointment requested for ${patientName} (${service}) on ${formattedDate} at ${branch}`,
    severity: "info"
  });
}

/**
 * 2. Notification for appointment confirmation / approval by staff
 */
export async function notifyAppointmentConfirmed({
  patientName = "Patient",
  service = "General Consultation",
  doctorName,
  appointmentDate
}) {
  const formattedDate = appointmentDate
    ? new Date(appointmentDate).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "Scheduled date";

  const doctorLabel = doctorName ? ` with ${doctorName}` : "";

  await logProcedureNotification({
    component: "Appointment Scheduling",
    action: `Appointment confirmed: ${patientName} (${service})${doctorLabel} on ${formattedDate}`,
    severity: "success"
  });
}

/**
 * 3. Notification for appointment reschedule
 */
export async function notifyAppointmentRescheduled({
  patientName = "Patient",
  service = "General Consultation",
  prevDate,
  newDate,
  rescheduledBy = "Staff",
  reason = ""
}) {
  const prevStr = prevDate
    ? new Date(prevDate).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "Previous date";
  const newStr = newDate
    ? new Date(newDate).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "New date";
  const reasonText = reason ? `. Reason: "${reason}"` : "";

  await logProcedureNotification({
    component: "Appointment Scheduling",
    action: `Appointment for ${patientName} (${service}) rescheduled by ${rescheduledBy} from ${prevStr} to ${newStr}${reasonText}`,
    severity: "info"
  });
}

/**
 * 4. Notification when patient queues in / checks in for procedure
 */
export async function notifyPatientQueuedIn({
  patientName = "Patient",
  service = "General Consultation",
  doctorName,
  isWalkIn = false,
  queueCode = ""
}) {
  const tag = queueCode ? `[${queueCode}] ` : "";
  const prefix = isWalkIn ? "Walk-in patient" : "Patient";
  const docText = doctorName ? ` (Assigned to ${doctorName})` : "";

  await logProcedureNotification({
    component: "Queue Management",
    action: `${prefix} ${patientName} checked into queue (Waiting) ${tag}for ${service}${docText}`,
    severity: "info"
  });
}

/**
 * 5. Notification when patient is called into procedure ("in procedure" / "in chair")
 */
export async function notifyPatientInProcedure({
  patientName = "Patient",
  service = "General Consultation",
  doctorName,
  queueCode = ""
}) {
  const tag = queueCode ? `[${queueCode}] ` : "";
  const docText = doctorName ? `${doctorName} called in` : "Patient is now in chair for";

  await logProcedureNotification({
    component: "Clinical Procedure",
    action: `In Procedure: ${docText} ${patientName} ${tag}for ${service}`,
    severity: "info"
  });
}

/**
 * 6. Notification when clinical procedure / treatment is completed
 */
export async function notifyProcedureCompleted({
  patientName = "Patient",
  service = "General Consultation",
  doctorName,
  queueCode = ""
}) {
  const tag = queueCode ? `[${queueCode}] ` : "";
  const docText = doctorName ? `by ${doctorName}` : "";

  await logProcedureNotification({
    component: "Clinical Procedure",
    action: `Procedure completed: ${service} finished for ${patientName} ${tag}${docText} (Ready for checkout & billing)`,
    severity: "success"
  });
}

/**
 * 7. Notification for appointment cancellation or rejection
 */
export async function notifyAppointmentCancelled({
  patientName = "Patient",
  service = "General Consultation",
  cancelledBy = "Patient",
  reason = ""
}) {
  const reasonText = reason ? `. Reason: "${reason}"` : "";

  await logProcedureNotification({
    component: "Appointment Scheduling",
    action: `Appointment for ${patientName} (${service}) was cancelled/rejected by ${cancelledBy}${reasonText}`,
    severity: "warning"
  });
}
