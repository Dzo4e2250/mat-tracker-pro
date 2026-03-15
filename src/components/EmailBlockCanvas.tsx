/**
 * @file EmailBlockCanvas.tsx
 * @description Visual email block builder with drag-and-drop reordering.
 * Editable blocks are interactive cards, fixed/auto blocks are compact inline labels.
 */

import { useState, useRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { GripVertical, ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react';

export interface BlockDef {
  id: string;
  type: 'fixed' | 'editable' | 'auto';
  label: string;
  icon: LucideIcon;
  text: string;
  placeholder?: string;
  visible: boolean;
  color: string;
}

export interface EmailBlockCanvasProps {
  blocks: BlockDef[];
  onBlockTextChange: (blockId: string, text: string) => void;
  onBlocksReorder: (newOrder: string[]) => void;
  compact?: boolean;
  activeBlockId?: string | null;
  onActiveBlockChange?: (blockId: string | null) => void;
}

export default function EmailBlockCanvas({
  blocks,
  onBlockTextChange,
  onBlocksReorder,
  compact = false,
  activeBlockId,
  onActiveBlockChange,
}: EmailBlockCanvasProps) {
  const [localActiveId, setLocalActiveId] = useState<string | null>(null);
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const expandedId = activeBlockId ?? localActiveId;
  const setExpandedId = onActiveBlockChange ?? setLocalActiveId;

  const visibleBlocks = blocks.filter(b => b.visible);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const srcIdx = result.source.index;
    const dstIdx = result.destination.index;
    if (srcIdx === dstIdx) return;

    const reordered = [...visibleBlocks];
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(dstIdx, 0, moved);
    onBlocksReorder(reordered.map(b => b.id));
  }, [visibleBlocks, onBlocksReorder]);

  const handleBlockClick = useCallback((blockId: string, type: BlockDef['type']) => {
    if (type !== 'editable') return;
    setExpandedId(expandedId === blockId ? null : blockId);
  }, [expandedId, setExpandedId]);

  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + '...' : text;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="email-blocks">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="border rounded-lg overflow-hidden divide-y divide-gray-100"
          >
            {visibleBlocks.map((block, index) => {
              // Fixed/auto blocks render as thin inline rows
              if (block.type === 'fixed' || block.type === 'auto') {
                const Icon = block.icon;
                const isAuto = block.type === 'auto';
                return (
                  <Draggable key={block.id} draggableId={block.id} index={index} isDragDisabled>
                    {(dragProvided) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        className={compact
                          ? 'flex items-center gap-1.5 px-2 py-1 bg-gray-50/50'
                          : 'flex items-center gap-2 px-3 py-1.5 bg-gray-50/50'
                        }
                      >
                        <Icon
                          size={compact ? 11 : 13}
                          className={isAuto ? 'text-emerald-400 flex-shrink-0' : 'text-gray-300 flex-shrink-0'}
                        />
                        <span className={compact ? 'text-[11px] text-gray-400 truncate' : 'text-xs text-gray-400 truncate'}>
                          {block.text || block.label}
                        </span>
                        {isAuto && (
                          <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                            AUTO
                          </span>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              }

              // Editable blocks render as interactive rows
              const isExpanded = expandedId === block.id;
              const Icon = block.icon;

              return (
                <Draggable key={block.id} draggableId={block.id} index={index}>
                  {(dragProvided, snapshot) => (
                    <div
                      ref={(el) => {
                        dragProvided.innerRef(el);
                        blockRefs.current[block.id] = el;
                      }}
                      {...dragProvided.draggableProps}
                      className={[
                        'min-w-0 transition-colors',
                        isExpanded ? 'bg-blue-50/60' : 'bg-white hover:bg-gray-50/50',
                        snapshot.isDragging ? 'shadow-md ring-1 ring-blue-300 rounded-lg' : '',
                      ].join(' ')}
                    >
                      {/* Header row */}
                      <div
                        className={compact
                          ? 'flex items-center gap-1.5 px-2 py-1.5 cursor-pointer'
                          : 'flex items-center gap-2 px-3 py-2 cursor-pointer'
                        }
                        onClick={() => handleBlockClick(block.id, block.type)}
                      >
                        <div
                          {...dragProvided.dragHandleProps}
                          className="flex-shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <GripVertical size={compact ? 12 : 14} />
                        </div>

                        {isExpanded
                          ? <ChevronDown size={compact ? 12 : 14} className="flex-shrink-0 text-blue-500" />
                          : <ChevronRight size={compact ? 12 : 14} className="flex-shrink-0 text-gray-400" />
                        }

                        <Icon size={compact ? 12 : 14} className="flex-shrink-0 text-blue-500" />

                        <span className={compact
                          ? 'text-xs font-medium text-gray-700 truncate min-w-0'
                          : 'text-sm font-medium text-gray-700 truncate min-w-0'
                        }>
                          {block.label}
                        </span>

                        <div className="flex-1 min-w-0" />

                        {!isExpanded && block.text && (
                          <span className={compact
                            ? 'text-[10px] text-gray-400 truncate max-w-[40%]'
                            : 'text-xs text-gray-400 truncate max-w-[50%]'
                          }>
                            {truncate(block.text, compact ? 30 : 50)}
                          </span>
                        )}
                      </div>

                      {/* Expanded textarea */}
                      {isExpanded && (
                        <div
                          className={compact ? 'px-2 pb-2' : 'px-3 pb-2.5'}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <textarea
                            value={block.text}
                            onChange={(e) => onBlockTextChange(block.id, e.target.value)}
                            placeholder={block.placeholder}
                            className={compact
                              ? 'w-full border border-gray-200 rounded bg-white resize-y focus:ring-1 focus:ring-blue-300 focus:border-blue-300 outline-none p-1.5 text-xs min-h-[48px]'
                              : 'w-full border border-gray-200 rounded bg-white resize-y focus:ring-1 focus:ring-blue-300 focus:border-blue-300 outline-none p-2 text-sm min-h-[56px]'
                            }
                            autoFocus
                          />
                          <p className="text-[10px] text-gray-400 text-right mt-0.5">{block.text.length} znakov</p>
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
