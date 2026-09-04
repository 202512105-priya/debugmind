import React from 'react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  keyExtractor?: (row: T, index: number) => string | number;
  selectedRowId?: string | number;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No items found',
  keyExtractor,
  selectedRowId,
}: DataTableProps<T>) {
  if (!data || data.length === 0) {
    return (
      <div className="py-8 text-center text-[12px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-4 py-2.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap ${
                    col.className || ''
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {data.map((row, rowIndex) => {
              const rowKey = keyExtractor ? keyExtractor(row, rowIndex) : (row as any).id ?? rowIndex;
              const isSelected = selectedRowId !== undefined && selectedRowId !== null && String(selectedRowId) === String(rowKey);

              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/50 border-l-4 border-l-blue-600 font-medium'
                      : onRowClick
                      ? 'cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-700/50'
                      : ''
                  }`}
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className={`px-4 py-2.5 text-[12px] text-slate-700 dark:text-slate-200 whitespace-nowrap ${
                        col.className || ''
                      }`}
                    >
                      {col.cell
                        ? col.cell(row)
                        : col.accessorKey
                        ? (row[col.accessorKey] as React.ReactNode)
                        : null}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
