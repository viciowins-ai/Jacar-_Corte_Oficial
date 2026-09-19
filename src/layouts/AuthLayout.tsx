import React from 'react';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-white max-w-md mx-auto shadow-2xl relative overflow-hidden">
      {children}
    </div>
  );
}
