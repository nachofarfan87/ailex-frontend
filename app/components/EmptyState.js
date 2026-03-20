import styles from './EmptyState.module.css';

export default function EmptyState({ icon, title, description, features }) {
  return (
    <div className={styles.empty}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.desc}>{description}</p>}
      {features && features.length > 0 && (
        <div className={styles.features}>
          {features.map((f, i) => (
            <span key={i} className="badge badge--upcoming">
              {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
