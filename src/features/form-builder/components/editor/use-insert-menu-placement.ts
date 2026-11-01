import { useLayoutEffect, useRef, useState } from "react";

export type InsertMenuPlacement = "below" | "above" | "right" | "left";

const MENU_GAP = 8;

export function useInsertMenuPlacement(open: boolean) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState<InsertMenuPlacement>("below");
  const [menuTop, setMenuTop] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    function updatePlacement() {
      const anchor = anchorRef.current;
      const menu = menuRef.current;
      if (!anchor || !menu) {
        return;
      }
      const next = placeInsertMenu(
        anchor.getBoundingClientRect(),
        menu.offsetWidth,
        menu.offsetHeight,
      );
      setPlacement(next.placement);
      setMenuTop(next.top);
    }

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    return () => window.removeEventListener("resize", updatePlacement);
  }, [open]);

  return { anchorRef, menuRef, placement, menuTop };
}

function placeInsertMenu(
  anchor: DOMRect,
  menuWidth: number,
  menuHeight: number,
): { placement: InsertMenuPlacement; top: number | undefined } {
  const spaceBelow = window.innerHeight - anchor.bottom;
  const spaceAbove = anchor.top;
  const spaceRight = window.innerWidth - anchor.right;
  const spaceLeft = anchor.left;
  const fitsBelow = spaceBelow >= menuHeight + MENU_GAP;
  const fitsAbove = spaceAbove >= menuHeight + MENU_GAP;

  if (fitsBelow) {
    return { placement: "below", top: undefined };
  }
  if (fitsAbove) {
    return { placement: "above", top: undefined };
  }

  const placement: InsertMenuPlacement =
    spaceRight >= menuWidth + MENU_GAP || spaceRight >= spaceLeft ? "right" : "left";
  let top = 0;
  const overflowBottom = anchor.top + menuHeight + MENU_GAP - window.innerHeight;
  if (overflowBottom > 0) {
    top -= overflowBottom;
  }
  if (anchor.top + top < MENU_GAP) {
    top += MENU_GAP - (anchor.top + top);
  }
  return { placement, top };
}
