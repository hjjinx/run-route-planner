import { Info, X, MapIcon, GitCommit, Navigation, Activity } from "lucide-react";

const InfoModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-2000 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 relative">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Info className="text-blue-500" size={24} />
            <h2 className="text-lg font-bold text-slate-900">How to use</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-3 text-sm text-slate-600">
          <div className="flex gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg h-fit text-emerald-600"><MapIcon size={16} /></div>
            <p><strong>Tap the map</strong> to place waypoints. We'll draw the route between them.</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-blue-100 p-2 rounded-lg h-fit text-blue-600"><GitCommit size={16} /></div>
            <p><strong>Snap to Path</strong> ensures your route follows roads and trails.</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-amber-100 p-2 rounded-lg h-fit text-amber-600"><Activity size={16} /></div>
            <p>Turn snapping <strong>OFF</strong> (Direct Mode) to draw straight lines through parks or open fields.</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-slate-100 p-2 rounded-lg h-fit text-slate-600"><Navigation size={16} /></div>
            <p>Expand the menu to see <strong>distance, elevation, and time</strong> estimates.</p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors mt-2"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default InfoModal;