const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let serverProcess = null;
let mainWindow = null;

// 启动 Express 服务器
async function startServer() {
  // ⭐ 关键修复：检测打包后的路径
  let serverPath;
  let serverCwd;

  if (app.isPackaged) {
    // 打包后：检测打包方式（asar 或 electron-packager）
    const appPath = path.join(process.resourcesPath, 'app');
    const appUnpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked');

    // 检查使用哪种打包方式
    const fs = require('fs');
    let useAsarUnpacked = false;

    try {
      // 检查 app.asar.unpacked 是否存在（electron-builder 方式）
      if (fs.existsSync(appUnpackedPath)) {
        useAsarUnpacked = true;
        serverPath = path.join(appUnpackedPath, 'src', 'server', 'index.js');
        serverCwd = appUnpackedPath;
        console.log('[Main] 打包模式 (electron-builder) - 服务器路径:', serverPath);
        console.log('[Main] 打包模式 (electron-builder) - 工作目录:', serverCwd);
      } else if (fs.existsSync(path.join(appPath, 'src', 'server'))) {
        // electron-packager 方式（未使用 asar）
        useAsarUnpacked = false;
        serverPath = path.join(appPath, 'src', 'server', 'index.js');
        serverCwd = appPath;
        console.log('[Main] 打包模式 (electron-packager) - 服务器路径:', serverPath);
        console.log('[Main] 打包模式 (electron-packager) - 工作目录:', serverCwd);
      } else {
        throw new Error('无法找到打包后的服务器文件');
      }
    } catch (err) {
      console.error('[Main] 检测打包方式失败:', err);
      throw err;
    }
  } else {
    // 开发模式
    serverPath = path.join(__dirname, '../server/index.js');
    serverCwd = path.join(__dirname, '../..');
    console.log('[Main] 开发模式 - 服务器路径:', serverPath);
    console.log('[Main] 开发模式 - 工作目录:', serverCwd);
  }

  console.log('[Main] 正在启动 Express 服务器...');

  // ⭐ 关键修复：设置环境变量，确保 .env 文件能被找到
  const env = {
    ...process.env,
    NODE_ENV: app.isPackaged ? 'production' : 'development',
  };

  // ⭐ 打包模式：后端服务在独立终端窗口运行（便于调试）
  // ⭐ 开发模式：后端服务在隐藏进程运行（输出到主进程控制台）
  const spawnOptions = {
    cwd: serverCwd,
    env: env,
    shell: true,
  };

  if (app.isPackaged) {
    // 打包模式：可见终端窗口
    spawnOptions.detached = true;  // 独立进程
    spawnOptions.windowsHide = false;  // 显示窗口
    spawnOptions.stdio = 'ignore';  // 忽略 IO（独立窗口处理）
  } else {
    // 开发模式：隐藏窗口，捕获输出
    spawnOptions.stdio = 'pipe';
  }

  serverProcess = spawn('node', [serverPath], spawnOptions);

  // ⭐ 开发模式：捕获服务器输出到主进程控制台
  if (!app.isPackaged) {
    serverProcess.stdout.on('data', (data) => {
      console.log('[Server]', data.toString());
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('[Server Error]', data.toString());
    });
  } else {
    console.log('[Main] 后端服务已在独立终端窗口启动');
  }

  serverProcess.on('error', (err) => {
    console.error('[Main] 启动服务器失败:', err);
    showErrorDialog('后端服务器启动失败', `错误: ${err.message}\n\n请检查:\n1. Node.js 是否正确安装\n2. 端口 9000 是否被占用\n3. 是否有足够的权限`);
  });

  serverProcess.on('exit', (code, signal) => {
    console.log(`[Main] 服务器退出 - 代码: ${code}, 信号: ${signal}`);
    if (code !== 0 && code !== null) {
      console.error('[Main] 服务器异常退出');
    }
  });

  // ⭐ 关键修复：等待服务器启动并验证
  console.log('[Main] 等待服务器启动...');
  await waitForServer(10000); // 最多等待 10 秒

  return serverProcess;
}

// ⭐ 新增：等待服务器启动并验证
function waitForServer(timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkInterval = 500; // 每 500ms 检查一次

    const checkServer = () => {
      const elapsed = Date.now() - startTime;

      // 尝试连接到服务器
      http.get('http://localhost:9000', (res) => {
        console.log('[Main] ✅ 服务器启动成功！');
        resolve();
      }).on('error', () => {
        // 服务器还没准备好
        if (elapsed < timeout) {
          console.log(`[Main] 等待服务器... (${elapsed / 1000}s)`);
          setTimeout(checkServer, checkInterval);
        } else {
          console.error('[Main] ❌ 服务器启动超时');
          showErrorDialog('后端服务器启动超时', `等待了 ${timeout / 1000} 秒，但服务器仍无响应。\n\n可能的原因:\n1. 端口 9000 被占用\n2. 缺少依赖文件\n3. 配置文件错误\n\n请检查控制台日志获取详细信息。`);
          reject(new Error('Server start timeout'));
        }
      });
    };

    // 开始检查
    setTimeout(checkServer, 1000); // 延迟 1 秒后开始检查
  });
}

// ⭐ 新增：显示错误对话框
function showErrorDialog(title, message) {
  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: title,
      message: title,
      detail: message,
      buttons: ['确定']
    });
  }
}

// 创建应用窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight:  700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    // icon: path.join(__dirname, '../../build/icon.ico'),  // ⚠️ 暂时注释，需要准备图标文件
    show: false
  });

  // 加载页面
  const indexPath = path.join(__dirname, '../client/dist/index.html');
  mainWindow.loadFile(indexPath).then(() => {
    mainWindow.show();
  }).catch(err => {
    console.error('[Main] 加载页面失败:', err);
  });

  // 开发模式打开 DevTools
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 应用生命周期
app.whenReady().then(async () => {
  await startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('[Main] 应用退出，关闭服务器');
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
});
