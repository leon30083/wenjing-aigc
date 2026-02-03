# 其他错误模式

> **说明**: 不属于上述分类的其他错误模式

---

## 错误2: 角色创建返回 404
- **原因**: 传递了 model 参数
- **解决**: 删除 model 参数，使用 from_task 优先

---

## 错误3: TaskResultNode 无法获取视频 URL
- **原因**: API 路径缺少 /api/ 前缀
- **解决**: 使用完整路径 `/api/task/{taskId}`

---

## 错误4: React Flow 无限循环
- **原因**: useEffect 依赖数组包含 nodes
- **解决**: 移除 nodes，使用函数式更新

---

## 错误5: 角色引用格式错误
- **原因**: 使用 `@{username}` 带花括号
- **解决**: 使用 `@username` 不带花括号

---

## 错误10: 故事板镜头图片未正确收集
- **原因**: 只收集场景描述，忽略了图片
- **解决**: 同时收集场景描述和参考图片

---

## 错误11: 后端未收集镜头图片
- **原因**: 只使用全局 images 参数
- **解决**: 收集所有镜头的参考图片并合并

---

## 错误12: 提示词与图片内容无关
- **原因**: 使用通用提示词
- **解决**: 先分析图片内容，再写相关提示词

---

## 错误13: 删除操作缺少确认机制
- **原因**: 用户可能误删重要数据
- **解决**: 所有删除操作都必须有确认机制

---

## 错误14: 删除后未刷新列表
- **原因**: 用户看不到删除效果
- **解决**: 删除后自动刷新列表

---

## 错误23: 图生视频提示词未描述参考图内容 `API` `提示词` ⭐⭐

**问题**: 使用参考图片生成的视频与图片内容没有任何关系
**根本原因**: 提示词只描述角色活动，未描述参考图片的场景内容

```javascript
// ❌ 错误：提示词未描述参考图
const prompt = '@装载机 在干活';
const images = ['https://volcano-scene.jpg'];
// 问题：生成的视频与火山场景无关

// ✅ 正确：提示词同时描述参考场景和角色活动
// 参考图片：卡通火山场景（火山口有熔岩流动，底部冒白烟，蓝天白云背景）
const prompt = '卡通风格的火山场景，火山口有熔岩流动，底部冒白烟，蓝天白云背景。@装载机 在火山附近作业，正在搬运岩石，卡通插画风格';
const images = ['https://volcano-scene.jpg'];
```

**提示词结构建议**:
1. **场景描述**（来自参考图片）: 主体、外观、环境、氛围
2. **角色引用**: `@username` 调用角色
3. **活动描述**: 角色在场景中的具体动作

**修复日期**: 2025-12-31

---

## 错误24: 历史记录卡片不显示视频结果 `UI` `显示` ⭐

**问题**: 历史记录面板的卡片只显示占位符，不显示视频和工作流参数
**根本原因**: HistoryCard 组件只检查 `thumbnail` 字段，未检查 `result.output`（视频 URL）

```javascript
// ❌ 错误：只检查 thumbnail
{thumbnail ? (
  <img src={thumbnail} alt="视频缩略图" />
) : (
  <div>🖼️</div>  // 总是显示占位符
)}

// ✅ 正确：显示视频或缩略图
{thumbnail ? (
  <img src={thumbnail} alt="视频缩略图" />
) : result?.output ? (
  <video
    src={result.output}
    muted
    onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
    onMouseLeave={(e) => {
      e.currentTarget.pause();
      e.currentTarget.currentTime = 0;
    }}
  />
) : (
  <div>🖼️</div>
)}
```

**修复日期**: 2025-12-31

---

## 错误25: 本地视频 URL 缺少完整前缀导致无法播放 `API` `URL` ⭐

**现象**: 视频下载后，点击视频无法播放，显示"无法播放媒体"
**根本原因**: 后端返回本地视频路径为 `/downloads/xxx.mp4`（相对路径），浏览器解析为当前页面 URL + 相对路径

```javascript
// ❌ 错误：直接使用相对路径
const videoUrl = result.data.data.output; // "/downloads/xxx.mp4"
<video src={videoUrl} /> // 浏览器解析为 http://localhost:5173/downloads/xxx.mp4 (404)

// ✅ 正确：拼接完整 URL
let finalVideoUrl = result.data.data.output;

// ⭐ 关键：为本地路径拼接完整前缀
if (finalVideoUrl.startsWith('/downloads/')) {
  finalVideoUrl = `${API_BASE}${finalVideoUrl}`;
}
// 结果: "http://localhost:9000/downloads/xxx.mp4"

<video src={finalVideoUrl} /> // 正确加载视频
```

**关键规则**:
1. **相对路径识别**: 以 `/downloads/` 开头的路径是本地视频
2. **URL 拼接**: 本地路径必须拼接 `API_BASE` 前缀
3. **远程路径**: 以 `http://` 或 `https://` 开头的路径直接使用
4. **缓存破坏**: 手动刷新时添加 `&_t=时间戳` 参数绕过浏览器缓存

**修复日期**: 2026-01-01

---

## 错误27: 故事板实现错误 `API` `理解` ⭐ 重大纠正

**问题**: 故事板被错误理解为"批量生成多个视频"
**错误理解**:
- ❌ 故事板 = 多个独立视频任务
- ❌ 每个镜头调用一次 API

**正确理解**:
- ✅ 故事板 = **单个视频任务**，通过特殊格式描述多个时间段
- ✅ 调用 **一次 API**，返回 **单个 taskId**

```javascript
// ❌ 错误：循环调用 API（每个 shot 一次）
for (let i = 0; i < validShots.length; i++) {
  const response = await fetch(`${API_BASE}/video/create`, ...);
  // ❌ 每次循环创建一个独立视频
}

// ✅ 正确：拼接故事板格式，调用一次 API
const promptParts = shots.map((shot, index) => {
  return `Shot ${index + 1}:\nduration: ${shot.duration}sec\nScene: ${shot.scene}`;
});
const prompt = promptParts.join('\n\n');  // ✅ 拼接故事板格式

const response = await fetch(`${API_BASE}/api/video/storyboard`, {
  method: 'POST',
  body: JSON.stringify({
    platform: 'juxin',
    shots: validShots,  // ✅ 传递完整的 shots 数组
  }),
});

const taskId = result.data.id || result.data.task_id;  // ✅ 单个 taskId
```

**关键要点**:
1. 故事板是**单个视频任务**，不是多个视频
2. 提示词必须使用特殊格式：`Shot N:\nduration: Xsec\nScene: Y\n\n`
3. 调用 `/api/video/storyboard` 端点
4. 收集所有镜头的参考图片并合并到 `images` 数组
5. 返回单个 taskId，轮询获取最终视频

---

## 错误28: 故事板发送额外 duration 参数导致 400 错误 `API` `参数` ⭐

```javascript
// ❌ 错误：故事板请求中包含单独的 duration 参数
const response = await fetch(`${API_BASE}/api/video/storyboard`, {
  method: 'POST',
  body: JSON.stringify({
    shots: shotsWithDuration,
    duration: String(totalDuration), // ❌ 导致 400 错误
  }),
});

// ✅ 正确：不发送 duration 参数
const response = await fetch(`${API_BASE}/api/video/storyboard`, {
  method: 'POST',
  body: JSON.stringify({
    shots: shotsWithDuration,
    // duration: String(totalDuration), // ⚠️ 已移除
  }),
});
```

**问题**: 故事板模式已在 prompt 中包含每个镜头的时长，发送额外的 `duration` 参数会导致 API 拒绝请求

---

## 错误29: useEffect 无限循环（data 依赖） `React` `状态` ⭐

```javascript
// ❌ 错误：data 在依赖数组中导致无限循环
function VideoGenerateNode({ data }) {
  const [nodeSize, setNodeSize] = useState({ width: 280, height: 400 });

  // data 对象在每次渲染时都是新引用
  useEffect(() => {
    if (data.onSizeChange) {
      data.onSizeChange(nodeId, nodeSize.width, nodeSize.height);
    }
  }, [nodeSize.width, nodeSize.height, data]); // ❌ data 导致无限循环
}

// ✅ 正确：使用 useRef 存储回调，只监听 onSizeChange 变化
function VideoGenerateNode({ data }) {
  const nodeId = useNodeId();
  const onSizeChangeRef = useRef(data.onSizeChange);

  // 更新 ref（仅当 onSizeChange 变化时）
  useEffect(() => {
    onSizeChangeRef.current = data.onSizeChange;
  }, [data.onSizeChange]);

  // 使用 ref.current，移除 data 依赖
  useEffect(() => {
    if (onSizeChangeRef.current) {
      onSizeChangeRef.current(nodeId, nodeSize.width, nodeSize.height);
    }
  }, [nodeSize.width, nodeSize.height, nodeId]); // ✅ 无 data 依赖
}
```

**问题**:
1. `data` 对象在父组件每次渲染时都是新引用
2. useEffect 依赖 `data` → 触发 → 更新节点 → `data` 变化 → 再次触发 → 无限循环

**解决方案**:
1. **节点内部**: 使用 `useRef` 存储 `onSizeChange`
2. **父组件**: 使用 `useCallback` 创建稳定的回调函数
3. **移除依赖**: 从 useEffect 依赖数组移除 `data`

---

## 错误30: 节点内交互元素触发拖动 `React Flow` `交互` ⭐

```javascript
// ❌ 错误：使用 stopPropagation 无法阻止 React Flow 拖动
function VideoGenerateNode({ data }) {
  const handleTextareaMouseDown = (e) => {
    e.stopPropagation();  // ❌ React Flow 使用捕获阶段，此方法无效
  };

  return <textarea onMouseDown={handleTextareaMouseDown} />;
}

// ✅ 正确：使用 React Flow 官方 nodrag 类
function VideoGenerateNode({ data }) {
  return (
    <div>
      {/* 所有交互元素添加 nodrag 类 */}
      <textarea className="nodrag" />
      <select className="nodrag">...</select>
      <input className="nodrag" type="checkbox" />
      <button className="nodrag">生成</button>
    </div>
  );
}
```

**问题**: React Flow 在捕获阶段监听事件，`stopPropagation()` 在冒泡阶段执行，无法阻止拖动

**解决方案**: 使用 `className="nodrag"` 标记所有交互元素

---

## 错误32: App.jsx 把 selectedImages 数组当作 Set 处理 `React Flow` `数据类型` ⭐

```javascript
// ❌ 错误：App.jsx 把数组当作 Set
const selectedImagesSet = sourceNode.data?.selectedImages;
if (selectedImagesSet && selectedImagesSet.size > 0) {
  newData.connectedImages = allImages.filter(img => selectedImagesSet.has(img));
}

// ✅ 正确：selectedImages 是已过滤的数组，直接使用
const selectedImagesArray = sourceNode.data?.selectedImages;
const allImages = sourceNode.data?.images || [];

if (selectedImagesArray && Array.isArray(selectedImagesArray)) {
  // 有 selectedImages 数据：使用它（已过滤）
  newData.connectedImages = selectedImagesArray;
} else {
  // 向后兼容：没有 selectedImages 数据时传递所有图片
  newData.connectedImages = allImages;
}
```

**问题**: ReferenceImageNode 保存 `selectedImages` 到 `node.data` 时是**数组**，App.jsx 使用 Set 的 `.size` 和 `.has()` 方法处理

**解决方案**: 使用 `Array.isArray()` 检查数据类型，直接使用已过滤的数组

**修复日期**: 2026-01-02

---

## 错误36: TaskResultNode 进度百分比未显示 `UI` `显示` ⭐

**现象**: TaskResultNode 显示 "✓ 完成 0%" 而非 "✓ 完成 100%"
**根本原因**:
1. getStatusText 函数硬编码返回 "✓ 完成"，忽略了 progressValue 参数
2. 轮询函数未设置 progress 为 100
3. 恢复逻辑只检查 `_isCompletedFromHistory` 在检查 `taskStatus === 'SUCCESS'` 之前

```javascript
// ❌ 错误：getStatusText 忽略 progressValue 参数
const getStatusText = (status, progressValue) => {
  switch (status) {
    case 'SUCCESS': return '✓ 完成';  // ❌ 硬编码，忽略 progressValue
    case 'IN_PROGRESS': return `⏳ 处理中 ${progressValue}%`;
  }
};

// ✅ 正确：getStatusText 包含进度百分比
const getStatusText = (status, progressValue) => {
  switch (status) {
    case 'SUCCESS': return `✓ 完成 ${progressValue}%`;  // ✅ 显示进度
    case 'IN_PROGRESS': return `⏳ 处理中 ${progressValue}%`;
  }
};

// ✅ 正确：轮询函数设置 progress 为 100
if (status === 'SUCCESS' && taskData?.output) {
  setVideoUrl(finalVideoUrl);
  setProgress(100);  // ✅ 任务完成时设置进度为 100%
  setPolling(false);
}
```

**关键点**:
1. **getStatusText 必须包含进度**: 成功状态显示 "✓ 完成 100%"
2. **轮询时设置进度**: API 返回 SUCCESS 时，自动设置 progress 为 100
3. **手动刷新设置进度**: 刷新已完成任务时，如果 progress 为 0，设置为 100
4. **默认值逻辑**: 如果 progress 为 undefined 或 0，且任务已完成，默认为 100

**修复日期**: 2026-01-01

---

## 错误43: JavaScript TDZ错误 - const变量声明前使用 `JavaScript` `TDZ` ⭐

```javascript
// ❌ 错误：Hook 在 updateShot 声明之前调用
function StoryboardNode({ data }) {
  const [shots, setShots] = useState([]);

  // ❌ useSceneCharacterInsertion 使用 updateShot，但还未声明
  const insertCharacterToScene = useSceneCharacterInsertion(
    realToDisplay,
    displayToReal,
    updateShot  // ❌ ReferenceError: Cannot access before initialization
  );

  // updateShot 在这里声明，但已经太晚了
  const updateShot = (shotId, field, value) => {
    setShots((prevShots) =>
      prevShots.map((shot) =>
        shot.id === shotId ? { ...shot, [field]: value } : shot
      )
    );
  };
}

// ✅ 正确：先声明 updateShot，再调用 Hook
function StoryboardNode({ data }) {
  const [shots, setShots] = useState([]);

  // ✅ 先声明 updateShot
  const updateShot = (shotId, field, value) => {
    setShots((prevShots) =>
      prevShots.map((shot) =>
        shot.id === shotId ? { ...shot, [field]: value } : shot
      )
    );
  };

  // ✅ 后调用 Hook（updateShot 已声明）
  const insertCharacterToScene = useSceneCharacterInsertion(
    realToDisplay,
    displayToReal,
    updateShot  // ✅ 正确
  );
}
```

**关键点**:
1. **TDZ规则**: `const` 和 `let` 声明在代码执行前存在"暂时性死区"
2. **声明顺序**: 函数必须在 Hook 调用之前声明
3. **函数提升**: 只有 `function` 声明会提升，`const` 箭头函数不会
4. **解决方案**: 将函数定义移到 Hook 调用之前

**修复日期**: 2026-01-02
