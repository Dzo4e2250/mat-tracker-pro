/**
 * @file PrevzemiStats.tsx
 * @description Stats kartice za Prevzemi stran
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PrevzemiStatsProps {
  dirty: number;
  waitingDriver: number;
  activeCount: number;
  completedCount: number;
}

export function PrevzemiStats({
  dirty,
  waitingDriver,
  activeCount,
  completedCount,
}: PrevzemiStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card className={dirty > 0 ? 'border-red-300 bg-red-50' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-600">Umazani</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-3xl font-bold ${dirty > 0 ? 'text-red-600' : ''}`}>
            {dirty}
          </p>
        </CardContent>
      </Card>

      <Card className={waitingDriver > 0 ? 'border-purple-300 bg-purple-50' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-600">Čaka šoferja</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-3xl font-bold ${waitingDriver > 0 ? 'text-purple-600' : ''}`}>
            {waitingDriver}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-600">Aktivni prevzemi</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-blue-600">{activeCount}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-600">Zaključeni</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-600">{completedCount}</p>
        </CardContent>
      </Card>
    </div>
  );
}
