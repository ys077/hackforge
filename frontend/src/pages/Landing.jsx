import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Landmark, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import Button from '../components/Button';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20">
            H
          </div>
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            HackForge
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/login')}>Login</Button>
          <Button variant="primary" onClick={() => navigate('/register')}>Get Started</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-20 pb-32 text-center relative z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-[100px] rounded-full -z-10"></div>
        
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
          <span className="text-sm font-medium text-slate-300">Empowering India's Informal Workforce</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">
          Your Bridge to <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
            Opportunities & Benefits
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
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
      <section id="features" className="container mx-auto px-6 py-24 border-t border-white/10 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Everything You Need to Grow</h2>
          <p className="text-slate-400">Powered by advanced AI matching and secure document verification.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="glass-panel p-8 hover:-translate-y-2 transition-transform">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
              <Briefcase size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3">AI Job Matching</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Find local and remote opportunities mapped exactly to your skills. Map-based discovery included.
            </p>
          </div>
          
          <div className="glass-panel p-8 hover:-translate-y-2 transition-transform">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
              <Landmark size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3">Gov Schemes</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Never miss out on welfare benefits. Our NLP engine perfectly matches you to eligible schemes.
            </p>
          </div>
          
          <div className="glass-panel p-8 hover:-translate-y-2 transition-transform">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
              <FileText size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3">ATS Resumes</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Transform your raw experience into a beautifully formatted, highly-scoring professional PDF.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Banner */}
      <section className="bg-slate-800/50 border-y border-white/10 py-16">
        <div className="container mx-auto px-6 text-center">
          <ShieldCheck size={48} className="text-blue-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">Secure & Verified Profiles</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Our multi-layered AI document verification ensures you stand out to employers with a "High Trust Score", proving authenticity instantly.
          </p>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 text-center text-sm text-slate-500">
        © 2026 HackForge Inc. Empowering the informal economy.
      </footer>
    </div>
  );
};

export default Landing;
