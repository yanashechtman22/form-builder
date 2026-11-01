import { MantineProvider } from "@mantine/core";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { mantineTheme } from "@/styles/mantine-theme";

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <MantineProvider theme={mantineTheme} defaultColorScheme="light">
        {children}
      </MantineProvider>
    ),
    ...options,
  });
}
