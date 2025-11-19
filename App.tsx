import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { TranslationProgress } from './components/TranslationProgress';
import { PreviewList } from './components/PreviewList';
import { parseSrt, stringifySrt, chunkArray } from './services/srtParser';
import { translateChunk } from './services/geminiService';
import { TranslationState, TranslationStatus, SrtBlock } from './types';

const CHUNK_SIZE = 25;

const App: React.FC = () => {
  const [state, setState] = useState<TranslationState>({
    status: TranslationStatus.IDLE,
    progress: 0,
    currentChunk: 0,
    totalChunks: 0,
    blocks: [],
    fileName: '',
  });

  const handleFileSelect = useCallback(async (file: File) => {
    setState(prev => ({ 
      ...prev, 
      status: TranslationStatus.PARSING, 
      fileName: file.name,
      error: undefined 
    }));

    try {
      const text = await file.text();
      const parsedBlocks = parseSrt(text);

      if (parsedBlocks.length === 0) {
        throw new Error("No valid subtitle blocks found in this file.");
      }

      const chunks = chunkArray(parsedBlocks, CHUNK_SIZE);

      setState(prev => ({
        ...prev,
        status: TranslationStatus.TRANSLATING,
        totalChunks: chunks.length,
        blocks: parsedBlocks, // Store originals initially
        currentChunk: 0,
        progress: 0
      }));

      await processChunks(chunks, parsedBlocks);

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        status: TranslationStatus.ERROR,
        error: error.message || "Failed to parse file."
      }));
    }
  }, []);

  const processChunks = async (chunks: SrtBlock[][], allBlocks: SrtBlock[]) => {
    // Create a map for fast updates
    const translatedBlocksMap = new Map<number, string>();
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        setState(prev => ({ ...prev, currentChunk: i + 1 }));
        
        const translatedItems = await translateChunk(chunk);
        
        // Update map
        translatedItems.forEach(item => {
          translatedBlocksMap.set(item.id, item.text);
        });

        // Update progress state
        const progress = Math.round(((i + 1) / chunks.length) * 100);
        
        // Update blocks in state partially for preview?
        // For performance, we might not want to update the main block list every chunk if the list is huge, 
        // but updating progress is essential.
        // Let's update the main blocks at the end to avoid excessive re-renders, 
        // or update just the 'blocks' array in state if we want live preview updates.
        // We'll update state every chunk for better UX (live preview).
        
        setState(prev => {
           const updatedBlocks = prev.blocks.map(b => {
             if (translatedBlocksMap.has(b.id)) {
               return { ...b, text: translatedBlocksMap.get(b.id)! };
             }
             return b;
           });
           return {
             ...prev,
             progress,
             blocks: updatedBlocks
           };
        });

        // Small delay to be nice to the API
        // await new Promise(resolve => setTimeout(resolve, 200)); // Not strictly necessary with paid/high tiers, but good practice

      } catch (error) {
        console.error(`Error translating chunk ${i + 1}`, error);
        setState(prev => ({
            ...prev,
            error: `Error processing chunk ${i + 1}. Retrying might not work. Please check logs.`
        }));
        // Depending on requirements, we could break or continue. 
        // Let's break for now as missing subs are bad.
        setState(prev => ({ ...prev, status: TranslationStatus.ERROR }));
        return; 
      }
    }

    setState(prev => ({ ...prev, status: TranslationStatus.COMPLETE, progress: 100 }));
  };

  const handleDownload = () => {
    const srtContent = stringifySrt(state.blocks);
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Insert .khmer before .srt
    const newFileName = state.fileName.replace(/\.srt$/i, '.khmer.srt');
    a.download = newFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
      setState({
        status: TranslationStatus.IDLE,
        progress: 0,
        currentChunk: 0,
        totalChunks: 0,
        blocks: [],
        fileName: '',
      });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md shadow-primary-500/30">
              K
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Khmer<span className="text-primary-600">Translate</span></h1>
          </div>
          <a href="#" className="text-sm text-slate-500 hover:text-primary-600 transition-colors">
             Powered by Gemini
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12">
        
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Translate Subtitles to Khmer</h2>
          <p className="text-slate-500 text-lg">
            Upload your .srt file. We'll preserve the exact timecodes and formatting while AI handles the translation.
          </p>
        </div>

        {state.status === TranslationStatus.IDLE && (
           <FileUpload onFileSelect={handleFileSelect} status={state.status} />
        )}

        {state.status === TranslationStatus.ERROR && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 flex-shrink-0">
               <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
             </svg>
             <div>
               <p className="font-semibold">Translation Failed</p>
               <p className="text-sm">{state.error}</p>
               <button 
                 onClick={handleReset}
                 className="mt-2 text-sm font-semibold underline hover:text-red-800"
               >
                 Try Again
               </button>
             </div>
          </div>
        )}

        {(state.status === TranslationStatus.TRANSLATING || state.status === TranslationStatus.PARSING || state.status === TranslationStatus.COMPLETE) && (
          <>
            <TranslationProgress 
              status={state.status}
              progress={state.progress}
              currentChunk={state.currentChunk}
              totalChunks={state.totalChunks}
            />
            
            {state.status === TranslationStatus.COMPLETE && (
              <div className="flex flex-col items-center justify-center gap-4 mb-8 animate-fade-in">
                <div className="text-green-600 font-semibold flex items-center gap-2 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                    All chunks processed successfully!
                </div>
                <div className="flex gap-4">
                    <button
                    onClick={handleDownload}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold shadow-lg shadow-primary-600/30 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Download Translated SRT
                    </button>
                    <button
                    onClick={handleReset}
                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-8 py-3 rounded-lg font-semibold transition-all"
                    >
                    Translate Another
                    </button>
                </div>
              </div>
            )}

            <PreviewList blocks={state.blocks} />
          </>
        )}

      </main>
    </div>
  );
};

export default App;
