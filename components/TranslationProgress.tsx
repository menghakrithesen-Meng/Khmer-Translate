import React from 'react';
import { TranslationStatus } from '../types';

interface TranslationProgressProps {
  status: TranslationStatus;
  progress: number;
  currentChunk: number;
  totalChunks: number;
}

export const TranslationProgress: React.FC<TranslationProgressProps> = ({ status, progress, currentChunk, totalChunks }) => {
  if (status === TranslationStatus.IDLE || status === TranslationStatus.PARSING) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mb-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-slate-700 text-sm uppercase tracking-wide">
          {status === TranslationStatus.COMPLETE ? 'Translation Complete' : 'Translating...'}
        </span>
        <span className="text-slate-500 text-sm font-medium">
          {Math.round(progress)}%
        </span>
      </div>
      
      <div className="w-full bg-slate-100 rounded-full h-2.5 mb-4 overflow-hidden">
        <div 
          className="bg-primary-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {status === TranslationStatus.TRANSLATING && (
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span>Processing chunk {currentChunk} of {totalChunks}</span>
          <span>~25 lines per chunk</span>
        </div>
      )}
    </div>
  );
};
