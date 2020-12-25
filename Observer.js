const isObject = (obj) => Object.prototype.toString.call(obj) === '[object Object]';

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
