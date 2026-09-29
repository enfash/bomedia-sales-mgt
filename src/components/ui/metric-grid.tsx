import { Children, useState, type PropsWithChildren } from 'react';
import { View } from 'react-native';
import { tokens } from '@/theme/tokens';

/** Container-sized columns for related figures or paired form fields. */
export function AdaptiveGrid({ children }: PropsWithChildren) {
  const [availableWidth, setAvailableWidth] = useState(0);
  const items = Children.toArray(children);
  const columns = Math.max(1, Math.min(items.length, Math.floor((availableWidth + tokens.spacing.medium) / (tokens.controls.summaryMinWidth + tokens.spacing.medium))));
  const cellWidth = availableWidth ? (availableWidth - tokens.spacing.medium * (columns - 1)) / columns : tokens.controls.summaryMinWidth;
  return <View onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.medium }}>
    {items.map((child, index) => <View key={index} style={{ flexGrow: 1, flexBasis: cellWidth, minWidth: 0 }}>{child}</View>)}
  </View>;
}

export { AdaptiveGrid as MetricGrid };
