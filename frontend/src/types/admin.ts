export type AdherenceStatus = "likely" | "high_risk" | "moderate";

export interface PatientAdherenceRecord {
  id: string;
  name: string;
  branch: "Fairview Branch" | "Pasig Branch" | "San Juan Branch";
  procedureType: string;
  status: AdherenceStatus;
  riskScore: number; // 0 to 100
  phone: string;
  lastVisit: string;
  nextAppointment: string;
  aiTriageSummary?: string;
  unverifiedReceiptAmount?: number;
  billingStatus?: "verified" | "pending" | "none";
}

export interface TelemetryCardData {
  title: string;
  value: string | number;
  trend: string;
  trendDirection: "up" | "down" | "neutral";
  description: string;
  iconName: string;
  riskLevel?: "low" | "high" | "neutral";
}
