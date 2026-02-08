import NoResults from '@/components/NoResults';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ListItem } from '@rneui/themed';
import React, { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import CardLarge from './CardLarge';

import { translateWord } from '@/utils/utils';
import type { AccordionProps } from '../utils/types';

export default function Accordion({
  i = 0,
  filter = '',
  gamesFiltred = [],
  open = false,
  showDate = false,
  disableToggle = false,
  onRetry,
  showScores,
}: Readonly<AccordionProps & { onRetry?: () => void; showScores?: boolean }>) {
  const [expanded, setExpanded] = useState(disableToggle ? true : (open ?? i === 0));
  const { width } = useWindowDimensions();
  const isSmallDevice = width < 768;
  const isMedium = width < 1200;
  const containerWidth = isSmallDevice ? '100%' : isMedium ? '95%' : '75%';
  const badgeBackgroundColor = 'rgba(120, 120, 120, 0.1)';
  const badgeTextColor = useThemeColor({ light: '#404040', dark: '#8E8E93' }, 'text');
  const titleColor = useThemeColor({ light: '#48484A', dark: '#8E8E93' }, 'text');
  const borderColor = useThemeColor({ light: '#D1D1D6', dark: '#38383A' }, 'text');

  useEffect(() => {
    setExpanded(disableToggle ? true : (open ?? i === 0));
  }, [open, disableToggle, i]);

  const makeCards = () => {
    if (!gamesFiltred?.length) return <NoResults onRetry={onRetry} />;

    return gamesFiltred.map((game) => (
      <div
        key={`${game.homeTeamId}-${game.startTimeUTC}`}
        style={{ width: isSmallDevice ? '100%' : 'calc((100% - 30px) / 3)' }}
      >
        <CardLarge data={game} numberSelected={1} showDate={showDate} showButtons={true} showScores={showScores} />
      </div>
    ));
  };

  return (
    <div style={{ width: containerWidth, margin: 'auto' }}>
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
              }}
            >
              {filter.toLocaleUpperCase()}
            </ListItem.Title>

            <div
              style={{
                backgroundColor: badgeBackgroundColor,
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              <span
                style={{
                  color: badgeTextColor,
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 0.5,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                }}
              >
                {(gamesFiltred || []).length} {translateWord('events').toUpperCase()}
              </span>
            </div>
          </ListItem.Content>
        }
        isExpanded={expanded}
        noIcon={disableToggle}
        icon={{ name: 'chevron-down', type: 'font-awesome', color: titleColor, size: 15 }}
        onPress={disableToggle ? undefined : () => setExpanded(!expanded)}
        containerStyle={{
          backgroundColor: 'transparent',
          borderBottomWidth: 0,
          paddingTop: 20, // Espace au dessus de la ligne
        }}
        underlayColor="transparent"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '15px',

            justifyContent: isSmallDevice ? 'center' : 'flex-start',
          }}
        >
          {makeCards()}
        </div>
      </ListItem.Accordion>
    </div>
  );
}
