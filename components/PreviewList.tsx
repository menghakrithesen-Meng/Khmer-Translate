import React from 'react';
import { SrtBlock } from '../types';

interface PreviewListProps {
  blocks: SrtBlock[];
}

export const PreviewList: React.FC<PreviewListProps> = ({ blocks }) => {
  if (blocks.length === 0) return null;

  // Show only the first few, some middle ones, and last few if list is huge to preserve DOM performance? 
  // For simplicity in this demo, we render a virtualization-friendly limited view or just the first 50 for preview.
  // Let's show first 20 items for preview to keep the DOM light.
  const previewLimit = 10;
  const previewBlocks = blocks.slice(0, previewLimit);

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <span className="w-2 h-6 bg-primary-500 rounded-full"></span>
        Preview (First {previewLimit} lines)
      </h3>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-2">Time</div>
          <div className="col-span-4">Original</div>
          <div className="col-span-5">Khmer Translation</div>
        </div>
        
        <div className="divide-y divide-slate-100">
          {previewBlocks.map((block) => (
            <div key={block.id} className="grid grid-cols-12 p-4 hover:bg-slate-50 transition-colors text-sm">
              <div className="col-span-1 text-slate-400 font-mono text-xs flex items-center justify-center">{block.id}</div>
              <div className="col-span-2 text-slate-500 font-mono text-xs flex flex-col justify-center">
                <span>{block.startTime}</span>
                <span>{block.endTime}</span>
              </div>
              <div className="col-span-4 text-slate-700 pr-4 leading-relaxed">{block.originalText}</div>
              <div className="col-span-5 text-slate-900 font-khmer font-medium leading-relaxed text-base">{block.text}</div>
            </div>
          ))}
        </div>
        
        {blocks.length > previewLimit && (
          <div className="p-4 bg-slate-50 text-center text-slate-500 text-sm">
            ... and {blocks.length - previewLimit} more lines ready for download.
          </div>
        )}
      </div>
    </div>
  );
};
