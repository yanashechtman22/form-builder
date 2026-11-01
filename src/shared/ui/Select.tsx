import { NativeSelect } from "@mantine/core";
import { forwardRef, type SelectHTMLAttributes } from "react";

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size" | "style" | "data"> & {
  invalid?: boolean;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid = false, className, children, ...props },
  ref,
) {
  return (
    <NativeSelect
      ref={ref}
      className={className}
      error={invalid || undefined}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </NativeSelect>
  );
});
