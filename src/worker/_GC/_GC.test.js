const MemoryAllocation = require("../../main/Memory/MemoryAllocation");
const _GC = require("./_GC");

function resetCache(){
    let temp = MemoryAllocation.lru.tail;
    while(temp){
        const next = temp.next;
        MemoryAllocation.delete(temp.key);
        temp = next;
    }
}

beforeEach(() => {
    resetCache();
});

describe("_GC Edge Case Tests", () => {

    test("Case 1: GC on empty cache does not crash", () => {
        expect(() => _GC()).not.toThrow();
    });

    test("Case 2: Single expired node deleted", async () => {
        MemoryAllocation.set(1, "val1", 100);
        await new Promise(r => setTimeout(r, 200));
        _GC();
        expect(MemoryAllocation.lru.map.size).toBe(0);
    });

    test("Case 3: Single node without ttl survives GC", () => {
        MemoryAllocation.set(1, "val1");
        _GC();
        expect(MemoryAllocation.lru.map.size).toBe(1);
        expect(MemoryAllocation.lru.map.has(1)).toBe(true);
    });

    test("Case 4: All nodes expired, cache is empty", async () => {
        MemoryAllocation.set(1, "val1", 100);
        MemoryAllocation.set(2, "val2", 100);
        MemoryAllocation.set(3, "val3", 100);
        await new Promise(r => setTimeout(r, 200));
        _GC();
        expect(MemoryAllocation.lru.map.size).toBe(0);
    });

    test("Case 5: No nodes expired, all survive", () => {
        MemoryAllocation.set(1, "val1", 10000);
        MemoryAllocation.set(2, "val2", 10000);
        MemoryAllocation.set(3, "val3", 10000);
        _GC();
        expect(MemoryAllocation.lru.map.size).toBe(3);
    });

    test("Case 6: Only expired node deleted in mixed cache", async () => {
        MemoryAllocation.set(1, "val1", 100);
        MemoryAllocation.set(2, "val2");
        MemoryAllocation.set(3, "val3", 10000);
        await new Promise(r => setTimeout(r, 200));
        _GC();
        expect(MemoryAllocation.lru.map.size).toBe(2);
        expect(MemoryAllocation.lru.map.has(1)).toBe(false);
        expect(MemoryAllocation.lru.map.has(2)).toBe(true);
        expect(MemoryAllocation.lru.map.has(3)).toBe(true);
    });

    test("Case 7: Head expired, tail survives", async () => {
        MemoryAllocation.set(1, "val1", 10000);
        MemoryAllocation.set(2, "val2", 100);
        await new Promise(r => setTimeout(r, 200));
        _GC();
        expect(MemoryAllocation.lru.map.size).toBe(1);
        expect(MemoryAllocation.lru.map.has(1)).toBe(true);
        expect(MemoryAllocation.lru.map.has(2)).toBe(false);
    });

    test("Case 8: Tail expired, head survives", async () => {
        MemoryAllocation.set(1, "val1", 100);
        MemoryAllocation.set(2, "val2", 10000);
        await new Promise(r => setTimeout(r, 200));
        _GC();
        expect(MemoryAllocation.lru.map.size).toBe(1);
        expect(MemoryAllocation.lru.map.has(2)).toBe(true);
        expect(MemoryAllocation.lru.map.has(1)).toBe(false);
    });

    test("Case 9: GC called twice, no crash on double run", async () => {
        MemoryAllocation.set(1, "val1", 100);
        await new Promise(r => setTimeout(r, 200));
        expect(() => {
            _GC();
            _GC();
        }).not.toThrow();
        expect(MemoryAllocation.lru.map.size).toBe(0);
    });

    test("Case 10: Re-set refreshed TTL, node survives GC", async () => {
        MemoryAllocation.set(1, "val1", 100);
        MemoryAllocation.set(1, "val1", 10000);
        await new Promise(r => setTimeout(r, 200));
        _GC();
        expect(MemoryAllocation.lru.map.size).toBe(1);
        expect(MemoryAllocation.lru.map.has(1)).toBe(true);
    });

});