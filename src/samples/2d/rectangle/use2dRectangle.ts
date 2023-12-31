import { useEffect } from 'react';
import { GPUDeviceInfo } from '@/util/types/wgpu';

// @ts-ignore
import vertexShader from '@/samples/2d/rectangle/vertex.wgsl';
// @ts-ignore
import fragmentShader from '@/shaders/2d/fragments/simpleColor.frag.wgsl';

import { rectVertexArray } from '@/mashes/2d/2dRectangle';
import { convertColorIntoVec4 } from '@/util/math/color';
import WGPUBufferGroup from '@/util/classes/WGPUBufferGroup';

const use2dRectangle = (canvasInfo: GPUDeviceInfo) => {
  const { device, context, textureFormat } = canvasInfo;

  const vertexBufferLayout: GPUVertexBufferLayout = {
    arrayStride: 8,
    attributes: [
      {
        format: 'float32x2',
        offset: 0,
        shaderLocation: 0, // Position, see vertex shader
      },
    ] as Iterable<GPUVertexAttribute>,
  };

  useEffect(() => {
    if (!device) {
      return;
    }
    const pipeline = device.createRenderPipeline({
      primitive: {
        topology: 'triangle-list',
      },
      layout: 'auto',
      vertex: {
        module: device.createShaderModule({
          code: vertexShader,
        }),
        entryPoint: 'main',
        buffers: vertexBufferLayout ? [vertexBufferLayout] : undefined,
      },
      fragment: {
        module: device.createShaderModule({
          code: fragmentShader,
        }),
        entryPoint: 'main',
        targets: [
          {
            format: textureFormat,
          },
        ],
      },
    });

    const vertexBuffer = new WGPUBufferGroup(device, [
      {
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        label: 'Rectangle',
        size: rectVertexArray.byteLength,
        mappedAtCreation: true,
        data: rectVertexArray,
      },
    ]);

    device.queue.writeBuffer(vertexBuffer.buffers[0], 0, rectVertexArray);

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: convertColorIntoVec4(208, 162, 247),
        },
      ] as Iterable<GPURenderPassColorAttachment | null>,
    });

    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, vertexBuffer.buffers[0]);

    passEncoder.draw(rectVertexArray.length / 2);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
  }, []);
};

export default use2dRectangle;
