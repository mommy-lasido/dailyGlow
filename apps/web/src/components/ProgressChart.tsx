import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ProgressDatum {
  label: string;
  accuracy: number;
}

export function ProgressChart({ data }: { data: ProgressDatum[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#fde3c7" />
          <XAxis dataKey="label" tick={{ fontSize: 14 }} />
          <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} width={44} />
          <Tooltip formatter={(v: number) => [`${v}%`, '정답률']} />
          <Bar dataKey="accuracy" fill="#f97316" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
