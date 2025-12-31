import React, { useState } from 'react';

/**
 * HistoryCard - 历史记录卡片组件
 * 显示单条历史记录的缩略图、提示词、状态和时间
 * 使用右键菜单进行操作（收藏、删除、加载）
 */
function HistoryCard({ record, onClick, onFavoriteToggle, onDelete }) {
  const { prompt, status, createdAt, thumbnail, favorite, type, platform, result, model, options, taskId } = record;

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState(null);

  // 状态颜色映射
  const statusColors = {
    queued: '#f59e0b',
    processing: '#3b82f6',
    completed: '#10b981',
    failed: '#ef4444',
  };

  // 状态标签映射
  const statusLabels = {
    queued: '排队中',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
  };

  // 类型标签映射
  const typeLabels = {
    'text-to-video': '文生视频',
    'image-to-video': '图生视频',
    'storyboard': '故事板',
  };

  // 类型颜色映射
  const typeColors = {
    'text-to-video': '#6366f1',
    'image-to-video': '#8b5cf6',
    'storyboard': '#ec4899',
  };

  // 计算相对时间
  const timeAgo = getTimeAgo(createdAt);

  // 处理右键点击
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
    });
  };

  // 关闭右键菜单
  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // 收藏切换
  const handleFavoriteToggle = () => {
    onFavoriteToggle(taskId, !favorite);
    closeContextMenu();
  };

  // 删除记录
  const handleDelete = () => {
    onDelete(record);
    closeContextMenu();
  };

  // 点击卡片（左键）
  const handleCardClick = () => {
    if (onClick) {
      onClick(record);
    }
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        onContextMenu={handleContextMenu}
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          backgroundColor: '#ffffff',
          position: 'relative',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {/* 缩略图区域 */}
        <div style={{
          width: '100%',
          height: '120px',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {thumbnail ? (
            <img
              src={thumbnail}
              alt="视频缩略图"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : result?.output ? (
            <video
              src={result.output}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              muted
              onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
              onMouseLeave={(e) => {
                e.currentTarget.pause();
                e.currentTarget.currentTime = 0;
              }}
            />
          ) : (
            <div style={{
              fontSize: '32px',
              color: '#9ca3af',
            }}>
              🖼️
            </div>
          )}

          {/* 类型标签 */}
          {type && (
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 'bold',
              backgroundColor: typeColors[type] || '#6b7280',
              color: 'white',
            }}>
              {typeLabels[type] || type}
            </div>
          )}

          {/* 状态标签 */}
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            backgroundColor: statusColors[status] || '#6b7280',
            color: 'white',
          }}>
            {statusLabels[status] || status}
          </div>

          {/* 收藏标识 */}
          {favorite && (
            <div style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              fontSize: '16px',
            }}>
              ⭐
            </div>
          )}
        </div>

        {/* 提示词预览 */}
        <div style={{
          fontSize: '12px',
          color: '#374151',
          marginBottom: '8px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          lineHeight: '1.4',
        }}>
          {prompt || '无提示词'}
        </div>

        {/* 工作流参数显示 */}
        {(model || options) && (
          <div style={{
            padding: '6px 8px',
            backgroundColor: '#f8fafc',
            borderRadius: '4px',
            marginBottom: '8px',
            fontSize: '10px',
            color: '#64748b',
          }}>
            {model && (
              <div style={{ marginBottom: '2px' }}>
                <strong>模型:</strong> {model}
              </div>
            )}
            {options?.duration && (
              <div style={{ marginBottom: '2px' }}>
                <strong>时长:</strong> {options.duration}秒
              </div>
            )}
            {options?.aspect_ratio && (
              <div style={{ marginBottom: '2px' }}>
                <strong>比例:</strong> {options.aspect_ratio}
              </div>
            )}
            {result?.output && (
              <div style={{
                marginTop: '4px',
                paddingTop: '4px',
                borderTop: '1px dashed #cbd5e1',
                wordBreak: 'break-all',
              }}>
                <strong>视频:</strong>
                <a
                  href={result.output}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {result.output.length > 30 ? result.output.substring(0, 30) + '...' : result.output}
                </a>
              </div>
            )}
          </div>
        )}

        {/* 时间戳 */}
        <div style={{
          fontSize: '10px',
          color: '#9ca3af',
        }}>
          {timeAgo}
        </div>
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          onClick={closeContextMenu}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: contextMenu.x,
              top: contextMenu.y,
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '4px 0',
              minWidth: '160px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          >
            <button
              onClick={handleFavoriteToggle}
              className="nodrag"
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: 'transparent',
                color: 'white',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span>{favorite ? '☆' : '⭐'}</span>
              <span>{favorite ? '取消收藏' : '收藏'}</span>
            </button>
            <button
              onClick={handleDelete}
              className="nodrag"
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: 'transparent',
                color: '#ef4444',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span>🗑️</span>
              <span>删除</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * 计算相对时间
 * @param {string} timestamp - ISO 时间戳
 * @returns {string} 相对时间字符串
 */
function getTimeAgo(timestamp) {
  if (!timestamp) return '未知时间';

  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`;
  return `${Math.floor(diffDays / 30)} 月前`;
}

export default HistoryCard;
