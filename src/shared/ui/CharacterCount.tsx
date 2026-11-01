import clsx from "clsx";
import styles from "./CharacterCount.module.css";

type CharacterCountProps = {
  value: string;
  max: number;
  /** Show once the field reaches this fraction of max. Default 0.8. */
  revealAt?: number;
};

/** Quiet n/max hint that appears as the user approaches the cap. */
export function CharacterCount({ value, max, revealAt = 0.8 }: CharacterCountProps) {
  const length = value.length;
  if (length < Math.floor(max * revealAt)) {
    return null;
  }

  const remaining = max - length;
  const warnThreshold = Math.max(20, Math.floor(max * 0.05));
  const className = clsx(
    styles.count,
    remaining <= 0 && styles.limit,
    remaining > 0 && remaining <= warnThreshold && styles.warn,
  );

  return (
    <p className={className} aria-live="polite">
      {length} / {max}
    </p>
  );
}
