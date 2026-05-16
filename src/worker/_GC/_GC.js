let MemoryAllocation = require("../../main/Memory/MemoryAllocation");

function _GC(){
    let temp = MemoryAllocation.lru.tail;
    while(temp){
        const next = temp.next;
        if(temp.data.ttl && temp.data.time < Date.now()){
            MemoryAllocation.delete(temp.key);
        }
        temp = next;
    }
}
module.exports = _GC;