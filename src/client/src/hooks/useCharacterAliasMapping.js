import React from 'react';

/**
 * 角色别名映射 Hook
 * 实现用户友好的别名显示与API使用的真实ID之间的双向转换
 *
 * 功能:
 * - 输入框显示: @阳光小猫 (易读的别名)
 * - API使用: @5562be00d.sunbeamkit (真实用户名)
 *
 * @param {Array} connectedCharacters - 连接的角色列表
 * @returns {Object} { usernameToAlias, realToDisplay, displayToReal }
 */
export function useCharacterAliasMapping(connectedCharacters) {
  // ⭐ 创建用户名到别名的映射表
  const usernameToAlias = React.useMemo(() => {
    const map = {};
    if (Array.isArray(connectedCharacters)) {
      connectedCharacters.forEach(char => {
        map[char.username] = char.alias || char.username;
      });
    }
    return map;
  }, [connectedCharacters]);

  // ⭐ 将真实提示词转换为显示提示词（用户看：别名）
  // API格式: "@5562be00d.sunbeamkit 在玩耍"
  // 显示格式: "@阳光小猫 在玩耍"
  const realToDisplay = React.useCallback((text) => {
    if (!text) return '';
    let result = text;
    Object.entries(usernameToAlias).forEach(([username, alias]) => {
      // ⚠️ 关键：使用正向肯定预查 (?=\s|$|@) 而不是 \b，支持中文
      const regex = new RegExp(
        `@${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|@)`,
        'g'
      );
      result = result.replace(regex, `@${alias}`);
    });
    return result;
  }, [usernameToAlias]);

  // ⭐ 将显示提示词转换为真实提示词（API用：真实ID）
  // 显示格式: "@阳光小猫 和@测试小猫 在海边玩"
  // API格式: "@5562be00d.sunbeamkit 和@ebfb9a758.sunnykitte 在海边玩"
  const displayToReal = React.useCallback((text) => {
    if (!text) return '';
    let result = text;
    // ⚠️ 按最长匹配优先排序，避免部分匹配（如"测试小猫"匹配"小猫"）
    const sortedAliases = Object.entries(usernameToAlias)
      .sort((a, b) => b[1].length - a[1].length); // 长别名优先

    sortedAliases.forEach(([username, alias]) => {
      // ⚠️ 关键：使用 (?=\s|$|@) 而不是 \b，支持中文
      const regex = new RegExp(
        `@${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|@)`,
        'g'
      );
      result = result.replace(regex, `@${username}`);
    });
    return result;
  }, [usernameToAlias]);

  return {
    usernameToAlias,
    realToDisplay,
    displayToReal,
  };
}
