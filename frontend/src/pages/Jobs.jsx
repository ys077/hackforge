import React, { useState, useEffect, useRef } from 'react';
import JobCard from '../components/JobCard';
import Input from '../components/Input';
import Button from '../components/Button';
import { jobService } from '../services/jobService';
import { Search, Map as MapIcon, List, SlidersHorizontal, MapPin } from 'lucide-react';
import * as maptilersdk from '@maptiler/sdk';
import "@maptiler/sdk/dist/maptiler-sdk.css";

// Using a placeholder or from environment
maptilersdk.config.apiKey = 'YOUR_MAPTILER_API_KEY_HERE';

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [searchTerm, setSearchTerm] = useState('');
  const mapContainer = useRef(null);
  const map = useRef(null);

  // Default demo profile
  const [profile] = useState({
    user_id: "demo_123",
    skills: ["plumbing", "pipe fitting", "repair"],
    experience_years: 3,
    education_level: "10th_pass",
    location: "Mumbai",
    job_preferences: ["full_time"]
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (viewMode === 'map' && mapContainer.current && !map.current && jobs.length > 0) {
      initializeMap();
    }
  }, [viewMode, jobs]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await jobService.getMatches(profile);
      setJobs(data);
    } catch (err) {
      console.error("Failed to load jobs", err);
      // Fallback demo data
      setJobs([
        {
          job: {
            title: "Senior Plumber",
            company: "QuickFix Repairs",
            location: "Andheri East, Mumbai",
            salary_range: "₹15,000 - ₹25,000/mo",
            description: "Looking for an experienced plumber for residential maintenance. Must know pipe fitting.",
            lat: 19.1136,
            lng: 72.8697
          },
          match_score: 0.92,
          matching_skills: ["plumbing", "pipe fitting"]
        },
        {
          job: {
            title: "Maintenance Technician",
            company: "Lodha Group",
            location: "Lower Parel, Mumbai",
            salary_range: "₹20,000 - ₹30,000/mo",
            description: "General building maintenance including basic plumbing and electrical checks.",
            lat: 18.9950,
            lng: 72.8274
          },
          match_score: 0.78,
          matching_skills: ["repair", "plumbing"]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = () => {
    // Determine center (average of job coordinates)
    const centerLng = jobs.reduce((sum, j) => sum + (j.job.lng || 72.8777), 0) / jobs.length;
    const centerLat = jobs.reduce((sum, j) => sum + (j.job.lat || 19.0760), 0) / jobs.length;

    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle.STREETS.DARK,
      center: [centerLng, centerLat],
      zoom: 11
    });

    // Add markers
    jobs.forEach((item) => {
      const { job, match_score } = item;
      if (job.lng && job.lat) {
        // Color based on match score
        const color = match_score > 0.8 ? '#10b981' : '#f59e0b'; // Green vs Amber
        
        const popup = new maptilersdk.Popup({ offset: 25 }).setHTML(
          `<div style="color: black; padding: 5px;">
            <h3 style="font-weight: bold; margin-bottom: 2px;">${job.title}</h3>
            <p style="font-size: 12px; color: #555;">${job.company}</p>
            <p style="font-size: 12px; color: #10b981; font-weight: bold; margin-top: 4px;">${job.salary_range}</p>
          </div>`
        );

        new maptilersdk.Marker({ color })
          .setLngLat([job.lng, job.lat])
          .setPopup(popup)
          .addTo(map.current);
      }
    });
  };

  const filteredJobs = jobs.filter(j => 
    j.job.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    j.job.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="py-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-80px)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Job Opportunities</h1>
          <p className="text-slate-400">Discover and apply to roles perfectly matched to your skills.</p>
        </div>
        
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative w-full md:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Search by title or location..." 
              className="pl-10" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex bg-slate-800 p-1 rounded-xl border border-white/10 shrink-0">
            <button 
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List size={18} />
            </button>
            <button 
              className={`p-2 rounded-lg transition-colors ${viewMode === 'map' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setViewMode('map')}
              title="Map View"
            >
              <MapIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-400">Finding the best local jobs for you...</p>
        </div>
      ) : (
        <div className="flex-1 relative min-h-0">
          {viewMode === 'list' ? (
            <div className="h-full overflow-y-auto pb-10 pr-2 custom-scrollbar grid md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
              {filteredJobs.map((item, idx) => (
                <JobCard 
                  key={idx} 
                  job={item.job} 
                  matchScore={item.match_score}
                  onApply={(job) => window.alert(`Applied for ${job.title}!`)}
                />
              ))}
              
              {filteredJobs.length === 0 && (
                <div className="col-span-full text-center py-20 glass-panel">
                  <MapPin size={48} className="mx-auto text-slate-600 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No jobs found nearby</h3>
                  <p className="text-slate-400">Try zooming out or adjusting your search.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 relative">
              <div 
                ref={mapContainer} 
                className="absolute inset-0" 
                style={{ backgroundColor: '#1e293b' }}
              />
              {/* Map Legend */}
              <div className="absolute top-4 left-4 glass-panel p-3 text-sm z-10 flex flex-col gap-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span> High Match (&gt;80%)
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span> Good Match
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Jobs;
