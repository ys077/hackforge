import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { Save, User, MapPin, Globe } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();

  return (
    <div className="py-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
      <div className="mb-8 border-b border-white/10 pb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Profile Settings</h1>
        <p className="text-slate-400">Manage your account preferences and personal information.</p>
      </div>

      <div className="glass-panel p-8 mb-6">
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-white/10">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-4xl shadow-xl shadow-blue-500/20">
            {user?.name ? user.name.charAt(0) : 'W'}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{user?.name || 'Worker User'}</h2>
            <p className="text-slate-400 mb-2">{user?.phone || '+91 9876543210'}</p>
            <Button variant="outline" size="sm">Change Avatar</Button>
          </div>
        </div>

        <form className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Input label="Full Name" defaultValue={user?.name || 'Worker User'} icon={<User size={18} />} />
            <Input label="Phone Number" defaultValue={user?.phone || '+91 9876543210'} disabled />
            <Input label="Location" defaultValue="Mumbai, MH" icon={<MapPin size={18} />} />
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-sm font-medium text-slate-400">Language Preference</label>
              <select className="glass-input rounded-xl px-4 py-2.5 w-full">
                <option value="en" className="text-black">English</option>
                <option value="hi" className="text-black">Hindi (हिन्दी)</option>
                <option value="mr" className="text-black">Marathi (मराठी)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button variant="primary" className="px-8">
              <Save size={18} className="mr-2" /> Save Changes
            </Button>
          </div>
        </form>
      </div>

      <div className="glass-panel border-red-500/20 bg-red-500/5 p-6">
        <h3 className="text-lg font-bold text-red-400 mb-2">Danger Zone</h3>
        <p className="text-slate-400 text-sm mb-4">Permanently delete your account and all associated data.</p>
        <Button variant="danger">Delete Account</Button>
      </div>
    </div>
  );
};

export default Settings;
