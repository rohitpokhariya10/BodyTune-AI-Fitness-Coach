import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from "react";

import { cn } from "@/shared/utils";

export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="thin-scrollbar w-full overflow-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} ref={ref} {...props} />
    </div>
  ),
);

Table.displayName = "Table";

export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead className={cn("[&_tr]:border-b", className)} ref={ref} {...props} />,
);

TableHeader.displayName = "TableHeader";

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody className={cn("[&_tr:last-child]:border-0", className)} ref={ref} {...props} />,
);

TableBody.displayName = "TableBody";

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr className={cn("border-b border-border transition hover:bg-muted/35", className)} ref={ref} {...props} />
  ),
);

TableRow.displayName = "TableRow";

export const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th className={cn("h-11 px-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground", className)} ref={ref} {...props} />
  ),
);

TableHead.displayName = "TableHead";

export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td className={cn("px-3 py-3 align-middle text-foreground", className)} ref={ref} {...props} />
  ),
);

TableCell.displayName = "TableCell";
