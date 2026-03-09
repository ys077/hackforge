import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  Landmark, 
  FileText, 
  FolderLock, 
  CalendarClock,
  Settings
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/jobs', label: 'Jobs Map', icon: Briefcase },
  { path: '/schemes', label: 'Gov Schemes', icon: Landmark },
  { path: '/resume', label: 'Resume Builder', icon: FileText },
  { path: '/documents', label: 'Documents', icon: FolderLock },
  { path: '/interviews', label: 'Interview Vault', icon: CalendarClock },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const Sidebar = () => {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 z-40 hidden md:flex flex-col pt-20 pb-6 px-4 shadow-sm">
      <div className="flex flex-col gap-2 flex-grow">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-brand-primary/10 text-brand-primary font-semibold' 
                    : 'text-slate-600 hover:text-brand-primary hover:bg-slate-50 border border-transparent'
                }`
              }
            >
              <Icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="mt-auto p-4 rounded-xl bg-slate-50 border border-slate-200">
        <h4 className="text-slate-800 text-sm font-semibold mb-1">UPLIFT Trust</h4>
        <div className="w-full bg-slate-200 rounded-full h-2 mb-2 overflow-hidden">
          <div className="bg-brand-primary h-2 rounded-full w-[85%]"></div>
        </div>
        <p className="text-xs text-slate-500">Profile 85% verified</p>
      </div>
    </aside>
  );
};

export default Sidebar;
