import { createTheme, type MantineColorsTuple } from "@mantine/core";

const accent: MantineColorsTuple = [
  "#e7f4f2",
  "#cce8e5",
  "#9bd4ce",
  "#63bbb2",
  "#389f95",
  "#1f877d",
  "#0f766e",
  "#0d5f59",
  "#0b4d48",
  "#083b38",
];

const danger: MantineColorsTuple = [
  "#fff4ed",
  "#ffe6d5",
  "#feckaa",
  "#fdaa74",
  "#fb823c",
  "#f26516",
  "#c2410c",
  "#9a3412",
  "#7c2d12",
  "#431407",
];

export const mantineTheme = createTheme({
  primaryColor: "accent",
  colors: {
    accent,
    danger,
  },
  fontFamily: '"Instrument Sans", "Segoe UI", sans-serif',
  headings: {
    fontFamily: '"Instrument Sans", "Segoe UI", sans-serif',
    fontWeight: "600",
  },
  defaultRadius: "sm",
  cursorType: "pointer",
  primaryShade: 6,
  spacing: {
    xs: "0.375rem",
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.25rem",
  },
  shadows: {
    xs: "0 1px 2px rgba(26, 25, 21, 0.04)",
    sm: "0 1px 2px rgba(26, 25, 21, 0.04)",
    md: "0 8px 24px rgba(26, 25, 21, 0.08)",
    lg: "0 12px 40px rgba(26, 25, 21, 0.12)",
    xl: "0 16px 48px rgba(26, 25, 21, 0.14)",
  },
  components: {
    Button: {
      defaultProps: {
        radius: "sm",
        size: "sm",
        fw: 500,
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: "sm",
        size: "sm",
        variant: "subtle",
        color: "gray",
      },
    },
    Input: {
      defaultProps: {
        radius: "sm",
        size: "sm",
      },
    },
    Textarea: {
      defaultProps: {
        radius: "sm",
        size: "sm",
      },
    },
    NativeSelect: {
      defaultProps: {
        radius: "sm",
        size: "sm",
      },
    },
    Paper: {
      defaultProps: {
        radius: "md",
        shadow: "none",
      },
    },
    Modal: {
      defaultProps: {
        radius: "md",
        centered: true,
        shadow: "lg",
      },
    },
    Menu: {
      defaultProps: {
        radius: "md",
        shadow: "md",
      },
    },
    Alert: {
      defaultProps: {
        radius: "md",
      },
    },
  },
});
