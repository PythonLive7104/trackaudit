import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const mockData = [
  { date: 'Jan 1', score: 75 },
  { date: 'Jan 8', score: 78 },
  { date: 'Jan 15', score: 82 },
  { date: 'Jan 22', score: 85 },
  { date: 'Jan 29', score: 88 },
  { date: 'Feb 5', score: 87 },
  { date: 'Feb 12', score: 92 },
];

export function HealthTrendChart() {
  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-card-foreground mb-1">Overall Health Trend</h3>
        <p className="text-sm text-muted-foreground">Average health score across all accounts</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={mockData}>
          <defs>
            <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
          <XAxis
            dataKey="date"
            className="text-xs text-muted-foreground"
            stroke="currentColor"
            opacity={0.5}
          />
          <YAxis
            className="text-xs text-muted-foreground"
            stroke="currentColor"
            opacity={0.5}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
            labelStyle={{ color: 'var(--card-foreground)' }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#3B82F6"
            strokeWidth={3}
            fill="url(#healthGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
