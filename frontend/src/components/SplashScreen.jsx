import React, { useState, useEffect } from 'react';
import { Briefcase, Landmark, FileText, CalendarClock, ChevronRight, SkipForward } from 'lucide-react';

const SplashScreen = ({ onComplete }) => {
  const [stage, setStage] = useState('splash'); // splash, act1_1, act1_2, act1_3, act2

  useEffect(() => {
    let timer;
    if (stage === 'splash') {
      timer = setTimeout(() => setStage('act1_1'), 2500);
    } else if (stage === 'act1_1') {
      timer = setTimeout(() => setStage('act1_2'), 2500);
    } else if (stage === 'act1_2') {
      timer = setTimeout(() => setStage('act1_3'), 2500);
    } else if (stage === 'act1_3') {
      timer = setTimeout(() => setStage('act2'), 2500);
    } else if (stage === 'act2') {
      timer = setTimeout(() => onComplete(), 5000);
    }
    return () => clearTimeout(timer);
  }, [stage, onComplete]);

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-brand-primary flex flex-col items-center justify-center p-6 z-50 text-white overflow-hidden">
      
      {/* Skip Button */}
      {stage !== 'splash' && (
        <button 
          onClick={handleSkip} 
          className="absolute top-6 right-6 flex items-center text-white/70 hover:text-white text-sm font-medium transition-colors"
        >
          Skip <SkipForward className="ml-1 w-4 h-4" />
        </button>
      )}

      {/* STAGE: SPLASH */}
      {stage === 'splash' && (
        <div className="flex flex-col items-center text-center animate-fade-in">
          <div className="w-24 h-24 mb-6 rounded-2xl bg-white flex items-center justify-center animate-bounce-slight shadow-2xl">
            <span className="text-5xl font-bold text-brand-primary">U</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-3 animate-slide-up">UPLIFT</h1>
          <p className="text-lg text-white/90 font-medium tracking-wide animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Your Work. Your Rights. Your Future.
          </p>
        </div>
      )}

      {/* STAGE: ACT 1 (STORY) */}
      {(stage.startsWith('act1')) && (
        <div className="flex flex-col items-center text-center max-w-sm w-full animate-fade-in-slow">
          {stage === 'act1_1' && (
            <div className="space-y-8 animate-slide-up">
              <div className="w-48 h-48 mx-auto bg-white/10 rounded-full flex items-center justify-center">
                <Briefcase size={64} className="text-white opacity-80" />
              </div>
              <p className="text-2xl font-serif px-4">"450 million Indians work hard every day..."</p>
            </div>
          )}
          
          {stage === 'act1_2' && (
            <div className="space-y-8 animate-slide-up">
              <div className="w-48 h-48 mx-auto bg-white/10 rounded-full flex items-center justify-center relative">
                <FileText size={64} className="text-brand-accent opacity-80" />
                <div className="absolute inset-0 border-4 border-dashed border-white/20 rounded-full animate-spin-slow"></div>
              </div>
              <p className="text-2xl font-serif px-4">"...but struggle to find jobs, claim benefits, and access credit."</p>
            </div>
          )}

          {stage === 'act1_3' && (
            <div className="space-y-8 animate-slide-up">
              <div className="w-32 h-64 mx-auto border-4 border-white rounded-3xl p-2 relative">
                <div className="w-full h-full bg-white/20 rounded-2xl animate-pulse"></div>
              </div>
              <p className="text-3xl font-bold text-brand-accent">There's a better way.</p>
            </div>
          )}
        </div>
      )}

      {/* STAGE: ACT 2 (FEATURES) */}
      {stage === 'act2' && (
        <div className="w-full max-w-sm animate-fade-in">
          <h2 className="text-3xl font-bold text-center mb-10">Everything you need, in one place.</h2>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl animate-slide-right" style={{ animationDelay: '0.1s' }}>
              <div className="p-3 bg-brand-secondary rounded-xl"><Briefcase size={24} className="text-white" /></div>
              <p className="font-medium text-lg">Find jobs near you in minutes</p>
            </div>
            
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl animate-slide-right" style={{ animationDelay: '0.3s' }}>
              <div className="p-3 bg-brand-accent rounded-xl"><Landmark size={24} className="text-white" /></div>
              <p className="font-medium text-lg">Discover govt schemes you qualify for</p>
            </div>

            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl animate-slide-right" style={{ animationDelay: '0.5s' }}>
              <div className="p-3 bg-purple-500 rounded-xl"><FileText size={24} className="text-white" /></div>
              <p className="font-medium text-lg">Build your professional resume instantly</p>
            </div>

            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl animate-slide-right" style={{ animationDelay: '0.7s' }}>
              <div className="p-3 bg-emerald-500 rounded-xl"><CalendarClock size={24} className="text-white" /></div>
              <p className="font-medium text-lg">Schedule interviews without conflicts</p>
            </div>
          </div>

          <button 
            onClick={onComplete}
            className="w-full mt-10 bg-white text-brand-primary font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors animate-slide-up" style={{ animationDelay: '1s' }}
          >
            Start Your Journey <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default SplashScreen;
