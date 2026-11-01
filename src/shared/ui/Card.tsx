import { Paper } from "@mantine/core";
import clsx from "clsx";
import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
  active?: boolean;
};

const paddingMap = {
  none: 0,
  sm: "sm",
  md: "md",
  lg: "lg",
} as const;

export function Card({
  children,
  padding = "md",
  interactive = false,
  active = false,
  className,
  ...props
}: CardProps) {
  const classes = clsx(
    styles.card,
    interactive && styles.interactive,
    active && styles.active,
    className,
  );

  return (
    <Paper
      withBorder
      shadow="none"
      p={paddingMap[padding]}
      className={classes}
      style={{ cursor: interactive ? "pointer" : undefined }}
      {...props}
    >
      {children}
    </Paper>
  );
}
