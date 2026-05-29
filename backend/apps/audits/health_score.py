"""
Health score calculation.

Score is 0-100. Starts at 100 and deducts points per failed check:
  - critical check: -20 points
  - warning check:  -8 points
  - error check:    -5 points (cannot determine, assume partial issue)

Score is floored at 0.
"""
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .models import AuditCheck

DEDUCTIONS = {
    'critical': 20,
    'warning': 8,
    'error': 5,
}


def calculate_health_score(checks: list) -> int:
    score = 100
    for check in checks:
        if check.status in DEDUCTIONS:
            score -= DEDUCTIONS[check.status]
    return max(0, score)
