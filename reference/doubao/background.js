let lastTabId;
// 监听标签页创建事件，保存最后创建的标签页的id
chrome.tabs.onCreated.addListener(function (tab) {
    lastTabId = tab.id;
    console.log(tab);
    chrome.tabs.query({}, function (tabs) {
        for (var i = 0; i < tabs.length; i++) {
            var url = tabs[i].url;
        }
    });
});
function closeTab(tabId) {
    chrome.tabs.remove(tabId, function () {
        if (chrome.runtime.lastError) {
            setTimeout(function () { closeTab(tabId); }, 100);  // 如果出错，延迟 100 毫秒后重试
        }
        lastTabId = null;
    });
}
// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "close_latest_tab" && lastTabId) {
        // 关闭最新打开的标签页
        closeTab(lastTabId);
    }
});
chrome.runtime.onInstalled.addListener(() => {
  // 扩展安装/更新时初始化存储
  chrome.storage.local.set({ doubao:""});
});