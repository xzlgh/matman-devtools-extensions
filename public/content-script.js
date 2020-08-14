console.log('[matman-devtools] content scripts loaded');

const MATMAN_DEVTOOLS_DEBUG = true;

/**
 * 消息类型
 * @type {Object}
 */
const MATMAN_DEVTOOLS_MESSAGE_TYPE = {
  SEND_RESPONSE_GET_TIPS: 'CONTENT_SCRIPT_SEND_RESPONSE_GET_TIPS',
  SEND_MESSAGE_AFTER_SELECTED_ELEMENT:
    'CONTENT_SCRIPT_SEND_MESSAGE_AFTER_SELECTED_ELEMENT',
};

let matmanDevtoolsSelectedDom;

/**
 * 设置当前选中的元素，由 DevTools 传递过来
 * @param selectedDom 当前选中的 DOM 元素
 */
function setSelectedElement(selectedDom) {
  if (MATMAN_DEVTOOLS_DEBUG) {
    console.log('[matman-devtools] selected dom', selectedDom);
  }

  matmanDevtoolsSelectedDom = selectedDom;

  // 获取相关数据
  const data = {
    selector: getSelector(selectedDom),
    info: {
      text: $.trim($(selectedDom).text()),
      exist: 'true',
      total: $(selectedDom).children().length,
    },
  };

  if (MATMAN_DEVTOOLS_DEBUG) {
    console.log('[matman-devtools] selected dom data', data);
  }

  // 传递数据到 DevTools page
  chrome.runtime.sendMessage({
    type: MATMAN_DEVTOOLS_MESSAGE_TYPE.SEND_MESSAGE_AFTER_SELECTED_ELEMENT,
    data: data,
  });
}

// 监听来自 DevTools page 的消息，然后再回调信息
// 例如可获取到 DOM 或 window 等信息，再传回到 DevTools page 做展示
// DevTools page 通过 chrome.tabs.sendMessage 来发送消息
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (MATMAN_DEVTOOLS_DEBUG) {
    console.log('[matman-devtools] receive message', message);
  }

  // 如果当前没有已选中的 dom ，则不做其他处理
  if (!matmanDevtoolsSelectedDom) {
    sendResponse({
      type: MATMAN_DEVTOOLS_MESSAGE_TYPE.SEND_RESPONSE_GET_TIPS,
      data: {
        error: 'selected dom is undefined!',
      },
    });

    return;
  }

  let selectedDom = matmanDevtoolsSelectedDom;

  // 接收到新的指令，获取到 DOM 或 window 的信息
  let data = {
    className: selectedDom.getAttribute('class'),
    text: selectedDom.innerHTML,
  };

  if (MATMAN_DEVTOOLS_DEBUG) {
    console.log('[matman-devtools] selected dom data', data);
  }

  // 传回到 DevTools page
  sendResponse({
    type: MATMAN_DEVTOOLS_MESSAGE_TYPE.SEND_RESPONSE_GET_TIPS,
    data: data,
  });
});

function getSelector(dom) {
  let path;
  let i;
  const originalDom = dom;

  for (path = '', i = 0; dom && dom.nodeType === 1; dom = dom.parentNode, i++) {
    // 有 id 的情况直接退出
    if (dom.id) {
      path = '#' + dom.id + ' ' + path;
      break;
    }

    // 可能会有多个class
    if (dom.className) {
      path = '.' + dom.className.trim().split(/\s+/).join('.') + ' ' + path;
    } else if (i === 0) {
      // 如果是当前 dom 节点，且无 class，则使用其 tagName
      path = dom.tagName.toLowerCase();
    }
  }

  let result = path.trim();

  // 注意，有可能会有多个结果，此时需要加上序号，确保唯一，
  // 例如如果 #expTable .head th 有多个值，
  // 则会追加序号来区别L #expTable .head th:nth-child(6)
  const selectorAll = document.querySelectorAll(result);
  if (selectorAll && selectorAll.length > 1) {
    for (let index = 0; index < selectorAll.length; index++) {
      const element = selectorAll[index];
      if (element === originalDom) {
        result = `${result}:nth-child(${index + 1})`;
        break;
      }
    }
  }

  return result;
}

// 向页面中注入 JS
function injectCustomJs(jsPath) {
  jsPath = jsPath || 'js/inject.js';

  var temp = document.createElement('script');
  temp.setAttribute('type', 'text/javascript');
  temp.src = chrome.extension.getURL(jsPath);

  temp.onload = function () {
    this.parentNode.removeChild(this);
  };

  document.body.appendChild(temp);
}

injectCustomJs('lodash.min.js');

injectCustomJs('useJquery.min.js');
