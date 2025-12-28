var LibComm = {
    portKimi:9000,
    portDouBao:9000,
    isAsync: 1,
    InputText: function (element, value) {
        if(element == null){
            return;
        }
        if (element && 'value' in element) {
            element.value = value;
        }
        else if(element && 'textContent' in element){
            element.textContent = value;
        }
        else {
            element.innerHTML = value;
        }
        var event = new Event('input', {
            bubbles: true
        });
        element.dispatchEvent(event);
    },
    GetMutiElements:function (element,selector, attribute, value){
        var elements = element.querySelectorAll(selector);
        var outpus = [];
        for (let i = 0; i < elements.length; i++) {
            var element = elements[i];
            var attr = element.getAttribute(attribute);
            if (attr != value) {
                continue;
            }
            outpus.push(element);
        }
        return outpus;
    },
    GetMutiElement: function (element,selector, attribute, value, index = 0) {
        var elements = element.querySelectorAll(selector);
        var matches = [];

        // 筛选出具有指定属性且包含指定值的元素
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            var attr = element.getAttribute(attribute);
            if (attr && attr.indexOf(value) !== -1) {
                matches.push(element);
            }
        }

        // 根据index参数返回对应元素
        if (matches.length === 0) {
            return null;
        }

        // 处理负数索引（从后往前数）
        if (index < 0) {
            index = matches.length + index; // 例如：-1 转换为 matches.length - 1
        }

        // 确保索引在有效范围内
        if (index < 0 || index >= matches.length) {
            console.warn(`索引 ${index} 超出有效范围（0 到 ${matches.length - 1}）`);
            return null;
        }

        return matches[index];
    },
    GetMutiElementByText: function (selector, text) {
        var elements = document.querySelectorAll(selector);
        for (var i = 0; i < elements.length; i++) {
            const element = elements[i];
            var sText = element.innerHTML;
            if (sText.indexOf(text) != -1) {
                return element;
            }
        }
        return null;
    },
    Click: function (element, time) {
        setTimeout(function () {
            if (!element) {
                return;
            }
            var event = new MouseEvent('click', {
                'view': window,
                'bubbles': true,
                'cancelable': true
            });
            element.dispatchEvent(event);
        }, time);
    },
    ServerGet: function (type,param, callback) {
        this.isAsync = 0;
        const xhr = new XMLHttpRequest();
        url = 'http://localhost:';
        if(type == "kimi"){
            url += this.portKimi;
        }
        else{
            url += this.portDouBao;
        }
        url = url +"/" + param;
        xhr.open('GET', url);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                if (xhr.responseText != null && xhr.responseText != "") {
                    callback(xhr.responseText);
                }
                LibComm.isAsync = 1;
            }
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status != 200) {
                LibComm.isAsync = 1;
            }

        };
        xhr.send();
    },
    ServerSet: function (type,data, callback) {
        this.isAsync = 0;
        const xhr = new XMLHttpRequest();
        url = 'http://localhost:';
        if(type == "kimi"){
            url += this.portKimi;
        }
        else{
            url += this.portDouBao;
        }
        xhr.open('POST', url);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = function () {
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                callback(xhr.responseText);
                LibComm.isAsync = 1;
            }
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status != 200) {
                LibComm.isAsync = 1;
            }
        };
        xhr.send(JSON.stringify(data));
    }
}