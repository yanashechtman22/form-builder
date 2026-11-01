import { Menu as MantineMenu } from "@mantine/core";
import type { CSSProperties, ReactNode } from "react";

type MenuProps = {
  children: ReactNode;
  width?: number;
  position?: "bottom-start" | "bottom-end";
};

function MenuRoot({ children, width = 240, position = "bottom-start" }: MenuProps) {
  return (
    <MantineMenu width={width} position={position} withinPortal>
      {children}
    </MantineMenu>
  );
}

function MenuTarget({ children }: { children: ReactNode }) {
  return <MantineMenu.Target>{children}</MantineMenu.Target>;
}

function MenuDropdown({ children }: { children: ReactNode }) {
  return <MantineMenu.Dropdown>{children}</MantineMenu.Dropdown>;
}

function MenuItem({
  children,
  leftSection,
  color,
  onClick,
}: {
  children: ReactNode;
  leftSection?: ReactNode;
  color?: "danger";
  onClick: () => void;
}) {
  const dangerStyle = {
    "--menu-item-color": "var(--color-danger)",
  } as CSSProperties;

  return (
    <MantineMenu.Item
      leftSection={leftSection}
      style={color === "danger" ? dangerStyle : undefined}
      onClick={onClick}
    >
      {children}
    </MantineMenu.Item>
  );
}

export const Menu = Object.assign(MenuRoot, {
  Target: MenuTarget,
  Dropdown: MenuDropdown,
  Item: MenuItem,
});
