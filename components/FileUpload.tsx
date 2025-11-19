import React, { useRef } from 'react';
import { TranslationStatus } from '../types';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  status: TranslationStatus;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, status }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.toLowerCase().endsWith('.srt')) {
        onFileSelect(file);
      } else {
        alert("Please upload a valid .srt file.");
      }
    }
  };

  const isDisabled = status === TranslationStatus.TRANSLATING || status === TranslationStatus.PAUSED;

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div 
        className={`
          border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300
          ${isDisabled ? 'opacity-50 cursor-not-allowed border-slate-300 bg-slate-50' : 'border-primary-300 bg-white hover:border-primary-500 hover:shadow-lg hover:shadow-primary-50/50 cursor-pointer'}
        `}
        onClick={() => !isDisabled && inputRef.current?.click()}
      >
        <input
          type="file"
          ref={inputRef}
          onChange={handleFileChange}
          accept=".srt"
          className="hidden"
          disabled={isDisabled}
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center text-primary-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-700">Upload SRT File</h3>
            <p className="text-slate-500 text-sm mt-1">Click to browse your device</p>
          </div>
        </div>
      </div>
    </div>
  );
};