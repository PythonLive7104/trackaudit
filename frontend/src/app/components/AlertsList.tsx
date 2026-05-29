import { AlertCircle, AlertTriangle, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface Alert {
  id: string;
  type: 'critical' | 'warning';
  account: string;
  message: string;
  time: string;
}

const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'critical',
    account: 'Global Retail',
    message: 'Conversion tracking tag not firing on checkout page',
    time: '10 min ago'
  },
  {
    id: '2',
    type: 'critical',
    account: 'TechStart',
    message: 'Google Consent Mode V2 not implemented',
    time: '1 hour ago'
  },
  {
    id: '3',
    type: 'warning',
    account: 'EduTech Solutions',
    message: 'Enhanced conversions data quality below 80%',
    time: '3 hours ago'
  }
];

export function AlertsList() {
  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground mb-1">Critical Alerts</h3>
          <p className="text-sm text-muted-foreground">Issues requiring immediate attention</p>
        </div>
        <button className="text-sm font-medium text-primary hover:underline">View All</button>
      </div>

      <div className="space-y-3">
        {mockAlerts.map((alert, index) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                alert.type === 'critical'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-warning/10 text-warning'
              }`}>
                {alert.type === 'critical' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-primary">{alert.account}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {alert.time}
                  </span>
                </div>
                <p className="text-sm text-card-foreground group-hover:text-primary transition-colors">
                  {alert.message}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
