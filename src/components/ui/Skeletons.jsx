export function CardSkeleton() {
  return (
    <div className="w-44 shrink-0 rounded-xl bg-ink-800/60 p-3">
      <div className="skeleton aspect-square w-full rounded-lg" />
      <div className="skeleton mt-2.5 h-3.5 w-3/4 rounded" />
      <div className="skeleton mt-1.5 h-3 w-1/2 rounded" />
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <div className="skeleton h-11 w-11 rounded-lg" />
      <div className="flex-1">
        <div className="skeleton h-3.5 w-1/3 rounded" />
        <div className="skeleton mt-1.5 h-3 w-1/4 rounded" />
      </div>
    </div>
  );
}

export function ShelfSkeleton({ count = 6 }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 8 }) {
  return (
    <div>
      {Array.from({ length: count }, (_, index) => (
        <RowSkeleton key={index} />
      ))}
    </div>
  );
}
