import { Gallery } from './components/Gallery';
import { PageHeader } from './components/PageHeader';

const BayanOpenGalleryPage = () => {
  return (
    <div>
      <PageHeader title="Galeri" subtitle="Semua foto yang sudah di-upload, dengan filter tanggal." />
      <Gallery />
    </div>
  );
};

export default BayanOpenGalleryPage;
