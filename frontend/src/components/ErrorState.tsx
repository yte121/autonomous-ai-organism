import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

const ErrorState = ({ title, message, onRetry }: ErrorStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20">
      <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-xl font-semibold text-red-800 dark:text-red-200">{title}</h3>
      <p className="mt-2 text-sm text-red-600 dark:text-red-300">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="destructive" className="mt-4">
          Retry
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
