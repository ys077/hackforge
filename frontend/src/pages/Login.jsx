import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import { LogIn, MessageSquare } from 'lucide-react';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState('English');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { authService } = require('../services/authService');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      await authService.sendOtp(phone);
      setStep(2);
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 4) {
      setError('Please enter a valid OTP');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(phone, otp);
      setStep(3); // Go to language selection
    } catch (err) {
      setError('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const languages = [
    'English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Bengali',
    'Marathi', 'Gujarati', 'Punjabi', 'Malayalam', 'Odia', 'Assamese'
  ];

  const handleLanguageSelect = (lang) => {
    setLanguage(lang);
    // In a real app, save to user preferences in DB
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-96 bg-brand-primary/10 blur-[100px] rounded-full -z-10"></div>
      
      <Link to="/" className="mb-8 flex items-center gap-3 decoration-transparent">
        <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center font-bold text-xl text-white">
          U
        </div>
        <span className="text-2xl font-bold text-brand-primary tracking-tight">
          UPLIFT
        </span>
      </Link>

      <div className="bg-white border border-slate-200 w-full max-w-md p-8 shadow-xl rounded-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h1>
          <p className="text-slate-500 text-sm">Sign in to access your jobs and schemes</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <Input 
              label="Phone Number" 
              type="tel" 
              placeholder="e.g. 9876543210" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              prefix="+91"
              autoFocus
            />
            <Button 
              type="submit" 
              className="w-full justify-center bg-brand-primary hover:bg-brand-primary-hover" 
              isLoading={loading}
            >
              <MessageSquare size={18} className="mr-2" /> Send OTP
            </Button>
          </form>
        )}
        
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <Input 
              label="Enter OTP" 
              type="text" 
              placeholder="4-digit code" 
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={4}
              autoFocus
            />
            <Button 
              type="submit" 
              className="w-full justify-center bg-brand-primary hover:bg-brand-primary-hover" 
              isLoading={loading}
            >
              <LogIn size={18} className="mr-2" /> Verify & Login
            </Button>
            <p className="text-center text-sm text-slate-500 mt-4">
              Didn't receive code? <button type="button" className="text-brand-secondary hover:underline" onClick={() => setStep(1)}>Resend</button>
            </p>
          </form>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Select Language</h2>
              <p className="text-sm text-slate-500">Choose your preferred language</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {languages.map(lang => (
                <button
                  key={lang}
                  onClick={() => handleLanguageSelect(lang)}
                  className="w-full py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary font-medium transition-colors"
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-secondary font-medium hover:underline transition-colors">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
