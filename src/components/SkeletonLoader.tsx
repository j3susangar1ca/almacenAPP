import React from 'react';

interface SkeletonLoaderProps {
  tab: string;
}

export default function SkeletonLoader({ tab }: SkeletonLoaderProps) {
  if (tab === 'dashboard') {
    return (
      <div className="space-y-6 animate-pulse">
        {/* KPI Grid (6 items) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E4E4E7] p-4 rounded-sm flex flex-col justify-between h-24">
              <div className="flex justify-between items-center">
                <div className="h-2.5 w-20 bg-[#E4E4E7] rounded-sm" />
                <div className="h-4 w-4 bg-[#E4E4E7] rounded-sm" />
              </div>
              <div className="space-y-1.5 mt-2">
                <div className="h-5 w-24 bg-[#E4E4E7] rounded-sm" />
                <div className="h-2 w-16 bg-[#F4F4F5] rounded-sm" />
              </div>
            </div>
          ))}
        </div>

        {/* Charts & Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-[#E4E4E7] p-5 rounded-sm lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#E4E4E7]">
              <div className="h-3 w-40 bg-[#E4E4E7] rounded-sm" />
              <div className="h-3 w-16 bg-[#E4E4E7] rounded-sm" />
            </div>
            <div className="h-64 bg-[#FAFAFA] border border-[#F4F4F5] rounded-sm flex items-end p-4 space-x-4">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className="bg-[#E4E4E7] rounded-t-sm w-full" 
                  style={{ height: `${Math.max(15, Math.floor(Math.random() * 85))}%` }} 
                />
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E4E4E7] p-5 rounded-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#E4E4E7]">
              <div className="h-3 w-32 bg-[#E4E4E7] rounded-sm" />
            </div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-2 border border-[#E4E4E7] rounded-sm">
                  <div className="space-y-1.5">
                    <div className="h-3 w-28 bg-[#E4E4E7] rounded-sm" />
                    <div className="h-2 w-16 bg-[#F4F4F5] rounded-sm" />
                  </div>
                  <div className="h-4 w-8 bg-[#E4E4E7] rounded-sm" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lists Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, gridIdx) => (
            <div key={gridIdx} className="bg-white border border-[#E4E4E7] p-5 rounded-sm space-y-4">
              <div className="pb-2 border-b border-[#E4E4E7]">
                <div className="h-3 w-48 bg-[#E4E4E7] rounded-sm" />
              </div>
              <div className="space-y-3">
                {[...Array(4)].map((_, rowIdx) => (
                  <div key={rowIdx} className="flex items-center justify-between p-3 bg-[#FAFAFA] border border-[#F4F4F5] rounded-sm">
                    <div className="flex items-center space-x-3 w-full">
                      <div className="h-6 w-6 rounded-full bg-[#E4E4E7] shrink-0" />
                      <div className="space-y-1.5 w-full">
                        <div className="h-3 w-1/2 bg-[#E4E4E7] rounded-sm" />
                        <div className="h-2 w-1/3 bg-[#F4F4F5] rounded-sm" />
                      </div>
                    </div>
                    <div className="h-3 w-12 bg-[#E4E4E7] rounded-sm" />
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
      <div className="space-y-6 animate-pulse">
        {/* Upper filter bar */}
        <div className="bg-white border border-[#E4E4E7] p-4 rounded-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
            <div className="h-9 w-full md:w-72 bg-[#E4E4E7] rounded-sm" />
            <div className="h-9 w-full md:w-40 bg-[#E4E4E7] rounded-sm" />
          </div>
          <div className="flex gap-2 w-full md:w-auto justify-end">
            <div className="h-9 w-28 bg-[#E4E4E7] rounded-sm" />
            <div className="h-9 w-32 bg-[#E4E4E7] rounded-sm" />
            <div className="h-9 w-36 bg-[#E4E4E7] rounded-sm" />
          </div>
        </div>

        {/* Main inventory content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Table (2/3 width) */}
          <div className="bg-white border border-[#E4E4E7] p-5 rounded-sm xl:col-span-2 space-y-4">
            <div className="h-3.5 w-60 bg-[#E4E4E7] rounded-sm mb-4" />
            <div className="border border-[#E4E4E7] rounded-sm overflow-hidden">
              <div className="h-10 bg-[#FAFAFA] border-b border-[#E4E4E7] grid grid-cols-6 gap-3 items-center px-4">
                <div className="h-2.5 w-12 bg-[#E4E4E7] rounded-sm" />
                <div className="h-2.5 w-20 bg-[#E4E4E7] rounded-sm" />
                <div className="h-2.5 w-16 bg-[#E4E4E7] rounded-sm" />
                <div className="h-2.5 w-12 bg-[#E4E4E7] rounded-sm justify-self-end" />
                <div className="h-2.5 w-12 bg-[#E4E4E7] rounded-sm justify-self-end" />
                <div className="h-2.5 w-16 bg-[#E4E4E7] rounded-sm" />
              </div>
              <div className="divide-y divide-[#F4F4F5] bg-white">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-14 grid grid-cols-6 gap-3 items-center px-4">
                    <div className="h-3 w-16 bg-[#E4E4E7] rounded-sm" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-32 bg-[#E4E4E7] rounded-sm" />
                      <div className="h-2 w-16 bg-[#F4F4F5] rounded-sm" />
                    </div>
                    <div className="h-5 w-20 bg-[#F4F4F5] rounded-sm" />
                    <div className="h-3.5 w-14 bg-[#E4E4E7] rounded-sm justify-self-end" />
                    <div className="h-3.5 w-10 bg-[#E4E4E7] rounded-sm justify-self-end" />
                    <div className="space-y-1">
                      <div className="h-2.5 w-16 bg-[#E4E4E7] rounded-sm" />
                      <div className="h-2 w-12 bg-[#F4F4F5] rounded-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Kardex Sidebar (1/3 width) */}
          <div className="bg-white border border-[#E4E4E7] p-5 rounded-sm space-y-4">
            <div className="h-3.5 w-40 bg-[#E4E4E7] rounded-sm mb-4" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-3 border border-[#E4E4E7] rounded-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1.5">
                      <div className="h-5 w-14 bg-[#E4E4E7] rounded-sm" />
                      <div className="h-3.5 w-24 bg-[#E4E4E7] rounded-sm" />
                    </div>
                    <div className="h-3 w-12 bg-[#F4F4F5] rounded-sm" />
                  </div>
                  <div className="h-3 w-full bg-[#FAFAFA] rounded-sm" />
                  <div className="flex justify-between items-center border-t border-[#F4F4F5] pt-2">
                    <div className="h-3.5 w-16 bg-[#F4F4F5] rounded-sm" />
                    <div className="h-3.5 w-20 bg-[#E4E4E7] rounded-sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback Bento Grid skeleton for other tabs
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
      <div className="md:col-span-2 bg-white border border-[#E4E4E7] p-5 rounded-sm space-y-4 min-h-[400px]">
        <div className="h-4 w-40 bg-[#E4E4E7] rounded-sm" />
        <div className="h-2 w-64 bg-[#F4F4F5] rounded-sm" />
        <div className="border border-[#E4E4E7] rounded-sm h-72 bg-[#FAFAFA] flex flex-col justify-center p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-white border border-[#E4E4E7] rounded-sm w-full" />
          ))}
        </div>
      </div>
      <div className="bg-white border border-[#E4E4E7] p-5 rounded-sm space-y-4">
        <div className="h-4 w-32 bg-[#E4E4E7] rounded-sm" />
        <div className="space-y-3 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-[#FAFAFA] border border-[#F4F4F5] rounded-sm w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
