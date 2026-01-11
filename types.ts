
export interface BusStop {
  id: string;
  name: string;
  township: string;
  landmark?: string;
  coordinates?: { lat: number; lng: number };
}

export interface BusLine {
  id: string;
  number: string;
  color: string;
  route: string[]; // List of Stop names/IDs
  startPoint: string;
  endPoint: string;
  description: string;
  estimatedTripDuration: string;
  hasYPS?: boolean;
  fare?: string;
  hours?: string;
  frequency?: string;
}

export interface RouteResult {
  busLines: BusLine[];
  transfers: number;
  path: string[];
}

export type ViewState = 'home' | 'bus-list' | 'ai-assistant' | 'nearby' | 'bus-detail';
export type Language = 'mm' | 'en';
