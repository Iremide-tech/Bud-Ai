"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession, signOut } from "next-auth/react";

export type UserProfile = {
    username: string;
    age: number;
    gender: string;
    occupation: string;
    budName: string;
};

type UserContextType = {
    userProfile: UserProfile | null;
    logout: () => void;
    refreshProfile: () => Promise<void>;
    isLoading: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data: session, status, update } = useSession();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        if (session?.user) {
            const u = session.user;
            setUserProfile({
                username: u.username || u.name || "Friend",
                age: u.age || 0,
                gender: u.gender || "Rather not say",
                occupation: u.occupation || "Explorer",
                budName: u.budName || "Bud"
            });
        } else {
            setUserProfile(null);
        }
    }, [session]);

    const logout = () => {
        signOut({ callbackUrl: "/" });
    };

    const refreshProfile = async () => {
        await update();
    };

    return (
        <UserContext.Provider value={{ userProfile, logout, refreshProfile, isLoading: status === "loading" }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
