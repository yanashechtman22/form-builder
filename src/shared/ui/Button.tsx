import {
  Button as MantineButton,
  type ButtonProps as MantineButtonProps,
} from "@mantine/core";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color" | "style"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

function toMantineProps(
  variant: ButtonVariant,
  size: ButtonSize,
): Pick<MantineButtonProps, "variant" | "color" | "size"> {
  const mantineSize = size === "md" ? "md" : size;

  switch (variant) {
    case "primary":
      return { variant: "filled", color: "accent", size: mantineSize };
    case "secondary":
      return { variant: "default", size: mantineSize };
    case "ghost":
      return { variant: "subtle", color: "gray", size: mantineSize };
    case "danger":
      return { variant: "light", color: "danger", size: mantineSize };
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", type = "button", children, ...props },
  ref,
) {
  return (
    <MantineButton ref={ref} type={type} {...toMantineProps(variant, size)} {...props}>
      {children}
    </MantineButton>
  );
});
