import { useEffect, useState } from 'react';

/**
 * 连接数据同步 Hook
 * 自动从 node.data 同步角色和图片连接数据到组件状态
 *
 * @param {Object} data - React Flow 节点的 data 对象
 * @returns {Object} { connectedCharacters, setConnectedCharacters, connectedImages, setConnectedImages }
 */
export function useConnectedData(data) {
  // ⭐ 角色连接状态
  const [connectedCharacters, setConnectedCharacters] = useState(
    data.connectedCharacters || []
  );

  // ⭐ 图片连接状态
  const [connectedImages, setConnectedImages] = useState(
    data.connectedImages || []
  );

  // ⭐ 同步 connectedCharacters 从 data 到 state
  useEffect(() => {
    if (data.connectedCharacters !== undefined) {
      setConnectedCharacters(data.connectedCharacters);
    } else {
      setConnectedCharacters([]);
    }
  }, [data.connectedCharacters]);

  // ⭐ 同步 connectedImages 从 data 到 state
  // 关键修复：当 data.connectedImages 为 undefined 时（连接断开），清除状态
  useEffect(() => {
    if (data.connectedImages !== undefined) {
      setConnectedImages(data.connectedImages);
    } else {
      setConnectedImages([]);
    }
  }, [data.connectedImages]);

  return {
    connectedCharacters,
    setConnectedCharacters,
    connectedImages,
    setConnectedImages,
  };
}
