import React from 'react';
import { Landmark, FileCheck, Info } from 'lucide-react';
import Button from './Button';

const SchemeCard = ({ scheme, matchScore, onApply }) => {
  const isHighMatch = matchScore > 0.8;

  return (
    <div className="glass-panel p-5 relative flex flex-col h-full border-t-4 hover:border-white/20 transition-all border-t-purple-500">
      {matchScore && (
        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold border ${
          isHighMatch 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        }`}>
          {(matchScore * 100).toFixed(0)}% Match
        </div>
      )}

      <div className="flex items-start gap-3 mb-3 pr-24">
        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
          <Landmark size={24} />
        </div>
        <h3 className="text-lg font-bold text-white leading-tight">{scheme.scheme_name || scheme.title}</h3>
      </div>

      <p className="text-sm text-slate-400 line-clamp-3 mb-4 flex-grow">
        {scheme.description}
      </p>

      {scheme.matching_reasons && scheme.matching_reasons.length > 0 && (
        <div className="bg-slate-900/50 rounded-lg p-3 mb-4 border border-slate-700/50">
          <p className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
            <Info size={14} className="text-blue-400" /> Why you matched
          </p>
          <ul className="text-xs text-slate-400 space-y-1">
            {scheme.matching_reasons.slice(0, 2).map((reason, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-purple-400 mt-0.5">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3 mt-auto">
        <Button 
          variant="secondary" 
          className="flex-1"
          onClick={() => window.open(scheme.url || scheme.application_link, '_blank')}
        >
          Details
        </Button>
        <Button 
          variant="primary" 
          className="flex-1"
          onClick={() => onApply && onApply(scheme)}
        >
          Apply Now
        </Button>
      </div>
    </div>
  );
};

export default SchemeCard;
