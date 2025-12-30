export type SpotListItem = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  icon_type:
    | "ONI"
    | "KITSUNE"
    | "DOG"
    | "DRAGON"
    | "TEMPLE"
    | "SHRINE"
    | "ANIMAL"
    | "GENERIC"
    | "TANUKI"
    | "RABBIT"
    | "OX"
    | "HORSE"
    | "BIRD"
    | "TENGU"
    | "CROW_TENGU"
    | "YATAGARASU"
    | "TURTLE"
    | "FISH"
    | "WHALE"
    | "UMIBOUZU"
    | "KAPPA"
    | "KAWAAKAGO"
    | "SUIKO"
    | "KODAMA";
  status: "DRAFT" | "REVIEW" | "PUBLISHED";
  updated_at: string;
};

export type SpotDetail = SpotListItem & {
  description: string;
  address?: string | null;
  maps_query?: string | null;
  era_hint?: string | null;
  created_by: string;
  sources: Array<{
    id: string;
    type: "URL" | "BOOK" | "INTERVIEW";
    citation: string;
    url?: string | null;
  }>;
};
