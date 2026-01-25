/**
 * @file DriverPickupStats.tsx
 * @description Statistike za šoferjeve prevzeme
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DriverPickupStatsProps {
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
}

export function DriverPickupStats({
  pendingCount,
  inProgressCount,
  completedCount,
}: DriverPickupStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-600">
            Čakajo na prevzem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-600">V teku</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-blue-600">{inProgressCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-600">
            Zaključeni (skupaj)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-600">{completedCount}</p>
        </CardContent>
      </Card>
    </div>
  );
}
