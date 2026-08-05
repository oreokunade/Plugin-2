"use client";

import { useState } from "react";

export function ImageBlockRenderer({ block }: { block: any }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!block.urls?.length) return null;

  if (block.layout === "slideshow") {
    return (
      <div className="space-y-3">
        <div className="relative group w-full bg-gray-100 rounded-2xl overflow-hidden aspect-video border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.urls[currentIndex]} alt="" className="w-full h-full object-contain" />
          
          {block.urls.length > 1 && (
            <>
              <button 
                onClick={(e) => { e.preventDefault(); setCurrentIndex((c) => (c === 0 ? block.urls.length - 1 : c - 1)); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm backdrop-blur-md">
                <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button 
                onClick={(e) => { e.preventDefault(); setCurrentIndex((c) => (c === block.urls.length - 1 ? 0 : c + 1)); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm backdrop-blur-md">
                <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </>
          )}
        </div>
        
        {block.urls.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto py-2">
            {block.urls.map((url: string, i: number) => (
              <button 
                key={i}
                type="button"
                onClick={(e) => { e.preventDefault(); setCurrentIndex(i); }}
                className={`relative w-16 h-12 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${i === currentIndex ? "border-[#00EFFE] opacity-100" : "border-transparent opacity-50 hover:opacity-100"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                <div className="absolute top-0.5 left-0.5 bg-black/60 text-white text-[9px] font-bold px-1 rounded backdrop-blur-sm pointer-events-none">
                  {i + 1}
                </div>
              </button>
            ))}
          </div>
        )}

        {block.captions?.[currentIndex] && (
          <p className="text-sm text-gray-600 leading-relaxed text-center">{block.captions[currentIndex]}</p>
        )}
      </div>
    );
  }

  // Vertical layout (default)
  const spacingValue = typeof block.spacing === "number" ? block.spacing : 12;

  return (
    <div className="flex flex-col" style={{ gap: `${spacingValue}px` }}>
      {block.urls.map((url: string, i: number) => (
        <div key={i} className="flex flex-col items-center" style={{ gap: `${spacingValue}px` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="w-full h-auto bg-gray-100 rounded-2xl border border-gray-200" />
          {block.captions?.[i] && (
            <p className="text-sm text-gray-600 leading-relaxed text-center w-full">{block.captions[i]}</p>
          )}
        </div>
      ))}
    </div>
  );
}
