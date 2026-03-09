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
  { path: '/applications', label: 'Applications', icon: CalendarClock },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const Sidebar = () => {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900/90 backdrop-blur-xl border-r border-white/10 z-40 hidden md:flex flex-col pt-20 pb-6 px-4">
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
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-[0_4px_20px_rgba(59,130,246,0.1)]' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent'
                }`
              }
            >
              <Icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="mt-auto p-4 rounded-xl bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-white/10">
        <h4 className="text-white text-sm font-semibold mb-1">HackForge Trust</h4>
        <div className="w-full bg-slate-800 rounded-full h-2 mb-2 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-400 to-green-500 h-2 rounded-full w-[85%]"></div>
        </div>
        <p className="text-xs text-slate-400">Profile 85% verified</p>
      </div>
    </aside>
  );
};

export default Sidebar;
