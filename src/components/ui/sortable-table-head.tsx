import { Icon } from '@iconify/react';
import { TableHead } from '@/components/ui/table';

export default function SortableTableHead({
  label,
  column,
  sortBy,
  onSort,
}: {
  label: string;
  column: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onSort: (column: string) => void;
}) {
  const active = sortBy === column;
  return (
    <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">
      <button
        type="button"
        onClick={() => onSort(column)}
        className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-xs font-bold text-[#6c757d] uppercase"
      >
        {label}
        <Icon icon="fa6-solid:sort" className={active ? 'text-[#307bc4]' : 'text-[#6c757d]/50'} />
      </button>
    </TableHead>
  );
}
