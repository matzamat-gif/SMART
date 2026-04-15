// Add WeakRef polyfill for older Hermes engines and Expo Router
if (typeof WeakRef === 'undefined') {
  class WeakRefPolyfill<T extends object> {
    private target: T | null;
    
    constructor(target: T) {
      this.target = target;
    }
    
    deref(): T | undefined {
      return this.target || undefined;
    }
  }
  
  // @ts-ignore
  global.WeakRef = WeakRefPolyfill;
}
