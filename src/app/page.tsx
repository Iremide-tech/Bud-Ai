"use client";

import { ChatInterface } from "@/components/chat/ChatInterface";
import { Login } from "@/Login/Login";
import { useUser } from "@/lib/user-context";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { userProfile, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!userProfile) {
    return <Login />;
  }

  return <ChatInterface />;
}
