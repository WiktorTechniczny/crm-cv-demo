export type ToastKind = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  kind: ToastKind;
  title: string;
  body?: string;
}

export type Notify = (message: Omit<ToastMessage, "id">) => void;
