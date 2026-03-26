import {
  formatCompactNumber,
  formatDateTime,
  formatScore,
  getStatusTone,
  humanizeToken,
} from '../../lib/learningObservability.mjs';
import styles from './Observability.module.css';

function defaultColumns(kind) {
  if (kind === 'families') {
    return [
      {
        key: 'signature_family',
        label: 'Family',
        render: (row) => (
          <div className={styles.primaryCell}>
            <strong>{row.signature_family}</strong>
            <span className={styles.secondaryText}>{humanizeToken(row.event_type)}</span>
          </div>
        ),
      },
      {
        key: 'observation_count',
        label: 'Observaciones',
        render: (row) => formatCompactNumber(row.observation_count),
      },
      {
        key: 'unique_signatures',
        label: 'Signatures',
        render: (row) => formatCompactNumber(row.unique_signatures),
      },
      {
        key: 'avg_score',
        label: 'Score',
        render: (row) => formatScore(row.avg_score, 3),
      },
      {
        key: 'recency_weighted_score',
        label: 'Recency',
        render: (row) => formatScore(row.recency_weighted_score, 3),
      },
      {
        key: 'status',
        label: 'Estado',
        render: (row) => (
          <div className={styles.secondaryCell}>
            <span className={`badge badge--${getStatusTone(row.status)}`}>
              {humanizeToken(row.status)}
            </span>
            <span className={styles.secondaryText}>{formatDateTime(row.last_seen_at)}</span>
          </div>
        ),
      },
    ];
  }

  return [
    {
      key: 'signature',
      label: 'Signature',
      render: (row) => (
        <div className={styles.primaryCell}>
          <strong className={styles.mono}>{row.signature}</strong>
          <span className={styles.secondaryText}>
            {row.signature_family} / {humanizeToken(row.event_type)}
          </span>
        </div>
      ),
    },
    {
      key: 'observation_count',
      label: 'Observaciones',
      render: (row) => formatCompactNumber(row.observation_count),
    },
    {
      key: 'counts',
      label: 'Mix',
      render: (row) => (
        <div className={styles.secondaryCell}>
          <span>P {formatCompactNumber(row.positive_count)}</span>
          <span>N {formatCompactNumber(row.neutral_count)}</span>
          <span>B {formatCompactNumber(row.negative_count)}</span>
        </div>
      ),
    },
    {
      key: 'avg_score',
      label: 'Score',
      render: (row) => formatScore(row.avg_score, 3),
    },
    {
      key: 'recency_weighted_score',
      label: 'Recency',
      render: (row) => formatScore(row.recency_weighted_score, 3),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (row) => (
        <div className={styles.secondaryCell}>
          <span className={`badge badge--${getStatusTone(row.status)}`}>
            {humanizeToken(row.status)}
          </span>
          <span className={styles.secondaryText}>{formatDateTime(row.last_seen_at)}</span>
        </div>
      ),
    },
  ];
}

export default function ObservabilityTable({
  title,
  description,
  rows,
  kind = 'signatures',
  search,
  onSearchChange,
  sort,
  onSortChange,
  emptyLabel,
}) {
  const columns = defaultColumns(kind);

  return (
    <section className="surface-panel">
      <div className="surface-panel__body">
        <div className={styles.tableShell}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderCopy}>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            <span className="badge">{rows.length} filas</span>
          </div>

          <div className={styles.tableControls}>
            <div className={styles.tableControlsLeft}>
              <div className={styles.tableControl}>
                <label htmlFor={`${kind}-search`}>Busqueda</label>
                <input
                  id={`${kind}-search`}
                  type="search"
                  placeholder={kind === 'families' ? 'Buscar family...' : 'Buscar signature...'}
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                />
              </div>
            </div>

            <div className={styles.tableControlsRight}>
              <div className={styles.tableControl}>
                <label htmlFor={`${kind}-sort`}>Orden</label>
                <select
                  id={`${kind}-sort`}
                  value={sort}
                  onChange={(event) => onSortChange(event.target.value)}
                >
                  <option value="worst_score">Peor score</option>
                  <option value="most_observations">Mas observaciones</option>
                  <option value="best_score">Mejor score</option>
                  <option value="recent">Mas reciente</option>
                </select>
              </div>
            </div>
          </div>

          {rows.length ? (
            <div className={styles.metricTable}>
              <div className={styles.metricHead}>
                {columns.map((column) => (
                  <span key={column.key}>{column.label}</span>
                ))}
              </div>
              {rows.map((row) => (
                <div
                  key={row.signature || row.signature_family}
                  className={styles.metricRow}
                >
                  {columns.map((column) => (
                    <div key={column.key}>{column.render(row)}</div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-box">
              <strong>Sin resultados</strong>
              <div>{emptyLabel}</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
