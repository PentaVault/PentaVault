import type { HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

type TableProps = TableHTMLAttributes<HTMLTableElement>
type TableRowProps = HTMLAttributes<HTMLTableRowElement>
type TableCellProps = TdHTMLAttributes<HTMLTableCellElement>
type TableHeadProps = ThHTMLAttributes<HTMLTableCellElement>

export function Table({ className, ...props }: TableProps) {
  return <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('[&_tr]:border-b [&_tr]:border-border', className)} {...props} />
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

export function TableRow({ className, ...props }: TableRowProps) {
  return <tr className={cn('border-b border-border transition-colors', className)} {...props} />
}

export function TableHead({ className, ...props }: TableHeadProps) {
  return <th className={cn('h-10 px-4 text-left align-middle font-medium', className)} {...props} />
}

export function TableCell({ className, ...props }: TableCellProps) {
  return <td className={cn('p-4 align-middle', className)} {...props} />
}
