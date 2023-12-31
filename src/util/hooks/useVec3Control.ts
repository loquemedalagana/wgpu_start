import { ChangeEventHandler, useState } from 'react';
import { Vec3 } from 'wgpu-matrix';
import { V3 } from '@/util/types/math';

interface IVec3Control {
  v3: Vec3;
  minV3: Vec3;
  maxV3: Vec3;
  step: number;
  handleChangeInput: ChangeEventHandler<HTMLInputElement>;
}

const useVec3Control = (
  initialValue: Vec3,
  minV3: Vec3 = [-1, -1, -1],
  maxV3: Vec3 = [1, 1, 1],
  step: number = 0.001,
): IVec3Control => {
  const [v3, setV3] = useState(initialValue);
  const handleChangeInput: ChangeEventHandler<HTMLInputElement> = (e) => {
    const newValue = parseFloat(e.target.value);
    const elementName = e.target.name as V3;
    const [x, y, z] = v3 as number[];

    switch (elementName) {
      case 'x':
        setV3([newValue, y, z]);
        break;
      case 'y':
        setV3([x, newValue, z]);
        break;
      case 'z':
        setV3([x, y, newValue]);
        break;
      default:
        throw new Error('Not supported type');
    }
  };

  return {
    v3,
    handleChangeInput,
    minV3,
    maxV3,
    step,
  };
};

export default useVec3Control;
