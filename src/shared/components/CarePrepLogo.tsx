import React from 'react';
import careprepIcon from '../assets/careprep-icon.png';

interface CarePrepLogoProps {
  className?: string;
  isScrolled?: boolean;
  onClick?: () => void;
}

export const CarePrepLogo: React.FC<CarePrepLogoProps> = ({
  className = '',
  isScrolled = false,
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={`brand flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none group focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-xl p-0.5 transition-all duration-200 active:scale-[0.99] ${className}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick && onClick();
        }
      }}
      aria-label="CarePrep - Prepare Better. Care Smarter."
      title="CarePrep - Prepare Better. Care Smarter."
    >
      {/* 1. Existing Icon-Only Image Asset */}
      <div className="flex-shrink-0 flex items-center justify-center">
        <img
          src={careprepIcon}
          alt="CarePrep"
          className="careprep-logo-icon h-[42px] sm:h-[42px] lg:h-[44px] w-auto max-w-none object-contain block pointer-events-none transition-transform duration-250 ease-out group-hover:scale-105"
          loading="eager"
        />
      </div>

      {/* 2. Separate HTML Brand Text Block */}
      <div className="brand-text flex flex-col justify-center text-left leading-none">
        {/* Brand Name: Care (Dark Navy) + Prep (Teal) */}
        <div className="brand-name flex items-baseline tracking-[-0.03em] whitespace-nowrap text-[22px] sm:text-[23px] lg:text-[25px] font-bold font-sans">
          <span className="brand-name-care text-[#061A32]">Care</span>
          <span className="brand-name-prep text-[#00A685]">Prep</span>
        </div>

        {/* Tagline: Prepare Better. Care Smarter. */}
        <div className="brand-tagline text-[11px] sm:text-[11.5px] lg:text-[12px] font-medium tracking-[-0.01em] text-[#5A6E85] mt-[2.5px] whitespace-nowrap hidden xs:block opacity-90">
          Prepare Better. Care Smarter.
        </div>
      </div>
    </div>
  );
};



