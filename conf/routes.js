module.exports = {
  "__default__" : {
    "proxy_host"     : "208.166.57.163", // origin server
    "proxy_port"     : 80,               // remote port to proxy to
    "proxy_xforward" : true,             // true/false xforward
    "proxy_timeout"  : 5000,             // millisecond before timeout
    "proxy_sockets"  : 20000,            // max proxy sockets
  },
  "saltydroid.info" : {
    "proxy_host"     : "208.166.57.163",
    "proxy_port"     : 80,
    "proxy_xforward" : true,
    "proxy_timeout"  : 5000,
    "proxy_sockets"  : 20000,
  },
  "www.saltydroid.info" : {
    "alias"          : "saltydroid.info"
  },
};
