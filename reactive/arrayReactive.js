const methodsToPatch = [
	'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
];

const arrayProto = Array.prototype; // 获取 Array 的原型对象
const arrayMethods = Object.create(arrayProto); // 

methodsToPatch.forEach(function(method){
	const original = arrayProto[method];

  Object.defineProperty(arrayMethods, method, {
  	value: function mutator(...args) {
      const result = original.apply(this, args);
      console.log("数组发生了变化");
      return result;
    },
    enumerable: false,
    writable: true,
    configurable: true,
  });
});

// 在Firefox,Safari和Chrome中会在每个对象上暴露__proto__属性，可以通过这个属性访问对象的原型。
const hasProto = '__proto__' in {};

function defineArray(arr) {
	if (Array.isArray(arr)) {
		if (hasProto) {
      arr.__proto__ = arrayMethods;
    } else {
      copyAugment(arrayMethods, arr, methodsToPatch)
    }
  }
}

function copyAugment(src, target, keys) {
	for (let i = 0; i < keys.length; i++) {
  	Object.defineProperty(target, keys[i], {
    	value: src[keys[i]],
      enumerable: false,
      writable: true,
      configurable: true,
		});
	}
}

var arr = [1, 2, 3, 4, 5];
defineArray(arr);
// 读取一个对象的属性时，会先从该对象上查找，该对象上有就返回，如果没有就会去查找其原型对象上的属性。
arr.push(6); 
arr.splice(4, 1);

// 类似于给该对象重写数组的一些方法，如：
var arr1 = [1, 2];
arr1.push = function() {
	console.log("重写了 arr1 的push 方法，数组长度不会改变");
}
arr1.push(3);
console.log(arr1.length);