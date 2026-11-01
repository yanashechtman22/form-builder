import { InputLabel } from "@mantine/core";
import type { LabelHTMLAttributes, ReactNode } from "react";

type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode;
  required?: boolean;
};

export function Label({ children, required = false, ...props }: LabelProps) {
  return (
    <InputLabel required={required} {...props}>
      {children}
    </InputLabel>
  );
}
