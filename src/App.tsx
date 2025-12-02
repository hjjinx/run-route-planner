import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Map as MapIcon, 
  RotateCcw, 
  Trash2, 
  Footprints,
  Menu,
  X,
  Loader2,
  Locate,
  Download,
  GitCommit,
  Activity
} from 'lucide-react';
import type { LatLng, RouteSegment } from './constants';
import StatsPanel from './components/StatsPanel';
import { manageSegments } from './utils';
import MobileStatsPanel from './components/MobileStatsPanel';

export default function App() {
  const [routePoints, setRoutePoints] = useState<LatLng[]>([]);
  const [segments, setSegments] = useState<RouteSegment[]>([]);

  const [unit, setUnit] = useState<'km' | 'mi'>('km');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [snapToRoad, setSnapToRoad] = useState(true);
  
  // using vancouver as default location
  const [userLocation, setUserLocation] = useState<LatLng>({ lat: 49.2827, lng: -123.1207 });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const routeLayerGroupRef = useRef<any>(null);
  const prevPointsRef = useRef<LatLng[]>([]);

  const routeDistance = useMemo(() => segments.reduce((acc, seg) => acc + seg.distance, 0), [segments]);
  const routeElevation = useMemo(() => segments.reduce((acc, seg) => acc + seg.elevation, 0), [segments]);
  const routePath = useMemo(() => {
    if (segments.length === 0 && routePoints.length === 1) return [routePoints[0]];
    // Flatten segments into one continuous line
    return segments.flatMap(seg => seg.path);
  }, [segments, routePoints]);


  useEffect(() => {
    if (document.getElementById('leaflet-css')) {
      setIsLeafletLoaded(true);
      return;
    }
    const link = document.createElement("link");
    link.id = 'leaflet-css';
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => setIsLeafletLoaded(true);
    document.body.appendChild(script);
  }, []);

  const handleUndo = useCallback(() => {
    if (!isFetching) {
      setRoutePoints(prev => prev.slice(0, -1));
    }
  }, [isFetching]);

  useEffect(() => {
    const handleUndoKey = (event: KeyboardEvent) => {
      // Check for Command+Z on macOS or Control+Z on other systems
      if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
          event.preventDefault();
          handleUndo();
      }
    }

    document.addEventListener('keydown', handleUndoKey);
    return () => {
      document.removeEventListener('keydown', handleUndoKey);
    }
  }, [handleUndo]);

  useEffect(() => {
    manageSegments(prevPointsRef, routePoints, setSegments, setIsFetching, snapToRoad);
  }, [routePoints, snapToRoad]);

  useEffect(() => {
    if (isLeafletLoaded && mapContainerRef.current && !mapInstanceRef.current) {
      const L = (window as any).L;
      if (!L) alert('Map failed to load. Please refresh the page.');
      
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false 
      }).setView([userLocation.lat, userLocation.lng], 13);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      L.control.attribution({ position: 'bottomright' }).addTo(map);
      routeLayerGroupRef.current = L.layerGroup().addTo(map);

      map.on('click', (e: any) => {
        setRoutePoints(prev => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }]);
      });

      mapInstanceRef.current = map;
      setTimeout(() => map.invalidateSize(), 500);
    }
  }, [isLeafletLoaded]);

  useEffect(() => {
    if (!mapInstanceRef.current || !routeLayerGroupRef.current || !isLeafletLoaded) return;
    
    const L = (window as any).L;
    const group = routeLayerGroupRef.current;
    group.clearLayers();

    // Use derived routePath
    const pointsToDraw = routePath.length > 0 ? routePath : routePoints;

    if (pointsToDraw.length > 0) {
      const latLngs = pointsToDraw.map(p => [p.lat, p.lng]);
      
      // Outer glow
      L.polyline(latLngs, { color: '#065f46', weight: 8, opacity: 0.2, lineCap: 'round', lineJoin: 'round' }).addTo(group);
      
      // Main Line
      L.polyline(latLngs, { 
        color: '#10b981', 
        weight: 4, 
        opacity: 0.9, 
        lineCap: 'round', 
        lineJoin: 'round',
        dashArray: snapToRoad ? (isFetching ? '10, 10' : undefined) : '5, 10' // Dashed if "Direct Mode" or Loading
      }).addTo(group);
    }

    // Draw Anchors (User Clicks)
    routePoints.forEach((point, idx) => {
      const isStart = idx === 0;
      const isEnd = idx === routePoints.length - 1;
      
      L.circleMarker([point.lat, point.lng], {
        radius: isStart || isEnd ? 8 : 5,
        fillColor: isStart ? '#10b981' : (isEnd ? '#ef4444' : '#fff'),
        color: isStart || isEnd ? '#fff' : '#64748b',
        weight: isStart || isEnd ? 3 : 2,
        opacity: 1, fillOpacity: 1
      }).addTo(group)
      .bindTooltip(isStart ? "Start" : (isEnd ? "End" : `WP ${idx}`), { 
        direction: 'top', 
        permanent: false 
      });
    });

  }, [routePoints, routePath, isFetching, isLeafletLoaded, snapToRoad]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => mapInstanceRef.current.invalidateSize(), 300);
    }
  }, [isSidebarOpen]);

  // Handlers
  const handleClear = () => {
    setRoutePoints([]);
    setSegments([]);
  };

  const handleDownloadGPX = () => {
    const points = routePath.length > 0 ? routePath : routePoints;
    if (points.length === 0) return;

    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RunCraft" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>RunCraft Route</name>
    <trkseg>
      ${points.map(p => `<trkpt lat="${p.lat}" lon="${p.lng}"></trkpt>`).join('')}
    </trkseg>
  </trk>
</gpx>`;

    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `runcraft-route-${new Date().toISOString().slice(0,10)}.gpx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    
    setIsLocating(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        const newLoc = { lat: latitude, lng: longitude };
        setUserLocation(newLoc);
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 15, {
            animate: true,
            duration: 1.5
          });
          
          const L = (window as any).L;
          if (L) {
             L.circleMarker([latitude, longitude], {
               radius: 8,
               fillColor: '#3b82f6',
               color: '#ffffff',
               weight: 2,
               opacity: 1,
               fillOpacity: 1
             }).addTo(mapInstanceRef.current)
             .bindPopup("You are here").openPopup();
          }
        }
      },
      (error) => {
        setIsLocating(false);
        console.error(error);
        alert("Unable to retrieve your location. Please check browser permissions.");
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="flex h-svh w-full bg-gray-100 overflow-hidden font-sans text-slate-800">
      
      {/* Sidebar Controls */}
      <div 
        className={`fixed inset-y-0 left-0 z-1000 w-full md:w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col border-r border-slate-200`}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 pb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <Footprints className="text-emerald-400" size={24} />
              <h1 className="text-2xl font-bold tracking-tight mr-2">RunCraft</h1>
              
              <button
                onClick={() => setUnit(prev => prev === 'km' ? 'mi' : 'km')}
                className="px-2 py-1 text-[10px] font-bold bg-slate-800 border border-slate-700 rounded text-slate-300 hover:text-white hover:border-slate-500 transition-colors uppercase tracking-wider"
              >
                {unit}
              </button>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="md:hidden text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          <p className="text-slate-400 text-sm">Plan your perfect run.</p>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-300">
          
          {/* Main Controls */}
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
            
            <StatsPanel 
               distanceKm={routeDistance} 
               elevationGain={routeElevation} 
               unit={unit} 
               isLoadingElevation={isFetching}
            />

            {/* Routing Toggle (The "Fix" for parks) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center space-x-3">
                     <div className={`p-2 rounded-lg ${snapToRoad ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {snapToRoad ? <GitCommit size={20} /> : <Activity size={20} />}
                     </div>
                     <div>
                        <div className="font-medium text-slate-900">Snap to Path</div>
                        <div className="text-xs text-slate-500">
                           {snapToRoad ? "Follows roads & trails" : "Straight lines (Manual)"}
                        </div>
                     </div>
                  </div>
                  <div className="relative">
                     <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={snapToRoad} 
                        onChange={() => setSnapToRoad(!snapToRoad)} 
                     />
                     <div className={`w-11 h-6 rounded-full transition-colors ${snapToRoad ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                     <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${snapToRoad ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </div>
               </label>
               
               {!snapToRoad && (
                  <div className="mt-3 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                     <strong>Direct Mode:</strong> Useful for parks, open fields, or off-trail running where maps might be incomplete.
                  </div>
               )}
            </div>

            {isFetching && snapToRoad && (
              <div className="flex items-center text-xs text-blue-600 bg-blue-50 p-2 rounded-lg animate-pulse">
                <Loader2 size={12} className="animate-spin mr-2" />
                Calculating path...
              </div>
            )}

            <div className="flex space-x-3">
              <button 
                onClick={handleUndo}
                disabled={routePoints.length === 0 || isFetching}
                className="flex-1 flex items-center justify-center space-x-2 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <RotateCcw size={18} />
                <span>Undo</span>
              </button>
              <button 
                onClick={handleClear}
                disabled={routePoints.length === 0 || isFetching}
                className="flex-1 flex items-center justify-center space-x-2 py-3 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Trash2 size={18} />
                <span>Clear</span>
              </button>
            </div>

            <button 
              onClick={handleDownloadGPX}
              disabled={routePoints.length === 0}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Download size={18} />
              <span>Download GPX</span>
            </button>

            <div className="text-sm text-slate-600 bg-emerald-50 p-4 rounded-lg border border-emerald-100">
              <p className="flex items-start">
                <span className="mr-2 text-emerald-600 mt-0.5"><MapIcon size={16} /></span>
                <span>Click on the map to plot your run. Toggle <strong>Snap to Path</strong> off if you want to run through unmapped parks.</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Stats Panel - Visible when sidebar is closed on mobile */}
      {!isSidebarOpen && (
        <MobileStatsPanel 
          distanceKm={routeDistance} 
          unit={unit} 
          onExpand={() => setSidebarOpen(true)} 
        />
      )}

      {/* Map Area */}
      <div className="relative flex-1 h-full z-0 bg-slate-200">
        {!isLeafletLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-50">
            <div className="flex flex-col items-center">
              <Loader2 className="animate-spin text-emerald-500 mb-4" size={40} />
              <p className="text-slate-500 font-medium">Loading Map Engine...</p>
            </div>
          </div>
        )}
        
        {/* Map Container */}
        <div ref={mapContainerRef} className="h-full w-full outline-none" />

        {/* Controls Overlay */}
        <div className="absolute top-4 left-4 z-999 flex flex-col gap-2">
           {!isSidebarOpen && (
            <button 
              onClick={() => setSidebarOpen(true)}
              className="bg-white text-slate-800 p-3 rounded-full shadow-lg hover:bg-slate-50 hover:text-emerald-600 transition-all transform hover:scale-110 active:scale-95 md:hidden"
              title="Open Menu"
            >
              <Menu size={24} />
            </button>
          )}
        </div>

        {/* Location Button */}
        <div className="absolute bottom-8 right-4 z-999">
          <button
            onClick={handleLocateUser}
            disabled={isLocating}
            className={`bg-white text-slate-700 p-3 rounded-lg shadow-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center active:scale-95 ${isLocating ? 'animate-pulse' : ''}`}
            title="Locate Me"
          >
            {isLocating ? (
              <Loader2 size={24} className="animate-spin text-blue-600" />
            ) : (
              <Locate size={24} className="text-slate-700" />
            )}
          </button>
        </div>

      </div>
    </div>
  );
}