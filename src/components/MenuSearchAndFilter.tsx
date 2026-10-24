import React from 'react';
import { Search, X, Flame, Star, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export type QuickFilterType = 'all' | 'popular' | 'under20' | 'with_calories';

interface MenuSearchAndFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  quickFilter: QuickFilterType;
  onQuickFilterChange: (filter: QuickFilterType) => void;
  totalResults: number;
}

export const MenuSearchAndFilter: React.FC<MenuSearchAndFilterProps> = ({
  searchQuery,
  onSearchChange,
  quickFilter,
  onQuickFilterChange,
  totalResults,
}) => {
  const { isAr, currency } = useLanguage();

  const searchKeywords = isAr
    ? ['بروستد', 'شاورما', 'كباب', 'عورقلب', 'بيتزا', 'فطائر', 'كرسبي', 'مشويات']
    : ['Broasted', 'Shawarma', 'Kebab', 'Awar Qalb', 'Pizza', 'Pies', 'Crispy', 'Grills'];

  return (
    <div className="space-y-4">
      {/* Search Input Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none text-slate-400 dark:text-neutral-400">
          <Search className="w-5 h-5 text-amber-500" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={
            isAr
              ? 'ابحث عن صنف، مثلاً: بروستد، كباب، عورقلب، بيتزا، شاورما صاروخ...'
              : 'Search menu, e.g. Broasted, Kebab, Burger, Pizza, Shawarma...'
          }
          className="w-full ps-11 pe-10 py-3.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm sm:text-base transition-colors shadow-xs"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-slate-400 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
            aria-label={isAr ? 'مسح البحث' : 'Clear search'}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Quick Search Keywords */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-[11px] text-slate-500 dark:text-neutral-500 font-bold shrink-0">
          {isAr ? 'بحث سريع:' : 'Quick search:'}
        </span>
        {searchKeywords.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => onSearchChange(term)}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
              searchQuery.toLowerCase() === term.toLowerCase()
                ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-neutral-700 shadow-xs'
            }`}
          >
            {term}
          </button>
        ))}
      </div>

      {/* Quick Filter Buttons & Results Count */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-neutral-900/90 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-xs">
          <button
            onClick={() => onQuickFilterChange('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              quickFilter === 'all'
                ? 'bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isAr ? 'جميع الأصناف' : 'All Items'}
          </button>
          <button
            onClick={() => onQuickFilterChange('popular')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              quickFilter === 'popular'
                ? 'bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>{isAr ? 'الأكثر طلباً' : 'Best Sellers'}</span>
          </button>
          <button
            onClick={() => onQuickFilterChange('under20')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              quickFilter === 'under20'
                ? 'bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
            <span>{isAr ? `أقل من 20 ${currency}` : `Under 20 ${currency}`}</span>
          </button>
          <button
            onClick={() => onQuickFilterChange('with_calories')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              quickFilter === 'with_calories'
                ? 'bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
            <span>{isAr ? 'عرض السعرات' : 'With Calories'}</span>
          </button>
        </div>

        {/* Counter */}
        <div className="text-xs text-slate-500 dark:text-neutral-400">
          {isAr ? (
            <>
              يتم عرض <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{totalResults}</span> صنف
            </>
          ) : (
            <>
              Showing <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{totalResults}</span> items
            </>
          )}
        </div>
      </div>
    </div>
  );
};
