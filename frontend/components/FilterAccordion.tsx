import { useThemeColor } from '@/hooks/useThemeColor';
import { ListItem } from '@rneui/themed';
import React, { useEffect, useState } from 'react';
import Separator from './Separator';

interface FilterAccordionProps {
  readonly label: string;
  readonly children: React.ReactNode;
  readonly isSmallDevice: boolean;
  readonly defaultOpen?: boolean;
  readonly onExpandedChange?: (expanded: boolean) => void;
}

export default function FilterAccordion({
  label,
  children,
  isSmallDevice,
  defaultOpen = false,
  onExpandedChange,
}: Readonly<FilterAccordionProps>) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const titleColor = useThemeColor({ light: '#48484A', dark: '#8E8E93' }, 'text');
  const borderColor = useThemeColor({ light: '#D1D1D6', dark: '#38383A' }, 'text');

  useEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

  // On mobile, use accordion. On desktop, show normally
  if (!isSmallDevice) {
    return (
      <>
        <Separator label={label} />
        {children}
      </>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <ListItem.Accordion
        content={
          <ListItem.Content
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 8,
              borderBottomWidth: 1,
              borderBottomColor: borderColor,
              marginHorizontal: 10,
            }}
          >
            <ListItem.Title
              style={{
                color: titleColor,
                fontSize: 13,
                fontWeight: 'bold',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                textTransform: 'uppercase',
              }}
            >
              {label}
            </ListItem.Title>
          </ListItem.Content>
        }
        isExpanded={expanded}
        icon={{ name: 'chevron-down', type: 'font-awesome', color: titleColor, size: 15 }}
        onPress={() => setExpanded(!expanded)}
        containerStyle={{
          backgroundColor: 'transparent',
          borderBottomWidth: 0,
          paddingTop: 10,
          paddingBottom: 10,
        }}
        underlayColor="transparent"
      >
        <div style={{ width: '100%', paddingTop: 10, paddingBottom: 10 }}>{children}</div>
      </ListItem.Accordion>
    </div>
  );
}
