import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { mantineTheme } from "@/styles/mantine-theme";
import { CommandBridgeProvider } from "./command-bridge";
import { createQueryClient } from "./query-client";
import "@mantine/core/styles.css";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={mantineTheme} defaultColorScheme="light">
        <CommandBridgeProvider>{children}</CommandBridgeProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}
