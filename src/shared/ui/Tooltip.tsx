import { Tooltip as MantineTooltip } from "@mantine/core";
import type { ReactElement } from "react";

type TooltipProps = {
  label: string;
  children: ReactElement;
};

export function Tooltip({ label, children }: TooltipProps) {
  return (
    <MantineTooltip label={label} position="top" withArrow openDelay={400}>
      {children}
    </MantineTooltip>
  );
}
