import { Input } from "@mantine/core";
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

type FormFieldProps = {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function FormField({
  id,
  label,
  required = false,
  hint,
  error,
  children,
}: FormFieldProps) {
  const child = Children.only(children);
  const control =
    isValidElement(child)
      ? cloneElement(child as ReactElement<Record<string, unknown>>, {
          id,
          invalid: Boolean(error) || undefined,
        })
      : children;

  return (
    <Input.Wrapper
      label={label}
      description={hint}
      error={error}
      required={required}
      withAsterisk={required}
      inputWrapperOrder={["label", "description", "input", "error"]}
    >
      {control}
    </Input.Wrapper>
  );
}
