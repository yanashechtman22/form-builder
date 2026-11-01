import { Textarea as MantineTextarea } from "@mantine/core";
import { forwardRef, type TextareaHTMLAttributes } from "react";

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "style"> & {
  invalid?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid = false, className, rows, ...props },
  ref,
) {
  return (
    <MantineTextarea
      ref={ref}
      className={className}
      error={invalid || undefined}
      aria-invalid={invalid || undefined}
      rows={rows}
      autosize={false}
      {...props}
    />
  );
});
