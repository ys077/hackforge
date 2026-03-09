import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import { UserPlus } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    industry: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { authService } = require('../services/authService');

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 1. Send OTP to start registration flow
      await authService.sendOtp(formData.phone);
      // 2. Redirect to Login to complete OTP verification
      // Note: Ideally, the completeProfile endpoint is called after OTP verifcation,
      // but for simplicity, we pass them to Login to verify the standard OTP flow.
      alert(`OTP sent to ${formData.phone}. Please login to complete your profile.`);
      navigate('/login');
    } catch (err) {
      console.error(err);
      alert('Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-6 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-96 bg-purple-500/20 blur-[100px] rounded-full -z-10"></div>
      
      <Link to="/" className="mb-8 flex items-center gap-3 decoration-transparent">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center font-bold text-xl text-white">
          H
        </div>
        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          HackForge
        </span>
      </Link>

      <div className="glass-panel w-full max-w-md p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-slate-400 text-sm">Join the platform tailored for your growth</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <Input 
            label="Full Name" 
            type="text" 
            placeholder="John Doe" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          <Input 
            label="Phone Number" 
            type="tel" 
            placeholder="9876543210" 
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            required
            maxLength={10}
          />
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-sm font-medium text-slate-400">Primary Industry</label>
            <select 
              className="glass-input rounded-xl px-4 py-2.5 w-full"
              value={formData.industry}
              onChange={(e) => setFormData({...formData, industry: e.target.value})}
              required
            >
              <option value="" disabled className="text-slate-800">Select an industry</option>
              <option value="construction" className="text-slate-800">Construction & Labor</option>
              <option value="delivery" className="text-slate-800">Delivery & Logistics</option>
              <option value="domestic" className="text-slate-800">Domestic Help</option>
              <option value="manufacturing" className="text-slate-800">Manufacturing & Factory</option>
              <option value="other" className="text-slate-800">Other</option>
            </select>
          </div>

          <Button 
            type="submit" 
            className="w-full justify-center mt-2" 
            isLoading={loading}
          >
            <UserPlus size={18} className="mr-2" /> Complete Registration
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 font-medium hover:text-blue-300 transition-colors">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
