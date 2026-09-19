import type {
  ReactNode,
} from "react";


type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
};


type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  emptyLabel: string;
};


export default function DataTable<T>({
  columns,
  rows,
  emptyLabel,
}: Props<T>) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column.key}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index}>
                {columns.map(column => (
                  <td key={column.key}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
