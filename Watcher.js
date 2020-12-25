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