import React from 'react';
import { cn } from '@/lib/utils';

const LoadingSkeleton = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200 dark:bg-gray-700', className)}
    />
  );
};

export default LoadingSkeleton;
