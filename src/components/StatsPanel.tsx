import { Navigation, Clock, Mountain, Flame, Loader2 } from "lucide-react";
import { useMemo } from "react";
import StatCard from "./StatCard";

const StatsPanel = ({ 
  distanceKm, 
  elevationGain, 
  unit,
  isLoadingElevation
}: { 
  distanceKm: number; 
  elevationGain: number;
  unit: 'km' | 'mi';
  isLoadingElevation?: boolean;
}) => {
  const stats = useMemo(() => {
    const isKm = unit === 'km';
    
    // Conversions
    const distDisplay = isKm ? distanceKm : distanceKm * 0.621371;
    
    // Avg Pace: 6 min/km
    const avgPaceMinPerKm = 6; 
    const timeMinutes = distanceKm * avgPaceMinPerKm;
    const calories = distanceKm * 60;
    
    // Elevation display (Input is always meters)
    const elevDisplay = isKm ? elevationGain : elevationGain * 3.28084;

    return {
      distance: distDisplay.toFixed(2),
      time: { hours: Math.floor(timeMinutes / 60), minutes: Math.floor(timeMinutes % 60) },
      calories: Math.floor(calories),
      elevation: Math.floor(elevDisplay)
    };
  }, [distanceKm, elevationGain, unit]);

  return (
    <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-500">
      <StatCard icon={Navigation} label="Distance" value={stats.distance} unit={unit} />
      <StatCard 
        icon={Clock} 
        label="Est. Time" 
        value={
          <>
            {stats.time.hours > 0 && <span>{stats.time.hours}<span className="text-sm font-normal text-slate-500">h</span> </span>}
            {stats.time.minutes}<span className="text-sm font-normal text-slate-500">m</span>
          </>
        } 
        tooltip="Based on an average pace of 6 min/km"
      />
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-emerald-200 transition-colors relative overflow-hidden">
        <div className="flex items-center text-slate-500 mb-1 text-xs uppercase font-bold tracking-wider">
          <Mountain size={14} className="mr-1 text-emerald-600" /> Elev. Gain
        </div>
        <div className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center">
          {isLoadingElevation ? (
             <Loader2 className="animate-spin text-slate-400" size={24} />
          ) : (
             <>
               {stats.elevation} <span className="text-base font-normal text-slate-500 ml-1">{unit === 'km' ? 'm' : 'ft'}</span>
             </>
          )}
        </div>
      </div>
      <StatCard icon={Flame} label="Burn" value={stats.calories} unit="kcal" />
    </div>
  );
};

export default StatsPanel;