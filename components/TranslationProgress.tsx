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

  const getStatusText = () => {
    switch (status) {
      case TranslationStatus.READY:
        return 'Ready to Translate';
      case TranslationStatus.TRANSLATING:
        return 'Translating...';
      case TranslationStatus.PAUSED:
        return 'Translation Paused';
      case TranslationStatus.COMPLETE:
        return 'Translation Complete';
      default:
        return '';
    }
  };

  const getBarColor = () => {
    if (status === TranslationStatus.PAUSED) return 'bg-amber-500';
    if (status === TranslationStatus.COMPLETE) return 'bg-green-500';
    if (status === TranslationStatus.READY) return 'bg-slate-300';
    return 'bg-primary-500';
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-slate-700 text-sm uppercase tracking-wide">
          {getStatusText()}
        </span>
        <span className="text-slate-500 text-sm font-medium">
          {Math.round(progress)}%
        </span>
      </div>
      
      <div className="w-full bg-slate-100 rounded-full h-2.5 mb-4 overflow-hidden">
        <div 
          className={`${getBarColor()} h-2.5 rounded-full transition-all duration-500 ease-out`} 
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="flex justify-between items-center text-xs text-slate-400">
        <span>
           {status === TranslationStatus.COMPLETE 
             ? `Completed ${totalChunks} chunks` 
             : status === TranslationStatus.READY
               ? `Total ${totalChunks} chunks to process`
               : `Processing chunk ${currentChunk} of ${totalChunks}`
           }
        </span>
        <span>~25 lines per chunk</span>
      </div>
    </div>
  );
};