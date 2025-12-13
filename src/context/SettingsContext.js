"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "./AuthContext";
import { useLanguage } from "./LanguageContext";

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
    const { theme, setTheme } = useTheme();
    const { user } = useAuth();
    const { locale, changeLocale } = useLanguage();
    const [isLoadingSettings, setIsLoadingSettings] = useState(false);
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const [sightingAlerts, setSightingAlerts] = useState(true);
    const [newDeviceLogin, setNewDeviceLogin] = useState(true);

    // Fetch user settings from database when user logs in
    const fetchUserSettings = useCallback(async () => {
        if (!user) return;
        
        const token = localStorage.getItem('supabase_token');
        if (!token) return;

        setIsLoadingSettings(true);
        try {
            const response = await fetch('/api/user/settings', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.theme) {
                    setTheme(data.theme);
                }
                if (data.language) {
                    changeLocale(data.language);
                }
                if (data.sighting_alerts !== undefined) {
                    setSightingAlerts(data.sighting_alerts);
                }
                if (data.new_device_login !== undefined) {
                    setNewDeviceLogin(data.new_device_login);
                }
            }
        } catch (error) {
            // Silently fail
        } finally {
            setIsLoadingSettings(false);
            setSettingsLoaded(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, setTheme]);

    // Save settings to database
    const saveSettings = useCallback(async (settings) => {
        if (!user) return;
        
        const token = localStorage.getItem('supabase_token');
        if (!token) return;

        try {
            await fetch('/api/user/settings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
        } catch (error) {
            // Silently fail
        }
    }, [user]);

    // Save theme preference
    const saveThemePreference = useCallback(async (newTheme) => {
        setTheme(newTheme);
        await saveSettings({ theme: newTheme });
    }, [setTheme, saveSettings]);

    // Save language preference
    const saveLanguagePreference = useCallback(async (newLanguage) => {
        // Save to database first (before the page redirects)
        await saveSettings({ language: newLanguage });
        // Then change locale (this will redirect the page)
        changeLocale(newLanguage);
    }, [changeLocale, saveSettings]);

    // Save notification preferences
    const saveSightingAlerts = useCallback(async (enabled) => {
        setSightingAlerts(enabled);
        await saveSettings({ sighting_alerts: enabled });
    }, [saveSettings]);

    const saveNewDeviceLogin = useCallback(async (enabled) => {
        setNewDeviceLogin(enabled);
        await saveSettings({ new_device_login: enabled });
    }, [saveSettings]);

    // Fetch settings when user changes (login/logout)
    useEffect(() => {
        if (user && !settingsLoaded) {
            fetchUserSettings();
        } else if (!user) {
            setSettingsLoaded(false);
            // Reset to defaults when logged out
            setSightingAlerts(true);
            setNewDeviceLogin(true);
        }
    }, [user, settingsLoaded, fetchUserSettings]);

    return (
        <SettingsContext.Provider value={{
            theme,
            setTheme: saveThemePreference,
            language: locale,
            setLanguage: saveLanguagePreference,
            sightingAlerts,
            setSightingAlerts: saveSightingAlerts,
            newDeviceLogin,
            setNewDeviceLogin: saveNewDeviceLogin,
            isLoadingSettings,
            settingsLoaded
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
