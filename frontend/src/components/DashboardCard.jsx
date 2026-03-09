import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const DashboardCard = ({ title, description, icon: Icon, path, colorClass = "from-blue-500 to-cyan-500", stats }) => {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate(path)}
      className="bg-white border border-slate-200 rounded-2xl p-6 cursor-pointer group hover:-translate-y-1 hover:shadow-md transition-all relative overflow-hidden flex flex-col h-full"
    >
      <div className={`absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br ${colorClass} rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-500`}></div>
      
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClass} p-3 mb-5 shadow-sm transform group-hover:-translate-y-1 transition-transform duration-300 flex items-center justify-center`}>
        <Icon size={24} className="text-white" />
      </div>

      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm mb-6 pr-4 flex-grow">{description}</p>

      {stats && (
        <div className="flex items-center gap-6 mb-6 pt-4 border-t border-slate-100">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col">
              <span className="text-2xl font-black text-slate-800 leading-none mb-1">{stat.value}</span>
              <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center text-sm font-semibold text-brand-primary group-hover:text-brand-primary-hover transition-colors mt-auto">
        Access Module 
        <ArrowRight size={16} className="ml-2 transform group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
};

export default DashboardCard;
