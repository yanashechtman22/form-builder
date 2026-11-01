import styles from "./LoadingState.module.css";

type LoadingStateProps = {
  label?: string;
  rows?: number;
};

export function LoadingState({ label = "Loading", rows = 3 }: LoadingStateProps) {
  return (
    <div className={styles.root} role="status" aria-live="polite" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles.row}>
          <div className={`${styles.line} ${styles.lineShort}`} />
          <div className={styles.block} />
          <div className={`${styles.line} ${styles.lineMedium}`} />
        </div>
      ))}
    </div>
  );
}
