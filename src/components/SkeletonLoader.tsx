import React from 'react';

interface SkeletonLoaderProps {
  tab: string;
}

export default function SkeletonLoader({ tab }: SkeletonLoaderProps) {
  if (tab === 'dashboard') {
    return (
      <div className="space-y-6">
        {/* KPI Grid (6 items) matching exact heights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E4E4E7] p-4 rounded-lg flex flex-col justify-between h-24 shadow-xs">
              <div className="flex justify-between items-center">
                <div className="h-3 w-20 rounded-md shimmer-bg" />
                <div className="h-5 w-5 rounded-md shimmer-bg" />
              </div>
              <div className="space-y-2 mt-2">
                <div className="h-6 w-24 rounded-md shimmer-bg" />
                <div className="h-2.5 w-16 rounded-md shimmer-bg opacity-70" />
              </div>
            </div>
          ))}
        </div>

        {/* Charts & Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-[#E4E4E7] p-5 rounded-lg lg:col-span-2 space-y-4 shadow-xs">
            <div className="flex justify-between items-center pb-2 border-b border-[#F4F4F5]">
              <div className="h-4 w-40 rounded-md shimmer-bg" />
              <div className="h-4 w-16 rounded-md shimmer-bg" />
            </div>
            <div className="h-64 bg-[#FAFAFA] border border-[#F4F4F5] rounded-lg flex items-end p-4 space-x-4">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className="rounded-t-md w-full shimmer-bg" 
                  style={{ height: `${Math.max(20, Math.floor(25 + (i * 5) % 65))}%` }} 
                />
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E4E4E7] p-5 rounded-lg space-y-4 shadow-xs">
            <div className="flex justify-between items-center pb-2 border-b border-[#F4F4F5]">
              <div className="h-4 w-32 rounded-md shimmer-bg" />
            </div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-[#F4F4F5] rounded-lg">
                  <div className="space-y-2">
                    <div className="h-3.5 w-28 rounded-md shimmer-bg" />
                    <div className="h-2.5 w-16 rounded-md shimmer-bg opacity-70" />
                  </div>
                  <div className="h-5 w-8 rounded-md shimmer-bg" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lists Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, gridIdx) => (
            <div key={gridIdx} className="bg-white border border-[#E4E4E7] p-5 rounded-lg space-y-4 shadow-xs">
              <div className="pb-2 border-b border-[#F4F4F5]">
                <div className="h-4 w-48 rounded-md shimmer-bg" />
              </div>
              <div className="space-y-3">
                {[...Array(4)].map((_, rowIdx) => (
                  <div key={rowIdx} className="flex items-center justify-between p-3 bg-[#FAFAFA] border border-[#F4F4F5] rounded-lg">
                    <div className="flex items-center space-x-3 w-full">
                      <div className="h-8 w-8 rounded-full shimmer-bg shrink-0" />
                      <div className="space-y-2 w-full">
                        <div className="h-3.5 w-1/2 rounded-md shimmer-bg" />
                        <div className="h-2.5 w-1/3 rounded-md shimmer-bg opacity-70" />
                      </div>
                    </div>
                    <div className="h-4 w-12 rounded-md shimmer-bg shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tab === 'inventory') {
    return (
      <div className="space-y-6">
        {/* Upper filter bar with exact rounded edges */}
        <div className="bg-white border border-[#E4E4E7] p-4 rounded-lg flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
            <div className="h-9 w-full md:w-72 rounded-md shimmer-bg" />
            <div className="h-9 w-full md:w-40 rounded-md shimmer-bg" />
          </div>
          <div className="flex gap-2 w-full md:w-auto justify-end">
            <div className="h-9 w-28 rounded-md shimmer-bg" />
            <div className="h-9 w-32 rounded-md shimmer-bg" />
            <div className="h-9 w-36 rounded-md shimmer-bg" />
          </div>
        </div>

        {/* Main inventory content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Table (2/3 width) - exact row layout mirroring InventoryTab */}
          <div className="bg-white border border-[#E4E4E7] p-5 rounded-lg xl:col-span-2 space-y-4 shadow-xs">
            <div className="h-4.5 w-60 rounded-md shimmer-bg mb-4" />
            <div className="border border-[#E4E4E7] rounded-lg overflow-hidden">
              <div className="h-10 bg-[#FAFAFA] border-b border-[#E4E4E7] grid grid-cols-6 gap-3 items-center px-4">
                <div className="h-3 w-12 rounded-md shimmer-bg" />
                <div className="h-3 w-20 rounded-md shimmer-bg" />
                <div className="h-3 w-16 rounded-md shimmer-bg" />
                <div className="h-3 w-12 rounded-md shimmer-bg justify-self-end" />
                <div className="h-3 w-12 rounded-md shimmer-bg justify-self-end" />
                <div className="h-3 w-16 rounded-md shimmer-bg" />
              </div>
              <div className="divide-y divide-[#F4F4F5] bg-white">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-14 grid grid-cols-6 gap-3 items-center px-4">
                    <div className="h-4 w-16 rounded-md shimmer-bg" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-32 rounded-md shimmer-bg" />
                      <div className="h-2.5 w-16 rounded-md shimmer-bg opacity-70" />
                    </div>
                    <div className="h-5.5 w-20 rounded-md shimmer-bg" />
                    <div className="h-4 w-14 rounded-md shimmer-bg justify-self-end" />
                    <div className="h-4 w-10 rounded-md shimmer-bg justify-self-end" />
                    <div className="space-y-1">
                      <div className="h-3 w-16 rounded-md shimmer-bg" />
                      <div className="h-2.5 w-12 rounded-md shimmer-bg opacity-70" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Kardex Sidebar (1/3 width) */}
          <div className="bg-white border border-[#E4E4E7] p-5 rounded-lg space-y-4 shadow-xs">
            <div className="h-4.5 w-40 rounded-md shimmer-bg mb-4" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-3 border border-[#E4E4E7] rounded-lg space-y-2.5 shadow-2xs">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1.5 w-2/3">
                      <div className="h-5 w-14 rounded-md shimmer-bg" />
                      <div className="h-4 w-24 rounded-md shimmer-bg" />
                    </div>
                    <div className="h-3 w-12 rounded-md shimmer-bg opacity-70" />
                  </div>
                  <div className="h-3.5 w-full rounded-md shimmer-bg" />
                  <div className="flex justify-between items-center border-t border-[#F4F4F5] pt-2 mt-1">
                    <div className="h-3 w-16 rounded-md shimmer-bg opacity-70" />
                    <div className="h-4 w-20 rounded-md shimmer-bg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback Bento Grid skeleton for other procurement/nutrition/resource tabs
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 bg-white border border-[#E4E4E7] p-5 rounded-lg space-y-4 min-h-[400px] shadow-xs">
        <div className="h-5 w-40 rounded-md shimmer-bg" />
        <div className="h-3 w-64 rounded-md shimmer-bg opacity-70" />
        <div className="border border-[#E4E4E7] rounded-lg h-72 bg-[#FAFAFA] flex flex-col justify-center p-4 space-y-3 mt-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-9 rounded-md shimmer-bg w-full" />
          ))}
        </div>
      </div>
      <div className="bg-white border border-[#E4E4E7] p-5 rounded-lg space-y-4 shadow-xs">
        <div className="h-5 w-32 rounded-md shimmer-bg" />
        <div className="space-y-3 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg shimmer-bg w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
