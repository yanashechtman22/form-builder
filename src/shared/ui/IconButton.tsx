import { ActionIcon } from "@mantine/core";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color" | "style"> & {
  label: string;
  children: ReactNode;
  tone?: "default" | "danger";
  active?: boolean;
};

export function IconButton({
  label,
  children,
  tone = "default",
  active = false,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <ActionIcon
      type={type}
      variant={active ? "light" : "subtle"}
      color={tone === "danger" ? "danger" : active ? "accent" : "gray"}
      size="sm"
      radius="sm"
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </ActionIcon>
  );
}
