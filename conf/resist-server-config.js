module.exports = {
  "port"           : 80,       // local port
  "gossip_port"    : 7001,     // gossip port
  "gossip_hosts"   : [         // gossip peer seeds
    '127.0.0.1:7000'
  ],
  "cache_timeout"  : 300,      // seconds
  "cache_purge"    : 3600,     // sec before local memory purge
  "cache_type"     : 'redis',  // type of cache
  "cache_nodes"    : {         // cache nodes, addr:port weight
    "10.41.54.144:6379" : 1,
    "10.41.54.149:6379" : 1,
    "10.41.54.153:6379" : 4,
    "10.41.54.158:6379" : 4
  }
};
