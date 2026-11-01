import { useState } from "react";
import clsx from "clsx";
import { Link, Outlet, useMatch } from "react-router-dom";
import { CommandPalette } from "./CommandPalette";
import styles from "./AppLayout.module.css";

export function AppLayout() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const isBuilder = Boolean(useMatch("/forms/:formId/*"));

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-brand">
          <span className="app-brand-mark">FB</span>
          <span className="app-brand-text">Form Builder</span>
        </Link>
        <button
          type="button"
          className={styles.paletteTrigger}
          onClick={() => setPaletteOpen(true)}
          aria-label="Open command palette"
        >
          <span>Search</span>
          <span className={styles.shortcuts}>
            <kbd className="kbd">⌘</kbd>
            <kbd className="kbd">K</kbd>
          </span>
        </button>
      </header>
      <main className={clsx("app-main", isBuilder && "app-main-builder")}>
        <Outlet />
      </main>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
