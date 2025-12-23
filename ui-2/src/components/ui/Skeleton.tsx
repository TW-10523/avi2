/**
 * Production-grade Loading Skeletons
 * Provides visual feedback during loading states
 */
import { memo } from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  animate?: boolean;
}

/**
 * Base Skeleton component
 */
export const Skeleton = memo(function Skeleton({
  className = '',
  width,
  height,
  rounded = 'md',
  animate = true,
}: SkeletonProps) {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`bg-white/10 ${roundedClasses[rounded]} ${animate ? 'animate-pulse' : ''} ${className}`}
      style={style}
    />
  );
});

/**
 * Text skeleton - for text content
 */
export const SkeletonText = memo(function SkeletonText({
  lines = 1,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === lines - 1 && lines > 1 ? '75%' : '100%'}
          rounded="sm"
        />
      ))}
    </div>
  );
});

/**
 * Avatar skeleton
 */
export const SkeletonAvatar = memo(function SkeletonAvatar({
  size = 40,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Skeleton
      width={size}
      height={size}
      rounded="full"
      className={className}
    />
  );
});

/**
 * Card skeleton
 */
export const SkeletonCard = memo(function SkeletonCard({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div className={`p-4 rounded-xl bg-white/5 border border-white/10 ${className}`}>
      <div className="flex items-start gap-3">
        <SkeletonAvatar size={40} />
        <div className="flex-1">
          <Skeleton height={20} width="60%" className="mb-2" />
          <SkeletonText lines={2} />
        </div>
      </div>
    </div>
  );
});

/**
 * Chat message skeleton
 */
export const SkeletonMessage = memo(function SkeletonMessage({
  isUser = false,
  className = '',
}: {
  isUser?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} ${className}`}>
      <SkeletonAvatar size={32} />
      <div className={`max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}>
        <Skeleton
          height={80}
          width={280}
          rounded="xl"
          className={isUser ? 'bg-blue-500/20' : 'bg-white/10'}
        />
      </div>
    </div>
  );
});

/**
 * Chat list skeleton
 */
export const SkeletonChatList = memo(function SkeletonChatList({
  count = 3,
  className = '',
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-3 rounded-lg bg-white/5 flex items-center gap-3"
        >
          <Skeleton width={8} height={8} rounded="full" />
          <div className="flex-1">
            <Skeleton height={14} width="80%" className="mb-1" />
            <Skeleton height={10} width="50%" />
          </div>
        </div>
      ))}
    </div>
  );
});

/**
 * History item skeleton
 */
export const SkeletonHistoryItem = memo(function SkeletonHistoryItem({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div className={`p-4 rounded-xl bg-white/5 border border-white/10 ${className}`}>
      <Skeleton height={20} width="70%" className="mb-3" />
      <div className="flex items-center gap-4 mb-3">
        <Skeleton height={12} width={80} rounded="sm" />
        <Skeleton height={12} width={100} rounded="sm" />
      </div>
      <SkeletonText lines={2} />
    </div>
  );
});

/**
 * Live queries skeleton
 */
export const SkeletonLiveQueries = memo(function SkeletonLiveQueries({
  count = 5,
  className = '',
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-xl bg-white/5 border border-white/5"
        >
          <Skeleton height={18} width="90%" className="mb-2" />
          <div className="flex items-center gap-3">
            <Skeleton height={20} width={60} rounded="full" />
            <Skeleton height={12} width={50} />
          </div>
        </div>
      ))}
    </div>
  );
});

/**
 * Table skeleton
 */
export const SkeletonTable = memo(function SkeletonTable({
  rows = 5,
  columns = 4,
  className = '',
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-white/10 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex gap-4 p-4 bg-white/5 border-b border-white/10">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height={16} className="flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4 p-4 border-b border-white/5 last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              height={14}
              width={colIndex === 0 ? '70%' : '100%'}
              className="flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
});

export default Skeleton;
