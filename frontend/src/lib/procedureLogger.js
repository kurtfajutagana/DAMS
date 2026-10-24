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

  const payload = {
    timestamp: new Date().toISOString(),
    component,
    action,
    severity
  };

  // 1. Attempt client-side Supabase insert first
  let directInsertSuccess = false;
  try {
    const { error } = await supabase.from("audit_logs").insert(payload);
    if (!error) {
      directInsertSuccess = true;
    }
  } catch (err) {
    // Catch any connection/protocol errors
  }

  // 2. If blocked by RLS or direct insert failed, dispatch via backend service endpoint
  if (!directInsertSuccess) {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      await fetch(`${apiUrl}/api/patient/log-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          component,
          action,
          severity
        })
      });
    } catch (apiErr) {
      console.warn("Failed to dispatch procedure notification to backend:", apiErr);
    }
  }

  // 3. Broadcast real-time event via Supabase Realtime broadcast channel
  try {
    const alertPayload = {
      ...payload,
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
    };

    const existing = supabase.getChannels().find(
      c => c.topic === "realtime:clinic_realtime_alerts" || c.topic === "clinic_realtime_alerts"
    );

    if (existing && (existing.state === "joined" || existing.state === "joined")) {
      existing.send({
        type: "broadcast",
        event: "clinic_alert",
        payload: alertPayload
      });
    } else {
      const channel = supabase.channel("clinic_realtime_alerts");
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "clinic_alert",
            payload: alertPayload
          });
          // Remove temporary sender channel so it never blocks listener registration
          setTimeout(() => {
            try {
              supabase.removeChannel(channel);
            } catch (_) {}
          }, 1000);
        }
      });
    }
  } catch (bcErr) {
    // Ignore broadcast errors
  }
}

/**
 * 1. Notification for new appointment booking (Online / Guest / Front-desk)
 */
export async function notifyAppointmentBooked({
  patientName = "Patient",
  service = "General Consultation",
  doctorName = "",
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

  const doctorPart = doctorName ? ` with ${doctorName}` : "";

  await logProcedureNotification({
    component: "Appointment Scheduling",
    action: `New appointment requested for ${patientName} (${service})${doctorPart} on ${formattedDate} at ${branch}`,
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
  doctorName = "",
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
  const doctorPart = doctorName ? ` with ${doctorName}` : "";

  await logProcedureNotification({
    component: "Appointment Scheduling",
    action: `Appointment for ${patientName} (${service})${doctorPart} rescheduled by ${rescheduledBy} from ${prevStr} to ${newStr}${reasonText}`,
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
  doctorName = "",
  cancelledBy = "Patient",
  reason = ""
}) {
  const reasonText = reason ? `. Reason: "${reason}"` : "";
  const doctorPart = doctorName ? ` with ${doctorName}` : "";

  await logProcedureNotification({
    component: "Appointment Scheduling",
    action: `Appointment for ${patientName} (${service})${doctorPart} was cancelled/declined by ${cancelledBy}${reasonText}`,
    severity: "warning"
  });
}
