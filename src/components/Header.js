"use client"

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();

    const isActive = (path) => pathname === path;

    return (
        <nav className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/">
                                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent cursor-pointer">
                                    CryptoTracker
                                </span>
                            </Link>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link href="/" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/') ? 'border-indigo-500 text-gray-900 dark:text-white' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                Home
                            </Link>
                            <Link href="/dashboard" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/dashboard') ? 'border-indigo-500 text-gray-900 dark:text-white' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                Dashboard
                            </Link>
                            <Link href="/settings" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/settings') ? 'border-indigo-500 text-gray-900 dark:text-white' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                Settings
                            </Link>
                            <Link href="/about" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/about') ? 'border-indigo-500 text-gray-900 dark:text-white' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                About
                            </Link>
                            <Link href="/contact" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/contact') ? 'border-indigo-500 text-gray-900 dark:text-white' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                Contact
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay - Closes menu when clicked outside */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 sm:hidden transition-opacity duration-300"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* Mobile Menu (Side Slide-in) */}
            <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-black shadow-xl transform transition-transform duration-300 ease-in-out sm:hidden ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="pt-6 pb-3 space-y-1 px-4">
                    {/* Close button inside menu */}
                    <div className="flex justify-end mb-4">
                        <button onClick={() => setIsMenuOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-md p-1">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <Link href="/" onClick={() => setIsMenuOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-3 ${isActive('/') ? 'bg-indigo-50 dark:bg-gray-900 text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                        </svg>
                        <span>Home</span>
                    </Link>
                    <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-3 ${isActive('/dashboard') ? 'bg-indigo-50 dark:bg-gray-900 text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3v18h18V3H3zm4 4h10v10H7V7z"></path>
                        </svg>
                        <span>Dashboard</span>
                    </Link>
                    <Link href="/settings" onClick={() => setIsMenuOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-3 ${isActive('/settings') ? 'bg-indigo-50 dark:bg-gray-900 text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        <span>Settings</span>
                    </Link>
                    <Link href="/about" onClick={() => setIsMenuOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-3 ${isActive('/about') ? 'bg-indigo-50 dark:bg-gray-900 text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span>About</span>
                    </Link>
                    <Link href="/contact" onClick={() => setIsMenuOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-3 ${isActive('/contact') ? 'bg-indigo-50 dark:bg-gray-900 text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 8V7l-3 2-2-1-4 3-6-3v8h16V8z"></path>
                        </svg>
                        <span>Contact</span>
                    </Link>
                </div>
            </div>

            {/* Bottom Navigation Bar (Mobile Only) */}
            <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 sm:hidden flex justify-around items-center py-2 z-50 pb-safe">
                {/* Home */}
                <Link href="/" onClick={() => setIsMenuOpen(false)} className={`flex flex-col items-center justify-center w-full ${isActive('/') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400'}`}>
                    <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                    </svg>
                    <span className="text-[10px] font-medium">Home</span>
                </Link>

                {/* Buy */}
                <button
                    type="button"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex flex-col items-center justify-center w-full text-gray-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                    <div className="p-1 rounded-full relative group">
                        <div className="absolute inset-0 bg-green-500 rounded-full opacity-10 animate-ping"></div>
                        <svg className="w-6 h-6 mb-1 text-green-500 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                        </svg>
                    </div>
                    <span className="text-[10px] font-medium">Buy</span>
                </button>

                {/* Sell */}
                <button
                    type="button"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex flex-col items-center justify-center w-full text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                    <div className="p-1 rounded-full relative group">
                        <div className="absolute inset-0 bg-red-500 rounded-full opacity-10 animate-ping"></div>
                        <svg className="w-6 h-6 mb-1 text-red-500 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                    </div>
                    <span className="text-[10px] font-medium">Sell</span>
                </button>

                {/* Search */}
                <button
                    type="button"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex flex-col items-center justify-center w-full text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                    <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <span className="text-[10px] font-medium">Search</span>
                </button>

                {/* Menu */}
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`flex flex-col items-center justify-center w-full ${isMenuOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                >
                    <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
                    <span className="text-[10px] font-medium">Menu</span>
                </button>
            </div>
        </nav>
    );
}
