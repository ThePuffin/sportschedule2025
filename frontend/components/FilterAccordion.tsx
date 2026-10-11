import { useThemeColor } from '@/hooks/useThemeColor';
import { ListItem } from '@rneui/themed';
import React, { ReactNode, useEffect, useState } from 'react';
import { ThemedElements } from './ThemedElements';

/**
 * Screen-width threshold (px) separating "medium" screens (phones and tablets in
 * portrait) from "large" screens. Filter sections now render as collapsible
 * accordions on **every** screen size; this constant only drives layout choices:
 * below it the games list needs the vertical room saved by default-collapsed
 * filters, at and above it every filter accordion defaults to open.
 */
export const ACCORDION_MAX_WIDTH = 1024;

interface FilterAccordionProps {
  readonly label: string | ReactNode;
  readonly children: React.ReactNode;
  readonly defaultOpen?: boolean;
  /** Controlled `expanded` value. When provided, the accordion uses this value instead of its internal state, and `onExpandedChange` is called on toggle (so the parent can force open/close). When omitted, the accordion is uncontrolled (`defaultOpen` + internal state). */
  readonly expanded?: boolean;
  readonly onExpandedChange?: (expanded: boolean) => void;
}

export default function FilterAccordion({
  label,
  children,
  defaultOpen = false,
  expanded,
  onExpandedChange,
}: Readonly<FilterAccordionProps>) {
  const [internalExpanded, setInternalExpanded] = useState(defaultOpen);
  const isControlled = expanded !== undefined;
  const isExpanded = isControlled ? expanded : internalExpanded;
  const titleColor = useThemeColor({ light: '#48484A', dark: '#8E8E93' }, 'text');
  const borderColor = useThemeColor({ light: '#D1D1D6', dark: '#38383A' }, 'text');

  useEffect(() => {
    if (!isControlled) {
      onExpandedChange?.(internalExpanded);
    }
  }, [internalExpanded, onExpandedChange, isControlled]);

  const toggle = () => {
    if (isControlled) {
      onExpandedChange?.(!expanded);
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  // Accordion on every screen size: on large screens it simply defaults to open
  return (
    <ThemedElements style={{ width: '100%' }}>
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
              <span
                key={String(isExpanded)}
                style={{
                  display: 'inline-block',
                  animation: 'filterLabelIn 0.25s ease-out',
                }}
              >
                {label}
              </span>
              <style>{`
                @keyframes filterLabelIn {
                  from {
                    opacity: 0;
                    transform: translateY(-4px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
              `}</style>
            </ListItem.Title>
          </ListItem.Content>
        }
        isExpanded={isExpanded}
        icon={{ name: 'chevron-down', type: 'font-awesome', color: titleColor, size: 15 }}
        onPress={toggle}
        containerStyle={{
          backgroundColor: 'transparent',
          borderBottomWidth: 0,
          paddingTop: 10,
          paddingBottom: 10,
        }}
      >
        <div style={{ width: '100%', paddingTop: 10, paddingBottom: 10 }}>{children}</div>
      </ListItem.Accordion>
    </ThemedElements>
  );
}
