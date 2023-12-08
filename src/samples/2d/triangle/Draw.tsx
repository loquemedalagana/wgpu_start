import { useGPUDevice } from '@/wgpu/useWebGPUDevice';
import { useWebGPUCanvas } from '@/wgpu/useWGPUCanvas';
import { useTextureFormat } from '@/wgpu/useTextureFormat';
import { useWebGPUContext } from '@/wgpu/useWGPUContextContext';

import use2dTriangle from '@/samples/2d/triangle/use2dTriangle';

const Main: React.FC = () => {
  const device = useGPUDevice();
  const canvas = useWebGPUCanvas();
  const context = useWebGPUContext();
  const textureFormat = useTextureFormat();

  use2dTriangle({
    device,
    context,
    textureFormat,
  });

  return (
    <h2>
      hello triangle {canvas.clientWidth} X {canvas.clientHeight}
    </h2>
  );
};

export default Main;
