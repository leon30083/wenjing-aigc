/**
 * WinJin Reborn - Communication Library
 * 替代原版的 comm.js - 清晰版本
 */

const LibComm = {
  portKimi: 9000,
  portDouBao: 9000,
  isAsync: true,

  // 输入文本到元素
  InputText(element, value) {
    if (!element) return;

    if ('value' in element) {
      element.value = value;
    } else if ('textContent' in element) {
      element.textContent = value;
    } else {
      element.innerHTML = value;
    }

    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);
  },

  // 获取多个匹配属性值的元素
  GetMutiElements(element, selector, attribute, value) {
    const elements = element.querySelectorAll(selector);
    return Array.from(elements).filter(el => {
      const attr = el.getAttribute(attribute);
      return attr === value;
    });
  },

  // 获取匹配属性值的单个元素
  GetMutiElement(element, selector, attribute, value, index = 0) {
    const elements = element.querySelectorAll(selector);
    const matches = Array.from(elements).filter(el => {
      const attr = el.getAttribute(attribute);
      return attr && attr.indexOf(value) !== -1;
    });

    if (matches.length === 0) return null;

    // 处理负数索引
    if (index < 0) {
      index = matches.length + index;
    }

    if (index < 0 || index >= matches.length) {
      console.warn(`Index ${index} out of range (0 - ${matches.length - 1})`);
      return null;
    }

    return matches[index];
  },

  // 根据文本内容获取元素
  GetMutiElementByText(selector, text) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      if (element.innerHTML.indexOf(text) !== -1) {
        return element;
      }
    }
    return null;
  },

  // 延迟点击
  Click(element, delay = 0) {
    setTimeout(() => {
      if (!element) return;

      const event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(event);
    }, delay);
  },

  // GET 请求到本地服务器
  ServerGet(type, param, callback) {
    this.isAsync = false;
    const xhr = new XMLHttpRequest();

    const url = `http://localhost:${type === 'kimi' ? this.portKimi : this.portDouBao}/${param}`;

    xhr.open('GET', url);
    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200 && xhr.responseText) {
          callback(xhr.responseText);
        }
        this.isAsync = true;
      }
    };
    xhr.send();
  },

  // POST 请求到本地服务器
  ServerSet(type, data, callback) {
    this.isAsync = false;
    const xhr = new XMLHttpRequest();

    const url = `http://localhost:${type === 'kimi' ? this.portKimi : this.portDouBao}`;

    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          callback(xhr.responseText);
        }
        this.isAsync = true;
      }
    };
    xhr.send(JSON.stringify(data));
  }
};

// 导出到全局
window.LibComm = LibComm;
