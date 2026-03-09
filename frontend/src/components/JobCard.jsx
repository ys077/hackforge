import React from 'react';
import { Briefcase, MapPin, IndianRupee, Building2, CheckCircle2 } from 'lucide-react';
import Button from './Button';

const JobCard = ({ job, matchScore, onApply }) => {
  const isHighMatch = matchScore > 0.8;

  return (
    <div className="glass-panel p-5 relative group overflow-hidden transition-all hover:-translate-y-1 hover:border-white/20">
      {/* Match Score Badge */}
      {matchScore && (
        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold border ${
          isHighMatch 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        }`}>
          {(matchScore * 100).toFixed(0)}% Match
        </div>
      )}

      <h3 className="text-xl font-bold text-white mb-2 pr-24">{job.title}</h3>
      
      <div className="flex flex-col gap-2 mb-4 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-slate-500" />
          <span>{job.company || 'Confidential'}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-slate-500" />
          <span>{job.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <IndianRupee size={16} className="text-slate-500" />
          <span className="text-green-400 font-medium">{job.salary_range || 'Not Disclosed'}</span>
        </div>
      </div>

      <p className="text-sm text-slate-400 line-clamp-2 mb-4">
        {job.description}
      </p>

      {job.matching_skills && job.matching_skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {job.matching_skills.map((skill, index) => (
            <span key={index} className="flex items-center gap-1 text-xs bg-blue-500/10 text-blue-300 px-2 py-1 rounded-md border border-blue-500/20">
              <CheckCircle2 size={12} /> {skill}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-3 mt-auto">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => window.open(job.url || job.application_link, '_blank')}
        >
          View Source
        </Button>
        <Button 
          variant="primary" 
          className="flex-1"
          onClick={() => onApply && onApply(job)}
        >
          Easy Apply
        </Button>
      </div>
    </div>
  );
};

export default JobCard;
