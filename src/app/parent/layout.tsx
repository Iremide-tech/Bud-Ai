"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { Loader2 } from "lucide-react";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
    const { userProfile, isLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!userProfile) {
                router.push("/");
            } else if (userProfile.age >= 18) {
                router.push("/");
            }
        }
    }, [userProfile, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
            </div>
        );
    }

    // If adult, don't render children while redirecting
    if (userProfile && userProfile.age >= 18) {
        return null;
    }

    return <>{children}</>;
}
