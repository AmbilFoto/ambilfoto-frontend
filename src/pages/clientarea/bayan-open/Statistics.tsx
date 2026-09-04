import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useBayanOpenUserDaily,
  useBayanOpenFaceDaily,
  useBayanOpenPhotoDaily,
} from '@/hooks/bayan-open/useBayanOpenStats';
import { UserScanChart } from './components/UserScanChart';
import { FaceGrowthChart } from './components/FaceGrowthChart';
import { PhotoGrowthChart } from './components/PhotoGrowthChart';
import { PageHeader } from './components/PageHeader';

const BayanOpenStatistics = () => {
  const [days, setDays] = useState(30);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const userDaily = useBayanOpenUserDaily(days);
  const faceDaily = useBayanOpenFaceDaily(days);
  const photoDaily = useBayanOpenPhotoDaily(days);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.allSettled([userDaily.refetch(), faceDaily.refetch(), photoDaily.refetch()]);
    setIsRefreshing(false);
  };

  return (
    <div>
      <PageHeader
        title="Grafik"
        subtitle="Trend aktivitas harian — scan, face database, dan upload foto."
        actions={
          <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <div className="space-y-4">
        <UserScanChart
          data={userDaily.data}
          isLoading={userDaily.isLoading}
          error={userDaily.error}
          days={days}
          onDaysChange={setDays}
          onRetry={userDaily.refetch}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <FaceGrowthChart
            data={faceDaily.data}
            isLoading={faceDaily.isLoading}
            error={faceDaily.error}
            onRetry={faceDaily.refetch}
          />
          <PhotoGrowthChart
            data={photoDaily.data}
            isLoading={photoDaily.isLoading}
            error={photoDaily.error}
            onRetry={photoDaily.refetch}
          />
        </div>
      </div>
    </div>
  );
};

export default BayanOpenStatistics;
