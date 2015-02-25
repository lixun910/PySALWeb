
// Author: xunli at asu.edu

define(function(){

var Env = (function() {
  var inNode = typeof module !== 'undefined' && !!module.exports;
  var inPhantom = !inNode && !!(window.phantom && window.phantom.exit);
  var inBrowser = !inNode; // phantom?
  var ieVersion = inBrowser && /MSIE ([0-9]+)/.exec(navigator.appVersion) && parseInt(RegExp.$1) || NaN;

  return {
    iPhone : inBrowser && !!(navigator.userAgent.match(/iPhone/i)),
    iPad : inBrowser && !!(navigator.userAgent.match(/iPad/i)),
    touchEnabled : inBrowser && ("ontouchstart" in window),
    canvas: inBrowser && !!document.createElement('canvas').getContext,
    inNode : inNode,
    inPhantom : inPhantom,
    inBrowser: inBrowser,
    ieVersion: ieVersion,
    ie: !isNaN(ieVersion)
  };
})();

var Utils = {
  getUniqueName: function(prefix) {
    var n = Utils.__uniqcount || 0;
    Utils.__uniqcount = n + 1;
    return (prefix || "__id_") + n;
  },

  parseUrl: function parseUrl(url) {
    var rxp = /^(http|file|https):\/\/([^\/?#]+)([^?#]*)\??([^#?]*)#?(.*)/,
        matches = rxp.exec(url);
    if (!matches) {
      trace("[Utils.parseUrl()] unable to parse:", url);
      return null;
    }
    return {
      protocol: matches[1],
      host: matches[2],
      path: matches[3],
      query: matches[4],
      hash: matches[5]
    };
  },

  buildUrl: function(obj) {
    var url = "";
    url += (obj.protocol || 'http') + "://";
    url += obj.host || error("buildUrl() Missing host name");
    url += obj.path || "";
    if (obj.query) {
      url += '?' + obj.query;
    }
    if (obj.hash) {
      url += "#" + obj.hash;
    }
    return url;
  },

  keys: function(obj) {
    var arr = [];
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        arr.push(key);
      }
    }
    return arr;
  },

  mapFilter: function(src, func, ctx) {
    var isArray = Utils.isArrayLike(src),
        dest = [],
        retn, keys, key, n;
    if (isArray) {
      n = src.length;
    } else {
      keys = Utils.keys(src);
      n = keys.length;
    }
    for (var i=0; i < n; i++) {
      key = isArray ? i : keys[i];
      retn = func.call(ctx, src[key], key);
      if (retn !== void 0) {
        dest.push(retn);
      }
    }
    return dest;
  },

  map: function(src, func, ctx) {
    var dest = Utils.mapFilter(src, func, ctx);
    if (Utils.isInteger(src.length) && dest.length !== src.length) {
      error("Utils.map() Sparse array; use Utils.mapFilter()");
    }
    return dest;
  },

  // Convert an array-like object to an Array, or make a copy if @obj is an Array
  toArray: function(obj) {
    var arr;
    if (!Utils.isArrayLike(obj)) error("Utils.toArray() requires an array-like object");
    try {
      arr = Array.prototype.slice.call(obj, 0); // breaks in ie8
    } catch(e) {
      // support ie8
      arr = [];
      for (var i=0, n=obj.length; i<n; i++) {
        arr[i] = obj[i];
      }
    }
    return arr;
  },

  // Array like: has length property, is numerically indexed and mutable.
  // TODO: try to detect objects with length property but no indexed data elements
  isArrayLike: function(obj) {
    if (!obj) return false;
    if (Utils.isArray(obj)) return true;
    if (Utils.isString(obj)) return false;
    if (obj.length === 0) return true;
    if (obj.length > 0) return true;
    return false;
  },

  isFunction: function(obj) {
    return typeof obj == 'function';
  },

  isObject: function(obj) {
    return obj === Object(obj); // via underscore
  },

  isArray: function(obj) {
    return obj instanceof Array; // breaks across iframes
    // More robust:
    // return Object.constructor.toString.call(obj) == '[object Array]';
  },

  // NaN -> true
  isNumber: function(obj) {
    // return toString.call(obj) == '[object Number]'; // ie8 breaks?
    return obj != null && obj.constructor == Number;
  },

  isInteger: function(obj) {
    return Utils.isNumber(obj) && ((obj | 0) === obj);
  },

  isString: function(obj) {
    return obj != null && obj.toString === String.prototype.toString;
    // TODO: replace w/ something better.
  },

  isBoolean: function(obj) {
    return obj === true || obj === false;
  },

  clamp: function(val, min, max) {
    return val < min ? min : (val > max ? max : val);
  },

  interpolate: function(val1, val2, pct) {
    return val1 * (1-pct) + val2 * pct;
  },

  getFunctionName: function(f) {
    var matches = String(f).match(/^function ([^(]+)\(/);
    return matches && matches[1] || "";
  },

  // TODO: handle array output and/or multiple arguments
  //
  memoize: function(func, ctx) {
    var index = {},
        memos = 0;
    var f = function(arg) {
      if (arguments.length != 1 || (typeof arg == 'object')) error("[memoize] only works with one-arg functions that take strings or numbers");
      if (arg in index) {
        return index[arg];
      }
      if (memos++ > 1000) { // tweening groups of things might generate lots of values
        index = {};
      }
      return index[arg] = func.call(ctx, arg);
    };
    return f;
  },

  bind: function(func, ctx) {
    return function() {
      return func.apply(ctx, Utils.toArray(arguments));
    };
  },

  log: function(msg) {
    if (Env.inNode) {
      process.stderr.write(msg + '\n'); // node messages to stdout
    }
    else if (typeof console != "undefined" && console.log) {
      if (console.log.call) {
        console.log.call(console, msg); // Required by ____.
      }
      else {
        console.log(msg);
      }
    }
  },

  // Display string representation of an object, for logging, etc.
  // Functions and some objects are converted into a string label.
  //
  toString: function(obj, quoteString) {
    var type = typeof obj,
        str;
    if (type == 'function') {
      str = '"[' + (Utils.getFunctionName(obj) || 'function') + '()]"';
    } else if (obj == null || Utils.isNumber(obj) || Utils.isBoolean(obj)) {
      str = String(obj);
    } else if (Utils.isArray(obj) || obj.byteLength > 0) { // handle typed arrays (with bytelength property)
      str = '[' + Utils.map(obj, function(o) {return Utils.toString(o, true);}).join(', ') + ']';
    } else if (obj.constructor == Object) { // Show properties of Object instances.
      var parts = [];
      for (var key in obj) {
        var keyStr = /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : '"' + Utils.addslashes(key) + '"';
        parts.push( keyStr + ':' + Utils.toString(obj[key], true));
      }
      str = '{' + parts.join(', ') + '}';
    } else if (obj.nodeName) { //
      str = '"[' + obj.nodeName + (obj.id ? " id=" + obj.id : "") + ']"';
    }
    // User-defined objects without a toString() method: Try to get function name from constructor function.
    // Can't assume objects have hasOwnProperty() function (e.g. HTML nodes don't in ie <= 8)
    else if (type == 'object' && obj.toString === Object.prototype.toString) {
      str = '"[' + (Utils.getFunctionName(obj.constructor) || "unknown object") + ']"';
    } else {
      // strings and objects with own "toString" methods.
      str = String(obj);
      if (quoteString) {
        str = '"' + Utils.addslashes(str) + '"';
      }
    }
    return str;
  },

  // Convert an object to a string, for logging
  strval: function(o) {
    var str = Utils.toString(o),
        max = 800;
    if (str.length > max) {
      str = str.substr(0, max - 4) + " ...";
    }
    return str;
  },

  // Convert an object to a string that can be parsed as JavaScript
  serialize: function(o) {
    return Utils.toString(o, true);
  },

  // See https://raw.github.com/kvz/phpjs/master/functions/strings/addslashes.js
  addslashes: function(str) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
  },

  /**
   * Escape a literal string to use in a regexp.
   * Ref.: http://simonwillison.net/2006/Jan/20/escape/
   */
  regexEscape: function(str) {
    return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  },

  flatten: function(src) {
    var obj = {};
    for (var k in src) {
      obj[k] = src[k];
    }
    return obj;
  },

  defaults: function(dest) {
    for (var i=1, n=arguments.length; i<n; i++) {
      var src = arguments[i] || {};
      for (var key in src) {
        if (key in dest === false && src.hasOwnProperty(key)) {
          dest[key] = src[key];
        }
      }
    }
    return dest;
  },

  extend: function(dest) {
    for (var i=1, n=arguments.length; i<n; i++) {
      var src = arguments[i] || {};
      for (var key in src) {
        if (src.hasOwnProperty(key)) {
          dest[key] = src[key];
        }
      }
    }
    return dest;
  }
};


Utils.findRankByValue = function(arr, value) {
  if (isNaN(value)) return arr.length;
  var rank = 1;
  for (var i=0, n=arr.length; i<n; i++) {
    if (value > arr[i]) rank++;
  }
  return rank;
}

Utils.findValueByPct = function(arr, pct) {
  var rank = Math.ceil((1-pct) * (arr.length));
  return Utils.findValueByRank(arr, rank);
};

// See http://ndevilla.free.fr/median/median/src/wirth.c
// Elements of @arr are reordered
//
Utils.findValueByRank = function(arr, rank) {
  if (!arr.length || rank < 1 || rank > arr.length) error("[findValueByRank()] invalid input");

  rank = Utils.clamp(rank | 0, 1, arr.length);
  var k = rank - 1, // conv. rank to array index
      n = arr.length,
      l = 0,
      m = n - 1,
      i, j, val, tmp;

  while (l < m) {
    val = arr[k];
    i = l;
    j = m;
    do {
      while (arr[i] < val) {i++;}
      while (val < arr[j]) {j--;}
      if (i <= j) {
        tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
        i++;
        j--;
      }
    } while (i <= j);
    if (j < k) l = i;
    if (k < i) m = j;
  }
  return arr[k];
};

//
//
Utils.findMedian = function(arr) {
  var n = arr.length,
      rank = Math.floor(n / 2) + 1,
      median = Utils.findValueByRank(arr, rank);
  if ((n & 1) == 0) {
    median = (median + Utils.findValueByRank(arr, rank - 1)) / 2;
  }
  return median;
};

// Test a string or array-like object for existence of substring or element
Utils.contains = function(container, item) {
  if (Utils.isString(container)) {
    return container.indexOf(item) != -1;
  }
  else if (Utils.isArrayLike(container)) {
    return Utils.indexOf(container, item) != -1;
  }
  error("Expected Array or String argument");
};


Utils.indexOf = function(arr, item, prop) {
  if (prop) error("Utils.indexOf() No longer supports property argument");
  var nan = !(item === item);
  for (var i = 0, len = arr.length || 0; i < len; i++) {
    if (arr[i] === item) return i;
    if (nan && !(arr[i] === arr[i])) return i;
  }
  return -1;
};
// Parse the path to a file
// Assumes: not a directory path
Utils.parseLocalPath = function(path) {
  var obj = {},
      parts = path.split('/'), // TODO: fix
      i;

  if (parts.length == 1) {
    obj.filename = parts[0];
    obj.directory = "";
  } else {
    obj.filename = parts.pop();
    obj.directory = parts.join('/');
  }
  i = obj.filename.lastIndexOf('.');
  if (i > -1) {
    obj.extension = obj.filename.substr(i + 1);
    obj.basename = obj.filename.substr(0, i);
    obj.pathbase = path.substr(0, path.lastIndexOf('.'));
  } else {
    obj.extension = "";
    obj.basename = obj.filename;
    obj.pathbase = path;
  }
  return obj;
};

Utils.getFileBase = function(path) {
  return Utils.parseLocalPath(path).basename;
};

Utils.getFileExtension = function(path) {
  return Utils.parseLocalPath(path).extension;
};

Utils.getPathBase = function(path) {
  return Utils.parseLocalPath(path).pathbase;
};

Utils.guessFileType = function(file) {
  var ext = Utils.getFileExtension(file).toLowerCase(),
      type = null;
  if (file == '/dev/stdin') {
    type = 'json';
  } else if (/json$/i.test(file)) {
    type = 'json';
  } else if (ext == 'shp' || ext == 'dbf' || ext == 'prj') {
    type = ext;
  }
  return type;
};

Utils.guessFileFormat = function(file, inputFormat) {
  var type = MapShaper.guessFileType(file),
      format = null;
  if (type == 'shp') {
    format = 'shapefile';
  } else if (type == 'json') {
    if (/geojson$/.test(file)) {
      format = 'geojson';
    } else if (/topojson$/.test(file) || inputFormat == 'topojson') {
      format = 'topojson';
    } else {
      format = 'geojson';
    }
  }
  return format;
};
// Wrapper for DataView class for more convenient reading and writing of
//   binary data; Remembers endianness and read/write position.
// Has convenience methods for copying from buffers, etc.
//
function BinArray(buf, le) {
  if (Utils.isNumber(buf)) {
    buf = new ArrayBuffer(buf);
  } else if (Env.inNode && buf instanceof Buffer == true) {
    // Since node 0.10, DataView constructor doesn't accept Buffers,
    //   so need to copy Buffer to ArrayBuffer
    buf = BinArray.toArrayBuffer(buf);
  }
  if (buf instanceof ArrayBuffer == false) {
    error("BinArray constructor takes an integer, ArrayBuffer or Buffer argument");
  }
  this._buffer = buf;
  this._bytes = new Uint8Array(buf);
  this._view = new DataView(buf);
  this._idx = 0;
  this._le = le !== false;
}

BinArray.bufferToUintArray = function(buf, wordLen) {
  if (wordLen == 4) return new Uint32Array(buf);
  if (wordLen == 2) return new Uint16Array(buf);
  if (wordLen == 1) return new Uint8Array(buf);
  error("BinArray.bufferToUintArray() invalid word length:", wordLen)
};

BinArray.uintSize = function(i) {
  return i & 1 || i & 2 || 4;
};

BinArray.bufferCopy = function(dest, destId, src, srcId, bytes) {
  srcId = srcId || 0;
  bytes = bytes || src.byteLength - srcId;
  if (dest.byteLength - destId < bytes)
    error("Buffer overflow; tried to write:", bytes);

  // When possible, copy buffer data in multi-byte chunks... Added this for faster copying of
  // shapefile data, which is aligned to 32 bits.
  var wordSize = Math.min(BinArray.uintSize(bytes), BinArray.uintSize(srcId),
      BinArray.uintSize(dest.byteLength), BinArray.uintSize(destId),
      BinArray.uintSize(src.byteLength));

  var srcArr = BinArray.bufferToUintArray(src, wordSize),
      destArr = BinArray.bufferToUintArray(dest, wordSize),
      count = bytes / wordSize,
      i = srcId / wordSize,
      j = destId / wordSize;

  while (count--) {
    destArr[j++] = srcArr[i++];
  }
  return bytes;
};

BinArray.toArrayBuffer = function(src) {
  var n = src.length,
      dest = new ArrayBuffer(n),
      view = new Uint8Array(dest);
  for (var i=0; i<n; i++) {
      view[i] = src[i];
  }
  return dest;
};

// Return length in bytes of an ArrayBuffer or Buffer
//
BinArray.bufferSize = function(buf) {
  return (buf instanceof ArrayBuffer ?  buf.byteLength : buf.length | 0);
};

Utils.buffersAreIdentical = function(a, b) {
  var alen = BinArray.bufferSize(a);
  var blen = BinArray.bufferSize(b);
  if (alen != blen) {
    return false;
  }
  for (var i=0; i<alen; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

BinArray.prototype = {
  size: function() {
    return this._buffer.byteLength;
  },

  littleEndian: function() {
    this._le = true;
    return this;
  },

  bigEndian: function() {
    this._le = false;
    return this;
  },

  buffer: function() {
    return this._buffer;
  },

  bytesLeft: function() {
    return this._buffer.byteLength - this._idx;
  },

  skipBytes: function(bytes) {
    this._idx += (bytes + 0);
    return this;
  },

  readUint8: function() {
    return this._bytes[this._idx++];
  },

  writeUint8: function(val) {
    this._bytes[this._idx++] = val;
    return this;
  },

  readInt8: function() {
    return this._view.getInt8(this._idx++);
  },

  writeInt8: function(val) {
    this._view.setInt8(this._idx++, val);
    return this;
  },

  readUint16: function() {
    var val = this._view.getUint16(this._idx, this._le);
    this._idx += 2;
    return val;
  },

  writeUint16: function(val) {
    this._view.setUint16(this._idx, val, this._le);
    this._idx += 2;
    return this;
  },

  readUint32: function() {
    var val = this._view.getUint32(this._idx, this._le);
    this._idx += 4;
    return val;
  },

  writeUint32: function(val) {
    this._view.setUint32(this._idx, val, this._le);
    this._idx += 4;
    return this;
  },

  readInt32: function() {
    var val = this._view.getInt32(this._idx, this._le);
    this._idx += 4;
    return val;
  },

  writeInt32: function(val) {
    this._view.setInt32(this._idx, val, this._le);
    this._idx += 4;
    return this;
  },

  readFloat64: function() {
    var val = this._view.getFloat64(this._idx, this._le);
    this._idx += 8;
    return val;
  },

  writeFloat64: function(val) {
    this._view.setFloat64(this._idx, val, this._le);
    this._idx += 8;
    return this;
  },

  // Returns a Float64Array containing @len doubles
  //
  readFloat64Array: function(len) {
    var bytes = len * 8,
        i = this._idx,
        buf = this._buffer,
        arr;
    // Inconsistent: first is a view, second a copy...
    if (i % 8 === 0) {
      arr = new Float64Array(buf, i, len);
    } else if (buf.slice) {
      arr = new Float64Array(buf.slice(i, i + bytes));
    } else { // ie10, etc
      var dest = new ArrayBuffer(bytes);
      BinArray.bufferCopy(dest, 0, buf, i, bytes);
      arr = new Float64Array(dest);
    }
    this._idx += bytes;
    return arr;
  },

  readUint32Array: function(len) {
    var arr = [];
    for (var i=0; i<len; i++) {
      arr.push(this.readUint32());
    }
    return arr;
  },

  peek: function() {
    return this._view.getUint8(this._idx);
  },

  position: function(i) {
    if (i != null) {
      this._idx = i;
      return this;
    }
    return this._idx;
  },

  readCString: function(fixedLen, asciiOnly) {
    var str = "",
        count = fixedLen >= 0 ? fixedLen : this.bytesLeft();
    while (count > 0) {
      var byteVal = this.readUint8();
      count--;
      if (byteVal == 0) {
        break;
      } else if (byteVal > 127 && asciiOnly) {
        str = null;
        break;
      }
      str += String.fromCharCode(byteVal);
    }

    if (fixedLen > 0 && count > 0) {
      this.skipBytes(count);
    }
    return str;
  },

  writeString: function(str, maxLen) {
    var bytesWritten = 0,
        charsToWrite = str.length,
        cval;
    if (maxLen) {
      charsToWrite = Math.min(charsToWrite, maxLen);
    }
    for (var i=0; i<charsToWrite; i++) {
      cval = str.charCodeAt(i);
      if (cval > 127) {
        trace("#writeCString() Unicode value beyond ascii range")
        cval = '?'.charCodeAt(0);
      }
      this.writeUint8(cval);
      bytesWritten++;
    }
    return bytesWritten;
  },

  writeCString: function(str, fixedLen) {
    var maxChars = fixedLen ? fixedLen - 1 : null,
        bytesWritten = this.writeString(str, maxChars);

    this.writeUint8(0); // terminator
    bytesWritten++;

    if (fixedLen) {
      while (bytesWritten < fixedLen) {
        this.writeUint8(0);
        bytesWritten++;
      }
    }
    return this;
  },

  writeBuffer: function(buf, bytes, startIdx) {
    this._idx += BinArray.bufferCopy(this._buffer, this._idx, buf, startIdx, bytes);
    return this;
  }

  /*
  // TODO: expand buffer, probably via a public method, not automatically
  //
  _grow: function(k) {
    var fac = k > 1 && k <= 3 ? k : 1.7,
        srcLen = this.bufferSize(),
        destLen = Math.round(srcLen * fac),
        buf = new ArrayBuffer(destLen);
    var src = new Uint8Array(this._buffer),
        dest = new Uint8Array(buf);
    for (var i=0; i<srcLen; i++) {
      dest[i] = src[i];
    }
    this._buffer = buf;
    this._view = new DataView(buf);
  },*/
};
var error = function() {
  var msg = Utils.map(arguments, Utils.strval).join(' ');
  throw new Error(msg);
};

var ShpType = {
  NULL: 0,
  POINT: 1,
  POLYLINE: 3,
  POLYGON: 5,
  MULTIPOINT: 8,
  POINTZ: 11,
  POLYLINEZ: 13,
  POLYGONZ: 15,
  MULTIPOINTZ: 18,
  POINTM: 21,
  POLYLINEM: 23,
  POLYGONM: 25,
  MULIPOINTM: 28,
  MULTIPATCH: 31 // not supported
};

ShpType.isPolygonType = function(t) {
  return t == 5 || t == 15 || t == 25;
};

ShpType.isPolylineType = function(t) {
  return t == 3 || t == 13 || t == 23;
};

ShpType.isMultiPartType = function(t) {
  return ShpType.isPolygonType(t) || ShpType.isPolylineType(t);
};

ShpType.isMultiPointType = function(t) {
  return t == 8 || t == 18 || t == 28;
};

ShpType.isZType = function(t) {
  return Utils.contains([11,13,15,18], t);
};

ShpType.isMType = function(t) {
  return ShpType.isZType(t) || Utils.contains([21,23,25,28], t);
};

ShpType.hasBounds = function(t) {
  return ShpType.isMultiPartType(t) || ShpType.isMultiPointType(t);
};


// Read data from a .shp file
// @src is an ArrayBuffer, Node.js Buffer or filename
//
//    // Example: read everthing into nested arrays
//    // coordinates are read as 2-4 element arrays [x,y(,z,m)]
//    // nested in arrays for shapes, parts and line-strings depending on the type
//    var reader = new ShpReader("file.shp");
//    var data = reader.read();
//
//    // Example: iterating using #nextShape()
//    var reader = new ShpReader(buf), s;
//    while (s = reader.nextShape()) {
//      // process the raw coordinate data yourself...
//      var coords = s.readCoords(); // [[x,y,x,y,...], ...] Array of parts
//      var zdata = s.readZ();  // [z,z,...]
//      var mdata = s.readM();  // [m,m,...] or null
//      // .. or read the shape into nested arrays
//      var data = s.read();
//    }
//
//    // Example: reading records using a callback
//    var reader = new ShpReader(buf);
//    reader.forEachShape(function(s) {
//      var data = s.read();
//    });
//
function ShpReader(src) {
  var file = new BufferBytes(src);
  var header = parseHeader(file.readBytes(100, 0));
  var RecordClass = ShpReader.getRecordClass(header.type);
  var recordOffs = 100;
  
  var points = [];
  var arcs = [];
  var arc_dict = {};
  var shapes = [];
  var pt_dict = {};
  var queen_dict = {};
  var nn = 0;
  
  this.header = function() {
    return header;
  };

  this.reset = function() {
    RecordClass = this.getRecordClass();
  };

  // return data as nested arrays of shapes > parts > points > [x,y(,z,m)]
  this._read = function() {
    var shapes = [];
    this.forEachShape(function(shp) {
      shapes.push(shp.isNull ? null : shp.read());
    });
    
    return shapes;
  };

  this.addPoint = function(x, y, polyid) {
    if (queen_dict[[x,y]]) {
      queen_dict[[x,y]][polyid] = null;
    } else {
      queen_dict[[x,y]] = {polyid:null};
    }
    
    if (pt_dict[x]) {
      if (pt_dict[x][y]) {
        return pt_dict[x][y];
      } else {
        points.push([x,y]);
        pt_dict[x][y] = nn;
        return nn++;
      }
    } else {
      pt_dict[x] = {};
      pt_dict[x][y] = nn;
      points.push([x,y]);
      return nn++;   
    }
  };
  
  this.addArc = function(pt1, pt2, polyid) {
    if (arc_dict[[pt1, pt2]]) {
      arc_dict[[pt1, pt2]][polyid] = null;
    } else if (arc_dict[[pt2, pt1]]) {
      arc_dict[[pt2, pt1]][polyid] = null;
    } else {
      arc_dict[[pt1, pt2]] = {};
      arc_dict[[pt1, pt2]][polyid] = null;
    }
  };
  
  this.read = function(prj) {
    // check if already read
    if (shapes.length > 0) return shapes;
    
    var shpType = this.type(),
        shp,
        obj,
        shpIdx = 0,
        x, y, ptIdx, nPts, arc, arcs;
        
    while (shp = this.nextShape() ) { 
      obj = shp.read();
      if (shpType === ShpType.POINT || shpType === ShpType.POINTZ || shpType === ShpType.POINTM ) {
        x = obj[0];
        y = obj[1];
        ptIdx = this.addPoint(x,y,shpIdx);
        shapes.push(ptIdx);
        
      }  else if (shpType === ShpType.POLYLINE || shpType === ShpType.POLYGON ||
        shpType === ShpType.MULTIPOINT || shpType === ShpType.POLYLINEM ||
        shpType === shpType.POLYLINEZ || shpType === ShpType.POLYGONM ||
        shpType === shpType.MULIPOINTZ )  {
  
        arcs = [];     
        for (var p=0; p < shp.partCount; p++)  {
          arc = [];
          part = obj[p];
          nPts = part.length;
          
          for (var i=0; i<nPts; i++) {
            x = part[i][0];
            y = part[i][1];
            ptIdx = this.addPoint(x,y,shpIdx);
            arc.push(ptIdx);
          }
         
          for (var i=0; i<nPts-1; i++)  {
            this.addArc(arc[i], arc[i+1], shpIdx);
          }
          
          if (shp.partCount <= 1) {
            shapes.push(arc);
          } else {
            arcs.push(arc);
          }
        } 
        if (shp.partCount > 1) {
          shapes.push(arcs);
        }
      }      
      shpIdx += 1;
    } 
    
    return shapes;
  };
  
  this.getQueenDict = function() {
    if (this.queen_dict === undefined) {
      var shp;
      while (shp = this.shpReader.nextShape() ) { 
        if (shpType == 1 || shpType == 11 || shpType == 21 || shpType == 28) {
          this.shpTdype = 'Point'; 
        } else if (shpType == 5 || shpType == 15 || shpType == 25) {
          this.shpType = 'Polygon'; 
        } else {
          this.shpType = 'Line'; 
        }
      }
    }
    return this.queen_dict;
  };
  
  // Callback interface: for each record in a .shp file, pass a
  //   record object to a callback function
  //
  this.forEachShape = function(callback) {
    var shape = this.nextShape();
    while (shape) {
      callback(shape);
      shape = this.nextShape();
    }
  };

  // Iterator interface for reading shape records
  this.nextShape = function() {
    var fileSize = file.size(),
        recordSize,
        shape = null,
        bin;

    if (recordOffs + 8 < fileSize) {
      bin = file.readBytes(8, recordOffs);
      // byteLen is bytes in content section + 8 header bytes
      recordSize = bin.bigEndian().skipBytes(4).readUint32() * 2 + 8;
      // todo: what if size is 0
      if (recordOffs + recordSize <= fileSize && recordSize >= 12) {
        bin = file.readBytes(recordSize, recordOffs);
        recordOffs += recordSize;
        shape = new RecordClass(bin);
      } else {
        trace("Unaccounted bytes in .shp file -- possible corruption");
      }
    }

    if (shape === null) {
      file.close();
      recordOffs = 100;
    }

    return shape;
  };

  function finishReading() {

  }

  function parseHeader(bin) {
    var header = {
      signature: bin.bigEndian().readUint32(),
      byteLength: bin.skipBytes(20).readUint32() * 2,
      version: bin.littleEndian().readUint32(),
      type: bin.readUint32(),
      bounds: bin.readFloat64Array(4), // xmin, ymin, xmax, ymax
      zbounds: bin.readFloat64Array(2),
      mbounds: bin.readFloat64Array(2)
    };

    if (header.signature != 9994)
      error("Not a valid .shp file");

    var supportedTypes = [1,3,5,8,11,13,15,18,21,23,25,28];
    if (!Utils.contains(supportedTypes, header.type))
      error("Unsupported .shp type:", header.type);

    if (header.byteLength != file.size())
      error("File size doesn't match size in header");

    return header;
  }
}

ShpReader.prototype.type = function() {
  return this.header().type;
};

ShpReader.prototype.getCounts = function() {
  var counts = {
    nullCount: 0,
    partCount: 0,
    shapeCount: 0,
    pointCount: 0
  };
  this.forEachShape(function(shp) {
    if (shp.isNull) counts.nullCount++;
    counts.pointCount += shp.pointCount;
    counts.partCount += shp.partCount;
    counts.shapeCount++;
  });
  return counts;
};

// Returns a constructor function for a shape record class with
//   properties and methods for reading data.
//
// Record properties
//   type, isNull, byteLength, pointCount, partCount (all types)
//
// Record methods
//   read(), readPoints() (all types)
//   readBounds(), readCoords()  (all but single point types)
//   readPartSizes() (polygon and polyline types)
//   readZBounds(), readZ() (Z types except POINTZ)
//   readMBounds(), readM(), hasM() (M and Z types, except POINT[MZ])
//
ShpReader.getRecordClass = function(type) {
  var hasBounds = ShpType.hasBounds(type),
      hasParts = ShpType.isMultiPartType(type),
      hasZ = ShpType.isZType(type),
      hasM = ShpType.isMType(type),
      singlePoint = !hasBounds,
      mzRangeBytes = singlePoint ? 0 : 16;

  // @bin is a BinArray set to the first byte of a shape record
  //
  var constructor = function ShapeRecord(bin) {
    var pos = bin.position();
    this.id = bin.bigEndian().readUint32();
    this.byteLength = bin.readUint32() * 2 + 8; // bytes in content section + 8 header bytes
    this.type = bin.littleEndian().readUint32();
    this.isNull = this.type === 0;
    if (this.byteLength <= 0 || this.type !== 0 && this.type != type)
      error("Unable to read a shape -- .shp file may be corrupted");

    if (this.isNull) {
      this.pointCount = 0;
      this.partCount = 0;
    } else if (singlePoint) {
      this.pointCount = 1;
      this.partCount = 1;
    } else {
      //bin.skipBytes(32); // skip bbox
      this.bbox = bin.readFloat64Array(4);
      this.partCount = hasParts ? bin.readUint32() : 1;
      this.pointCount = bin.readUint32();
    }
    this._data = function() {
      return this.isNull ? null : bin.position(pos);
    };
  };

  // functions for all types
  var proto = {
    // return offset of [x, y] point data in the record
    _xypos: function() {
      var offs = 12; // skip header & record type
      if (!singlePoint) offs += 4; // skip point count
      if (hasBounds) offs += 32;
      if (hasParts) offs += 4 * this.partCount + 4; // skip part count & index
      return offs;
    },

    readCoords: function() {
      if (this.pointCount === 0) return null;
      var partSizes = this.readPartSizes(),
          xy = this._data().skipBytes(this._xypos());

      return partSizes.map(function(pointCount) {
        return xy.readFloat64Array(pointCount * 2);
      });
    },

    readXY: function() {
      if (this.pointCount === 0) return null;
      return this._data().skipBytes(this._xypos()).readFloat64Array(this.pointCount * 2);
    },

    readPoints: function() {
      var xy = this.readXY(),
          zz = hasZ ? this.readZ() : null,
          mm = hasM && this.hasM() ? this.readM() : null,
          points = [], p;

      for (var i=0, n=xy.length / 2; i<n; i++) {
        p = [xy[i*2], xy[i*2+1]];
        if (zz) p.push(zz[i]);
        if (mm) p.push(mm[i]);
        points.push(p);
      }
      return points;
    },

    read: function() {
      return this.readPoints();
    },

    readPartSizes: function() {
      if (this.pointCount === 0) return null;
      if (this.partCount == 1) return [this.pointCount];
      var partLen,
          startId = 0,
          sizes = [],
          bin = this._data().skipBytes(56); // skip to second entry in part index
      for (var i=0, n=this.partCount; i<n; i++) {
        if (i < n - 1)
          partLen = bin.readUint32() - startId;
        else
          partLen = this.pointCount - startId;

        if (partLen <= 0) error("ShapeRecord#readPartSizes() corrupted part");
        sizes.push(partLen);
        startId += partLen;
      }
      return sizes;
    }
  };

  var singlePointProto = {
    /*
    hasM: function() {
      return this.byteLength == 12 + (hasZ ? 30 : 24); // size with M
    },
    */

    read: function() {
      var n = 2;
      if (hasZ) n++;
      //if (this.hasM()) n++;
      return this._data().skipBytes(12).readFloat64Array(n);
    }
  };

  var multiCoordProto = {
    readBounds: function() {
      return this._data().skipBytes(12).readFloat64Array(4);
    },

    read: function() {
      var points = this.readPoints();
      var parts = Utils.map(this.readPartSizes(), function(size) {
          return points.splice(0, size);
        });
      return parts;
    }
  };

  var mProto = {
    _mpos: function() {
      var pos = this._xypos() + this.pointCount * 16;
      if (hasZ) {
        pos += this.pointCount * 8 + mzRangeBytes;
      }
      return pos;
    },

    readMBounds: function() {
      return this.hasM() ? this._data().skipBytes(this._mpos()).readFloat64Array(2) : null;
    },

    // TODO: group into parts, like readCoords()
    readM: function() {
      return this.hasM() ? this._data().skipBytes(this._mpos() + mzRangeBytes).readFloat64Array(this.pointCount) : null;
    },

    // Test if this record contains M data
    // (according to the Shapefile spec, M data is optional in a record)
    //
    hasM: function() {
      var bytesWithoutM = this._mpos(),
          bytesWithM = bytesWithoutM + this.pointCount * 8 + mzRangeBytes;
      if (this.byteLength == bytesWithoutM) {
        return false;
      } else if (this.byteLength == bytesWithM) {
        return true;
      } else {
        error("#hasM() Counting error");
      }
    }
  };

  var zProto = {
    _zpos: function() {
      return this._xypos() + this.pointCount * 16;
    },

    readZBounds: function() {
      return this._data().skipBytes(this._zpos()).readFloat64Array(2);
    },

    // TODO: group into parts, like readCoords()
    readZ: function() {
      return this._data().skipBytes(this._zpos() + mzRangeBytes).readFloat64Array(this.pointCount);
    }
  };

  if (singlePoint) {
    Utils.extend(proto, singlePointProto);
  } else {
    Utils.extend(proto, multiCoordProto);
  }
  if (hasZ) Utils.extend(proto, zProto);
  if (hasM) Utils.extend(proto, mProto);

  constructor.prototype = proto;
  proto.constructor = constructor;
  return constructor;
};

function BufferBytes(buf) {
  var bin = new BinArray(buf),
      bufSize = bin.size();
  this.readBytes = function(len, offset) {
    if (bufSize < offset + len) error("Out-of-range error");
    bin.position(offset);
    return bin;
  };

  this.size = function() {
    return bufSize;
  };

  this.close = function() {};
}

function FileBytes(path) {
  var DEFAULT_BUF_SIZE = 0xffffff, // 16 MB
      fs = require('fs'),
      fileSize = Node.fileSize(path),
      cacheOffs = 0,
      cache, fd;

  this.readBytes = function(len, start) {
    if (fileSize < start + len) error("Out-of-range error");
    if (!cache || start < cacheOffs || start + len > cacheOffs + cache.size()) {
      updateCache(len, start);
    }
    cache.position(start - cacheOffs);
    return cache;
  };

  this.size = function() {
    return fileSize;
  };

  this.close = function() {
    if (fd) {
      fs.closeSync(fd);
      fd = null;
      cache = null;
      cacheOffs = 0;
    }
  };

  function updateCache(len, start) {
    var headroom = fileSize - start,
        bufSize = Math.min(headroom, Math.max(DEFAULT_BUF_SIZE, len)),
        buf = new Buffer(bufSize),
        bytesRead;
    if (!fd) fd = fs.openSync(path, 'r');
    bytesRead = fs.readSync(fd, buf, 0, bufSize, start);
    if (bytesRead < bufSize) error("Error reading file");
    cacheOffs = start;
    cache = new BinArray(buf);
  }
}  

return ShpReader;

});

