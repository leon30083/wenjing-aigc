import React, { useState, useEffect, useCallback } from 'react';
import HistoryCard from './HistoryCard';
import HistorySearchBar from './HistorySearchBar';
import HistoryToolbar from './HistoryToolbar';

const API_BASE = 'http://localhost:9000';

/**
 * HistoryPanel - 历史记录侧边面板
 * 显示所有任务历史记录，支持搜索、筛选和点击加载工作流
 */
function HistoryPanel({ onLoadWorkflow }) {
  // 数据状态
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);

  // 筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [favoriteFilter, setFavoriteFilter] = useState('all');

  // UI 状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 对话框状态
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [recordToLoad, setRecordToLoad] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);

  // 统计数据
  const [counts, setCounts] = useState({
    all: 0,
    completed: 0,
    processing: 0,
    failed: 0,
  });

  // 获取历史记录
  const fetchHistoryRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/history/list`);
      const result = await response.json();

      if (result.success) {
        // 检测任务类型并添加到记录
        const recordsWithType = (result.data || []).map(record => ({
          ...record,
          type: detectTaskType(record),
          promptLower: (record.prompt || '').toLowerCase(),
        }));

        setRecords(recordsWithType);
        updateCounts(recordsWithType);
      } else {
        setError(result.error || '获取历史记录失败');
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setError('网络错误：无法获取历史记录');
    } finally {
      setLoading(false);
    }
  }, []);

  // 更新统计数据
  const updateCounts = (data) => {
    const newCounts = {
      all: data.length,
      completed: data.filter(r => r.status === 'completed').length,
      processing: data.filter(r => r.status === 'processing' || r.status === 'queued').length,
      failed: data.filter(r => r.status === 'failed').length,
    };
    setCounts(newCounts);
  };

  // 检测任务类型
  const detectTaskType = (record) => {
    const { options = {} } = record;

    // 检查是否是故事板
    if (options.shots && Array.isArray(options.shots) && options.shots.length > 0) {
      return 'storyboard';
    }

    // 检查是否有参考图片
    if (options.images && Array.isArray(options.images) && options.images.length > 0) {
      return 'image-to-video';
    }

    // 默认为文生视频
    return 'text-to-video';
  };

  // 应用筛选和搜索
  useEffect(() => {
    let filtered = records;

    // 状态筛选
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // 平台筛选
    if (platformFilter !== 'all') {
      filtered = filtered.filter(r => r.platform === platformFilter);
    }

    // 类型筛选
    if (typeFilter !== 'all') {
      filtered = filtered.filter(r => r.type === typeFilter);
    }

    // 收藏筛选
    if (favoriteFilter === 'favorites') {
      filtered = filtered.filter(r => r.favorite === true);
    }

    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.promptLower?.includes(query) ||
        r.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // 按时间倒序排序（最新的在前）
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    setFilteredRecords(filtered);
  }, [records, searchQuery, statusFilter, platformFilter, typeFilter, favoriteFilter]);

  // 组件挂载时获取数据
  useEffect(() => {
    fetchHistoryRecords();
  }, [fetchHistoryRecords]);

  // 处理卡片点击 - 显示确认对话框
  const handleCardClick = (record) => {
    setRecordToLoad(record);
    setShowLoadDialog(true);
  };

  // 确认加载工作流
  const confirmLoadWorkflow = () => {
    if (onLoadWorkflow && recordToLoad) {
      onLoadWorkflow(recordToLoad);
    }
    setShowLoadDialog(false);
    setRecordToLoad(null);
  };

  // 处理删除 - 显示确认对话框
  const handleDelete = (record) => {
    setRecordToDelete(record);
    setShowDeleteDialog(true);
  };

  // 确认删除
  const confirmDelete = async () => {
    if (!recordToDelete) return;

    try {
      const response = await fetch(`${API_BASE}/api/history/${recordToDelete.taskId}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        await fetchHistoryRecords();
        setShowDeleteDialog(false);
        setRecordToDelete(null);
      } else {
        alert(`❌ 删除失败: ${result.error || '未知错误'}`);
      }
    } catch (error) {
      alert(`❌ 网络错误: ${error.message}`);
    }
  };

  // 切换收藏状态
  const handleFavoriteToggle = async (taskId, favorite) => {
    try {
      const response = await fetch(`${API_BASE}/api/history/${taskId}/favorite`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite })
      });
      const result = await response.json();

      if (result.success) {
        // 更新本地状态
        setRecords(prev => prev.map(r =>
          r.taskId === taskId ? { ...r, favorite } : r
        ));
      } else {
        alert(`❌ 收藏失败: ${result.error || '未知错误'}`);
      }
    } catch (error) {
      alert(`❌ 网络错误: ${error.message}`);
    }
  };

  // 处理清空全部 - 显示确认对话框
  const handleClearAll = () => {
    setShowClearAllDialog(true);
  };

  // 确认清空全部
  const confirmClearAll = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/history/all`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        await fetchHistoryRecords();
        setShowClearAllDialog(false);
        alert('✅ 已清空所有历史记录');
      } else {
        alert(`❌ 清空失败: ${result.error || '未知错误'}`);
      }
    } catch (error) {
      alert(`❌ 网络错误: ${error.message}`);
    }
  };

  // 处理右键菜单
  const handleContextMenu = (e, record) => {
    e.preventDefault();
    // TODO: 实现右键菜单（Phase 2）
    console.log('Context menu for:', record);
  };

  // 清除搜索
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // 刷新历史记录
  const handleRefresh = () => {
    fetchHistoryRecords();
  };

  return (
    <div style={{
      height: '100%',
      borderLeft: '1px solid #e5e7eb',
      backgroundColor: '#f9fafb',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 头部标题 */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#1f2937',
        }}>
          📜 历史记录
        </h3>
        <button
          onClick={handleRefresh}
          className="nodrag"
          disabled={loading}
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            backgroundColor: loading ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
          title="刷新历史记录"
        >
          🔄 {loading ? '加载中...' : '刷新'}
        </button>
      </div>

      {/* 搜索栏 */}
      <HistorySearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onClear={handleClearSearch}
      />

      {/* 工具栏 */}
      <HistoryToolbar
        statusFilter={statusFilter}
        platformFilter={platformFilter}
        typeFilter={typeFilter}
        favoriteFilter={favoriteFilter}
        onStatusChange={setStatusFilter}
        onPlatformChange={setPlatformFilter}
        onTypeChange={setTypeFilter}
        onFavoriteChange={setFavoriteFilter}
        onClearAll={handleClearAll}
        counts={counts}
      />

      {/* 历史记录列表 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
      }}>
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#9ca3af',
            fontSize: '12px',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
            加载历史记录中...
          </div>
        ) : error ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#ef4444',
            fontSize: '12px',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>❌</div>
            {error}
            <button
              onClick={handleRefresh}
              className="nodrag"
              style={{
                marginTop: '12px',
                padding: '6px 12px',
                fontSize: '11px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              重试
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#9ca3af',
            fontSize: '12px',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📭</div>
            {searchQuery || statusFilter !== 'all' || platformFilter !== 'all' || typeFilter !== 'all'
              ? '没有找到匹配的历史记录'
              : '暂无历史记录'}
          </div>
        ) : (
          <>
            {filteredRecords.map(record => (
              <HistoryCard
                key={record.id || record.taskId}
                record={record}
                onClick={() => handleCardClick(record)}
                onDelete={handleDelete}
                onFavoriteToggle={handleFavoriteToggle}
              />
            ))}

            {/* 底部统计 */}
            <div style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #e5e7eb',
              fontSize: '10px',
              color: '#9ca3af',
              textAlign: 'center',
            }}>
              显示 {filteredRecords.length} 条记录
            </div>
          </>
        )}
      </div>

      {/* 加载工作流确认对话框 */}
      {showLoadDialog && recordToLoad && (
        <div
          onClick={() => setShowLoadDialog(false)}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              minWidth: '400px',
              maxWidth: '500px',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>
              🔄 加载历史工作流
            </h3>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#374151' }}>
              确定要加载此工作流吗？
            </p>
            <p style={{ margin: '0 0 16px 0', fontSize: '11px', color: '#dc2626' }}>
              ⚠️ 当前画布将被替换，未保存的内容将丢失
            </p>

            {/* 工作流信息 */}
            <div style={{
              padding: '12px',
              backgroundColor: '#f8fafc',
              borderRadius: '4px',
              marginBottom: '16px',
              fontSize: '11px',
              color: '#64748b',
            }}>
              <div style={{ marginBottom: '4px' }}>
                <strong>提示词:</strong> {recordToLoad.prompt?.substring(0, 60) || '无'}...
              </div>
              {recordToLoad.model && (
                <div style={{ marginBottom: '4px' }}>
                  <strong>模型:</strong> {recordToLoad.model}
                </div>
              )}
              {recordToLoad.options?.duration && (
                <div style={{ marginBottom: '4px' }}>
                  <strong>时长:</strong> {recordToLoad.options.duration}秒
                </div>
              )}
              <div>
                <strong>创建时间:</strong> {new Date(recordToLoad.createdAt).toLocaleString('zh-CN')}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowLoadDialog(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                取消
              </button>
              <button
                onClick={confirmLoadWorkflow}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                确认加载
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      {showDeleteDialog && recordToDelete && (
        <div
          onClick={() => setShowDeleteDialog(false)}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              minWidth: '300px',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>
              ⚠️ 确认删除
            </h3>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#374151' }}>
              确定要删除这条记录吗？
            </p>
            <p style={{ margin: '0 0 16px 0', fontSize: '11px', color: '#dc2626' }}>
              此操作不可恢复！
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteDialog(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 清空全部确认对话框 */}
      {showClearAllDialog && (
        <div
          onClick={() => setShowClearAllDialog(false)}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              minWidth: '300px',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>
              ⚠️ 警告
            </h3>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#374151' }}>
              确定要清空所有历史记录吗？
            </p>
            <p style={{ margin: '0 0 16px 0', fontSize: '11px', color: '#dc2626' }}>
              此操作不可恢复！
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowClearAllDialog(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                取消
              </button>
              <button
                onClick={confirmClearAll}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HistoryPanel;
