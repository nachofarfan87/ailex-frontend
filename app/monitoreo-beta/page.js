'use client';

import BetaMonitoringDashboard from '../components/beta-monitoring/BetaMonitoringDashboard';

export default function MonitoreoBetaPage() {
  return (
    <div className="workspace page-shell">
      <header className="page-header">
        <div className="page-header__copy">
          <span className="eyebrow">Beta controlada</span>
          <h1 className="page-title">Monitoreo Beta</h1>
          <p className="page-description">
            Panel operativo para supervisar el estado de AILEX durante la beta.
            Safety, reviews, overrides y alertas en un solo lugar.
          </p>
        </div>
        <div className="page-actions">
          <span className="badge badge--law">Beta</span>
        </div>
      </header>

      <BetaMonitoringDashboard />
    </div>
  );
}
