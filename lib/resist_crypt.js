"use strict";

function ResistCrypt() {
  if (false === (this instanceof ResistCrypt)) {
   return new ResistCrypt();
  }
}

ResistCrypt.prototype.encrypt = function (key, value) {
  return value;
}

ResistCrypt.prototype.sign = function (key, value) {
  return value;
}

ResistCrypt.prototype.decrypt = function (peer, key, value) {
  return value;
}

ResistCrypt.prototype.validate = function (peer, key, value) {
  return true;
}

module.exports = ResistCrypt;
