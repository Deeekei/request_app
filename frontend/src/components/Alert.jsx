export function Alert({ type = 'info', children }) {
  return <div className={`alert ${type}`}>{children}</div>;
}
