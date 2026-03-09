import React from 'react';
import { Download, Edit3, Share2, Briefcase } from 'lucide-react';
import Button from './Button';

const ResumePreview = ({ resumeData }) => {
  if (!resumeData) return null;

  return (
    <div className="bg-slate-50 overflow-hidden border border-slate-200 rounded-2xl shadow-md p-6 flex flex-col md:flex-row gap-6">
      
      {/* Visual Resume Sheet Layout */}
      <div className="flex-1 bg-white text-slate-900 p-8 rounded-xl shadow-inner min-h-[600px] border border-slate-200 printable-resume">
        <div className="border-b-2 border-slate-800 pb-4 mb-6">
          <h1 className="text-3xl font-bold uppercase tracking-wide text-slate-900 mb-1">{resumeData.name || 'Your Name'}</h1>
          <div className="text-slate-600 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span>{resumeData.email || 'email@example.com'}</span>
            <span>•</span>
            <span>{resumeData.phone || '+91 XXXXXXXXXX'}</span>
            <span>•</span>
            <span>{resumeData.location || 'Location'}</span>
          </div>
        </div>

        {resumeData.summary && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-300 pb-1">Professional Summary</h2>
            <p className="text-sm text-slate-700 leading-relaxed">{resumeData.summary}</p>
          </div>
        )}

        {resumeData.skills && resumeData.skills.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-300 pb-1">Core Competencies</h2>
            <div className="flex flex-wrap gap-2">
              {resumeData.skills.map((skill, i) => (
                <span key={i} className="text-xs font-semibold bg-slate-100 border border-slate-300 text-slate-700 px-2 py-1 rounded">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {resumeData.experience && resumeData.experience.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider mb-3 border-b border-slate-300 pb-1">Experience</h2>
            <div className="space-y-4">
              {resumeData.experience.map((exp, i) => (
                <div key={i}>
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-bold text-slate-800">{exp.role || exp.title}</h3>
                    <span className="text-sm text-slate-600 font-medium">{exp.duration}</span>
                  </div>
                  <div className="text-sm font-semibold text-blue-700 mb-1">{exp.company}</div>
                  <p className="text-sm text-slate-700">{exp.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Editor & Actions Pane */}
      <div className="w-full md:w-72 flex flex-col gap-4">
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 mb-2">
          <h3 className="text-slate-800 font-bold mb-1 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-primary"></div> AI ATS Score
          </h3>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-black text-brand-primary">
              {resumeData.ats_score || 85}
            </span>
            <span className="text-slate-500 mb-1 font-medium">/ 100</span>
          </div>
          <p className="text-xs text-slate-500">
            Formatted for Applicant Tracking Systems and readability.
          </p>
        </div>

        <Button variant="primary" className="w-full justify-start gap-3 bg-brand-primary hover:bg-brand-primary-hover border-none">
          <Download size={18} /> Download PDF
        </Button>
        <Button variant="secondary" className="w-full justify-start gap-3">
          <Edit3 size={18} /> Edit Contents
        </Button>
        <Button variant="outline" className="w-full justify-start gap-3 mt-4">
          <Briefcase size={18} /> Auto-Apply to Jobs
        </Button>
      </div>
      
      {/* Global Print CSS to hide everything except printable-resume when Ctrl+P is pressed */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background: white !important;
          }
          .printable-resume, .printable-resume * {
            visibility: visible;
          }
          .printable-resume {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            min-height: 100vh;
            border: none;
            box-shadow: none;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default ResumePreview;
