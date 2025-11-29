import { Info } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, unit, tooltip = '' }: any) => (
  <div className={`bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-emerald-200 transition-colors ${tooltip ? 'cursor-help' : ''}`} title={tooltip} aria-label={tooltip}>
    <div className="flex items-center text-slate-500 mb-1 text-xs uppercase font-bold tracking-wider">
      <Icon size={14} className="mr-1 text-emerald-600" /> {label}
      {tooltip && (
        <span className="ml-1 text-slate-400" role="tooltip"><Info size={14} /></span>
      )}
    </div>
    <div className="text-2xl md:text-3xl font-bold text-slate-900">
      {value} {unit && <span className="text-base font-normal text-slate-500">{unit}</span>}
    </div>
  </div>
);

export default StatCard;