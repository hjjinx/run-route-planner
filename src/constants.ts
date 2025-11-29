export type LatLng = { lat: number; lng: number };
export type RouteSegment = {
  path: LatLng[];
  distance: number;
  elevation: number;
};

export const ELEVATION_CACHE = new Map<string, number>();