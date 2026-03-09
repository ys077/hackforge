import React, { useState } from 'react';
import Input from '../components/Input';
import Button from '../components/Button';
import ResumePreview from '../components/ResumePreview';
import { resumeService } from '../services/resumeService';
import { Sparkles, Linkedin, Award, Briefcase, FileText, FileEdit, FileSearch } from 'lucide-react';

const ResumeBuilder = () => {
  const [formData, setFormData] = useState({
    name: 'Ravi Kumar',
    phone: '+91 9876543210',
    email: 'ravi.kumar@example.com',
    location: 'Mumbai, Maharashtra',
    linkedin_url: '',
    experience_years: 3,
    skills: 'Plumbing, Pipe Fitting, Repairing leaks, AutoCAD basics',
    job_role: 'Senior Plumber',
    education: 'ITI Plumbing'
  });
  
  const [generatedResume, setGeneratedResume] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionType, setActionType] = useState('build'); // 'build', 'enhance', 'match'

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      user_id: "u_123", // Dummy for now
      action: actionType,
      profile_data: {
        ...formData,
        skills: formData.skills.split(',').map(s => s.trim())
      }
    };

    try {
      const response = await resumeService.generateResume(payload);
      setGeneratedResume(response.resume);
    } catch (err) {
      setError('Failed to connect to ML Resume Generator Service.');
      // Provide fallback mock data if ML is offline for testing display
      setGeneratedResume({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        location: formData.location,
        summary: `Highly skilled ${formData.job_role} with ${formData.experience_years} years of experience in diagnosing and repairing complex systems. Dedicated to high-quality workmanship and timely project completion.`,
        skills: formData.skills.split(',').map(s => s.trim()),
        experience: [
          {
            title: formData.job_role,
            company: 'Independent Contractor',
            duration: '2021 - Present',
            description: 'Managed over 200+ residential and commercial repair projects ensuring 100% compliance with safety standards.'
          }
        ],
        ats_score: 92
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar pr-2">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">AI Resume Builder</h1>
        <p className="text-slate-600">Generate an ATS-optimized professional resume instantly from your details or LinkedIn.</p>
      </div>

      {/* 3-Path Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button 
          onClick={() => setActionType('build')}
          className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${actionType === 'build' ? 'bg-brand-primary/10 border-brand-primary text-brand-primary shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-brand-primary/50'}`}
        >
          <FileText size={24} />
          <span className="font-semibold">Build New Resume</span>
          <span className="text-xs text-center opacity-80">Start from scratch using your profile data</span>
        </button>
        <button 
          onClick={() => setActionType('enhance')}
          className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${actionType === 'enhance' ? 'bg-brand-primary/10 border-brand-primary text-brand-primary shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-brand-primary/50'}`}
        >
          <FileEdit size={24} />
          <span className="font-semibold">Enhance Existing</span>
          <span className="text-xs text-center opacity-80">Make your current resume sound more professional</span>
        </button>
        <button 
          onClick={() => setActionType('match')}
          className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${actionType === 'match' ? 'bg-brand-primary/10 border-brand-primary text-brand-primary shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-brand-primary/50'}`}
        >
          <FileSearch size={24} />
          <span className="font-semibold">Target Specific Job</span>
          <span className="text-xs text-center opacity-80">Tailor your resume for a specific job description</span>
        </button>
      </div>

      <div className="grid xl:grid-cols-12 gap-8">
        
        {/* Inputs Column */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Linkedin size={20} className="text-brand-secondary" /> Auto-Fill (Optional)
            </h3>
            <div className="flex flex-col gap-2">
              <Input 
                placeholder="Paste LinkedIn Profile URL" 
                value={formData.linkedin_url}
                onChange={e => setFormData({...formData, linkedin_url: e.target.value})}
              />
              <Button variant="outline" className="w-full justify-center" title="Extract Data">
                <Sparkles size={18} className="mr-2"/> Extract Data
              </Button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Briefcase size={20} className="text-brand-primary" /> Manual Details
            </h3>
            
            <form onSubmit={handleGenerate} className="space-y-4">
              <Input 
                label="Target Job Role" 
                value={formData.job_role}
                onChange={e => setFormData({...formData, job_role: e.target.value})}
                required
              />
              <Input 
                label="Total Experience (Years)" 
                type="number"
                value={formData.experience_years}
                onChange={e => setFormData({...formData, experience_years: parseInt(e.target.value)})}
                required
              />
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-medium text-slate-600">Key Skills (Comma separated)</label>
                <textarea 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 min-h-[100px]"
                  value={formData.skills}
                  onChange={e => setFormData({...formData, skills: e.target.value})}
                  required
                />
              </div>
              <Input 
                label="Education Level" 
                value={formData.education}
                onChange={e => setFormData({...formData, education: e.target.value})}
                required
              />

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button type="submit" variant="primary" className="w-full mt-4 bg-brand-primary hover:bg-brand-primary-hover border-none" isLoading={loading}>
                <Sparkles size={18} className="mr-2" />
                {actionType === 'build' ? 'Generate New Resume' : actionType === 'enhance' ? 'Enhance Existing Resume' : 'Match to Job Description'}
              </Button>
            </form>
          </div>
        </div>

        {/* Output Column */}
        <div className="xl:col-span-8">
          {generatedResume ? (
            <div className="animate-in zoom-in-95 duration-500 lg:sticky lg:top-24">
              <ResumePreview resumeData={generatedResume} />
            </div>
          ) : (
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl h-full min-h-[600px] flex flex-col items-center justify-center text-center p-8 border-dashed border-2">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-6">
                <FileText size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No Resume Generated Yet</h3>
              <p className="text-slate-500 max-w-sm">
                Select your desired action, fill out your details on the left, and hit generate to create a perfectly formatted, English-fluent resume.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilder;
