import { ReactNode } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DataLoaderProps {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onRetry?: () => void;
  children: ReactNode;
  loadingText?: string;
  errorText?: string;
  className?: string;
  minHeight?: string;
}

export function DataLoader({
  isLoading,
  isError,
  error,
  onRetry,
  children,
  loadingText = 'Nalagam...',
  errorText = 'Napaka pri nalaganju',
  className = '',
  minHeight = 'py-12',
}: DataLoaderProps) {
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center ${minHeight} ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-2 text-gray-600">{loadingText}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`flex flex-col items-center justify-center ${minHeight} ${className}`}>
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="mt-2 text-gray-900 font-medium">{errorText}</p>
        <p className="text-sm text-gray-500 mt-1">
          {(error as Error)?.message || 'Neznana napaka'}
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Poskusi znova
          </Button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

// Inline loading spinner for smaller areas
export function InlineLoader({ text = 'Nalagam...' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

// Skeleton loader for cards
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
    </div>
  );
}

// Skeleton loader for table rows
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded"></div>
        </td>
      ))}
    </tr>
  );
}

export default DataLoader;
