export type FlagListItem = {
  id: string;
  spot_id: string;
  spot_title: string;
  reason: "INAPPROPRIATE" | "WRONG_INFO" | "DISCRIMINATION" | "PRIVACY";
  note?: string | null;
  status: "OPEN" | "CLOSED";
  created_at: string;
  created_by: string;
};
