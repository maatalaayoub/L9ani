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

// Secure admin status storage - tied to user ID and session token
// Uses a simple hash to prevent tampering
const generateSecurityHash = (userId, isAdmin, role, tokenFragment) => {
    // Create a deterministic hash from the data
    const data = `${userId}:${isAdmin}:${role}:${tokenFragment}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
};

const getStoredAdminStatus = (userId, token) => {
    try {
        const stored = sessionStorage.getItem('admin_status');
        if (!stored) return null;
        
        const data = JSON.parse(stored);
        
        // Verify the stored data belongs to the current user and session
        if (data.userId !== userId) {
            console.log('[Admin] Stored admin status is for different user, clearing');
            sessionStorage.removeItem('admin_status');
            return null;
        }
        
        // Verify integrity with security hash
        const tokenFragment = token?.slice(-16) || '';
        const expectedHash = generateSecurityHash(userId, data.isAdmin, data.role, tokenFragment);
        
        if (data.hash !== expectedHash) {
            console.log('[Admin] Admin status hash mismatch, clearing (possible tampering)');
            sessionStorage.removeItem('admin_status');
            return null;
        }
        
        // Check expiry (24 hours max)
        if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
            console.log('[Admin] Admin status expired, clearing');
            sessionStorage.removeItem('admin_status');
            return null;
        }
        
        return { isAdmin: data.isAdmin, role: data.role };
    } catch {
        sessionStorage.removeItem('admin_status');
        return null;
    }
};

const storeAdminStatus = (userId, isAdmin, role, token) => {
    try {
        const tokenFragment = token?.slice(-16) || '';
        const hash = generateSecurityHash(userId, isAdmin, role, tokenFragment);
        
        sessionStorage.setItem('admin_status', JSON.stringify({
            userId,
            isAdmin,
            role,
            hash,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.error('[Admin] Error storing admin status:', e);
    }
};

const clearAdminStatus = () => {
    try {
        sessionStorage.removeItem('admin_status');
    } catch (e) {
        console.error('[Admin] Error clearing admin status:', e);
    }
};

export function AuthProvider({ children }) {
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [showTermsDialog, setShowTermsDialog] = useState(false);
    
    // Admin status state - checked once on login
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminRole, setAdminRole] = useState(null);
    const [isAdminChecked, setIsAdminChecked] = useState(false);

    // Track profile fetch to prevent duplicate requests
    const profileFetchRef = useRef(null);
    const profileRetryCount = useRef(0);
    const adminCheckRef = useRef(null);
    const maxRetries = 3;

    // Check admin status - called once during login/session init
    const checkAdminStatus = async (userId, token) => {
        // Prevent duplicate checks for the same user
        if (adminCheckRef.current === userId) {
            console.log('[Admin] Already checking admin status for this user, skipping');
            return;
        }
        adminCheckRef.current = userId;
        
        try {
            // First, check if we have a valid cached status
            const cachedStatus = getStoredAdminStatus(userId, token);
            if (cachedStatus !== null) {
                console.log('[Admin] Using cached admin status:', cachedStatus);
                setIsAdmin(cachedStatus.isAdmin);
                setAdminRole(cachedStatus.role);
                setIsAdminChecked(true);
                return;
            }
            
            // Fetch from server
            console.log('[Admin] Checking admin status from server for user:', userId);
            const response = await fetch(`/api/admin/check?userId=${userId}`);
            const data = await response.json();
            
            console.log('[Admin] Server response:', data);
            
            setIsAdmin(data.isAdmin || false);
            setAdminRole(data.role || null);
            setIsAdminChecked(true);
            
            // Store securely for this session
            storeAdminStatus(userId, data.isAdmin || false, data.role || null, token);
        } catch (err) {
            console.error('[Admin] Error checking admin status:', err);
            setIsAdmin(false);
            setAdminRole(null);
            setIsAdminChecked(true);
        } finally {
            adminCheckRef.current = null;
        }
    };

    const fetchProfile = async (userId, userData = null, forceRefresh = false) => {
        // Prevent duplicate simultaneous fetches for the same user
        if (profileFetchRef.current === userId && !forceRefresh) {
            console.log('[Profile] Already fetching profile for this user, skipping');
            return null;
        }
        profileFetchRef.current = userId;

        try {
            console.log('[Profile] Fetching profile via API for user:', userId);
            
            // Use API route to bypass RLS - add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
            
            const response = await fetch(`/api/user/profile?userId=${userId}`, {
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'no-cache',
                }
            });
            
            clearTimeout(timeoutId);
            
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
                
                // Add timeout for create request
                const createController = new AbortController();
                const createTimeoutId = setTimeout(() => createController.abort(), 15000); // 15s timeout
                
                // Ensure phone number has + prefix if provided
                const phoneNumber = metadata.phoneNumber ? (metadata.phoneNumber.startsWith('+') ? metadata.phoneNumber : `+${metadata.phoneNumber}`) : null;
                
                const createResponse = await fetch('/api/user/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: createController.signal,
                    body: JSON.stringify({
                        userId: userId,
                        email: userData.email,
                        firstName: firstName,
                        lastName: lastName,
                        avatarUrl: metadata.avatar_url || metadata.picture || null,
                        // Email signup users have already accepted terms during registration
                        termsAccepted: hasPasswordSignup ? true : false,
                        hasPassword: hasPasswordSignup,
                        phone: phoneNumber
                    }),
                });
                
                clearTimeout(createTimeoutId);
                
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
            // Handle abort errors (timeout)
            if (error.name === 'AbortError') {
                console.warn('[Profile] Request timed out, using cached profile if available');
            } else if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
                // Network error - common during development or when server is starting
                console.warn('[Profile] Network error (server may be starting), using cached profile if available');
            } else {
                console.error('[Profile] Exception:', error.message || error);
            }
            
            // On error, try to use cached profile
            const cachedProfile = getStoredProfile();
            if (cachedProfile && cachedProfile.auth_user_id === userId) {
                console.log('[Profile] Using cached profile due to fetch error');
                setProfile(cachedProfile);
                return cachedProfile;
            }
            
            // Only retry for network errors, not for abort
            if (error.name !== 'AbortError' && profileRetryCount.current < maxRetries) {
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
        setIsAdmin(false);
        setAdminRole(null);
        setIsAdminChecked(false);
        
        // Clear our custom localStorage items
        localStorage.removeItem('supabase_token');
        localStorage.removeItem('supabase_refresh_token');
        localStorage.removeItem('supabase_user');
        localStorage.removeItem('supabase_profile'); // Also clear cached profile
        
        // Clear admin status from session storage
        clearAdminStatus();
        
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
                            
                            // Check admin status once on login
                            await checkAdminStatus(data.session.user.id, accessToken);
                            
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
                    
                    // Check admin status once on session restore
                    await checkAdminStatus(session.user.id, session.access_token);
                    
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
                        
                        // Check admin status once on session restore from storage
                        await checkAdminStatus(data.user.id, storedToken);
                    } else if (error) {
                        // Network error or invalid token - check if it's a network issue
                        console.error('[Auth] Session error:', error.message);
                        if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('timeout')) {
                            // Network issue - keep local state, don't logout
                            console.log('[Auth] Network issue detected, keeping local session');
                            const parsedUser = JSON.parse(storedUser);
                            setUser(parsedUser);
                            // Use cached admin status if available
                            const cachedStatus = getStoredAdminStatus(parsedUser.id, storedToken);
                            if (cachedStatus) {
                                setIsAdmin(cachedStatus.isAdmin);
                                setAdminRole(cachedStatus.role);
                                setIsAdminChecked(true);
                            }
                        } else {
                            // Invalid token - clear session
                            console.log('[Auth] Invalid token, clearing session');
                            localStorage.removeItem('supabase_token');
                            localStorage.removeItem('supabase_refresh_token');
                            localStorage.removeItem('supabase_user');
                            clearAdminStatus();
                        }
                    } else if (storedUser) {
                        // No error but no user data - use stored user
                        const parsedUser = JSON.parse(storedUser);
                        setUser(parsedUser);
                        fetchProfile(parsedUser.id, parsedUser);
                        // Check admin status
                        await checkAdminStatus(parsedUser.id, storedToken);
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
                
                // Check admin status on new sign in
                await checkAdminStatus(session.user.id, session.access_token);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                setIsAdmin(false);
                setAdminRole(null);
                setIsAdminChecked(false);
                localStorage.removeItem('supabase_token');
                localStorage.removeItem('supabase_refresh_token');
                localStorage.removeItem('supabase_user');
                clearAdminStatus();
            } else if (event === 'TOKEN_REFRESHED' && session) {
                localStorage.setItem('supabase_token', session.access_token);
                localStorage.setItem('supabase_refresh_token', session.refresh_token);
                // Update admin status hash with new token (but don't re-fetch)
                if (isAdminChecked && user?.id) {
                    storeAdminStatus(user.id, isAdmin, adminRole, session.access_token);
                }
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
        
        // Check admin status once on login
        await checkAdminStatus(userData.id, sessionData.access_token);
    };

    // Handle terms acceptance
    const handleTermsAccepted = () => {
        setShowTermsDialog(false);
        // Update the profile state to reflect terms accepted
        setProfile(prev => prev ? { ...prev, terms_accepted: true, terms_accepted_at: new Date().toISOString() } : prev);
    };
    
    // Force refresh admin status (useful if admin role changes)
    const refreshAdminStatus = async () => {
        if (!user) return;
        const token = localStorage.getItem('supabase_token');
        clearAdminStatus(); // Clear cache to force fresh fetch
        await checkAdminStatus(user.id, token);
    };

    // Force refresh profile from database (useful after email change)
    const refreshProfile = async () => {
        if (!user) return null;
        console.log('[Profile] Force refreshing profile for user:', user.id);
        
        // Clear cached profile
        storeProfile(null);
        
        // Also refresh the Supabase session to get updated email
        try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
                console.error('[Profile] Error refreshing session:', refreshError);
            } else if (refreshData?.user) {
                console.log('[Profile] Session refreshed, new email:', refreshData.user.email);
                setUser(refreshData.user);
            }
        } catch (err) {
            console.error('[Profile] Error refreshing session:', err);
        }
        
        // Fetch fresh profile
        return await fetchProfile(user.id, null, true);
    };

    // Get access token for API calls
    const getAccessToken = async () => {
        try {
            // First try to get from Supabase session (most reliable)
            if (supabase) {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error('[Auth] Error getting session:', error);
                }
                if (session?.access_token) {
                    // Also update localStorage with the latest token
                    localStorage.setItem('supabase_token', session.access_token);
                    return session.access_token;
                }
                
                // Try to refresh the session if we have a user but no valid session
                if (user) {
                    console.log('[Auth] No session found, attempting refresh...');
                    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                    if (refreshData?.session?.access_token) {
                        localStorage.setItem('supabase_token', refreshData.session.access_token);
                        return refreshData.session.access_token;
                    }
                    if (refreshError) {
                        console.error('[Auth] Error refreshing session:', refreshError);
                    }
                }
            }
            // Fall back to localStorage
            return localStorage.getItem('supabase_token');
        } catch (error) {
            console.error('[Auth] Error getting access token:', error);
            return localStorage.getItem('supabase_token');
        }
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
            handleTermsAccepted,
            // Admin status - checked once on login, cached securely
            isAdmin,
            adminRole,
            isAdminChecked,
            refreshAdminStatus,
            // Profile refresh (useful after email change)
            refreshProfile,
            // Token access for API calls
            getAccessToken
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
