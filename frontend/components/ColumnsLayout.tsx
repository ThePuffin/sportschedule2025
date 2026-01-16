import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React from 'react';

export interface ColumnData {
  title: string;
  key: string;
  content?: React.ReactNode;
}

interface ColumnsHeaderProps {
  columns: ColumnData[];
  widthStyle?: string | number;
}

export function ColumnsHeader({ columns, widthStyle = '100%' }: Readonly<ColumnsHeaderProps>) {
  if (columns.length === 0) return null;
  return (
    <div style={{ backgroundColor: 'white', border: '1px solid black', width: widthStyle, margin: 'auto' }}>
      <table
        style={{
          tableLayout: 'fixed',
          width: '100%',
          margin: 'auto',
          borderCollapse: 'collapse',
        }}
      >
        <tbody>
          <tr>
            {columns.map((col, index) => (
              <td
                key={col.key}
                style={{
                  borderRight: index === columns.length - 1 ? undefined : '1px solid black',
                }}
              >
                <div
                  style={{
                    padding: 15,
                    alignItems: 'center',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <ThemedText type="subtitle" style={{ color: 'black' }}>
                    {col.title}
                  </ThemedText>
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

interface ColumnsContentProps {
  columns: ColumnData[];
  widthStyle?: string | number;
}

export function ColumnsContent({ columns, widthStyle = '100%' }: Readonly<ColumnsContentProps>) {
  if (columns.length === 0) return null;
  return (
    <ThemedView>
      <table
        style={{
          tableLayout: 'fixed',
          width: widthStyle,
          margin: 'auto',
        }}
      >
        <tbody>
          <tr>
            {columns.map((col) => (
              <td key={col.key} style={{ verticalAlign: 'top' }}>
                {col.content}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </ThemedView>
  );
}
