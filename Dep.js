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