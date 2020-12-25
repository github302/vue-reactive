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