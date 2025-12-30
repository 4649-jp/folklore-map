export type HistoryEntry = {
  id: string;
  timestamp: string;
  user_id: string;
  changes: Record<string, unknown>;
  previous: Record<string, unknown>;
};

export type SpotHistory = {
  spot_id: string;
  history: HistoryEntry[];
};

export type FieldChange = {
  field: string;
  previous: unknown;
  current: unknown;
  type: "text" | "enum" | "array";
};
