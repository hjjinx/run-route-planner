import { Footprints, ChevronDown } from "lucide-react";

const MobileStatsPanel = ({ 
  distanceKm, 
  unit, 
  onExpand 
}: { 
  distanceKm: number; 
  unit: 'km' | 'mi'; 
  onExpand: () => void 
}) => {
   const distDisplay = unit === 'km' ? distanceKm : distanceKm * 0.621371;
   
   return (
     <div 
       className="absolute -top-px left-0 right-0 z-1000 border-t border-slate-200 p-4 md:hidden flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] cursor-pointer active:bg-slate-50 transition-colors bg-slate-900"
       onClick={onExpand}
     >
       <div className="flex items-center space-x-3">
         <div className="bg-slate-900 p-2.5 rounded-xl shadow-md">
           <Footprints className="text-emerald-400" size={20} />
         </div>
         <div>
            <h1 className="font-bold text-slate-100 leading-tight">RunCraft</h1>
            <p className="text-xs text-slate-400 font-medium">Tap for details</p>
         </div>
       </div>
       
       <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Distance</div>
            <div className="text-xl font-bold text-slate-100 leading-none">
              {distDisplay.toFixed(2)} <span className="text-sm font-normal text-slate-500">{unit}</span>
            </div>
          </div>
          <div className="bg-slate-100 p-1 rounded-full">
            <ChevronDown className="text-slate-500" size={20} />
          </div>
       </div>
     </div>
   );
};

export default MobileStatsPanel;