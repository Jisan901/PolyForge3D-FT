import React from 'react';

export default function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-black z-[9999999]">
      {/* Scanline effect overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-10"
           style={{
             backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #00ff00 2px, #00ff00 4px)',
           }}>
      </div>

      <div className="relative flex flex-col items-center">
        {/* Hexagonal loading spinner */}
        <div className="relative w-40 h-40">
          {/* Outer hexagon frame */}
          <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: '3s' }} viewBox="0 0 100 100">
            <polygon points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5" 
                     fill="none" 
                     stroke="#00ff41" 
                     strokeWidth="1"
                     opacity="0.6"/>
            <polygon points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5" 
                     fill="none" 
                     stroke="#00ff41" 
                     strokeWidth="2"
                     strokeDasharray="10 5"
                     opacity="0.8">
              <animate attributeName="stroke-dashoffset" from="0" to="30" dur="1s" repeatCount="indefinite"/>
            </polygon>
          </svg>
          
          {/* Inner rotating rings */}
          <div className="absolute inset-4 rounded-full border border-cyan-400/40 animate-spin" style={{ animationDuration: '2s' }}></div>
          <div className="absolute inset-8 rounded-full border border-green-400/40 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
          
          {/* Center core */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-gradient-to-br from-green-500/20 to-cyan-500/20 rounded-sm animate-pulse"
               style={{ boxShadow: '0 0 20px rgba(0, 255, 65, 0.5), inset 0 0 20px rgba(0, 255, 65, 0.2)' }}>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-green-400 rounded-sm"
               style={{ boxShadow: '0 0 10px #00ff41' }}>
          </div>
        </div>

        {/* Loading text */}
        <div className="mt-12">
          <span className="text-green-400 text-sm font-mono tracking-wider">ENGINE LOADING</span>
        </div>

        {/* System messages */}
        <div className="mt-8 space-y-1 w-80"></div>

        {/* Corner UI elements */}
        <div className="absolute top-4 left-4 text-green-400 text-xs font-mono opacity-60">
          [PolyForge]
        </div>
        <div className="absolute top-4 right-4 text-cyan-400 text-xs font-mono opacity-60">
          v1.0.0
        </div>
      </div>
    </div>
  );
}