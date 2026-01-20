export default function ScrollArea({ children, className = "" }) {
  return (
    <div
      className={`overflow-y-auto overscroll-contain ${className}`}
    >
      {children}
    </div>
  )
}
