import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import { UserPlus } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    age: '',
    occupation: '',
    education: '',
    location: ''
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
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Create Account</h1>
          <p className="text-slate-500 text-sm">Join the platform tailored for your growth</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <Input 
            label="Full Name" 
            type="text" 
            placeholder="John Doe" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Phone Number" 
              type="tel" 
              placeholder="9876543210" 
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              required
              maxLength={10}
            />
            <Input 
              label="Age" 
              type="number" 
              placeholder="e.g. 28" 
              value={formData.age}
              onChange={(e) => setFormData({...formData, age: e.target.value})}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-sm font-medium text-slate-600">Occupation / Work Type</label>
            <select 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
              value={formData.occupation}
              onChange={(e) => setFormData({...formData, occupation: e.target.value})}
              required
            >
              <option value="" disabled>Select occupation</option>
              <option value="mason">Mason / Construction Worker</option>
              <option value="driver">Driver / Delivery</option>
              <option value="electrician">Electrician</option>
              <option value="tailor">Tailor</option>
              <option value="plumber">Plumber</option>
              <option value="domestic_help">Domestic Help</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-sm font-medium text-slate-600">Education Level</label>
            <select 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
              value={formData.education}
              onChange={(e) => setFormData({...formData, education: e.target.value})}
              required
            >
              <option value="" disabled>Select education</option>
              <option value="none">No Schooling</option>
              <option value="primary">Primary School</option>
              <option value="secondary">Secondary School (10th)</option>
              <option value="diploma">Diploma / ITI</option>
              <option value="graduate">Graduate</option>
            </select>
          </div>

          <Input 
            label="Location" 
            type="text" 
            placeholder="City or District (auto-detected)" 
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
            required
          />

          <Button 
            type="submit" 
            className="w-full justify-center mt-4 bg-brand-primary hover:bg-brand-primary-hover" 
            isLoading={loading}
          >
            <UserPlus size={18} className="mr-2" /> Complete Registration
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-secondary font-medium hover:underline transition-colors">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
