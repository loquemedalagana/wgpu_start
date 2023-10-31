import { PageComponentType } from '@/util/UI/pageTypes';
import dynamic from 'next/dynamic';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';

const pages: PageComponentType = {
  rectangle: dynamic(() => import('@/samples/2d/rectangle/2DRectangle'), {
    loading: () => (
      <section className="wrapper loading-wrapper">
        <LoadingSpinner />
      </section>
    ),
  }),
  circle: dynamic(() => import('@/samples/2d/circle/2DCircle'), {
    loading: () => (
      <section className="wrapper loading-wrapper">
        <LoadingSpinner />
      </section>
    ),
  }),
};

export default pages;