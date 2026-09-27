import React, { useState, useEffect } from 'react';
import defaultSarImage from '../../assets/images/sar_satalite_retrieved.jpeg';

export const HeroStaticFigure: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('wake_sar_figure_image');
      if (saved) return saved;
    } catch {
      // ignore
    }
    return defaultSarImage;
  });

  return (
    <div
      className="w-full max-w-[620px] lg:max-w-[660px] mr-auto bg-white/25 backdrop-blur-xl border border-white/40 rounded-[12px] shadow-[0_12px_36px_rgba(0,0,0,0.22)] select-none flex flex-col p-4 sm:p-5 transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="text-base sm:text-lg font-bold text-slate-900">
          SAR satalite retrieved image
        </h3>
      </div>

      {/* Main visual frame - image stays permanently with buttons removed */}
      <div className="w-full overflow-hidden rounded-[8px] border border-white/30 bg-slate-900/10 shadow-inner">
        <img
          src={imageSrc}
          alt="SAR satalite retrieved image"
          className="w-full h-auto object-cover rounded-[7px] block"
          onError={() => setImageSrc(defaultSarImage)}
        />
      </div>
    </div>
  );
};
