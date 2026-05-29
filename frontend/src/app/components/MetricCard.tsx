import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  gradient: string;
}

export function MetricCard({ title, value, change, changeType = 'neutral', icon: Icon, gradient }: MetricCardProps) {
  const changeColor = changeType === 'positive' ? 'text-success' : changeType === 'negative' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-card rounded-xl p-4 sm:p-5 border border-border shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5 sm:mb-2 truncate">{title}</p>
          <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
            <h3 className="text-2xl sm:text-3xl font-bold text-card-foreground">{value}</h3>
            {change && (
              <span className={`text-xs sm:text-sm font-medium ${changeColor}`}>
                {change}
              </span>
            )}
          </div>
        </div>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center bg-gradient-to-br ${gradient} shrink-0`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
    </motion.div>
  );
}
