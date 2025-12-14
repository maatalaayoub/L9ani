"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

// Helper to get/set profile from localStorage
const getStoredProfile = () => {
    try {
        const stored = localStorage.getItem('supabase_profile');
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
};

const storeProfile = (profile) => {
    try {
        if (profile) {
            localStorage.setItem('supabase_profile', JSON.stringify(profile));
        } else {
            localStorage.removeItem('supabase_profile');
        }
    } catch (e) {
        console.error('[Profile] Error storing profile:', e);
    }
};

export function AuthProvider({ children }) {
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [showTermsDialog, setShowTermsDialog] = useState(false);

    // Track profile fetch to prevent duplicate requests
    const profileFetchRef = useRef(null);
    const profileRetryCount = useRef(0);
    const maxRetries = 3;

    const fetchProfile = async (userId, userData = null, forceRefresh = false) => {
        // Prevent duplicate simultaneous fetches for the same user
        if (profileFetchRef.current === userId && !forceRefresh) {
            console.log('[Profile] Already fetching profile for this user, skipping');
            return null;
        }
        profileFetchRef.current = userId;

        try {
            console.log('[Profile] Fetching profile via API for user:', userId);
            
            // Use API route to bypass RLS
            const response = await fetch(`/api/user/profile?userId=${userId}`);
            
            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.profile) {
                console.log('[Profile] Found existing profile:', result.profile.first_name);
                setProfile(result.profile);
                storeProfile(result.profile); // Persist to localStorage
                profileRetryCount.current = 0; // Reset retry count on success
                
                // Check if user needs to accept terms (OAuth users who haven't accepted)
                if (result.profile.terms_accepted === false) {
                    console.log('[Profile] User needs to accept terms');
                    setShowTermsDialog(true);
                }
                
                return result.profile;
            }
            
            // If no profile exists and we have user data, create one
            if (!result.profile && userData) {
                const metadata = userData.user_metadata || {};
                
                // Check if this is an OAuth user (has full_name or provider) or email signup user (has firstName directly)
                const isOAuthUser = !!(metadata.full_name || metadata.name || metadata.provider_id || metadata.iss);
                const hasPasswordSignup = !!(metadata.firstName || metadata.lastName);
                
                console.log('[Profile] No profile found, creating new profile. OAuth:', isOAuthUser, 'Email signup:', hasPasswordSignup);
                
                let firstName = '';
                let lastName = '';
                
                if (hasPasswordSignup) {
                    // Email/password signup - use firstName/lastName from metadata
                    firstName = metadata.firstName || '';
                    lastName = metadata.lastName || '';
                } else if (isOAuthUser) {
                    // OAuth user - parse full_name
                    const fullName = metadata.full_name || metadata.name || '';
                    const nameParts = fullName.split(' ');
                    firstName = nameParts[0] || '';
                    lastName = nameParts.slice(1).join(' ') || '';
                }
                
                const createResponse = await fetch('/api/user/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId,
                        email: userData.email,
                        firstName: firstName,
                        lastName: lastName,
                        avatarUrl: metadata.avatar_url || metadata.picture || null,
                        // Email signup users have already accepted terms during registration
                        termsAccepted: hasPasswordSignup ? true : false,
                        hasPassword: hasPasswordSignup,
                        phone: metadata.phoneNumber || null
                    }),
                });
                
                const createResult = await createResponse.json();
                
                if (createResult.profile) {
                    console.log('[Profile] Created new profile:', createResult.profile.first_name);
                    setProfile(createResult.profile);
                    storeProfile(createResult.profile); // Persist to localStorage
                    profileRetryCount.current = 0;
                    
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
            
            // On error, try to use cached profile
            const cachedProfile = getStoredProfile();
            if (cachedProfile && cachedProfile.auth_user_id === userId) {
                console.log('[Profile] Using cached profile due to fetch error');
                setProfile(cachedProfile);
                return cachedProfile;
            }
            
            // Retry logic for transient failures
            if (profileRetryCount.current < maxRetries) {
                profileRetryCount.current++;
                console.log(`[Profile] Retrying fetch (${profileRetryCount.current}/${maxRetries})...`);
                profileFetchRef.current = null; // Clear lock for retry
                await new Promise(resolve => setTimeout(resolve, 1000 * profileRetryCount.current));
                return fetchProfile(userId, userData, true);
            }
            
            return null;
        } finally {
            // Clear the fetch lock after completion
            setTimeout(() => {
                if (profileFetchRef.current === userId) {
                    profileFetchRef.current = null;
                }
            }, 500);
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
        localStorage.removeItem('supabase_profile'); // Also clear cached profile
        
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
                // Load cached profile immediately for faster UI
                const cachedProfile = getStoredProfile();
                if (cachedProfile) {
                    console.log('[Auth] Loading cached profile for faster initial render');
                    setProfile(cachedProfile);
                }
                
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
            
            // Ignore PASSWORD_RECOVERY event - this is handled by the reset-password page
            if (event === 'PASSWORD_RECOVERY') {
                console.log('[Auth] Ignoring PASSWORD_RECOVERY event in AuthContext');
                return;
            }
            
            if (event === 'SIGNED_IN' && session) {
                // Only update if user changed or we don't have a user yet
                const currentUserId = user?.id;
                const newUserId = session.user?.id;
                
                if (currentUserId === newUserId && profile) {
                    // Same user, already have profile - just update tokens
                    console.log('[Auth] Same user already logged in, skipping profile fetch');
                    localStorage.setItem('supabase_token', session.access_token);
                    localStorage.setItem('supabase_refresh_token', session.refresh_token);
                    return;
                }
                
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
