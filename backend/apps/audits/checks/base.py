from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class CheckResult:
    check_key: str
    check_name: str
    category: str
    status: str         # pass | warning | critical | error
    severity: str       # low | medium | high | critical
    finding_summary: str
    explanation: str
    fix_instructions: str
    raw_data: dict = field(default_factory=dict)


class BaseCheck(ABC):
    check_key: str = ''
    check_name: str = ''
    category: str = ''
    default_severity: str = 'medium'

    @abstractmethod
    def run(self, customer_id: str, client) -> CheckResult:
        """Execute this check against the given account."""

    def _pass(self, summary: str, raw_data: dict = None) -> CheckResult:
        return CheckResult(
            check_key=self.check_key,
            check_name=self.check_name,
            category=self.category,
            status='pass',
            severity=self.default_severity,
            finding_summary=summary,
            explanation='',
            fix_instructions='',
            raw_data=raw_data or {},
        )

    def _warn(self, summary: str, explanation: str, fix: str, raw_data: dict = None) -> CheckResult:
        return CheckResult(
            check_key=self.check_key,
            check_name=self.check_name,
            category=self.category,
            status='warning',
            severity=self.default_severity,
            finding_summary=summary,
            explanation=explanation,
            fix_instructions=fix,
            raw_data=raw_data or {},
        )

    def _critical(self, summary: str, explanation: str, fix: str, raw_data: dict = None) -> CheckResult:
        return CheckResult(
            check_key=self.check_key,
            check_name=self.check_name,
            category=self.category,
            status='critical',
            severity='critical',
            finding_summary=summary,
            explanation=explanation,
            fix_instructions=fix,
            raw_data=raw_data or {},
        )

    def _error(self, summary: str, error: str) -> CheckResult:
        return CheckResult(
            check_key=self.check_key,
            check_name=self.check_name,
            category=self.category,
            status='error',
            severity='low',
            finding_summary=summary,
            explanation=f'Check failed with error: {error}',
            fix_instructions='Try re-running the audit. If the error persists, check the Google Ads connection.',
            raw_data={'error': error},
        )
