"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        const initializeSession = async () => {
            try {
                const storedToken = localStorage.getItem('supabase_token');
                const storedUser = localStorage.getItem('supabase_user');

                if (storedToken && storedUser) {
                    // Restore session to Supabase client
                    const { data, error } = await supabase.auth.setSession({
                        access_token: storedToken,
                        refresh_token: localStorage.getItem('supabase_refresh_token') || '',
                    });

                    if (!error && data?.user) {
                        // Use fresh user data from the session
                        const freshUser = data.user;
                        setUser(freshUser);
                        localStorage.setItem('supabase_user', JSON.stringify(freshUser));
                        await fetchProfile(freshUser.id);
                    } else if (!error) {
                        // Fallback to stored user
                        const parsedUser = JSON.parse(storedUser);
                        setUser(parsedUser);
                        await fetchProfile(parsedUser.id);
                    } else {
                        // Token invalid/expired
                        logout();
                    }
                }
            } catch (error) {
                console.error("Session initialization error:", error);
            } finally {
                setIsAuthLoading(false);
            }
        };

        initializeSession();
    }, []);

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('auth_user_id', userId)
                .single();

            if (data) setProfile(data);
        } catch (error) {
            console.error('Error loading profile', error);
        }
    };

    const login = async (sessionData, userData) => {
        localStorage.setItem('supabase_token', sessionData.access_token);
        localStorage.setItem('supabase_refresh_token', sessionData.refresh_token);
        localStorage.setItem('supabase_user', JSON.stringify(userData));

        // Set session on the supabase client so RLS works
        await supabase.auth.setSession({
            access_token: sessionData.access_token,
            refresh_token: sessionData.refresh_token,
        });

        setUser(userData);
        fetchProfile(userData.id);
    };

    const logout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('supabase_token');
        localStorage.removeItem('supabase_refresh_token');
        localStorage.removeItem('supabase_user');
        setUser(null);
        setProfile(null);
        window.location.reload();
    };

    return (
        <AuthContext.Provider value={{
            isSearchFocused,
            setIsSearchFocused,
            user,
            profile,
            login,
            logout,
            isAuthLoading
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
