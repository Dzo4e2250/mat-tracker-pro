/**
 * @file WorkflowPipeline.tsx
 * @description Compact horizontal workflow strip showing email block sequence.
 */

import type { BlockDef } from './EmailBlockCanvas';

interface WorkflowPipelineProps {
  blocks: BlockDef[];
  activeBlockId: string | null;
  onBlockClick: (blockId: string) => void;
}

export default function WorkflowPipeline({ blocks, activeBlockId, onBlockClick }: WorkflowPipelineProps) {
  const visibleBlocks = blocks.filter(b => b.visible);

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto pb-0.5 text-[10px]">
      {visibleBlocks.map((block, idx) => {
        const Icon = block.icon;
        const isActive = activeBlockId === block.id;
        const isEditable = block.type === 'editable';

        return (
          <div key={block.id} className="flex items-center flex-shrink-0">
            <button
              onClick={() => onBlockClick(block.id)}
              className={[
                'flex items-center gap-0.5 px-1.5 py-0.5 rounded transition-all whitespace-nowrap',
                isActive
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : isEditable
                    ? 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                    : 'text-gray-400',
              ].join(' ')}
              title={block.label}
            >
              <Icon size={10} />
              <span>{block.label.length > 10 ? block.label.slice(0, 8) + '..' : block.label}</span>
            </button>
            {idx < visibleBlocks.length - 1 && (
              <span className="text-gray-300 mx-px select-none">&rarr;</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
