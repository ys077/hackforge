import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Landmark, FileText, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import Button from '../components/Button';
import SplashScreen from '../components/SplashScreen';

const Landing = () => {
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-brand-primary/20">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center font-bold text-xl shadow-lg shadow-brand-primary/20">
            <span className="text-white">U</span>
          </div>
          <span className="text-2xl font-bold text-brand-primary tracking-tight">
            UPLIFT
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="text-brand-primary border-brand-primary hover:bg-brand-primary/10" onClick={() => navigate('/login')}>Log In</Button>
          <Button variant="primary" onClick={() => navigate('/register')}>Get Started</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-20 pb-32 text-center relative z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-primary/5 blur-[100px] rounded-full -z-10"></div>
        
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-primary/20 bg-brand-primary/5 backdrop-blur-md mb-8">
          <span className="flex h-2 w-2 rounded-full bg-brand-primary"></span>
          <span className="text-sm font-medium text-brand-primary">Your Work. Your Rights. Your Future.</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight text-slate-900">
          Everything you need,<br/>
          <span className="text-brand-primary">
            in one place.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
          The AI-powered platform for verifying documents, building professional resumes, discovering government schemes, and landing jobs securely.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="primary" size="lg" className="w-full sm:w-auto" onClick={() => navigate('/register')}>
            Join for Free <ArrowRight size={20} className="ml-2" />
          </Button>
          <Button variant="outline" size="lg" className="w-full sm:w-auto bg-slate-900" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
            Explore Features
          </Button>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className="container mx-auto px-6 py-24 border-t border-slate-200 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4 text-slate-900">Module Capabilities</h2>
          <p className="text-slate-600">Powered by advanced AI matching and secure Document Trust scores.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 rounded-xl bg-brand-secondary/10 flex items-center justify-center text-brand-secondary mb-5">
              <Briefcase size={24} />
            </div>
            <h3 className="text-lg font-bold mb-2 text-slate-900">AI Job Matching</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Find local opportunities matched exactly to your profile within set km radii.
            </p>
          </div>
          
          <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent mb-5">
              <Landmark size={24} />
            </div>
            <h3 className="text-lg font-bold mb-2 text-slate-900">Gov Schemes</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Never miss welfare benefits. Apply directly for you and your family coverage.
            </p>
          </div>
          
          <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 mb-5">
              <FileText size={24} />
            </div>
            <h3 className="text-lg font-bold mb-2 text-slate-900">ATS Resumes</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Transform raw experience into a high-scoring resume optimized for tracking systems.
            </p>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-5">
              <CalendarClock size={24} />
            </div>
            <h3 className="text-lg font-bold mb-2 text-slate-900">InterviewVault</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Schedule meetings with deadlock-prevention and real-time travel ETAs via maps.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Banner */}
      <section className="bg-brand-primary text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <ShieldCheck size={48} className="text-brand-accent mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">Secure & Verified Profiles</h2>
          <p className="text-white/80 max-w-xl mx-auto">
            Our multi-layered AI document verification maps Aadhaar, PAN, and more to ensure you stand out with a "High Trust Score", proving authenticity instantly to employers.
          </p>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 text-center text-sm text-slate-500 border-t border-slate-200">
        © 2026 UPLIFT. Empowering the informal economy.
      </footer>
    </div>
  );
};

export default Landing;
