import { Input as MantineInput } from "@mantine/core";
import { forwardRef, type InputHTMLAttributes } from "react";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "style"> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid = false, className, ...props },
  ref,
) {
  return (
    <MantineInput
      ref={ref}
      className={className}
      error={invalid || undefined}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});
