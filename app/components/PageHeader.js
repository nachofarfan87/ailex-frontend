import styles from './PageHeader.module.css';

export default function PageHeader({ breadcrumb, icon, title, description }) {
  return (
    <header className={styles.header}>
      {breadcrumb && <div className={styles.breadcrumb}>{breadcrumb}</div>}
      <div className={styles.titleRow}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <h1 className={styles.title}>{title}</h1>
      </div>
      {description && <p className={styles.description}>{description}</p>}
    </header>
  );
}
