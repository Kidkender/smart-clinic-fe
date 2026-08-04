interface BarChartSeries {
  key: string;
  label: string;
  color: string;
}

interface BarChartProps<T extends object> {
  data: T[];
  categoryKey: keyof T & string;
  series: BarChartSeries[];
  orientation?: 'vertical' | 'horizontal';
  valueFormatter?: (value: number) => string;
  height?: number;
  emptyMessage?: string;
}

function field(row: object, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

const AXIS_COLOR = '#e8edf2';
const LABEL_COLOR = '#6c757d';
const CATEGORY_LABEL_COLOR = '#274760';

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export default function BarChart<T extends object>({
  data,
  categoryKey,
  series,
  orientation = 'vertical',
  valueFormatter = value => value.toLocaleString('vi-VN'),
  height = 280,
  emptyMessage = 'Không có dữ liệu.',
}: BarChartProps<T>) {
  if (data.length === 0) {
    return <p className="text-sm text-[#6c757d]">{emptyMessage}</p>;
  }

  const max = niceMax(Math.max(0, ...data.flatMap(row => series.map(s => Number(field(row, s.key)) || 0))));

  if (orientation === 'horizontal') {
    const rowHeight = 26;
    const chartWidth = 400;
    const labelColWidth = 120;
    const totalHeight = data.length * rowHeight * series.length;

    return (
      <div>
        {series.length > 1 && <Legend series={series} />}
        <svg viewBox={`0 0 ${chartWidth} ${totalHeight}`} width="100%" height={totalHeight} role="img">
          {data.map((row, rowIndex) => {
            const groupY = rowIndex * rowHeight * series.length;
            const categoryLabel = String(field(row, categoryKey));
            return (
              <g key={categoryLabel}>
                <text x={0} y={groupY + (rowHeight * series.length) / 2} dy="0.32em" fontSize="11" fill={CATEGORY_LABEL_COLOR}>
                  {categoryLabel.length > 18 ? `${categoryLabel.slice(0, 17)}…` : categoryLabel}
                </text>
                {series.map((s, seriesIndex) => {
                  const value = Number(field(row, s.key)) || 0;
                  const maxBarWidth = chartWidth - labelColWidth - 60;
                  const barWidth = Math.max((value / max) * maxBarWidth, value > 0 ? 2 : 0);
                  const y = groupY + seriesIndex * rowHeight + 4;
                  const barHeight = rowHeight - 8;
                  return (
                    <g key={s.key}>
                      <rect x={labelColWidth} y={y} width={barWidth} height={barHeight} rx={3} fill={s.color}>
                        <title>{`${s.label}: ${valueFormatter(value)}`}</title>
                      </rect>
                      <text x={labelColWidth + barWidth + 6} y={y + barHeight / 2} dy="0.32em" fontSize="10.5" fill={LABEL_COLOR}>
                        {valueFormatter(value)}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  const groupCount = data.length;
  const groupWidth = 100 / groupCount;
  const barGap = 0.6;
  const barWidth = (groupWidth - barGap * 2) / series.length;

  return (
    <div>
      {series.length > 1 && <Legend series={series} />}
      <svg viewBox={`0 0 100 ${60}`} width="100%" height={height} preserveAspectRatio="none" role="img">
        <line x1={0} y1={48} x2={100} y2={48} stroke={AXIS_COLOR} strokeWidth={0.3} />
        {data.map((row, groupIndex) => {
          const groupX = groupIndex * groupWidth;
          const categoryLabel = String(field(row, categoryKey));
          return (
            <g key={categoryLabel}>
              {series.map((s, seriesIndex) => {
                const value = Number(field(row, s.key)) || 0;
                const barHeight = Math.max((value / max) * 44, value > 0 ? 0.6 : 0);
                const x = groupX + barGap + seriesIndex * barWidth;
                const y = 48 - barHeight;
                return (
                  <rect key={s.key} x={x} y={y} width={Math.max(barWidth - 0.4, 0.4)} height={barHeight} rx={0.8} fill={s.color}>
                    <title>{`${categoryLabel} — ${s.label}: ${valueFormatter(value)}`}</title>
                  </rect>
                );
              })}
              <text
                x={groupX + groupWidth / 2}
                y={52.5}
                fontSize="2.6"
                textAnchor="middle"
                fill={LABEL_COLOR}
              >
                {categoryLabel.slice(-5)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Legend({ series }: { series: BarChartSeries[] }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-3">
      {series.map(s => (
        <div key={s.key} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
          <span className="text-xs text-[#6c757d]">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
