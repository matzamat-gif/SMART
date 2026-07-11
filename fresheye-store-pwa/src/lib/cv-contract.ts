// The seam between the app and CV. Everything CV-dependent lives behind this contract,
// so the scaffold is CV-independent: swap the stub implementation, screens don't change.
export interface CVDetection {
  class: string;
  count: number;
  confidence: number; // 0..1
}
export interface CVDetectionResult {
  detections: CVDetection[];
  stub: boolean;
}
