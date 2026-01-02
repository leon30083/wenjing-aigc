import { useCallback } from 'react';

/**
 * 角色引用插入 Hook
 * 在光标位置插入角色引用（支持双显示：别名 ↔ 真实ID）
 *
 * @param {Function} realToDisplay - 真实ID → 别名转换函数
 * @param {Function} displayToReal - 别名 → 真实ID转换函数
 * @param {Function} updateState - 更新状态的函数
 * @returns {Function} insertCharacterAtCursor
 */
export function useCharacterInsertion(realToDisplay, displayToReal, updateState) {
  /**
   * 在光标位置插入角色引用
   *
   * @param {Object} params - 参数对象
   * @param {React.RefObject} params.inputRef - 输入框的 ref
   * @param {string} params.username - 角色用户名（真实ID）
   * @param {string} params.alias - 角色别名
   * @param {string} params.currentState - 当前状态值
   * @param {string} params.stateKey - 状态键名（用于 updateState）
   */
  const insertCharacterAtCursor = useCallback(
    ({ inputRef, username, alias, currentState, stateKey }) => {
      const inputElement = inputRef.current;
      if (!inputElement) {
        console.warn('[useCharacterInsertion] inputRef is null');
        return;
      }

      // ⭐ 获取光标位置（在显示文本中的位置）
      const start = inputElement.selectionStart;
      const end = inputElement.selectionEnd;

      // ⭐ 转换当前状态为显示文本
      const displayText = realToDisplay(currentState);
      const refText = `@${alias} `; // 插入别名到显示位置

      // ⭐ 在光标位置插入到显示文本
      const newDisplayText = displayText.substring(0, start) + refText + displayText.substring(end);

      // ⭐ 转换回真实ID并存储
      const newRealText = displayToReal(newDisplayText);

      // ⭐ 更新状态
      updateState(stateKey, newRealText);

      // ⭐ 移动光标到插入内容之后
      setTimeout(() => {
        inputElement.setSelectionRange(start + refText.length, start + refText.length);
        inputElement.focus();
      }, 0);
    },
    [realToDisplay, displayToReal, updateState]
  );

  return insertCharacterAtCursor;
}

/**
 * 创建角色插入处理函数（用于故事板场景输入框）
 *
 * @param {Function} realToDisplay - 真实ID → 别名转换函数
 * @param {Function} displayToReal - 别名 → 真实ID转换函数
 * @param {Function} updateShot - 更新镜头的函数
 * @returns {Function} insertCharacterToScene
 */
export function useSceneCharacterInsertion(realToDisplay, displayToReal, updateShot) {
  /**
   * 在焦点场景中插入角色引用
   *
   * @param {Object} params - 参数对象
   * @param {React.RefObject} params.sceneRefs - 场景输入框的 ref 数组
   * @param {number} params.targetIndex - 目标镜头索引
   * @param {string} params.username - 角色用户名
   * @param {string} params.alias - 角色别名
   * @param {Array} params.shots - 镜头数组
   */
  const insertCharacterToScene = useCallback(
    ({ sceneRefs, targetIndex, username, alias, shots }) => {
      const sceneInput = sceneRefs.current[targetIndex];
      if (!sceneInput) {
        console.warn('[useSceneCharacterInsertion] sceneInput is null at index:', targetIndex);
        return;
      }

      // ⭐ 获取当前场景的真实文本
      const realText = shots[targetIndex].scene;

      // ⭐ 转换为显示文本
      const displayText = realToDisplay(realText);

      // ⭐ 获取光标位置
      const start = sceneInput.selectionStart;
      const end = sceneInput.selectionEnd;
      const refText = `@${alias} `;

      // ⭐ 在光标位置插入到显示文本
      const newDisplayText = displayText.substring(0, start) + refText + displayText.substring(end);

      // ⭐ 转换回真实ID
      const newRealText = displayToReal(newDisplayText);

      // ⭐ 更新镜头场景
      updateShot(shots[targetIndex].id, 'scene', newRealText);

      // ⭐ 移动光标
      setTimeout(() => {
        sceneInput.setSelectionRange(start + refText.length, start + refText.length);
        sceneInput.focus();
      }, 0);
    },
    [realToDisplay, displayToReal, updateShot]
  );

  return insertCharacterToScene;
}
