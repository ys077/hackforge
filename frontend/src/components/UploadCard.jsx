import React, { useRef, useState } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, FileText, Camera } from 'lucide-react';
import Button from './Button';

const UploadCard = ({ onUpload, docType, label, isLoading }) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file) => {
    if (!file) return;
    
    // Create preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
        if (onUpload) onUpload(file, e.target.result.split(',')[1], docType); // Pass base64
      };
      reader.readAsDataURL(file);
    } else {
      setPreview('document_placeholder'); // Non-image indicator
      if (onUpload) {
        const reader = new FileReader();
        reader.onload = (e) => {
          onUpload(file, e.target.result.split(',')[1], docType); // Pass base64
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="glass-panel p-6">
      <h3 className="text-lg font-semibold text-white mb-1">{label}</h3>
      <p className="text-sm text-slate-400 mb-4">Upload a clear photo or PDF</p>
      
      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-slate-800/50 flex flex-col items-center justify-center p-4">
          {preview === 'document_placeholder' ? (
            <div className="py-8 flex flex-col items-center gap-2">
              <FileText size={48} className="text-blue-400" />
              <span className="text-sm font-medium">Document Attached</span>
            </div>
          ) : (
            <img src={preview} alt="Preview" className="max-h-48 object-contain rounded-md" />
          )}
          
          <div className="w-full flex gap-2 mt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              size="sm"
              onClick={() => {
                setPreview(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              Replace
            </Button>
            <Button 
              variant="primary" 
              className="flex-1"
              size="sm"
              isLoading={isLoading}
              disabled={isLoading}
            >
              Upload
            </Button>
          </div>
        </div>
      ) : (
        <div 
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 ${
            dragActive ? 'border-blue-500 bg-blue-500/5' : 'border-slate-700 hover:border-slate-500 bg-slate-800/30'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-2 shadow-inner">
            <UploadCloud size={24} />
          </div>
          <div className="text-sm font-medium text-slate-300">
            Click to upload or drag & drop
          </div>
          <div className="text-xs text-slate-500">
            JPG, PNG or PDF (max. 10MB)
          </div>
          
          <input 
            ref={fileInputRef}
            type="file" 
            className="hidden" 
            accept="image/*,.pdf" 
            onChange={handleChange} 
          />
        </div>
      )}
      
      <div className="mt-4 flex justify-center">
         <span className="text-xs text-slate-400 flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors"
           onClick={() => fileInputRef.current?.click()}>
           <Camera size={14} /> Open Camera
         </span>
      </div>
    </div>
  );
};

export default UploadCard;
