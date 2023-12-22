import { ChangeEventHandler, useEffect, useState } from 'react';
import { mat4 } from 'wgpu-matrix';

import { GPUDeviceInfo } from '@/util/types/wgpu';
import WGPUBufferGroup from '@/util/classes/WGPUBufferGroup';
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
  const [wireFrameActive, setWireFrameActive] = useState(false);
  const [animationActive, setAnimationActive] = useState(false);

  const handleAnimation: ChangeEventHandler<HTMLInputElement> = (e) => {
    if (!e.currentTarget.checked) {
      rotationVec3Control.initializeVec3();
    }
    setAnimationActive(e.currentTarget.checked);
  };

  const handleWireFrame: ChangeEventHandler<HTMLInputElement> = (e) => {
    setWireFrameActive(e.currentTarget.checked);
  };

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
  const cubeMesh = new CubeMesh();

  const createAnimation = (draw: () => void, isAnimation: boolean = false) => {
    function step() {
      if (isAnimation) {
        rotationVec3Control.handleAutomizeRotation();
      } else {
        rotationVec3Control.initializeVec3();
      }
      draw();
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  };

  useEffect(() => {
    if (!device) {
      return;
    }

    const verticesBuffer = new WGPUBufferGroup(device, [
      {
        label: 'vertex',
        size: cubeMesh.vertices.byteLength,
        mappedAtCreation: true,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        data: cubeMesh.vertices,
      },
      {
        label: 'index',
        size: cubeMesh.indices.byteLength,
        mappedAtCreation: true,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        indices: cubeMesh.indices,
      },
    ]);

    const pipeline = device.createRenderPipeline({
      primitive: {
        topology: wireFrameActive ? 'line-list' : 'triangle-list',
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
            arrayStride: 24,
            attributes: [
              {
                format: 'float32x3',
                offset: 0,
                shaderLocation: 0, // Position, see vertex shader
              },
              {
                format: 'float32x3',
                offset: 4 * 3,
                shaderLocation: 1,
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

    const draw = () => {
      const transform = new Transform(
        translationVec3Control.v3,
        rotationVec3Control.v3,
        scaleVec3Control.v3,
      );

      const modelViewProjection = new ModelViewProjection(
        canvas.width / canvas.height,
      );

      const modelViewProjectionMatrix = mat4.multiply(
        transform.modelMatrix,
        modelViewProjection.viewProjectionMatrix,
      );

      // constant buffer in direct X
      const uniformBuffer = device.createBuffer({
        size: (modelViewProjectionMatrix as Float32Array).byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const bindGroup = device.createBindGroup({
        label: 'Cube renderer bind group',
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: {
              buffer: uniformBuffer,
              offset: 0,
              size: (modelViewProjectionMatrix as Float32Array).byteLength,
            },
          },
        ],
      });

      const depthTexture = device.createTexture({
        size: [canvas.width, canvas.height, 1],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });

      device.queue.writeBuffer(
        uniformBuffer,
        0,
        modelViewProjectionMatrix as ArrayBuffer,
      );

      const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            loadOp: 'clear',
            storeOp: 'store',
            clearValue: convertColorIntoVec4(33, 53, 85),
          },
        ] as Iterable<GPURenderPassColorAttachment | null>,
        depthStencilAttachment: {
          view: depthTexture.createView(),
          depthClearValue: 1.0,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        },
      };

      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

      passEncoder.setPipeline(pipeline);
      passEncoder.setVertexBuffer(0, verticesBuffer.buffers[0]);

      passEncoder.setIndexBuffer(verticesBuffer.buffers[1], 'uint32');
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.drawIndexed(cubeMesh.numberOfVertices);
      passEncoder.end();
      device.queue.submit([commandEncoder.finish()]);
    };

    createAnimation(draw, animationActive);
  }, [
    animationActive,
    wireFrameActive,
    translationVec3Control.v3,
    rotationVec3Control.v3,
    scaleVec3Control.v3,
  ]);

  return {
    translationVec3Control,
    rotationVec3Control,
    scaleVec3Control,
    wireFrameActive,
    handleWireFrame,
    animationActive,
    handleAnimation,
  };
};

export default use3dBasicCube;
