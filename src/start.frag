(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    root.AmmoProxy = factory();
  }
}(this, function () {
