/**
 * @file StatisticsView.tsx
 * @description Prikaz statistike prodajalca
 */

import type { CycleWithRelations } from '@/hooks/useCycles';

interface StatisticsViewProps {
  cycleHistory: CycleWithRelations[] | undefined;
}

function getStatistics(cycleHistory: CycleWithRelations[] | undefined) {
  const myCycles = cycleHistory || [];

  const totalTests = myCycles.filter(c => c.test_start_date).length;
  const successful = myCycles.filter(c => c.contract_signed).length;
  const failed = myCycles.filter(c => c.test_end_date && !c.contract_signed && c.status === 'dirty').length;
  const inProgress = myCycles.filter(c => c.status === 'on_test').length;

  const successRate = totalTests > 0 ? ((successful / totalTests) * 100).toFixed(1) : '0';

  return { totalTests, successful, failed, inProgress, successRate };
}

export default function StatisticsView({ cycleHistory }: StatisticsViewProps) {
  const stats = getStatistics(cycleHistory);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">📊 Statistika</h2>
      <div className="bg-white p-4 rounded shadow">
        <div className="text-4xl font-bold text-green-600 text-center mb-4">
          {stats.successRate}%
        </div>
        <div className="text-center text-gray-600 mb-4">Uspešnost</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 p-3 rounded text-center">
            <div className="text-xl font-bold">{stats.totalTests}</div>
            <div className="text-sm text-gray-600">Skupaj testov</div>
          </div>
          <div className="bg-green-50 p-3 rounded text-center">
            <div className="text-xl font-bold text-green-600">{stats.successful}</div>
            <div className="text-sm text-gray-600">Uspešnih</div>
          </div>
          <div className="bg-red-50 p-3 rounded text-center">
            <div className="text-xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-gray-600">Neuspešnih</div>
          </div>
          <div className="bg-blue-50 p-3 rounded text-center">
            <div className="text-xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-600">V teku</div>
          </div>
        </div>
      </div>
    </div>
  );
}
