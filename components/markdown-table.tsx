import clsx from "clsx";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type TableDensity = "course" | "forum";

type MarkdownTableProps = {
  children: ReactNode;
  density?: TableDensity;
};

type MarkdownTableElementProps<T extends "thead" | "tr" | "td" | "th"> =
  ComponentPropsWithoutRef<T> & {
    node?: unknown;
  };

type MarkdownTableCellProps<T extends "td" | "th"> =
  MarkdownTableElementProps<T> & {
    density?: TableDensity;
  };

const densityStyles: Record<
  TableDensity,
  {
    frame: string;
    table: string;
    cell: string;
    minWidth: string;
  }
> = {
  course: {
    frame: "my-8",
    table: "text-[1rem] leading-[1.75]",
    cell: "px-4 py-3",
    minWidth: "min-w-[680px]",
  },
  forum: {
    frame: "my-5",
    table: "text-[0.95rem] leading-[1.65]",
    cell: "px-3 py-2.5",
    minWidth: "min-w-[560px]",
  },
};

export function MarkdownTable({
  children,
  density = "course",
}: MarkdownTableProps) {
  const styles = densityStyles[density];

  return (
    <div
      className={clsx(
        "overflow-x-auto border-2 border-ink bg-paper shadow-[4px_4px_0_0_var(--color-edge)]",
        styles.frame,
      )}
    >
      <table
        className={clsx(
          "w-full border-collapse text-left font-serif text-ink",
          "[&_code]:whitespace-nowrap",
          styles.table,
          styles.minWidth,
        )}
      >
        {children}
      </table>
    </div>
  );
}

export function MarkdownTableHead({
  children,
  className,
  node: _node,
  ...props
}: MarkdownTableElementProps<"thead">) {
  return (
    <thead
      {...props}
      className={clsx(
        "border-b-2 border-ink bg-paper-3 font-display text-[0.88em] font-black",
        className,
      )}
    >
      {children}
    </thead>
  );
}

export function MarkdownTableRow({
  children,
  className,
  node: _node,
  ...props
}: MarkdownTableElementProps<"tr">) {
  return (
    <tr
      {...props}
      className={clsx(
        "border-b border-edge last:border-b-0 even:bg-paper-2/55",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function MarkdownTableHeaderCell({
  children,
  className,
  density = "course",
  node: _node,
  ...props
}: MarkdownTableCellProps<"th">) {
  const styles = densityStyles[density];

  return (
    <th
      {...props}
      className={clsx(
        "border-r border-ink/25 align-top last:border-r-0",
        "text-left tracking-[0.08em] text-ink",
        styles.cell,
        className,
      )}
    >
      {children}
    </th>
  );
}

export function MarkdownTableCell({
  children,
  className,
  density = "course",
  node: _node,
  ...props
}: MarkdownTableCellProps<"td">) {
  const styles = densityStyles[density];

  return (
    <td
      {...props}
      className={clsx(
        "border-r border-edge/80 align-top last:border-r-0",
        "first:font-bold first:text-ink",
        styles.cell,
        className,
      )}
    >
      {children}
    </td>
  );
}
