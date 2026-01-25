/**
 * @file HistoryStats.tsx
 * @description Statistike za zgodovino prevzemov
 */

import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Package, TrendingUp } from 'lucide-react';

interface HistoryStatsData {
  totalPickups: number;
  totalItems: number;
  avgDurationDays: number;
}

interface HistoryStatsProps {
  stats: HistoryStatsData | null;
}

export function HistoryStats({ stats }: HistoryStatsProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Skupaj prevzemov</p>
              <p className="text-2xl font-bold">{stats.totalPickups}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pobranih predpražnikov</p>
              <p className="text-2xl font-bold">{stats.totalItems}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Povp. čas prevzema</p>
              <p className="text-2xl font-bold">{stats.avgDurationDays} dni</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
