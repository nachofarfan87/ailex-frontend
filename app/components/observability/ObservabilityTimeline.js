import { useMemo, useState } from 'react';
import {
  buildTimelineGeometry,
  formatCompactNumber,
  formatDateLabel,
  formatDateTime,
  formatScore,
} from '../../lib/learningObservability.mjs';
import styles from './Observability.module.css';

function isRecentDriftBucket(bucketDate, drift) {
  if (!drift?.drift_detected) {
    return false;
  }

  const recent = drift?.compared_windows?.recent;
  if (!recent?.start || !recent?.end) {
    return false;
  }

  const bucketTime = new Date(bucketDate).getTime();
  const startTime = new Date(recent.start).getTime();
  const endTime = new Date(recent.end).getTime();

  if ([bucketTime, startTime, endTime].some((value) => Number.isNaN(value))) {
    return false;
  }

  return bucketTime >= startTime && bucketTime <= endTime;
}

export default function ObservabilityTimeline({ timeline, drift }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!timeline?.length) {
    return (
      <section className="surface-panel">
        <div className="surface-panel__body">
          <div className={styles.panelHeaderCopy}>
            <h2>Timeline</h2>
            <p>No hay buckets disponibles para la combinacion actual de filtros.</p>
          </div>
        </div>
      </section>
    );
  }

  const geometry = useMemo(() => buildTimelineGeometry(timeline), [timeline]);

  return (
    <section className="surface-panel">
      <div className="surface-panel__body">
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderCopy}>
            <h2>Timeline</h2>
            <p>
              La linea sigue `net_score`; las barras muestran reforzadas, neutrales y bloqueadas
              por bucket temporal.
            </p>
          </div>
          <span className="badge">{timeline.length} buckets</span>
        </div>

        <div className={styles.timelineWrap}>
          <div className={styles.timelineViewport}>
            <div
              className={styles.timelineCanvas}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <svg
                className={styles.timelineSvg}
                width={geometry.width}
                height={geometry.height}
                viewBox={`0 0 ${geometry.width} ${geometry.height}`}
                role="img"
                aria-label="Timeline de observabilidad"
              >
                <line
                  x1={geometry.padding.left}
                  x2={geometry.width - geometry.padding.right}
                  y1={geometry.zeroLineY}
                  y2={geometry.zeroLineY}
                  stroke="rgba(255,255,255,0.12)"
                  strokeDasharray="4 6"
                />

                {geometry.points.map((point) => (
                  <g key={point.index}>
                    <rect
                      x={point.x - 18}
                      y={geometry.zeroLineY - point.bars.reinforcedHeight}
                      width="10"
                      height={point.bars.reinforcedHeight}
                      rx="3"
                      fill="rgba(103, 169, 139, 0.86)"
                    />
                    <rect
                      x={point.x - 4}
                      y={geometry.zeroLineY - point.bars.neutralHeight / 2}
                      width="8"
                      height={point.bars.neutralHeight}
                      rx="3"
                      fill="rgba(148, 154, 166, 0.8)"
                    />
                    <rect
                      x={point.x + 8}
                      y={geometry.zeroLineY}
                      width="10"
                      height={point.bars.blockedHeight}
                      rx="3"
                      fill="rgba(213, 114, 103, 0.86)"
                    />
                  </g>
                ))}

                <polyline
                  fill="none"
                  stroke="rgba(110, 140, 255, 0.95)"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={geometry.linePath}
                />

                {geometry.points.map((point) => {
                  const highlighted = isRecentDriftBucket(point.raw.date, drift);
                  return (
                    <g
                      key={`point-${point.index}`}
                      onMouseEnter={() => setHoveredPoint(point.raw)}
                      onFocus={() => setHoveredPoint(point.raw)}
                    >
                      {highlighted ? (
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="8"
                          fill="rgba(200,160,98,0.14)"
                          stroke="rgba(200,160,98,0.75)"
                          strokeWidth="1.5"
                        />
                      ) : null}
                      <circle cx={point.x} cy={point.y} r="4.5" fill="#6e8cff" />
                      <text
                        x={point.x}
                        y={geometry.height - 10}
                        textAnchor="middle"
                        fill="rgba(168,176,190,0.92)"
                        fontSize="11"
                      >
                        {formatDateLabel(point.raw.date)}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {hoveredPoint ? (
                <div className={styles.timelineTooltip} role="status" aria-live="polite">
                  <strong>{formatDateTime(hoveredPoint.date)}</strong>
                  <span>Net score: {formatScore(hoveredPoint.net_score, 0)}</span>
                  <span>Observaciones: {formatCompactNumber(hoveredPoint.observations)}</span>
                  <span>Reforzadas: {formatCompactNumber(hoveredPoint.reinforced_count)}</span>
                  <span>Bloqueadas: {formatCompactNumber(hoveredPoint.blocked_count)}</span>
                  <span>Neutrales: {formatCompactNumber(hoveredPoint.neutral_count)}</span>
                  {isRecentDriftBucket(hoveredPoint.date, drift) ? (
                    <span className="badge badge--warning">Bucket dentro de ventana de drift</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className={styles.timelineLegend}>
            <div className={styles.legendItem}>
              <span className="muted-label">Net score</span>
              <strong>Linea azul</strong>
            </div>
            <div className={styles.legendItem}>
              <span className="muted-label">Reforzadas</span>
              <strong>Barra verde</strong>
            </div>
            <div className={styles.legendItem}>
              <span className="muted-label">Neutrales</span>
              <strong>Barra ambar</strong>
            </div>
            <div className={styles.legendItem}>
              <span className="muted-label">Bloqueadas</span>
              <strong>Barra roja</strong>
            </div>
          </div>

          <div className={styles.timelineBuckets}>
            {timeline.map((bucket) => (
              <article key={bucket.date} className={styles.timelineBucket}>
                <div className={styles.timelineBucketHeader}>
                  <strong>{formatDateLabel(bucket.date)}</strong>
                  <span className="badge">{formatScore(bucket.net_score, 0)}</span>
                </div>
                <div className={styles.timelineBucketStats}>
                  <span>Observaciones: {formatCompactNumber(bucket.observations)}</span>
                  <span>Reforzadas: {formatCompactNumber(bucket.reinforced_count)}</span>
                  <span>Bloqueadas: {formatCompactNumber(bucket.blocked_count)}</span>
                  <span>Neutrales: {formatCompactNumber(bucket.neutral_count)}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
