'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ReactNode } from 'react';

interface Props {
  id: number | string;
  children: ReactNode;
  disabled?: boolean; // ✨ 新增：允许传入 disabled 属性
}

export function SortableItem({ id, children, disabled }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ 
    id, 
    disabled // ✨ 关键：将 disabled 传递给 dnd-kit 库
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // 如果被禁用，不仅不能拖拽，我们还可以优化一下样式（可选）
    opacity: disabled ? 1 : undefined, 
    touchAction: 'none' // 防止移动端滚动冲突
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}