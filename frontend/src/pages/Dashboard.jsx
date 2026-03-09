import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardCard from '../components/DashboardCard';
import { 
  Briefcase, 
  Landmark, 
  FileText,
  FolderLock,
  CalendarClock,
  TrendingUp,
  MapPin,
  Upload,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="py-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full overflow-y-auto custom-scrollbar pr-2 pb-10">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back, {user?.name?.split(' ')[0] || 'Aarav'}! 👋</h1>
          <p className="text-slate-600">Here's your career and benefits overview.</p>
        </div>
        
        {/* Profile Completeness Metric */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex items-center gap-4 min-w-[280px]">
          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100" />
              <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="6" fill="transparent" 
                strokeDasharray={150} strokeDashoffset={150 - (150 * 85) / 100}
                className="text-brand-primary transition-all duration-1000" />
            </svg>
            <span className="absolute text-sm font-bold text-slate-800">85%</span>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-slate-800 mb-1">Profile Completeness</h4>
            <p className="text-xs text-slate-500">Upload Aadhaar to reach 100%</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link to="/documents" className="bg-white border border-slate-200 hover:border-brand-primary/50 hover:bg-brand-primary/5 shadow-sm rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 transition-all group">
          <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center group-hover:scale-110 transition-transform">
            <Upload size={20} />
          </div>
          <span className="text-sm font-semibold text-slate-700">Upload Aadhaar</span>
        </Link>
        
        <Link to="/jobs" className="bg-white border border-slate-200 hover:border-brand-primary/50 hover:bg-brand-primary/5 shadow-sm rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 transition-all group">
          <div className="w-10 h-10 rounded-full bg-brand-accent/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <MapPin size={20} />
          </div>
          <span className="text-sm font-semibold text-slate-700">Find Local Jobs</span>
        </Link>
        
        <Link to="/schemes" className="bg-white border border-slate-200 hover:border-brand-primary/50 hover:bg-brand-primary/5 shadow-sm rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 transition-all group">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Landmark size={20} />
          </div>
          <span className="text-sm font-semibold text-slate-700">View PM Schemes</span>
        </Link>

        <Link to="/interviews" className="bg-white border border-slate-200 hover:border-brand-primary/50 hover:bg-brand-primary/5 shadow-sm rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 transition-all group">
          <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <CalendarClock size={20} />
          </div>
          <span className="text-sm font-semibold text-slate-700">Next Interview</span>
        </Link>
      </div>

      <h2 className="text-lg font-bold text-slate-800 mb-4">Your Modules</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard 
          title="Jobs & Opportunities"
          description="AI-matched local and remote roles based on your verified skills."
          icon={Briefcase}
          path="/jobs"
          colorClass="from-blue-500 to-cyan-500"
          stats={[
            { label: 'New Matches', value: '12' },
            { label: 'Saved', value: '3' }
          ]}
        />

        <DashboardCard 
          title="Government Schemes"
          description="Discover financial aid, housing, and labor benefits you are eligible for."
          icon={Landmark}
          path="/schemes"
          colorClass="from-purple-500 to-pink-500"
          stats={[
            { label: 'Eligible', value: '5' },
            { label: 'Applied', value: '1' }
          ]}
        />

        <DashboardCard 
          title="Resume Builder"
          description="Create and analyze your ATS-friendly professional profile instantly."
          icon={FileText}
          path="/resume"
          colorClass="from-emerald-500 to-teal-500"
          stats={[
            { label: 'ATS Score', value: '85' },
            { label: 'Views', value: '24' }
          ]}
        />

        <DashboardCard 
          title="Document Locker"
          description="Securely upload and verify your ID and certificates."
          icon={FolderLock}
          path="/documents"
          colorClass="from-amber-500 to-orange-500"
          stats={[
            { label: 'Trust Score', value: '92%' },
            { label: 'Docs', value: '4' }
          ]}
        />

        <DashboardCard 
          title="Interview Vault"
          description="Track your job applications and schedule upcoming interviews."
          icon={CalendarClock}
          path="/interviews"
          colorClass="from-indigo-500 to-blue-600"
          stats={[
            { label: 'Upcoming', value: '2' },
            { label: 'Completed', value: '1' }
          ]}
        />

        <DashboardCard 
          title="Financial Growth"
          description="Access micro-loans and credit building tools for workers."
          icon={TrendingUp}
          path="/credit"
          colorClass="from-rose-500 to-red-500"
        />
      </div>
    </div>
  );
};

export default Dashboard;
