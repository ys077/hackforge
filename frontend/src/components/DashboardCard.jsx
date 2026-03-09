import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const DashboardCard = ({ title, description, icon: Icon, path, colorClass = "from-blue-500 to-cyan-500", stats }) => {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate(path)}
      className="glass-panel p-6 cursor-pointer group hover:border-white/20 transition-all hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.3)] relative overflow-hidden"
    >
      <div className={`absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br ${colorClass} rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500`}></div>
      
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClass} p-3 mb-6 shadow-lg transform group-hover:-translate-y-2 transition-transform duration-300 flex items-center justify-center`}>
        <Icon size={28} className="text-white" />
      </div>

      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm mb-6 pr-4">{description}</p>

      {stats && (
        <div className="flex items-center gap-4 mb-6 pt-4 border-t border-white/5">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col">
              <span className="text-2xl font-bold text-white leading-none mb-1">{stat.value}</span>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center text-sm font-semibold text-white/70 group-hover:text-white transition-colors">
        Access Module 
        <ArrowRight size={16} className="ml-2 transform group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
};

export default DashboardCard;
