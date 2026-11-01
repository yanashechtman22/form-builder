import { Popover as MantinePopover } from "@mantine/core";
import type { ReactElement, ReactNode } from "react";

type PopoverProps = {
  children: ReactNode;
  width?: number;
};

function PopoverRoot({ children, width = 320 }: PopoverProps) {
  return (
    <MantinePopover position="bottom-end" width={width} shadow="md" withinPortal>
      {children}
    </MantinePopover>
  );
}

function PopoverTarget({ children }: { children: ReactElement }) {
  return <MantinePopover.Target>{children}</MantinePopover.Target>;
}

function PopoverDropdown({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <MantinePopover.Dropdown className={className}>{children}</MantinePopover.Dropdown>;
}

export const Popover = Object.assign(PopoverRoot, {
  Target: PopoverTarget,
  Dropdown: PopoverDropdown,
});
