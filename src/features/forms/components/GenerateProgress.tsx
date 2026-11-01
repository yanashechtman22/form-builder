import { useEffect, useState } from "react";
import styles from "./GenerateProgress.module.css";

const LINES = [
  "Reading what you asked for…",
  "Picking the questions that earn a place…",
  "Leaving out the ones nobody answers…",
  "Deciding which answers are required…",
  "Writing choices that are easy to tap…",
  "Saving room for a longer reply…",
  "Setting a scale that feels fair…",
  "Smoothing the wording so it sounds like you…",
  "Putting the questions in an order that flows…",
  "One last pass before you take over…",
];

const LINE_INTERVAL_MS = 3_400;

export function GenerateProgress() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % LINES.length);
    }, LINE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const line = LINES[index] ?? LINES[0];

  return (
    <div className={styles.root} role="status" aria-live="polite">
      <div className={styles.track} aria-hidden="true">
        <div className={styles.fill} />
        <div className={styles.sheen} />
      </div>
      <p key={line} className={styles.line}>
        {line}
      </p>
    </div>
  );
}
