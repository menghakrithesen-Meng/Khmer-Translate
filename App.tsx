import React, { useState, useCallback, useRef } from 'react';
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

  const isTranslatingRef = useRef(false);

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
        status: TranslationStatus.READY,
        totalChunks: chunks.length,
        blocks: parsedBlocks,
        currentChunk: 0,
        progress: 0
      }));

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        status: TranslationStatus.ERROR,
        error: error.message || "Failed to parse file."
      }));
    }
  }, []);

  const startTranslation = async () => {
    if (state.status === TranslationStatus.TRANSLATING) return;
    
    isTranslatingRef.current = true;
    setState(prev => ({ ...prev, status: TranslationStatus.TRANSLATING }));
    
    const chunks = chunkArray<SrtBlock>(state.blocks, CHUNK_SIZE);
    // Resume from currentChunk. If currentChunk is 0, starts from beginning.
    // If paused at 5, currentChunk is 5, so starts from index 5 (6th chunk).
    await processChunks(chunks, state.currentChunk);
  };

  const stopTranslation = () => {
    isTranslatingRef.current = false;
    setState(prev => ({ ...prev, status: TranslationStatus.PAUSED }));
  };

  const processChunks = async (chunks: SrtBlock[][], startIndex: number) => {
    const translatedBlocksMap = new Map<number, string>();
    
    for (let i = startIndex; i < chunks.length; i++) {
      // Check if stopped
      if (!isTranslatingRef.current) {
        return;
      }

      const chunk = chunks[i];
      try {
        // Update current chunk being processed
        setState(prev => ({ ...prev, currentChunk: i + 1 }));
        
        const translatedItems = await translateChunk(chunk);
        
        translatedItems.forEach(item => {
          translatedBlocksMap.set(item.id, item.text);
        });

        const progress = Math.round(((i + 1) / chunks.length) * 100);
        
        setState(prev => {
           const updatedBlocks = prev.blocks.map(b => {
             if (translatedBlocksMap.has(b.id)) {
               return { ...b, text: translatedBlocksMap.get(b.id)! };
             }
             return b;
           });
           // Preserve status from previous state to avoid overwriting PAUSED if stop was clicked during await
           return {
             ...prev,
             progress,
             blocks: updatedBlocks
           };
        });

        // If we finished the last chunk and weren't stopped
        if (i === chunks.length - 1 && isTranslatingRef.current) {
            setState(prev => ({ ...prev, status: TranslationStatus.COMPLETE, progress: 100 }));
        }

      } catch (error) {
        console.error(`Error translating chunk ${i + 1}`, error);
        setState(prev => ({
            ...prev,
            status: TranslationStatus.ERROR,
            error: `Error processing chunk ${i + 1}. Please try resuming or start over.`
        }));
        isTranslatingRef.current = false;
        return; 
      }
    }
  };

  const handleDownload = () => {
    const srtContent = stringifySrt(state.blocks);
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const newFileName = state.fileName.replace(/\.srt$/i, '.khmer.srt');
    a.download = newFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
      isTranslatingRef.current = false;
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

        {/* Control Panel */}
        {(state.status === TranslationStatus.READY || state.status === TranslationStatus.PAUSED || state.status === TranslationStatus.TRANSLATING) && (
            <div className="max-w-2xl mx-auto mb-8 flex flex-col items-center gap-6 animate-fade-in">
                
                {/* File Info */}
                <div className="bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 w-full">
                    <div className="bg-primary-50 p-3 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-primary-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-slate-700 truncate">{state.fileName}</h3>
                        <p className="text-sm text-slate-500">{state.totalChunks} chunks ({state.blocks.length} lines)</p>
                    </div>
                    <button onClick={handleReset} className="text-slate-400 hover:text-red-500 p-2" title="Cancel">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex gap-4">
                    {state.status === TranslationStatus.READY && (
                        <button
                            onClick={startTranslation}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg shadow-primary-600/30 transition-all transform hover:-translate-y-1 flex items-center gap-2 text-lg"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                            </svg>
                            Start Translation
                        </button>
                    )}
                    
                    {state.status === TranslationStatus.PAUSED && (
                        <button
                            onClick={startTranslation}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg shadow-primary-600/30 transition-all transform hover:-translate-y-1 flex items-center gap-2 text-lg"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                            </svg>
                            Resume Translation
                        </button>
                    )}

                    {state.status === TranslationStatus.TRANSLATING && (
                        <button
                            onClick={stopTranslation}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-full font-semibold shadow-lg shadow-amber-500/30 transition-all transform hover:-translate-y-1 flex items-center gap-2 text-lg"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                            </svg>
                            Pause Translation
                        </button>
                    )}
                </div>
            </div>
        )}

        {state.status === TranslationStatus.ERROR && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 flex-shrink-0">
               <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
             </svg>
             <div className="flex-1">
               <p className="font-semibold">Translation Failed</p>
               <p className="text-sm">{state.error}</p>
             </div>
             <button 
                 onClick={handleReset}
                 className="px-4 py-2 text-sm font-semibold bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
               >
                 Reset
             </button>
          </div>
        )}

        {(state.status === TranslationStatus.TRANSLATING || state.status === TranslationStatus.PARSING || state.status === TranslationStatus.READY || state.status === TranslationStatus.PAUSED || state.status === TranslationStatus.COMPLETE) && (
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