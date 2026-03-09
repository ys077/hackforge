import React, { useState, useEffect } from 'react';
import UploadCard from '../components/UploadCard';
import { documentService } from '../services/documentService';
import { ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

const UploadDocuments = () => {
  const [trustScore, setTrustScore] = useState(0);
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({});

  useEffect(() => {
    // Initial fetch of trust score. Assuming user ID is handled via token
    documentService.getTrustScore().then(res => {
      setTrustScore(res.trust_score || 0);
    }).catch(err => console.log('No existing trust score or backend not connected'));
  }, []);

  const handleUpload = async (file, base64Data, type) => {
    setLoading(prev => ({ ...prev, [type]: true }));
    try {
      // 1. Send to ML Classifier to verify type matches expectation
      const clsRes = await documentService.classifyDocumentMl(base64Data);
      
      // 2. Send to ML Verifier for tampering/OCR analysis
      const verRes = await documentService.verifyDocumentMl(base64Data, type);
      
      // 3. Save to backend (Optional based on architecture)
      // await documentService.uploadDocument(base64Data, type);

      setResults(prev => ({ ...prev, [type]: {
        success: verRes.verified,
        confidence: verRes.confidence || clsRes.confidence,
        detectedType: clsRes.predicted_type,
        message: verRes.verification_status
      }}));

      if (verRes.verified) {
        setTrustScore(prev => Math.min(100, prev + 25)); // Arbitrary increment for demo
      }

    } catch (err) {
      setResults(prev => ({ ...prev, [type]: {
        success: false,
        message: "Failed to connect to ML Verification service"
      }}));
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Secure Document Locker</h1>
          <p className="text-slate-600">Upload documents to verify your identity and skills. A higher trust score unlocks better jobs.</p>
        </div>

        {/* Global Trust Score Indicator */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-5 min-w-[250px] shadow-sm">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100" />
              <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" 
                strokeDasharray={175} strokeDashoffset={175 - (175 * trustScore) / 100}
                className={`transition-all duration-1000 ${trustScore > 70 ? 'text-brand-primary' : trustScore > 40 ? 'text-brand-accent' : 'text-red-500'}`} />
            </svg>
            <span className="absolute text-lg font-bold text-slate-800">{trustScore}%</span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-brand-secondary uppercase tracking-wider mb-1">AI Trust Score</h4>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <ShieldCheck size={14} className={trustScore > 70 ? 'text-brand-primary' : 'text-slate-400'} />
              {trustScore > 70 ? 'Highly Trusted' : 'Needs Verification'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Document Cards */}
        {[
          { id: 'aadhaar', label: 'Aadhaar Card (+20 pts)' },
          { id: 'passbook', label: 'Bank Passbook (+20 pts)' },
          { id: 'pan', label: 'PAN Card (+15 pts)' },
          { id: 'certificate', label: 'Skill Certificates (+15 pts)' },
          { id: 'employment_letter', label: 'Employment Letters (+15 pts)' },
          { id: 'trade_licence', label: 'Trade Licence (+15 pts)' },
          { id: 'voter_id', label: 'Voter ID (+10 pts)' }
        ].map(doc => (
          <div key={doc.id} className="flex flex-col gap-2">
            <UploadCard 
              label={doc.label} 
              docType={doc.id}
              onUpload={handleUpload}
              isLoading={loading[doc.id]}
            />
            {results[doc.id] && (
              <div className={`text-sm p-3 rounded-xl border flex items-start gap-2 ${
                results[doc.id].success 
                  ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary'
                  : 'bg-red-50 border-red-200 text-red-600'
              }`}>
                {results[doc.id].success ? <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />}
                <div>
                  <div className="font-semibold">{results[doc.id].success ? 'Verified Successfully' : 'Verification Failed'}</div>
                  <div className="text-xs mt-1 opacity-80">
                    Confidence: {(results[doc.id].confidence * 100).toFixed(1)}% <br/>
                    Detected: {results[doc.id].detectedType || doc.id} <br/>
                    Status: {results[doc.id].message}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UploadDocuments;
