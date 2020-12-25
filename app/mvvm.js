const isObject = (obj) => Object.prototype.toString.call(obj) === '[object Object]';

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

class Watcher {
  constructor(vm, expOrFn, cb) {
    this.vm = vm;
    this.expOrFn = expOrFn;
    this.cb = cb;

    // 如何获取数据
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn;
    } else {
      this.getter = this.parseGetter(expOrFn);
    }
    
    this.value = this.get();  // 获取数据，触发收集依赖过程
  }

  get() {
    Dep.target = this;
    const value = this.getter.call(this.vm, this.vm);
    Dep.target = null; // 收集完依赖，将当前依赖清空
    return value;
  }

  // 执行这个方法会返回需要获取的值
  parseGetter(exp) {
    // a.b.c.d
    const exps = exp.split(".");
    return function(obj) {
      for (let i = 0; i < exps.length; i++) {
        if (!obj) return ;
        obj = obj[exps[i]];
      }
      return obj;
    }
  }

  update() {
    // 当数据改变执行该方法，此方法会得到最新的data值，并将前后的value值都给cb函数
    const oldValue = this.value;
    this.value = this.get();
    this.cb && this.cb.call(this.vm, this.value, oldValue);
  }
}

class Dep {
  constructor() {
    this.subs = []; // 依赖数组
  }
  addSub(sub) {
    if (sub && this.subs.indexOf(sub) === -1) {
      this.subs.push(sub);
    } 
  }
  notify() {
    this.subs.forEach((sub) => {
      sub.update();
    })
  }
}
Dep.target = null;

class Observer {
  constructor(data) {
    this.data = data;

    this.walk(this.data);
  }

  walk(data) {
    Object.keys(data).forEach((key) => {
      this.defineReactive(data, key, data[key]);
    })
  }

  defineReactive(obj, key, val) {
    const dep = new Dep();
    observe(val);
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get() {
        // 收集依赖，谁需要数据，就收集谁
        dep.addSub(Dep.target);
        return val;
      },
      set(newVal) {
        if (newVal !== val) {
          observe(newVal);
          val = newVal;
          
          // 通知依赖，数据变更了
          dep.notify();
        }
      }
    })
  }
}

function observe(data) {
  if (!data || !isObject(data)) return ;
  new Observer(data);
}

class Vue {
  constructor(options) {
    this.$options = options;
    this.$el = options.el || document.body;
    this.$data = options.data;
    console.log("vue:", this.$data);

    // 将$data属性代理到Vue实例上
    Object.keys(this.$data).forEach((key) => {
      this._proxyData(key);
    })

    this._initComputed();

    // 将 $data 转换为响应式数据
    observe(this.$data);

    // 依赖在哪创建，读取数据的时候创建

    // 编译模板
    this.$compile = new Compile(this, this.$el);

  }
  _proxyData(key) {
    Object.defineProperty(this, key, {
      enumerable: true,
      configurable: false,
      get() {
        return this.$data[key];
      },
      set(newVal) {
        this.$data[key] = newVal;
      }
    })
  }

  _initComputed() {
    // 将 computed 的属性也代理到 Vue 实例上
    const computed = this.$options.computed || {};
    Object.keys(computed).forEach((key) => {
      Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        get: typeof computed[key] === 'function' ? 
          computed[key] : computed[key].get,
        set() {
          console.log("computed 属性不可set ");
        }
      })
    })
  }
}