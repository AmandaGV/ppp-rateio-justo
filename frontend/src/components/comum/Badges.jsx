export function StatusBadge({ status, testId = 'status-badge' }) {
  return (
    <span className={`badge badge-status-${status?.toLowerCase()}`} data-testid={testId} data-status={status}>
      {status}
    </span>
  );
}

export function PapelBadge({ papel, testId = 'role-badge' }) {
  return (
    <span className={`badge badge-papel-${papel?.toLowerCase()}`} data-testid={testId} data-role={papel}>
      {papel}
    </span>
  );
}
