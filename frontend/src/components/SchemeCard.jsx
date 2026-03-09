import React from 'react';
import { Landmark, FileCheck, Info } from 'lucide-react';
import Button from './Button';

const SchemeCard = ({ scheme, matchScore, onApply }) => {
  const isHighMatch = matchScore >= 0.70;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 relative flex flex-col h-full border-t-4 hover:-translate-y-1 shadow-sm hover:shadow-md transition-all border-t-brand-primary">
      {matchScore && (
        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold border ${
          isHighMatch 
            ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' 
            : 'bg-brand-accent/10 text-amber-700 border-brand-accent/20'
        }`}>
          {(matchScore * 100).toFixed(0)}% Match
        </div>
      )}

      <div className="flex items-start gap-3 mb-3 pr-24">
        <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
          <Landmark size={24} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 leading-tight">{scheme.scheme_name || scheme.title}</h3>
      </div>

      <p className="text-sm text-slate-600 line-clamp-3 mb-4 flex-grow">
        {scheme.description}
      </p>

      {scheme.matching_reasons && scheme.matching_reasons.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-3 mb-4 border border-slate-200">
          <p className="text-xs font-medium text-slate-700 mb-2 flex items-center gap-1.5">
            <Info size={14} className="text-brand-primary" /> Why you matched
          </p>
          <ul className="text-xs text-slate-600 space-y-1">
            {scheme.matching_reasons.slice(0, 2).map((reason, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-brand-primary mt-0.5">•</span>
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
