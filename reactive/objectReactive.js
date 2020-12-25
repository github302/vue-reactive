function defineReactive(obj, key, val) {
	Object.defineProperty(obj, key, {
 		enumerable: true,
    configurable: true,
    get() {
      console.log(`${key}属性被读取了`);
			return val;
    },
    set(newVal) {
      val = newVal;
      console.log(`${key}属性值被设置了`);
    },
  });
}
var obj = {name: 'xiaoshuai'};
defineReactive(obj, 'name', 'aaa');
console.log(obj.name);
obj.name = 'hello world!';