import { NumberInput as MantineNumberInput } from "@mantine/core";

type NumberInputProps = {
  id?: string;
  className?: string;
  value: number | "";
  onChange: (value: number | null) => void;
  onBlur?: () => void;
  min?: number;
  max?: number;
  allowNegative?: boolean;
  invalid?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
};

export function NumberInput({
  value,
  onChange,
  onBlur,
  min,
  max,
  allowNegative = true,
  invalid = false,
  ...props
}: NumberInputProps) {
  return (
    <MantineNumberInput
      {...props}
      value={value}
      onChange={(next) => {
        onChange(typeof next === "number" ? next : null);
      }}
      onBlur={onBlur}
      min={min}
      max={max}
      clampBehavior="none"
      allowDecimal
      allowNegative={allowNegative}
      error={invalid || undefined}
    />
  );
}
