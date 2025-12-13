"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [showTermsDialog, setShowTermsDialog] = useState(false);

    // Track profile fetch to prevent duplicate requests
    const profileFetchRef = useRef(null);

    const fetchProfile = async (userId, userData = null) => {
        // Prevent duplicate simultaneous fetches for the same user
        if (profileFetchRef.current === userId) {
            console.log('[Profile] Already fetching profile for this user, skipping');
            return null;
        }
        profileFetchRef.current = userId;

        try {
            console.log('[Profile] Fetching profile via API for user:', userId);
            
            // Use API route to bypass RLS
            const response = await fetch(`/api/user/profile?userId=${userId}`);
            const result = await response.json();
            
            if (result.profile) {
                console.log('[Profile] Found existing profile:', result.profile.first_name);
                setProfile(result.profile);
                
                // Check if user needs to accept terms (OAuth users who haven't accepted)
                if (result.profile.terms_accepted === false) {
                    console.log('[Profile] User needs to accept terms');
                    setShowTermsDialog(true);
                }
                
                return result.profile;
            }
            
            // If no profile exists and we have user data (from OAuth), create one
            if (!result.profile && userData) {
                console.log('[Profile] No profile found, creating new profile for OAuth user');
                const metadata = userData.user_metadata || {};
                const fullName = metadata.full_name || metadata.name || '';
                const nameParts = fullName.split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                
                const createResponse = await fetch('/api/user/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId,
                        email: userData.email,
                        firstName: firstName,
                        lastName: lastName,
                        avatarUrl: metadata.avatar_url || metadata.picture || null,
                    }),
                });
                
                const createResult = await createResponse.json();
                
                if (createResult.profile) {
                    console.log('[Profile] Created new profile:', createResult.profile.first_name);
                    setProfile(createResult.profile);
                    
                    // New OAuth users need to accept terms
                    if (createResult.profile.terms_accepted === false) {
                        console.log('[Profile] New OAuth user needs to accept terms');
                        setShowTermsDialog(true);
                    }
                    
                    return createResult.profile;
                } else {
                    console.error('[Profile] Error creating profile:', createResult.error);
                }
            }
            
            return null;
        } catch (error) {
            console.error('[Profile] Exception:', error);
            return null;
        } finally {
            // Clear the fetch lock after a short delay to allow for retries
            setTimeout(() => {
                if (profileFetchRef.current === userId) {
                    profileFetchRef.current = null;
                }
            }, 1000);
        }
    };

    const logout = async () => {
        // Clear state first
        setUser(null);
        setProfile(null);
        
        // Clear our custom localStorage items
        localStorage.removeItem('supabase_token');
        localStorage.removeItem('supabase_refresh_token');
        localStorage.removeItem('supabase_user');
        
        // Clear Supabase's own localStorage items
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (supabaseUrl) {
            const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1];
            if (projectRef) {
                localStorage.removeItem(`sb-${projectRef}-auth-token`);
            }
        }
        
        // Clear cookies
        document.cookie = 'sb-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'sb-refresh-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'sb-user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        
        // Sign out from Supabase (local scope only)
        try {
            await supabase.auth.signOut({ scope: 'local' });
        } catch (e) {
            console.error('Signout error:', e);
        }
        
        // Redirect to home page
        window.location.href = '/';
    };

    useEffect(() => {
        // Helper to get cookie value
        const getCookie = (name) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
            return null;
        };

        const initializeSession = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const authSuccess = urlParams.get('auth');
                
                // Check if this is a return from OAuth callback
                if (authSuccess === 'success') {
                    console.log('[Auth] OAuth success detected, reading tokens from cookies');
                    
                    const accessToken = getCookie('sb-access-token');
                    const refreshToken = getCookie('sb-refresh-token');
                    const userCookie = getCookie('sb-user');
                    
                    if (accessToken && refreshToken) {
                        // Set session in Supabase
                        const { data, error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });
                        
                        if (!error && data?.session) {
                            console.log('[Auth] Session established from OAuth cookies');
                            setUser(data.session.user);
                            localStorage.setItem('supabase_token', accessToken);
                            localStorage.setItem('supabase_refresh_token', refreshToken);
                            localStorage.setItem('supabase_user', JSON.stringify(data.session.user));
                            await fetchProfile(data.session.user.id, data.session.user);
                            
                            // Clear the auth param from URL
                            window.history.replaceState({}, '', window.location.pathname);
                            
                            setIsAuthLoading(false);
                            return;
                        } else {
                            console.error('[Auth] Error setting session from cookies:', error);
                        }
                    }
                    
                    // Clear the auth param from URL even if it failed
                    window.history.replaceState({}, '', window.location.pathname);
                }
                
                // Try to get existing session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (session && !sessionError) {
                    console.log('[Auth] Session found!');
                    setUser(session.user);
                    localStorage.setItem('supabase_token', session.access_token);
                    localStorage.setItem('supabase_refresh_token', session.refresh_token);
                    localStorage.setItem('supabase_user', JSON.stringify(session.user));
                    await fetchProfile(session.user.id, session.user);
                    
                    setIsAuthLoading(false);
                    return;
                }

                const storedToken = localStorage.getItem('supabase_token');
                const storedUser = localStorage.getItem('supabase_user');

                if (storedToken && storedUser) {
                    const { data, error } = await supabase.auth.setSession({
                        access_token: storedToken,
                        refresh_token: localStorage.getItem('supabase_refresh_token') || '',
                    });

                    if (!error && data?.user) {
                        setUser(data.user);
                        localStorage.setItem('supabase_user', JSON.stringify(data.user));
                        await fetchProfile(data.user.id, data.user);
                    } else if (error) {
                        // Network error or invalid token - check if it's a network issue
                        console.error('[Auth] Session error:', error.message);
                        if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('timeout')) {
                            // Network issue - keep local state, don't logout
                            console.log('[Auth] Network issue detected, keeping local session');
                            const parsedUser = JSON.parse(storedUser);
                            setUser(parsedUser);
                        } else {
                            // Invalid token - clear session
                            console.log('[Auth] Invalid token, clearing session');
                            localStorage.removeItem('supabase_token');
                            localStorage.removeItem('supabase_refresh_token');
                            localStorage.removeItem('supabase_user');
                        }
                    } else if (storedUser) {
                        // No error but no user data - use stored user
                        const parsedUser = JSON.parse(storedUser);
                        setUser(parsedUser);
                        fetchProfile(parsedUser.id, parsedUser);
                    }
                }
            } catch (error) {
                console.error("Session initialization error:", error);
            } finally {
                setIsAuthLoading(false);
            }
        };

        initializeSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[Auth] State changed:', event);
            
            if (event === 'SIGNED_IN' && session) {
                setUser(session.user);
                localStorage.setItem('supabase_token', session.access_token);
                localStorage.setItem('supabase_refresh_token', session.refresh_token);
                localStorage.setItem('supabase_user', JSON.stringify(session.user));
                await fetchProfile(session.user.id, session.user);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                localStorage.removeItem('supabase_token');
                localStorage.removeItem('supabase_refresh_token');
                localStorage.removeItem('supabase_user');
            } else if (event === 'TOKEN_REFRESHED' && session) {
                localStorage.setItem('supabase_token', session.access_token);
                localStorage.setItem('supabase_refresh_token', session.refresh_token);
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const login = async (sessionData, userData) => {
        // Store tokens in localStorage
        localStorage.setItem('supabase_token', sessionData.access_token);
        localStorage.setItem('supabase_refresh_token', sessionData.refresh_token);
        localStorage.setItem('supabase_user', JSON.stringify(userData));

        // Set session in Supabase client
        await supabase.auth.setSession({
            access_token: sessionData.access_token,
            refresh_token: sessionData.refresh_token,
        });

        // Set user state immediately so UI updates
        setUser(userData);
        
        // Fetch profile and wait for it to complete
        await fetchProfile(userData.id, userData);
    };

    // Handle terms acceptance
    const handleTermsAccepted = () => {
        setShowTermsDialog(false);
        // Update the profile state to reflect terms accepted
        setProfile(prev => prev ? { ...prev, terms_accepted: true, terms_accepted_at: new Date().toISOString() } : prev);
    };

    return (
        <AuthContext.Provider value={{
            isSearchFocused,
            setIsSearchFocused,
            user,
            profile,
            login,
            logout,
            isAuthLoading,
            showTermsDialog,
            handleTermsAccepted
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
