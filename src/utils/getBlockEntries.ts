import { MinorBlockRecord } from 'accumulate.js/lib/api_v3';
import { ChainType } from 'accumulate.js/lib/merkle';

export default function getBlockEntries(block: MinorBlockRecord) {
  if (!block.entries?.records) return [];

  // Aggregate DN entries and anchored BVN entries
  const entries = [
    ...block.entries.records,
    ...(block.anchored?.records?.flatMap((x) => x.entries?.records || []) ||
      []),
  ];

  // Filter out anything that's not a message
  return entries.filter((x) => x.type === ChainType.Transaction);
}
