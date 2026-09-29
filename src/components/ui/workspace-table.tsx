import type { ReactNode } from 'react';
import { View } from 'react-native';
import { DataTable } from 'react-native-paper';
import { tokens } from '@/theme/tokens';

export type WorkspaceColumn<T> = {
  key: string; title: string; weight?: number; numeric?: boolean; render: (row: T) => ReactNode;
};

/** One column definition aligns headings and cells. Render noninteractive content:
 * Paper makes the whole row a button, so controls belong in the opened detail. */
export function WorkspaceTable<T>({ columns, rows, rowKey, rowLabel, onOpen }: {
  columns: WorkspaceColumn<T>[]; rows: T[]; rowKey: (row: T) => string;
  rowLabel: (row: T) => string; onOpen: (row: T) => void;
}) {
  return <DataTable>
    <DataTable.Header>{columns.map(column => <DataTable.Title key={column.key} numeric={column.numeric} numberOfLines={2} style={{ flex: column.weight ?? 1, paddingHorizontal: tokens.spacing.small }}>{column.title}</DataTable.Title>)}</DataTable.Header>
    {rows.map(row => <DataTable.Row key={rowKey(row)} accessibilityRole="button" accessibilityLabel={rowLabel(row)} onPress={() => onOpen(row)}>
      {columns.map(column => <View key={column.key} style={{ flex: column.weight ?? 1, minWidth: 0, padding: tokens.spacing.small, justifyContent: 'center', alignItems: column.numeric ? 'flex-end' : 'stretch' }}>{column.render(row)}</View>)}
    </DataTable.Row>)}
  </DataTable>;
}
