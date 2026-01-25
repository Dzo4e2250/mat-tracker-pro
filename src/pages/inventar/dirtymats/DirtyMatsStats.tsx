/**
 * @file DirtyMatsStats.tsx
 * @description Statistike za umazane predpražnike
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DirtyMatsStatsProps {
  dirty: number;
  waitingDriver: number;
  total: number;
}

export function DirtyMatsStats({ dirty, waitingDriver, total }: DirtyMatsStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-600">Umazani</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-red-600">{dirty}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-600">Čaka na prevzem</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-purple-600">{waitingDriver}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-600">Skupaj za obdelavo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{total}</p>
        </CardContent>
      </Card>
    </div>
  );
}
