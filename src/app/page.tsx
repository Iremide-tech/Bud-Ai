"use client";

import { ChatInterface } from "@/components/chat/ChatInterface";
import { Login } from "@/Login/Login";
import { useUser } from "@/lib/user-context";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { userProfile, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-child">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
      </div>
    );
  }

  if (!userProfile) {
    return <Login />;
  }

  return (
    <div className="h-full">
      <ChatInterface />
    </div>
  );
}
