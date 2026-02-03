# UI/渲染相关错误模式

> **说明**: UI 渲染、显示、CSS 相关的错误模式

---

## 错误47: 图片加载导致布局抖动（CLS） `UI` `性能` ⭐

**现象**: 角色库节点中的角色列表不停抖动，滚动条上下滑动
**根本原因**: 图片加载时没有预留空间，导致布局频繁调整

```javascript
// ❌ 错误：图片没有约束布局
<img
  src={char.profilePictureUrl || '/default-avatar.svg'}
  style={{
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    objectFit: 'cover',
  }}
/>

// ✅ 正确：添加 display 和 flexShrink 防止布局偏移
<img
  src={char.profilePictureUrl || '/default-avatar.svg'}
  style={{
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    objectFit: 'cover',
    marginBottom: '4px',
    // ⭐ 防止图片加载导致的布局抖动
    display: 'block',      // 防止内联布局计算
    flexShrink: 0,         // 防止 flex 收缩
  }}
  onError={(e) => {
    e.target.src = '/default-avatar.svg';
  }}
/>
```

**调试方法**: ⭐ 最重要的发现
1. 打开 Chrome DevTools（F12）
2. 切换到 Performance 选项卡
3. 点击录制按钮（圆点）
4. 刷新页面（Ctrl+Shift+R 强制刷新）
5. 等待 5-10 秒后停止录制
6. 查看 CLS (Cumulative Layout Shift) 分数和偏移次数

**性能对比**:
| 指标 | 修复前 | 修复后 | 改善 |
|------|--------|--------|------|
| CLS 分数 | 0.0176 | 0.0010 | **减少 94%** |
| 布局偏移次数 | 51 次 | 3 次 | **减少 94%** |
| 偏移持续时间 | ~5 秒 | 1.8 秒 | **减少 64%** |

**修复日期**: 2026-01-04

**经验教训**:
- 🔥 **性能录制是调试性能问题的黄金方法** - 比控制台日志更直观
- 🔥 **用户描述的症状可能不准确** - "滚动条滑动"实际是布局偏移
- 🔥 **误诊会浪费大量时间** - 走了很多弯路才找到根本原因
- 🔥 **优先使用浏览器工具** - DevTools Performance 能直接定位问题

---

## 错误44: React 对象渲染错误 - 直接渲染对象导致崩溃 `UI` `渲染` ⭐

**现象**: 页面崩溃，错误 "Objects are not valid as a React child (found: object with keys {message, type, param, code})"
**根本原因**: React 组件直接渲染了 JavaScript 对象

```javascript
// ❌ 错误：直接渲染 error 对象
function VideoNode() {
  const [error, setError] = useState(null);

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {/* ❌ error 是对象，React无法渲染 */}
    </div>
  );
}

// ✅ 正确：渲染 error.message 或 JSON.stringify
function VideoNode() {
  const [error, setError] = useState(null);

  return (
    <div>
      {error && (
        <div className="error">
          {typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}
        </div>
      )}
    </div>
  );
}
```

**关键点**:
1. **React子元素规则**: 只能渲染 string, number, JSX, null, undefined, boolean, array
2. **对象不能渲染**: 普通对象会报错
3. **错误对象处理**: 使用 `error.message` 或 `JSON.stringify(error)`
4. **类型检查**: `typeof error === 'string'` 判断是否可直接渲染

**修复日期**: 2026-01-02

---

## 错误42: CSS border 语法错误 - 颜色值多余引号 `UI` `CSS` ⭐

**现象**: React 组件渲染报错，样式未生效
**根本原因**: CSS border 属性中颜色值有多余的引号

```javascript
// ❌ 错误：颜色值周围有多余引号
<div style={{
  border: '1px solid '#fcd34d',  // ❌ 语法错误
}} />

// ✅ 正确：颜色值不加引号
<div style={{
  border: '1px solid #fcd34d',  // ✅ 正确语法
}} />
```

**关键点**:
1. **border语法**: `border: '宽度 样式 颜色'` - 所有值在一个字符串中
2. **颜色值格式**: 十六进制颜色（如 `#fcd34d`）不加引号
3. **字符串拼接**: 使用模板字符串 `${}` 进行动态拼接

**修复日期**: 2026-01-02
