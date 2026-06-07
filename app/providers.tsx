"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTheme } from "@/hooks/use-theme";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const { theme } = useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <div className={theme}>
        <div className="bg-background text-foreground min-h-screen font-sans antialiased">
          {children}
        </div>
      </div>
    </QueryClientProvider>
  );
}