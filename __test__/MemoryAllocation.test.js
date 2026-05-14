const memory = require('../src/main/Memory/MemoryAllocation');
const getLru = () => memory.lru;

describe('Singleton', () => {
    test('returns same instance on multiple requires', () => {
        const mem1 = require('../src/main/Memory/MemoryAllocation');
        const mem2 = require('../src/main/Memory/MemoryAllocation');
        expect(mem1).toBe(mem2);
    });

    test('same instance has same lru reference', () => {
        const mem1 = require('../src/main/Memory/MemoryAllocation');
        const mem2 = require('../src/main/Memory/MemoryAllocation');
        expect(mem1.lru).toBe(mem2.lru);
    });
});

describe('SET', () => {
    beforeEach(() => {
        getLru().map.clear();
        getLru().head = null;
        getLru().tail = null;
    });

    test('returns OK on new key', () => {
        expect(memory.set('a', 1)).toBe('OK');
    });

    test('returns OK on update existing key', () => {
        memory.set('a', 1);
        expect(memory.set('a', 2)).toBe('OK');
    });

    test('updates value on existing key', () => {
        memory.set('a', 1);
        memory.set('a', 2);
        expect(memory.get('a')).toBe(2);
    });

    test('evicts LRU when over capacity', () => {
        getLru().size = 2;
        memory.set('a', 1);
        memory.set('b', 2);
        memory.set('c', 3);
        expect(memory.get('a')).toBe('NaN');
        expect(memory.get('b')).toBe(2);
        expect(memory.get('c')).toBe(3);
        getLru().size = 10000;
    });

    test('stores multiple keys', () => {
        memory.set('x', 10);
        memory.set('y', 20);
        expect(memory.get('x')).toBe(10);
        expect(memory.get('y')).toBe(20);
    });
});

describe('GET', () => {
    beforeEach(() => {
        getLru().map.clear();
        getLru().head = null;
        getLru().tail = null;
    });

    test('returns value for existing key', () => {
        memory.set('a', 42);
        expect(memory.get('a')).toBe(42);
    });

    test('returns NaN for missing key', () => {
        expect(memory.get('missing')).toBe('NaN');
    });

    test('returns NaN for expired key', () => {
        memory.set('a', 1, 1);
        return new Promise(resolve => {
            setTimeout(() => {
                expect(memory.get('a')).toBe('NaN');
                resolve();
            }, 10);
        });
    });

    test('returns value for non-expired key', () => {
        memory.set('a', 99, 10000);
        expect(memory.get('a')).toBe(99);
    });

    test('deletes expired key from map', () => {
        memory.set('a', 1, 1);
        return new Promise(resolve => {
            setTimeout(() => {
                memory.get('a');
                expect(getLru().map.has('a')).toBe(false);
                resolve();
            }, 10);
        });
    });

    test('moves accessed key to head (MRU)', () => {
        memory.set('a', 1);
        memory.set('b', 2);
        memory.get('a');
        expect(getLru().head.key).toBe('a');
    });
});

describe('DELETE', () => {
    beforeEach(() => {
        getLru().map.clear();
        getLru().head = null;
        getLru().tail = null;
    });

    test('returns OK on existing key', () => {
        memory.set('a', 1);
        expect(memory.delete('a')).toBe('OK');
    });

    test('returns NaN on missing key', () => {
        expect(memory.delete('ghost')).toBe('NaN');
    });

    test('key is no longer accessible after delete', () => {
        memory.set('a', 1);
        memory.delete('a');
        expect(memory.get('a')).toBe('NaN');
    });

    test('removes key from map', () => {
        memory.set('a', 1);
        memory.delete('a');
        expect(getLru().map.has('a')).toBe(false);
    });
});

describe('TTL', () => {
    beforeEach(() => {
        getLru().map.clear();
        getLru().head = null;
        getLru().tail = null;
    });

    test('key without ttl does not expire', () => {
        memory.set('a', 1);
        return new Promise(resolve => {
            setTimeout(() => {
                expect(memory.get('a')).toBe(1);
                resolve();
            }, 50);
        });
    });

    test('key with ttl expires after time', () => {
        memory.set('a', 1, 30);
        return new Promise(resolve => {
            setTimeout(() => {
                expect(memory.get('a')).toBe('NaN');
                resolve();
            }, 32);
        });
    });

    test('key with ttl accessible before expiry', () => {
        memory.set('a', 1, 10000);
        expect(memory.get('a')).toBe(1);
    });

    test('updating key resets ttl', () => {
        memory.set('a', 1, 30);
        return new Promise(resolve => {
            setTimeout(() => {
                memory.set('a', 2, 10000);
                expect(memory.get('a')).toBe(2);
                resolve();
            }, 20);
        });
    });
});

describe('LRU Eviction Order', () => {
    beforeEach(() => {
        getLru().map.clear();
        getLru().head = null;
        getLru().tail = null;
        getLru().size = 3;
    });

    afterEach(() => {
        getLru().size = 10000;
    });

    test('evicts least recently used', () => {
        memory.set('a', 1);
        memory.set('b', 2);
        memory.set('c', 3);
        memory.get('a');
        memory.set('d', 4);
        expect(memory.get('b')).toBe('NaN');
        expect(memory.get('a')).toBe(1);
        expect(memory.get('c')).toBe(3);
        expect(memory.get('d')).toBe(4);
    });

    test('head is most recently used', () => {
        memory.set('a', 1);
        memory.set('b', 2);
        expect(getLru().head.key).toBe('b');
    });

    test('tail is least recently used', () => {
        memory.set('a', 1);
        memory.set('b', 2);
        expect(getLru().tail.key).toBe('a');
    });

    test('map size never exceeds capacity', () => {
        memory.set('a', 1);
        memory.set('b', 2);
        memory.set('c', 3);
        memory.set('d', 4);
        expect(getLru().map.size).toBe(3);
    });
});

describe('Proxy Protection', () => {
    test('new calls always return same object', () => {
        const a = require('../src/main/Memory/MemoryAllocation');
        const b = require('../src/main/Memory/MemoryAllocation');
        expect(a).toBe(b);
    });

    test('exported value has get method', () => {
        expect(typeof memory.get).toBe('function');
    });

    test('exported value has set method', () => {
        expect(typeof memory.set).toBe('function');
    });

    test('exported value has delete method', () => {
        expect(typeof memory.delete).toBe('function');
    });

    test('instance property is not accessible on exported object', () => {
        expect(memory.instance).toBeUndefined();
    });
});