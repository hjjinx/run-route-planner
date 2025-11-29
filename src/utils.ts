import type { LatLng, RouteSegment } from "./constants";
import { ELEVATION_CACHE } from "./constants";

const calculateDistanceKm = (p1: LatLng, p2: LatLng) => {
  const R = 6371; // Earth radius in km
  const dLat = (p2.lat - p1.lat) * (Math.PI / 180);
  const dLon = (p2.lng - p1.lng) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(p1.lat * (Math.PI/180)) * Math.cos(p2.lat * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};


export const calculateElevationGain = async (inputPoints: LatLng[]): Promise<number> => {
  if (inputPoints.length === 0) return 0;

  try {
    const densePoints: LatLng[] = [];
    const MAX_SEGMENT_KM = 0.1; // 100 meters
    
    for (let i = 0; i < inputPoints.length - 1; i++) {
      const p1 = inputPoints[i];
      const p2 = inputPoints[i+1];
      densePoints.push(p1);
      
      const dist = calculateDistanceKm(p1, p2);
      if (dist > MAX_SEGMENT_KM) {
        const steps = Math.ceil(dist / MAX_SEGMENT_KM);
        const latStep = (p2.lat - p1.lat) / steps;
        const lngStep = (p2.lng - p1.lng) / steps;
        for (let j = 1; j < steps; j++) {
          densePoints.push({ lat: p1.lat + latStep * j, lng: p1.lng + lngStep * j });
        }
      }
    }
    densePoints.push(inputPoints[inputPoints.length - 1]);

    const pointsToFetch: LatLng[] = [];
    const cacheKey = (p: LatLng) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;

    densePoints.forEach(p => {
      if (!ELEVATION_CACHE.has(cacheKey(p))) {
        pointsToFetch.push(p);
      }
    });

    if (pointsToFetch.length > 0) {
      const MAX_FETCH_POINTS = 400; 
      let fetchList = pointsToFetch;
      
      if (pointsToFetch.length > MAX_FETCH_POINTS) {
          const step = Math.ceil(pointsToFetch.length / MAX_FETCH_POINTS);
          fetchList = pointsToFetch.filter((_, index) => index % step === 0);
      }

      const chunkSize = 100;
      const chunks: any[] = [];
      for (let i = 0; i < fetchList.length; i += chunkSize) {
        chunks.push(fetchList.slice(i, i + chunkSize));
      }

      const requests = chunks.map(chunk => {
        const lats = chunk.map(p => p.lat.toFixed(5)).join(',');
        const lngs = chunk.map(p => p.lng.toFixed(5)).join(',');
        return fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`)
          .then(res => res.json());
      });

      const responses = await Promise.all(requests);
      
      responses.forEach((data, i) => {
        if (data && data.elevation) {
          const currentChunk = chunks[i];
          data.elevation.forEach((elev: number, j: number) => {
            if (currentChunk[j]) {
                ELEVATION_CACHE.set(cacheKey(currentChunk[j]), elev);
            }
          });
        }
      });
    }

    let gain = 0;
    let prevElev: number | undefined = undefined;

    densePoints.forEach((p) => {
      const elev = ELEVATION_CACHE.get(cacheKey(p));
      
      if (elev !== undefined) {
        if (prevElev !== undefined) {
            const diff = elev - prevElev;
            if (diff > 0) gain += diff;
        }
        prevElev = elev;
      }
    });

    return gain;
  } catch (error) {
    console.error("Failed to fetch elevation:", error);
    return 0;
  }
};

export const calculateSegment = async (start: LatLng, end: LatLng, useSnap: boolean): Promise<RouteSegment> => {
  let path: LatLng[] = [start, end];
  let distance = calculateDistanceKm(start, end);

  if (useSnap) {
    try {
      const coords = `${start.lng},${start.lat};${end.lng},${end.lat}`;
      const response = await fetch(
        `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coords}?overview=full&geometries=geojson&continue_straight=false`
      );
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        path = route.geometry.coordinates.map((coord: number[]) => ({
          lat: coord[1], lng: coord[0]
        }));
        distance = route.distance / 1000;
      }
    } catch (error) {
      console.warn("Routing error (falling back to direct):", error);
    }
  }

  const elevation = await calculateElevationGain(path);

  return { path, distance, elevation };
};

export const manageSegments = async (
  prevPointsRef: React.MutableRefObject<LatLng[]>, 
  routePoints: LatLng[], 
  setSegments: React.Dispatch<React.SetStateAction<RouteSegment[]>>, 
  setIsFetching: React.Dispatch<React.SetStateAction<boolean>>, 
  snapToRoad: boolean
) => {
  const prevPoints = prevPointsRef.current;
  
  // User pressed `clear`
  if (routePoints.length < 2) {
    setSegments([]);
    prevPointsRef.current = routePoints;
    return;
  }

  // User added a new point on the map
  if (routePoints.length === prevPoints.length + 1) {
    setIsFetching(true);
    const start = routePoints[routePoints.length - 2];
    const end = routePoints[routePoints.length - 1];
    
    const newSegment = await calculateSegment(start, end, snapToRoad);
    setSegments(prev => [...prev, newSegment]);
    setIsFetching(false);
  }
  // User removed the last point (Undo)
  else if (routePoints.length === prevPoints.length - 1 && routePoints.length > 0) {
    setSegments(prev => prev.slice(0, -1));
  }
  // Snap toggled or made a complex change -> Recalculate All
  else {
    // This handles the Snap toggle (rebuilding entire route)
    // or if multiple points changed at once.
    setIsFetching(true);
    const newSegments: RouteSegment[] = [];
    for (let i = 0; i < routePoints.length - 1; i++) {
      const seg = await calculateSegment(routePoints[i], routePoints[i+1], snapToRoad);
      newSegments.push(seg);
    }
    setSegments(newSegments);
    setIsFetching(false);
  }

  prevPointsRef.current = routePoints;
};
