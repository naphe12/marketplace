export type FraudReason = {
  code: string;
  score: number;
  description: string;
};


export type FraudLabel =
  | "CONFIRMED_FRAUD"
  | "FALSE_POSITIVE"
  | "LEGIT"
  | "UNCERTAIN";


export type FraudRiskLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";


export type FraudAction =
  | "ALLOW"
  | "MONITOR"
  | "REVIEW"
  | "BLOCK";


export type FraudSource =
  | "RULE"
  | "ML"
  | "ANOMALY"
  | "GRAPH";