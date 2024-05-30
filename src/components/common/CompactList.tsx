import { Button, List } from 'antd';
import React, { useState } from 'react';

export function CompactList<T>({
  dataSource,
  limit,
  ...props
}: Parameters<typeof List<T>>[0] & {
  limit?: number;
}) {
  const [showAll, setShowAll] = useState(false);

  const applyLimit = !showAll && limit && dataSource?.length > limit;
  return (
    <List
      size="small"
      className="compact-list"
      split={false}
      {...props}
      dataSource={applyLimit ? dataSource.slice(0, limit) : dataSource}
      footer={
        applyLimit && (
          <Button onClick={() => setShowAll(true)}>
            +{dataSource.length - limit} more
          </Button>
        )
      }
    />
  );
}
