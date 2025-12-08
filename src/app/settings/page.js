"use client"

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Settings() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // useEffect only runs on the client, so now we can safely show the UI
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-zinc-900">
            <main className="max-w-3xl mx-auto p-4 md:p-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

                <div className="bg-white dark:bg-black rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Appearance</h2>
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Theme Preference</label>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setTheme("light")}
                                className={`px-4 py-2 rounded-lg border ${theme === 'light' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-zinc-800 dark:border-indigo-400 dark:text-indigo-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-900'}`}
                            >
                                Light
                            </button>
                            <button
                                onClick={() => setTheme("dark")}
                                className={`px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-zinc-800 dark:border-indigo-400 dark:text-indigo-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-900'}`}
                            >
                                Dark
                            </button>
                            <button
                                onClick={() => setTheme("system")}
                                className={`px-4 py-2 rounded-lg border ${theme === 'system' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-zinc-800 dark:border-indigo-400 dark:text-indigo-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-900'}`}
                            >
                                System
                            </button>
                        </div>
                    </div>

                    <div className="mb-10">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Language</label>
                        <select className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value="en">English</option>
                            <option value="fr">French</option>
                            <option value="ar">Arabic</option>
                        </select>
                    </div>

                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Profile Settings</h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display Name</label>
                            <input
                                type="text"
                                defaultValue="John Doe"
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                            <input
                                type="email"
                                defaultValue="john@example.com"
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-6">Notifications</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Price Alerts</p>
                                <p className="text-sm text-gray-500">Get notified when prices change significantly</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">New Device Login</p>
                                <p className="text-sm text-gray-500">Get notified when your account is accessed from a new device</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                        <button className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition">Save Changes</button>
                    </div>
                </div>
            </main>
        </div>
    );
}
