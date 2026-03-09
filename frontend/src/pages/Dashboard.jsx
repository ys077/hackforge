import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardCard from '../components/DashboardCard';
import { 
  Briefcase, 
  Landmark, 
  FileText, 
  FolderLock, 
  CalendarClock,
  TrendingUp
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {user?.name?.split(' ')[0] || 'User'}! 👋</h1>
        <p className="text-slate-400">Here's your career and benefits overview.</p>
      </div>

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
          title="Applications"
          description="Track your job applications and schedule upcoming interviews."
          icon={CalendarClock}
          path="/applications"
          colorClass="from-indigo-500 to-blue-600"
          stats={[
            { label: 'Active', value: '2' },
            { label: 'Interviews', value: '1' }
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
