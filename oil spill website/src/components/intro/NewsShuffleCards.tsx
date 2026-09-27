import React, { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '../../utils/cn';

import manilaBaySpillImg from '../../assets/images/manila_bay_spill_1790440156030.jpg';
import tankerCollisionImg from '../../assets/images/tanker_collision_fire_1790440168074.jpg';
import northSeaTankerImg from '../../assets/images/north_sea_tanker_1790440181074.jpg';
import blackSeaSpillImg from '../../assets/images/black_sea_oil_spill_1790440194311.jpg';
import offshoreRigSpillImg from '../../assets/images/offshore_rig_spill_1790440205657.jpg';

export interface NewsItem {
  id: string;
  date: string;
  category: string;
  categoryColor: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  imageUrl: string;
  readTime: string;
  topic: 'spills' | 'shipping' | 'rigs';
}

const INITIAL_NEWS: NewsItem[] = [
  {
    id: 'news-1',
    date: '25 July 2024',
    category: 'Spill Incident',
    categoryColor: 'bg-[#C25E00] text-white',
    title: 'Manila Bay Oil Spill: Tanker MT Terranova Capsizes with 1.4M Liters',
    summary:
      'Industrial fuel tanker MT Terranova capsized and sank in rough seas off Limay, Bataan. The Philippine Coast Guard and marine science teams deployed satellite drift hindcasting and containment barriers as an 84 km² slick threatened coastal fisheries.',
    source: 'Philippine Coast Guard & Marine Science Institute',
    url: 'https://www.reuters.com',
    imageUrl: manilaBaySpillImg,
    readTime: '4 min read',
    topic: 'spills'
  },
  {
    id: 'news-2',
    date: '19 July 2024',
    category: 'Tanker Collision',
    categoryColor: 'bg-[#007282] text-white',
    title: 'Dark-Fleet Supertanker Ceres I Collides with Tanker Hafnia Nile',
    summary:
      'The Singapore-flagged tanker Hafnia Nile collided with the anchored dark-fleet supertanker Ceres I off Johor, Malaysia, triggering severe deck fires and bunker discharge. Marine tracking revealed Ceres I had disabled its AIS transponder prior to impact.',
    source: 'Maritime & Port Authority of Singapore',
    url: 'https://www.tradewindsnews.com',
    imageUrl: tankerCollisionImg,
    readTime: '3 min read',
    topic: 'shipping'
  },
  {
    id: 'news-3',
    date: '10 March 2025',
    category: 'Casualty Alert',
    categoryColor: 'bg-[#C25E00] text-white',
    title: 'North Sea Military Fuel Tanker Stena Immaculate Struck by Cargo Ship',
    summary:
      'Portuguese-flagged container carrier Solong collided with US-flagged tanker MV Stena Immaculate carrying aviation fuel off eastern England. The collision released volatile jet fuel, prompting UK Maritime response units and satellite trajectory sweeps.',
    source: 'UK Maritime & Coastguard Agency (MCA)',
    url: 'https://www.aljazeera.com',
    imageUrl: northSeaTankerImg,
    readTime: '4 min read',
    topic: 'shipping'
  },
  {
    id: 'news-4',
    date: '15 December 2024',
    category: 'Catastrophic Spill',
    categoryColor: 'bg-[#007282] text-white',
    title: 'Black Sea Mazut Disaster: Russian Tanker Volgoneft-212 Snaps in Storm',
    summary:
      'Severe winter gale conditions tore the Russian coastal tanker Volgoneft-212 in two south of the Kerch Strait, discharging over 3,000 metric tons of heavy mazut fuel oil across 35,000 km² of marine habitats, with satellite radar detecting persistent seabed plumes.',
    source: 'ITOPF & International Maritime Organization',
    url: 'https://www.itopf.org',
    imageUrl: blackSeaSpillImg,
    readTime: '4 min read',
    topic: 'spills'
  },
  {
    id: 'news-5',
    date: '22 April 2025',
    category: 'Offshore Rig',
    categoryColor: 'bg-[#1F516B] text-white',
    title: 'Gulf of Mexico Pass-A-Loutre Offshore Production Well Rupture',
    summary:
      'A subsea production wellhead failure at a Spectrum OpCo offshore facility discharged crude oil and natural gas plumes into the Pass-A-Loutre Wildlife Management Area, prompting BSEE inspections and NOAA satellite slick containment.',
    source: 'NOAA Office of Response and Restoration',
    url: 'https://response.restoration.noaa.gov',
    imageUrl: offshoreRigSpillImg,
    readTime: '5 min read',
    topic: 'rigs'
  }
];

export const NewsShuffleCards: React.FC = () => {
  const [displayIndex, setDisplayIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  const activeCard = INITIAL_NEWS[displayIndex];

  const getBackCard = (offset: number) => {
    return INITIAL_NEWS[(displayIndex + offset) % INITIAL_NEWS.length];
  };

  const handleShuffle = () => {
    if (isFading) return;
    setIsFading(true);
    setTimeout(() => {
      setDisplayIndex(prev => (prev + 1) % INITIAL_NEWS.length);
      setTimeout(() => {
        setIsFading(false);
      }, 70);
    }, 350);
  };

  const handlePrev = () => {
    if (isFading) return;
    setIsFading(true);
    setTimeout(() => {
      setDisplayIndex(prev => (prev - 1 + INITIAL_NEWS.length) % INITIAL_NEWS.length);
      setTimeout(() => {
        setIsFading(false);
      }, 70);
    }, 350);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex items-center justify-center gap-3 sm:gap-6 select-none px-2 sm:px-4 py-3">
      {/* Left Arrow Button on the side */}
      <button
        onClick={handlePrev}
        className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[var(--surface-1)] border border-[var(--ocean-4)] text-[var(--text-1)] hover:bg-[var(--surface-2)] hover:border-[var(--ocean-2)] hover:text-[var(--ocean-1)] transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 z-30"
        title="Previous Story"
        aria-label="Previous Story"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* SHUFFLE DECK CONTAINER - strictly locked height with margin for left and bottom protrusions */}
      <div className="relative flex-1 min-w-0 max-w-4xl h-[460px] sm:h-[340px] md:h-[310px] flex items-center justify-center ml-4 sm:ml-7 mb-4 sm:mb-7">
        {/* Layer 3 - Deepest card in stack, protruding ONLY on the left and bottom */}
        <div 
          className="absolute inset-0 rounded-[20px] bg-[var(--surface-1)] border border-[var(--ocean-4)]/75 shadow-xs pointer-events-none overflow-hidden transition-all duration-700 ease-out -translate-x-4 sm:-translate-x-6 translate-y-4 sm:translate-y-6 opacity-75 z-[1]"
          aria-hidden="true"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 h-full w-full">
            <div className="md:col-span-5 h-[180px] sm:h-[160px] md:h-full w-full relative overflow-hidden bg-slate-900">
              <img
                src={getBackCard(3).imageUrl}
                alt=""
                className="w-full h-full object-cover object-center brightness-90"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-slate-950/20 pointer-events-none" />
            </div>
            <div className="md:col-span-7 h-full bg-[var(--surface-1)]" />
          </div>
        </div>

        {/* Layer 2 - Middle card in stack, protruding ONLY on the left and bottom */}
        <div 
          className="absolute inset-0 rounded-[20px] bg-[var(--surface-1)] border border-[var(--ocean-4)]/85 shadow-sm pointer-events-none overflow-hidden transition-all duration-700 ease-out -translate-x-2.5 sm:-translate-x-4 translate-y-2.5 sm:translate-y-4 opacity-85 z-[2]"
          aria-hidden="true"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 h-full w-full">
            <div className="md:col-span-5 h-[180px] sm:h-[160px] md:h-full w-full relative overflow-hidden bg-slate-900">
              <img
                src={getBackCard(2).imageUrl}
                alt=""
                className="w-full h-full object-cover object-center brightness-95"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-slate-950/15 pointer-events-none" />
            </div>
            <div className="md:col-span-7 h-full bg-[var(--surface-1)]" />
          </div>
        </div>

        {/* Layer 1 - Nearest card behind, protruding ONLY on the left and bottom */}
        <div 
          className="absolute inset-0 rounded-[20px] bg-[var(--surface-1)] border border-[var(--ocean-4)] shadow-sm pointer-events-none overflow-hidden transition-all duration-700 ease-out -translate-x-1.5 sm:-translate-x-2 translate-y-1.5 sm:translate-y-2 opacity-95 z-[3]"
          aria-hidden="true"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 h-full w-full">
            <div className="md:col-span-5 h-[180px] sm:h-[160px] md:h-full w-full relative overflow-hidden bg-slate-900">
              <img
                src={getBackCard(1).imageUrl}
                alt=""
                className="w-full h-full object-cover object-center"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-slate-950/10 pointer-events-none" />
            </div>
            <div className="md:col-span-7 h-full bg-[var(--surface-1)]" />
          </div>
        </div>

        {/* Layer 0 - Active Forefront Card with Gentle Crossfade */}
        <div
          onClick={handleShuffle}
          className={cn(
            'relative w-full h-[460px] sm:h-[340px] md:h-[310px] rounded-[20px] bg-[var(--surface-1)] border border-[var(--ocean-4)] shadow-md overflow-hidden cursor-pointer group hover:border-[var(--ocean-2)] hover:shadow-lg z-[10] transition-all duration-700 ease-in-out',
            isFading ? 'opacity-35 scale-[0.99]' : 'opacity-100 scale-100'
          )}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 h-full w-full">
            {/* Left Image Section - strictly fixed dimensions with object-cover */}
            <div className="md:col-span-5 h-[180px] sm:h-[160px] md:h-full w-full relative overflow-hidden bg-slate-900 shrink-0">
              <img
                src={activeCard.imageUrl}
                alt={activeCard.title}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out select-none"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/20 pointer-events-none" />
            </div>

            {/* Right Details Section - strictly contained */}
            <div className="md:col-span-7 h-[280px] sm:h-[180px] md:h-full p-5 sm:p-6 md:p-7 flex flex-col justify-between overflow-hidden bg-[var(--surface-1)]">
              <div className="overflow-hidden">
                {/* Header Row: Date */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs sm:text-sm font-sans font-medium text-[var(--text-2)]">
                    {activeCard.date}
                  </span>
                </div>

                {/* Article Headline */}
                <h3 className="text-base sm:text-lg md:text-xl font-bold font-sans text-[var(--text-1)] leading-snug group-hover:text-[var(--ocean-1)] transition-colors line-clamp-2">
                  {activeCard.title}
                </h3>

                {/* Article Excerpt */}
                <p className="mt-2 text-xs sm:text-sm text-[var(--text-2)] leading-relaxed font-sans line-clamp-3">
                  {activeCard.summary}
                </p>
              </div>

              {/* Bottom Action Row: Read more pill button */}
              <div className="flex items-center justify-start pt-3 sm:pt-4 border-t border-[var(--ocean-4)]/60 shrink-0">
                <a
                  href={activeCard.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="group/btn inline-flex items-center gap-1.5 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full border border-[#0A2540] text-[#0A2540] hover:bg-[#0A2540] hover:text-white text-xs sm:text-sm font-semibold font-sans transition-colors duration-300 shadow-xs"
                >
                  <span className="text-[#0A2540] group-hover/btn:text-white transition-colors">Read more</span>
                  <span aria-hidden="true" className="text-[#0A2540] group-hover/btn:text-white transition-colors">&rarr;</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Arrow Button on the side */}
      <button
        onClick={handleShuffle}
        className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[var(--surface-1)] border border-[var(--ocean-4)] text-[var(--text-1)] hover:bg-[var(--surface-2)] hover:border-[var(--ocean-2)] hover:text-[var(--ocean-1)] transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 z-30"
        title="Next Story"
        aria-label="Next Story"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};
