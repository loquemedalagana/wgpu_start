import { useEffect } from 'react';
import { mat4 } from 'wgpu-matrix';

import { GPUDeviceInfo } from '@/util/types/wgpu';
import WGPUBuffer from '@/util/classes/WGPUBuffer';
import { convertColorIntoVec4 } from '@/util/math/color';

import CubeMesh from '@/mashes/3d/Cube';

// @ts-ignore
import vertexShader from '@/shaders/3d/vertices/cube.vert.wgsl';

// @ts-ignore
import fragmentShader from '@/shaders/3d/fragments/vertexPositionColor.frag.wgsl';
import ModelViewProjection from '@/util/classes/ModelViewProjection';
import useVec3Control from '@/util/hooks/useVec3Control';
import Transform from '@/util/classes/Transform';

const use3dBasicCube = (canvasInfo: GPUDeviceInfo) => {
  const { device, context, textureFormat, canvas } = canvasInfo;
  const translationVec3Control = useVec3Control(
    [0, 0, 0],
    [-2, -2, -2],
    [2, 2, 2],
  );
  const rotationVec3Control = useVec3Control(
    [0, 0, 0],
    [-Math.PI, -Math.PI, -Math.PI],
    [Math.PI, Math.PI, Math.PI],
  );
  const scaleVec3Control = useVec3Control(
    [1.0, 1.0, 1.0],
    [0.1, 0.1, 0.1],
    [2.0, 2.0, 2.0],
  );

  useEffect(() => {
    if (!device) {
      return;
    }

    const cubeMesh = new CubeMesh();
    const verticesBuffer = new WGPUBuffer(device, [
      {
        label: 'vertex',
        size: cubeMesh.positions.byteLength,
        mappedAtCreation: true,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        data: cubeMesh.positions,
      },
      {
        label: 'color',
        size: cubeMesh.colors.byteLength,
        mappedAtCreation: true,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        data: cubeMesh.colors,
      },
      {
        label: 'index',
        size: cubeMesh.indices.byteLength,
        mappedAtCreation: true,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        indices: cubeMesh.indices,
      },
    ]);

    console.log(verticesBuffer.buffers);

    const pipeline = device.createRenderPipeline({
      primitive: {
        topology: 'triangle-list',
        cullMode: 'back',
      },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
      layout: 'auto',
      vertex: {
        module: device.createShaderModule({
          code: vertexShader,
        }),
        entryPoint: 'main',
        buffers: [
          {
            arrayStride: 12,
            attributes: [
              {
                format: 'float32x3',
                offset: 0,
                shaderLocation: 0, // Position, see vertex shader
              },
            ] as Iterable<GPUVertexAttribute>,
          },
          {
            arrayStride: 12,
            attributes: [
              {
                format: 'float32x3',
                offset: 0,
                shaderLocation: 1, // Position, see vertex shader
              },
            ] as Iterable<GPUVertexAttribute>,
          },
        ],
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

    // create uniform data
    const modelViewProjection = new ModelViewProjection(
      canvas.width / canvas.height,
    );
    const transform = new Transform(
      translationVec3Control.v3,
      rotationVec3Control.v3,
      scaleVec3Control.v3,
    );
    console.log(transform);
    console.log(modelViewProjection);

    const uniformBuffer = device.createBuffer({
      size: 4 * 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroup = device.createBindGroup({
      label: 'Cell renderer bind group',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformBuffer,
            offset: 0,
            size: 64,
          },
        },
      ],
    });

    const textureView = context.getCurrentTexture().createView();
    const depthTexture = device.createTexture({
      size: [canvas.width, canvas.height, 1],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const modelViewProjectionMatrix = mat4.multiply(
      transform.modelMatrix,
      modelViewProjection.viewProjectionMatrix,
    );

    console.log(modelViewProjectionMatrix);

    device.queue.writeBuffer(
      uniformBuffer,
      0,
      modelViewProjectionMatrix as ArrayBuffer,
    );

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: convertColorIntoVec4(187, 156, 192),
        },
      ] as Iterable<GPURenderPassColorAttachment | null>,
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });

    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, verticesBuffer.buffers[0]);
    passEncoder.setVertexBuffer(1, verticesBuffer.buffers[1]);

    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.draw(cubeMesh.numberOfVertices);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
  }, [translationVec3Control.v3, rotationVec3Control.v3, scaleVec3Control.v3]);

  return {
    translationVec3Control,
    rotationVec3Control,
    scaleVec3Control,
  };
};

export default use3dBasicCube;
