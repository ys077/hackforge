import React from 'react';
import { Briefcase, MapPin, IndianRupee, Building2, CheckCircle2 } from 'lucide-react';
import Button from './Button';

const JobCard = ({ job, matchScore, onApply }) => {
  const isHighMatch = matchScore >= 0.70;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 relative group overflow-hidden transition-all hover:-translate-y-1 shadow-sm hover:shadow-md">
      {/* Match Score Badge */}
      {matchScore && (
        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold border ${
          isHighMatch 
            ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' 
            : 'bg-brand-accent/10 text-amber-700 border-brand-accent/20'
        }`}>
          {(matchScore * 100).toFixed(0)}% Match
        </div>
      )}

      <h3 className="text-xl font-bold text-slate-900 mb-2 pr-24">{job.title}</h3>
      
      <div className="flex flex-col gap-2 mb-4 text-sm text-slate-600">
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
          <span className="text-brand-primary font-bold">{job.salary_range || 'Not Disclosed'}</span>
        </div>
      </div>

      <p className="text-sm text-slate-500 line-clamp-2 mb-4">
        {job.description}
      </p>

      {job.matching_skills && job.matching_skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {job.matching_skills.map((skill, index) => (
            <span key={index} className="flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-md border border-slate-200">
              <CheckCircle2 size={12} className="text-brand-primary" /> {skill}
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
