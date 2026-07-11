import React from "react";

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    return (
        <div className="flex h-screen w-full bg-white text-[#1c1c1e] overflow-hidden">
            {children}
        </div>
    );
}
