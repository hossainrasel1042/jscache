class Data {
  constructor(value, time) {
    this.value = value;
    this.time = time;
    this.ttl = false;
  }
}
class Node {
  constructor(key, data) {
    this.key = key;
    this.data = data;
    this.prev = null;
    this.next = null;
  }
}
class _Lru {
  constructor(size) {
    this.totalSize = 0;
    this.size = size;
    this.map = new Map();
    this.head = null;
    this.tail = null;
  }
  get(key) {
    if (this.map.has(key)) {
      const node = this.map.get(key);
      if (node.data.ttl && node.data.time < Date.now()) {
        this.delete(key);
        return "NaN";
      }
      this.moveToHead(node);
      return node.data.value;
    } else {
      return "NaN";
    }
  }
  set(key, value, ttl = 0) {
    if (this.map.has(key)) {
      const node = this.map.get(key);
      node.data.value = value;
      node.data.time = Date.now() + ttl;
      node.data.ttl = ttl > 0;
      this.moveToHead(node);
      return "OK";
    } else {
      const data = new Data(value, Date.now() + ttl);
      data.ttl = ttl > 0;
      const node = new Node(key, data);
      this.map.set(key, node);
      this.addToHead(node);
      this.totalSize += 1;
      if (this.map.size > this.size) {
        this.removeTail();
        this.totalSize -= 1;
      }
      return "OK";
    }
  }
  delete(key) {
    if (this.map.has(key)) {
      const node = this.map.get(key);
      this.removeNode(node);
      this.map.delete(key);
      this.totalSize -= 1;
      return "OK";
    } else {
      return "NaN";
    }
  }
  addToHead(node) {
    node.prev = this.head;
    node.next = null;
    if (this.head) this.head.next = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  removeNode(node) {
    if (node.prev) node.prev.next = node.next;
    else this.tail = node.next;

    if (node.next) node.next.prev = node.prev;
    else this.head = node.prev;
  }

  moveToHead(node) {
    this.removeNode(node);
    node.prev = this.head;
    node.next = null;
    if (this.head) this.head.next = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  removeTail() {
    if (!this.tail) return;
    const tail = this.tail;
    this.map.delete(tail.key);
    this.removeNode(tail);
  }
}

class MemoryAllocation {
  constructor(size = 10000) {
    if (MemoryAllocation.instance) {
      return MemoryAllocation.instance;
    }
    this.lru = new _Lru(size);
    MemoryAllocation.instance = this;
  }

  get(key) {
    return this.lru.get(key);
  }

  set(key, value, ttl = 0) {
    return this.lru.set(key, value, ttl);
  }

  delete(key) {
    return this.lru.delete(key);
  }
}

MemoryAllocation.instance = null;

const handler = {
  construct(target, args) {
    if (target.instance) return target.instance;
    target.instance = new target(...args);
    return target.instance;
  },
  get(target, prop) {
    if (prop === 'instance') throw new Error('Access denied');
    return Reflect.get(target, prop);
  },
  set(target, prop, value) {
    if (prop === 'instance' && target.instance) throw new Error('Cannot overwrite singleton');
    return Reflect.set(target, prop, value);
  },
  deleteProperty(target, prop) {
    if (prop === 'instance') throw new Error('Cannot delete singleton');
    return Reflect.deleteProperty(target, prop);
  }
};
const ProtectedMemory = new Proxy(MemoryAllocation, handler);
module.exports = new ProtectedMemory(); // Main Export