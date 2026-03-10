'use client';

import React, { useState } from 'react';
import { AssetType, AssetStatus } from '@/features/assets/types';
import { cn } from '@/lib/utils';
import { IconFilter, IconX } from '@tabler/icons-react';

export interface AssetFilterValues {
  assetType: number | null;
  status: number | null;
  sortBy: 'newest' | 'oldest' | 'valuation-high' | 'valuation-low' | 'most-sold';
  searchQuery: string;
}

interface AssetFiltersProps {
  filters: AssetFilterValues;
  onChange: (filters: AssetFilterValues) => void;
}

const assetTypes = [
  { value: AssetType.RealEstate, label: 'Real Estate' },
  { value: AssetType.Gold, label: 'Gold' },
  { value: AssetType.Infrastructure, label: 'Infrastructure' },
  { value: AssetType.Vehicle, label: 'Vehicle' },
  { value: AssetType.Art, label: 'Art' },
  { value: AssetType.Commodity, label: 'Commodity' },
  { value: AssetType.Other, label: 'Other' },
];

const statuses = [
  { value: AssetStatus.Pending, label: 'Pending' },
  { value: AssetStatus.Verified, label: 'Verified' },
  { value: AssetStatus.Tokenized, label: 'Tokenized' },
  { value: AssetStatus.Frozen, label: 'Frozen' },
  { value: AssetStatus.Delisted, label: 'Delisted' },
];

const sortOptions = [
  { value: 'newest' as const, label: 'Newest First' },
  { value: 'oldest' as const, label: 'Oldest First' },
  { value: 'valuation-high' as const, label: 'Highest Valuation' },
  { value: 'valuation-low' as const, label: 'Lowest Valuation' },
  { value: 'most-sold' as const, label: 'Most Sold' },
];

export const defaultFilters: AssetFilterValues = {
  assetType: null,
  status: null,
  sortBy: 'newest',
  searchQuery: '',
};

export const AssetFilters: React.FC<AssetFiltersProps> = ({ filters, onChange }) => {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = filters.assetType !== null || filters.status !== null || filters.searchQuery !== '';

  const clearFilters = () => onChange(defaultFilters);

  return (
    <div className="space-y-4">
      {/* Search + Toggle */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search assets by ID or location..."
            value={filters.searchQuery}
            onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
            className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring text-sm"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onChange({ ...filters, searchQuery: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <IconX className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors',
            showFilters
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:border-ring/40'
          )}
        >
          <IconFilter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-primary" />
          )}
        </button>
      </div>

      {/* Filter options */}
      {showFilters && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          {/* Asset Type Filter */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Asset Type</label>
            <div className="flex flex-wrap gap-2">
              {assetTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() =>
                    onChange({
                      ...filters,
                      assetType: filters.assetType === type.value ? null : type.value,
                    })
                  }
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    filters.assetType === type.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:border-ring/40'
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Status</label>
            <div className="flex flex-wrap gap-2">
              {statuses.map((s) => (
                <button
                  key={s.value}
                  onClick={() =>
                    onChange({
                      ...filters,
                      status: filters.status === s.value ? null : s.value,
                    })
                  }
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    filters.status === s.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:border-ring/40'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Sort By</label>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChange({ ...filters, sortBy: opt.value })}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    filters.sortBy === opt.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:border-ring/40'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};
