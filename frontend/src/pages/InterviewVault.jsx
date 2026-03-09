import React, { useState } from 'react';
import { CalendarClock, CheckCircle, Clock, ExternalLink, MapPin, MessageSquare, Phone } from 'lucide-react';
import Button from '../components/Button';

const InterviewVault = () => {
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'past', 'schemes'

  const mockInterviews = [
    {
      id: 1,
      type: 'upcoming',
      title: 'Senior Plumber',
      company: 'QuickFix Repairs',
      date: 'Mar 12, 2026',
      time: '10:00 AM',
      location: 'Andheri East, Mumbai',
      status: 'scheduled',
      reminders: { sms: true, whatsapp: true }
    },
    {
      id: 2,
      type: 'upcoming',
      title: 'Maintenance Technician',
      company: 'Lodha Group',
      date: 'Mar 15, 2026',
      time: '02:30 PM',
      location: 'Lower Parel, Mumbai',
      status: 'scheduled',
      reminders: { sms: true, whatsapp: false }
    },
    {
      id: 3,
      type: 'past',
      title: 'Pipe Fitter',
      company: 'BuildRight Construction',
      date: 'Feb 28, 2026',
      time: '11:00 AM',
      location: 'Thane, Mumbai',
      status: 'completed',
      reminders: { sms: false, whatsapp: false }
    }
  ];

  const filteredApps = mockInterviews.filter(app => app.type === activeTab);

  const StatusBadge = ({ status }) => {
    const badges = {
      scheduled: "bg-brand-primary/10 text-brand-primary border-brand-primary/20",
      completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
      cancelled: "bg-red-50 text-red-600 border-red-200"
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${badges[status] || badges.scheduled}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Interview Vault</h1>
          <p className="text-slate-600">Track upcoming interviews, locations, and manage reminders.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button 
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'upcoming' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming
          </button>
          <button 
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'past' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            onClick={() => setActiveTab('past')}
          >
            Past
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {filteredApps.length === 0 ? (
          <div className="text-center py-20">
            <CalendarClock size={48} className="mx-auto text-slate-400 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No interviews {activeTab}</h3>
            <p className="text-slate-500">Apply to jobs to start scheduling your interviews.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredApps.map((app) => (
              <div key={app.id} className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-slate-900">{app.title}</h3>
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="text-slate-600 text-sm mb-4 font-medium">
                    {app.company}
                  </div>
                  
                  <div className="flex items-center gap-6 mt-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock size={16} className="text-slate-400" />
                      {app.date} • {app.time}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin size={16} className="text-slate-400" />
                      {app.location}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 min-w-[200px]">
                  {app.status === 'scheduled' && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Reminders</p>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-slate-700 flex items-center gap-2">
                          <MessageSquare size={14} className="text-green-500" /> WhatsApp
                        </label>
                        <input type="checkbox" defaultChecked={app.reminders.whatsapp} className="rounded text-brand-primary accent-brand-primary" />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-slate-700 flex items-center gap-2">
                          <Phone size={14} className="text-blue-500" /> SMS
                        </label>
                        <input type="checkbox" defaultChecked={app.reminders.sms} className="rounded text-brand-primary accent-brand-primary" />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 w-full">
                    {app.status === 'scheduled' && (
                      <Button variant="primary" size="sm" className="flex-1 bg-brand-primary hover:bg-brand-primary-hover shadow-sm" onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(app.location)}`, '_blank')}>
                        <MapPin size={16} className="mr-2" /> Navigate
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewVault;
