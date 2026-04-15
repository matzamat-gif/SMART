import React, { ReactNode } from 'react';
import { ScrollView, RefreshControl, ViewStyle } from 'react-native';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  children: ReactNode;
  style?: ViewStyle;
}

export default function PullToRefresh({
  onRefresh,
  refreshing,
  children,
  style,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <ScrollView
      style={style}
      refreshControl={
        <RefreshControl
          refreshing={refreshing || isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#059669"
          colors={['#059669', '#10B981']}
          progressBackgroundColor="#fff"
        />
      }
    >
      {children}
    </ScrollView>
  );
}
