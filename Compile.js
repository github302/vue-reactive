class Compile {
  constructor(vm, el) {
    this.vm = vm;
    this.$el = typeof el === 'string' ? document.querySelector(el) : el;

    if (this.$el) {
      this.$fragment = this.node2fragment(this.$el);

      this.init();

      this.$el.appendChild(this.$fragment);
    }
  }

  node2fragment(el) {
    const fragment = document.createDocumentFragment();
    let child;
    while(child = el.firstChild) {
      fragment.appendChild(child);
    }
    return fragment;
  }

  init() {
    this.compile(this.$fragment);
  }
  
  compile(el) {
    const childNodes = el.childNodes;
    [].slice.call(childNodes).forEach((node) => {
      console.log("compile el:", node);
      if (this.isElementNode(node)) {
        // 解析指令
        this.compileElement(node);
      } else if (this.isTextNode(node)) {
        // 解析 {{ xxx }} 文本
        this.compileText(node);
      }
      if (node.childNodes && node.childNodes.length > 0) {
        this.compile(node);
      }
    })
  }

  compileElement(node) {
    // 解析元素的属性，判断属性是否包含指令
    const attrs = node.attributes;
    [].slice.call(attrs).forEach((attr) => {
      const attrName = attr.name;
      // 以 v- 开头的都是指令
      if (this.isDirective(attrName)) {
        // v-on:click v-model v-bind:title
        const directiveName = attrName.substring(2);
        
        // 指令值
        const exp = attr.value;
        if (this.isEventDirective(directiveName)) {
          // 处理事件指令
          compileUtils.eventHandler(this.vm, node, exp, directiveName);
        } else if (this.isBindDirective(directiveName)) {
          compileUtils.handleBind(this.vm, node, exp, directiveName);
        } else {
          compileUtils.model(this.vm, node, exp, directiveName);
        }

        // 解析完指令需要移除这些属性
        node.removeAttribute(attrName);
      }
    })
  }

  compileText(node) {
    const reg = /\{\{(.*)\}\}/;
    const text = node.textContent;
    if (text && reg.test(text)) {
      const exp = RegExp.$1.trim();
      compileUtils.text(this.vm, node, exp);
    }
  }

  isElementNode(node) {
    return node.nodeType === 1;
  }
  isTextNode(node) {
    return node.nodeType === 3;
  }
  isDirective(attrName) {
    return attrName.indexOf("v-") === 0;
  }
  isEventDirective(directiveName) {
    return directiveName.indexOf("on:") === 0;
  }
  isBindDirective(directiveName) {
    return directiveName.indexOf("bind:") === 0;
  }
}

const compileUtils = {
  handleBind(vm, node, exp, directiveName) {
    // 获取指令exp的值，给属性设置改值，在读取exp的值时候我们就需要给该对象创建一个watcher，用来收集该数据变化
    const attrName = directiveName.split(":")[1];
    this.createWatcher(vm, node, exp, attrName, 'bind');
  },
  model(vm, node, exp, directiveName) {
    let value = this._getVMVal(vm, exp);
    
    this.createWatcher(vm, node, exp, '', 'model');
    
    node.addEventListener('input', (event) => {
      const newVal = event.target.value;
      if (newVal !== value) {
        this._setVMVal(vm, exp, newVal);
        value = newVal;
      }
    })
  },
  text(vm, node, exp) {
    this.createWatcher(vm, node, exp, '', 'text');
  },
  eventHandler(vm, node, exp, directiveName) {
    const eventType = directiveName.split(":")[1];
    const fn = vm.$options.methods[exp];
    if (eventType && fn) {
      node.addEventListener(eventType, fn.bind(vm), false);
    }
  },
  createWatcher(vm, node, exp, directiveName, type) {
    // 对于bind，需要给属性设置值
    const updateFn = UpdaterUtils[type];
    updateFn && updateFn.call(vm, node, directiveName, this._getVMVal(vm, exp));

    new Watcher(vm, exp, (value, oldValue) => {
      updateFn.call(vm, node, directiveName, value, oldValue);
    });
  },
  _getVMVal(vm, exp) {
    const exps = exp.split(".");
    let obj = vm;
    for (let i = 0; i < exps.length; i++) {
      if (!obj) return ;
      obj = obj[exps[i]];
    }
    return obj;
  },
  _setVMVal(vm, exp, val) {
    const exps = exp.split(".");
    let obj = vm;
    for (let i = 0; i < exps.length ; i++) {
      if (i === exps.length - 1) {
        obj[exps[i]] = val;
      } else {
        obj = obj[exps[i]];
      }
    }
  }
}
const UpdaterUtils = {
  bind(node, attrName, value, oldValue) {
    if (value !== oldValue) {
      value = typeof value === 'undefined' ? '' : value;
      node.setAttribute(attrName, value);
    }
  },
  model(node, attrName, value, oldValue) {
    if (value !== oldValue) {
      node.value = typeof value === 'undefined' ? '' : value;
    }
  },
  text(node, attrName, value, oldValue) {
    if (value !== oldValue) {
      node.textContent = typeof value === 'undefined' ? '' : value;
    }
  }
}
