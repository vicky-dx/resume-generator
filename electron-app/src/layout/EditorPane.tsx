import React from "react";

interface EditorPaneProps {
    children: React.ReactNode;
}

export function EditorPane({ children }: EditorPaneProps) {
    return (
        <div className="w-1/2 flex flex-col border-r border-[#c7cad5] bg-[#ffffff] relative">
            {children}
        </div>
    );
}
