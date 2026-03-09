import React, { useState } from 'react';
import { CalendarClock, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import Button from '../components/Button';

const Applications = () => {
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' or 'schemes'

  const mockApplications = [
    {
      id: 1,
      type: 'job',
      title: 'Senior Plumber',
      company: 'QuickFix Repairs',
      applied_on: '2026-03-08',
      status: 'shortlisted',
      next_step: 'Interview scheduled for Mar 12, 10:00 AM'
    },
    {
      id: 2,
      type: 'job',
      title: 'Maintenance Technician',
      company: 'Lodha Group',
      applied_on: '2026-03-05',
      status: 'viewed',
      next_step: 'Awaiting employer feedback'
    },
    {
      id: 3,
      type: 'scheme',
      title: 'PM SVANidhi',
      company: 'Govt. of India',
      applied_on: '2026-03-01',
      status: 'approved',
      next_step: 'Funds disbursed to bank account'
    }
  ];

  const filteredApps = mockApplications.filter(app => app.type === activeTab);

  const StatusBadge = ({ status }) => {
    const badges = {
      applied: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      viewed: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
      shortlisted: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      rejected: "bg-red-500/10 text-red-400 border-red-500/20"
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${badges[status] || badges.applied}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Applications Tracker</h1>
          <p className="text-slate-400">Track your job applications and government scheme statuses.</p>
        </div>
        
        <div className="flex bg-slate-800 p-1 rounded-xl border border-white/10 shrink-0">
          <button 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'jobs' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setActiveTab('jobs')}
          >
            Jobs
          </button>
          <button 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'schemes' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setActiveTab('schemes')}
          >
            Gov Schemes
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        {filteredApps.length === 0 ? (
          <div className="text-center py-20">
            <CalendarClock size={48} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No applications yet</h3>
            <p className="text-slate-400">Start exploring and apply to see them tracked here.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredApps.map((app) => (
              <div key={app.id} className="p-6 hover:bg-white/5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white">{app.title}</h3>
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="text-slate-400 text-sm mb-3">
                    {app.company} • Applied on {new Date(app.applied_on).toLocaleDateString()}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-blue-300 bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/10 w-fit">
                    {app.status === 'approved' ? (
                      <CheckCircle size={16} className="text-emerald-400" />
                    ) : (
                      <Clock size={16} />
                    )}
                    <span>{app.next_step}</span>
                  </div>
                </div>

                <div className="flex gap-3 md:flex-col lg:flex-row">
                  {app.status === 'shortlisted' && (
                    <Button variant="primary" size="sm">
                      Schedule Interview
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                    <ExternalLink size={16} className="mr-2" /> View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Applications;
