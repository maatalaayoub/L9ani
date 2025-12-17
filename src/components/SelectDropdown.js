'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export default function SelectDropdown({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  label,
  required = false,
  disabled = false,
  className = '',
  isRTL = false,
  allowCustom = false,
  customLabel = 'Other',
  error = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const customInputRef = useRef(null);

  // Find selected option
  const selectedOption = options.find(opt => opt.value === value);
  const isCustomSelected = value && !selectedOption && allowCustom;

  // Filter options based on search
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
        setIsCustomMode(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Focus custom input when entering custom mode
  useEffect(() => {
    if (isCustomMode && customInputRef.current) {
      setTimeout(() => customInputRef.current?.focus(), 100);
    }
  }, [isCustomMode]);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchQuery('');
    setIsCustomMode(false);
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onChange(customValue.trim());
      setIsOpen(false);
      setSearchQuery('');
      setIsCustomMode(false);
      setCustomValue('');
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setIsCustomMode(false);
    setCustomValue('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-3 rounded-lg border transition-all duration-200
          flex items-center justify-between gap-2
          ${isRTL ? 'text-right' : 'text-left'}
          ${error 
            ? 'border-red-400 dark:border-red-500 bg-red-50/50 dark:bg-red-950/20' 
            : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50'
          }
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:border-zinc-300 dark:hover:border-zinc-600 cursor-pointer'
          }
          ${isOpen ? 'ring-2 ring-teal-500/50 border-teal-500' : ''}
          text-zinc-800 dark:text-zinc-200
        `}
      >
        <span className={`flex-1 truncate ${!value ? 'text-zinc-400 dark:text-zinc-500' : ''}`}>
          {isCustomSelected ? value : (selectedOption?.label || placeholder)}
        </span>
        
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <span
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </span>
          )}
          <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div className={`
          absolute z-50 w-full mt-2 py-2 rounded-xl
          bg-white dark:bg-zinc-800 
          border border-zinc-200 dark:border-zinc-700
          shadow-xl shadow-zinc-200/50 dark:shadow-zinc-900/50
          max-h-[300px] overflow-hidden
          ${isRTL ? 'right-0' : 'left-0'}
        `}>
          {/* Search Input */}
          {options.length > 5 && !isCustomMode && (
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className={`
                    w-full py-2 rounded-lg
                    bg-zinc-50 dark:bg-zinc-700/50
                    border border-zinc-200 dark:border-zinc-600
                    text-sm text-zinc-800 dark:text-zinc-200
                    placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                    focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500
                    ${isRTL ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3'}
                  `}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
            </div>
          )}

          {/* Custom Input Mode */}
          {isCustomMode && (
            <div className="px-3 pb-2">
              <div className="flex gap-2">
                <input
                  ref={customInputRef}
                  type="text"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCustomSubmit();
                    }
                    if (e.key === 'Escape') {
                      setIsCustomMode(false);
                      setCustomValue('');
                    }
                  }}
                  placeholder={placeholder}
                  className={`
                    flex-1 py-2 px-3 rounded-lg
                    bg-zinc-50 dark:bg-zinc-700/50
                    border border-zinc-200 dark:border-zinc-600
                    text-sm text-zinc-800 dark:text-zinc-200
                    placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                    focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500
                    ${isRTL ? 'text-right' : 'text-left'}
                  `}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
                <button
                  type="button"
                  onClick={handleCustomSubmit}
                  disabled={!customValue.trim()}
                  className="px-3 py-2 rounded-lg bg-teal-500 text-white text-sm font-medium
                    hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Options List */}
          {!isCustomMode && (
            <div className="max-h-[220px] overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400 text-center">
                  {searchQuery ? 'No results found' : 'No options available'}
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`
                      w-full px-4 py-2.5 flex items-center justify-between gap-2
                      text-sm transition-colors
                      ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}
                      ${option.value === value
                        ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
                      }
                    `}
                  >
                    <span>{option.label}</span>
                    {option.value === value && (
                      <Check className="w-4 h-4 text-teal-500" />
                    )}
                  </button>
                ))
              )}
              
              {/* Custom/Other Option */}
              {allowCustom && (
                <>
                  <div className="border-t border-zinc-100 dark:border-zinc-700 my-1" />
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(true)}
                    className={`
                      w-full px-4 py-2.5 flex items-center gap-2
                      text-sm text-zinc-600 dark:text-zinc-400
                      hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors
                      ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}
                    `}
                  >
                    <span className="text-teal-500">+</span>
                    <span>{customLabel}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
