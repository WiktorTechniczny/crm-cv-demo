import { Clock, FileText, ShieldCheck, Users } from "lucide-react";

interface MetricBarProps {
  total: number;
  returned: number;
  sourceCounts: Record<string, number>;
  newCount: number;
  loading?: boolean;
}

export function MetricBar({ total, returned, sourceCounts, newCount, loading = false }: MetricBarProps) {
  const showLoadingValue = loading && total === 0 && returned === 0;
  const metricValue = (value: number) => showLoadingValue ? "..." : value.toLocaleString("pl-PL");

  return (
    <section className="metric-row" aria-busy={loading}>
      <div title={returned && returned < total ? `W tabeli pokazano ${returned} z ${total}` : undefined}>
        <Users size={18} />
        <span>Kandydaci</span>
        <strong className={showLoadingValue ? "loading-metric" : undefined}>{metricValue(total)}</strong>
      </div>
      <div>
        <FileText size={18} />
        <span>Pracuj.pl</span>
        <strong className={showLoadingValue ? "loading-metric" : undefined}>{metricValue(sourceCounts.PRACUJ ?? 0)}</strong>
      </div>
      <div>
        <ShieldCheck size={18} />
        <span>OLX</span>
        <strong className={showLoadingValue ? "loading-metric" : undefined}>{metricValue(sourceCounts.OLX ?? 0)}</strong>
      </div>
      <div>
        <Clock size={18} />
        <span>Nowe</span>
        <strong className={showLoadingValue ? "loading-metric" : undefined}>{metricValue(newCount)}</strong>
      </div>
    </section>
  );
}
