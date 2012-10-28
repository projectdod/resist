var stub = require("../fixtures/stub");

function ResistCache() {
  if (false === (this instanceof ResistCache)) {
   return new ResistCache();
  }
}

ResistCache.prototype.getReason = stub();
ResistCache.prototype.getCode = stub();
ResistCache.prototype.getHeaders = stub();
ResistCache.prototype.getBody = stub();

module.exports = ResistCache;
