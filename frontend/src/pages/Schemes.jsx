import React, { useState, useEffect } from 'react';
import SchemeCard from '../components/SchemeCard';
import Input from '../components/Input';
import Button from '../components/Button';
import { schemeService } from '../services/schemeService';
import { Search, SlidersHorizontal } from 'lucide-react';

const Schemes = () => {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Default demo user profile
  const [profile] = useState({
    user_id: "demo_123",
    age: 35,
    gender: "male",
    income: 120000,
    state: "Maharashtra",
    occupation: "Construction Worker",
    category: "obc",
    employment_status: "employed",
    marital_status: "single"
  });

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const data = await schemeService.getRecommendations(profile);
      setSchemes(data);
    } catch (err) {
      console.error("Failed to load schemes:", err);
      // Fallback data for demo
      setSchemes([
        {
          scheme_name: "PM Vishwakarma",
          description: "End-to-end holistic support to traditional artisans and craftspeople through access to collateral-free credit, skill training, and modern tools.",
          match_score: 0.96,
          matching_reasons: ["Matches occupation category", "Skill enhancement needed"],
          url: "https://pmvishwakarma.gov.in/"
        },
        {
          scheme_name: "Ayushman Bharat PM-JAY",
          description: "Health insurance cover of Rs. 5 lakhs per family per year for secondary and tertiary care hospitalization.",
          match_score: 0.88,
          matching_reasons: ["Eligible by state", "Below income threshold"],
          url: "https://pmjay.gov.in/"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredSchemes = schemes.filter(s => 
    s.scheme_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="py-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Government Schemes</h1>
          <p className="text-slate-600">AI-matched welfare programs, loans, and housing benefits tailored for you.</p>
        </div>
        
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative w-full md:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Search schemes..." 
              className="pl-10 h-10 border-slate-200 bg-white" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="px-3" title="Filters">
            <SlidersHorizontal size={18} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 flex-1">
          <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500">Analyzing thousands of schemes to find your matches...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-8 pr-2 custom-scrollbar">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Top Recommendations for You</h2>
            <span className="text-sm text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20 font-medium">
              {filteredSchemes.length} matches found
            </span>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSchemes.map((scheme, idx) => (
              <SchemeCard 
                key={idx} 
                scheme={scheme} 
                matchScore={scheme.match_score}
                onApply={(s) => window.open(s.url || s.application_link, '_blank')}
              />
            ))}
          </div>

          {filteredSchemes.length === 0 && (
            <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl mt-4 shadow-sm">
              <Landmark size={48} className="mx-auto text-slate-400 mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">No matches found</h3>
              <p className="text-slate-500">Try adjusting your profile or search terms.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Schemes;
