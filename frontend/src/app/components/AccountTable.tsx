import { Search, MoreVertical, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { HealthScoreRing } from './HealthScoreRing';
import { motion } from 'motion/react';

interface Account {
  id: string;
  name: string;
  healthScore: number;
  lastAudit: string;
  status: 'healthy' | 'warning' | 'critical';
  criticalIssues: number;
}

const mockAccounts: Account[] = [
  { id: '1', name: 'Acme Corp - Brand Campaign', healthScore: 92, lastAudit: '2 hours ago', status: 'healthy', criticalIssues: 0 },
  { id: '2', name: 'TechStart - Performance Max', healthScore: 68, lastAudit: '5 hours ago', status: 'warning', criticalIssues: 2 },
  { id: '3', name: 'Global Retail - Shopping Ads', healthScore: 45, lastAudit: '1 day ago', status: 'critical', criticalIssues: 5 },
  { id: '4', name: 'FinanceHub - Lead Gen', healthScore: 88, lastAudit: '3 hours ago', status: 'healthy', criticalIssues: 0 },
  { id: '5', name: 'EduTech Solutions - Search', healthScore: 72, lastAudit: '6 hours ago', status: 'warning', criticalIssues: 1 },
];

export function AccountTable() {
  const getStatusBadge = (status: Account['status']) => {
    const styles = {
      healthy: 'bg-success/10 text-success border-success/20',
      warning: 'bg-warning/10 text-warning border-warning/20',
      critical: 'bg-destructive/10 text-destructive border-destructive/20'
    };
    const icons = {
      healthy: CheckCircle2,
      warning: AlertTriangle,
      critical: AlertCircle
    };
    const Icon = icons[status];

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
        <Icon className="w-3.5 h-3.5" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-card-foreground">Connected Accounts</h2>
          <button className="px-4 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-lg font-medium hover:shadow-lg hover:shadow-primary/30 transition-all duration-300">
            Run All Audits
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search accounts..."
              className="w-full pl-10 pr-4 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select className="px-4 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option>All Status</option>
            <option>Healthy</option>
            <option>Warning</option>
            <option>Critical</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Health Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Audit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Critical Issues</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mockAccounts.map((account, index) => (
              <motion.tr
                key={account.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{account.name.substring(0, 2)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{account.name}</p>
                      <p className="text-xs text-muted-foreground">ID: {account.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <HealthScoreRing score={account.healthScore} size="sm" />
                  </div>
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(account.status)}
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-muted-foreground">{account.lastAudit}</span>
                </td>
                <td className="px-6 py-4">
                  {account.criticalIssues > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {account.criticalIssues}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">None</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Showing 1-5 of 12 accounts</span>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border border-border rounded-lg text-sm hover:bg-muted transition-colors">Previous</button>
          <button className="px-3 py-1 border border-border rounded-lg text-sm hover:bg-muted transition-colors">Next</button>
        </div>
      </div>
    </div>
  );
}
