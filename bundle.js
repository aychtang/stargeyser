(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Client code that handles users GitHub "search" requests, and reactively
// displays data that is returned from github module.
var currentUser;

var Rx = require('rx');
var github = require('./lib/github');
var partial = require('partial');
var _ = require('lodash');
var moment = require('moment');

var input = document.querySelector('.js-input');
var list = document.querySelector('.js-repo-list');
var descriptionEl = document.querySelector('.js-description');

// We want to cache user repo info + descriptions locally as we receive them,
// eliminating unneeded repeat calls of the GitHub API.
var storeUserInfo = function(name, data) {
  localStorage.setItem(name, JSON.stringify(data));
};

var getUserInfo = function(name) {
  return JSON.parse(localStorage.getItem(name));
};

// Creates div and appends to list.
var render = function(repo) {
  var node = document.createElement('div');
  node.className = 'js-repo';
  node.innerHTML += '<h2>' + repo.name + '</h2>';
  node.innerHTML += '<span>Stars: ' + repo.stargazers_count + '</span>';
  node.innerHTML += '<span>Forks: ' + repo.forks + '</span>';
  node.innerHTML += '<span>Issues: ' + repo.open_issues + '</span>';
  list.appendChild(node);
};

var renderRepoList = function(repos) {
  list.innerHTML = '';
  _.each(repos, render);
};

var showDescription = function(el, info) {
  el.innerHTML = '';
  el.innerHTML += info.full_name + '<br>';
  el.innerHTML += info.description + '<br>';
  el.innerHTML += '<a href=' + info.html_url + '>' + info.html_url + '</a><br>';
  if (info.language) {
    el.innerHTML += info.language + '<br>';
  }
  el.innerHTML += '<br>Last updated ' + moment(info.updated_at).fromNow();
};

// Partially apply callback to GitHub getRepos function, reducing required
// arguments to just the GitHub username.
var getRepos = partial(github.getReposFromUser, function(repos, user) {
  storeUserInfo(user, {repos: repos});
  renderRepoList(repos);
});

var getRepo = partial(github.getRepoDescription, function(description, user, repo) {
  if (description['message'] !== 'Not Found') {
    var userInfo = getUserInfo(user);
    userInfo.descriptions[repo] = description;
    storeUserInfo(user, userInfo);
    showDescription(descriptionEl, description);
  }
});

// Observable stream of results from input field.
var lookups = Rx.Observable.fromEvent(input, 'keyup')
  .map(function(e) {
    return e.target.value;
  })
  .filter(function(text) {
    return text.length > 0;
  })
  .throttle(400)
  .distinctUntilChanged();

// Pipe valid events to renderUserRepos.
lookups.subscribe(function(user) {
  if (!localStorage[user]) {
    getRepos(user);
  }
  else {
    renderRepoList(getUserInfo(user).repos);
  }
  currentUser = user;
});

var clicks = Rx.Observable.fromEvent(list, 'click')
  .filter(function(e) {
    return e.target.tagName === 'H2';
  })
  .subscribe(function(e) {
    var repoName = e.target.textContent;
    var userInfo = getUserInfo(currentUser);
    if (!userInfo.descriptions) {
      userInfo.descriptions = {};
      storeUserInfo(currentUser, userInfo);
    }
    if (!userInfo.descriptions[repoName]) {
      getRepo(currentUser, e.target.textContent);
    }
    else {
      showDescription(descriptionEl, userInfo.descriptions[repoName]);
    }
  });

},{"./lib/github":2,"lodash":5,"moment":6,"partial":7,"rx":16}],2:[function(require,module,exports){
// Provides interface for getting required data from github API.

var _ = require('lodash');
var request = require('./request');
var sanitise = require('./sanitise');

var getReposFromUser = function(cb, user) {
  request('https://api.github.com/users/' + user + '/repos?per_page=100', function(data) {
    cb(sanitise(data), user);
  });
};

var getRepoDescription = function(cb, user, repo) {
  request('https://api.github.com/repos/' + user + '/' + repo, function(data) {
    cb(JSON.parse(data), user, repo);
  });
};

exports.getReposFromUser = getReposFromUser;
exports.getRepoDescription = getRepoDescription;

},{"./request":3,"./sanitise":4,"lodash":5}],3:[function(require,module,exports){
// Micro request module.

module.exports = function(url, cb) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", url, false);
  xmlhttp.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
  xmlhttp.onreadystatechange = function() {
    cb(xmlhttp.response);
  };
  xmlhttp.send();
};

},{}],4:[function(require,module,exports){
var _ = require('lodash');

var parseRepos = function(repos) {
  return _.chain(JSON.parse(repos))
    .map(function(repo) {
      return _.pick(repo, ['forks','open_issues', 'stargazers_count', 'name'])
    })
    .sortBy('stargazers_count')
    .reverse()
    .value()
    .slice(0, 20);
};

module.exports = parseRepos;

},{"lodash":5}],5:[function(require,module,exports){
(function (global){
/**
 * @license
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modern -o ./dist/lodash.js`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
;(function() {

  /** Used as a safe reference for `undefined` in pre ES5 environments */
  var undefined;

  /** Used to pool arrays and objects used internally */
  var arrayPool = [],
      objectPool = [];

  /** Used to generate unique IDs */
  var idCounter = 0;

  /** Used to prefix keys to avoid issues with `__proto__` and properties on `Object.prototype` */
  var keyPrefix = +new Date + '';

  /** Used as the size when optimizations are enabled for large arrays */
  var largeArraySize = 75;

  /** Used as the max size of the `arrayPool` and `objectPool` */
  var maxPoolSize = 40;

  /** Used to detect and test whitespace */
  var whitespace = (
    // whitespace
    ' \t\x0B\f\xA0\ufeff' +

    // line terminators
    '\n\r\u2028\u2029' +

    // unicode category "Zs" space separators
    '\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000'
  );

  /** Used to match empty string literals in compiled template source */
  var reEmptyStringLeading = /\b__p \+= '';/g,
      reEmptyStringMiddle = /\b(__p \+=) '' \+/g,
      reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;

  /**
   * Used to match ES6 template delimiters
   * http://people.mozilla.org/~jorendorff/es6-draft.html#sec-literals-string-literals
   */
  var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

  /** Used to match regexp flags from their coerced string values */
  var reFlags = /\w*$/;

  /** Used to detected named functions */
  var reFuncName = /^\s*function[ \n\r\t]+\w/;

  /** Used to match "interpolate" template delimiters */
  var reInterpolate = /<%=([\s\S]+?)%>/g;

  /** Used to match leading whitespace and zeros to be removed */
  var reLeadingSpacesAndZeros = RegExp('^[' + whitespace + ']*0+(?=.$)');

  /** Used to ensure capturing order of template delimiters */
  var reNoMatch = /($^)/;

  /** Used to detect functions containing a `this` reference */
  var reThis = /\bthis\b/;

  /** Used to match unescaped characters in compiled string literals */
  var reUnescapedString = /['\n\r\t\u2028\u2029\\]/g;

  /** Used to assign default `context` object properties */
  var contextProps = [
    'Array', 'Boolean', 'Date', 'Function', 'Math', 'Number', 'Object',
    'RegExp', 'String', '_', 'attachEvent', 'clearTimeout', 'isFinite', 'isNaN',
    'parseInt', 'setTimeout'
  ];

  /** Used to make template sourceURLs easier to identify */
  var templateCounter = 0;

  /** `Object#toString` result shortcuts */
  var argsClass = '[object Arguments]',
      arrayClass = '[object Array]',
      boolClass = '[object Boolean]',
      dateClass = '[object Date]',
      funcClass = '[object Function]',
      numberClass = '[object Number]',
      objectClass = '[object Object]',
      regexpClass = '[object RegExp]',
      stringClass = '[object String]';

  /** Used to identify object classifications that `_.clone` supports */
  var cloneableClasses = {};
  cloneableClasses[funcClass] = false;
  cloneableClasses[argsClass] = cloneableClasses[arrayClass] =
  cloneableClasses[boolClass] = cloneableClasses[dateClass] =
  cloneableClasses[numberClass] = cloneableClasses[objectClass] =
  cloneableClasses[regexpClass] = cloneableClasses[stringClass] = true;

  /** Used as an internal `_.debounce` options object */
  var debounceOptions = {
    'leading': false,
    'maxWait': 0,
    'trailing': false
  };

  /** Used as the property descriptor for `__bindData__` */
  var descriptor = {
    'configurable': false,
    'enumerable': false,
    'value': null,
    'writable': false
  };

  /** Used to determine if values are of the language type Object */
  var objectTypes = {
    'boolean': false,
    'function': true,
    'object': true,
    'number': false,
    'string': false,
    'undefined': false
  };

  /** Used to escape characters for inclusion in compiled string literals */
  var stringEscapes = {
    '\\': '\\',
    "'": "'",
    '\n': 'n',
    '\r': 'r',
    '\t': 't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  /** Used as a reference to the global object */
  var root = (objectTypes[typeof window] && window) || this;

  /** Detect free variable `exports` */
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

  /** Detect free variable `module` */
  var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;

  /** Detect the popular CommonJS extension `module.exports` */
  var moduleExports = freeModule && freeModule.exports === freeExports && freeExports;

  /** Detect free variable `global` from Node.js or Browserified code and use it as `root` */
  var freeGlobal = objectTypes[typeof global] && global;
  if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
    root = freeGlobal;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * The base implementation of `_.indexOf` without support for binary searches
   * or `fromIndex` constraints.
   *
   * @private
   * @param {Array} array The array to search.
   * @param {*} value The value to search for.
   * @param {number} [fromIndex=0] The index to search from.
   * @returns {number} Returns the index of the matched value or `-1`.
   */
  function baseIndexOf(array, value, fromIndex) {
    var index = (fromIndex || 0) - 1,
        length = array ? array.length : 0;

    while (++index < length) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }

  /**
   * An implementation of `_.contains` for cache objects that mimics the return
   * signature of `_.indexOf` by returning `0` if the value is found, else `-1`.
   *
   * @private
   * @param {Object} cache The cache object to inspect.
   * @param {*} value The value to search for.
   * @returns {number} Returns `0` if `value` is found, else `-1`.
   */
  function cacheIndexOf(cache, value) {
    var type = typeof value;
    cache = cache.cache;

    if (type == 'boolean' || value == null) {
      return cache[value] ? 0 : -1;
    }
    if (type != 'number' && type != 'string') {
      type = 'object';
    }
    var key = type == 'number' ? value : keyPrefix + value;
    cache = (cache = cache[type]) && cache[key];

    return type == 'object'
      ? (cache && baseIndexOf(cache, value) > -1 ? 0 : -1)
      : (cache ? 0 : -1);
  }

  /**
   * Adds a given value to the corresponding cache object.
   *
   * @private
   * @param {*} value The value to add to the cache.
   */
  function cachePush(value) {
    var cache = this.cache,
        type = typeof value;

    if (type == 'boolean' || value == null) {
      cache[value] = true;
    } else {
      if (type != 'number' && type != 'string') {
        type = 'object';
      }
      var key = type == 'number' ? value : keyPrefix + value,
          typeCache = cache[type] || (cache[type] = {});

      if (type == 'object') {
        (typeCache[key] || (typeCache[key] = [])).push(value);
      } else {
        typeCache[key] = true;
      }
    }
  }

  /**
   * Used by `_.max` and `_.min` as the default callback when a given
   * collection is a string value.
   *
   * @private
   * @param {string} value The character to inspect.
   * @returns {number} Returns the code unit of given character.
   */
  function charAtCallback(value) {
    return value.charCodeAt(0);
  }

  /**
   * Used by `sortBy` to compare transformed `collection` elements, stable sorting
   * them in ascending order.
   *
   * @private
   * @param {Object} a The object to compare to `b`.
   * @param {Object} b The object to compare to `a`.
   * @returns {number} Returns the sort order indicator of `1` or `-1`.
   */
  function compareAscending(a, b) {
    var ac = a.criteria,
        bc = b.criteria,
        index = -1,
        length = ac.length;

    while (++index < length) {
      var value = ac[index],
          other = bc[index];

      if (value !== other) {
        if (value > other || typeof value == 'undefined') {
          return 1;
        }
        if (value < other || typeof other == 'undefined') {
          return -1;
        }
      }
    }
    // Fixes an `Array#sort` bug in the JS engine embedded in Adobe applications
    // that causes it, under certain circumstances, to return the same value for
    // `a` and `b`. See https://github.com/jashkenas/underscore/pull/1247
    //
    // This also ensures a stable sort in V8 and other engines.
    // See http://code.google.com/p/v8/issues/detail?id=90
    return a.index - b.index;
  }

  /**
   * Creates a cache object to optimize linear searches of large arrays.
   *
   * @private
   * @param {Array} [array=[]] The array to search.
   * @returns {null|Object} Returns the cache object or `null` if caching should not be used.
   */
  function createCache(array) {
    var index = -1,
        length = array.length,
        first = array[0],
        mid = array[(length / 2) | 0],
        last = array[length - 1];

    if (first && typeof first == 'object' &&
        mid && typeof mid == 'object' && last && typeof last == 'object') {
      return false;
    }
    var cache = getObject();
    cache['false'] = cache['null'] = cache['true'] = cache['undefined'] = false;

    var result = getObject();
    result.array = array;
    result.cache = cache;
    result.push = cachePush;

    while (++index < length) {
      result.push(array[index]);
    }
    return result;
  }

  /**
   * Used by `template` to escape characters for inclusion in compiled
   * string literals.
   *
   * @private
   * @param {string} match The matched character to escape.
   * @returns {string} Returns the escaped character.
   */
  function escapeStringChar(match) {
    return '\\' + stringEscapes[match];
  }

  /**
   * Gets an array from the array pool or creates a new one if the pool is empty.
   *
   * @private
   * @returns {Array} The array from the pool.
   */
  function getArray() {
    return arrayPool.pop() || [];
  }

  /**
   * Gets an object from the object pool or creates a new one if the pool is empty.
   *
   * @private
   * @returns {Object} The object from the pool.
   */
  function getObject() {
    return objectPool.pop() || {
      'array': null,
      'cache': null,
      'criteria': null,
      'false': false,
      'index': 0,
      'null': false,
      'number': null,
      'object': null,
      'push': null,
      'string': null,
      'true': false,
      'undefined': false,
      'value': null
    };
  }

  /**
   * Releases the given array back to the array pool.
   *
   * @private
   * @param {Array} [array] The array to release.
   */
  function releaseArray(array) {
    array.length = 0;
    if (arrayPool.length < maxPoolSize) {
      arrayPool.push(array);
    }
  }

  /**
   * Releases the given object back to the object pool.
   *
   * @private
   * @param {Object} [object] The object to release.
   */
  function releaseObject(object) {
    var cache = object.cache;
    if (cache) {
      releaseObject(cache);
    }
    object.array = object.cache = object.criteria = object.object = object.number = object.string = object.value = null;
    if (objectPool.length < maxPoolSize) {
      objectPool.push(object);
    }
  }

  /**
   * Slices the `collection` from the `start` index up to, but not including,
   * the `end` index.
   *
   * Note: This function is used instead of `Array#slice` to support node lists
   * in IE < 9 and to ensure dense arrays are returned.
   *
   * @private
   * @param {Array|Object|string} collection The collection to slice.
   * @param {number} start The start index.
   * @param {number} end The end index.
   * @returns {Array} Returns the new array.
   */
  function slice(array, start, end) {
    start || (start = 0);
    if (typeof end == 'undefined') {
      end = array ? array.length : 0;
    }
    var index = -1,
        length = end - start || 0,
        result = Array(length < 0 ? 0 : length);

    while (++index < length) {
      result[index] = array[start + index];
    }
    return result;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Create a new `lodash` function using the given context object.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Object} [context=root] The context object.
   * @returns {Function} Returns the `lodash` function.
   */
  function runInContext(context) {
    // Avoid issues with some ES3 environments that attempt to use values, named
    // after built-in constructors like `Object`, for the creation of literals.
    // ES5 clears this up by stating that literals must use built-in constructors.
    // See http://es5.github.io/#x11.1.5.
    context = context ? _.defaults(root.Object(), context, _.pick(root, contextProps)) : root;

    /** Native constructor references */
    var Array = context.Array,
        Boolean = context.Boolean,
        Date = context.Date,
        Function = context.Function,
        Math = context.Math,
        Number = context.Number,
        Object = context.Object,
        RegExp = context.RegExp,
        String = context.String,
        TypeError = context.TypeError;

    /**
     * Used for `Array` method references.
     *
     * Normally `Array.prototype` would suffice, however, using an array literal
     * avoids issues in Narwhal.
     */
    var arrayRef = [];

    /** Used for native method references */
    var objectProto = Object.prototype;

    /** Used to restore the original `_` reference in `noConflict` */
    var oldDash = context._;

    /** Used to resolve the internal [[Class]] of values */
    var toString = objectProto.toString;

    /** Used to detect if a method is native */
    var reNative = RegExp('^' +
      String(toString)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/toString| for [^\]]+/g, '.*?') + '$'
    );

    /** Native method shortcuts */
    var ceil = Math.ceil,
        clearTimeout = context.clearTimeout,
        floor = Math.floor,
        fnToString = Function.prototype.toString,
        getPrototypeOf = isNative(getPrototypeOf = Object.getPrototypeOf) && getPrototypeOf,
        hasOwnProperty = objectProto.hasOwnProperty,
        push = arrayRef.push,
        setTimeout = context.setTimeout,
        splice = arrayRef.splice,
        unshift = arrayRef.unshift;

    /** Used to set meta data on functions */
    var defineProperty = (function() {
      // IE 8 only accepts DOM elements
      try {
        var o = {},
            func = isNative(func = Object.defineProperty) && func,
            result = func(o, o, o) && func;
      } catch(e) { }
      return result;
    }());

    /* Native method shortcuts for methods with the same name as other `lodash` methods */
    var nativeCreate = isNative(nativeCreate = Object.create) && nativeCreate,
        nativeIsArray = isNative(nativeIsArray = Array.isArray) && nativeIsArray,
        nativeIsFinite = context.isFinite,
        nativeIsNaN = context.isNaN,
        nativeKeys = isNative(nativeKeys = Object.keys) && nativeKeys,
        nativeMax = Math.max,
        nativeMin = Math.min,
        nativeParseInt = context.parseInt,
        nativeRandom = Math.random;

    /** Used to lookup a built-in constructor by [[Class]] */
    var ctorByClass = {};
    ctorByClass[arrayClass] = Array;
    ctorByClass[boolClass] = Boolean;
    ctorByClass[dateClass] = Date;
    ctorByClass[funcClass] = Function;
    ctorByClass[objectClass] = Object;
    ctorByClass[numberClass] = Number;
    ctorByClass[regexpClass] = RegExp;
    ctorByClass[stringClass] = String;

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a `lodash` object which wraps the given value to enable intuitive
     * method chaining.
     *
     * In addition to Lo-Dash methods, wrappers also have the following `Array` methods:
     * `concat`, `join`, `pop`, `push`, `reverse`, `shift`, `slice`, `sort`, `splice`,
     * and `unshift`
     *
     * Chaining is supported in custom builds as long as the `value` method is
     * implicitly or explicitly included in the build.
     *
     * The chainable wrapper functions are:
     * `after`, `assign`, `bind`, `bindAll`, `bindKey`, `chain`, `compact`,
     * `compose`, `concat`, `countBy`, `create`, `createCallback`, `curry`,
     * `debounce`, `defaults`, `defer`, `delay`, `difference`, `filter`, `flatten`,
     * `forEach`, `forEachRight`, `forIn`, `forInRight`, `forOwn`, `forOwnRight`,
     * `functions`, `groupBy`, `indexBy`, `initial`, `intersection`, `invert`,
     * `invoke`, `keys`, `map`, `max`, `memoize`, `merge`, `min`, `object`, `omit`,
     * `once`, `pairs`, `partial`, `partialRight`, `pick`, `pluck`, `pull`, `push`,
     * `range`, `reject`, `remove`, `rest`, `reverse`, `shuffle`, `slice`, `sort`,
     * `sortBy`, `splice`, `tap`, `throttle`, `times`, `toArray`, `transform`,
     * `union`, `uniq`, `unshift`, `unzip`, `values`, `where`, `without`, `wrap`,
     * and `zip`
     *
     * The non-chainable wrapper functions are:
     * `clone`, `cloneDeep`, `contains`, `escape`, `every`, `find`, `findIndex`,
     * `findKey`, `findLast`, `findLastIndex`, `findLastKey`, `has`, `identity`,
     * `indexOf`, `isArguments`, `isArray`, `isBoolean`, `isDate`, `isElement`,
     * `isEmpty`, `isEqual`, `isFinite`, `isFunction`, `isNaN`, `isNull`, `isNumber`,
     * `isObject`, `isPlainObject`, `isRegExp`, `isString`, `isUndefined`, `join`,
     * `lastIndexOf`, `mixin`, `noConflict`, `parseInt`, `pop`, `random`, `reduce`,
     * `reduceRight`, `result`, `shift`, `size`, `some`, `sortedIndex`, `runInContext`,
     * `template`, `unescape`, `uniqueId`, and `value`
     *
     * The wrapper functions `first` and `last` return wrapped values when `n` is
     * provided, otherwise they return unwrapped values.
     *
     * Explicit chaining can be enabled by using the `_.chain` method.
     *
     * @name _
     * @constructor
     * @category Chaining
     * @param {*} value The value to wrap in a `lodash` instance.
     * @returns {Object} Returns a `lodash` instance.
     * @example
     *
     * var wrapped = _([1, 2, 3]);
     *
     * // returns an unwrapped value
     * wrapped.reduce(function(sum, num) {
     *   return sum + num;
     * });
     * // => 6
     *
     * // returns a wrapped value
     * var squares = wrapped.map(function(num) {
     *   return num * num;
     * });
     *
     * _.isArray(squares);
     * // => false
     *
     * _.isArray(squares.value());
     * // => true
     */
    function lodash(value) {
      // don't wrap if already wrapped, even if wrapped by a different `lodash` constructor
      return (value && typeof value == 'object' && !isArray(value) && hasOwnProperty.call(value, '__wrapped__'))
       ? value
       : new lodashWrapper(value);
    }

    /**
     * A fast path for creating `lodash` wrapper objects.
     *
     * @private
     * @param {*} value The value to wrap in a `lodash` instance.
     * @param {boolean} chainAll A flag to enable chaining for all methods
     * @returns {Object} Returns a `lodash` instance.
     */
    function lodashWrapper(value, chainAll) {
      this.__chain__ = !!chainAll;
      this.__wrapped__ = value;
    }
    // ensure `new lodashWrapper` is an instance of `lodash`
    lodashWrapper.prototype = lodash.prototype;

    /**
     * An object used to flag environments features.
     *
     * @static
     * @memberOf _
     * @type Object
     */
    var support = lodash.support = {};

    /**
     * Detect if functions can be decompiled by `Function#toString`
     * (all but PS3 and older Opera mobile browsers & avoided in Windows 8 apps).
     *
     * @memberOf _.support
     * @type boolean
     */
    support.funcDecomp = !isNative(context.WinRTError) && reThis.test(runInContext);

    /**
     * Detect if `Function#name` is supported (all but IE).
     *
     * @memberOf _.support
     * @type boolean
     */
    support.funcNames = typeof Function.name == 'string';

    /**
     * By default, the template delimiters used by Lo-Dash are similar to those in
     * embedded Ruby (ERB). Change the following template settings to use alternative
     * delimiters.
     *
     * @static
     * @memberOf _
     * @type Object
     */
    lodash.templateSettings = {

      /**
       * Used to detect `data` property values to be HTML-escaped.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'escape': /<%-([\s\S]+?)%>/g,

      /**
       * Used to detect code to be evaluated.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'evaluate': /<%([\s\S]+?)%>/g,

      /**
       * Used to detect `data` property values to inject.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'interpolate': reInterpolate,

      /**
       * Used to reference the data object in the template text.
       *
       * @memberOf _.templateSettings
       * @type string
       */
      'variable': '',

      /**
       * Used to import variables into the compiled template.
       *
       * @memberOf _.templateSettings
       * @type Object
       */
      'imports': {

        /**
         * A reference to the `lodash` function.
         *
         * @memberOf _.templateSettings.imports
         * @type Function
         */
        '_': lodash
      }
    };

    /*--------------------------------------------------------------------------*/

    /**
     * The base implementation of `_.bind` that creates the bound function and
     * sets its meta data.
     *
     * @private
     * @param {Array} bindData The bind data array.
     * @returns {Function} Returns the new bound function.
     */
    function baseBind(bindData) {
      var func = bindData[0],
          partialArgs = bindData[2],
          thisArg = bindData[4];

      function bound() {
        // `Function#bind` spec
        // http://es5.github.io/#x15.3.4.5
        if (partialArgs) {
          // avoid `arguments` object deoptimizations by using `slice` instead
          // of `Array.prototype.slice.call` and not assigning `arguments` to a
          // variable as a ternary expression
          var args = slice(partialArgs);
          push.apply(args, arguments);
        }
        // mimic the constructor's `return` behavior
        // http://es5.github.io/#x13.2.2
        if (this instanceof bound) {
          // ensure `new bound` is an instance of `func`
          var thisBinding = baseCreate(func.prototype),
              result = func.apply(thisBinding, args || arguments);
          return isObject(result) ? result : thisBinding;
        }
        return func.apply(thisArg, args || arguments);
      }
      setBindData(bound, bindData);
      return bound;
    }

    /**
     * The base implementation of `_.clone` without argument juggling or support
     * for `thisArg` binding.
     *
     * @private
     * @param {*} value The value to clone.
     * @param {boolean} [isDeep=false] Specify a deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {Array} [stackA=[]] Tracks traversed source objects.
     * @param {Array} [stackB=[]] Associates clones with source counterparts.
     * @returns {*} Returns the cloned value.
     */
    function baseClone(value, isDeep, callback, stackA, stackB) {
      if (callback) {
        var result = callback(value);
        if (typeof result != 'undefined') {
          return result;
        }
      }
      // inspect [[Class]]
      var isObj = isObject(value);
      if (isObj) {
        var className = toString.call(value);
        if (!cloneableClasses[className]) {
          return value;
        }
        var ctor = ctorByClass[className];
        switch (className) {
          case boolClass:
          case dateClass:
            return new ctor(+value);

          case numberClass:
          case stringClass:
            return new ctor(value);

          case regexpClass:
            result = ctor(value.source, reFlags.exec(value));
            result.lastIndex = value.lastIndex;
            return result;
        }
      } else {
        return value;
      }
      var isArr = isArray(value);
      if (isDeep) {
        // check for circular references and return corresponding clone
        var initedStack = !stackA;
        stackA || (stackA = getArray());
        stackB || (stackB = getArray());

        var length = stackA.length;
        while (length--) {
          if (stackA[length] == value) {
            return stackB[length];
          }
        }
        result = isArr ? ctor(value.length) : {};
      }
      else {
        result = isArr ? slice(value) : assign({}, value);
      }
      // add array properties assigned by `RegExp#exec`
      if (isArr) {
        if (hasOwnProperty.call(value, 'index')) {
          result.index = value.index;
        }
        if (hasOwnProperty.call(value, 'input')) {
          result.input = value.input;
        }
      }
      // exit for shallow clone
      if (!isDeep) {
        return result;
      }
      // add the source value to the stack of traversed objects
      // and associate it with its clone
      stackA.push(value);
      stackB.push(result);

      // recursively populate clone (susceptible to call stack limits)
      (isArr ? forEach : forOwn)(value, function(objValue, key) {
        result[key] = baseClone(objValue, isDeep, callback, stackA, stackB);
      });

      if (initedStack) {
        releaseArray(stackA);
        releaseArray(stackB);
      }
      return result;
    }

    /**
     * The base implementation of `_.create` without support for assigning
     * properties to the created object.
     *
     * @private
     * @param {Object} prototype The object to inherit from.
     * @returns {Object} Returns the new object.
     */
    function baseCreate(prototype, properties) {
      return isObject(prototype) ? nativeCreate(prototype) : {};
    }
    // fallback for browsers without `Object.create`
    if (!nativeCreate) {
      baseCreate = (function() {
        function Object() {}
        return function(prototype) {
          if (isObject(prototype)) {
            Object.prototype = prototype;
            var result = new Object;
            Object.prototype = null;
          }
          return result || context.Object();
        };
      }());
    }

    /**
     * The base implementation of `_.createCallback` without support for creating
     * "_.pluck" or "_.where" style callbacks.
     *
     * @private
     * @param {*} [func=identity] The value to convert to a callback.
     * @param {*} [thisArg] The `this` binding of the created callback.
     * @param {number} [argCount] The number of arguments the callback accepts.
     * @returns {Function} Returns a callback function.
     */
    function baseCreateCallback(func, thisArg, argCount) {
      if (typeof func != 'function') {
        return identity;
      }
      // exit early for no `thisArg` or already bound by `Function#bind`
      if (typeof thisArg == 'undefined' || !('prototype' in func)) {
        return func;
      }
      var bindData = func.__bindData__;
      if (typeof bindData == 'undefined') {
        if (support.funcNames) {
          bindData = !func.name;
        }
        bindData = bindData || !support.funcDecomp;
        if (!bindData) {
          var source = fnToString.call(func);
          if (!support.funcNames) {
            bindData = !reFuncName.test(source);
          }
          if (!bindData) {
            // checks if `func` references the `this` keyword and stores the result
            bindData = reThis.test(source);
            setBindData(func, bindData);
          }
        }
      }
      // exit early if there are no `this` references or `func` is bound
      if (bindData === false || (bindData !== true && bindData[1] & 1)) {
        return func;
      }
      switch (argCount) {
        case 1: return function(value) {
          return func.call(thisArg, value);
        };
        case 2: return function(a, b) {
          return func.call(thisArg, a, b);
        };
        case 3: return function(value, index, collection) {
          return func.call(thisArg, value, index, collection);
        };
        case 4: return function(accumulator, value, index, collection) {
          return func.call(thisArg, accumulator, value, index, collection);
        };
      }
      return bind(func, thisArg);
    }

    /**
     * The base implementation of `createWrapper` that creates the wrapper and
     * sets its meta data.
     *
     * @private
     * @param {Array} bindData The bind data array.
     * @returns {Function} Returns the new function.
     */
    function baseCreateWrapper(bindData) {
      var func = bindData[0],
          bitmask = bindData[1],
          partialArgs = bindData[2],
          partialRightArgs = bindData[3],
          thisArg = bindData[4],
          arity = bindData[5];

      var isBind = bitmask & 1,
          isBindKey = bitmask & 2,
          isCurry = bitmask & 4,
          isCurryBound = bitmask & 8,
          key = func;

      function bound() {
        var thisBinding = isBind ? thisArg : this;
        if (partialArgs) {
          var args = slice(partialArgs);
          push.apply(args, arguments);
        }
        if (partialRightArgs || isCurry) {
          args || (args = slice(arguments));
          if (partialRightArgs) {
            push.apply(args, partialRightArgs);
          }
          if (isCurry && args.length < arity) {
            bitmask |= 16 & ~32;
            return baseCreateWrapper([func, (isCurryBound ? bitmask : bitmask & ~3), args, null, thisArg, arity]);
          }
        }
        args || (args = arguments);
        if (isBindKey) {
          func = thisBinding[key];
        }
        if (this instanceof bound) {
          thisBinding = baseCreate(func.prototype);
          var result = func.apply(thisBinding, args);
          return isObject(result) ? result : thisBinding;
        }
        return func.apply(thisBinding, args);
      }
      setBindData(bound, bindData);
      return bound;
    }

    /**
     * The base implementation of `_.difference` that accepts a single array
     * of values to exclude.
     *
     * @private
     * @param {Array} array The array to process.
     * @param {Array} [values] The array of values to exclude.
     * @returns {Array} Returns a new array of filtered values.
     */
    function baseDifference(array, values) {
      var index = -1,
          indexOf = getIndexOf(),
          length = array ? array.length : 0,
          isLarge = length >= largeArraySize && indexOf === baseIndexOf,
          result = [];

      if (isLarge) {
        var cache = createCache(values);
        if (cache) {
          indexOf = cacheIndexOf;
          values = cache;
        } else {
          isLarge = false;
        }
      }
      while (++index < length) {
        var value = array[index];
        if (indexOf(values, value) < 0) {
          result.push(value);
        }
      }
      if (isLarge) {
        releaseObject(values);
      }
      return result;
    }

    /**
     * The base implementation of `_.flatten` without support for callback
     * shorthands or `thisArg` binding.
     *
     * @private
     * @param {Array} array The array to flatten.
     * @param {boolean} [isShallow=false] A flag to restrict flattening to a single level.
     * @param {boolean} [isStrict=false] A flag to restrict flattening to arrays and `arguments` objects.
     * @param {number} [fromIndex=0] The index to start from.
     * @returns {Array} Returns a new flattened array.
     */
    function baseFlatten(array, isShallow, isStrict, fromIndex) {
      var index = (fromIndex || 0) - 1,
          length = array ? array.length : 0,
          result = [];

      while (++index < length) {
        var value = array[index];

        if (value && typeof value == 'object' && typeof value.length == 'number'
            && (isArray(value) || isArguments(value))) {
          // recursively flatten arrays (susceptible to call stack limits)
          if (!isShallow) {
            value = baseFlatten(value, isShallow, isStrict);
          }
          var valIndex = -1,
              valLength = value.length,
              resIndex = result.length;

          result.length += valLength;
          while (++valIndex < valLength) {
            result[resIndex++] = value[valIndex];
          }
        } else if (!isStrict) {
          result.push(value);
        }
      }
      return result;
    }

    /**
     * The base implementation of `_.isEqual`, without support for `thisArg` binding,
     * that allows partial "_.where" style comparisons.
     *
     * @private
     * @param {*} a The value to compare.
     * @param {*} b The other value to compare.
     * @param {Function} [callback] The function to customize comparing values.
     * @param {Function} [isWhere=false] A flag to indicate performing partial comparisons.
     * @param {Array} [stackA=[]] Tracks traversed `a` objects.
     * @param {Array} [stackB=[]] Tracks traversed `b` objects.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     */
    function baseIsEqual(a, b, callback, isWhere, stackA, stackB) {
      // used to indicate that when comparing objects, `a` has at least the properties of `b`
      if (callback) {
        var result = callback(a, b);
        if (typeof result != 'undefined') {
          return !!result;
        }
      }
      // exit early for identical values
      if (a === b) {
        // treat `+0` vs. `-0` as not equal
        return a !== 0 || (1 / a == 1 / b);
      }
      var type = typeof a,
          otherType = typeof b;

      // exit early for unlike primitive values
      if (a === a &&
          !(a && objectTypes[type]) &&
          !(b && objectTypes[otherType])) {
        return false;
      }
      // exit early for `null` and `undefined` avoiding ES3's Function#call behavior
      // http://es5.github.io/#x15.3.4.4
      if (a == null || b == null) {
        return a === b;
      }
      // compare [[Class]] names
      var className = toString.call(a),
          otherClass = toString.call(b);

      if (className == argsClass) {
        className = objectClass;
      }
      if (otherClass == argsClass) {
        otherClass = objectClass;
      }
      if (className != otherClass) {
        return false;
      }
      switch (className) {
        case boolClass:
        case dateClass:
          // coerce dates and booleans to numbers, dates to milliseconds and booleans
          // to `1` or `0` treating invalid dates coerced to `NaN` as not equal
          return +a == +b;

        case numberClass:
          // treat `NaN` vs. `NaN` as equal
          return (a != +a)
            ? b != +b
            // but treat `+0` vs. `-0` as not equal
            : (a == 0 ? (1 / a == 1 / b) : a == +b);

        case regexpClass:
        case stringClass:
          // coerce regexes to strings (http://es5.github.io/#x15.10.6.4)
          // treat string primitives and their corresponding object instances as equal
          return a == String(b);
      }
      var isArr = className == arrayClass;
      if (!isArr) {
        // unwrap any `lodash` wrapped values
        var aWrapped = hasOwnProperty.call(a, '__wrapped__'),
            bWrapped = hasOwnProperty.call(b, '__wrapped__');

        if (aWrapped || bWrapped) {
          return baseIsEqual(aWrapped ? a.__wrapped__ : a, bWrapped ? b.__wrapped__ : b, callback, isWhere, stackA, stackB);
        }
        // exit for functions and DOM nodes
        if (className != objectClass) {
          return false;
        }
        // in older versions of Opera, `arguments` objects have `Array` constructors
        var ctorA = a.constructor,
            ctorB = b.constructor;

        // non `Object` object instances with different constructors are not equal
        if (ctorA != ctorB &&
              !(isFunction(ctorA) && ctorA instanceof ctorA && isFunction(ctorB) && ctorB instanceof ctorB) &&
              ('constructor' in a && 'constructor' in b)
            ) {
          return false;
        }
      }
      // assume cyclic structures are equal
      // the algorithm for detecting cyclic structures is adapted from ES 5.1
      // section 15.12.3, abstract operation `JO` (http://es5.github.io/#x15.12.3)
      var initedStack = !stackA;
      stackA || (stackA = getArray());
      stackB || (stackB = getArray());

      var length = stackA.length;
      while (length--) {
        if (stackA[length] == a) {
          return stackB[length] == b;
        }
      }
      var size = 0;
      result = true;

      // add `a` and `b` to the stack of traversed objects
      stackA.push(a);
      stackB.push(b);

      // recursively compare objects and arrays (susceptible to call stack limits)
      if (isArr) {
        // compare lengths to determine if a deep comparison is necessary
        length = a.length;
        size = b.length;
        result = size == length;

        if (result || isWhere) {
          // deep compare the contents, ignoring non-numeric properties
          while (size--) {
            var index = length,
                value = b[size];

            if (isWhere) {
              while (index--) {
                if ((result = baseIsEqual(a[index], value, callback, isWhere, stackA, stackB))) {
                  break;
                }
              }
            } else if (!(result = baseIsEqual(a[size], value, callback, isWhere, stackA, stackB))) {
              break;
            }
          }
        }
      }
      else {
        // deep compare objects using `forIn`, instead of `forOwn`, to avoid `Object.keys`
        // which, in this case, is more costly
        forIn(b, function(value, key, b) {
          if (hasOwnProperty.call(b, key)) {
            // count the number of properties.
            size++;
            // deep compare each property value.
            return (result = hasOwnProperty.call(a, key) && baseIsEqual(a[key], value, callback, isWhere, stackA, stackB));
          }
        });

        if (result && !isWhere) {
          // ensure both objects have the same number of properties
          forIn(a, function(value, key, a) {
            if (hasOwnProperty.call(a, key)) {
              // `size` will be `-1` if `a` has more properties than `b`
              return (result = --size > -1);
            }
          });
        }
      }
      stackA.pop();
      stackB.pop();

      if (initedStack) {
        releaseArray(stackA);
        releaseArray(stackB);
      }
      return result;
    }

    /**
     * The base implementation of `_.merge` without argument juggling or support
     * for `thisArg` binding.
     *
     * @private
     * @param {Object} object The destination object.
     * @param {Object} source The source object.
     * @param {Function} [callback] The function to customize merging properties.
     * @param {Array} [stackA=[]] Tracks traversed source objects.
     * @param {Array} [stackB=[]] Associates values with source counterparts.
     */
    function baseMerge(object, source, callback, stackA, stackB) {
      (isArray(source) ? forEach : forOwn)(source, function(source, key) {
        var found,
            isArr,
            result = source,
            value = object[key];

        if (source && ((isArr = isArray(source)) || isPlainObject(source))) {
          // avoid merging previously merged cyclic sources
          var stackLength = stackA.length;
          while (stackLength--) {
            if ((found = stackA[stackLength] == source)) {
              value = stackB[stackLength];
              break;
            }
          }
          if (!found) {
            var isShallow;
            if (callback) {
              result = callback(value, source);
              if ((isShallow = typeof result != 'undefined')) {
                value = result;
              }
            }
            if (!isShallow) {
              value = isArr
                ? (isArray(value) ? value : [])
                : (isPlainObject(value) ? value : {});
            }
            // add `source` and associated `value` to the stack of traversed objects
            stackA.push(source);
            stackB.push(value);

            // recursively merge objects and arrays (susceptible to call stack limits)
            if (!isShallow) {
              baseMerge(value, source, callback, stackA, stackB);
            }
          }
        }
        else {
          if (callback) {
            result = callback(value, source);
            if (typeof result == 'undefined') {
              result = source;
            }
          }
          if (typeof result != 'undefined') {
            value = result;
          }
        }
        object[key] = value;
      });
    }

    /**
     * The base implementation of `_.random` without argument juggling or support
     * for returning floating-point numbers.
     *
     * @private
     * @param {number} min The minimum possible value.
     * @param {number} max The maximum possible value.
     * @returns {number} Returns a random number.
     */
    function baseRandom(min, max) {
      return min + floor(nativeRandom() * (max - min + 1));
    }

    /**
     * The base implementation of `_.uniq` without support for callback shorthands
     * or `thisArg` binding.
     *
     * @private
     * @param {Array} array The array to process.
     * @param {boolean} [isSorted=false] A flag to indicate that `array` is sorted.
     * @param {Function} [callback] The function called per iteration.
     * @returns {Array} Returns a duplicate-value-free array.
     */
    function baseUniq(array, isSorted, callback) {
      var index = -1,
          indexOf = getIndexOf(),
          length = array ? array.length : 0,
          result = [];

      var isLarge = !isSorted && length >= largeArraySize && indexOf === baseIndexOf,
          seen = (callback || isLarge) ? getArray() : result;

      if (isLarge) {
        var cache = createCache(seen);
        indexOf = cacheIndexOf;
        seen = cache;
      }
      while (++index < length) {
        var value = array[index],
            computed = callback ? callback(value, index, array) : value;

        if (isSorted
              ? !index || seen[seen.length - 1] !== computed
              : indexOf(seen, computed) < 0
            ) {
          if (callback || isLarge) {
            seen.push(computed);
          }
          result.push(value);
        }
      }
      if (isLarge) {
        releaseArray(seen.array);
        releaseObject(seen);
      } else if (callback) {
        releaseArray(seen);
      }
      return result;
    }

    /**
     * Creates a function that aggregates a collection, creating an object composed
     * of keys generated from the results of running each element of the collection
     * through a callback. The given `setter` function sets the keys and values
     * of the composed object.
     *
     * @private
     * @param {Function} setter The setter function.
     * @returns {Function} Returns the new aggregator function.
     */
    function createAggregator(setter) {
      return function(collection, callback, thisArg) {
        var result = {};
        callback = lodash.createCallback(callback, thisArg, 3);

        var index = -1,
            length = collection ? collection.length : 0;

        if (typeof length == 'number') {
          while (++index < length) {
            var value = collection[index];
            setter(result, value, callback(value, index, collection), collection);
          }
        } else {
          forOwn(collection, function(value, key, collection) {
            setter(result, value, callback(value, key, collection), collection);
          });
        }
        return result;
      };
    }

    /**
     * Creates a function that, when called, either curries or invokes `func`
     * with an optional `this` binding and partially applied arguments.
     *
     * @private
     * @param {Function|string} func The function or method name to reference.
     * @param {number} bitmask The bitmask of method flags to compose.
     *  The bitmask may be composed of the following flags:
     *  1 - `_.bind`
     *  2 - `_.bindKey`
     *  4 - `_.curry`
     *  8 - `_.curry` (bound)
     *  16 - `_.partial`
     *  32 - `_.partialRight`
     * @param {Array} [partialArgs] An array of arguments to prepend to those
     *  provided to the new function.
     * @param {Array} [partialRightArgs] An array of arguments to append to those
     *  provided to the new function.
     * @param {*} [thisArg] The `this` binding of `func`.
     * @param {number} [arity] The arity of `func`.
     * @returns {Function} Returns the new function.
     */
    function createWrapper(func, bitmask, partialArgs, partialRightArgs, thisArg, arity) {
      var isBind = bitmask & 1,
          isBindKey = bitmask & 2,
          isCurry = bitmask & 4,
          isCurryBound = bitmask & 8,
          isPartial = bitmask & 16,
          isPartialRight = bitmask & 32;

      if (!isBindKey && !isFunction(func)) {
        throw new TypeError;
      }
      if (isPartial && !partialArgs.length) {
        bitmask &= ~16;
        isPartial = partialArgs = false;
      }
      if (isPartialRight && !partialRightArgs.length) {
        bitmask &= ~32;
        isPartialRight = partialRightArgs = false;
      }
      var bindData = func && func.__bindData__;
      if (bindData && bindData !== true) {
        // clone `bindData`
        bindData = slice(bindData);
        if (bindData[2]) {
          bindData[2] = slice(bindData[2]);
        }
        if (bindData[3]) {
          bindData[3] = slice(bindData[3]);
        }
        // set `thisBinding` is not previously bound
        if (isBind && !(bindData[1] & 1)) {
          bindData[4] = thisArg;
        }
        // set if previously bound but not currently (subsequent curried functions)
        if (!isBind && bindData[1] & 1) {
          bitmask |= 8;
        }
        // set curried arity if not yet set
        if (isCurry && !(bindData[1] & 4)) {
          bindData[5] = arity;
        }
        // append partial left arguments
        if (isPartial) {
          push.apply(bindData[2] || (bindData[2] = []), partialArgs);
        }
        // append partial right arguments
        if (isPartialRight) {
          unshift.apply(bindData[3] || (bindData[3] = []), partialRightArgs);
        }
        // merge flags
        bindData[1] |= bitmask;
        return createWrapper.apply(null, bindData);
      }
      // fast path for `_.bind`
      var creater = (bitmask == 1 || bitmask === 17) ? baseBind : baseCreateWrapper;
      return creater([func, bitmask, partialArgs, partialRightArgs, thisArg, arity]);
    }

    /**
     * Used by `escape` to convert characters to HTML entities.
     *
     * @private
     * @param {string} match The matched character to escape.
     * @returns {string} Returns the escaped character.
     */
    function escapeHtmlChar(match) {
      return htmlEscapes[match];
    }

    /**
     * Gets the appropriate "indexOf" function. If the `_.indexOf` method is
     * customized, this method returns the custom method, otherwise it returns
     * the `baseIndexOf` function.
     *
     * @private
     * @returns {Function} Returns the "indexOf" function.
     */
    function getIndexOf() {
      var result = (result = lodash.indexOf) === indexOf ? baseIndexOf : result;
      return result;
    }

    /**
     * Checks if `value` is a native function.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a native function, else `false`.
     */
    function isNative(value) {
      return typeof value == 'function' && reNative.test(value);
    }

    /**
     * Sets `this` binding data on a given function.
     *
     * @private
     * @param {Function} func The function to set data on.
     * @param {Array} value The data array to set.
     */
    var setBindData = !defineProperty ? noop : function(func, value) {
      descriptor.value = value;
      defineProperty(func, '__bindData__', descriptor);
    };

    /**
     * A fallback implementation of `isPlainObject` which checks if a given value
     * is an object created by the `Object` constructor, assuming objects created
     * by the `Object` constructor have no inherited enumerable properties and that
     * there are no `Object.prototype` extensions.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
     */
    function shimIsPlainObject(value) {
      var ctor,
          result;

      // avoid non Object objects, `arguments` objects, and DOM elements
      if (!(value && toString.call(value) == objectClass) ||
          (ctor = value.constructor, isFunction(ctor) && !(ctor instanceof ctor))) {
        return false;
      }
      // In most environments an object's own properties are iterated before
      // its inherited properties. If the last iterated property is an object's
      // own property then there are no inherited enumerable properties.
      forIn(value, function(value, key) {
        result = key;
      });
      return typeof result == 'undefined' || hasOwnProperty.call(value, result);
    }

    /**
     * Used by `unescape` to convert HTML entities to characters.
     *
     * @private
     * @param {string} match The matched character to unescape.
     * @returns {string} Returns the unescaped character.
     */
    function unescapeHtmlChar(match) {
      return htmlUnescapes[match];
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Checks if `value` is an `arguments` object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is an `arguments` object, else `false`.
     * @example
     *
     * (function() { return _.isArguments(arguments); })(1, 2, 3);
     * // => true
     *
     * _.isArguments([1, 2, 3]);
     * // => false
     */
    function isArguments(value) {
      return value && typeof value == 'object' && typeof value.length == 'number' &&
        toString.call(value) == argsClass || false;
    }

    /**
     * Checks if `value` is an array.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is an array, else `false`.
     * @example
     *
     * (function() { return _.isArray(arguments); })();
     * // => false
     *
     * _.isArray([1, 2, 3]);
     * // => true
     */
    var isArray = nativeIsArray || function(value) {
      return value && typeof value == 'object' && typeof value.length == 'number' &&
        toString.call(value) == arrayClass || false;
    };

    /**
     * A fallback implementation of `Object.keys` which produces an array of the
     * given object's own enumerable property names.
     *
     * @private
     * @type Function
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property names.
     */
    var shimKeys = function(object) {
      var index, iterable = object, result = [];
      if (!iterable) return result;
      if (!(objectTypes[typeof object])) return result;
        for (index in iterable) {
          if (hasOwnProperty.call(iterable, index)) {
            result.push(index);
          }
        }
      return result
    };

    /**
     * Creates an array composed of the own enumerable property names of an object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property names.
     * @example
     *
     * _.keys({ 'one': 1, 'two': 2, 'three': 3 });
     * // => ['one', 'two', 'three'] (property order is not guaranteed across environments)
     */
    var keys = !nativeKeys ? shimKeys : function(object) {
      if (!isObject(object)) {
        return [];
      }
      return nativeKeys(object);
    };

    /**
     * Used to convert characters to HTML entities:
     *
     * Though the `>` character is escaped for symmetry, characters like `>` and `/`
     * don't require escaping in HTML and have no special meaning unless they're part
     * of a tag or an unquoted attribute value.
     * http://mathiasbynens.be/notes/ambiguous-ampersands (under "semi-related fun fact")
     */
    var htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    /** Used to convert HTML entities to characters */
    var htmlUnescapes = invert(htmlEscapes);

    /** Used to match HTML entities and HTML characters */
    var reEscapedHtml = RegExp('(' + keys(htmlUnescapes).join('|') + ')', 'g'),
        reUnescapedHtml = RegExp('[' + keys(htmlEscapes).join('') + ']', 'g');

    /*--------------------------------------------------------------------------*/

    /**
     * Assigns own enumerable properties of source object(s) to the destination
     * object. Subsequent sources will overwrite property assignments of previous
     * sources. If a callback is provided it will be executed to produce the
     * assigned values. The callback is bound to `thisArg` and invoked with two
     * arguments; (objectValue, sourceValue).
     *
     * @static
     * @memberOf _
     * @type Function
     * @alias extend
     * @category Objects
     * @param {Object} object The destination object.
     * @param {...Object} [source] The source objects.
     * @param {Function} [callback] The function to customize assigning values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * _.assign({ 'name': 'fred' }, { 'employer': 'slate' });
     * // => { 'name': 'fred', 'employer': 'slate' }
     *
     * var defaults = _.partialRight(_.assign, function(a, b) {
     *   return typeof a == 'undefined' ? b : a;
     * });
     *
     * var object = { 'name': 'barney' };
     * defaults(object, { 'name': 'fred', 'employer': 'slate' });
     * // => { 'name': 'barney', 'employer': 'slate' }
     */
    var assign = function(object, source, guard) {
      var index, iterable = object, result = iterable;
      if (!iterable) return result;
      var args = arguments,
          argsIndex = 0,
          argsLength = typeof guard == 'number' ? 2 : args.length;
      if (argsLength > 3 && typeof args[argsLength - 2] == 'function') {
        var callback = baseCreateCallback(args[--argsLength - 1], args[argsLength--], 2);
      } else if (argsLength > 2 && typeof args[argsLength - 1] == 'function') {
        callback = args[--argsLength];
      }
      while (++argsIndex < argsLength) {
        iterable = args[argsIndex];
        if (iterable && objectTypes[typeof iterable]) {
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] && keys(iterable),
            length = ownProps ? ownProps.length : 0;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          result[index] = callback ? callback(result[index], iterable[index]) : iterable[index];
        }
        }
      }
      return result
    };

    /**
     * Creates a clone of `value`. If `isDeep` is `true` nested objects will also
     * be cloned, otherwise they will be assigned by reference. If a callback
     * is provided it will be executed to produce the cloned values. If the
     * callback returns `undefined` cloning will be handled by the method instead.
     * The callback is bound to `thisArg` and invoked with one argument; (value).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to clone.
     * @param {boolean} [isDeep=false] Specify a deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the cloned value.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * var shallow = _.clone(characters);
     * shallow[0] === characters[0];
     * // => true
     *
     * var deep = _.clone(characters, true);
     * deep[0] === characters[0];
     * // => false
     *
     * _.mixin({
     *   'clone': _.partialRight(_.clone, function(value) {
     *     return _.isElement(value) ? value.cloneNode(false) : undefined;
     *   })
     * });
     *
     * var clone = _.clone(document.body);
     * clone.childNodes.length;
     * // => 0
     */
    function clone(value, isDeep, callback, thisArg) {
      // allows working with "Collections" methods without using their `index`
      // and `collection` arguments for `isDeep` and `callback`
      if (typeof isDeep != 'boolean' && isDeep != null) {
        thisArg = callback;
        callback = isDeep;
        isDeep = false;
      }
      return baseClone(value, isDeep, typeof callback == 'function' && baseCreateCallback(callback, thisArg, 1));
    }

    /**
     * Creates a deep clone of `value`. If a callback is provided it will be
     * executed to produce the cloned values. If the callback returns `undefined`
     * cloning will be handled by the method instead. The callback is bound to
     * `thisArg` and invoked with one argument; (value).
     *
     * Note: This method is loosely based on the structured clone algorithm. Functions
     * and DOM nodes are **not** cloned. The enumerable properties of `arguments` objects and
     * objects created by constructors other than `Object` are cloned to plain `Object` objects.
     * See http://www.w3.org/TR/html5/infrastructure.html#internal-structured-cloning-algorithm.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the deep cloned value.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * var deep = _.cloneDeep(characters);
     * deep[0] === characters[0];
     * // => false
     *
     * var view = {
     *   'label': 'docs',
     *   'node': element
     * };
     *
     * var clone = _.cloneDeep(view, function(value) {
     *   return _.isElement(value) ? value.cloneNode(true) : undefined;
     * });
     *
     * clone.node == view.node;
     * // => false
     */
    function cloneDeep(value, callback, thisArg) {
      return baseClone(value, true, typeof callback == 'function' && baseCreateCallback(callback, thisArg, 1));
    }

    /**
     * Creates an object that inherits from the given `prototype` object. If a
     * `properties` object is provided its own enumerable properties are assigned
     * to the created object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} prototype The object to inherit from.
     * @param {Object} [properties] The properties to assign to the object.
     * @returns {Object} Returns the new object.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * function Circle() {
     *   Shape.call(this);
     * }
     *
     * Circle.prototype = _.create(Shape.prototype, { 'constructor': Circle });
     *
     * var circle = new Circle;
     * circle instanceof Circle;
     * // => true
     *
     * circle instanceof Shape;
     * // => true
     */
    function create(prototype, properties) {
      var result = baseCreate(prototype);
      return properties ? assign(result, properties) : result;
    }

    /**
     * Assigns own enumerable properties of source object(s) to the destination
     * object for all destination properties that resolve to `undefined`. Once a
     * property is set, additional defaults of the same property will be ignored.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The destination object.
     * @param {...Object} [source] The source objects.
     * @param- {Object} [guard] Allows working with `_.reduce` without using its
     *  `key` and `object` arguments as sources.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * var object = { 'name': 'barney' };
     * _.defaults(object, { 'name': 'fred', 'employer': 'slate' });
     * // => { 'name': 'barney', 'employer': 'slate' }
     */
    var defaults = function(object, source, guard) {
      var index, iterable = object, result = iterable;
      if (!iterable) return result;
      var args = arguments,
          argsIndex = 0,
          argsLength = typeof guard == 'number' ? 2 : args.length;
      while (++argsIndex < argsLength) {
        iterable = args[argsIndex];
        if (iterable && objectTypes[typeof iterable]) {
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] && keys(iterable),
            length = ownProps ? ownProps.length : 0;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          if (typeof result[index] == 'undefined') result[index] = iterable[index];
        }
        }
      }
      return result
    };

    /**
     * This method is like `_.findIndex` except that it returns the key of the
     * first element that passes the callback check, instead of the element itself.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to search.
     * @param {Function|Object|string} [callback=identity] The function called per
     *  iteration. If a property name or object is provided it will be used to
     *  create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {string|undefined} Returns the key of the found element, else `undefined`.
     * @example
     *
     * var characters = {
     *   'barney': {  'age': 36, 'blocked': false },
     *   'fred': {    'age': 40, 'blocked': true },
     *   'pebbles': { 'age': 1,  'blocked': false }
     * };
     *
     * _.findKey(characters, function(chr) {
     *   return chr.age < 40;
     * });
     * // => 'barney' (property order is not guaranteed across environments)
     *
     * // using "_.where" callback shorthand
     * _.findKey(characters, { 'age': 1 });
     * // => 'pebbles'
     *
     * // using "_.pluck" callback shorthand
     * _.findKey(characters, 'blocked');
     * // => 'fred'
     */
    function findKey(object, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      forOwn(object, function(value, key, object) {
        if (callback(value, key, object)) {
          result = key;
          return false;
        }
      });
      return result;
    }

    /**
     * This method is like `_.findKey` except that it iterates over elements
     * of a `collection` in the opposite order.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to search.
     * @param {Function|Object|string} [callback=identity] The function called per
     *  iteration. If a property name or object is provided it will be used to
     *  create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {string|undefined} Returns the key of the found element, else `undefined`.
     * @example
     *
     * var characters = {
     *   'barney': {  'age': 36, 'blocked': true },
     *   'fred': {    'age': 40, 'blocked': false },
     *   'pebbles': { 'age': 1,  'blocked': true }
     * };
     *
     * _.findLastKey(characters, function(chr) {
     *   return chr.age < 40;
     * });
     * // => returns `pebbles`, assuming `_.findKey` returns `barney`
     *
     * // using "_.where" callback shorthand
     * _.findLastKey(characters, { 'age': 40 });
     * // => 'fred'
     *
     * // using "_.pluck" callback shorthand
     * _.findLastKey(characters, 'blocked');
     * // => 'pebbles'
     */
    function findLastKey(object, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      forOwnRight(object, function(value, key, object) {
        if (callback(value, key, object)) {
          result = key;
          return false;
        }
      });
      return result;
    }

    /**
     * Iterates over own and inherited enumerable properties of an object,
     * executing the callback for each property. The callback is bound to `thisArg`
     * and invoked with three arguments; (value, key, object). Callbacks may exit
     * iteration early by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * Shape.prototype.move = function(x, y) {
     *   this.x += x;
     *   this.y += y;
     * };
     *
     * _.forIn(new Shape, function(value, key) {
     *   console.log(key);
     * });
     * // => logs 'x', 'y', and 'move' (property order is not guaranteed across environments)
     */
    var forIn = function(collection, callback, thisArg) {
      var index, iterable = collection, result = iterable;
      if (!iterable) return result;
      if (!objectTypes[typeof iterable]) return result;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
        for (index in iterable) {
          if (callback(iterable[index], index, collection) === false) return result;
        }
      return result
    };

    /**
     * This method is like `_.forIn` except that it iterates over elements
     * of a `collection` in the opposite order.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * Shape.prototype.move = function(x, y) {
     *   this.x += x;
     *   this.y += y;
     * };
     *
     * _.forInRight(new Shape, function(value, key) {
     *   console.log(key);
     * });
     * // => logs 'move', 'y', and 'x' assuming `_.forIn ` logs 'x', 'y', and 'move'
     */
    function forInRight(object, callback, thisArg) {
      var pairs = [];

      forIn(object, function(value, key) {
        pairs.push(key, value);
      });

      var length = pairs.length;
      callback = baseCreateCallback(callback, thisArg, 3);
      while (length--) {
        if (callback(pairs[length--], pairs[length], object) === false) {
          break;
        }
      }
      return object;
    }

    /**
     * Iterates over own enumerable properties of an object, executing the callback
     * for each property. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, key, object). Callbacks may exit iteration early by
     * explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * _.forOwn({ '0': 'zero', '1': 'one', 'length': 2 }, function(num, key) {
     *   console.log(key);
     * });
     * // => logs '0', '1', and 'length' (property order is not guaranteed across environments)
     */
    var forOwn = function(collection, callback, thisArg) {
      var index, iterable = collection, result = iterable;
      if (!iterable) return result;
      if (!objectTypes[typeof iterable]) return result;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] && keys(iterable),
            length = ownProps ? ownProps.length : 0;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          if (callback(iterable[index], index, collection) === false) return result;
        }
      return result
    };

    /**
     * This method is like `_.forOwn` except that it iterates over elements
     * of a `collection` in the opposite order.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * _.forOwnRight({ '0': 'zero', '1': 'one', 'length': 2 }, function(num, key) {
     *   console.log(key);
     * });
     * // => logs 'length', '1', and '0' assuming `_.forOwn` logs '0', '1', and 'length'
     */
    function forOwnRight(object, callback, thisArg) {
      var props = keys(object),
          length = props.length;

      callback = baseCreateCallback(callback, thisArg, 3);
      while (length--) {
        var key = props[length];
        if (callback(object[key], key, object) === false) {
          break;
        }
      }
      return object;
    }

    /**
     * Creates a sorted array of property names of all enumerable properties,
     * own and inherited, of `object` that have function values.
     *
     * @static
     * @memberOf _
     * @alias methods
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property names that have function values.
     * @example
     *
     * _.functions(_);
     * // => ['all', 'any', 'bind', 'bindAll', 'clone', 'compact', 'compose', ...]
     */
    function functions(object) {
      var result = [];
      forIn(object, function(value, key) {
        if (isFunction(value)) {
          result.push(key);
        }
      });
      return result.sort();
    }

    /**
     * Checks if the specified property name exists as a direct property of `object`,
     * instead of an inherited property.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @param {string} key The name of the property to check.
     * @returns {boolean} Returns `true` if key is a direct property, else `false`.
     * @example
     *
     * _.has({ 'a': 1, 'b': 2, 'c': 3 }, 'b');
     * // => true
     */
    function has(object, key) {
      return object ? hasOwnProperty.call(object, key) : false;
    }

    /**
     * Creates an object composed of the inverted keys and values of the given object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to invert.
     * @returns {Object} Returns the created inverted object.
     * @example
     *
     * _.invert({ 'first': 'fred', 'second': 'barney' });
     * // => { 'fred': 'first', 'barney': 'second' }
     */
    function invert(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = {};

      while (++index < length) {
        var key = props[index];
        result[object[key]] = key;
      }
      return result;
    }

    /**
     * Checks if `value` is a boolean value.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a boolean value, else `false`.
     * @example
     *
     * _.isBoolean(null);
     * // => false
     */
    function isBoolean(value) {
      return value === true || value === false ||
        value && typeof value == 'object' && toString.call(value) == boolClass || false;
    }

    /**
     * Checks if `value` is a date.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a date, else `false`.
     * @example
     *
     * _.isDate(new Date);
     * // => true
     */
    function isDate(value) {
      return value && typeof value == 'object' && toString.call(value) == dateClass || false;
    }

    /**
     * Checks if `value` is a DOM element.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a DOM element, else `false`.
     * @example
     *
     * _.isElement(document.body);
     * // => true
     */
    function isElement(value) {
      return value && value.nodeType === 1 || false;
    }

    /**
     * Checks if `value` is empty. Arrays, strings, or `arguments` objects with a
     * length of `0` and objects with no own enumerable properties are considered
     * "empty".
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Array|Object|string} value The value to inspect.
     * @returns {boolean} Returns `true` if the `value` is empty, else `false`.
     * @example
     *
     * _.isEmpty([1, 2, 3]);
     * // => false
     *
     * _.isEmpty({});
     * // => true
     *
     * _.isEmpty('');
     * // => true
     */
    function isEmpty(value) {
      var result = true;
      if (!value) {
        return result;
      }
      var className = toString.call(value),
          length = value.length;

      if ((className == arrayClass || className == stringClass || className == argsClass ) ||
          (className == objectClass && typeof length == 'number' && isFunction(value.splice))) {
        return !length;
      }
      forOwn(value, function() {
        return (result = false);
      });
      return result;
    }

    /**
     * Performs a deep comparison between two values to determine if they are
     * equivalent to each other. If a callback is provided it will be executed
     * to compare values. If the callback returns `undefined` comparisons will
     * be handled by the method instead. The callback is bound to `thisArg` and
     * invoked with two arguments; (a, b).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} a The value to compare.
     * @param {*} b The other value to compare.
     * @param {Function} [callback] The function to customize comparing values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     * @example
     *
     * var object = { 'name': 'fred' };
     * var copy = { 'name': 'fred' };
     *
     * object == copy;
     * // => false
     *
     * _.isEqual(object, copy);
     * // => true
     *
     * var words = ['hello', 'goodbye'];
     * var otherWords = ['hi', 'goodbye'];
     *
     * _.isEqual(words, otherWords, function(a, b) {
     *   var reGreet = /^(?:hello|hi)$/i,
     *       aGreet = _.isString(a) && reGreet.test(a),
     *       bGreet = _.isString(b) && reGreet.test(b);
     *
     *   return (aGreet || bGreet) ? (aGreet == bGreet) : undefined;
     * });
     * // => true
     */
    function isEqual(a, b, callback, thisArg) {
      return baseIsEqual(a, b, typeof callback == 'function' && baseCreateCallback(callback, thisArg, 2));
    }

    /**
     * Checks if `value` is, or can be coerced to, a finite number.
     *
     * Note: This is not the same as native `isFinite` which will return true for
     * booleans and empty strings. See http://es5.github.io/#x15.1.2.5.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is finite, else `false`.
     * @example
     *
     * _.isFinite(-101);
     * // => true
     *
     * _.isFinite('10');
     * // => true
     *
     * _.isFinite(true);
     * // => false
     *
     * _.isFinite('');
     * // => false
     *
     * _.isFinite(Infinity);
     * // => false
     */
    function isFinite(value) {
      return nativeIsFinite(value) && !nativeIsNaN(parseFloat(value));
    }

    /**
     * Checks if `value` is a function.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a function, else `false`.
     * @example
     *
     * _.isFunction(_);
     * // => true
     */
    function isFunction(value) {
      return typeof value == 'function';
    }

    /**
     * Checks if `value` is the language type of Object.
     * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(1);
     * // => false
     */
    function isObject(value) {
      // check if the value is the ECMAScript language type of Object
      // http://es5.github.io/#x8
      // and avoid a V8 bug
      // http://code.google.com/p/v8/issues/detail?id=2291
      return !!(value && objectTypes[typeof value]);
    }

    /**
     * Checks if `value` is `NaN`.
     *
     * Note: This is not the same as native `isNaN` which will return `true` for
     * `undefined` and other non-numeric values. See http://es5.github.io/#x15.1.2.4.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is `NaN`, else `false`.
     * @example
     *
     * _.isNaN(NaN);
     * // => true
     *
     * _.isNaN(new Number(NaN));
     * // => true
     *
     * isNaN(undefined);
     * // => true
     *
     * _.isNaN(undefined);
     * // => false
     */
    function isNaN(value) {
      // `NaN` as a primitive is the only value that is not equal to itself
      // (perform the [[Class]] check first to avoid errors with some host objects in IE)
      return isNumber(value) && value != +value;
    }

    /**
     * Checks if `value` is `null`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is `null`, else `false`.
     * @example
     *
     * _.isNull(null);
     * // => true
     *
     * _.isNull(undefined);
     * // => false
     */
    function isNull(value) {
      return value === null;
    }

    /**
     * Checks if `value` is a number.
     *
     * Note: `NaN` is considered a number. See http://es5.github.io/#x8.5.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a number, else `false`.
     * @example
     *
     * _.isNumber(8.4 * 5);
     * // => true
     */
    function isNumber(value) {
      return typeof value == 'number' ||
        value && typeof value == 'object' && toString.call(value) == numberClass || false;
    }

    /**
     * Checks if `value` is an object created by the `Object` constructor.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * _.isPlainObject(new Shape);
     * // => false
     *
     * _.isPlainObject([1, 2, 3]);
     * // => false
     *
     * _.isPlainObject({ 'x': 0, 'y': 0 });
     * // => true
     */
    var isPlainObject = !getPrototypeOf ? shimIsPlainObject : function(value) {
      if (!(value && toString.call(value) == objectClass)) {
        return false;
      }
      var valueOf = value.valueOf,
          objProto = isNative(valueOf) && (objProto = getPrototypeOf(valueOf)) && getPrototypeOf(objProto);

      return objProto
        ? (value == objProto || getPrototypeOf(value) == objProto)
        : shimIsPlainObject(value);
    };

    /**
     * Checks if `value` is a regular expression.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a regular expression, else `false`.
     * @example
     *
     * _.isRegExp(/fred/);
     * // => true
     */
    function isRegExp(value) {
      return value && typeof value == 'object' && toString.call(value) == regexpClass || false;
    }

    /**
     * Checks if `value` is a string.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a string, else `false`.
     * @example
     *
     * _.isString('fred');
     * // => true
     */
    function isString(value) {
      return typeof value == 'string' ||
        value && typeof value == 'object' && toString.call(value) == stringClass || false;
    }

    /**
     * Checks if `value` is `undefined`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is `undefined`, else `false`.
     * @example
     *
     * _.isUndefined(void 0);
     * // => true
     */
    function isUndefined(value) {
      return typeof value == 'undefined';
    }

    /**
     * Creates an object with the same keys as `object` and values generated by
     * running each own enumerable property of `object` through the callback.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, key, object).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new object with values of the results of each `callback` execution.
     * @example
     *
     * _.mapValues({ 'a': 1, 'b': 2, 'c': 3} , function(num) { return num * 3; });
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     *
     * var characters = {
     *   'fred': { 'name': 'fred', 'age': 40 },
     *   'pebbles': { 'name': 'pebbles', 'age': 1 }
     * };
     *
     * // using "_.pluck" callback shorthand
     * _.mapValues(characters, 'age');
     * // => { 'fred': 40, 'pebbles': 1 }
     */
    function mapValues(object, callback, thisArg) {
      var result = {};
      callback = lodash.createCallback(callback, thisArg, 3);

      forOwn(object, function(value, key, object) {
        result[key] = callback(value, key, object);
      });
      return result;
    }

    /**
     * Recursively merges own enumerable properties of the source object(s), that
     * don't resolve to `undefined` into the destination object. Subsequent sources
     * will overwrite property assignments of previous sources. If a callback is
     * provided it will be executed to produce the merged values of the destination
     * and source properties. If the callback returns `undefined` merging will
     * be handled by the method instead. The callback is bound to `thisArg` and
     * invoked with two arguments; (objectValue, sourceValue).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The destination object.
     * @param {...Object} [source] The source objects.
     * @param {Function} [callback] The function to customize merging properties.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * var names = {
     *   'characters': [
     *     { 'name': 'barney' },
     *     { 'name': 'fred' }
     *   ]
     * };
     *
     * var ages = {
     *   'characters': [
     *     { 'age': 36 },
     *     { 'age': 40 }
     *   ]
     * };
     *
     * _.merge(names, ages);
     * // => { 'characters': [{ 'name': 'barney', 'age': 36 }, { 'name': 'fred', 'age': 40 }] }
     *
     * var food = {
     *   'fruits': ['apple'],
     *   'vegetables': ['beet']
     * };
     *
     * var otherFood = {
     *   'fruits': ['banana'],
     *   'vegetables': ['carrot']
     * };
     *
     * _.merge(food, otherFood, function(a, b) {
     *   return _.isArray(a) ? a.concat(b) : undefined;
     * });
     * // => { 'fruits': ['apple', 'banana'], 'vegetables': ['beet', 'carrot] }
     */
    function merge(object) {
      var args = arguments,
          length = 2;

      if (!isObject(object)) {
        return object;
      }
      // allows working with `_.reduce` and `_.reduceRight` without using
      // their `index` and `collection` arguments
      if (typeof args[2] != 'number') {
        length = args.length;
      }
      if (length > 3 && typeof args[length - 2] == 'function') {
        var callback = baseCreateCallback(args[--length - 1], args[length--], 2);
      } else if (length > 2 && typeof args[length - 1] == 'function') {
        callback = args[--length];
      }
      var sources = slice(arguments, 1, length),
          index = -1,
          stackA = getArray(),
          stackB = getArray();

      while (++index < length) {
        baseMerge(object, sources[index], callback, stackA, stackB);
      }
      releaseArray(stackA);
      releaseArray(stackB);
      return object;
    }

    /**
     * Creates a shallow clone of `object` excluding the specified properties.
     * Property names may be specified as individual arguments or as arrays of
     * property names. If a callback is provided it will be executed for each
     * property of `object` omitting the properties the callback returns truey
     * for. The callback is bound to `thisArg` and invoked with three arguments;
     * (value, key, object).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The source object.
     * @param {Function|...string|string[]} [callback] The properties to omit or the
     *  function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns an object without the omitted properties.
     * @example
     *
     * _.omit({ 'name': 'fred', 'age': 40 }, 'age');
     * // => { 'name': 'fred' }
     *
     * _.omit({ 'name': 'fred', 'age': 40 }, function(value) {
     *   return typeof value == 'number';
     * });
     * // => { 'name': 'fred' }
     */
    function omit(object, callback, thisArg) {
      var result = {};
      if (typeof callback != 'function') {
        var props = [];
        forIn(object, function(value, key) {
          props.push(key);
        });
        props = baseDifference(props, baseFlatten(arguments, true, false, 1));

        var index = -1,
            length = props.length;

        while (++index < length) {
          var key = props[index];
          result[key] = object[key];
        }
      } else {
        callback = lodash.createCallback(callback, thisArg, 3);
        forIn(object, function(value, key, object) {
          if (!callback(value, key, object)) {
            result[key] = value;
          }
        });
      }
      return result;
    }

    /**
     * Creates a two dimensional array of an object's key-value pairs,
     * i.e. `[[key1, value1], [key2, value2]]`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns new array of key-value pairs.
     * @example
     *
     * _.pairs({ 'barney': 36, 'fred': 40 });
     * // => [['barney', 36], ['fred', 40]] (property order is not guaranteed across environments)
     */
    function pairs(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = Array(length);

      while (++index < length) {
        var key = props[index];
        result[index] = [key, object[key]];
      }
      return result;
    }

    /**
     * Creates a shallow clone of `object` composed of the specified properties.
     * Property names may be specified as individual arguments or as arrays of
     * property names. If a callback is provided it will be executed for each
     * property of `object` picking the properties the callback returns truey
     * for. The callback is bound to `thisArg` and invoked with three arguments;
     * (value, key, object).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The source object.
     * @param {Function|...string|string[]} [callback] The function called per
     *  iteration or property names to pick, specified as individual property
     *  names or arrays of property names.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns an object composed of the picked properties.
     * @example
     *
     * _.pick({ 'name': 'fred', '_userid': 'fred1' }, 'name');
     * // => { 'name': 'fred' }
     *
     * _.pick({ 'name': 'fred', '_userid': 'fred1' }, function(value, key) {
     *   return key.charAt(0) != '_';
     * });
     * // => { 'name': 'fred' }
     */
    function pick(object, callback, thisArg) {
      var result = {};
      if (typeof callback != 'function') {
        var index = -1,
            props = baseFlatten(arguments, true, false, 1),
            length = isObject(object) ? props.length : 0;

        while (++index < length) {
          var key = props[index];
          if (key in object) {
            result[key] = object[key];
          }
        }
      } else {
        callback = lodash.createCallback(callback, thisArg, 3);
        forIn(object, function(value, key, object) {
          if (callback(value, key, object)) {
            result[key] = value;
          }
        });
      }
      return result;
    }

    /**
     * An alternative to `_.reduce` this method transforms `object` to a new
     * `accumulator` object which is the result of running each of its own
     * enumerable properties through a callback, with each callback execution
     * potentially mutating the `accumulator` object. The callback is bound to
     * `thisArg` and invoked with four arguments; (accumulator, value, key, object).
     * Callbacks may exit iteration early by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Array|Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [accumulator] The custom accumulator value.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * var squares = _.transform([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], function(result, num) {
     *   num *= num;
     *   if (num % 2) {
     *     return result.push(num) < 3;
     *   }
     * });
     * // => [1, 9, 25]
     *
     * var mapped = _.transform({ 'a': 1, 'b': 2, 'c': 3 }, function(result, num, key) {
     *   result[key] = num * 3;
     * });
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     */
    function transform(object, callback, accumulator, thisArg) {
      var isArr = isArray(object);
      if (accumulator == null) {
        if (isArr) {
          accumulator = [];
        } else {
          var ctor = object && object.constructor,
              proto = ctor && ctor.prototype;

          accumulator = baseCreate(proto);
        }
      }
      if (callback) {
        callback = lodash.createCallback(callback, thisArg, 4);
        (isArr ? forEach : forOwn)(object, function(value, index, object) {
          return callback(accumulator, value, index, object);
        });
      }
      return accumulator;
    }

    /**
     * Creates an array composed of the own enumerable property values of `object`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property values.
     * @example
     *
     * _.values({ 'one': 1, 'two': 2, 'three': 3 });
     * // => [1, 2, 3] (property order is not guaranteed across environments)
     */
    function values(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = Array(length);

      while (++index < length) {
        result[index] = object[props[index]];
      }
      return result;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates an array of elements from the specified indexes, or keys, of the
     * `collection`. Indexes may be specified as individual arguments or as arrays
     * of indexes.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {...(number|number[]|string|string[])} [index] The indexes of `collection`
     *   to retrieve, specified as individual indexes or arrays of indexes.
     * @returns {Array} Returns a new array of elements corresponding to the
     *  provided indexes.
     * @example
     *
     * _.at(['a', 'b', 'c', 'd', 'e'], [0, 2, 4]);
     * // => ['a', 'c', 'e']
     *
     * _.at(['fred', 'barney', 'pebbles'], 0, 2);
     * // => ['fred', 'pebbles']
     */
    function at(collection) {
      var args = arguments,
          index = -1,
          props = baseFlatten(args, true, false, 1),
          length = (args[2] && args[2][args[1]] === collection) ? 1 : props.length,
          result = Array(length);

      while(++index < length) {
        result[index] = collection[props[index]];
      }
      return result;
    }

    /**
     * Checks if a given value is present in a collection using strict equality
     * for comparisons, i.e. `===`. If `fromIndex` is negative, it is used as the
     * offset from the end of the collection.
     *
     * @static
     * @memberOf _
     * @alias include
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {*} target The value to check for.
     * @param {number} [fromIndex=0] The index to search from.
     * @returns {boolean} Returns `true` if the `target` element is found, else `false`.
     * @example
     *
     * _.contains([1, 2, 3], 1);
     * // => true
     *
     * _.contains([1, 2, 3], 1, 2);
     * // => false
     *
     * _.contains({ 'name': 'fred', 'age': 40 }, 'fred');
     * // => true
     *
     * _.contains('pebbles', 'eb');
     * // => true
     */
    function contains(collection, target, fromIndex) {
      var index = -1,
          indexOf = getIndexOf(),
          length = collection ? collection.length : 0,
          result = false;

      fromIndex = (fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex) || 0;
      if (isArray(collection)) {
        result = indexOf(collection, target, fromIndex) > -1;
      } else if (typeof length == 'number') {
        result = (isString(collection) ? collection.indexOf(target, fromIndex) : indexOf(collection, target, fromIndex)) > -1;
      } else {
        forOwn(collection, function(value) {
          if (++index >= fromIndex) {
            return !(result = value === target);
          }
        });
      }
      return result;
    }

    /**
     * Creates an object composed of keys generated from the results of running
     * each element of `collection` through the callback. The corresponding value
     * of each key is the number of times the key was returned by the callback.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.countBy([4.3, 6.1, 6.4], function(num) { return Math.floor(num); });
     * // => { '4': 1, '6': 2 }
     *
     * _.countBy([4.3, 6.1, 6.4], function(num) { return this.floor(num); }, Math);
     * // => { '4': 1, '6': 2 }
     *
     * _.countBy(['one', 'two', 'three'], 'length');
     * // => { '3': 2, '5': 1 }
     */
    var countBy = createAggregator(function(result, value, key) {
      (hasOwnProperty.call(result, key) ? result[key]++ : result[key] = 1);
    });

    /**
     * Checks if the given callback returns truey value for **all** elements of
     * a collection. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias all
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {boolean} Returns `true` if all elements passed the callback check,
     *  else `false`.
     * @example
     *
     * _.every([true, 1, null, 'yes']);
     * // => false
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.every(characters, 'age');
     * // => true
     *
     * // using "_.where" callback shorthand
     * _.every(characters, { 'age': 36 });
     * // => false
     */
    function every(collection, callback, thisArg) {
      var result = true;
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          if (!(result = !!callback(collection[index], index, collection))) {
            break;
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          return (result = !!callback(value, index, collection));
        });
      }
      return result;
    }

    /**
     * Iterates over elements of a collection, returning an array of all elements
     * the callback returns truey for. The callback is bound to `thisArg` and
     * invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias select
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of elements that passed the callback check.
     * @example
     *
     * var evens = _.filter([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
     * // => [2, 4, 6]
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'blocked': false },
     *   { 'name': 'fred',   'age': 40, 'blocked': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.filter(characters, 'blocked');
     * // => [{ 'name': 'fred', 'age': 40, 'blocked': true }]
     *
     * // using "_.where" callback shorthand
     * _.filter(characters, { 'age': 36 });
     * // => [{ 'name': 'barney', 'age': 36, 'blocked': false }]
     */
    function filter(collection, callback, thisArg) {
      var result = [];
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          var value = collection[index];
          if (callback(value, index, collection)) {
            result.push(value);
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          if (callback(value, index, collection)) {
            result.push(value);
          }
        });
      }
      return result;
    }

    /**
     * Iterates over elements of a collection, returning the first element that
     * the callback returns truey for. The callback is bound to `thisArg` and
     * invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias detect, findWhere
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the found element, else `undefined`.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36, 'blocked': false },
     *   { 'name': 'fred',    'age': 40, 'blocked': true },
     *   { 'name': 'pebbles', 'age': 1,  'blocked': false }
     * ];
     *
     * _.find(characters, function(chr) {
     *   return chr.age < 40;
     * });
     * // => { 'name': 'barney', 'age': 36, 'blocked': false }
     *
     * // using "_.where" callback shorthand
     * _.find(characters, { 'age': 1 });
     * // =>  { 'name': 'pebbles', 'age': 1, 'blocked': false }
     *
     * // using "_.pluck" callback shorthand
     * _.find(characters, 'blocked');
     * // => { 'name': 'fred', 'age': 40, 'blocked': true }
     */
    function find(collection, callback, thisArg) {
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          var value = collection[index];
          if (callback(value, index, collection)) {
            return value;
          }
        }
      } else {
        var result;
        forOwn(collection, function(value, index, collection) {
          if (callback(value, index, collection)) {
            result = value;
            return false;
          }
        });
        return result;
      }
    }

    /**
     * This method is like `_.find` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the found element, else `undefined`.
     * @example
     *
     * _.findLast([1, 2, 3, 4], function(num) {
     *   return num % 2 == 1;
     * });
     * // => 3
     */
    function findLast(collection, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      forEachRight(collection, function(value, index, collection) {
        if (callback(value, index, collection)) {
          result = value;
          return false;
        }
      });
      return result;
    }

    /**
     * Iterates over elements of a collection, executing the callback for each
     * element. The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection). Callbacks may exit iteration early by
     * explicitly returning `false`.
     *
     * Note: As with other "Collections" methods, objects with a `length` property
     * are iterated like arrays. To avoid this behavior `_.forIn` or `_.forOwn`
     * may be used for object iteration.
     *
     * @static
     * @memberOf _
     * @alias each
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array|Object|string} Returns `collection`.
     * @example
     *
     * _([1, 2, 3]).forEach(function(num) { console.log(num); }).join(',');
     * // => logs each number and returns '1,2,3'
     *
     * _.forEach({ 'one': 1, 'two': 2, 'three': 3 }, function(num) { console.log(num); });
     * // => logs each number and returns the object (property order is not guaranteed across environments)
     */
    function forEach(collection, callback, thisArg) {
      var index = -1,
          length = collection ? collection.length : 0;

      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
      if (typeof length == 'number') {
        while (++index < length) {
          if (callback(collection[index], index, collection) === false) {
            break;
          }
        }
      } else {
        forOwn(collection, callback);
      }
      return collection;
    }

    /**
     * This method is like `_.forEach` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @alias eachRight
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array|Object|string} Returns `collection`.
     * @example
     *
     * _([1, 2, 3]).forEachRight(function(num) { console.log(num); }).join(',');
     * // => logs each number from right to left and returns '3,2,1'
     */
    function forEachRight(collection, callback, thisArg) {
      var length = collection ? collection.length : 0;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
      if (typeof length == 'number') {
        while (length--) {
          if (callback(collection[length], length, collection) === false) {
            break;
          }
        }
      } else {
        var props = keys(collection);
        length = props.length;
        forOwn(collection, function(value, key, collection) {
          key = props ? props[--length] : --length;
          return callback(collection[key], key, collection);
        });
      }
      return collection;
    }

    /**
     * Creates an object composed of keys generated from the results of running
     * each element of a collection through the callback. The corresponding value
     * of each key is an array of the elements responsible for generating the key.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.groupBy([4.2, 6.1, 6.4], function(num) { return Math.floor(num); });
     * // => { '4': [4.2], '6': [6.1, 6.4] }
     *
     * _.groupBy([4.2, 6.1, 6.4], function(num) { return this.floor(num); }, Math);
     * // => { '4': [4.2], '6': [6.1, 6.4] }
     *
     * // using "_.pluck" callback shorthand
     * _.groupBy(['one', 'two', 'three'], 'length');
     * // => { '3': ['one', 'two'], '5': ['three'] }
     */
    var groupBy = createAggregator(function(result, value, key) {
      (hasOwnProperty.call(result, key) ? result[key] : result[key] = []).push(value);
    });

    /**
     * Creates an object composed of keys generated from the results of running
     * each element of the collection through the given callback. The corresponding
     * value of each key is the last element responsible for generating the key.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * var keys = [
     *   { 'dir': 'left', 'code': 97 },
     *   { 'dir': 'right', 'code': 100 }
     * ];
     *
     * _.indexBy(keys, 'dir');
     * // => { 'left': { 'dir': 'left', 'code': 97 }, 'right': { 'dir': 'right', 'code': 100 } }
     *
     * _.indexBy(keys, function(key) { return String.fromCharCode(key.code); });
     * // => { 'a': { 'dir': 'left', 'code': 97 }, 'd': { 'dir': 'right', 'code': 100 } }
     *
     * _.indexBy(characters, function(key) { this.fromCharCode(key.code); }, String);
     * // => { 'a': { 'dir': 'left', 'code': 97 }, 'd': { 'dir': 'right', 'code': 100 } }
     */
    var indexBy = createAggregator(function(result, value, key) {
      result[key] = value;
    });

    /**
     * Invokes the method named by `methodName` on each element in the `collection`
     * returning an array of the results of each invoked method. Additional arguments
     * will be provided to each invoked method. If `methodName` is a function it
     * will be invoked for, and `this` bound to, each element in the `collection`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|string} methodName The name of the method to invoke or
     *  the function invoked per iteration.
     * @param {...*} [arg] Arguments to invoke the method with.
     * @returns {Array} Returns a new array of the results of each invoked method.
     * @example
     *
     * _.invoke([[5, 1, 7], [3, 2, 1]], 'sort');
     * // => [[1, 5, 7], [1, 2, 3]]
     *
     * _.invoke([123, 456], String.prototype.split, '');
     * // => [['1', '2', '3'], ['4', '5', '6']]
     */
    function invoke(collection, methodName) {
      var args = slice(arguments, 2),
          index = -1,
          isFunc = typeof methodName == 'function',
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      forEach(collection, function(value) {
        result[++index] = (isFunc ? methodName : value[methodName]).apply(value, args);
      });
      return result;
    }

    /**
     * Creates an array of values by running each element in the collection
     * through the callback. The callback is bound to `thisArg` and invoked with
     * three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias collect
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of the results of each `callback` execution.
     * @example
     *
     * _.map([1, 2, 3], function(num) { return num * 3; });
     * // => [3, 6, 9]
     *
     * _.map({ 'one': 1, 'two': 2, 'three': 3 }, function(num) { return num * 3; });
     * // => [3, 6, 9] (property order is not guaranteed across environments)
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.map(characters, 'name');
     * // => ['barney', 'fred']
     */
    function map(collection, callback, thisArg) {
      var index = -1,
          length = collection ? collection.length : 0;

      callback = lodash.createCallback(callback, thisArg, 3);
      if (typeof length == 'number') {
        var result = Array(length);
        while (++index < length) {
          result[index] = callback(collection[index], index, collection);
        }
      } else {
        result = [];
        forOwn(collection, function(value, key, collection) {
          result[++index] = callback(value, key, collection);
        });
      }
      return result;
    }

    /**
     * Retrieves the maximum value of a collection. If the collection is empty or
     * falsey `-Infinity` is returned. If a callback is provided it will be executed
     * for each value in the collection to generate the criterion by which the value
     * is ranked. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the maximum value.
     * @example
     *
     * _.max([4, 2, 8, 6]);
     * // => 8
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * _.max(characters, function(chr) { return chr.age; });
     * // => { 'name': 'fred', 'age': 40 };
     *
     * // using "_.pluck" callback shorthand
     * _.max(characters, 'age');
     * // => { 'name': 'fred', 'age': 40 };
     */
    function max(collection, callback, thisArg) {
      var computed = -Infinity,
          result = computed;

      // allows working with functions like `_.map` without using
      // their `index` argument as a callback
      if (typeof callback != 'function' && thisArg && thisArg[callback] === collection) {
        callback = null;
      }
      if (callback == null && isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          var value = collection[index];
          if (value > result) {
            result = value;
          }
        }
      } else {
        callback = (callback == null && isString(collection))
          ? charAtCallback
          : lodash.createCallback(callback, thisArg, 3);

        forEach(collection, function(value, index, collection) {
          var current = callback(value, index, collection);
          if (current > computed) {
            computed = current;
            result = value;
          }
        });
      }
      return result;
    }

    /**
     * Retrieves the minimum value of a collection. If the collection is empty or
     * falsey `Infinity` is returned. If a callback is provided it will be executed
     * for each value in the collection to generate the criterion by which the value
     * is ranked. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the minimum value.
     * @example
     *
     * _.min([4, 2, 8, 6]);
     * // => 2
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * _.min(characters, function(chr) { return chr.age; });
     * // => { 'name': 'barney', 'age': 36 };
     *
     * // using "_.pluck" callback shorthand
     * _.min(characters, 'age');
     * // => { 'name': 'barney', 'age': 36 };
     */
    function min(collection, callback, thisArg) {
      var computed = Infinity,
          result = computed;

      // allows working with functions like `_.map` without using
      // their `index` argument as a callback
      if (typeof callback != 'function' && thisArg && thisArg[callback] === collection) {
        callback = null;
      }
      if (callback == null && isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          var value = collection[index];
          if (value < result) {
            result = value;
          }
        }
      } else {
        callback = (callback == null && isString(collection))
          ? charAtCallback
          : lodash.createCallback(callback, thisArg, 3);

        forEach(collection, function(value, index, collection) {
          var current = callback(value, index, collection);
          if (current < computed) {
            computed = current;
            result = value;
          }
        });
      }
      return result;
    }

    /**
     * Retrieves the value of a specified property from all elements in the collection.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {string} property The name of the property to pluck.
     * @returns {Array} Returns a new array of property values.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * _.pluck(characters, 'name');
     * // => ['barney', 'fred']
     */
    var pluck = map;

    /**
     * Reduces a collection to a value which is the accumulated result of running
     * each element in the collection through the callback, where each successive
     * callback execution consumes the return value of the previous execution. If
     * `accumulator` is not provided the first element of the collection will be
     * used as the initial `accumulator` value. The callback is bound to `thisArg`
     * and invoked with four arguments; (accumulator, value, index|key, collection).
     *
     * @static
     * @memberOf _
     * @alias foldl, inject
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [accumulator] Initial value of the accumulator.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * var sum = _.reduce([1, 2, 3], function(sum, num) {
     *   return sum + num;
     * });
     * // => 6
     *
     * var mapped = _.reduce({ 'a': 1, 'b': 2, 'c': 3 }, function(result, num, key) {
     *   result[key] = num * 3;
     *   return result;
     * }, {});
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     */
    function reduce(collection, callback, accumulator, thisArg) {
      if (!collection) return accumulator;
      var noaccum = arguments.length < 3;
      callback = lodash.createCallback(callback, thisArg, 4);

      var index = -1,
          length = collection.length;

      if (typeof length == 'number') {
        if (noaccum) {
          accumulator = collection[++index];
        }
        while (++index < length) {
          accumulator = callback(accumulator, collection[index], index, collection);
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          accumulator = noaccum
            ? (noaccum = false, value)
            : callback(accumulator, value, index, collection)
        });
      }
      return accumulator;
    }

    /**
     * This method is like `_.reduce` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @alias foldr
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [accumulator] Initial value of the accumulator.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * var list = [[0, 1], [2, 3], [4, 5]];
     * var flat = _.reduceRight(list, function(a, b) { return a.concat(b); }, []);
     * // => [4, 5, 2, 3, 0, 1]
     */
    function reduceRight(collection, callback, accumulator, thisArg) {
      var noaccum = arguments.length < 3;
      callback = lodash.createCallback(callback, thisArg, 4);
      forEachRight(collection, function(value, index, collection) {
        accumulator = noaccum
          ? (noaccum = false, value)
          : callback(accumulator, value, index, collection);
      });
      return accumulator;
    }

    /**
     * The opposite of `_.filter` this method returns the elements of a
     * collection that the callback does **not** return truey for.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of elements that failed the callback check.
     * @example
     *
     * var odds = _.reject([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
     * // => [1, 3, 5]
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'blocked': false },
     *   { 'name': 'fred',   'age': 40, 'blocked': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.reject(characters, 'blocked');
     * // => [{ 'name': 'barney', 'age': 36, 'blocked': false }]
     *
     * // using "_.where" callback shorthand
     * _.reject(characters, { 'age': 36 });
     * // => [{ 'name': 'fred', 'age': 40, 'blocked': true }]
     */
    function reject(collection, callback, thisArg) {
      callback = lodash.createCallback(callback, thisArg, 3);
      return filter(collection, function(value, index, collection) {
        return !callback(value, index, collection);
      });
    }

    /**
     * Retrieves a random element or `n` random elements from a collection.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to sample.
     * @param {number} [n] The number of elements to sample.
     * @param- {Object} [guard] Allows working with functions like `_.map`
     *  without using their `index` arguments as `n`.
     * @returns {Array} Returns the random sample(s) of `collection`.
     * @example
     *
     * _.sample([1, 2, 3, 4]);
     * // => 2
     *
     * _.sample([1, 2, 3, 4], 2);
     * // => [3, 1]
     */
    function sample(collection, n, guard) {
      if (collection && typeof collection.length != 'number') {
        collection = values(collection);
      }
      if (n == null || guard) {
        return collection ? collection[baseRandom(0, collection.length - 1)] : undefined;
      }
      var result = shuffle(collection);
      result.length = nativeMin(nativeMax(0, n), result.length);
      return result;
    }

    /**
     * Creates an array of shuffled values, using a version of the Fisher-Yates
     * shuffle. See http://en.wikipedia.org/wiki/Fisher-Yates_shuffle.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to shuffle.
     * @returns {Array} Returns a new shuffled collection.
     * @example
     *
     * _.shuffle([1, 2, 3, 4, 5, 6]);
     * // => [4, 1, 6, 3, 5, 2]
     */
    function shuffle(collection) {
      var index = -1,
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      forEach(collection, function(value) {
        var rand = baseRandom(0, ++index);
        result[index] = result[rand];
        result[rand] = value;
      });
      return result;
    }

    /**
     * Gets the size of the `collection` by returning `collection.length` for arrays
     * and array-like objects or the number of own enumerable properties for objects.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to inspect.
     * @returns {number} Returns `collection.length` or number of own enumerable properties.
     * @example
     *
     * _.size([1, 2]);
     * // => 2
     *
     * _.size({ 'one': 1, 'two': 2, 'three': 3 });
     * // => 3
     *
     * _.size('pebbles');
     * // => 7
     */
    function size(collection) {
      var length = collection ? collection.length : 0;
      return typeof length == 'number' ? length : keys(collection).length;
    }

    /**
     * Checks if the callback returns a truey value for **any** element of a
     * collection. The function returns as soon as it finds a passing value and
     * does not iterate over the entire collection. The callback is bound to
     * `thisArg` and invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias any
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {boolean} Returns `true` if any element passed the callback check,
     *  else `false`.
     * @example
     *
     * _.some([null, 0, 'yes', false], Boolean);
     * // => true
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'blocked': false },
     *   { 'name': 'fred',   'age': 40, 'blocked': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.some(characters, 'blocked');
     * // => true
     *
     * // using "_.where" callback shorthand
     * _.some(characters, { 'age': 1 });
     * // => false
     */
    function some(collection, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          if ((result = callback(collection[index], index, collection))) {
            break;
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          return !(result = callback(value, index, collection));
        });
      }
      return !!result;
    }

    /**
     * Creates an array of elements, sorted in ascending order by the results of
     * running each element in a collection through the callback. This method
     * performs a stable sort, that is, it will preserve the original sort order
     * of equal elements. The callback is bound to `thisArg` and invoked with
     * three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an array of property names is provided for `callback` the collection
     * will be sorted by each property value.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Array|Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of sorted elements.
     * @example
     *
     * _.sortBy([1, 2, 3], function(num) { return Math.sin(num); });
     * // => [3, 1, 2]
     *
     * _.sortBy([1, 2, 3], function(num) { return this.sin(num); }, Math);
     * // => [3, 1, 2]
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36 },
     *   { 'name': 'fred',    'age': 40 },
     *   { 'name': 'barney',  'age': 26 },
     *   { 'name': 'fred',    'age': 30 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.map(_.sortBy(characters, 'age'), _.values);
     * // => [['barney', 26], ['fred', 30], ['barney', 36], ['fred', 40]]
     *
     * // sorting by multiple properties
     * _.map(_.sortBy(characters, ['name', 'age']), _.values);
     * // = > [['barney', 26], ['barney', 36], ['fred', 30], ['fred', 40]]
     */
    function sortBy(collection, callback, thisArg) {
      var index = -1,
          isArr = isArray(callback),
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      if (!isArr) {
        callback = lodash.createCallback(callback, thisArg, 3);
      }
      forEach(collection, function(value, key, collection) {
        var object = result[++index] = getObject();
        if (isArr) {
          object.criteria = map(callback, function(key) { return value[key]; });
        } else {
          (object.criteria = getArray())[0] = callback(value, key, collection);
        }
        object.index = index;
        object.value = value;
      });

      length = result.length;
      result.sort(compareAscending);
      while (length--) {
        var object = result[length];
        result[length] = object.value;
        if (!isArr) {
          releaseArray(object.criteria);
        }
        releaseObject(object);
      }
      return result;
    }

    /**
     * Converts the `collection` to an array.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to convert.
     * @returns {Array} Returns the new converted array.
     * @example
     *
     * (function() { return _.toArray(arguments).slice(1); })(1, 2, 3, 4);
     * // => [2, 3, 4]
     */
    function toArray(collection) {
      if (collection && typeof collection.length == 'number') {
        return slice(collection);
      }
      return values(collection);
    }

    /**
     * Performs a deep comparison of each element in a `collection` to the given
     * `properties` object, returning an array of all elements that have equivalent
     * property values.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Object} props The object of property values to filter by.
     * @returns {Array} Returns a new array of elements that have the given properties.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'pets': ['hoppy'] },
     *   { 'name': 'fred',   'age': 40, 'pets': ['baby puss', 'dino'] }
     * ];
     *
     * _.where(characters, { 'age': 36 });
     * // => [{ 'name': 'barney', 'age': 36, 'pets': ['hoppy'] }]
     *
     * _.where(characters, { 'pets': ['dino'] });
     * // => [{ 'name': 'fred', 'age': 40, 'pets': ['baby puss', 'dino'] }]
     */
    var where = filter;

    /*--------------------------------------------------------------------------*/

    /**
     * Creates an array with all falsey values removed. The values `false`, `null`,
     * `0`, `""`, `undefined`, and `NaN` are all falsey.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to compact.
     * @returns {Array} Returns a new array of filtered values.
     * @example
     *
     * _.compact([0, 1, false, 2, '', 3]);
     * // => [1, 2, 3]
     */
    function compact(array) {
      var index = -1,
          length = array ? array.length : 0,
          result = [];

      while (++index < length) {
        var value = array[index];
        if (value) {
          result.push(value);
        }
      }
      return result;
    }

    /**
     * Creates an array excluding all values of the provided arrays using strict
     * equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to process.
     * @param {...Array} [values] The arrays of values to exclude.
     * @returns {Array} Returns a new array of filtered values.
     * @example
     *
     * _.difference([1, 2, 3, 4, 5], [5, 2, 10]);
     * // => [1, 3, 4]
     */
    function difference(array) {
      return baseDifference(array, baseFlatten(arguments, true, true, 1));
    }

    /**
     * This method is like `_.find` except that it returns the index of the first
     * element that passes the callback check, instead of the element itself.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {number} Returns the index of the found element, else `-1`.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36, 'blocked': false },
     *   { 'name': 'fred',    'age': 40, 'blocked': true },
     *   { 'name': 'pebbles', 'age': 1,  'blocked': false }
     * ];
     *
     * _.findIndex(characters, function(chr) {
     *   return chr.age < 20;
     * });
     * // => 2
     *
     * // using "_.where" callback shorthand
     * _.findIndex(characters, { 'age': 36 });
     * // => 0
     *
     * // using "_.pluck" callback shorthand
     * _.findIndex(characters, 'blocked');
     * // => 1
     */
    function findIndex(array, callback, thisArg) {
      var index = -1,
          length = array ? array.length : 0;

      callback = lodash.createCallback(callback, thisArg, 3);
      while (++index < length) {
        if (callback(array[index], index, array)) {
          return index;
        }
      }
      return -1;
    }

    /**
     * This method is like `_.findIndex` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {number} Returns the index of the found element, else `-1`.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36, 'blocked': true },
     *   { 'name': 'fred',    'age': 40, 'blocked': false },
     *   { 'name': 'pebbles', 'age': 1,  'blocked': true }
     * ];
     *
     * _.findLastIndex(characters, function(chr) {
     *   return chr.age > 30;
     * });
     * // => 1
     *
     * // using "_.where" callback shorthand
     * _.findLastIndex(characters, { 'age': 36 });
     * // => 0
     *
     * // using "_.pluck" callback shorthand
     * _.findLastIndex(characters, 'blocked');
     * // => 2
     */
    function findLastIndex(array, callback, thisArg) {
      var length = array ? array.length : 0;
      callback = lodash.createCallback(callback, thisArg, 3);
      while (length--) {
        if (callback(array[length], length, array)) {
          return length;
        }
      }
      return -1;
    }

    /**
     * Gets the first element or first `n` elements of an array. If a callback
     * is provided elements at the beginning of the array are returned as long
     * as the callback returns truey. The callback is bound to `thisArg` and
     * invoked with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias head, take
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback] The function called
     *  per element or the number of elements to return. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the first element(s) of `array`.
     * @example
     *
     * _.first([1, 2, 3]);
     * // => 1
     *
     * _.first([1, 2, 3], 2);
     * // => [1, 2]
     *
     * _.first([1, 2, 3], function(num) {
     *   return num < 3;
     * });
     * // => [1, 2]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': true,  'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': false, 'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true,  'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.first(characters, 'blocked');
     * // => [{ 'name': 'barney', 'blocked': true, 'employer': 'slate' }]
     *
     * // using "_.where" callback shorthand
     * _.pluck(_.first(characters, { 'employer': 'slate' }), 'name');
     * // => ['barney', 'fred']
     */
    function first(array, callback, thisArg) {
      var n = 0,
          length = array ? array.length : 0;

      if (typeof callback != 'number' && callback != null) {
        var index = -1;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (++index < length && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = callback;
        if (n == null || thisArg) {
          return array ? array[0] : undefined;
        }
      }
      return slice(array, 0, nativeMin(nativeMax(0, n), length));
    }

    /**
     * Flattens a nested array (the nesting can be to any depth). If `isShallow`
     * is truey, the array will only be flattened a single level. If a callback
     * is provided each element of the array is passed through the callback before
     * flattening. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to flatten.
     * @param {boolean} [isShallow=false] A flag to restrict flattening to a single level.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new flattened array.
     * @example
     *
     * _.flatten([1, [2], [3, [[4]]]]);
     * // => [1, 2, 3, 4];
     *
     * _.flatten([1, [2], [3, [[4]]]], true);
     * // => [1, 2, 3, [[4]]];
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 30, 'pets': ['hoppy'] },
     *   { 'name': 'fred',   'age': 40, 'pets': ['baby puss', 'dino'] }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.flatten(characters, 'pets');
     * // => ['hoppy', 'baby puss', 'dino']
     */
    function flatten(array, isShallow, callback, thisArg) {
      // juggle arguments
      if (typeof isShallow != 'boolean' && isShallow != null) {
        thisArg = callback;
        callback = (typeof isShallow != 'function' && thisArg && thisArg[isShallow] === array) ? null : isShallow;
        isShallow = false;
      }
      if (callback != null) {
        array = map(array, callback, thisArg);
      }
      return baseFlatten(array, isShallow);
    }

    /**
     * Gets the index at which the first occurrence of `value` is found using
     * strict equality for comparisons, i.e. `===`. If the array is already sorted
     * providing `true` for `fromIndex` will run a faster binary search.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {*} value The value to search for.
     * @param {boolean|number} [fromIndex=0] The index to search from or `true`
     *  to perform a binary search on a sorted array.
     * @returns {number} Returns the index of the matched value or `-1`.
     * @example
     *
     * _.indexOf([1, 2, 3, 1, 2, 3], 2);
     * // => 1
     *
     * _.indexOf([1, 2, 3, 1, 2, 3], 2, 3);
     * // => 4
     *
     * _.indexOf([1, 1, 2, 2, 3, 3], 2, true);
     * // => 2
     */
    function indexOf(array, value, fromIndex) {
      if (typeof fromIndex == 'number') {
        var length = array ? array.length : 0;
        fromIndex = (fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex || 0);
      } else if (fromIndex) {
        var index = sortedIndex(array, value);
        return array[index] === value ? index : -1;
      }
      return baseIndexOf(array, value, fromIndex);
    }

    /**
     * Gets all but the last element or last `n` elements of an array. If a
     * callback is provided elements at the end of the array are excluded from
     * the result as long as the callback returns truey. The callback is bound
     * to `thisArg` and invoked with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback=1] The function called
     *  per element or the number of elements to exclude. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a slice of `array`.
     * @example
     *
     * _.initial([1, 2, 3]);
     * // => [1, 2]
     *
     * _.initial([1, 2, 3], 2);
     * // => [1]
     *
     * _.initial([1, 2, 3], function(num) {
     *   return num > 1;
     * });
     * // => [1]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': false, 'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': true,  'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true,  'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.initial(characters, 'blocked');
     * // => [{ 'name': 'barney',  'blocked': false, 'employer': 'slate' }]
     *
     * // using "_.where" callback shorthand
     * _.pluck(_.initial(characters, { 'employer': 'na' }), 'name');
     * // => ['barney', 'fred']
     */
    function initial(array, callback, thisArg) {
      var n = 0,
          length = array ? array.length : 0;

      if (typeof callback != 'number' && callback != null) {
        var index = length;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (index-- && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = (callback == null || thisArg) ? 1 : callback || n;
      }
      return slice(array, 0, nativeMin(nativeMax(0, length - n), length));
    }

    /**
     * Creates an array of unique values present in all provided arrays using
     * strict equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {...Array} [array] The arrays to inspect.
     * @returns {Array} Returns an array of shared values.
     * @example
     *
     * _.intersection([1, 2, 3], [5, 2, 1, 4], [2, 1]);
     * // => [1, 2]
     */
    function intersection() {
      var args = [],
          argsIndex = -1,
          argsLength = arguments.length,
          caches = getArray(),
          indexOf = getIndexOf(),
          trustIndexOf = indexOf === baseIndexOf,
          seen = getArray();

      while (++argsIndex < argsLength) {
        var value = arguments[argsIndex];
        if (isArray(value) || isArguments(value)) {
          args.push(value);
          caches.push(trustIndexOf && value.length >= largeArraySize &&
            createCache(argsIndex ? args[argsIndex] : seen));
        }
      }
      var array = args[0],
          index = -1,
          length = array ? array.length : 0,
          result = [];

      outer:
      while (++index < length) {
        var cache = caches[0];
        value = array[index];

        if ((cache ? cacheIndexOf(cache, value) : indexOf(seen, value)) < 0) {
          argsIndex = argsLength;
          (cache || seen).push(value);
          while (--argsIndex) {
            cache = caches[argsIndex];
            if ((cache ? cacheIndexOf(cache, value) : indexOf(args[argsIndex], value)) < 0) {
              continue outer;
            }
          }
          result.push(value);
        }
      }
      while (argsLength--) {
        cache = caches[argsLength];
        if (cache) {
          releaseObject(cache);
        }
      }
      releaseArray(caches);
      releaseArray(seen);
      return result;
    }

    /**
     * Gets the last element or last `n` elements of an array. If a callback is
     * provided elements at the end of the array are returned as long as the
     * callback returns truey. The callback is bound to `thisArg` and invoked
     * with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback] The function called
     *  per element or the number of elements to return. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the last element(s) of `array`.
     * @example
     *
     * _.last([1, 2, 3]);
     * // => 3
     *
     * _.last([1, 2, 3], 2);
     * // => [2, 3]
     *
     * _.last([1, 2, 3], function(num) {
     *   return num > 1;
     * });
     * // => [2, 3]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': false, 'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': true,  'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true,  'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.pluck(_.last(characters, 'blocked'), 'name');
     * // => ['fred', 'pebbles']
     *
     * // using "_.where" callback shorthand
     * _.last(characters, { 'employer': 'na' });
     * // => [{ 'name': 'pebbles', 'blocked': true, 'employer': 'na' }]
     */
    function last(array, callback, thisArg) {
      var n = 0,
          length = array ? array.length : 0;

      if (typeof callback != 'number' && callback != null) {
        var index = length;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (index-- && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = callback;
        if (n == null || thisArg) {
          return array ? array[length - 1] : undefined;
        }
      }
      return slice(array, nativeMax(0, length - n));
    }

    /**
     * Gets the index at which the last occurrence of `value` is found using strict
     * equality for comparisons, i.e. `===`. If `fromIndex` is negative, it is used
     * as the offset from the end of the collection.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {*} value The value to search for.
     * @param {number} [fromIndex=array.length-1] The index to search from.
     * @returns {number} Returns the index of the matched value or `-1`.
     * @example
     *
     * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2);
     * // => 4
     *
     * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2, 3);
     * // => 1
     */
    function lastIndexOf(array, value, fromIndex) {
      var index = array ? array.length : 0;
      if (typeof fromIndex == 'number') {
        index = (fromIndex < 0 ? nativeMax(0, index + fromIndex) : nativeMin(fromIndex, index - 1)) + 1;
      }
      while (index--) {
        if (array[index] === value) {
          return index;
        }
      }
      return -1;
    }

    /**
     * Removes all provided values from the given array using strict equality for
     * comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to modify.
     * @param {...*} [value] The values to remove.
     * @returns {Array} Returns `array`.
     * @example
     *
     * var array = [1, 2, 3, 1, 2, 3];
     * _.pull(array, 2, 3);
     * console.log(array);
     * // => [1, 1]
     */
    function pull(array) {
      var args = arguments,
          argsIndex = 0,
          argsLength = args.length,
          length = array ? array.length : 0;

      while (++argsIndex < argsLength) {
        var index = -1,
            value = args[argsIndex];
        while (++index < length) {
          if (array[index] === value) {
            splice.call(array, index--, 1);
            length--;
          }
        }
      }
      return array;
    }

    /**
     * Creates an array of numbers (positive and/or negative) progressing from
     * `start` up to but not including `end`. If `start` is less than `stop` a
     * zero-length range is created unless a negative `step` is specified.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {number} [start=0] The start of the range.
     * @param {number} end The end of the range.
     * @param {number} [step=1] The value to increment or decrement by.
     * @returns {Array} Returns a new range array.
     * @example
     *
     * _.range(4);
     * // => [0, 1, 2, 3]
     *
     * _.range(1, 5);
     * // => [1, 2, 3, 4]
     *
     * _.range(0, 20, 5);
     * // => [0, 5, 10, 15]
     *
     * _.range(0, -4, -1);
     * // => [0, -1, -2, -3]
     *
     * _.range(1, 4, 0);
     * // => [1, 1, 1]
     *
     * _.range(0);
     * // => []
     */
    function range(start, end, step) {
      start = +start || 0;
      step = typeof step == 'number' ? step : (+step || 1);

      if (end == null) {
        end = start;
        start = 0;
      }
      // use `Array(length)` so engines like Chakra and V8 avoid slower modes
      // http://youtu.be/XAqIpGU8ZZk#t=17m25s
      var index = -1,
          length = nativeMax(0, ceil((end - start) / (step || 1))),
          result = Array(length);

      while (++index < length) {
        result[index] = start;
        start += step;
      }
      return result;
    }

    /**
     * Removes all elements from an array that the callback returns truey for
     * and returns an array of removed elements. The callback is bound to `thisArg`
     * and invoked with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to modify.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of removed elements.
     * @example
     *
     * var array = [1, 2, 3, 4, 5, 6];
     * var evens = _.remove(array, function(num) { return num % 2 == 0; });
     *
     * console.log(array);
     * // => [1, 3, 5]
     *
     * console.log(evens);
     * // => [2, 4, 6]
     */
    function remove(array, callback, thisArg) {
      var index = -1,
          length = array ? array.length : 0,
          result = [];

      callback = lodash.createCallback(callback, thisArg, 3);
      while (++index < length) {
        var value = array[index];
        if (callback(value, index, array)) {
          result.push(value);
          splice.call(array, index--, 1);
          length--;
        }
      }
      return result;
    }

    /**
     * The opposite of `_.initial` this method gets all but the first element or
     * first `n` elements of an array. If a callback function is provided elements
     * at the beginning of the array are excluded from the result as long as the
     * callback returns truey. The callback is bound to `thisArg` and invoked
     * with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias drop, tail
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback=1] The function called
     *  per element or the number of elements to exclude. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a slice of `array`.
     * @example
     *
     * _.rest([1, 2, 3]);
     * // => [2, 3]
     *
     * _.rest([1, 2, 3], 2);
     * // => [3]
     *
     * _.rest([1, 2, 3], function(num) {
     *   return num < 3;
     * });
     * // => [3]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': true,  'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': false,  'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true, 'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.pluck(_.rest(characters, 'blocked'), 'name');
     * // => ['fred', 'pebbles']
     *
     * // using "_.where" callback shorthand
     * _.rest(characters, { 'employer': 'slate' });
     * // => [{ 'name': 'pebbles', 'blocked': true, 'employer': 'na' }]
     */
    function rest(array, callback, thisArg) {
      if (typeof callback != 'number' && callback != null) {
        var n = 0,
            index = -1,
            length = array ? array.length : 0;

        callback = lodash.createCallback(callback, thisArg, 3);
        while (++index < length && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = (callback == null || thisArg) ? 1 : nativeMax(0, callback);
      }
      return slice(array, n);
    }

    /**
     * Uses a binary search to determine the smallest index at which a value
     * should be inserted into a given sorted array in order to maintain the sort
     * order of the array. If a callback is provided it will be executed for
     * `value` and each element of `array` to compute their sort ranking. The
     * callback is bound to `thisArg` and invoked with one argument; (value).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to inspect.
     * @param {*} value The value to evaluate.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {number} Returns the index at which `value` should be inserted
     *  into `array`.
     * @example
     *
     * _.sortedIndex([20, 30, 50], 40);
     * // => 2
     *
     * // using "_.pluck" callback shorthand
     * _.sortedIndex([{ 'x': 20 }, { 'x': 30 }, { 'x': 50 }], { 'x': 40 }, 'x');
     * // => 2
     *
     * var dict = {
     *   'wordToNumber': { 'twenty': 20, 'thirty': 30, 'fourty': 40, 'fifty': 50 }
     * };
     *
     * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
     *   return dict.wordToNumber[word];
     * });
     * // => 2
     *
     * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
     *   return this.wordToNumber[word];
     * }, dict);
     * // => 2
     */
    function sortedIndex(array, value, callback, thisArg) {
      var low = 0,
          high = array ? array.length : low;

      // explicitly reference `identity` for better inlining in Firefox
      callback = callback ? lodash.createCallback(callback, thisArg, 1) : identity;
      value = callback(value);

      while (low < high) {
        var mid = (low + high) >>> 1;
        (callback(array[mid]) < value)
          ? low = mid + 1
          : high = mid;
      }
      return low;
    }

    /**
     * Creates an array of unique values, in order, of the provided arrays using
     * strict equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {...Array} [array] The arrays to inspect.
     * @returns {Array} Returns an array of combined values.
     * @example
     *
     * _.union([1, 2, 3], [5, 2, 1, 4], [2, 1]);
     * // => [1, 2, 3, 5, 4]
     */
    function union() {
      return baseUniq(baseFlatten(arguments, true, true));
    }

    /**
     * Creates a duplicate-value-free version of an array using strict equality
     * for comparisons, i.e. `===`. If the array is sorted, providing
     * `true` for `isSorted` will use a faster algorithm. If a callback is provided
     * each element of `array` is passed through the callback before uniqueness
     * is computed. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias unique
     * @category Arrays
     * @param {Array} array The array to process.
     * @param {boolean} [isSorted=false] A flag to indicate that `array` is sorted.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a duplicate-value-free array.
     * @example
     *
     * _.uniq([1, 2, 1, 3, 1]);
     * // => [1, 2, 3]
     *
     * _.uniq([1, 1, 2, 2, 3], true);
     * // => [1, 2, 3]
     *
     * _.uniq(['A', 'b', 'C', 'a', 'B', 'c'], function(letter) { return letter.toLowerCase(); });
     * // => ['A', 'b', 'C']
     *
     * _.uniq([1, 2.5, 3, 1.5, 2, 3.5], function(num) { return this.floor(num); }, Math);
     * // => [1, 2.5, 3]
     *
     * // using "_.pluck" callback shorthand
     * _.uniq([{ 'x': 1 }, { 'x': 2 }, { 'x': 1 }], 'x');
     * // => [{ 'x': 1 }, { 'x': 2 }]
     */
    function uniq(array, isSorted, callback, thisArg) {
      // juggle arguments
      if (typeof isSorted != 'boolean' && isSorted != null) {
        thisArg = callback;
        callback = (typeof isSorted != 'function' && thisArg && thisArg[isSorted] === array) ? null : isSorted;
        isSorted = false;
      }
      if (callback != null) {
        callback = lodash.createCallback(callback, thisArg, 3);
      }
      return baseUniq(array, isSorted, callback);
    }

    /**
     * Creates an array excluding all provided values using strict equality for
     * comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to filter.
     * @param {...*} [value] The values to exclude.
     * @returns {Array} Returns a new array of filtered values.
     * @example
     *
     * _.without([1, 2, 1, 0, 3, 1, 4], 0, 1);
     * // => [2, 3, 4]
     */
    function without(array) {
      return baseDifference(array, slice(arguments, 1));
    }

    /**
     * Creates an array that is the symmetric difference of the provided arrays.
     * See http://en.wikipedia.org/wiki/Symmetric_difference.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {...Array} [array] The arrays to inspect.
     * @returns {Array} Returns an array of values.
     * @example
     *
     * _.xor([1, 2, 3], [5, 2, 1, 4]);
     * // => [3, 5, 4]
     *
     * _.xor([1, 2, 5], [2, 3, 5], [3, 4, 5]);
     * // => [1, 4, 5]
     */
    function xor() {
      var index = -1,
          length = arguments.length;

      while (++index < length) {
        var array = arguments[index];
        if (isArray(array) || isArguments(array)) {
          var result = result
            ? baseUniq(baseDifference(result, array).concat(baseDifference(array, result)))
            : array;
        }
      }
      return result || [];
    }

    /**
     * Creates an array of grouped elements, the first of which contains the first
     * elements of the given arrays, the second of which contains the second
     * elements of the given arrays, and so on.
     *
     * @static
     * @memberOf _
     * @alias unzip
     * @category Arrays
     * @param {...Array} [array] Arrays to process.
     * @returns {Array} Returns a new array of grouped elements.
     * @example
     *
     * _.zip(['fred', 'barney'], [30, 40], [true, false]);
     * // => [['fred', 30, true], ['barney', 40, false]]
     */
    function zip() {
      var array = arguments.length > 1 ? arguments : arguments[0],
          index = -1,
          length = array ? max(pluck(array, 'length')) : 0,
          result = Array(length < 0 ? 0 : length);

      while (++index < length) {
        result[index] = pluck(array, index);
      }
      return result;
    }

    /**
     * Creates an object composed from arrays of `keys` and `values`. Provide
     * either a single two dimensional array, i.e. `[[key1, value1], [key2, value2]]`
     * or two arrays, one of `keys` and one of corresponding `values`.
     *
     * @static
     * @memberOf _
     * @alias object
     * @category Arrays
     * @param {Array} keys The array of keys.
     * @param {Array} [values=[]] The array of values.
     * @returns {Object} Returns an object composed of the given keys and
     *  corresponding values.
     * @example
     *
     * _.zipObject(['fred', 'barney'], [30, 40]);
     * // => { 'fred': 30, 'barney': 40 }
     */
    function zipObject(keys, values) {
      var index = -1,
          length = keys ? keys.length : 0,
          result = {};

      if (!values && length && !isArray(keys[0])) {
        values = [];
      }
      while (++index < length) {
        var key = keys[index];
        if (values) {
          result[key] = values[index];
        } else if (key) {
          result[key[0]] = key[1];
        }
      }
      return result;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a function that executes `func`, with  the `this` binding and
     * arguments of the created function, only after being called `n` times.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {number} n The number of times the function must be called before
     *  `func` is executed.
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var saves = ['profile', 'settings'];
     *
     * var done = _.after(saves.length, function() {
     *   console.log('Done saving!');
     * });
     *
     * _.forEach(saves, function(type) {
     *   asyncSave({ 'type': type, 'complete': done });
     * });
     * // => logs 'Done saving!', after all saves have completed
     */
    function after(n, func) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      return function() {
        if (--n < 1) {
          return func.apply(this, arguments);
        }
      };
    }

    /**
     * Creates a function that, when called, invokes `func` with the `this`
     * binding of `thisArg` and prepends any additional `bind` arguments to those
     * provided to the bound function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to bind.
     * @param {*} [thisArg] The `this` binding of `func`.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * var func = function(greeting) {
     *   return greeting + ' ' + this.name;
     * };
     *
     * func = _.bind(func, { 'name': 'fred' }, 'hi');
     * func();
     * // => 'hi fred'
     */
    function bind(func, thisArg) {
      return arguments.length > 2
        ? createWrapper(func, 17, slice(arguments, 2), null, thisArg)
        : createWrapper(func, 1, null, null, thisArg);
    }

    /**
     * Binds methods of an object to the object itself, overwriting the existing
     * method. Method names may be specified as individual arguments or as arrays
     * of method names. If no method names are provided all the function properties
     * of `object` will be bound.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Object} object The object to bind and assign the bound methods to.
     * @param {...string} [methodName] The object method names to
     *  bind, specified as individual method names or arrays of method names.
     * @returns {Object} Returns `object`.
     * @example
     *
     * var view = {
     *   'label': 'docs',
     *   'onClick': function() { console.log('clicked ' + this.label); }
     * };
     *
     * _.bindAll(view);
     * jQuery('#docs').on('click', view.onClick);
     * // => logs 'clicked docs', when the button is clicked
     */
    function bindAll(object) {
      var funcs = arguments.length > 1 ? baseFlatten(arguments, true, false, 1) : functions(object),
          index = -1,
          length = funcs.length;

      while (++index < length) {
        var key = funcs[index];
        object[key] = createWrapper(object[key], 1, null, null, object);
      }
      return object;
    }

    /**
     * Creates a function that, when called, invokes the method at `object[key]`
     * and prepends any additional `bindKey` arguments to those provided to the bound
     * function. This method differs from `_.bind` by allowing bound functions to
     * reference methods that will be redefined or don't yet exist.
     * See http://michaux.ca/articles/lazy-function-definition-pattern.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Object} object The object the method belongs to.
     * @param {string} key The key of the method.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * var object = {
     *   'name': 'fred',
     *   'greet': function(greeting) {
     *     return greeting + ' ' + this.name;
     *   }
     * };
     *
     * var func = _.bindKey(object, 'greet', 'hi');
     * func();
     * // => 'hi fred'
     *
     * object.greet = function(greeting) {
     *   return greeting + 'ya ' + this.name + '!';
     * };
     *
     * func();
     * // => 'hiya fred!'
     */
    function bindKey(object, key) {
      return arguments.length > 2
        ? createWrapper(key, 19, slice(arguments, 2), null, object)
        : createWrapper(key, 3, null, null, object);
    }

    /**
     * Creates a function that is the composition of the provided functions,
     * where each function consumes the return value of the function that follows.
     * For example, composing the functions `f()`, `g()`, and `h()` produces `f(g(h()))`.
     * Each function is executed with the `this` binding of the composed function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {...Function} [func] Functions to compose.
     * @returns {Function} Returns the new composed function.
     * @example
     *
     * var realNameMap = {
     *   'pebbles': 'penelope'
     * };
     *
     * var format = function(name) {
     *   name = realNameMap[name.toLowerCase()] || name;
     *   return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
     * };
     *
     * var greet = function(formatted) {
     *   return 'Hiya ' + formatted + '!';
     * };
     *
     * var welcome = _.compose(greet, format);
     * welcome('pebbles');
     * // => 'Hiya Penelope!'
     */
    function compose() {
      var funcs = arguments,
          length = funcs.length;

      while (length--) {
        if (!isFunction(funcs[length])) {
          throw new TypeError;
        }
      }
      return function() {
        var args = arguments,
            length = funcs.length;

        while (length--) {
          args = [funcs[length].apply(this, args)];
        }
        return args[0];
      };
    }

    /**
     * Creates a function which accepts one or more arguments of `func` that when
     * invoked either executes `func` returning its result, if all `func` arguments
     * have been provided, or returns a function that accepts one or more of the
     * remaining `func` arguments, and so on. The arity of `func` can be specified
     * if `func.length` is not sufficient.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to curry.
     * @param {number} [arity=func.length] The arity of `func`.
     * @returns {Function} Returns the new curried function.
     * @example
     *
     * var curried = _.curry(function(a, b, c) {
     *   console.log(a + b + c);
     * });
     *
     * curried(1)(2)(3);
     * // => 6
     *
     * curried(1, 2)(3);
     * // => 6
     *
     * curried(1, 2, 3);
     * // => 6
     */
    function curry(func, arity) {
      arity = typeof arity == 'number' ? arity : (+arity || func.length);
      return createWrapper(func, 4, null, null, null, arity);
    }

    /**
     * Creates a function that will delay the execution of `func` until after
     * `wait` milliseconds have elapsed since the last time it was invoked.
     * Provide an options object to indicate that `func` should be invoked on
     * the leading and/or trailing edge of the `wait` timeout. Subsequent calls
     * to the debounced function will return the result of the last `func` call.
     *
     * Note: If `leading` and `trailing` options are `true` `func` will be called
     * on the trailing edge of the timeout only if the the debounced function is
     * invoked more than once during the `wait` timeout.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to debounce.
     * @param {number} wait The number of milliseconds to delay.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.leading=false] Specify execution on the leading edge of the timeout.
     * @param {number} [options.maxWait] The maximum time `func` is allowed to be delayed before it's called.
     * @param {boolean} [options.trailing=true] Specify execution on the trailing edge of the timeout.
     * @returns {Function} Returns the new debounced function.
     * @example
     *
     * // avoid costly calculations while the window size is in flux
     * var lazyLayout = _.debounce(calculateLayout, 150);
     * jQuery(window).on('resize', lazyLayout);
     *
     * // execute `sendMail` when the click event is fired, debouncing subsequent calls
     * jQuery('#postbox').on('click', _.debounce(sendMail, 300, {
     *   'leading': true,
     *   'trailing': false
     * });
     *
     * // ensure `batchLog` is executed once after 1 second of debounced calls
     * var source = new EventSource('/stream');
     * source.addEventListener('message', _.debounce(batchLog, 250, {
     *   'maxWait': 1000
     * }, false);
     */
    function debounce(func, wait, options) {
      var args,
          maxTimeoutId,
          result,
          stamp,
          thisArg,
          timeoutId,
          trailingCall,
          lastCalled = 0,
          maxWait = false,
          trailing = true;

      if (!isFunction(func)) {
        throw new TypeError;
      }
      wait = nativeMax(0, wait) || 0;
      if (options === true) {
        var leading = true;
        trailing = false;
      } else if (isObject(options)) {
        leading = options.leading;
        maxWait = 'maxWait' in options && (nativeMax(wait, options.maxWait) || 0);
        trailing = 'trailing' in options ? options.trailing : trailing;
      }
      var delayed = function() {
        var remaining = wait - (now() - stamp);
        if (remaining <= 0) {
          if (maxTimeoutId) {
            clearTimeout(maxTimeoutId);
          }
          var isCalled = trailingCall;
          maxTimeoutId = timeoutId = trailingCall = undefined;
          if (isCalled) {
            lastCalled = now();
            result = func.apply(thisArg, args);
            if (!timeoutId && !maxTimeoutId) {
              args = thisArg = null;
            }
          }
        } else {
          timeoutId = setTimeout(delayed, remaining);
        }
      };

      var maxDelayed = function() {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        maxTimeoutId = timeoutId = trailingCall = undefined;
        if (trailing || (maxWait !== wait)) {
          lastCalled = now();
          result = func.apply(thisArg, args);
          if (!timeoutId && !maxTimeoutId) {
            args = thisArg = null;
          }
        }
      };

      return function() {
        args = arguments;
        stamp = now();
        thisArg = this;
        trailingCall = trailing && (timeoutId || !leading);

        if (maxWait === false) {
          var leadingCall = leading && !timeoutId;
        } else {
          if (!maxTimeoutId && !leading) {
            lastCalled = stamp;
          }
          var remaining = maxWait - (stamp - lastCalled),
              isCalled = remaining <= 0;

          if (isCalled) {
            if (maxTimeoutId) {
              maxTimeoutId = clearTimeout(maxTimeoutId);
            }
            lastCalled = stamp;
            result = func.apply(thisArg, args);
          }
          else if (!maxTimeoutId) {
            maxTimeoutId = setTimeout(maxDelayed, remaining);
          }
        }
        if (isCalled && timeoutId) {
          timeoutId = clearTimeout(timeoutId);
        }
        else if (!timeoutId && wait !== maxWait) {
          timeoutId = setTimeout(delayed, wait);
        }
        if (leadingCall) {
          isCalled = true;
          result = func.apply(thisArg, args);
        }
        if (isCalled && !timeoutId && !maxTimeoutId) {
          args = thisArg = null;
        }
        return result;
      };
    }

    /**
     * Defers executing the `func` function until the current call stack has cleared.
     * Additional arguments will be provided to `func` when it is invoked.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to defer.
     * @param {...*} [arg] Arguments to invoke the function with.
     * @returns {number} Returns the timer id.
     * @example
     *
     * _.defer(function(text) { console.log(text); }, 'deferred');
     * // logs 'deferred' after one or more milliseconds
     */
    function defer(func) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      var args = slice(arguments, 1);
      return setTimeout(function() { func.apply(undefined, args); }, 1);
    }

    /**
     * Executes the `func` function after `wait` milliseconds. Additional arguments
     * will be provided to `func` when it is invoked.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to delay.
     * @param {number} wait The number of milliseconds to delay execution.
     * @param {...*} [arg] Arguments to invoke the function with.
     * @returns {number} Returns the timer id.
     * @example
     *
     * _.delay(function(text) { console.log(text); }, 1000, 'later');
     * // => logs 'later' after one second
     */
    function delay(func, wait) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      var args = slice(arguments, 2);
      return setTimeout(function() { func.apply(undefined, args); }, wait);
    }

    /**
     * Creates a function that memoizes the result of `func`. If `resolver` is
     * provided it will be used to determine the cache key for storing the result
     * based on the arguments provided to the memoized function. By default, the
     * first argument provided to the memoized function is used as the cache key.
     * The `func` is executed with the `this` binding of the memoized function.
     * The result cache is exposed as the `cache` property on the memoized function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to have its output memoized.
     * @param {Function} [resolver] A function used to resolve the cache key.
     * @returns {Function} Returns the new memoizing function.
     * @example
     *
     * var fibonacci = _.memoize(function(n) {
     *   return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
     * });
     *
     * fibonacci(9)
     * // => 34
     *
     * var data = {
     *   'fred': { 'name': 'fred', 'age': 40 },
     *   'pebbles': { 'name': 'pebbles', 'age': 1 }
     * };
     *
     * // modifying the result cache
     * var get = _.memoize(function(name) { return data[name]; }, _.identity);
     * get('pebbles');
     * // => { 'name': 'pebbles', 'age': 1 }
     *
     * get.cache.pebbles.name = 'penelope';
     * get('pebbles');
     * // => { 'name': 'penelope', 'age': 1 }
     */
    function memoize(func, resolver) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      var memoized = function() {
        var cache = memoized.cache,
            key = resolver ? resolver.apply(this, arguments) : keyPrefix + arguments[0];

        return hasOwnProperty.call(cache, key)
          ? cache[key]
          : (cache[key] = func.apply(this, arguments));
      }
      memoized.cache = {};
      return memoized;
    }

    /**
     * Creates a function that is restricted to execute `func` once. Repeat calls to
     * the function will return the value of the first call. The `func` is executed
     * with the `this` binding of the created function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var initialize = _.once(createApplication);
     * initialize();
     * initialize();
     * // `initialize` executes `createApplication` once
     */
    function once(func) {
      var ran,
          result;

      if (!isFunction(func)) {
        throw new TypeError;
      }
      return function() {
        if (ran) {
          return result;
        }
        ran = true;
        result = func.apply(this, arguments);

        // clear the `func` variable so the function may be garbage collected
        func = null;
        return result;
      };
    }

    /**
     * Creates a function that, when called, invokes `func` with any additional
     * `partial` arguments prepended to those provided to the new function. This
     * method is similar to `_.bind` except it does **not** alter the `this` binding.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to partially apply arguments to.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * var greet = function(greeting, name) { return greeting + ' ' + name; };
     * var hi = _.partial(greet, 'hi');
     * hi('fred');
     * // => 'hi fred'
     */
    function partial(func) {
      return createWrapper(func, 16, slice(arguments, 1));
    }

    /**
     * This method is like `_.partial` except that `partial` arguments are
     * appended to those provided to the new function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to partially apply arguments to.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * var defaultsDeep = _.partialRight(_.merge, _.defaults);
     *
     * var options = {
     *   'variable': 'data',
     *   'imports': { 'jq': $ }
     * };
     *
     * defaultsDeep(options, _.templateSettings);
     *
     * options.variable
     * // => 'data'
     *
     * options.imports
     * // => { '_': _, 'jq': $ }
     */
    function partialRight(func) {
      return createWrapper(func, 32, null, slice(arguments, 1));
    }

    /**
     * Creates a function that, when executed, will only call the `func` function
     * at most once per every `wait` milliseconds. Provide an options object to
     * indicate that `func` should be invoked on the leading and/or trailing edge
     * of the `wait` timeout. Subsequent calls to the throttled function will
     * return the result of the last `func` call.
     *
     * Note: If `leading` and `trailing` options are `true` `func` will be called
     * on the trailing edge of the timeout only if the the throttled function is
     * invoked more than once during the `wait` timeout.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to throttle.
     * @param {number} wait The number of milliseconds to throttle executions to.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.leading=true] Specify execution on the leading edge of the timeout.
     * @param {boolean} [options.trailing=true] Specify execution on the trailing edge of the timeout.
     * @returns {Function} Returns the new throttled function.
     * @example
     *
     * // avoid excessively updating the position while scrolling
     * var throttled = _.throttle(updatePosition, 100);
     * jQuery(window).on('scroll', throttled);
     *
     * // execute `renewToken` when the click event is fired, but not more than once every 5 minutes
     * jQuery('.interactive').on('click', _.throttle(renewToken, 300000, {
     *   'trailing': false
     * }));
     */
    function throttle(func, wait, options) {
      var leading = true,
          trailing = true;

      if (!isFunction(func)) {
        throw new TypeError;
      }
      if (options === false) {
        leading = false;
      } else if (isObject(options)) {
        leading = 'leading' in options ? options.leading : leading;
        trailing = 'trailing' in options ? options.trailing : trailing;
      }
      debounceOptions.leading = leading;
      debounceOptions.maxWait = wait;
      debounceOptions.trailing = trailing;

      return debounce(func, wait, debounceOptions);
    }

    /**
     * Creates a function that provides `value` to the wrapper function as its
     * first argument. Additional arguments provided to the function are appended
     * to those provided to the wrapper function. The wrapper is executed with
     * the `this` binding of the created function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {*} value The value to wrap.
     * @param {Function} wrapper The wrapper function.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var p = _.wrap(_.escape, function(func, text) {
     *   return '<p>' + func(text) + '</p>';
     * });
     *
     * p('Fred, Wilma, & Pebbles');
     * // => '<p>Fred, Wilma, &amp; Pebbles</p>'
     */
    function wrap(value, wrapper) {
      return createWrapper(wrapper, 16, [value]);
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a function that returns `value`.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {*} value The value to return from the new function.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var object = { 'name': 'fred' };
     * var getter = _.constant(object);
     * getter() === object;
     * // => true
     */
    function constant(value) {
      return function() {
        return value;
      };
    }

    /**
     * Produces a callback bound to an optional `thisArg`. If `func` is a property
     * name the created callback will return the property value for a given element.
     * If `func` is an object the created callback will return `true` for elements
     * that contain the equivalent object properties, otherwise it will return `false`.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {*} [func=identity] The value to convert to a callback.
     * @param {*} [thisArg] The `this` binding of the created callback.
     * @param {number} [argCount] The number of arguments the callback accepts.
     * @returns {Function} Returns a callback function.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // wrap to create custom callback shorthands
     * _.createCallback = _.wrap(_.createCallback, function(func, callback, thisArg) {
     *   var match = /^(.+?)__([gl]t)(.+)$/.exec(callback);
     *   return !match ? func(callback, thisArg) : function(object) {
     *     return match[2] == 'gt' ? object[match[1]] > match[3] : object[match[1]] < match[3];
     *   };
     * });
     *
     * _.filter(characters, 'age__gt38');
     * // => [{ 'name': 'fred', 'age': 40 }]
     */
    function createCallback(func, thisArg, argCount) {
      var type = typeof func;
      if (func == null || type == 'function') {
        return baseCreateCallback(func, thisArg, argCount);
      }
      // handle "_.pluck" style callback shorthands
      if (type != 'object') {
        return property(func);
      }
      var props = keys(func),
          key = props[0],
          a = func[key];

      // handle "_.where" style callback shorthands
      if (props.length == 1 && a === a && !isObject(a)) {
        // fast path the common case of providing an object with a single
        // property containing a primitive value
        return function(object) {
          var b = object[key];
          return a === b && (a !== 0 || (1 / a == 1 / b));
        };
      }
      return function(object) {
        var length = props.length,
            result = false;

        while (length--) {
          if (!(result = baseIsEqual(object[props[length]], func[props[length]], null, true))) {
            break;
          }
        }
        return result;
      };
    }

    /**
     * Converts the characters `&`, `<`, `>`, `"`, and `'` in `string` to their
     * corresponding HTML entities.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} string The string to escape.
     * @returns {string} Returns the escaped string.
     * @example
     *
     * _.escape('Fred, Wilma, & Pebbles');
     * // => 'Fred, Wilma, &amp; Pebbles'
     */
    function escape(string) {
      return string == null ? '' : String(string).replace(reUnescapedHtml, escapeHtmlChar);
    }

    /**
     * This method returns the first argument provided to it.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {*} value Any value.
     * @returns {*} Returns `value`.
     * @example
     *
     * var object = { 'name': 'fred' };
     * _.identity(object) === object;
     * // => true
     */
    function identity(value) {
      return value;
    }

    /**
     * Adds function properties of a source object to the destination object.
     * If `object` is a function methods will be added to its prototype as well.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Function|Object} [object=lodash] object The destination object.
     * @param {Object} source The object of functions to add.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.chain=true] Specify whether the functions added are chainable.
     * @example
     *
     * function capitalize(string) {
     *   return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
     * }
     *
     * _.mixin({ 'capitalize': capitalize });
     * _.capitalize('fred');
     * // => 'Fred'
     *
     * _('fred').capitalize().value();
     * // => 'Fred'
     *
     * _.mixin({ 'capitalize': capitalize }, { 'chain': false });
     * _('fred').capitalize();
     * // => 'Fred'
     */
    function mixin(object, source, options) {
      var chain = true,
          methodNames = source && functions(source);

      if (!source || (!options && !methodNames.length)) {
        if (options == null) {
          options = source;
        }
        ctor = lodashWrapper;
        source = object;
        object = lodash;
        methodNames = functions(source);
      }
      if (options === false) {
        chain = false;
      } else if (isObject(options) && 'chain' in options) {
        chain = options.chain;
      }
      var ctor = object,
          isFunc = isFunction(ctor);

      forEach(methodNames, function(methodName) {
        var func = object[methodName] = source[methodName];
        if (isFunc) {
          ctor.prototype[methodName] = function() {
            var chainAll = this.__chain__,
                value = this.__wrapped__,
                args = [value];

            push.apply(args, arguments);
            var result = func.apply(object, args);
            if (chain || chainAll) {
              if (value === result && isObject(result)) {
                return this;
              }
              result = new ctor(result);
              result.__chain__ = chainAll;
            }
            return result;
          };
        }
      });
    }

    /**
     * Reverts the '_' variable to its previous value and returns a reference to
     * the `lodash` function.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @returns {Function} Returns the `lodash` function.
     * @example
     *
     * var lodash = _.noConflict();
     */
    function noConflict() {
      context._ = oldDash;
      return this;
    }

    /**
     * A no-operation function.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @example
     *
     * var object = { 'name': 'fred' };
     * _.noop(object) === undefined;
     * // => true
     */
    function noop() {
      // no operation performed
    }

    /**
     * Gets the number of milliseconds that have elapsed since the Unix epoch
     * (1 January 1970 00:00:00 UTC).
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @example
     *
     * var stamp = _.now();
     * _.defer(function() { console.log(_.now() - stamp); });
     * // => logs the number of milliseconds it took for the deferred function to be called
     */
    var now = isNative(now = Date.now) && now || function() {
      return new Date().getTime();
    };

    /**
     * Converts the given value into an integer of the specified radix.
     * If `radix` is `undefined` or `0` a `radix` of `10` is used unless the
     * `value` is a hexadecimal, in which case a `radix` of `16` is used.
     *
     * Note: This method avoids differences in native ES3 and ES5 `parseInt`
     * implementations. See http://es5.github.io/#E.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} value The value to parse.
     * @param {number} [radix] The radix used to interpret the value to parse.
     * @returns {number} Returns the new integer value.
     * @example
     *
     * _.parseInt('08');
     * // => 8
     */
    var parseInt = nativeParseInt(whitespace + '08') == 8 ? nativeParseInt : function(value, radix) {
      // Firefox < 21 and Opera < 15 follow the ES3 specified implementation of `parseInt`
      return nativeParseInt(isString(value) ? value.replace(reLeadingSpacesAndZeros, '') : value, radix || 0);
    };

    /**
     * Creates a "_.pluck" style function, which returns the `key` value of a
     * given object.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} key The name of the property to retrieve.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var characters = [
     *   { 'name': 'fred',   'age': 40 },
     *   { 'name': 'barney', 'age': 36 }
     * ];
     *
     * var getName = _.property('name');
     *
     * _.map(characters, getName);
     * // => ['barney', 'fred']
     *
     * _.sortBy(characters, getName);
     * // => [{ 'name': 'barney', 'age': 36 }, { 'name': 'fred',   'age': 40 }]
     */
    function property(key) {
      return function(object) {
        return object[key];
      };
    }

    /**
     * Produces a random number between `min` and `max` (inclusive). If only one
     * argument is provided a number between `0` and the given number will be
     * returned. If `floating` is truey or either `min` or `max` are floats a
     * floating-point number will be returned instead of an integer.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {number} [min=0] The minimum possible value.
     * @param {number} [max=1] The maximum possible value.
     * @param {boolean} [floating=false] Specify returning a floating-point number.
     * @returns {number} Returns a random number.
     * @example
     *
     * _.random(0, 5);
     * // => an integer between 0 and 5
     *
     * _.random(5);
     * // => also an integer between 0 and 5
     *
     * _.random(5, true);
     * // => a floating-point number between 0 and 5
     *
     * _.random(1.2, 5.2);
     * // => a floating-point number between 1.2 and 5.2
     */
    function random(min, max, floating) {
      var noMin = min == null,
          noMax = max == null;

      if (floating == null) {
        if (typeof min == 'boolean' && noMax) {
          floating = min;
          min = 1;
        }
        else if (!noMax && typeof max == 'boolean') {
          floating = max;
          noMax = true;
        }
      }
      if (noMin && noMax) {
        max = 1;
      }
      min = +min || 0;
      if (noMax) {
        max = min;
        min = 0;
      } else {
        max = +max || 0;
      }
      if (floating || min % 1 || max % 1) {
        var rand = nativeRandom();
        return nativeMin(min + (rand * (max - min + parseFloat('1e-' + ((rand +'').length - 1)))), max);
      }
      return baseRandom(min, max);
    }

    /**
     * Resolves the value of property `key` on `object`. If `key` is a function
     * it will be invoked with the `this` binding of `object` and its result returned,
     * else the property value is returned. If `object` is falsey then `undefined`
     * is returned.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Object} object The object to inspect.
     * @param {string} key The name of the property to resolve.
     * @returns {*} Returns the resolved value.
     * @example
     *
     * var object = {
     *   'cheese': 'crumpets',
     *   'stuff': function() {
     *     return 'nonsense';
     *   }
     * };
     *
     * _.result(object, 'cheese');
     * // => 'crumpets'
     *
     * _.result(object, 'stuff');
     * // => 'nonsense'
     */
    function result(object, key) {
      if (object) {
        var value = object[key];
        return isFunction(value) ? object[key]() : value;
      }
    }

    /**
     * A micro-templating method that handles arbitrary delimiters, preserves
     * whitespace, and correctly escapes quotes within interpolated code.
     *
     * Note: In the development build, `_.template` utilizes sourceURLs for easier
     * debugging. See http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
     *
     * For more information on precompiling templates see:
     * http://lodash.com/custom-builds
     *
     * For more information on Chrome extension sandboxes see:
     * http://developer.chrome.com/stable/extensions/sandboxingEval.html
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} text The template text.
     * @param {Object} data The data object used to populate the text.
     * @param {Object} [options] The options object.
     * @param {RegExp} [options.escape] The "escape" delimiter.
     * @param {RegExp} [options.evaluate] The "evaluate" delimiter.
     * @param {Object} [options.imports] An object to import into the template as local variables.
     * @param {RegExp} [options.interpolate] The "interpolate" delimiter.
     * @param {string} [sourceURL] The sourceURL of the template's compiled source.
     * @param {string} [variable] The data object variable name.
     * @returns {Function|string} Returns a compiled function when no `data` object
     *  is given, else it returns the interpolated text.
     * @example
     *
     * // using the "interpolate" delimiter to create a compiled template
     * var compiled = _.template('hello <%= name %>');
     * compiled({ 'name': 'fred' });
     * // => 'hello fred'
     *
     * // using the "escape" delimiter to escape HTML in data property values
     * _.template('<b><%- value %></b>', { 'value': '<script>' });
     * // => '<b>&lt;script&gt;</b>'
     *
     * // using the "evaluate" delimiter to generate HTML
     * var list = '<% _.forEach(people, function(name) { %><li><%- name %></li><% }); %>';
     * _.template(list, { 'people': ['fred', 'barney'] });
     * // => '<li>fred</li><li>barney</li>'
     *
     * // using the ES6 delimiter as an alternative to the default "interpolate" delimiter
     * _.template('hello ${ name }', { 'name': 'pebbles' });
     * // => 'hello pebbles'
     *
     * // using the internal `print` function in "evaluate" delimiters
     * _.template('<% print("hello " + name); %>!', { 'name': 'barney' });
     * // => 'hello barney!'
     *
     * // using a custom template delimiters
     * _.templateSettings = {
     *   'interpolate': /{{([\s\S]+?)}}/g
     * };
     *
     * _.template('hello {{ name }}!', { 'name': 'mustache' });
     * // => 'hello mustache!'
     *
     * // using the `imports` option to import jQuery
     * var list = '<% jq.each(people, function(name) { %><li><%- name %></li><% }); %>';
     * _.template(list, { 'people': ['fred', 'barney'] }, { 'imports': { 'jq': jQuery } });
     * // => '<li>fred</li><li>barney</li>'
     *
     * // using the `sourceURL` option to specify a custom sourceURL for the template
     * var compiled = _.template('hello <%= name %>', null, { 'sourceURL': '/basic/greeting.jst' });
     * compiled(data);
     * // => find the source of "greeting.jst" under the Sources tab or Resources panel of the web inspector
     *
     * // using the `variable` option to ensure a with-statement isn't used in the compiled template
     * var compiled = _.template('hi <%= data.name %>!', null, { 'variable': 'data' });
     * compiled.source;
     * // => function(data) {
     *   var __t, __p = '', __e = _.escape;
     *   __p += 'hi ' + ((__t = ( data.name )) == null ? '' : __t) + '!';
     *   return __p;
     * }
     *
     * // using the `source` property to inline compiled templates for meaningful
     * // line numbers in error messages and a stack trace
     * fs.writeFileSync(path.join(cwd, 'jst.js'), '\
     *   var JST = {\
     *     "main": ' + _.template(mainText).source + '\
     *   };\
     * ');
     */
    function template(text, data, options) {
      // based on John Resig's `tmpl` implementation
      // http://ejohn.org/blog/javascript-micro-templating/
      // and Laura Doktorova's doT.js
      // https://github.com/olado/doT
      var settings = lodash.templateSettings;
      text = String(text || '');

      // avoid missing dependencies when `iteratorTemplate` is not defined
      options = defaults({}, options, settings);

      var imports = defaults({}, options.imports, settings.imports),
          importsKeys = keys(imports),
          importsValues = values(imports);

      var isEvaluating,
          index = 0,
          interpolate = options.interpolate || reNoMatch,
          source = "__p += '";

      // compile the regexp to match each delimiter
      var reDelimiters = RegExp(
        (options.escape || reNoMatch).source + '|' +
        interpolate.source + '|' +
        (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + '|' +
        (options.evaluate || reNoMatch).source + '|$'
      , 'g');

      text.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
        interpolateValue || (interpolateValue = esTemplateValue);

        // escape characters that cannot be included in string literals
        source += text.slice(index, offset).replace(reUnescapedString, escapeStringChar);

        // replace delimiters with snippets
        if (escapeValue) {
          source += "' +\n__e(" + escapeValue + ") +\n'";
        }
        if (evaluateValue) {
          isEvaluating = true;
          source += "';\n" + evaluateValue + ";\n__p += '";
        }
        if (interpolateValue) {
          source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
        }
        index = offset + match.length;

        // the JS engine embedded in Adobe products requires returning the `match`
        // string in order to produce the correct `offset` value
        return match;
      });

      source += "';\n";

      // if `variable` is not specified, wrap a with-statement around the generated
      // code to add the data object to the top of the scope chain
      var variable = options.variable,
          hasVariable = variable;

      if (!hasVariable) {
        variable = 'obj';
        source = 'with (' + variable + ') {\n' + source + '\n}\n';
      }
      // cleanup code by stripping empty strings
      source = (isEvaluating ? source.replace(reEmptyStringLeading, '') : source)
        .replace(reEmptyStringMiddle, '$1')
        .replace(reEmptyStringTrailing, '$1;');

      // frame code as the function body
      source = 'function(' + variable + ') {\n' +
        (hasVariable ? '' : variable + ' || (' + variable + ' = {});\n') +
        "var __t, __p = '', __e = _.escape" +
        (isEvaluating
          ? ', __j = Array.prototype.join;\n' +
            "function print() { __p += __j.call(arguments, '') }\n"
          : ';\n'
        ) +
        source +
        'return __p\n}';

      // Use a sourceURL for easier debugging.
      // http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
      var sourceURL = '\n/*\n//# sourceURL=' + (options.sourceURL || '/lodash/template/source[' + (templateCounter++) + ']') + '\n*/';

      try {
        var result = Function(importsKeys, 'return ' + source + sourceURL).apply(undefined, importsValues);
      } catch(e) {
        e.source = source;
        throw e;
      }
      if (data) {
        return result(data);
      }
      // provide the compiled function's source by its `toString` method, in
      // supported environments, or the `source` property as a convenience for
      // inlining compiled templates during the build process
      result.source = source;
      return result;
    }

    /**
     * Executes the callback `n` times, returning an array of the results
     * of each callback execution. The callback is bound to `thisArg` and invoked
     * with one argument; (index).
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {number} n The number of times to execute the callback.
     * @param {Function} callback The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns an array of the results of each `callback` execution.
     * @example
     *
     * var diceRolls = _.times(3, _.partial(_.random, 1, 6));
     * // => [3, 6, 4]
     *
     * _.times(3, function(n) { mage.castSpell(n); });
     * // => calls `mage.castSpell(n)` three times, passing `n` of `0`, `1`, and `2` respectively
     *
     * _.times(3, function(n) { this.cast(n); }, mage);
     * // => also calls `mage.castSpell(n)` three times
     */
    function times(n, callback, thisArg) {
      n = (n = +n) > -1 ? n : 0;
      var index = -1,
          result = Array(n);

      callback = baseCreateCallback(callback, thisArg, 1);
      while (++index < n) {
        result[index] = callback(index);
      }
      return result;
    }

    /**
     * The inverse of `_.escape` this method converts the HTML entities
     * `&amp;`, `&lt;`, `&gt;`, `&quot;`, and `&#39;` in `string` to their
     * corresponding characters.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} string The string to unescape.
     * @returns {string} Returns the unescaped string.
     * @example
     *
     * _.unescape('Fred, Barney &amp; Pebbles');
     * // => 'Fred, Barney & Pebbles'
     */
    function unescape(string) {
      return string == null ? '' : String(string).replace(reEscapedHtml, unescapeHtmlChar);
    }

    /**
     * Generates a unique ID. If `prefix` is provided the ID will be appended to it.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} [prefix] The value to prefix the ID with.
     * @returns {string} Returns the unique ID.
     * @example
     *
     * _.uniqueId('contact_');
     * // => 'contact_104'
     *
     * _.uniqueId();
     * // => '105'
     */
    function uniqueId(prefix) {
      var id = ++idCounter;
      return String(prefix == null ? '' : prefix) + id;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a `lodash` object that wraps the given value with explicit
     * method chaining enabled.
     *
     * @static
     * @memberOf _
     * @category Chaining
     * @param {*} value The value to wrap.
     * @returns {Object} Returns the wrapper object.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36 },
     *   { 'name': 'fred',    'age': 40 },
     *   { 'name': 'pebbles', 'age': 1 }
     * ];
     *
     * var youngest = _.chain(characters)
     *     .sortBy('age')
     *     .map(function(chr) { return chr.name + ' is ' + chr.age; })
     *     .first()
     *     .value();
     * // => 'pebbles is 1'
     */
    function chain(value) {
      value = new lodashWrapper(value);
      value.__chain__ = true;
      return value;
    }

    /**
     * Invokes `interceptor` with the `value` as the first argument and then
     * returns `value`. The purpose of this method is to "tap into" a method
     * chain in order to perform operations on intermediate results within
     * the chain.
     *
     * @static
     * @memberOf _
     * @category Chaining
     * @param {*} value The value to provide to `interceptor`.
     * @param {Function} interceptor The function to invoke.
     * @returns {*} Returns `value`.
     * @example
     *
     * _([1, 2, 3, 4])
     *  .tap(function(array) { array.pop(); })
     *  .reverse()
     *  .value();
     * // => [3, 2, 1]
     */
    function tap(value, interceptor) {
      interceptor(value);
      return value;
    }

    /**
     * Enables explicit method chaining on the wrapper object.
     *
     * @name chain
     * @memberOf _
     * @category Chaining
     * @returns {*} Returns the wrapper object.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // without explicit chaining
     * _(characters).first();
     * // => { 'name': 'barney', 'age': 36 }
     *
     * // with explicit chaining
     * _(characters).chain()
     *   .first()
     *   .pick('age')
     *   .value();
     * // => { 'age': 36 }
     */
    function wrapperChain() {
      this.__chain__ = true;
      return this;
    }

    /**
     * Produces the `toString` result of the wrapped value.
     *
     * @name toString
     * @memberOf _
     * @category Chaining
     * @returns {string} Returns the string result.
     * @example
     *
     * _([1, 2, 3]).toString();
     * // => '1,2,3'
     */
    function wrapperToString() {
      return String(this.__wrapped__);
    }

    /**
     * Extracts the wrapped value.
     *
     * @name valueOf
     * @memberOf _
     * @alias value
     * @category Chaining
     * @returns {*} Returns the wrapped value.
     * @example
     *
     * _([1, 2, 3]).valueOf();
     * // => [1, 2, 3]
     */
    function wrapperValueOf() {
      return this.__wrapped__;
    }

    /*--------------------------------------------------------------------------*/

    // add functions that return wrapped values when chaining
    lodash.after = after;
    lodash.assign = assign;
    lodash.at = at;
    lodash.bind = bind;
    lodash.bindAll = bindAll;
    lodash.bindKey = bindKey;
    lodash.chain = chain;
    lodash.compact = compact;
    lodash.compose = compose;
    lodash.constant = constant;
    lodash.countBy = countBy;
    lodash.create = create;
    lodash.createCallback = createCallback;
    lodash.curry = curry;
    lodash.debounce = debounce;
    lodash.defaults = defaults;
    lodash.defer = defer;
    lodash.delay = delay;
    lodash.difference = difference;
    lodash.filter = filter;
    lodash.flatten = flatten;
    lodash.forEach = forEach;
    lodash.forEachRight = forEachRight;
    lodash.forIn = forIn;
    lodash.forInRight = forInRight;
    lodash.forOwn = forOwn;
    lodash.forOwnRight = forOwnRight;
    lodash.functions = functions;
    lodash.groupBy = groupBy;
    lodash.indexBy = indexBy;
    lodash.initial = initial;
    lodash.intersection = intersection;
    lodash.invert = invert;
    lodash.invoke = invoke;
    lodash.keys = keys;
    lodash.map = map;
    lodash.mapValues = mapValues;
    lodash.max = max;
    lodash.memoize = memoize;
    lodash.merge = merge;
    lodash.min = min;
    lodash.omit = omit;
    lodash.once = once;
    lodash.pairs = pairs;
    lodash.partial = partial;
    lodash.partialRight = partialRight;
    lodash.pick = pick;
    lodash.pluck = pluck;
    lodash.property = property;
    lodash.pull = pull;
    lodash.range = range;
    lodash.reject = reject;
    lodash.remove = remove;
    lodash.rest = rest;
    lodash.shuffle = shuffle;
    lodash.sortBy = sortBy;
    lodash.tap = tap;
    lodash.throttle = throttle;
    lodash.times = times;
    lodash.toArray = toArray;
    lodash.transform = transform;
    lodash.union = union;
    lodash.uniq = uniq;
    lodash.values = values;
    lodash.where = where;
    lodash.without = without;
    lodash.wrap = wrap;
    lodash.xor = xor;
    lodash.zip = zip;
    lodash.zipObject = zipObject;

    // add aliases
    lodash.collect = map;
    lodash.drop = rest;
    lodash.each = forEach;
    lodash.eachRight = forEachRight;
    lodash.extend = assign;
    lodash.methods = functions;
    lodash.object = zipObject;
    lodash.select = filter;
    lodash.tail = rest;
    lodash.unique = uniq;
    lodash.unzip = zip;

    // add functions to `lodash.prototype`
    mixin(lodash);

    /*--------------------------------------------------------------------------*/

    // add functions that return unwrapped values when chaining
    lodash.clone = clone;
    lodash.cloneDeep = cloneDeep;
    lodash.contains = contains;
    lodash.escape = escape;
    lodash.every = every;
    lodash.find = find;
    lodash.findIndex = findIndex;
    lodash.findKey = findKey;
    lodash.findLast = findLast;
    lodash.findLastIndex = findLastIndex;
    lodash.findLastKey = findLastKey;
    lodash.has = has;
    lodash.identity = identity;
    lodash.indexOf = indexOf;
    lodash.isArguments = isArguments;
    lodash.isArray = isArray;
    lodash.isBoolean = isBoolean;
    lodash.isDate = isDate;
    lodash.isElement = isElement;
    lodash.isEmpty = isEmpty;
    lodash.isEqual = isEqual;
    lodash.isFinite = isFinite;
    lodash.isFunction = isFunction;
    lodash.isNaN = isNaN;
    lodash.isNull = isNull;
    lodash.isNumber = isNumber;
    lodash.isObject = isObject;
    lodash.isPlainObject = isPlainObject;
    lodash.isRegExp = isRegExp;
    lodash.isString = isString;
    lodash.isUndefined = isUndefined;
    lodash.lastIndexOf = lastIndexOf;
    lodash.mixin = mixin;
    lodash.noConflict = noConflict;
    lodash.noop = noop;
    lodash.now = now;
    lodash.parseInt = parseInt;
    lodash.random = random;
    lodash.reduce = reduce;
    lodash.reduceRight = reduceRight;
    lodash.result = result;
    lodash.runInContext = runInContext;
    lodash.size = size;
    lodash.some = some;
    lodash.sortedIndex = sortedIndex;
    lodash.template = template;
    lodash.unescape = unescape;
    lodash.uniqueId = uniqueId;

    // add aliases
    lodash.all = every;
    lodash.any = some;
    lodash.detect = find;
    lodash.findWhere = find;
    lodash.foldl = reduce;
    lodash.foldr = reduceRight;
    lodash.include = contains;
    lodash.inject = reduce;

    mixin(function() {
      var source = {}
      forOwn(lodash, function(func, methodName) {
        if (!lodash.prototype[methodName]) {
          source[methodName] = func;
        }
      });
      return source;
    }(), false);

    /*--------------------------------------------------------------------------*/

    // add functions capable of returning wrapped and unwrapped values when chaining
    lodash.first = first;
    lodash.last = last;
    lodash.sample = sample;

    // add aliases
    lodash.take = first;
    lodash.head = first;

    forOwn(lodash, function(func, methodName) {
      var callbackable = methodName !== 'sample';
      if (!lodash.prototype[methodName]) {
        lodash.prototype[methodName]= function(n, guard) {
          var chainAll = this.__chain__,
              result = func(this.__wrapped__, n, guard);

          return !chainAll && (n == null || (guard && !(callbackable && typeof n == 'function')))
            ? result
            : new lodashWrapper(result, chainAll);
        };
      }
    });

    /*--------------------------------------------------------------------------*/

    /**
     * The semantic version number.
     *
     * @static
     * @memberOf _
     * @type string
     */
    lodash.VERSION = '2.4.1';

    // add "Chaining" functions to the wrapper
    lodash.prototype.chain = wrapperChain;
    lodash.prototype.toString = wrapperToString;
    lodash.prototype.value = wrapperValueOf;
    lodash.prototype.valueOf = wrapperValueOf;

    // add `Array` functions that return unwrapped values
    forEach(['join', 'pop', 'shift'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        var chainAll = this.__chain__,
            result = func.apply(this.__wrapped__, arguments);

        return chainAll
          ? new lodashWrapper(result, chainAll)
          : result;
      };
    });

    // add `Array` functions that return the existing wrapped value
    forEach(['push', 'reverse', 'sort', 'unshift'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        func.apply(this.__wrapped__, arguments);
        return this;
      };
    });

    // add `Array` functions that return new wrapped values
    forEach(['concat', 'slice', 'splice'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        return new lodashWrapper(func.apply(this.__wrapped__, arguments), this.__chain__);
      };
    });

    return lodash;
  }

  /*--------------------------------------------------------------------------*/

  // expose Lo-Dash
  var _ = runInContext();

  // some AMD build optimizers like r.js check for condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Expose Lo-Dash to the global object even when an AMD loader is present in
    // case Lo-Dash is loaded with a RequireJS shim config.
    // See http://requirejs.org/docs/api.html#config-shim
    root._ = _;

    // define as an anonymous module so, through path mapping, it can be
    // referenced as the "underscore" module
    define(function() {
      return _;
    });
  }
  // check for `exports` after `define` in case a build optimizer adds an `exports` object
  else if (freeExports && freeModule) {
    // in Node.js or RingoJS
    if (moduleExports) {
      (freeModule.exports = _)._ = _;
    }
    // in Narwhal or Rhino -require
    else {
      freeExports._ = _;
    }
  }
  else {
    // in a browser or Rhino
    root._ = _;
  }
}.call(this));

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],6:[function(require,module,exports){
(function (global){
//! moment.js
//! version : 2.6.0
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com

(function (undefined) {

    /************************************
        Constants
    ************************************/

    var moment,
        VERSION = "2.6.0",
        // the global-scope this is NOT the global object in Node.js
        globalScope = typeof global !== 'undefined' ? global : this,
        oldGlobalMoment,
        round = Math.round,
        i,

        YEAR = 0,
        MONTH = 1,
        DATE = 2,
        HOUR = 3,
        MINUTE = 4,
        SECOND = 5,
        MILLISECOND = 6,

        // internal storage for language config files
        languages = {},

        // moment internal properties
        momentProperties = {
            _isAMomentObject: null,
            _i : null,
            _f : null,
            _l : null,
            _strict : null,
            _isUTC : null,
            _offset : null,  // optional. Combine with _isUTC
            _pf : null,
            _lang : null  // optional
        },

        // check for nodeJS
        hasModule = (typeof module !== 'undefined' && module.exports),

        // ASP.NET json date format regex
        aspNetJsonRegex = /^\/?Date\((\-?\d+)/i,
        aspNetTimeSpanJsonRegex = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/,

        // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
        // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
        isoDurationRegex = /^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/,

        // format tokens
        formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Q|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,4}|X|zz?|ZZ?|.)/g,
        localFormattingTokens = /(\[[^\[]*\])|(\\)?(LT|LL?L?L?|l{1,4})/g,

        // parsing token regexes
        parseTokenOneOrTwoDigits = /\d\d?/, // 0 - 99
        parseTokenOneToThreeDigits = /\d{1,3}/, // 0 - 999
        parseTokenOneToFourDigits = /\d{1,4}/, // 0 - 9999
        parseTokenOneToSixDigits = /[+\-]?\d{1,6}/, // -999,999 - 999,999
        parseTokenDigits = /\d+/, // nonzero number of digits
        parseTokenWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i, // any word (or two) characters or numbers including two/three word month in arabic.
        parseTokenTimezone = /Z|[\+\-]\d\d:?\d\d/gi, // +00:00 -00:00 +0000 -0000 or Z
        parseTokenT = /T/i, // T (ISO separator)
        parseTokenTimestampMs = /[\+\-]?\d+(\.\d{1,3})?/, // 123456789 123456789.123
        parseTokenOrdinal = /\d{1,2}/,

        //strict parsing regexes
        parseTokenOneDigit = /\d/, // 0 - 9
        parseTokenTwoDigits = /\d\d/, // 00 - 99
        parseTokenThreeDigits = /\d{3}/, // 000 - 999
        parseTokenFourDigits = /\d{4}/, // 0000 - 9999
        parseTokenSixDigits = /[+-]?\d{6}/, // -999,999 - 999,999
        parseTokenSignedNumber = /[+-]?\d+/, // -inf - inf

        // iso 8601 regex
        // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
        isoRegex = /^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,

        isoFormat = 'YYYY-MM-DDTHH:mm:ssZ',

        isoDates = [
            ['YYYYYY-MM-DD', /[+-]\d{6}-\d{2}-\d{2}/],
            ['YYYY-MM-DD', /\d{4}-\d{2}-\d{2}/],
            ['GGGG-[W]WW-E', /\d{4}-W\d{2}-\d/],
            ['GGGG-[W]WW', /\d{4}-W\d{2}/],
            ['YYYY-DDD', /\d{4}-\d{3}/]
        ],

        // iso time formats and regexes
        isoTimes = [
            ['HH:mm:ss.SSSS', /(T| )\d\d:\d\d:\d\d\.\d+/],
            ['HH:mm:ss', /(T| )\d\d:\d\d:\d\d/],
            ['HH:mm', /(T| )\d\d:\d\d/],
            ['HH', /(T| )\d\d/]
        ],

        // timezone chunker "+10:00" > ["10", "00"] or "-1530" > ["-15", "30"]
        parseTimezoneChunker = /([\+\-]|\d\d)/gi,

        // getter and setter names
        proxyGettersAndSetters = 'Date|Hours|Minutes|Seconds|Milliseconds'.split('|'),
        unitMillisecondFactors = {
            'Milliseconds' : 1,
            'Seconds' : 1e3,
            'Minutes' : 6e4,
            'Hours' : 36e5,
            'Days' : 864e5,
            'Months' : 2592e6,
            'Years' : 31536e6
        },

        unitAliases = {
            ms : 'millisecond',
            s : 'second',
            m : 'minute',
            h : 'hour',
            d : 'day',
            D : 'date',
            w : 'week',
            W : 'isoWeek',
            M : 'month',
            Q : 'quarter',
            y : 'year',
            DDD : 'dayOfYear',
            e : 'weekday',
            E : 'isoWeekday',
            gg: 'weekYear',
            GG: 'isoWeekYear'
        },

        camelFunctions = {
            dayofyear : 'dayOfYear',
            isoweekday : 'isoWeekday',
            isoweek : 'isoWeek',
            weekyear : 'weekYear',
            isoweekyear : 'isoWeekYear'
        },

        // format function strings
        formatFunctions = {},

        // tokens to ordinalize and pad
        ordinalizeTokens = 'DDD w W M D d'.split(' '),
        paddedTokens = 'M D H h m s w W'.split(' '),

        formatTokenFunctions = {
            M    : function () {
                return this.month() + 1;
            },
            MMM  : function (format) {
                return this.lang().monthsShort(this, format);
            },
            MMMM : function (format) {
                return this.lang().months(this, format);
            },
            D    : function () {
                return this.date();
            },
            DDD  : function () {
                return this.dayOfYear();
            },
            d    : function () {
                return this.day();
            },
            dd   : function (format) {
                return this.lang().weekdaysMin(this, format);
            },
            ddd  : function (format) {
                return this.lang().weekdaysShort(this, format);
            },
            dddd : function (format) {
                return this.lang().weekdays(this, format);
            },
            w    : function () {
                return this.week();
            },
            W    : function () {
                return this.isoWeek();
            },
            YY   : function () {
                return leftZeroFill(this.year() % 100, 2);
            },
            YYYY : function () {
                return leftZeroFill(this.year(), 4);
            },
            YYYYY : function () {
                return leftZeroFill(this.year(), 5);
            },
            YYYYYY : function () {
                var y = this.year(), sign = y >= 0 ? '+' : '-';
                return sign + leftZeroFill(Math.abs(y), 6);
            },
            gg   : function () {
                return leftZeroFill(this.weekYear() % 100, 2);
            },
            gggg : function () {
                return leftZeroFill(this.weekYear(), 4);
            },
            ggggg : function () {
                return leftZeroFill(this.weekYear(), 5);
            },
            GG   : function () {
                return leftZeroFill(this.isoWeekYear() % 100, 2);
            },
            GGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 4);
            },
            GGGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 5);
            },
            e : function () {
                return this.weekday();
            },
            E : function () {
                return this.isoWeekday();
            },
            a    : function () {
                return this.lang().meridiem(this.hours(), this.minutes(), true);
            },
            A    : function () {
                return this.lang().meridiem(this.hours(), this.minutes(), false);
            },
            H    : function () {
                return this.hours();
            },
            h    : function () {
                return this.hours() % 12 || 12;
            },
            m    : function () {
                return this.minutes();
            },
            s    : function () {
                return this.seconds();
            },
            S    : function () {
                return toInt(this.milliseconds() / 100);
            },
            SS   : function () {
                return leftZeroFill(toInt(this.milliseconds() / 10), 2);
            },
            SSS  : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            SSSS : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            Z    : function () {
                var a = -this.zone(),
                    b = "+";
                if (a < 0) {
                    a = -a;
                    b = "-";
                }
                return b + leftZeroFill(toInt(a / 60), 2) + ":" + leftZeroFill(toInt(a) % 60, 2);
            },
            ZZ   : function () {
                var a = -this.zone(),
                    b = "+";
                if (a < 0) {
                    a = -a;
                    b = "-";
                }
                return b + leftZeroFill(toInt(a / 60), 2) + leftZeroFill(toInt(a) % 60, 2);
            },
            z : function () {
                return this.zoneAbbr();
            },
            zz : function () {
                return this.zoneName();
            },
            X    : function () {
                return this.unix();
            },
            Q : function () {
                return this.quarter();
            }
        },

        lists = ['months', 'monthsShort', 'weekdays', 'weekdaysShort', 'weekdaysMin'];

    function defaultParsingFlags() {
        // We need to deep clone this object, and es5 standard is not very
        // helpful.
        return {
            empty : false,
            unusedTokens : [],
            unusedInput : [],
            overflow : -2,
            charsLeftOver : 0,
            nullInput : false,
            invalidMonth : null,
            invalidFormat : false,
            userInvalidated : false,
            iso: false
        };
    }

    function deprecate(msg, fn) {
        var firstTime = true;
        function printMsg() {
            if (moment.suppressDeprecationWarnings === false &&
                    typeof console !== 'undefined' && console.warn) {
                console.warn("Deprecation warning: " + msg);
            }
        }
        return extend(function () {
            if (firstTime) {
                printMsg();
                firstTime = false;
            }
            return fn.apply(this, arguments);
        }, fn);
    }

    function padToken(func, count) {
        return function (a) {
            return leftZeroFill(func.call(this, a), count);
        };
    }
    function ordinalizeToken(func, period) {
        return function (a) {
            return this.lang().ordinal(func.call(this, a), period);
        };
    }

    while (ordinalizeTokens.length) {
        i = ordinalizeTokens.pop();
        formatTokenFunctions[i + 'o'] = ordinalizeToken(formatTokenFunctions[i], i);
    }
    while (paddedTokens.length) {
        i = paddedTokens.pop();
        formatTokenFunctions[i + i] = padToken(formatTokenFunctions[i], 2);
    }
    formatTokenFunctions.DDDD = padToken(formatTokenFunctions.DDD, 3);


    /************************************
        Constructors
    ************************************/

    function Language() {

    }

    // Moment prototype object
    function Moment(config) {
        checkOverflow(config);
        extend(this, config);
    }

    // Duration Constructor
    function Duration(duration) {
        var normalizedInput = normalizeObjectUnits(duration),
            years = normalizedInput.year || 0,
            quarters = normalizedInput.quarter || 0,
            months = normalizedInput.month || 0,
            weeks = normalizedInput.week || 0,
            days = normalizedInput.day || 0,
            hours = normalizedInput.hour || 0,
            minutes = normalizedInput.minute || 0,
            seconds = normalizedInput.second || 0,
            milliseconds = normalizedInput.millisecond || 0;

        // representation for dateAddRemove
        this._milliseconds = +milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 36e5; // 1000 * 60 * 60
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = +days +
            weeks * 7;
        // It is impossible translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = +months +
            quarters * 3 +
            years * 12;

        this._data = {};

        this._bubble();
    }

    /************************************
        Helpers
    ************************************/


    function extend(a, b) {
        for (var i in b) {
            if (b.hasOwnProperty(i)) {
                a[i] = b[i];
            }
        }

        if (b.hasOwnProperty("toString")) {
            a.toString = b.toString;
        }

        if (b.hasOwnProperty("valueOf")) {
            a.valueOf = b.valueOf;
        }

        return a;
    }

    function cloneMoment(m) {
        var result = {}, i;
        for (i in m) {
            if (m.hasOwnProperty(i) && momentProperties.hasOwnProperty(i)) {
                result[i] = m[i];
            }
        }

        return result;
    }

    function absRound(number) {
        if (number < 0) {
            return Math.ceil(number);
        } else {
            return Math.floor(number);
        }
    }

    // left zero fill a number
    // see http://jsperf.com/left-zero-filling for performance comparison
    function leftZeroFill(number, targetLength, forceSign) {
        var output = '' + Math.abs(number),
            sign = number >= 0;

        while (output.length < targetLength) {
            output = '0' + output;
        }
        return (sign ? (forceSign ? '+' : '') : '-') + output;
    }

    // helper function for _.addTime and _.subtractTime
    function addOrSubtractDurationFromMoment(mom, duration, isAdding, updateOffset) {
        var milliseconds = duration._milliseconds,
            days = duration._days,
            months = duration._months;
        updateOffset = updateOffset == null ? true : updateOffset;

        if (milliseconds) {
            mom._d.setTime(+mom._d + milliseconds * isAdding);
        }
        if (days) {
            rawSetter(mom, 'Date', rawGetter(mom, 'Date') + days * isAdding);
        }
        if (months) {
            rawMonthSetter(mom, rawGetter(mom, 'Month') + months * isAdding);
        }
        if (updateOffset) {
            moment.updateOffset(mom, days || months);
        }
    }

    // check if is an array
    function isArray(input) {
        return Object.prototype.toString.call(input) === '[object Array]';
    }

    function isDate(input) {
        return  Object.prototype.toString.call(input) === '[object Date]' ||
                input instanceof Date;
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2, dontConvert) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if ((dontConvert && array1[i] !== array2[i]) ||
                (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }

    function normalizeUnits(units) {
        if (units) {
            var lowered = units.toLowerCase().replace(/(.)s$/, '$1');
            units = unitAliases[units] || camelFunctions[lowered] || lowered;
        }
        return units;
    }

    function normalizeObjectUnits(inputObject) {
        var normalizedInput = {},
            normalizedProp,
            prop;

        for (prop in inputObject) {
            if (inputObject.hasOwnProperty(prop)) {
                normalizedProp = normalizeUnits(prop);
                if (normalizedProp) {
                    normalizedInput[normalizedProp] = inputObject[prop];
                }
            }
        }

        return normalizedInput;
    }

    function makeList(field) {
        var count, setter;

        if (field.indexOf('week') === 0) {
            count = 7;
            setter = 'day';
        }
        else if (field.indexOf('month') === 0) {
            count = 12;
            setter = 'month';
        }
        else {
            return;
        }

        moment[field] = function (format, index) {
            var i, getter,
                method = moment.fn._lang[field],
                results = [];

            if (typeof format === 'number') {
                index = format;
                format = undefined;
            }

            getter = function (i) {
                var m = moment().utc().set(setter, i);
                return method.call(moment.fn._lang, m, format || '');
            };

            if (index != null) {
                return getter(index);
            }
            else {
                for (i = 0; i < count; i++) {
                    results.push(getter(i));
                }
                return results;
            }
        };
    }

    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion,
            value = 0;

        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            if (coercedNumber >= 0) {
                value = Math.floor(coercedNumber);
            } else {
                value = Math.ceil(coercedNumber);
            }
        }

        return value;
    }

    function daysInMonth(year, month) {
        return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    }

    function weeksInYear(year, dow, doy) {
        return weekOfYear(moment([year, 11, 31 + dow - doy]), dow, doy).week;
    }

    function daysInYear(year) {
        return isLeapYear(year) ? 366 : 365;
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    function checkOverflow(m) {
        var overflow;
        if (m._a && m._pf.overflow === -2) {
            overflow =
                m._a[MONTH] < 0 || m._a[MONTH] > 11 ? MONTH :
                m._a[DATE] < 1 || m._a[DATE] > daysInMonth(m._a[YEAR], m._a[MONTH]) ? DATE :
                m._a[HOUR] < 0 || m._a[HOUR] > 23 ? HOUR :
                m._a[MINUTE] < 0 || m._a[MINUTE] > 59 ? MINUTE :
                m._a[SECOND] < 0 || m._a[SECOND] > 59 ? SECOND :
                m._a[MILLISECOND] < 0 || m._a[MILLISECOND] > 999 ? MILLISECOND :
                -1;

            if (m._pf._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                overflow = DATE;
            }

            m._pf.overflow = overflow;
        }
    }

    function isValid(m) {
        if (m._isValid == null) {
            m._isValid = !isNaN(m._d.getTime()) &&
                m._pf.overflow < 0 &&
                !m._pf.empty &&
                !m._pf.invalidMonth &&
                !m._pf.nullInput &&
                !m._pf.invalidFormat &&
                !m._pf.userInvalidated;

            if (m._strict) {
                m._isValid = m._isValid &&
                    m._pf.charsLeftOver === 0 &&
                    m._pf.unusedTokens.length === 0;
            }
        }
        return m._isValid;
    }

    function normalizeLanguage(key) {
        return key ? key.toLowerCase().replace('_', '-') : key;
    }

    // Return a moment from input, that is local/utc/zone equivalent to model.
    function makeAs(input, model) {
        return model._isUTC ? moment(input).zone(model._offset || 0) :
            moment(input).local();
    }

    /************************************
        Languages
    ************************************/


    extend(Language.prototype, {

        set : function (config) {
            var prop, i;
            for (i in config) {
                prop = config[i];
                if (typeof prop === 'function') {
                    this[i] = prop;
                } else {
                    this['_' + i] = prop;
                }
            }
        },

        _months : "January_February_March_April_May_June_July_August_September_October_November_December".split("_"),
        months : function (m) {
            return this._months[m.month()];
        },

        _monthsShort : "Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),
        monthsShort : function (m) {
            return this._monthsShort[m.month()];
        },

        monthsParse : function (monthName) {
            var i, mom, regex;

            if (!this._monthsParse) {
                this._monthsParse = [];
            }

            for (i = 0; i < 12; i++) {
                // make the regex if we don't have it already
                if (!this._monthsParse[i]) {
                    mom = moment.utc([2000, i]);
                    regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                    this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (this._monthsParse[i].test(monthName)) {
                    return i;
                }
            }
        },

        _weekdays : "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),
        weekdays : function (m) {
            return this._weekdays[m.day()];
        },

        _weekdaysShort : "Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),
        weekdaysShort : function (m) {
            return this._weekdaysShort[m.day()];
        },

        _weekdaysMin : "Su_Mo_Tu_We_Th_Fr_Sa".split("_"),
        weekdaysMin : function (m) {
            return this._weekdaysMin[m.day()];
        },

        weekdaysParse : function (weekdayName) {
            var i, mom, regex;

            if (!this._weekdaysParse) {
                this._weekdaysParse = [];
            }

            for (i = 0; i < 7; i++) {
                // make the regex if we don't have it already
                if (!this._weekdaysParse[i]) {
                    mom = moment([2000, 1]).day(i);
                    regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
                    this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (this._weekdaysParse[i].test(weekdayName)) {
                    return i;
                }
            }
        },

        _longDateFormat : {
            LT : "h:mm A",
            L : "MM/DD/YYYY",
            LL : "MMMM D YYYY",
            LLL : "MMMM D YYYY LT",
            LLLL : "dddd, MMMM D YYYY LT"
        },
        longDateFormat : function (key) {
            var output = this._longDateFormat[key];
            if (!output && this._longDateFormat[key.toUpperCase()]) {
                output = this._longDateFormat[key.toUpperCase()].replace(/MMMM|MM|DD|dddd/g, function (val) {
                    return val.slice(1);
                });
                this._longDateFormat[key] = output;
            }
            return output;
        },

        isPM : function (input) {
            // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
            // Using charAt should be more compatible.
            return ((input + '').toLowerCase().charAt(0) === 'p');
        },

        _meridiemParse : /[ap]\.?m?\.?/i,
        meridiem : function (hours, minutes, isLower) {
            if (hours > 11) {
                return isLower ? 'pm' : 'PM';
            } else {
                return isLower ? 'am' : 'AM';
            }
        },

        _calendar : {
            sameDay : '[Today at] LT',
            nextDay : '[Tomorrow at] LT',
            nextWeek : 'dddd [at] LT',
            lastDay : '[Yesterday at] LT',
            lastWeek : '[Last] dddd [at] LT',
            sameElse : 'L'
        },
        calendar : function (key, mom) {
            var output = this._calendar[key];
            return typeof output === 'function' ? output.apply(mom) : output;
        },

        _relativeTime : {
            future : "in %s",
            past : "%s ago",
            s : "a few seconds",
            m : "a minute",
            mm : "%d minutes",
            h : "an hour",
            hh : "%d hours",
            d : "a day",
            dd : "%d days",
            M : "a month",
            MM : "%d months",
            y : "a year",
            yy : "%d years"
        },
        relativeTime : function (number, withoutSuffix, string, isFuture) {
            var output = this._relativeTime[string];
            return (typeof output === 'function') ?
                output(number, withoutSuffix, string, isFuture) :
                output.replace(/%d/i, number);
        },
        pastFuture : function (diff, output) {
            var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
            return typeof format === 'function' ? format(output) : format.replace(/%s/i, output);
        },

        ordinal : function (number) {
            return this._ordinal.replace("%d", number);
        },
        _ordinal : "%d",

        preparse : function (string) {
            return string;
        },

        postformat : function (string) {
            return string;
        },

        week : function (mom) {
            return weekOfYear(mom, this._week.dow, this._week.doy).week;
        },

        _week : {
            dow : 0, // Sunday is the first day of the week.
            doy : 6  // The week that contains Jan 1st is the first week of the year.
        },

        _invalidDate: 'Invalid date',
        invalidDate: function () {
            return this._invalidDate;
        }
    });

    // Loads a language definition into the `languages` cache.  The function
    // takes a key and optionally values.  If not in the browser and no values
    // are provided, it will load the language file module.  As a convenience,
    // this function also returns the language values.
    function loadLang(key, values) {
        values.abbr = key;
        if (!languages[key]) {
            languages[key] = new Language();
        }
        languages[key].set(values);
        return languages[key];
    }

    // Remove a language from the `languages` cache. Mostly useful in tests.
    function unloadLang(key) {
        delete languages[key];
    }

    // Determines which language definition to use and returns it.
    //
    // With no parameters, it will return the global language.  If you
    // pass in a language key, such as 'en', it will return the
    // definition for 'en', so long as 'en' has already been loaded using
    // moment.lang.
    function getLangDefinition(key) {
        var i = 0, j, lang, next, split,
            get = function (k) {
                if (!languages[k] && hasModule) {
                    try {
                        require('./lang/' + k);
                    } catch (e) { }
                }
                return languages[k];
            };

        if (!key) {
            return moment.fn._lang;
        }

        if (!isArray(key)) {
            //short-circuit everything else
            lang = get(key);
            if (lang) {
                return lang;
            }
            key = [key];
        }

        //pick the language from the array
        //try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
        //substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
        while (i < key.length) {
            split = normalizeLanguage(key[i]).split('-');
            j = split.length;
            next = normalizeLanguage(key[i + 1]);
            next = next ? next.split('-') : null;
            while (j > 0) {
                lang = get(split.slice(0, j).join('-'));
                if (lang) {
                    return lang;
                }
                if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                    //the next array item is better than a shallower substring of this one
                    break;
                }
                j--;
            }
            i++;
        }
        return moment.fn._lang;
    }

    /************************************
        Formatting
    ************************************/


    function removeFormattingTokens(input) {
        if (input.match(/\[[\s\S]/)) {
            return input.replace(/^\[|\]$/g, "");
        }
        return input.replace(/\\/g, "");
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = "";
            for (i = 0; i < length; i++) {
                output += array[i] instanceof Function ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {

        if (!m.isValid()) {
            return m.lang().invalidDate();
        }

        format = expandFormat(format, m.lang());

        if (!formatFunctions[format]) {
            formatFunctions[format] = makeFormatFunction(format);
        }

        return formatFunctions[format](m);
    }

    function expandFormat(format, lang) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return lang.longDateFormat(input) || input;
        }

        localFormattingTokens.lastIndex = 0;
        while (i >= 0 && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
            localFormattingTokens.lastIndex = 0;
            i -= 1;
        }

        return format;
    }


    /************************************
        Parsing
    ************************************/


    // get the regex to find the next token
    function getParseRegexForToken(token, config) {
        var a, strict = config._strict;
        switch (token) {
        case 'Q':
            return parseTokenOneDigit;
        case 'DDDD':
            return parseTokenThreeDigits;
        case 'YYYY':
        case 'GGGG':
        case 'gggg':
            return strict ? parseTokenFourDigits : parseTokenOneToFourDigits;
        case 'Y':
        case 'G':
        case 'g':
            return parseTokenSignedNumber;
        case 'YYYYYY':
        case 'YYYYY':
        case 'GGGGG':
        case 'ggggg':
            return strict ? parseTokenSixDigits : parseTokenOneToSixDigits;
        case 'S':
            if (strict) { return parseTokenOneDigit; }
            /* falls through */
        case 'SS':
            if (strict) { return parseTokenTwoDigits; }
            /* falls through */
        case 'SSS':
            if (strict) { return parseTokenThreeDigits; }
            /* falls through */
        case 'DDD':
            return parseTokenOneToThreeDigits;
        case 'MMM':
        case 'MMMM':
        case 'dd':
        case 'ddd':
        case 'dddd':
            return parseTokenWord;
        case 'a':
        case 'A':
            return getLangDefinition(config._l)._meridiemParse;
        case 'X':
            return parseTokenTimestampMs;
        case 'Z':
        case 'ZZ':
            return parseTokenTimezone;
        case 'T':
            return parseTokenT;
        case 'SSSS':
            return parseTokenDigits;
        case 'MM':
        case 'DD':
        case 'YY':
        case 'GG':
        case 'gg':
        case 'HH':
        case 'hh':
        case 'mm':
        case 'ss':
        case 'ww':
        case 'WW':
            return strict ? parseTokenTwoDigits : parseTokenOneOrTwoDigits;
        case 'M':
        case 'D':
        case 'd':
        case 'H':
        case 'h':
        case 'm':
        case 's':
        case 'w':
        case 'W':
        case 'e':
        case 'E':
            return parseTokenOneOrTwoDigits;
        case 'Do':
            return parseTokenOrdinal;
        default :
            a = new RegExp(regexpEscape(unescapeFormat(token.replace('\\', '')), "i"));
            return a;
        }
    }

    function timezoneMinutesFromString(string) {
        string = string || "";
        var possibleTzMatches = (string.match(parseTokenTimezone) || []),
            tzChunk = possibleTzMatches[possibleTzMatches.length - 1] || [],
            parts = (tzChunk + '').match(parseTimezoneChunker) || ['-', 0, 0],
            minutes = +(parts[1] * 60) + toInt(parts[2]);

        return parts[0] === '+' ? -minutes : minutes;
    }

    // function to convert string input to date
    function addTimeToArrayFromToken(token, input, config) {
        var a, datePartArray = config._a;

        switch (token) {
        // QUARTER
        case 'Q':
            if (input != null) {
                datePartArray[MONTH] = (toInt(input) - 1) * 3;
            }
            break;
        // MONTH
        case 'M' : // fall through to MM
        case 'MM' :
            if (input != null) {
                datePartArray[MONTH] = toInt(input) - 1;
            }
            break;
        case 'MMM' : // fall through to MMMM
        case 'MMMM' :
            a = getLangDefinition(config._l).monthsParse(input);
            // if we didn't find a month name, mark the date as invalid.
            if (a != null) {
                datePartArray[MONTH] = a;
            } else {
                config._pf.invalidMonth = input;
            }
            break;
        // DAY OF MONTH
        case 'D' : // fall through to DD
        case 'DD' :
            if (input != null) {
                datePartArray[DATE] = toInt(input);
            }
            break;
        case 'Do' :
            if (input != null) {
                datePartArray[DATE] = toInt(parseInt(input, 10));
            }
            break;
        // DAY OF YEAR
        case 'DDD' : // fall through to DDDD
        case 'DDDD' :
            if (input != null) {
                config._dayOfYear = toInt(input);
            }

            break;
        // YEAR
        case 'YY' :
            datePartArray[YEAR] = moment.parseTwoDigitYear(input);
            break;
        case 'YYYY' :
        case 'YYYYY' :
        case 'YYYYYY' :
            datePartArray[YEAR] = toInt(input);
            break;
        // AM / PM
        case 'a' : // fall through to A
        case 'A' :
            config._isPm = getLangDefinition(config._l).isPM(input);
            break;
        // 24 HOUR
        case 'H' : // fall through to hh
        case 'HH' : // fall through to hh
        case 'h' : // fall through to hh
        case 'hh' :
            datePartArray[HOUR] = toInt(input);
            break;
        // MINUTE
        case 'm' : // fall through to mm
        case 'mm' :
            datePartArray[MINUTE] = toInt(input);
            break;
        // SECOND
        case 's' : // fall through to ss
        case 'ss' :
            datePartArray[SECOND] = toInt(input);
            break;
        // MILLISECOND
        case 'S' :
        case 'SS' :
        case 'SSS' :
        case 'SSSS' :
            datePartArray[MILLISECOND] = toInt(('0.' + input) * 1000);
            break;
        // UNIX TIMESTAMP WITH MS
        case 'X':
            config._d = new Date(parseFloat(input) * 1000);
            break;
        // TIMEZONE
        case 'Z' : // fall through to ZZ
        case 'ZZ' :
            config._useUTC = true;
            config._tzm = timezoneMinutesFromString(input);
            break;
        case 'w':
        case 'ww':
        case 'W':
        case 'WW':
        case 'd':
        case 'dd':
        case 'ddd':
        case 'dddd':
        case 'e':
        case 'E':
            token = token.substr(0, 1);
            /* falls through */
        case 'gg':
        case 'gggg':
        case 'GG':
        case 'GGGG':
        case 'GGGGG':
            token = token.substr(0, 2);
            if (input) {
                config._w = config._w || {};
                config._w[token] = input;
            }
            break;
        }
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function dateFromConfig(config) {
        var i, date, input = [], currentDate,
            yearToUse, fixYear, w, temp, lang, weekday, week;

        if (config._d) {
            return;
        }

        currentDate = currentDateArray(config);

        //compute day of the year from weeks and weekdays
        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
            fixYear = function (val) {
                var intVal = parseInt(val, 10);
                return val ?
                  (val.length < 3 ? (intVal > 68 ? 1900 + intVal : 2000 + intVal) : intVal) :
                  (config._a[YEAR] == null ? moment().weekYear() : config._a[YEAR]);
            };

            w = config._w;
            if (w.GG != null || w.W != null || w.E != null) {
                temp = dayOfYearFromWeeks(fixYear(w.GG), w.W || 1, w.E, 4, 1);
            }
            else {
                lang = getLangDefinition(config._l);
                weekday = w.d != null ?  parseWeekday(w.d, lang) :
                  (w.e != null ?  parseInt(w.e, 10) + lang._week.dow : 0);

                week = parseInt(w.w, 10) || 1;

                //if we're parsing 'd', then the low day numbers may be next week
                if (w.d != null && weekday < lang._week.dow) {
                    week++;
                }

                temp = dayOfYearFromWeeks(fixYear(w.gg), week, weekday, lang._week.doy, lang._week.dow);
            }

            config._a[YEAR] = temp.year;
            config._dayOfYear = temp.dayOfYear;
        }

        //if the day of the year is set, figure out what it is
        if (config._dayOfYear) {
            yearToUse = config._a[YEAR] == null ? currentDate[YEAR] : config._a[YEAR];

            if (config._dayOfYear > daysInYear(yearToUse)) {
                config._pf._overflowDayOfYear = true;
            }

            date = makeUTCDate(yearToUse, 0, config._dayOfYear);
            config._a[MONTH] = date.getUTCMonth();
            config._a[DATE] = date.getUTCDate();
        }

        // Default to current date.
        // * if no year, month, day of month are given, default to today
        // * if day of month is given, default month and year
        // * if month is given, default only year
        // * if year is given, don't default anything
        for (i = 0; i < 3 && config._a[i] == null; ++i) {
            config._a[i] = input[i] = currentDate[i];
        }

        // Zero out whatever was not defaulted, including time
        for (; i < 7; i++) {
            config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
        }

        // add the offsets to the time to be parsed so that we can have a clean array for checking isValid
        input[HOUR] += toInt((config._tzm || 0) / 60);
        input[MINUTE] += toInt((config._tzm || 0) % 60);

        config._d = (config._useUTC ? makeUTCDate : makeDate).apply(null, input);
    }

    function dateFromObject(config) {
        var normalizedInput;

        if (config._d) {
            return;
        }

        normalizedInput = normalizeObjectUnits(config._i);
        config._a = [
            normalizedInput.year,
            normalizedInput.month,
            normalizedInput.day,
            normalizedInput.hour,
            normalizedInput.minute,
            normalizedInput.second,
            normalizedInput.millisecond
        ];

        dateFromConfig(config);
    }

    function currentDateArray(config) {
        var now = new Date();
        if (config._useUTC) {
            return [
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate()
            ];
        } else {
            return [now.getFullYear(), now.getMonth(), now.getDate()];
        }
    }

    // date from string and format string
    function makeDateFromStringAndFormat(config) {

        config._a = [];
        config._pf.empty = true;

        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        var lang = getLangDefinition(config._l),
            string = '' + config._i,
            i, parsedInput, tokens, token, skipped,
            stringLength = string.length,
            totalParsedInputLength = 0;

        tokens = expandFormat(config._f, lang).match(formattingTokens) || [];

        for (i = 0; i < tokens.length; i++) {
            token = tokens[i];
            parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
            if (parsedInput) {
                skipped = string.substr(0, string.indexOf(parsedInput));
                if (skipped.length > 0) {
                    config._pf.unusedInput.push(skipped);
                }
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                totalParsedInputLength += parsedInput.length;
            }
            // don't parse if it's not a known token
            if (formatTokenFunctions[token]) {
                if (parsedInput) {
                    config._pf.empty = false;
                }
                else {
                    config._pf.unusedTokens.push(token);
                }
                addTimeToArrayFromToken(token, parsedInput, config);
            }
            else if (config._strict && !parsedInput) {
                config._pf.unusedTokens.push(token);
            }
        }

        // add remaining unparsed input length to the string
        config._pf.charsLeftOver = stringLength - totalParsedInputLength;
        if (string.length > 0) {
            config._pf.unusedInput.push(string);
        }

        // handle am pm
        if (config._isPm && config._a[HOUR] < 12) {
            config._a[HOUR] += 12;
        }
        // if is 12 am, change hours to 0
        if (config._isPm === false && config._a[HOUR] === 12) {
            config._a[HOUR] = 0;
        }

        dateFromConfig(config);
        checkOverflow(config);
    }

    function unescapeFormat(s) {
        return s.replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
            return p1 || p2 || p3 || p4;
        });
    }

    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function regexpEscape(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    // date from string and array of format strings
    function makeDateFromStringAndArray(config) {
        var tempConfig,
            bestMoment,

            scoreToBeat,
            i,
            currentScore;

        if (config._f.length === 0) {
            config._pf.invalidFormat = true;
            config._d = new Date(NaN);
            return;
        }

        for (i = 0; i < config._f.length; i++) {
            currentScore = 0;
            tempConfig = extend({}, config);
            tempConfig._pf = defaultParsingFlags();
            tempConfig._f = config._f[i];
            makeDateFromStringAndFormat(tempConfig);

            if (!isValid(tempConfig)) {
                continue;
            }

            // if there is any input that was not parsed add a penalty for that format
            currentScore += tempConfig._pf.charsLeftOver;

            //or tokens
            currentScore += tempConfig._pf.unusedTokens.length * 10;

            tempConfig._pf.score = currentScore;

            if (scoreToBeat == null || currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempConfig;
            }
        }

        extend(config, bestMoment || tempConfig);
    }

    // date from iso format
    function makeDateFromString(config) {
        var i, l,
            string = config._i,
            match = isoRegex.exec(string);

        if (match) {
            config._pf.iso = true;
            for (i = 0, l = isoDates.length; i < l; i++) {
                if (isoDates[i][1].exec(string)) {
                    // match[5] should be "T" or undefined
                    config._f = isoDates[i][0] + (match[6] || " ");
                    break;
                }
            }
            for (i = 0, l = isoTimes.length; i < l; i++) {
                if (isoTimes[i][1].exec(string)) {
                    config._f += isoTimes[i][0];
                    break;
                }
            }
            if (string.match(parseTokenTimezone)) {
                config._f += "Z";
            }
            makeDateFromStringAndFormat(config);
        }
        else {
            moment.createFromInputFallback(config);
        }
    }

    function makeDateFromInput(config) {
        var input = config._i,
            matched = aspNetJsonRegex.exec(input);

        if (input === undefined) {
            config._d = new Date();
        } else if (matched) {
            config._d = new Date(+matched[1]);
        } else if (typeof input === 'string') {
            makeDateFromString(config);
        } else if (isArray(input)) {
            config._a = input.slice(0);
            dateFromConfig(config);
        } else if (isDate(input)) {
            config._d = new Date(+input);
        } else if (typeof(input) === 'object') {
            dateFromObject(config);
        } else if (typeof(input) === 'number') {
            // from milliseconds
            config._d = new Date(input);
        } else {
            moment.createFromInputFallback(config);
        }
    }

    function makeDate(y, m, d, h, M, s, ms) {
        //can't just apply() to create a date:
        //http://stackoverflow.com/questions/181348/instantiating-a-javascript-object-by-calling-prototype-constructor-apply
        var date = new Date(y, m, d, h, M, s, ms);

        //the date constructor doesn't accept years < 1970
        if (y < 1970) {
            date.setFullYear(y);
        }
        return date;
    }

    function makeUTCDate(y) {
        var date = new Date(Date.UTC.apply(null, arguments));
        if (y < 1970) {
            date.setUTCFullYear(y);
        }
        return date;
    }

    function parseWeekday(input, language) {
        if (typeof input === 'string') {
            if (!isNaN(input)) {
                input = parseInt(input, 10);
            }
            else {
                input = language.weekdaysParse(input);
                if (typeof input !== 'number') {
                    return null;
                }
            }
        }
        return input;
    }

    /************************************
        Relative Time
    ************************************/


    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, lang) {
        return lang.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function relativeTime(milliseconds, withoutSuffix, lang) {
        var seconds = round(Math.abs(milliseconds) / 1000),
            minutes = round(seconds / 60),
            hours = round(minutes / 60),
            days = round(hours / 24),
            years = round(days / 365),
            args = seconds < 45 && ['s', seconds] ||
                minutes === 1 && ['m'] ||
                minutes < 45 && ['mm', minutes] ||
                hours === 1 && ['h'] ||
                hours < 22 && ['hh', hours] ||
                days === 1 && ['d'] ||
                days <= 25 && ['dd', days] ||
                days <= 45 && ['M'] ||
                days < 345 && ['MM', round(days / 30)] ||
                years === 1 && ['y'] || ['yy', years];
        args[2] = withoutSuffix;
        args[3] = milliseconds > 0;
        args[4] = lang;
        return substituteTimeAgo.apply({}, args);
    }


    /************************************
        Week of Year
    ************************************/


    // firstDayOfWeek       0 = sun, 6 = sat
    //                      the day of the week that starts the week
    //                      (usually sunday or monday)
    // firstDayOfWeekOfYear 0 = sun, 6 = sat
    //                      the first week is the week that contains the first
    //                      of this day of the week
    //                      (eg. ISO weeks use thursday (4))
    function weekOfYear(mom, firstDayOfWeek, firstDayOfWeekOfYear) {
        var end = firstDayOfWeekOfYear - firstDayOfWeek,
            daysToDayOfWeek = firstDayOfWeekOfYear - mom.day(),
            adjustedMoment;


        if (daysToDayOfWeek > end) {
            daysToDayOfWeek -= 7;
        }

        if (daysToDayOfWeek < end - 7) {
            daysToDayOfWeek += 7;
        }

        adjustedMoment = moment(mom).add('d', daysToDayOfWeek);
        return {
            week: Math.ceil(adjustedMoment.dayOfYear() / 7),
            year: adjustedMoment.year()
        };
    }

    //http://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    function dayOfYearFromWeeks(year, week, weekday, firstDayOfWeekOfYear, firstDayOfWeek) {
        var d = makeUTCDate(year, 0, 1).getUTCDay(), daysToAdd, dayOfYear;

        weekday = weekday != null ? weekday : firstDayOfWeek;
        daysToAdd = firstDayOfWeek - d + (d > firstDayOfWeekOfYear ? 7 : 0) - (d < firstDayOfWeek ? 7 : 0);
        dayOfYear = 7 * (week - 1) + (weekday - firstDayOfWeek) + daysToAdd + 1;

        return {
            year: dayOfYear > 0 ? year : year - 1,
            dayOfYear: dayOfYear > 0 ?  dayOfYear : daysInYear(year - 1) + dayOfYear
        };
    }

    /************************************
        Top Level Functions
    ************************************/

    function makeMoment(config) {
        var input = config._i,
            format = config._f;

        if (input === null || (format === undefined && input === '')) {
            return moment.invalid({nullInput: true});
        }

        if (typeof input === 'string') {
            config._i = input = getLangDefinition().preparse(input);
        }

        if (moment.isMoment(input)) {
            config = cloneMoment(input);

            config._d = new Date(+input._d);
        } else if (format) {
            if (isArray(format)) {
                makeDateFromStringAndArray(config);
            } else {
                makeDateFromStringAndFormat(config);
            }
        } else {
            makeDateFromInput(config);
        }

        return new Moment(config);
    }

    moment = function (input, format, lang, strict) {
        var c;

        if (typeof(lang) === "boolean") {
            strict = lang;
            lang = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._i = input;
        c._f = format;
        c._l = lang;
        c._strict = strict;
        c._isUTC = false;
        c._pf = defaultParsingFlags();

        return makeMoment(c);
    };

    moment.suppressDeprecationWarnings = false;

    moment.createFromInputFallback = deprecate(
            "moment construction falls back to js Date. This is " +
            "discouraged and will be removed in upcoming major " +
            "release. Please refer to " +
            "https://github.com/moment/moment/issues/1407 for more info.",
            function (config) {
        config._d = new Date(config._i);
    });

    // creating with utc
    moment.utc = function (input, format, lang, strict) {
        var c;

        if (typeof(lang) === "boolean") {
            strict = lang;
            lang = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._useUTC = true;
        c._isUTC = true;
        c._l = lang;
        c._i = input;
        c._f = format;
        c._strict = strict;
        c._pf = defaultParsingFlags();

        return makeMoment(c).utc();
    };

    // creating with unix timestamp (in seconds)
    moment.unix = function (input) {
        return moment(input * 1000);
    };

    // duration
    moment.duration = function (input, key) {
        var duration = input,
            // matching against regexp is expensive, do it on demand
            match = null,
            sign,
            ret,
            parseIso;

        if (moment.isDuration(input)) {
            duration = {
                ms: input._milliseconds,
                d: input._days,
                M: input._months
            };
        } else if (typeof input === 'number') {
            duration = {};
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        } else if (!!(match = aspNetTimeSpanJsonRegex.exec(input))) {
            sign = (match[1] === "-") ? -1 : 1;
            duration = {
                y: 0,
                d: toInt(match[DATE]) * sign,
                h: toInt(match[HOUR]) * sign,
                m: toInt(match[MINUTE]) * sign,
                s: toInt(match[SECOND]) * sign,
                ms: toInt(match[MILLISECOND]) * sign
            };
        } else if (!!(match = isoDurationRegex.exec(input))) {
            sign = (match[1] === "-") ? -1 : 1;
            parseIso = function (inp) {
                // We'd normally use ~~inp for this, but unfortunately it also
                // converts floats to ints.
                // inp may be undefined, so careful calling replace on it.
                var res = inp && parseFloat(inp.replace(',', '.'));
                // apply sign while we're at it
                return (isNaN(res) ? 0 : res) * sign;
            };
            duration = {
                y: parseIso(match[2]),
                M: parseIso(match[3]),
                d: parseIso(match[4]),
                h: parseIso(match[5]),
                m: parseIso(match[6]),
                s: parseIso(match[7]),
                w: parseIso(match[8])
            };
        }

        ret = new Duration(duration);

        if (moment.isDuration(input) && input.hasOwnProperty('_lang')) {
            ret._lang = input._lang;
        }

        return ret;
    };

    // version number
    moment.version = VERSION;

    // default format
    moment.defaultFormat = isoFormat;

    // Plugins that add properties should also add the key here (null value),
    // so we can properly clone ourselves.
    moment.momentProperties = momentProperties;

    // This function will be called whenever a moment is mutated.
    // It is intended to keep the offset in sync with the timezone.
    moment.updateOffset = function () {};

    // This function will load languages and then set the global language.  If
    // no arguments are passed in, it will simply return the current global
    // language key.
    moment.lang = function (key, values) {
        var r;
        if (!key) {
            return moment.fn._lang._abbr;
        }
        if (values) {
            loadLang(normalizeLanguage(key), values);
        } else if (values === null) {
            unloadLang(key);
            key = 'en';
        } else if (!languages[key]) {
            getLangDefinition(key);
        }
        r = moment.duration.fn._lang = moment.fn._lang = getLangDefinition(key);
        return r._abbr;
    };

    // returns language data
    moment.langData = function (key) {
        if (key && key._lang && key._lang._abbr) {
            key = key._lang._abbr;
        }
        return getLangDefinition(key);
    };

    // compare moment object
    moment.isMoment = function (obj) {
        return obj instanceof Moment ||
            (obj != null &&  obj.hasOwnProperty('_isAMomentObject'));
    };

    // for typechecking Duration objects
    moment.isDuration = function (obj) {
        return obj instanceof Duration;
    };

    for (i = lists.length - 1; i >= 0; --i) {
        makeList(lists[i]);
    }

    moment.normalizeUnits = function (units) {
        return normalizeUnits(units);
    };

    moment.invalid = function (flags) {
        var m = moment.utc(NaN);
        if (flags != null) {
            extend(m._pf, flags);
        }
        else {
            m._pf.userInvalidated = true;
        }

        return m;
    };

    moment.parseZone = function () {
        return moment.apply(null, arguments).parseZone();
    };

    moment.parseTwoDigitYear = function (input) {
        return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    };

    /************************************
        Moment Prototype
    ************************************/


    extend(moment.fn = Moment.prototype, {

        clone : function () {
            return moment(this);
        },

        valueOf : function () {
            return +this._d + ((this._offset || 0) * 60000);
        },

        unix : function () {
            return Math.floor(+this / 1000);
        },

        toString : function () {
            return this.clone().lang('en').format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ");
        },

        toDate : function () {
            return this._offset ? new Date(+this) : this._d;
        },

        toISOString : function () {
            var m = moment(this).utc();
            if (0 < m.year() && m.year() <= 9999) {
                return formatMoment(m, 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
            } else {
                return formatMoment(m, 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
            }
        },

        toArray : function () {
            var m = this;
            return [
                m.year(),
                m.month(),
                m.date(),
                m.hours(),
                m.minutes(),
                m.seconds(),
                m.milliseconds()
            ];
        },

        isValid : function () {
            return isValid(this);
        },

        isDSTShifted : function () {

            if (this._a) {
                return this.isValid() && compareArrays(this._a, (this._isUTC ? moment.utc(this._a) : moment(this._a)).toArray()) > 0;
            }

            return false;
        },

        parsingFlags : function () {
            return extend({}, this._pf);
        },

        invalidAt: function () {
            return this._pf.overflow;
        },

        utc : function () {
            return this.zone(0);
        },

        local : function () {
            this.zone(0);
            this._isUTC = false;
            return this;
        },

        format : function (inputString) {
            var output = formatMoment(this, inputString || moment.defaultFormat);
            return this.lang().postformat(output);
        },

        add : function (input, val) {
            var dur;
            // switch args to support add('s', 1) and add(1, 's')
            if (typeof input === 'string') {
                dur = moment.duration(+val, input);
            } else {
                dur = moment.duration(input, val);
            }
            addOrSubtractDurationFromMoment(this, dur, 1);
            return this;
        },

        subtract : function (input, val) {
            var dur;
            // switch args to support subtract('s', 1) and subtract(1, 's')
            if (typeof input === 'string') {
                dur = moment.duration(+val, input);
            } else {
                dur = moment.duration(input, val);
            }
            addOrSubtractDurationFromMoment(this, dur, -1);
            return this;
        },

        diff : function (input, units, asFloat) {
            var that = makeAs(input, this),
                zoneDiff = (this.zone() - that.zone()) * 6e4,
                diff, output;

            units = normalizeUnits(units);

            if (units === 'year' || units === 'month') {
                // average number of days in the months in the given dates
                diff = (this.daysInMonth() + that.daysInMonth()) * 432e5; // 24 * 60 * 60 * 1000 / 2
                // difference in months
                output = ((this.year() - that.year()) * 12) + (this.month() - that.month());
                // adjust by taking difference in days, average number of days
                // and dst in the given months.
                output += ((this - moment(this).startOf('month')) -
                        (that - moment(that).startOf('month'))) / diff;
                // same as above but with zones, to negate all dst
                output -= ((this.zone() - moment(this).startOf('month').zone()) -
                        (that.zone() - moment(that).startOf('month').zone())) * 6e4 / diff;
                if (units === 'year') {
                    output = output / 12;
                }
            } else {
                diff = (this - that);
                output = units === 'second' ? diff / 1e3 : // 1000
                    units === 'minute' ? diff / 6e4 : // 1000 * 60
                    units === 'hour' ? diff / 36e5 : // 1000 * 60 * 60
                    units === 'day' ? (diff - zoneDiff) / 864e5 : // 1000 * 60 * 60 * 24, negate dst
                    units === 'week' ? (diff - zoneDiff) / 6048e5 : // 1000 * 60 * 60 * 24 * 7, negate dst
                    diff;
            }
            return asFloat ? output : absRound(output);
        },

        from : function (time, withoutSuffix) {
            return moment.duration(this.diff(time)).lang(this.lang()._abbr).humanize(!withoutSuffix);
        },

        fromNow : function (withoutSuffix) {
            return this.from(moment(), withoutSuffix);
        },

        calendar : function () {
            // We want to compare the start of today, vs this.
            // Getting start-of-today depends on whether we're zone'd or not.
            var sod = makeAs(moment(), this).startOf('day'),
                diff = this.diff(sod, 'days', true),
                format = diff < -6 ? 'sameElse' :
                    diff < -1 ? 'lastWeek' :
                    diff < 0 ? 'lastDay' :
                    diff < 1 ? 'sameDay' :
                    diff < 2 ? 'nextDay' :
                    diff < 7 ? 'nextWeek' : 'sameElse';
            return this.format(this.lang().calendar(format, this));
        },

        isLeapYear : function () {
            return isLeapYear(this.year());
        },

        isDST : function () {
            return (this.zone() < this.clone().month(0).zone() ||
                this.zone() < this.clone().month(5).zone());
        },

        day : function (input) {
            var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
            if (input != null) {
                input = parseWeekday(input, this.lang());
                return this.add({ d : input - day });
            } else {
                return day;
            }
        },

        month : makeAccessor('Month', true),

        startOf: function (units) {
            units = normalizeUnits(units);
            // the following switch intentionally omits break keywords
            // to utilize falling through the cases.
            switch (units) {
            case 'year':
                this.month(0);
                /* falls through */
            case 'quarter':
            case 'month':
                this.date(1);
                /* falls through */
            case 'week':
            case 'isoWeek':
            case 'day':
                this.hours(0);
                /* falls through */
            case 'hour':
                this.minutes(0);
                /* falls through */
            case 'minute':
                this.seconds(0);
                /* falls through */
            case 'second':
                this.milliseconds(0);
                /* falls through */
            }

            // weeks are a special case
            if (units === 'week') {
                this.weekday(0);
            } else if (units === 'isoWeek') {
                this.isoWeekday(1);
            }

            // quarters are also special
            if (units === 'quarter') {
                this.month(Math.floor(this.month() / 3) * 3);
            }

            return this;
        },

        endOf: function (units) {
            units = normalizeUnits(units);
            return this.startOf(units).add((units === 'isoWeek' ? 'week' : units), 1).subtract('ms', 1);
        },

        isAfter: function (input, units) {
            units = typeof units !== 'undefined' ? units : 'millisecond';
            return +this.clone().startOf(units) > +moment(input).startOf(units);
        },

        isBefore: function (input, units) {
            units = typeof units !== 'undefined' ? units : 'millisecond';
            return +this.clone().startOf(units) < +moment(input).startOf(units);
        },

        isSame: function (input, units) {
            units = units || 'ms';
            return +this.clone().startOf(units) === +makeAs(input, this).startOf(units);
        },

        min: function (other) {
            other = moment.apply(null, arguments);
            return other < this ? this : other;
        },

        max: function (other) {
            other = moment.apply(null, arguments);
            return other > this ? this : other;
        },

        // keepTime = true means only change the timezone, without affecting
        // the local hour. So 5:31:26 +0300 --[zone(2, true)]--> 5:31:26 +0200
        // It is possible that 5:31:26 doesn't exist int zone +0200, so we
        // adjust the time as needed, to be valid.
        //
        // Keeping the time actually adds/subtracts (one hour)
        // from the actual represented time. That is why we call updateOffset
        // a second time. In case it wants us to change the offset again
        // _changeInProgress == true case, then we have to adjust, because
        // there is no such time in the given timezone.
        zone : function (input, keepTime) {
            var offset = this._offset || 0;
            if (input != null) {
                if (typeof input === "string") {
                    input = timezoneMinutesFromString(input);
                }
                if (Math.abs(input) < 16) {
                    input = input * 60;
                }
                this._offset = input;
                this._isUTC = true;
                if (offset !== input) {
                    if (!keepTime || this._changeInProgress) {
                        addOrSubtractDurationFromMoment(this,
                                moment.duration(offset - input, 'm'), 1, false);
                    } else if (!this._changeInProgress) {
                        this._changeInProgress = true;
                        moment.updateOffset(this, true);
                        this._changeInProgress = null;
                    }
                }
            } else {
                return this._isUTC ? offset : this._d.getTimezoneOffset();
            }
            return this;
        },

        zoneAbbr : function () {
            return this._isUTC ? "UTC" : "";
        },

        zoneName : function () {
            return this._isUTC ? "Coordinated Universal Time" : "";
        },

        parseZone : function () {
            if (this._tzm) {
                this.zone(this._tzm);
            } else if (typeof this._i === 'string') {
                this.zone(this._i);
            }
            return this;
        },

        hasAlignedHourOffset : function (input) {
            if (!input) {
                input = 0;
            }
            else {
                input = moment(input).zone();
            }

            return (this.zone() - input) % 60 === 0;
        },

        daysInMonth : function () {
            return daysInMonth(this.year(), this.month());
        },

        dayOfYear : function (input) {
            var dayOfYear = round((moment(this).startOf('day') - moment(this).startOf('year')) / 864e5) + 1;
            return input == null ? dayOfYear : this.add("d", (input - dayOfYear));
        },

        quarter : function (input) {
            return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
        },

        weekYear : function (input) {
            var year = weekOfYear(this, this.lang()._week.dow, this.lang()._week.doy).year;
            return input == null ? year : this.add("y", (input - year));
        },

        isoWeekYear : function (input) {
            var year = weekOfYear(this, 1, 4).year;
            return input == null ? year : this.add("y", (input - year));
        },

        week : function (input) {
            var week = this.lang().week(this);
            return input == null ? week : this.add("d", (input - week) * 7);
        },

        isoWeek : function (input) {
            var week = weekOfYear(this, 1, 4).week;
            return input == null ? week : this.add("d", (input - week) * 7);
        },

        weekday : function (input) {
            var weekday = (this.day() + 7 - this.lang()._week.dow) % 7;
            return input == null ? weekday : this.add("d", input - weekday);
        },

        isoWeekday : function (input) {
            // behaves the same as moment#day except
            // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
            // as a setter, sunday should belong to the previous week.
            return input == null ? this.day() || 7 : this.day(this.day() % 7 ? input : input - 7);
        },

        isoWeeksInYear : function () {
            return weeksInYear(this.year(), 1, 4);
        },

        weeksInYear : function () {
            var weekInfo = this._lang._week;
            return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units]();
        },

        set : function (units, value) {
            units = normalizeUnits(units);
            if (typeof this[units] === 'function') {
                this[units](value);
            }
            return this;
        },

        // If passed a language key, it will set the language for this
        // instance.  Otherwise, it will return the language configuration
        // variables for this instance.
        lang : function (key) {
            if (key === undefined) {
                return this._lang;
            } else {
                this._lang = getLangDefinition(key);
                return this;
            }
        }
    });

    function rawMonthSetter(mom, value) {
        var dayOfMonth;

        // TODO: Move this out of here!
        if (typeof value === 'string') {
            value = mom.lang().monthsParse(value);
            // TODO: Another silent failure?
            if (typeof value !== 'number') {
                return mom;
            }
        }

        dayOfMonth = Math.min(mom.date(),
                daysInMonth(mom.year(), value));
        mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
        return mom;
    }

    function rawGetter(mom, unit) {
        return mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]();
    }

    function rawSetter(mom, unit, value) {
        if (unit === 'Month') {
            return rawMonthSetter(mom, value);
        } else {
            return mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
        }
    }

    function makeAccessor(unit, keepTime) {
        return function (value) {
            if (value != null) {
                rawSetter(this, unit, value);
                moment.updateOffset(this, keepTime);
                return this;
            } else {
                return rawGetter(this, unit);
            }
        };
    }

    moment.fn.millisecond = moment.fn.milliseconds = makeAccessor('Milliseconds', false);
    moment.fn.second = moment.fn.seconds = makeAccessor('Seconds', false);
    moment.fn.minute = moment.fn.minutes = makeAccessor('Minutes', false);
    // Setting the hour should keep the time, because the user explicitly
    // specified which hour he wants. So trying to maintain the same hour (in
    // a new timezone) makes sense. Adding/subtracting hours does not follow
    // this rule.
    moment.fn.hour = moment.fn.hours = makeAccessor('Hours', true);
    // moment.fn.month is defined separately
    moment.fn.date = makeAccessor('Date', true);
    moment.fn.dates = deprecate("dates accessor is deprecated. Use date instead.", makeAccessor('Date', true));
    moment.fn.year = makeAccessor('FullYear', true);
    moment.fn.years = deprecate("years accessor is deprecated. Use year instead.", makeAccessor('FullYear', true));

    // add plural methods
    moment.fn.days = moment.fn.day;
    moment.fn.months = moment.fn.month;
    moment.fn.weeks = moment.fn.week;
    moment.fn.isoWeeks = moment.fn.isoWeek;
    moment.fn.quarters = moment.fn.quarter;

    // add aliased format methods
    moment.fn.toJSON = moment.fn.toISOString;

    /************************************
        Duration Prototype
    ************************************/


    extend(moment.duration.fn = Duration.prototype, {

        _bubble : function () {
            var milliseconds = this._milliseconds,
                days = this._days,
                months = this._months,
                data = this._data,
                seconds, minutes, hours, years;

            // The following code bubbles up values, see the tests for
            // examples of what that means.
            data.milliseconds = milliseconds % 1000;

            seconds = absRound(milliseconds / 1000);
            data.seconds = seconds % 60;

            minutes = absRound(seconds / 60);
            data.minutes = minutes % 60;

            hours = absRound(minutes / 60);
            data.hours = hours % 24;

            days += absRound(hours / 24);
            data.days = days % 30;

            months += absRound(days / 30);
            data.months = months % 12;

            years = absRound(months / 12);
            data.years = years;
        },

        weeks : function () {
            return absRound(this.days() / 7);
        },

        valueOf : function () {
            return this._milliseconds +
              this._days * 864e5 +
              (this._months % 12) * 2592e6 +
              toInt(this._months / 12) * 31536e6;
        },

        humanize : function (withSuffix) {
            var difference = +this,
                output = relativeTime(difference, !withSuffix, this.lang());

            if (withSuffix) {
                output = this.lang().pastFuture(difference, output);
            }

            return this.lang().postformat(output);
        },

        add : function (input, val) {
            // supports only 2.0-style add(1, 's') or add(moment)
            var dur = moment.duration(input, val);

            this._milliseconds += dur._milliseconds;
            this._days += dur._days;
            this._months += dur._months;

            this._bubble();

            return this;
        },

        subtract : function (input, val) {
            var dur = moment.duration(input, val);

            this._milliseconds -= dur._milliseconds;
            this._days -= dur._days;
            this._months -= dur._months;

            this._bubble();

            return this;
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units.toLowerCase() + 's']();
        },

        as : function (units) {
            units = normalizeUnits(units);
            return this['as' + units.charAt(0).toUpperCase() + units.slice(1) + 's']();
        },

        lang : moment.fn.lang,

        toIsoString : function () {
            // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
            var years = Math.abs(this.years()),
                months = Math.abs(this.months()),
                days = Math.abs(this.days()),
                hours = Math.abs(this.hours()),
                minutes = Math.abs(this.minutes()),
                seconds = Math.abs(this.seconds() + this.milliseconds() / 1000);

            if (!this.asSeconds()) {
                // this is the same as C#'s (Noda) and python (isodate)...
                // but not other JS (goog.date)
                return 'P0D';
            }

            return (this.asSeconds() < 0 ? '-' : '') +
                'P' +
                (years ? years + 'Y' : '') +
                (months ? months + 'M' : '') +
                (days ? days + 'D' : '') +
                ((hours || minutes || seconds) ? 'T' : '') +
                (hours ? hours + 'H' : '') +
                (minutes ? minutes + 'M' : '') +
                (seconds ? seconds + 'S' : '');
        }
    });

    function makeDurationGetter(name) {
        moment.duration.fn[name] = function () {
            return this._data[name];
        };
    }

    function makeDurationAsGetter(name, factor) {
        moment.duration.fn['as' + name] = function () {
            return +this / factor;
        };
    }

    for (i in unitMillisecondFactors) {
        if (unitMillisecondFactors.hasOwnProperty(i)) {
            makeDurationAsGetter(i, unitMillisecondFactors[i]);
            makeDurationGetter(i.toLowerCase());
        }
    }

    makeDurationAsGetter('Weeks', 6048e5);
    moment.duration.fn.asMonths = function () {
        return (+this - this.years() * 31536e6) / 2592e6 + this.years() * 12;
    };


    /************************************
        Default Lang
    ************************************/


    // Set default language, other languages will inherit from English.
    moment.lang('en', {
        ordinal : function (number) {
            var b = number % 10,
                output = (toInt(number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
            return number + output;
        }
    });

    /* EMBED_LANGUAGES */

    /************************************
        Exposing Moment
    ************************************/

    function makeGlobal(shouldDeprecate) {
        /*global ender:false */
        if (typeof ender !== 'undefined') {
            return;
        }
        oldGlobalMoment = globalScope.moment;
        if (shouldDeprecate) {
            globalScope.moment = deprecate(
                    "Accessing Moment through the global scope is " +
                    "deprecated, and will be removed in an upcoming " +
                    "release.",
                    moment);
        } else {
            globalScope.moment = moment;
        }
    }

    // CommonJS module is defined
    if (hasModule) {
        module.exports = moment;
    } else if (typeof define === "function" && define.amd) {
        define("moment", function (require, exports, module) {
            if (module.config && module.config() && module.config().noGlobal === true) {
                // release the global variable
                globalScope.moment = oldGlobalMoment;
            }

            return moment;
        });
        makeGlobal(true);
    } else {
        makeGlobal();
    }
}).call(this);

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],7:[function(require,module,exports){
var exports = module.exports = function() {
	var fn = arguments[0];	
	var args = [].concat.apply([],arguments).slice(1);
	return function() {
		if ((arguments.length + args.length) >= fn.length) {
			return fn.apply(fn, [].concat.apply(args,arguments));
		} else {	
			return exports(fn,[].concat.apply(args,arguments));
		}
	};
};

exports.rapply = function() {
	var fn = arguments[0];	
	var args = [].concat.apply([],arguments).slice(1);
	return function() {
		var right = [].concat.apply([],arguments);
		if ((arguments.length + args.length) >= fn.length) {
			return fn.apply(fn, [].concat.apply(right,args));
		} else {	
			return exports.rapply(fn,[].concat.apply(right,args));
		}
	};
};

},{}],8:[function(require,module,exports){
(function (global){
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.txt in the project root for license information.

;(function (factory) {
    var objectTypes = {
        'boolean': false,
        'function': true,
        'object': true,
        'number': false,
        'string': false,
        'undefined': false
    };

    var root = (objectTypes[typeof window] && window) || this,
        freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports,
        freeModule = objectTypes[typeof module] && module && !module.nodeType && module,
        moduleExports = freeModule && freeModule.exports === freeExports && freeExports,
        freeGlobal = objectTypes[typeof global] && global;
    
    if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
        root = freeGlobal;
    }

    // Because of build optimizers
    if (typeof define === 'function' && define.amd) {
        define(['rx', 'exports'], function (Rx, exports) {
            root.Rx = factory(root, exports, Rx);
            return root.Rx;
        });
    } else if (typeof module === 'object' && module && module.exports === freeExports) {
        module.exports = factory(root, module.exports, require('./rx'));
    } else {
        root.Rx = factory(root, {}, root.Rx);
    }
}.call(this, function (root, exp, Rx, undefined) {
    
  // References
  var Observable = Rx.Observable,
    observableProto = Observable.prototype,
    CompositeDisposable = Rx.CompositeDisposable,
    AnonymousObservable = Rx.AnonymousObservable,
    isEqual = Rx.internals.isEqual,
    helpers = Rx.helpers,
    defaultComparer = helpers.defaultComparer,
    identity = helpers.identity,
    subComparer = helpers.defaultSubComparer,
    isPromise = helpers.isPromise,
    observableFromPromise = Observable.fromPromise;

  // Defaults
  var argumentOutOfRange = 'Argument out of range',
      sequenceContainsNoElements = "Sequence contains no elements.";
  
    function extremaBy(source, keySelector, comparer) {
        return new AnonymousObservable(function (observer) {
            var hasValue = false, lastKey = null, list = [];
            return source.subscribe(function (x) {
                var comparison, key;
                try {
                    key = keySelector(x);
                } catch (ex) {
                    observer.onError(ex);
                    return;
                }
                comparison = 0;
                if (!hasValue) {
                    hasValue = true;
                    lastKey = key;
                } else {
                    try {
                        comparison = comparer(key, lastKey);
                    } catch (ex1) {
                        observer.onError(ex1);
                        return;
                    }
                }
                if (comparison > 0) {
                    lastKey = key;
                    list = [];
                }
                if (comparison >= 0) {
                    list.push(x);
                }
            }, observer.onError.bind(observer), function () {
                observer.onNext(list);
                observer.onCompleted();
            });
        });
    }

    function firstOnly(x) {
        if (x.length === 0) {
            throw new Error(sequenceContainsNoElements);
        }
        return x[0];
    }

    /**
     * Applies an accumulator function over an observable sequence, returning the result of the aggregation as a single element in the result sequence. The specified seed value is used as the initial accumulator value.
     * For aggregation behavior with incremental intermediate results, see Observable.scan.
     * @example
     * 1 - res = source.aggregate(function (acc, x) { return acc + x; });
     * 2 - res = source.aggregate(0, function (acc, x) { return acc + x; });
     * @param {Mixed} [seed] The initial accumulator value.
     * @param {Function} accumulator An accumulator function to be invoked on each element.
     * @returns {Observable} An observable sequence containing a single element with the final accumulator value.
     */
    observableProto.aggregate = function () {
        var seed, hasSeed, accumulator;
        if (arguments.length === 2) {
            seed = arguments[0];
            hasSeed = true;
            accumulator = arguments[1];
        } else {
            accumulator = arguments[0];
        }
        return hasSeed ? this.scan(seed, accumulator).startWith(seed).finalValue() : this.scan(accumulator).finalValue();
    };

    /**
     * Applies an accumulator function over an observable sequence, returning the result of the aggregation as a single element in the result sequence. The specified seed value is used as the initial accumulator value.
     * For aggregation behavior with incremental intermediate results, see Observable.scan.
     * @example
     * 1 - res = source.reduce(function (acc, x) { return acc + x; });
     * 2 - res = source.reduce(function (acc, x) { return acc + x; }, 0);
     * @param {Function} accumulator An accumulator function to be invoked on each element.
     * @param {Any} [seed] The initial accumulator value.     
     * @returns {Observable} An observable sequence containing a single element with the final accumulator value.
     */
    observableProto.reduce = function (accumulator) {
        var seed, hasSeed;
        if (arguments.length === 2) {
            hasSeed = true;
            seed = arguments[1];
        } 
        return hasSeed ? this.scan(seed, accumulator).startWith(seed).finalValue() : this.scan(accumulator).finalValue();
    };

    /**
     * Determines whether any element of an observable sequence satisfies a condition if present, else if any items are in the sequence.
     * @example
     * var result = source.any();
     * var result = source.any(function (x) { return x > 3; });
     * @param {Function} [predicate] A function to test each element for a condition.
     * @returns {Observable} An observable sequence containing a single element determining whether any elements in the source sequence pass the test in the specified predicate if given, else if any items are in the sequence.
     */
    observableProto.some = observableProto.any = function (predicate, thisArg) {
        var source = this;
        return predicate ? 
            source.where(predicate, thisArg).any() : 
            new AnonymousObservable(function (observer) {
                return source.subscribe(function () {
                    observer.onNext(true);
                    observer.onCompleted();
                }, observer.onError.bind(observer), function () {
                    observer.onNext(false);
                    observer.onCompleted();
                });
            });
    };

    /**
     * Determines whether an observable sequence is empty.
     *
     * @memberOf Observable#
     * @returns {Observable} An observable sequence containing a single element determining whether the source sequence is empty.
     */
    observableProto.isEmpty = function () {
        return this.any().select(function (b) { return !b; });
    };

    /**
     * Determines whether all elements of an observable sequence satisfy a condition.
     * 
     * 1 - res = source.all(function (value) { return value.length > 3; });
     * @memberOf Observable#
     * @param {Function} [predicate] A function to test each element for a condition.
     * @param {Any} [thisArg] Object to use as this when executing callback.
     * @returns {Observable} An observable sequence containing a single element determining whether all elements in the source sequence pass the test in the specified predicate.
     */
    observableProto.every = observableProto.all = function (predicate, thisArg) {
        return this.where(function (v) {
            return !predicate(v);
        }, thisArg).any().select(function (b) {
            return !b;
        });
    };

    /**
     * Determines whether an observable sequence contains a specified element with an optional equality comparer.
     * @example
     * 1 - res = source.contains(42);
     * 2 - res = source.contains({ value: 42 }, function (x, y) { return x.value === y.value; });
     * @param value The value to locate in the source sequence.
     * @param {Function} [comparer] An equality comparer to compare elements.
     * @returns {Observable} An observable sequence containing a single element determining whether the source sequence contains an element that has the specified value.
     */
    observableProto.contains = function (value, comparer) {
        comparer || (comparer = defaultComparer);
        return this.where(function (v) {
            return comparer(v, value);
        }).any();
    };

    /**
     * Returns an observable sequence containing a value that represents how many elements in the specified observable sequence satisfy a condition if provided, else the count of items.
     * @example
     * res = source.count();
     * res = source.count(function (x) { return x > 3; });
     * @param {Function} [predicate]A function to test each element for a condition.
     * @param {Any} [thisArg] Object to use as this when executing callback.        
     * @returns {Observable} An observable sequence containing a single element with a number that represents how many elements in the input sequence satisfy the condition in the predicate function if provided, else the count of items in the sequence.
     */
    observableProto.count = function (predicate, thisArg) {
        return predicate ?
            this.where(predicate, thisArg).count() :
            this.aggregate(0, function (count) {
                return count + 1;
            });
    };

    /**
     * Computes the sum of a sequence of values that are obtained by invoking an optional transform function on each element of the input sequence, else if not specified computes the sum on each item in the sequence.
     * @example
     * var res = source.sum();
     * var res = source.sum(function (x) { return x.value; });
     * @param {Function} [selector] A transform function to apply to each element.
     * @param {Any} [thisArg] Object to use as this when executing callback.        
     * @returns {Observable} An observable sequence containing a single element with the sum of the values in the source sequence.
     */    
    observableProto.sum = function (keySelector, thisArg) {
        return keySelector ? 
            this.select(keySelector, thisArg).sum() :
            this.aggregate(0, function (prev, curr) {
                return prev + curr;
            });
    };

    /**
     * Returns the elements in an observable sequence with the minimum key value according to the specified comparer.
     * @example
     * var res = source.minBy(function (x) { return x.value; });
     * var res = source.minBy(function (x) { return x.value; }, function (x, y) { return x - y; });
     * @param {Function} keySelector Key selector function.
     * @param {Function} [comparer] Comparer used to compare key values.
     * @returns {Observable} An observable sequence containing a list of zero or more elements that have a minimum key value.
     */  
    observableProto.minBy = function (keySelector, comparer) {
        comparer || (comparer = subComparer);
        return extremaBy(this, keySelector, function (x, y) {
            return comparer(x, y) * -1;
        });
    };

    /**
     * Returns the minimum element in an observable sequence according to the optional comparer else a default greater than less than check.
     * @example
     * var res = source.min();
     * var res = source.min(function (x, y) { return x.value - y.value; });
     * @param {Function} [comparer] Comparer used to compare elements.
     * @returns {Observable} An observable sequence containing a single element with the minimum element in the source sequence.
     */
    observableProto.min = function (comparer) {
        return this.minBy(identity, comparer).select(function (x) {
            return firstOnly(x);
        });
    };

    /**
     * Returns the elements in an observable sequence with the maximum  key value according to the specified comparer.
     * @example
     * var res = source.maxBy(function (x) { return x.value; });
     * var res = source.maxBy(function (x) { return x.value; }, function (x, y) { return x - y;; });
     * @param {Function} keySelector Key selector function.
     * @param {Function} [comparer]  Comparer used to compare key values.
     * @returns {Observable} An observable sequence containing a list of zero or more elements that have a maximum key value.
     */
    observableProto.maxBy = function (keySelector, comparer) {
        comparer || (comparer = subComparer);
        return extremaBy(this, keySelector, comparer);
    };

    /**
     * Returns the maximum value in an observable sequence according to the specified comparer.
     * @example
     * var res = source.max();
     * var res = source.max(function (x, y) { return x.value - y.value; });
     * @param {Function} [comparer] Comparer used to compare elements.
     * @returns {Observable} An observable sequence containing a single element with the maximum element in the source sequence.
     */
    observableProto.max = function (comparer) {
        return this.maxBy(identity, comparer).select(function (x) {
            return firstOnly(x);
        });
    };

    /**
     * Computes the average of an observable sequence of values that are in the sequence or obtained by invoking a transform function on each element of the input sequence if present.
     * @example
     * var res = res = source.average();
     * var res = res = source.average(function (x) { return x.value; });
     * @param {Function} [selector] A transform function to apply to each element.
     * @param {Any} [thisArg] Object to use as this when executing callback.        
     * @returns {Observable} An observable sequence containing a single element with the average of the sequence of values.
     */
    observableProto.average = function (keySelector, thisArg) {
        return keySelector ?
            this.select(keySelector, thisArg).average() :
            this.scan({
                sum: 0,
                count: 0
            }, function (prev, cur) {
                return {
                    sum: prev.sum + cur,
                    count: prev.count + 1
                };
            }).finalValue().select(function (s) {
                if (s.count === 0) {
                    throw new Error('The input sequence was empty');
                }
                return s.sum / s.count;
            });
    };

  function sequenceEqualArray(first, second, comparer) {
      return new AnonymousObservable(function (observer) {
        var count = 0, len = second.length;
        return first.subscribe(function (value) {
          var equal = false;
          try {
            if (count < len) {
              equal = comparer(value, second[count++]);
            }
          } catch (e) {
            observer.onError(e);
            return;
          }
          if (!equal) {
            observer.onNext(false);
            observer.onCompleted();
          }
        }, observer.onError.bind(observer), function () {
          observer.onNext(count === len);
          observer.onCompleted();
        });
      });
  }

  /**
   *  Determines whether two sequences are equal by comparing the elements pairwise using a specified equality comparer.
   * 
   * @example
   * var res = res = source.sequenceEqual([1,2,3]);
   * var res = res = source.sequenceEqual([{ value: 42 }], function (x, y) { return x.value === y.value; });
   * 3 - res = source.sequenceEqual(Rx.Observable.returnValue(42));
   * 4 - res = source.sequenceEqual(Rx.Observable.returnValue({ value: 42 }), function (x, y) { return x.value === y.value; });
   * @param {Observable} second Second observable sequence or array to compare.
   * @param {Function} [comparer] Comparer used to compare elements of both sequences.
   * @returns {Observable} An observable sequence that contains a single element which indicates whether both sequences are of equal length and their corresponding elements are equal according to the specified equality comparer.
   */
  observableProto.sequenceEqual = function (second, comparer) {
    var first = this;
    comparer || (comparer = defaultComparer);
    if (Array.isArray(second)) {
      return sequenceEqualArray(first, second, comparer);
    }
    return new AnonymousObservable(function (observer) {
      var donel = false, doner = false, ql = [], qr = [];
      var subscription1 = first.subscribe(function (x) {
        var equal, v;
        if (qr.length > 0) {
            v = qr.shift();
            try {
              equal = comparer(v, x);
            } catch (e) {
              observer.onError(e);
              return;
            }
            if (!equal) {
              observer.onNext(false);
              observer.onCompleted();
            }
        } else if (doner) {
          observer.onNext(false);
          observer.onCompleted();
        } else {
          ql.push(x);
        }
      }, observer.onError.bind(observer), function () {
        donel = true;
        if (ql.length === 0) {
          if (qr.length > 0) {
            observer.onNext(false);
            observer.onCompleted();
          } else if (doner) {
            observer.onNext(true);
            observer.onCompleted();
          }
        }
      });

      isPromise(second) && (second = observableFromPromise(second));
      var subscription2 = second.subscribe(function (x) {
        var equal, v;
        if (ql.length > 0) {
          v = ql.shift();
          try {
            equal = comparer(v, x);
          } catch (exception) {
            observer.onError(exception);
            return;
          }
          if (!equal) {
            observer.onNext(false);
            observer.onCompleted();
          }
        } else if (donel) {
          observer.onNext(false);
          observer.onCompleted();
        } else {
          qr.push(x);
        }
      }, observer.onError.bind(observer), function () {
        doner = true;
        if (qr.length === 0) {
          if (ql.length > 0) {
            observer.onNext(false);
            observer.onCompleted();
          } else if (donel) {
            observer.onNext(true);
            observer.onCompleted();
          }
        }
      });
      return new CompositeDisposable(subscription1, subscription2);
    });
  };

    function elementAtOrDefault(source, index, hasDefault, defaultValue) {
        if (index < 0) {
            throw new Error(argumentOutOfRange);
        }
        return new AnonymousObservable(function (observer) {
            var i = index;
            return source.subscribe(function (x) {
                if (i === 0) {
                    observer.onNext(x);
                    observer.onCompleted();
                }
                i--;
            }, observer.onError.bind(observer), function () {
                if (!hasDefault) {
                    observer.onError(new Error(argumentOutOfRange));
                } else {
                    observer.onNext(defaultValue);
                    observer.onCompleted();
                }
            });
        });
    }

    /**
     * Returns the element at a specified index in a sequence.
     * @example
     * var res = source.elementAt(5);
     * @param {Number} index The zero-based index of the element to retrieve.
     * @returns {Observable} An observable sequence that produces the element at the specified position in the source sequence.
     */
    observableProto.elementAt =  function (index) {
        return elementAtOrDefault(this, index, false);
    };

    /**
     * Returns the element at a specified index in a sequence or a default value if the index is out of range.
     * @example
     * var res = source.elementAtOrDefault(5);
     * var res = source.elementAtOrDefault(5, 0);
     * @param {Number} index The zero-based index of the element to retrieve.
     * @param [defaultValue] The default value if the index is outside the bounds of the source sequence.
     * @returns {Observable} An observable sequence that produces the element at the specified position in the source sequence, or a default value if the index is outside the bounds of the source sequence.
     */    
    observableProto.elementAtOrDefault = function (index, defaultValue) {
        return elementAtOrDefault(this, index, true, defaultValue);
    };

    function singleOrDefaultAsync(source, hasDefault, defaultValue) {
        return new AnonymousObservable(function (observer) {
            var value = defaultValue, seenValue = false;
            return source.subscribe(function (x) {
                if (seenValue) {
                    observer.onError(new Error('Sequence contains more than one element'));
                } else {
                    value = x;
                    seenValue = true;
                }
            }, observer.onError.bind(observer), function () {
                if (!seenValue && !hasDefault) {
                    observer.onError(new Error(sequenceContainsNoElements));
                } else {
                    observer.onNext(value);
                    observer.onCompleted();
                }
            });
        });
    }

    /**
     * Returns the only element of an observable sequence that satisfies the condition in the optional predicate, and reports an exception if there is not exactly one element in the observable sequence.
     * @example
     * var res = res = source.single();
     * var res = res = source.single(function (x) { return x === 42; });
     * @param {Function} [predicate] A predicate function to evaluate for elements in the source sequence.
     * @param {Any} [thisArg] Object to use as `this` when executing the predicate.        
     * @returns {Observable} Sequence containing the single element in the observable sequence that satisfies the condition in the predicate.
     */
    observableProto.single = function (predicate, thisArg) {
        return predicate ?
            this.where(predicate, thisArg).single() :
            singleOrDefaultAsync(this, false);
    };

    /**
     * Returns the only element of an observable sequence that matches the predicate, or a default value if no such element exists; this method reports an exception if there is more than one element in the observable sequence.
     * @example
     * var res = res = source.singleOrDefault();
     * var res = res = source.singleOrDefault(function (x) { return x === 42; });
     * res = source.singleOrDefault(function (x) { return x === 42; }, 0);
     * res = source.singleOrDefault(null, 0);
     * @memberOf Observable#
     * @param {Function} predicate A predicate function to evaluate for elements in the source sequence.
     * @param [defaultValue] The default value if the index is outside the bounds of the source sequence.
     * @param {Any} [thisArg] Object to use as `this` when executing the predicate.        
     * @returns {Observable} Sequence containing the single element in the observable sequence that satisfies the condition in the predicate, or a default value if no such element exists.
     */
    observableProto.singleOrDefault = function (predicate, defaultValue, thisArg) {
        return predicate?
            this.where(predicate, thisArg).singleOrDefault(null, defaultValue) :
            singleOrDefaultAsync(this, true, defaultValue)
    };
    function firstOrDefaultAsync(source, hasDefault, defaultValue) {
        return new AnonymousObservable(function (observer) {
            return source.subscribe(function (x) {
                observer.onNext(x);
                observer.onCompleted();
            }, observer.onError.bind(observer), function () {
                if (!hasDefault) {
                    observer.onError(new Error(sequenceContainsNoElements));
                } else {
                    observer.onNext(defaultValue);
                    observer.onCompleted();
                }
            });
        });
    }

    /**
     * Returns the first element of an observable sequence that satisfies the condition in the predicate if present else the first item in the sequence.
     * @example
     * var res = res = source.first();
     * var res = res = source.first(function (x) { return x > 3; });
     * @param {Function} [predicate] A predicate function to evaluate for elements in the source sequence.
     * @param {Any} [thisArg] Object to use as `this` when executing the predicate.     
     * @returns {Observable} Sequence containing the first element in the observable sequence that satisfies the condition in the predicate if provided, else the first item in the sequence.
     */    
    observableProto.first = function (predicate, thisArg) {
        return predicate ?
            this.where(predicate, thisArg).first() :
            firstOrDefaultAsync(this, false);
    };

    /**
     * Returns the first element of an observable sequence that satisfies the condition in the predicate, or a default value if no such element exists.
     * @example     
     * var res = res = source.firstOrDefault();
     * var res = res = source.firstOrDefault(function (x) { return x > 3; });
     * var res = source.firstOrDefault(function (x) { return x > 3; }, 0);
     * var res = source.firstOrDefault(null, 0);
     * @param {Function} [predicate] A predicate function to evaluate for elements in the source sequence. 
     * @param {Any} [defaultValue] The default value if no such element exists.  If not specified, defaults to null.
     * @param {Any} [thisArg] Object to use as `this` when executing the predicate.
     * @returns {Observable} Sequence containing the first element in the observable sequence that satisfies the condition in the predicate, or a default value if no such element exists.
     */
    observableProto.firstOrDefault = function (predicate, defaultValue, thisArg) {
        return predicate ?
            this.where(predicate).firstOrDefault(null, defaultValue) :
            firstOrDefaultAsync(this, true, defaultValue);
    };

    function lastOrDefaultAsync(source, hasDefault, defaultValue) {
        return new AnonymousObservable(function (observer) {
            var value = defaultValue, seenValue = false;
            return source.subscribe(function (x) {
                value = x;
                seenValue = true;
            }, observer.onError.bind(observer), function () {
                if (!seenValue && !hasDefault) {
                    observer.onError(new Error(sequenceContainsNoElements));
                } else {
                    observer.onNext(value);
                    observer.onCompleted();
                }
            });
        });
    }

    /**
     * Returns the last element of an observable sequence that satisfies the condition in the predicate if specified, else the last element.
     * @example
     * var res = source.last();
     * var res = source.last(function (x) { return x > 3; });
     * @param {Function} [predicate] A predicate function to evaluate for elements in the source sequence.
     * @param {Any} [thisArg] Object to use as `this` when executing the predicate.     
     * @returns {Observable} Sequence containing the last element in the observable sequence that satisfies the condition in the predicate.
     */
    observableProto.last = function (predicate, thisArg) {
        return predicate ?
            this.where(predicate, thisArg).last() :
            lastOrDefaultAsync(this, false);
    };

    /**
     * Returns the last element of an observable sequence that satisfies the condition in the predicate, or a default value if no such element exists.
     * @example
     * var res = source.lastOrDefault();
     * var res = source.lastOrDefault(function (x) { return x > 3; });
     * var res = source.lastOrDefault(function (x) { return x > 3; }, 0);
     * var res = source.lastOrDefault(null, 0);
     * @param {Function} [predicate] A predicate function to evaluate for elements in the source sequence.
     * @param [defaultValue] The default value if no such element exists.  If not specified, defaults to null.
     * @param {Any} [thisArg] Object to use as `this` when executing the predicate.     
     * @returns {Observable} Sequence containing the last element in the observable sequence that satisfies the condition in the predicate, or a default value if no such element exists.
     */
    observableProto.lastOrDefault = function (predicate, defaultValue, thisArg) {
        return predicate ? 
            this.where(predicate, thisArg).lastOrDefault(null, defaultValue) :
            lastOrDefaultAsync(this, true, defaultValue);
    };

    function findValue (source, predicate, thisArg, yieldIndex) {
        return new AnonymousObservable(function (observer) {
            var i = 0;
            return source.subscribe(function (x) {
                var shouldRun;
                try {
                    shouldRun = predicate.call(thisArg, x, i, source);
                } catch(e) {
                    observer.onError(e);
                    return;
                }
                if (shouldRun) {
                    observer.onNext(yieldIndex ? i : x);
                    observer.onCompleted();
                } else {
                    i++;
                }
            }, observer.onError.bind(observer), function () {
                observer.onNext(yieldIndex ? -1 : undefined);
                observer.onCompleted();
            });
        });        
    }

    /**
     * Searches for an element that matches the conditions defined by the specified predicate, and returns the first occurrence within the entire Observable sequence.
     * @param {Function} predicate The predicate that defines the conditions of the element to search for.
     * @param {Any} [thisArg] Object to use as `this` when executing the predicate.          
     * @returns {Observable} An Observable sequence with the first element that matches the conditions defined by the specified predicate, if found; otherwise, undefined.
     */
    observableProto.find = function (predicate, thisArg) {
        return findValue(this, predicate, thisArg, false);
    };

    /**
     * Searches for an element that matches the conditions defined by the specified predicate, and returns 
     * an Observable sequence with the zero-based index of the first occurrence within the entire Observable sequence. 
     * @param {Function} predicate The predicate that defines the conditions of the element to search for.
     * @param {Any} [thisArg] Object to use as `this` when executing the predicate.          
     * @returns {Observable} An Observable sequence with the zero-based index of the first occurrence of an element that matches the conditions defined by match, if found; otherwise, –1.
    */
    observableProto.findIndex = function (predicate, thisArg) {
        return findValue(this, predicate, thisArg, true);
    };

    return Rx;
}));
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./rx":15}],9:[function(require,module,exports){
(function (global){
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.txt in the project root for license information.

;(function (factory) {
    var objectTypes = {
        'boolean': false,
        'function': true,
        'object': true,
        'number': false,
        'string': false,
        'undefined': false
    };

    var root = (objectTypes[typeof window] && window) || this,
        freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports,
        freeModule = objectTypes[typeof module] && module && !module.nodeType && module,
        moduleExports = freeModule && freeModule.exports === freeExports && freeExports,
        freeGlobal = objectTypes[typeof global] && global;
    
    if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
        root = freeGlobal;
    }

    // Because of build optimizers
    if (typeof define === 'function' && define.amd) {
        define(['rx.binding', 'exports'], function (Rx, exports) {
            root.Rx = factory(root, exports, Rx);
            return root.Rx;
        });
    } else if (typeof module === 'object' && module && module.exports === freeExports) {
        module.exports = factory(root, module.exports, require('./rx'));
    } else {
        root.Rx = factory(root, {}, root.Rx);
    }
}.call(this, function (root, exp, Rx, undefined) {
    
    // Aliases
    var Observable = Rx.Observable,
    	observableProto = Observable.prototype,
      observableFromPromise = Observable.fromPromise,
      observableThrow = Observable.throwException,
      AnonymousObservable = Rx.AnonymousObservable,
      AsyncSubject = Rx.AsyncSubject,
      disposableCreate = Rx.Disposable.create,
      CompositeDisposable= Rx.CompositeDisposable,
      immediateScheduler = Rx.Scheduler.immediate,
      timeoutScheduler = Rx.Scheduler.timeout,
      slice = Array.prototype.slice;

    /**
     * Invokes the specified function asynchronously on the specified scheduler, surfacing the result through an observable sequence.
     * 
     * @example
     * var res = Rx.Observable.start(function () { console.log('hello'); });
     * var res = Rx.Observable.start(function () { console.log('hello'); }, Rx.Scheduler.timeout);
     * var res = Rx.Observable.start(function () { this.log('hello'); }, Rx.Scheduler.timeout, console);
     * 
     * @param {Function} func Function to run asynchronously.
     * @param {Scheduler} [scheduler]  Scheduler to run the function on. If not specified, defaults to Scheduler.timeout.
     * @param [context]  The context for the func parameter to be executed.  If not specified, defaults to undefined.
     * @returns {Observable} An observable sequence exposing the function's result value, or an exception.
     * 
     * Remarks
     * * The function is called immediately, not during the subscription of the resulting sequence.
     * * Multiple subscriptions to the resulting sequence can observe the function's result.  
     */
    Observable.start = function (func, scheduler, context) {
        return observableToAsync(func, scheduler, context)();
    };

    /**
     * Converts the function into an asynchronous function. Each invocation of the resulting asynchronous function causes an invocation of the original synchronous function on the specified scheduler.
     * 
     * @example
     * var res = Rx.Observable.toAsync(function (x, y) { return x + y; })(4, 3);
     * var res = Rx.Observable.toAsync(function (x, y) { return x + y; }, Rx.Scheduler.timeout)(4, 3);
     * var res = Rx.Observable.toAsync(function (x) { this.log(x); }, Rx.Scheduler.timeout, console)('hello');
     * 
     * @param {Function} function Function to convert to an asynchronous function.
     * @param {Scheduler} [scheduler] Scheduler to run the function on. If not specified, defaults to Scheduler.timeout.
     * @param {Mixed} [context] The context for the func parameter to be executed.  If not specified, defaults to undefined.
     * @returns {Function} Asynchronous function.
     */
    var observableToAsync = Observable.toAsync = function (func, scheduler, context) {
        scheduler || (scheduler = timeoutScheduler);
        return function () {
            var args = arguments, 
                subject = new AsyncSubject();

            scheduler.schedule(function () {
                var result;
                try {
                    result = func.apply(context, args);
                } catch (e) {
                    subject.onError(e);
                    return;
                }
                subject.onNext(result);
                subject.onCompleted();
            });
            return subject.asObservable();
        };
    };

    /**
     * Converts a callback function to an observable sequence. 
     * 
     * @param {Function} function Function with a callback as the last parameter to convert to an Observable sequence.
     * @param {Scheduler} [scheduler] Scheduler to run the function on. If not specified, defaults to Scheduler.timeout.
     * @param {Mixed} [context] The context for the func parameter to be executed.  If not specified, defaults to undefined.
     * @param {Function} [selector] A selector which takes the arguments from the callback to produce a single item to yield on next.
     * @returns {Function} A function, when executed with the required parameters minus the callback, produces an Observable sequence with a single value of the arguments to the callback as an array.
     */
    Observable.fromCallback = function (func, scheduler, context, selector) {
        scheduler || (scheduler = immediateScheduler);
        return function () {
            var args = slice.call(arguments, 0);

            return new AnonymousObservable(function (observer) {
                return scheduler.schedule(function () {
                    function handler(e) {
                        var results = e;
                        
                        if (selector) {
                            try {
                                results = selector(arguments);
                            } catch (err) {
                                observer.onError(err);
                                return;
                            }
                        } else {
                            if (results.length === 1) {
                                results = results[0];
                            }
                        }

                        observer.onNext(results);
                        observer.onCompleted();
                    }

                    args.push(handler);
                    func.apply(context, args);
                });
            });
        };
    };

    /**
     * Converts a Node.js callback style function to an observable sequence.  This must be in function (err, ...) format.
     * @param {Function} func The function to call
     * @param {Scheduler} [scheduler] Scheduler to run the function on. If not specified, defaults to Scheduler.timeout.
     * @param {Mixed} [context] The context for the func parameter to be executed.  If not specified, defaults to undefined.
     * @param {Function} [selector] A selector which takes the arguments from the callback minus the error to produce a single item to yield on next.     
     * @returns {Function} An async function which when applied, returns an observable sequence with the callback arguments as an array.
     */
    Observable.fromNodeCallback = function (func, scheduler, context, selector) {
        scheduler || (scheduler = immediateScheduler);
        return function () {
            var args = slice.call(arguments, 0);

            return new AnonymousObservable(function (observer) {
                return scheduler.schedule(function () {
                    
                    function handler(err) {
                        if (err) {
                            observer.onError(err);
                            return;
                        }

                        var results = slice.call(arguments, 1);
                        
                        if (selector) {
                            try {
                                results = selector(results);
                            } catch (e) {
                                observer.onError(e);
                                return;
                            }
                        } else {
                            if (results.length === 1) {
                                results = results[0];
                            }
                        }

                        observer.onNext(results);
                        observer.onCompleted();
                    }

                    args.push(handler);
                    func.apply(context, args);
                });
            });
        };
    };

  function createListener (element, name, handler) {
    // Node.js specific
    if (element.addListener) {
      element.addListener(name, handler);
      return disposableCreate(function () {
        element.removeListener(name, handler);
      });
    } 
    if (element.addEventListener) {
      element.addEventListener(name, handler, false);
      return disposableCreate(function () {
        element.removeEventListener(name, handler, false);
      });
    }
    throw new Error('No listener found');
  }

  function createEventListener (el, eventName, handler) {
    var disposables = new CompositeDisposable();

    // Asume NodeList
    if (typeof el.item === 'function' && typeof el.length === 'number') {
      for (var i = 0, len = el.length; i < len; i++) {
        disposables.add(createEventListener(el.item(i), eventName, handler));
      }
    } else if (el) {
      disposables.add(createListener(el, eventName, handler));
    }

    return disposables;
  }

  // Check for Angular/jQuery/Zepto support
  var jq =
   !!root.angular && !!angular.element ? angular.element :
   (!!root.jQuery ? root.jQuery : (
     !!root.Zepto ? root.Zepto : null));

  // Check for ember
  var ember = !!root.Ember && typeof root.Ember.addListener === 'function';

  /**
   * Creates an observable sequence by adding an event listener to the matching DOMElement or each item in the NodeList.
   *
   * @example
   *   var source = Rx.Observable.fromEvent(element, 'mouseup');
   * 
   * @param {Object} element The DOMElement or NodeList to attach a listener.
   * @param {String} eventName The event name to attach the observable sequence.
   * @param {Function} [selector] A selector which takes the arguments from the event handler to produce a single item to yield on next.     
   * @returns {Observable} An observable sequence of events from the specified element and the specified event.
   */
  Observable.fromEvent = function (element, eventName, selector) {
    if (ember) {
      return fromEventPattern(
        function (h) { Ember.addListener(element, eventName); },
        function (h) { Ember.removeListener(element, eventName); },
        selector);
    }    
    if (jq) {
      var $elem = jq(element);
      return fromEventPattern(
        function (h) { $elem.on(eventName, h); },
        function (h) { $elem.off(eventName, h); },
        selector);
    }
    return new AnonymousObservable(function (observer) {
      return createEventListener(
        element, 
        eventName, 
        function handler (e) { 
          var results = e;

          if (selector) {
            try {
              results = selector(arguments);
            } catch (err) {
              observer.onError(err);
              return
            }
          }

          observer.onNext(results); 
        });
    }).publish().refCount();
  };
  /**
   * Creates an observable sequence from an event emitter via an addHandler/removeHandler pair.
   * @param {Function} addHandler The function to add a handler to the emitter.
   * @param {Function} [removeHandler] The optional function to remove a handler from an emitter.
   * @param {Function} [selector] A selector which takes the arguments from the event handler to produce a single item to yield on next.
   * @returns {Observable} An observable sequence which wraps an event from an event emitter
   */
  var fromEventPattern = Observable.fromEventPattern = function (addHandler, removeHandler, selector) {
    return new AnonymousObservable(function (observer) {
      function innerHandler (e) {
        var result = e;
        if (selector) {
          try {
            result = selector(arguments);
          } catch (err) {
            observer.onError(err);
            return;
          }
        }
        observer.onNext(result);
      }

      var returnValue = addHandler(innerHandler);
      return disposableCreate(function () {
        if (removeHandler) {
          removeHandler(innerHandler, returnValue);
        }
      });
    }).publish().refCount();
  };

  /**
   * Invokes the asynchronous function, surfacing the result through an observable sequence.
   * @param {Function} functionAsync Asynchronous function which returns a Promise to run.
   * @returns {Observable} An observable sequence exposing the function's result value, or an exception.
   */
  Observable.startAsync = function (functionAsync) {
    var promise;
    try {
      promise = functionAsync();
    } catch (e) {
      return observableThrow(e);
    }
    return observableFromPromise(promise);
  }

    return Rx;
}));
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./rx":15}],10:[function(require,module,exports){
(function (global){
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.txt in the project root for license information.

;(function (factory) {
    var objectTypes = {
        'boolean': false,
        'function': true,
        'object': true,
        'number': false,
        'string': false,
        'undefined': false
    };

    var root = (objectTypes[typeof window] && window) || this,
        freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports,
        freeModule = objectTypes[typeof module] && module && !module.nodeType && module,
        moduleExports = freeModule && freeModule.exports === freeExports && freeExports,
        freeGlobal = objectTypes[typeof global] && global;
    
    if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
        root = freeGlobal;
    }

    // Because of build optimizers
    if (typeof define === 'function' && define.amd) {
        define(['rx', 'exports'], function (Rx, exports) {
            root.Rx = factory(root, exports, Rx);
            return root.Rx;
        });
    } else if (typeof module === 'object' && module && module.exports === freeExports) {
        module.exports = factory(root, module.exports, require('./rx'));
    } else {
        root.Rx = factory(root, {}, root.Rx);
    }
}.call(this, function (root, exp, Rx, undefined) {
    
  // References
  var Observable = Rx.Observable,
    observableProto = Observable.prototype,
    AnonymousObservable = Rx.AnonymousObservable,
    CompositeDisposable = Rx.CompositeDisposable,
    Subject = Rx.Subject,
    Observer = Rx.Observer,
    disposableEmpty = Rx.Disposable.empty,
    disposableCreate = Rx.Disposable.create,
    inherits = Rx.internals.inherits,
    addProperties = Rx.internals.addProperties,  
    timeoutScheduler = Rx.Scheduler.timeout,
    identity = Rx.helpers.identity;

  var objectDisposed = 'Object has been disposed';
  function checkDisposed() { if (this.isDisposed) { throw new Error(objectDisposed); } }

  var PausableObservable = (function (_super) {

    inherits(PausableObservable, _super);

    function subscribe(observer) {
      var conn = this.source.publish(),
        subscription = conn.subscribe(observer),
        connection = disposableEmpty;

      var pausable = this.subject.distinctUntilChanged().subscribe(function (b) {
        if (b) {
          connection = conn.connect();
        } else {
          connection.dispose();
          connection = disposableEmpty;
        }
      });

      return new CompositeDisposable(subscription, connection, pausable);
    }

    function PausableObservable(source, subject) {
      this.source = source;
      this.subject = subject || new Subject();
      this.isPaused = true;
      _super.call(this, subscribe);
    }

    PausableObservable.prototype.pause = function () {
      if (this.isPaused === true){
        return;
      }
      this.isPaused = true;
      this.subject.onNext(false);
    };

    PausableObservable.prototype.resume = function () {
      if (this.isPaused === false){
        return;
      }
      this.isPaused = false;
      this.subject.onNext(true);
    };

    return PausableObservable;

  }(Observable));

  /**
   * Pauses the underlying observable sequence based upon the observable sequence which yields true/false.
   * @example
   * var pauser = new Rx.Subject();
   * var source = Rx.Observable.interval(100).pausable(pauser);
   * @param {Observable} pauser The observable sequence used to pause the underlying sequence.
   * @returns {Observable} The observable sequence which is paused based upon the pauser.
   */
  observableProto.pausable = function (pauser) {
    return new PausableObservable(this, pauser);
  };
  function combineLatestSource(source, subject, resultSelector) {
    return new AnonymousObservable(function (observer) {
      var n = 2,
        hasValue = [false, false],
        hasValueAll = false,
        isDone = false,
        values = new Array(n);

      function next(x, i) {
        values[i] = x
        var res;
        hasValue[i] = true;
        if (hasValueAll || (hasValueAll = hasValue.every(identity))) {
            try {
                res = resultSelector.apply(null, values);
            } catch (ex) {
                observer.onError(ex);
                return;
            }
            observer.onNext(res);
        } else if (isDone) {
            observer.onCompleted();
        }
      }

      return new CompositeDisposable(
        source.subscribe(
          function (x) {
            next(x, 0);
          },
          observer.onError.bind(observer),
          function () {
            isDone = true;
            observer.onCompleted();
          }),
        subject.subscribe(
          function (x) {
            next(x, 1);
          },
          observer.onError.bind(observer))
        );
    });
  }

  var PausableBufferedObservable = (function (_super) {

    inherits(PausableBufferedObservable, _super);

    function subscribe(observer) {
      var q = [], previous = true;
      
      var subscription =  
        combineLatestSource(
          this.source,
          this.subject.distinctUntilChanged(), 
          function (data, shouldFire) {
            return { data: data, shouldFire: shouldFire };      
          })
          .subscribe(
            function (results) {
              if (results.shouldFire && previous) {
                observer.onNext(results.data);
              }
              if (results.shouldFire && !previous) {
                while (q.length > 0) {
                  observer.onNext(q.shift());
                }
                previous = true;
              } else if (!results.shouldFire && !previous) {
                q.push(results.data);
              } else if (!results.shouldFire && previous) {
                previous = false;
              }

            }, 
            observer.onError.bind(observer),
            observer.onCompleted.bind(observer)
          );

      this.subject.onNext(false);

      return subscription;      
    }

    function PausableBufferedObservable(source, subject) {
      this.source = source;
      this.subject = subject || new Subject();
      this.isPaused = true;
      _super.call(this, subscribe);
    }

    PausableBufferedObservable.prototype.pause = function () {
      if (this.isPaused === true){
        return;
      }
      this.isPaused = true;
      this.subject.onNext(false);
    };

    PausableBufferedObservable.prototype.resume = function () {
      if (this.isPaused === false){
        return;
      }
      this.isPaused = false;
      this.subject.onNext(true);
    };

    return PausableBufferedObservable; 

  }(Observable));

  /**
   * Pauses the underlying observable sequence based upon the observable sequence which yields true/false,
   * and yields the values that were buffered while paused.
   * @example
   * var pauser = new Rx.Subject();
   * var source = Rx.Observable.interval(100).pausableBuffered(pauser);
   * @param {Observable} pauser The observable sequence used to pause the underlying sequence.
   * @returns {Observable} The observable sequence which is paused based upon the pauser.
   */  
  observableProto.pausableBuffered = function (subject) {
    return new PausableBufferedObservable(this, subject);
  };

  /**
   * Attaches a controller to the observable sequence with the ability to queue.
   * @example
   * var source = Rx.Observable.interval(100).controlled();
   * source.request(3); // Reads 3 values
   * @param {Observable} pauser The observable sequence used to pause the underlying sequence.
   * @returns {Observable} The observable sequence which is paused based upon the pauser.
   */ 
  observableProto.controlled = function (enableQueue) {
    if (enableQueue == null) {  enableQueue = true; }
    return new ControlledObservable(this, enableQueue);
  };
  var ControlledObservable = (function (_super) {

    inherits(ControlledObservable, _super);

    function subscribe (observer) {
      return this.source.subscribe(observer);
    }

    function ControlledObservable (source, enableQueue) {
      _super.call(this, subscribe);
      this.subject = new ControlledSubject(enableQueue);
      this.source = source.multicast(this.subject).refCount();
    }

    ControlledObservable.prototype.request = function (numberOfItems) {
      if (numberOfItems == null) { numberOfItems = -1; }
      return this.subject.request(numberOfItems);
    };

    return ControlledObservable;

  }(Observable));

    var ControlledSubject = Rx.ControlledSubject = (function (_super) {

        function subscribe (observer) {
            return this.subject.subscribe(observer);
        }

        inherits(ControlledSubject, _super);

        function ControlledSubject(enableQueue) {
            if (enableQueue == null) {
                enableQueue = true;
            }

            _super.call(this, subscribe);
            this.subject = new Subject();
            this.enableQueue = enableQueue;
            this.queue = enableQueue ? [] : null;
            this.requestedCount = 0;
            this.requestedDisposable = disposableEmpty;
            this.error = null;
            this.hasFailed = false;
            this.hasCompleted = false;
            this.controlledDisposable = disposableEmpty;
        }

        addProperties(ControlledSubject.prototype, Observer, {
            onCompleted: function () {
                checkDisposed.call(this);
                this.hasCompleted = true;

                if (!this.enableQueue || this.queue.length === 0) {
                    this.subject.onCompleted();
                }
            },
            onError: function (error) {
                checkDisposed.call(this);
                this.hasFailed = true;
                this.error = error;

                if (!this.enableQueue || this.queue.length === 0) {
                    this.subject.onError(error);
                }   
            },
            onNext: function (value) {
                checkDisposed.call(this);
                var hasRequested = false;

                if (this.requestedCount === 0) {
                    if (this.enableQueue) {
                        this.queue.push(value);
                    }
                } else {
                    if (this.requestedCount !== -1) {
                        if (this.requestedCount-- === 0) {
                            this.disposeCurrentRequest();
                        }
                    }
                    hasRequested = true;
                }

                if (hasRequested) {
                    this.subject.onNext(value);
                }
            },
            _processRequest: function (numberOfItems) {
                if (this.enableQueue) {
                    //console.log('queue length', this.queue.length);

                    while (this.queue.length >= numberOfItems && numberOfItems > 0) {
                        //console.log('number of items', numberOfItems);
                        this.subject.onNext(this.queue.shift());
                        numberOfItems--;
                    }

                    if (this.queue.length !== 0) {
                        return { numberOfItems: numberOfItems, returnValue: true };
                    } else {
                        return { numberOfItems: numberOfItems, returnValue: false };
                    }
                }

                if (this.hasFailed) {
                    this.subject.onError(this.error);
                    this.controlledDisposable.dispose();
                    this.controlledDisposable = disposableEmpty;
                } else if (this.hasCompleted) {
                    this.subject.onCompleted();
                    this.controlledDisposable.dispose();
                    this.controlledDisposable = disposableEmpty;                   
                }

                return { numberOfItems: numberOfItems, returnValue: false };
            },
            request: function (number) {
                checkDisposed.call(this);
                this.disposeCurrentRequest();
                var self = this,
                    r = this._processRequest(number);

                number = r.numberOfItems;
                if (!r.returnValue) {
                    this.requestedCount = number;
                    this.requestedDisposable = disposableCreate(function () {
                        self.requestedCount = 0;
                    });

                    return this.requestedDisposable
                } else {
                    return disposableEmpty;
                }
            },
            disposeCurrentRequest: function () {
                this.requestedDisposable.dispose();
                this.requestedDisposable = disposableEmpty;
            },

            dispose: function () {
                this.isDisposed = true;
                this.error = null;
                this.subject.dispose();
                this.requestedDisposable.dispose();
            }
        });

        return ControlledSubject;
    }(Observable));
    return Rx;
}));
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./rx":15}],11:[function(require,module,exports){
(function (global){
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.txt in the project root for license information.

;(function (factory) {
    var objectTypes = {
        'boolean': false,
        'function': true,
        'object': true,
        'number': false,
        'string': false,
        'undefined': false
    };

    var root = (objectTypes[typeof window] && window) || this,
        freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports,
        freeModule = objectTypes[typeof module] && module && !module.nodeType && module,
        moduleExports = freeModule && freeModule.exports === freeExports && freeExports,
        freeGlobal = objectTypes[typeof global] && global;
    
    if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
        root = freeGlobal;
    }

    // Because of build optimizers
    if (typeof define === 'function' && define.amd) {
        define(['rx', 'exports'], function (Rx, exports) {
            root.Rx = factory(root, exports, Rx);
            return root.Rx;
        });
    } else if (typeof module === 'object' && module && module.exports === freeExports) {
        module.exports = factory(root, module.exports, require('./rx'));
    } else {
        root.Rx = factory(root, {}, root.Rx);
    }
}.call(this, function (root, exp, Rx, undefined) {
    
    var Observable = Rx.Observable,
        observableProto = Observable.prototype,
        AnonymousObservable = Rx.AnonymousObservable,
        Subject = Rx.Subject,
        AsyncSubject = Rx.AsyncSubject,
        Observer = Rx.Observer,
        ScheduledObserver = Rx.internals.ScheduledObserver,
        disposableCreate = Rx.Disposable.create,
        disposableEmpty = Rx.Disposable.empty,
        CompositeDisposable = Rx.CompositeDisposable,
        currentThreadScheduler = Rx.Scheduler.currentThread,
        inherits = Rx.internals.inherits,
        addProperties = Rx.internals.addProperties;

    // Utilities
    var objectDisposed = 'Object has been disposed';
    function checkDisposed() {
        if (this.isDisposed) {
            throw new Error(objectDisposed);
        }
    }

    /**
     * Multicasts the source sequence notifications through an instantiated subject into all uses of the sequence within a selector function. Each
     * subscription to the resulting sequence causes a separate multicast invocation, exposing the sequence resulting from the selector function's
     * invocation. For specializations with fixed subject types, see Publish, PublishLast, and Replay.
     * 
     * @example
     * 1 - res = source.multicast(observable);
     * 2 - res = source.multicast(function () { return new Subject(); }, function (x) { return x; });
     * 
     * @param {Function|Subject} subjectOrSubjectSelector 
     * Factory function to create an intermediate subject through which the source sequence's elements will be multicast to the selector function.
     * Or:
     * Subject to push source elements into.
     * 
     * @param {Function} [selector] Optional selector function which can use the multicasted source sequence subject to the policies enforced by the created subject. Specified only if <paramref name="subjectOrSubjectSelector" is a factory function.
     * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
     */
    observableProto.multicast = function (subjectOrSubjectSelector, selector) {
        var source = this;
        return typeof subjectOrSubjectSelector === 'function' ?
            new AnonymousObservable(function (observer) {
                var connectable = source.multicast(subjectOrSubjectSelector());
                return new CompositeDisposable(selector(connectable).subscribe(observer), connectable.connect());
            }) :
            new ConnectableObservable(source, subjectOrSubjectSelector);
    };

    /**
     * Returns an observable sequence that is the result of invoking the selector on a connectable observable sequence that shares a single subscription to the underlying sequence.
     * This operator is a specialization of Multicast using a regular Subject.
     * 
     * @example
     * var resres = source.publish();
     * var res = source.publish(function (x) { return x; });
     * 
     * @param {Function} [selector] Selector function which can use the multicasted source sequence as many times as needed, without causing multiple subscriptions to the source sequence. Subscribers to the given source will receive all notifications of the source from the time of the subscription on.
     * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
     */
    observableProto.publish = function (selector) {
        return !selector ?
            this.multicast(new Subject()) :
            this.multicast(function () {
                return new Subject();
            }, selector);
    };

    /**
     * Returns an observable sequence that shares a single subscription to the underlying sequence.
     * This operator is a specialization of publish which creates a subscription when the number of observers goes from zero to one, then shares that subscription with all subsequent observers until the number of observers returns to zero, at which point the subscription is disposed.
     * 
     * @example
     * var res = source.share();
     * 
     * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence.
     */
    observableProto.share = function () {
        return this.publish(null).refCount();
    };

    /**
     * Returns an observable sequence that is the result of invoking the selector on a connectable observable sequence that shares a single subscription to the underlying sequence containing only the last notification.
     * This operator is a specialization of Multicast using a AsyncSubject.
     * 
     * @example
     * var res = source.publishLast();
     * var res = source.publishLast(function (x) { return x; });
     * 
     * @param selector [Optional] Selector function which can use the multicasted source sequence as many times as needed, without causing multiple subscriptions to the source sequence. Subscribers to the given source will only receive the last notification of the source.
     * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
     */
    observableProto.publishLast = function (selector) {
        return !selector ?
            this.multicast(new AsyncSubject()) :
            this.multicast(function () {
                return new AsyncSubject();
            }, selector);
    };

    /**
     * Returns an observable sequence that is the result of invoking the selector on a connectable observable sequence that shares a single subscription to the underlying sequence and starts with initialValue.
     * This operator is a specialization of Multicast using a BehaviorSubject.
     * 
     * @example
     * var res = source.publishValue(42);
     * var res = source.publishValue(function (x) { return x.select(function (y) { return y * y; }) }, 42);
     * 
     * @param {Function} [selector] Optional selector function which can use the multicasted source sequence as many times as needed, without causing multiple subscriptions to the source sequence. Subscribers to the given source will receive immediately receive the initial value, followed by all notifications of the source from the time of the subscription on.
     * @param {Mixed} initialValue Initial value received by observers upon subscription.
     * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
     */
    observableProto.publishValue = function (initialValueOrSelector, initialValue) {
        return arguments.length === 2 ?
            this.multicast(function () {
                return new BehaviorSubject(initialValue);
            }, initialValueOrSelector) :
            this.multicast(new BehaviorSubject(initialValueOrSelector));
    };

    /**
     * Returns an observable sequence that shares a single subscription to the underlying sequence and starts with an initialValue.
     * This operator is a specialization of publishValue which creates a subscription when the number of observers goes from zero to one, then shares that subscription with all subsequent observers until the number of observers returns to zero, at which point the subscription is disposed.
     * 
     * @example
     * var res = source.shareValue(42);
     * 
     * @param {Mixed} initialValue Initial value received by observers upon subscription.
     * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence.
     */
    observableProto.shareValue = function (initialValue) {
        return this.publishValue(initialValue).
            refCount();
    };

    /**
     * Returns an observable sequence that is the result of invoking the selector on a connectable observable sequence that shares a single subscription to the underlying sequence replaying notifications subject to a maximum time length for the replay buffer.
     * This operator is a specialization of Multicast using a ReplaySubject.
     * 
     * @example
     * var res = source.replay(null, 3);
     * var res = source.replay(null, 3, 500);
     * var res = source.replay(null, 3, 500, scheduler);
     * var res = source.replay(function (x) { return x.take(6).repeat(); }, 3, 500, scheduler);
     * 
     * @param selector [Optional] Selector function which can use the multicasted source sequence as many times as needed, without causing multiple subscriptions to the source sequence. Subscribers to the given source will receive all the notifications of the source subject to the specified replay buffer trimming policy.
     * @param bufferSize [Optional] Maximum element count of the replay buffer.
     * @param window [Optional] Maximum time length of the replay buffer.
     * @param scheduler [Optional] Scheduler where connected observers within the selector function will be invoked on.
     * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
     */
    observableProto.replay = function (selector, bufferSize, window, scheduler) {
        return !selector ?
            this.multicast(new ReplaySubject(bufferSize, window, scheduler)) :
            this.multicast(function () {
                return new ReplaySubject(bufferSize, window, scheduler);
            }, selector);
    };

    /**
     * Returns an observable sequence that shares a single subscription to the underlying sequence replaying notifications subject to a maximum time length for the replay buffer.
     * This operator is a specialization of replay which creates a subscription when the number of observers goes from zero to one, then shares that subscription with all subsequent observers until the number of observers returns to zero, at which point the subscription is disposed.
     * 
     * @example
     * var res = source.replayWhileObserved(3);
     * var res = source.replayWhileObserved(3, 500);
     * var res = source.replayWhileObserved(3, 500, scheduler);
     * 

     * @param bufferSize [Optional] Maximum element count of the replay buffer.
     * @param window [Optional] Maximum time length of the replay buffer.
     * @param scheduler [Optional] Scheduler where connected observers within the selector function will be invoked on.
     * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence.
     */
    observableProto.replayWhileObserved = function (bufferSize, window, scheduler) {
        return this.replay(null, bufferSize, window, scheduler).refCount();
    };

    /** @private */
    var InnerSubscription = function (subject, observer) {
        this.subject = subject;
        this.observer = observer;
    };

    /**
     * @private
     * @memberOf InnerSubscription
     */
    InnerSubscription.prototype.dispose = function () {
        if (!this.subject.isDisposed && this.observer !== null) {
            var idx = this.subject.observers.indexOf(this.observer);
            this.subject.observers.splice(idx, 1);
            this.observer = null;
        }
    };

    /**
     *  Represents a value that changes over time.
     *  Observers can subscribe to the subject to receive the last (or initial) value and all subsequent notifications.
     */
    var BehaviorSubject = Rx.BehaviorSubject = (function (_super) {
        function subscribe(observer) {
            checkDisposed.call(this);
            if (!this.isStopped) {
                this.observers.push(observer);
                observer.onNext(this.value);
                return new InnerSubscription(this, observer);
            }
            var ex = this.exception;
            if (ex) {
                observer.onError(ex);
            } else {
                observer.onCompleted();
            }
            return disposableEmpty;
        }

        inherits(BehaviorSubject, _super);

        /**
         * @constructor
         *  Initializes a new instance of the BehaviorSubject class which creates a subject that caches its last value and starts with the specified value.
         *  @param {Mixed} value Initial value sent to observers when no other value has been received by the subject yet.
         */       
        function BehaviorSubject(value) {
            _super.call(this, subscribe);

            this.value = value,
            this.observers = [],
            this.isDisposed = false,
            this.isStopped = false,
            this.exception = null;
        }

        addProperties(BehaviorSubject.prototype, Observer, {
            /**
             * Indicates whether the subject has observers subscribed to it.
             * @returns {Boolean} Indicates whether the subject has observers subscribed to it.
             */         
            hasObservers: function () {
                return this.observers.length > 0;
            },
            /**
             * Notifies all subscribed observers about the end of the sequence.
             */ 
            onCompleted: function () {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var os = this.observers.slice(0);
                    this.isStopped = true;
                    for (var i = 0, len = os.length; i < len; i++) {
                        os[i].onCompleted();
                    }

                    this.observers = [];
                }
            },
            /**
             * Notifies all subscribed observers about the exception.
             * @param {Mixed} error The exception to send to all observers.
             */             
            onError: function (error) {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var os = this.observers.slice(0);
                    this.isStopped = true;
                    this.exception = error;

                    for (var i = 0, len = os.length; i < len; i++) {
                        os[i].onError(error);
                    }

                    this.observers = [];
                }
            },
            /**
             * Notifies all subscribed observers about the arrival of the specified element in the sequence.
             * @param {Mixed} value The value to send to all observers.
             */              
            onNext: function (value) {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    this.value = value;
                    var os = this.observers.slice(0);
                    for (var i = 0, len = os.length; i < len; i++) {
                        os[i].onNext(value);
                    }
                }
            },
            /**
             * Unsubscribe all observers and release resources.
             */            
            dispose: function () {
                this.isDisposed = true;
                this.observers = null;
                this.value = null;
                this.exception = null;
            }
        });

        return BehaviorSubject;
    }(Observable));

    /**
     * Represents an object that is both an observable sequence as well as an observer.
     * Each notification is broadcasted to all subscribed and future observers, subject to buffer trimming policies.
     */  
    var ReplaySubject = Rx.ReplaySubject = (function (_super) {

        function RemovableDisposable (subject, observer) {
            this.subject = subject;
            this.observer = observer;
        };

        RemovableDisposable.prototype.dispose = function () {
            this.observer.dispose();
            if (!this.subject.isDisposed) {
                var idx = this.subject.observers.indexOf(this.observer);
                this.subject.observers.splice(idx, 1);
            }
        };

        function subscribe(observer) {
            var so = new ScheduledObserver(this.scheduler, observer),
                subscription = new RemovableDisposable(this, so);
            checkDisposed.call(this);
            this._trim(this.scheduler.now());
            this.observers.push(so);

            var n = this.q.length;

            for (var i = 0, len = this.q.length; i < len; i++) {
                so.onNext(this.q[i].value);
            }

            if (this.hasError) {
                n++;
                so.onError(this.error);
            } else if (this.isStopped) {
                n++;
                so.onCompleted();
            }

            so.ensureActive(n);
            return subscription;
        }

        inherits(ReplaySubject, _super);

        /**
         *  Initializes a new instance of the ReplaySubject class with the specified buffer size, window size and scheduler.
         *  @param {Number} [bufferSize] Maximum element count of the replay buffer.
         *  @param {Number} [windowSize] Maximum time length of the replay buffer.
         *  @param {Scheduler} [scheduler] Scheduler the observers are invoked on.
         */
        function ReplaySubject(bufferSize, windowSize, scheduler) {
            this.bufferSize = bufferSize == null ? Number.MAX_VALUE : bufferSize;
            this.windowSize = windowSize == null ? Number.MAX_VALUE : windowSize;
            this.scheduler = scheduler || currentThreadScheduler;
            this.q = [];
            this.observers = [];
            this.isStopped = false;
            this.isDisposed = false;
            this.hasError = false;
            this.error = null;
            _super.call(this, subscribe);
        }

        addProperties(ReplaySubject.prototype, Observer, {
            /**
             * Indicates whether the subject has observers subscribed to it.
             * @returns {Boolean} Indicates whether the subject has observers subscribed to it.
             */         
            hasObservers: function () {
                return this.observers.length > 0;
            },            
            /* @private  */
            _trim: function (now) {
                while (this.q.length > this.bufferSize) {
                    this.q.shift();
                }
                while (this.q.length > 0 && (now - this.q[0].interval) > this.windowSize) {
                    this.q.shift();
                }
            },
            /**
             * Notifies all subscribed observers about the arrival of the specified element in the sequence.
             * @param {Mixed} value The value to send to all observers.
             */              
            onNext: function (value) {
                var observer;
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var now = this.scheduler.now();
                    this.q.push({ interval: now, value: value });
                    this._trim(now);

                    var o = this.observers.slice(0);
                    for (var i = 0, len = o.length; i < len; i++) {
                        observer = o[i];
                        observer.onNext(value);
                        observer.ensureActive();
                    }
                }
            },
            /**
             * Notifies all subscribed observers about the exception.
             * @param {Mixed} error The exception to send to all observers.
             */                 
            onError: function (error) {
                var observer;
                checkDisposed.call(this);
                if (!this.isStopped) {
                    this.isStopped = true;
                    this.error = error;
                    this.hasError = true;
                    var now = this.scheduler.now();
                    this._trim(now);
                    var o = this.observers.slice(0);
                    for (var i = 0, len = o.length; i < len; i++) {
                        observer = o[i];
                        observer.onError(error);
                        observer.ensureActive();
                    }
                    this.observers = [];
                }
            },
            /**
             * Notifies all subscribed observers about the end of the sequence.
             */             
            onCompleted: function () {
                var observer;
                checkDisposed.call(this);
                if (!this.isStopped) {
                    this.isStopped = true;
                    var now = this.scheduler.now();
                    this._trim(now);
                    var o = this.observers.slice(0);
                    for (var i = 0, len = o.length; i < len; i++) {
                        observer = o[i];
                        observer.onCompleted();
                        observer.ensureActive();
                    }
                    this.observers = [];
                }
            },
            /**
             * Unsubscribe all observers and release resources.
             */               
            dispose: function () {
                this.isDisposed = true;
                this.observers = null;
            }
        });

        return ReplaySubject;
    }(Observable));

    /** @private */
    var ConnectableObservable = Rx.ConnectableObservable = (function (_super) {
        inherits(ConnectableObservable, _super);

        /**
         * @constructor
         * @private
         */
        function ConnectableObservable(source, subject) {
            var state = {
                subject: subject,
                source: source.asObservable(),
                hasSubscription: false,
                subscription: null
            };

            this.connect = function () {
                if (!state.hasSubscription) {
                    state.hasSubscription = true;
                    state.subscription = new CompositeDisposable(state.source.subscribe(state.subject), disposableCreate(function () {
                        state.hasSubscription = false;
                    }));
                }
                return state.subscription;
            };

            function subscribe(observer) {
                return state.subject.subscribe(observer);
            }

            _super.call(this, subscribe);
        }

        /**
         * @private
         * @memberOf ConnectableObservable
         */
        ConnectableObservable.prototype.connect = function () { return this.connect(); };

        /**
         * @private
         * @memberOf ConnectableObservable
         */        
        ConnectableObservable.prototype.refCount = function () {
            var connectableSubscription = null, count = 0, source = this;
            return new AnonymousObservable(function (observer) {
                var shouldConnect, subscription;
                count++;
                shouldConnect = count === 1;
                subscription = source.subscribe(observer);
                if (shouldConnect) {
                    connectableSubscription = source.connect();
                }
                return disposableCreate(function () {
                    subscription.dispose();
                    count--;
                    if (count === 0) {
                        connectableSubscription.dispose();
                    }
                });
            });
        };

        return ConnectableObservable;
    }(Observable));

    return Rx;
}));
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./rx":15}],12:[function(require,module,exports){
(function (global){
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.txt in the project root for license information.

;(function (factory) {
    var objectTypes = {
        'boolean': false,
        'function': true,
        'object': true,
        'number': false,
        'string': false,
        'undefined': false
    };

    var root = (objectTypes[typeof window] && window) || this,
        freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports,
        freeModule = objectTypes[typeof module] && module && !module.nodeType && module,
        moduleExports = freeModule && freeModule.exports === freeExports && freeExports,
        freeGlobal = objectTypes[typeof global] && global;
    
    if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
        root = freeGlobal;
    }

    // Because of build optimizers
    if (typeof define === 'function' && define.amd) {
        define(['rx', 'exports'], function (Rx, exports) {
            root.Rx = factory(root, exports, Rx);
            return root.Rx;
        });
    } else if (typeof module === 'object' && module && module.exports === freeExports) {
        module.exports = factory(root, module.exports, require('./rx'));
    } else {
        root.Rx = factory(root, {}, root.Rx);
    }
}.call(this, function (root, exp, Rx, undefined) {
    
    var Observable = Rx.Observable,
        CompositeDisposable = Rx.CompositeDisposable,
        RefCountDisposable = Rx.RefCountDisposable,
        SingleAssignmentDisposable = Rx.SingleAssignmentDisposable,
        SerialDisposable = Rx.SerialDisposable,
        Subject = Rx.Subject,
        observableProto = Observable.prototype,
        observableEmpty = Observable.empty,
        AnonymousObservable = Rx.AnonymousObservable,
        observerCreate = Rx.Observer.create,
        addRef = Rx.internals.addRef,
        defaultComparer = Rx.internals.isEqual,
        noop = Rx.helpers.noop;
    
    // Real Dictionary
    var primes = [1, 3, 7, 13, 31, 61, 127, 251, 509, 1021, 2039, 4093, 8191, 16381, 32749, 65521, 131071, 262139, 524287, 1048573, 2097143, 4194301, 8388593, 16777213, 33554393, 67108859, 134217689, 268435399, 536870909, 1073741789, 2147483647];
    var noSuchkey = "no such key";
    var duplicatekey = "duplicate key";

    function isPrime(candidate) {
        if (candidate & 1 === 0) {
            return candidate === 2;
        }
        var num1 = Math.sqrt(candidate),
            num2 = 3;
        while (num2 <= num1) {
            if (candidate % num2 === 0) {
                return false;
            }
            num2 += 2;
        }
        return true;
    }

    function getPrime(min) {
        var index, num, candidate;
        for (index = 0; index < primes.length; ++index) {
            num = primes[index];
            if (num >= min) {
                return num;
            }
        }
        candidate = min | 1;
        while (candidate < primes[primes.length - 1]) {
            if (isPrime(candidate)) {
                return candidate;
            }
            candidate += 2;
        }
        return min;
    }

    function stringHashFn(str) {
        var hash = 757602046;
        if (!str.length) {
            return hash;
        }
        for (var i = 0, len = str.length; i < len; i++) {
            var character = str.charCodeAt(i);
            hash = ((hash<<5)-hash)+character;
            hash = hash & hash;
        }
        return hash;
    }

    function numberHashFn(key) {
        var c2 = 0x27d4eb2d; 
        key = (key ^ 61) ^ (key >>> 16);
        key = key + (key << 3);
        key = key ^ (key >>> 4);
        key = key * c2;
        key = key ^ (key >>> 15);
        return key;
    }

    var getHashCode = (function () {
        var uniqueIdCounter = 0;

        return function (obj) {
            if (obj == null) { 
                throw new Error(noSuchkey);
            }

            // Check for built-ins before tacking on our own for any object
            if (typeof obj === 'string') {
                return stringHashFn(obj);
            }

            if (typeof obj === 'number') {
                return numberHashFn(obj);
            }

            if (typeof obj === 'boolean') {
                return obj === true ? 1 : 0;
            }

            if (obj instanceof Date) {
                return obj.getTime();
            }

            if (obj.getHashCode) {
                return obj.getHashCode();
            }

            var id = 17 * uniqueIdCounter++;
            obj.getHashCode = function () { return id; };
            return id;
        };
    } ());

    function newEntry() {
        return { key: null, value: null, next: 0, hashCode: 0 };
    }

    // Dictionary implementation

    var Dictionary = function (capacity, comparer) {
        if (capacity < 0) {
            throw new Error('out of range')
        }
        if (capacity > 0) {
            this._initialize(capacity);
        }
        
        this.comparer = comparer || defaultComparer;
        this.freeCount = 0;
        this.size = 0;
        this.freeList = -1;
    };

    Dictionary.prototype._initialize = function (capacity) {
        var prime = getPrime(capacity), i;
        this.buckets = new Array(prime);
        this.entries = new Array(prime);
        for (i = 0; i < prime; i++) {
            this.buckets[i] = -1;
            this.entries[i] = newEntry();
        }
        this.freeList = -1;
    };
    Dictionary.prototype.count = function () {
        return this.size;
    };
    Dictionary.prototype.add = function (key, value) {
        return this._insert(key, value, true);
    };
    Dictionary.prototype._insert = function (key, value, add) {
        if (!this.buckets) {
            this._initialize(0);
        }
        var index3;
        var num = getHashCode(key) & 2147483647;
        var index1 = num % this.buckets.length;
        for (var index2 = this.buckets[index1]; index2 >= 0; index2 = this.entries[index2].next) {
            if (this.entries[index2].hashCode === num && this.comparer(this.entries[index2].key, key)) {
                if (add) {
                    throw new Error(duplicatekey);
                }
                this.entries[index2].value = value;
                return;
            }
        }
        if (this.freeCount > 0) {
            index3 = this.freeList;
            this.freeList = this.entries[index3].next;
            --this.freeCount;
        } else {
            if (this.size === this.entries.length) {
                this._resize();
                index1 = num % this.buckets.length;
            }
            index3 = this.size;
            ++this.size;
        }
        this.entries[index3].hashCode = num;
        this.entries[index3].next = this.buckets[index1];
        this.entries[index3].key = key;
        this.entries[index3].value = value;
        this.buckets[index1] = index3;
    };

    Dictionary.prototype._resize = function () {
        var prime = getPrime(this.size * 2),
            numArray = new Array(prime);
        for (index = 0; index < numArray.length; ++index) {
            numArray[index] = -1;
        }
        var entryArray = new Array(prime);
        for (index = 0; index < this.size; ++index) {
            entryArray[index] = this.entries[index];
        }
        for (var index = this.size; index < prime; ++index) {
            entryArray[index] = newEntry();
        }
        for (var index1 = 0; index1 < this.size; ++index1) {
            var index2 = entryArray[index1].hashCode % prime;
            entryArray[index1].next = numArray[index2];
            numArray[index2] = index1;
        }
        this.buckets = numArray;
        this.entries = entryArray;
    };

    Dictionary.prototype.remove = function (key) {
        if (this.buckets) {
            var num = getHashCode(key) & 2147483647;
            var index1 = num % this.buckets.length;
            var index2 = -1;
            for (var index3 = this.buckets[index1]; index3 >= 0; index3 = this.entries[index3].next) {
                if (this.entries[index3].hashCode === num && this.comparer(this.entries[index3].key, key)) {
                    if (index2 < 0) {
                        this.buckets[index1] = this.entries[index3].next;
                    } else {
                        this.entries[index2].next = this.entries[index3].next;
                    }
                    this.entries[index3].hashCode = -1;
                    this.entries[index3].next = this.freeList;
                    this.entries[index3].key = null;
                    this.entries[index3].value = null;
                    this.freeList = index3;
                    ++this.freeCount;
                    return true;
                } else {
                    index2 = index3;
                }
            }
        }
        return false;
    };

    Dictionary.prototype.clear = function () {
        var index, len;
        if (this.size <= 0) {
            return;
        }
        for (index = 0, len = this.buckets.length; index < len; ++index) {
            this.buckets[index] = -1;
        }
        for (index = 0; index < this.size; ++index) {
            this.entries[index] = newEntry();
        }
        this.freeList = -1;
        this.size = 0;
    };

    Dictionary.prototype._findEntry = function (key) {
        if (this.buckets) {
            var num = getHashCode(key) & 2147483647;
            for (var index = this.buckets[num % this.buckets.length]; index >= 0; index = this.entries[index].next) {
                if (this.entries[index].hashCode === num && this.comparer(this.entries[index].key, key)) {
                    return index;
                }
            }
        }
        return -1;
    };

    Dictionary.prototype.count = function () {
        return this.size - this.freeCount;
    };

    Dictionary.prototype.tryGetValue = function (key) {
        var entry = this._findEntry(key);
        if (entry >= 0) {
            return this.entries[entry].value;
        }
        return undefined;
    };

    Dictionary.prototype.getValues = function () {
        var index = 0, results = [];
        if (this.entries) {
            for (var index1 = 0; index1 < this.size; index1++) {
                if (this.entries[index1].hashCode >= 0) {
                    results[index++] = this.entries[index1].value;
                }
            }
        }
        return results;
    };

    Dictionary.prototype.get = function (key) {
        var entry = this._findEntry(key);
        if (entry >= 0) {
            return this.entries[entry].value;
        }
        throw new Error(noSuchkey);
    };

    Dictionary.prototype.set = function (key, value) {
        this._insert(key, value, false);
    };

    Dictionary.prototype.containskey = function (key) {
        return this._findEntry(key) >= 0;
    };

    /**
     *  Correlates the elements of two sequences based on overlapping durations.
     *  
     *  @param {Observable} right The right observable sequence to join elements for.
     *  @param {Function} leftDurationSelector A function to select the duration (expressed as an observable sequence) of each element of the left observable sequence, used to determine overlap.
     *  @param {Function} rightDurationSelector A function to select the duration (expressed as an observable sequence) of each element of the right observable sequence, used to determine overlap.
     *  @param {Function} resultSelector A function invoked to compute a result element for any two overlapping elements of the left and right observable sequences. The parameters passed to the function correspond with the elements from the left and right source sequences for which overlap occurs.
     *  @returns {Observable} An observable sequence that contains result elements computed from source elements that have an overlapping duration.
     */    
    observableProto.join = function (right, leftDurationSelector, rightDurationSelector, resultSelector) {
        var left = this;
        return new AnonymousObservable(function (observer) {
            var group = new CompositeDisposable(),
            leftDone = false,
            leftId = 0,
            leftMap = new Dictionary(),
            rightDone = false,
            rightId = 0,
            rightMap = new Dictionary();
            group.add(left.subscribe(function (value) {
                var duration,
                expire,
                id = leftId++,
                md = new SingleAssignmentDisposable(),
                result,
                values;
                leftMap.add(id, value);
                group.add(md);
                expire = function () {
                    if (leftMap.remove(id) && leftMap.count() === 0 && leftDone) {
                        observer.onCompleted();
                    }
                    return group.remove(md);
                };
                try {
                    duration = leftDurationSelector(value);
                } catch (e) {
                    observer.onError(e);
                    return;
                }
                md.setDisposable(duration.take(1).subscribe(noop, observer.onError.bind(observer), function () { expire(); }));
                values = rightMap.getValues();
                for (var i = 0; i < values.length; i++) {
                    try {
                        result = resultSelector(value, values[i]);
                    } catch (exception) {
                        observer.onError(exception);
                        return;
                    }
                    observer.onNext(result);
                }
            }, observer.onError.bind(observer), function () {
                leftDone = true;
                if (rightDone || leftMap.count() === 0) {
                    observer.onCompleted();
                }
            }));
            group.add(right.subscribe(function (value) {
                var duration,
                expire,
                id = rightId++,
                md = new SingleAssignmentDisposable(),
                result,
                values;
                rightMap.add(id, value);
                group.add(md);
                expire = function () {
                    if (rightMap.remove(id) && rightMap.count() === 0 && rightDone) {
                        observer.onCompleted();
                    }
                    return group.remove(md);
                };
                try {
                    duration = rightDurationSelector(value);
                } catch (exception) {
                    observer.onError(exception);
                    return;
                }
                md.setDisposable(duration.take(1).subscribe(noop, observer.onError.bind(observer), function () { expire(); }));
                values = leftMap.getValues();
                for (var i = 0; i < values.length; i++) {
                    try {
                        result = resultSelector(values[i], value);
                    } catch (exception) {
                        observer.onError(exception);
                        return;
                    }
                    observer.onNext(result);
                }
            }, observer.onError.bind(observer), function () {
                rightDone = true;
                if (leftDone || rightMap.count() === 0) {
                    observer.onCompleted();
                }
            }));
            return group;
        });
    };

    /**
     *  Correlates the elements of two sequences based on overlapping durations, and groups the results.
     *  
     *  @param {Observable} right The right observable sequence to join elements for.
     *  @param {Function} leftDurationSelector A function to select the duration (expressed as an observable sequence) of each element of the left observable sequence, used to determine overlap.
     *  @param {Function} rightDurationSelector A function to select the duration (expressed as an observable sequence) of each element of the right observable sequence, used to determine overlap.
     *  @param {Function} resultSelector A function invoked to compute a result element for any element of the left sequence with overlapping elements from the right observable sequence. The first parameter passed to the function is an element of the left sequence. The second parameter passed to the function is an observable sequence with elements from the right sequence that overlap with the left sequence's element.
     *  @returns {Observable} An observable sequence that contains result elements computed from source elements that have an overlapping duration.
     */    
    observableProto.groupJoin = function (right, leftDurationSelector, rightDurationSelector, resultSelector) {
        var left = this;
        return new AnonymousObservable(function (observer) {
            var nothing = function () {};
            var group = new CompositeDisposable();
            var r = new RefCountDisposable(group);
            var leftMap = new Dictionary();
            var rightMap = new Dictionary();
            var leftID = 0;
            var rightID = 0;

            group.add(left.subscribe(
                function (value) {
                    var s = new Subject();
                    var id = leftID++;
                    leftMap.add(id, s);
                    var i, len, leftValues, rightValues;

                    var result;
                    try {
                        result = resultSelector(value, addRef(s, r));
                    } catch (e) {
                        leftValues = leftMap.getValues();
                        for (i = 0, len = leftValues.length; i < len; i++) {
                            leftValues[i].onError(e);
                        }
                        observer.onError(e);
                        return;
                    }
                    observer.onNext(result);

                    rightValues = rightMap.getValues();
                    for (i = 0, len = rightValues.length; i < len; i++) {
                        s.onNext(rightValues[i]);
                    }

                    var md = new SingleAssignmentDisposable();
                    group.add(md);

                    var expire = function () {
                        if (leftMap.remove(id)) {
                            s.onCompleted();
                        }
                            
                        group.remove(md);
                    };

                    var duration;
                    try {
                        duration = leftDurationSelector(value);
                    } catch (e) {
                        leftValues = leftMap.getValues();
                        for (i = 0, len = leftMap.length; i < len; i++) {
                            leftValues[i].onError(e);
                        }
                        observer.onError(e);
                        return;
                    }

                    md.setDisposable(duration.take(1).subscribe(
                        nothing,
                        function (e) {
                            leftValues = leftMap.getValues();
                            for (i = 0, len = leftValues.length; i < len; i++) {
                                leftValues[i].onError(e);
                            }
                            observer.onError(e);
                        },
                        expire)
                    );
                },
                function (e) {
                    var leftValues = leftMap.getValues();
                    for (var i = 0, len = leftValues.length; i < len; i++) {
                        leftValues[i].onError(e);
                    }
                    observer.onError(e);
                },
                observer.onCompleted.bind(observer)));

            group.add(right.subscribe(
                function (value) {
                    var leftValues, i, len;
                    var id = rightID++;
                    rightMap.add(id, value);

                    var md = new SingleAssignmentDisposable();
                    group.add(md);

                    var expire = function () {
                        rightMap.remove(id);
                        group.remove(md);
                    };

                    var duration;
                    try {
                        duration = rightDurationSelector(value);
                    } catch (e) {
                        leftValues = leftMap.getValues();
                        for (i = 0, len = leftMap.length; i < len; i++) {
                            leftValues[i].onError(e);
                        }
                        observer.onError(e);
                        return;
                    }
                    md.setDisposable(duration.take(1).subscribe(
                        nothing,
                        function (e) {
                            leftValues = leftMap.getValues();
                            for (i = 0, len = leftMap.length; i < len; i++) {
                                leftValues[i].onError(e);
                            }
                            observer.onError(e);
                        },
                        expire)
                    );

                    leftValues = leftMap.getValues();
                    for (i = 0, len = leftValues.length; i < len; i++) {
                        leftValues[i].onNext(value);
                    }
                },
                function (e) {
                    var leftValues = leftMap.getValues();
                    for (var i = 0, len = leftValues.length; i < len; i++) {
                        leftValues[i].onError(e);
                    }
                    observer.onError(e);
                }));

            return r;
        });
    };

    /**
     *  Projects each element of an observable sequence into zero or more buffers.
     *  
     *  @param {Mixed} bufferOpeningsOrClosingSelector Observable sequence whose elements denote the creation of new windows, or, a function invoked to define the boundaries of the produced windows (a new window is started when the previous one is closed, resulting in non-overlapping windows).
     *  @param {Function} [bufferClosingSelector] A function invoked to define the closing of each produced window. If a closing selector function is specified for the first parameter, this parameter is ignored.
     *  @returns {Observable} An observable sequence of windows.    
     */
    observableProto.buffer = function (bufferOpeningsOrClosingSelector, bufferClosingSelector) {
        return this.window.apply(this, arguments).selectMany(function (x) { return x.toArray(); });
    };

    /**
     *  Projects each element of an observable sequence into zero or more windows.
     *  
     *  @param {Mixed} windowOpeningsOrClosingSelector Observable sequence whose elements denote the creation of new windows, or, a function invoked to define the boundaries of the produced windows (a new window is started when the previous one is closed, resulting in non-overlapping windows).
     *  @param {Function} [windowClosingSelector] A function invoked to define the closing of each produced window. If a closing selector function is specified for the first parameter, this parameter is ignored.
     *  @returns {Observable} An observable sequence of windows.
     */    
    observableProto.window = function (windowOpeningsOrClosingSelector, windowClosingSelector) {
        if (arguments.length === 1 && typeof arguments[0] !== 'function') {
            return observableWindowWithBounaries.call(this, windowOpeningsOrClosingSelector);
        }
        return typeof windowOpeningsOrClosingSelector === 'function' ?
            observableWindowWithClosingSelector.call(this, windowOpeningsOrClosingSelector) :
            observableWindowWithOpenings.call(this, windowOpeningsOrClosingSelector, windowClosingSelector);
    };
    
    function observableWindowWithOpenings(windowOpenings, windowClosingSelector) {
        return windowOpenings.groupJoin(this, windowClosingSelector, function () {
            return observableEmpty();
        }, function (_, window) {
            return window;
        });
    }

    function observableWindowWithBounaries(windowBoundaries) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var window = new Subject(), 
                d = new CompositeDisposable(), 
                r = new RefCountDisposable(d);

            observer.onNext(addRef(window, r));

            d.add(source.subscribe(function (x) {
                window.onNext(x);
            }, function (err) {
                window.onError(err);
                observer.onError(err);
            }, function () {
                window.onCompleted();
                observer.onCompleted();
            }));

            d.add(windowBoundaries.subscribe(function (w) {
                window.onCompleted();
                window = new Subject();
                observer.onNext(addRef(window, r));
            }, function (err) {
                window.onError(err);
                observer.onError(err);
            }, function () {
                window.onCompleted();
                observer.onCompleted();
            }));

            return r;
        });
    }

    function observableWindowWithClosingSelector(windowClosingSelector) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var createWindowClose,
                m = new SerialDisposable(),
                d = new CompositeDisposable(m),
                r = new RefCountDisposable(d),
                window = new Subject();
            observer.onNext(addRef(window, r));
            d.add(source.subscribe(function (x) {
                window.onNext(x);
            }, function (ex) {
                window.onError(ex);
                observer.onError(ex);
            }, function () {
                window.onCompleted();
                observer.onCompleted();
            }));
            createWindowClose = function () {
                var m1, windowClose;
                try {
                    windowClose = windowClosingSelector();
                } catch (exception) {
                    observer.onError(exception);
                    return;
                }
                m1 = new SingleAssignmentDisposable();
                m.setDisposable(m1);
                m1.setDisposable(windowClose.take(1).subscribe(noop, function (ex) {
                    window.onError(ex);
                    observer.onError(ex);
                }, function () {
                    window.onCompleted();
                    window = new Subject();
                    observer.onNext(addRef(window, r));
                    createWindowClose();
                }));
            };
            createWindowClose();
            return r;
        });
    }

    return Rx;
}));
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./rx":15}],13:[function(require,module,exports){
(function (global){
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.txt in the project root for license information.

;(function (factory) {
    var objectTypes = {
        'boolean': false,
        'function': true,
        'object': true,
        'number': false,
        'string': false,
        'undefined': false
    };

    var root = (objectTypes[typeof window] && window) || this,
        freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports,
        freeModule = objectTypes[typeof module] && module && !module.nodeType && module,
        moduleExports = freeModule && freeModule.exports === freeExports && freeExports,
        freeGlobal = objectTypes[typeof global] && global;
    
    if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
        root = freeGlobal;
    }

    // Because of build optimizers
    if (typeof define === 'function' && define.amd) {
        define(['rx', 'exports'], function (Rx, exports) {
            root.Rx = factory(root, exports, Rx);
            return root.Rx;
        });
    } else if (typeof module === 'object' && module && module.exports === freeExports) {
        module.exports = factory(root, module.exports, require('./rx'));
    } else {
        root.Rx = factory(root, {}, root.Rx);
    }
}.call(this, function (root, exp, Rx, undefined) {
    
  // Aliases
  var Observable = Rx.Observable,
    observableProto = Observable.prototype,
    AnonymousObservable = Rx.AnonymousObservable,
    observableConcat = Observable.concat,
    observableDefer = Observable.defer,
    observableEmpty = Observable.empty,
    disposableEmpty = Rx.Disposable.empty,
    CompositeDisposable = Rx.CompositeDisposable,
    SerialDisposable = Rx.SerialDisposable,
    SingleAssignmentDisposable = Rx.SingleAssignmentDisposable,
    Enumerator = Rx.internals.Enumerator,
    Enumerable = Rx.internals.Enumerable,
    enumerableForEach = Enumerable.forEach,
    immediateScheduler = Rx.Scheduler.immediate,
    currentThreadScheduler = Rx.Scheduler.currentThread,
    slice = Array.prototype.slice,
    AsyncSubject = Rx.AsyncSubject,
    Observer = Rx.Observer,
    inherits = Rx.internals.inherits,
    addProperties = Rx.internals.addProperties,
    noop = Rx.helpers.noop,
    isPromise = Rx.helpers.isPromise,
    observableFromPromise = Observable.fromPromise;

  // Utilities
  function argsOrArray(args, idx) {
    return args.length === 1 && Array.isArray(args[idx]) ?
      args[idx] :
      slice.call(args);
  }

  // Shim in iterator support
  var $iterator$ = (typeof Symbol === 'object' && Symbol.iterator) ||
    '_es6shim_iterator_';
  // Firefox ships a partial implementation using the name @@iterator.
  // https://bugzilla.mozilla.org/show_bug.cgi?id=907077#c14
  // So use that name if we detect it.
  if (root.Set && typeof new root.Set()['@@iterator'] === 'function') {
    $iterator$ = '@@iterator';
  }
  var doneEnumerator = { done: true, value: undefined };

  function enumerableWhile(condition, source) {
    return new Enumerable(function () {
      return new Enumerator(function () {
        return condition() ?
          { done: false, value: source } :
          { done: true, value: undefined };  
      });
    });
  }

     /**
     *  Returns an observable sequence that is the result of invoking the selector on the source sequence, without sharing subscriptions.
     *  This operator allows for a fluent style of writing queries that use the same sequence multiple times.
     *
     * @param {Function} selector Selector function which can use the source sequence as many times as needed, without sharing subscriptions to the source sequence.
     * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
     */
    observableProto.letBind = observableProto['let'] = function (func) {
        return func(this);
    };

   /**
   *  Determines whether an observable collection contains values. There is an alias for this method called 'ifThen' for browsers <IE9
   *  
   * @example
   *  1 - res = Rx.Observable.if(condition, obs1);
   *  2 - res = Rx.Observable.if(condition, obs1, obs2);
   *  3 - res = Rx.Observable.if(condition, obs1, scheduler);
   * @param {Function} condition The condition which determines if the thenSource or elseSource will be run.
   * @param {Observable} thenSource The observable sequence or Promise that will be run if the condition function returns true.
   * @param {Observable} [elseSource] The observable sequence or Promise that will be run if the condition function returns false. If this is not provided, it defaults to Rx.Observabe.Empty with the specified scheduler.  
   * @returns {Observable} An observable sequence which is either the thenSource or elseSource.
   */
  Observable['if'] = Observable.ifThen = function (condition, thenSource, elseSourceOrScheduler) {
    return observableDefer(function () {
      elseSourceOrScheduler || (elseSourceOrScheduler = observableEmpty());

      isPromise(thenSource) && (thenSource = observableFromPromise(thenSource));
      isPromise(elseSourceOrScheduler) && (elseSourceOrScheduler = observableFromPromise(elseSourceOrScheduler));

      // Assume a scheduler for empty only
      typeof elseSourceOrScheduler.now === 'function' && (elseSourceOrScheduler = observableEmpty(elseSourceOrScheduler));
      return condition() ? thenSource : elseSourceOrScheduler;
    });
  };

     /**
     *  Concatenates the observable sequences obtained by running the specified result selector for each element in source.
     * There is an alias for this method called 'forIn' for browsers <IE9
     * @param {Array} sources An array of values to turn into an observable sequence.
     * @param {Function} resultSelector A function to apply to each item in the sources array to turn it into an observable sequence.
     * @returns {Observable} An observable sequence from the concatenated observable sequences.  
     */ 
    Observable['for'] = Observable.forIn = function (sources, resultSelector) {
        return enumerableForEach(sources, resultSelector).concat();
    };

   /**
   *  Repeats source as long as condition holds emulating a while loop.
   * There is an alias for this method called 'whileDo' for browsers <IE9
   *
   * @param {Function} condition The condition which determines if the source will be repeated.
   * @param {Observable} source The observable sequence that will be run if the condition function returns true.
   * @returns {Observable} An observable sequence which is repeated as long as the condition holds.  
   */
  var observableWhileDo = Observable['while'] = Observable.whileDo = function (condition, source) {
    isPromise(source) && (source = observableFromPromise(source));
    return enumerableWhile(condition, source).concat();
  };

     /**
     *  Repeats source as long as condition holds emulating a do while loop.
     *
     * @param {Function} condition The condition which determines if the source will be repeated.
     * @param {Observable} source The observable sequence that will be run if the condition function returns true.
     * @returns {Observable} An observable sequence which is repeated as long as the condition holds. 
     */ 
    observableProto.doWhile = function (condition) {
        return observableConcat([this, observableWhileDo(condition, this)]);
    };

   /**
   *  Uses selector to determine which source in sources to use.
   *  There is an alias 'switchCase' for browsers <IE9.
   *  
   * @example
   *  1 - res = Rx.Observable.case(selector, { '1': obs1, '2': obs2 });
   *  1 - res = Rx.Observable.case(selector, { '1': obs1, '2': obs2 }, obs0);
   *  1 - res = Rx.Observable.case(selector, { '1': obs1, '2': obs2 }, scheduler);
   * 
   * @param {Function} selector The function which extracts the value for to test in a case statement.
   * @param {Array} sources A object which has keys which correspond to the case statement labels.
   * @param {Observable} [elseSource] The observable sequence or Promise that will be run if the sources are not matched. If this is not provided, it defaults to Rx.Observabe.empty with the specified scheduler.
   *       
   * @returns {Observable} An observable sequence which is determined by a case statement.  
   */
  Observable['case'] = Observable.switchCase = function (selector, sources, defaultSourceOrScheduler) {
    return observableDefer(function () {
      defaultSourceOrScheduler || (defaultSourceOrScheduler = observableEmpty());

      typeof defaultSourceOrScheduler.now === 'function' && (defaultSourceOrScheduler = observableEmpty(defaultSourceOrScheduler));
      
      var result = sources[selector()];
      isPromise(result) && (result = observableFromPromise(result));
      
      return result || defaultSourceOrScheduler;
    });
  };

     /**
     *  Expands an observable sequence by recursively invoking selector.
     *  
     * @param {Function} selector Selector function to invoke for each produced element, resulting in another sequence to which the selector will be invoked recursively again.
     * @param {Scheduler} [scheduler] Scheduler on which to perform the expansion. If not provided, this defaults to the current thread scheduler.
     * @returns {Observable} An observable sequence containing all the elements produced by the recursive expansion.
     */
    observableProto.expand = function (selector, scheduler) {
        scheduler || (scheduler = immediateScheduler);
        var source = this;
        return new AnonymousObservable(function (observer) {
            var q = [],
                m = new SerialDisposable(),
                d = new CompositeDisposable(m),
                activeCount = 0,
                isAcquired = false;

            var ensureActive = function () {
                var isOwner = false;
                if (q.length > 0) {
                    isOwner = !isAcquired;
                    isAcquired = true;
                }
                if (isOwner) {
                    m.setDisposable(scheduler.scheduleRecursive(function (self) {
                        var work;
                        if (q.length > 0) {
                            work = q.shift();
                        } else {
                            isAcquired = false;
                            return;
                        }
                        var m1 = new SingleAssignmentDisposable();
                        d.add(m1);
                        m1.setDisposable(work.subscribe(function (x) {
                            observer.onNext(x);
                            var result = null;
                            try {
                                result = selector(x);
                            } catch (e) {
                                observer.onError(e);
                            }
                            q.push(result);
                            activeCount++;
                            ensureActive();
                        }, observer.onError.bind(observer), function () {
                            d.remove(m1);
                            activeCount--;
                            if (activeCount === 0) {
                                observer.onCompleted();
                            }
                        }));
                        self();
                    }));
                }
            };

            q.push(source);
            activeCount++;
            ensureActive();
            return d;
        });
    };

   /**
   *  Runs all observable sequences in parallel and collect their last elements.
   *  
   * @example
   *  1 - res = Rx.Observable.forkJoin([obs1, obs2]);
   *  1 - res = Rx.Observable.forkJoin(obs1, obs2, ...);  
   * @returns {Observable} An observable sequence with an array collecting the last elements of all the input sequences.
   */
  Observable.forkJoin = function () {
    var allSources = argsOrArray(arguments, 0);
    return new AnonymousObservable(function (subscriber) {
      var count = allSources.length;
      if (count === 0) {
        subscriber.onCompleted();
        return disposableEmpty;
      }
      var group = new CompositeDisposable(),
        finished = false,
        hasResults = new Array(count),
        hasCompleted = new Array(count),
        results = new Array(count);

      for (var idx = 0; idx < count; idx++) {
        (function (i) {
          var source = allSources[i];
          isPromise(source) && (source = observableFromPromise(source));
          group.add(
            source.subscribe(
              function (value) {
              if (!finished) {
                hasResults[i] = true;
                results[i] = value;
              }
            }, 
            function (e) {
              finished = true;
              subscriber.onError(e);
              group.dispose();
            }, 
            function () {
              if (!finished) {
                if (!hasResults[i]) {
                    subscriber.onCompleted();
                    return;
                }
                hasCompleted[i] = true;
                for (var ix = 0; ix < count; ix++) {
                  if (!hasCompleted[ix]) { return; }
                }
                finished = true;
                subscriber.onNext(results);
                subscriber.onCompleted();
              }
            }));
        })(idx);
      }

      return group;
    });
  };

   /**
   *  Runs two observable sequences in parallel and combines their last elemenets.
   *
   * @param {Observable} second Second observable sequence.
   * @param {Function} resultSelector Result selector function to invoke with the last elements of both sequences.
   * @returns {Observable} An observable sequence with the result of calling the selector function with the last elements of both input sequences.
   */
  observableProto.forkJoin = function (second, resultSelector) {
    var first = this;

    return new AnonymousObservable(function (observer) {
      var leftStopped = false, rightStopped = false,
        hasLeft = false, hasRight = false,
        lastLeft, lastRight,
        leftSubscription = new SingleAssignmentDisposable(), rightSubscription = new SingleAssignmentDisposable();

      isPromise(second) && (second = observableFromPromise(second));

      leftSubscription.setDisposable(
          first.subscribe(function (left) {
            hasLeft = true;
            lastLeft = left;
          }, function (err) {
            rightSubscription.dispose();
            observer.onError(err);
          }, function () {
            leftStopped = true;
            if (rightStopped) {
              if (!hasLeft) {
                  observer.onCompleted();
              } else if (!hasRight) {
                  observer.onCompleted();
              } else {
                var result;
                try {
                  result = resultSelector(lastLeft, lastRight);
                } catch (e) {
                  observer.onError(e);
                  return;
                }
                observer.onNext(result);
                observer.onCompleted();
              }
            }
          })
      );

      rightSubscription.setDisposable(
        second.subscribe(function (right) {
          hasRight = true;
          lastRight = right;
        }, function (err) {
          leftSubscription.dispose();
          observer.onError(err);
        }, function () {
          rightStopped = true;
          if (leftStopped) {
            if (!hasLeft) {
              observer.onCompleted();
            } else if (!hasRight) {
              observer.onCompleted();
            } else {
              var result;
              try {
                result = resultSelector(lastLeft, lastRight);
              } catch (e) {
                observer.onError(e);
                return;
              }
              observer.onNext(result);
              observer.onCompleted();
            }
          }
        })
      );

      return new CompositeDisposable(leftSubscription, rightSubscription);
    });
  };

    /**
     * Comonadic bind operator.
     * @param {Function} selector A transform function to apply to each element.
     * @param {Object} scheduler Scheduler used to execute the operation. If not specified, defaults to the ImmediateScheduler.
     * @returns {Observable} An observable sequence which results from the comonadic bind operation.
     */
    observableProto.manySelect = function (selector, scheduler) {
        scheduler || (scheduler = immediateScheduler);
        var source = this;
        return observableDefer(function () {
            var chain;

            return source
                .select(
                    function (x) {
                        var curr = new ChainObservable(x);
                        if (chain) {
                            chain.onNext(x);
                        }
                        chain = curr;

                        return curr;
                    })
                .doAction(
                    noop,
                    function (e) {
                        if (chain) {
                            chain.onError(e);
                        }
                    },
                    function () {
                        if (chain) {
                            chain.onCompleted();
                        }
                    })
                .observeOn(scheduler)
                .select(function (x, i, o) { return selector(x, i, o); });
        });
    };

    var ChainObservable = (function (_super) {

        function subscribe (observer) {
            var self = this, g = new CompositeDisposable();
            g.add(currentThreadScheduler.schedule(function () {
                observer.onNext(self.head);
                g.add(self.tail.mergeObservable().subscribe(observer));
            }));

            return g;
        }

        inherits(ChainObservable, _super);

        function ChainObservable(head) {
            _super.call(this, subscribe);
            this.head = head;
            this.tail = new AsyncSubject();
        }

        addProperties(ChainObservable.prototype, Observer, {
            onCompleted: function () {
                this.onNext(Observable.empty());
            },
            onError: function (e) {
                this.onNext(Observable.throwException(e));
            },
            onNext: function (v) {
                this.tail.onNext(v);
                this.tail.onCompleted();
            }
        });

        return ChainObservable;

    }(Observable));

    return Rx;
}));
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./rx":15}],14:[function(require,module,exports){
(function (global){
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.txt in the project root for license information.

;(function (factory) {
    var objectTypes = {
        'boolean': false,
        'function': true,
        'object': true,
        'number': false,
        'string': false,
        'undefined': false
    };

    var root = (objectTypes[typeof window] && window) || this,
        freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports,
        freeModule = objectTypes[typeof module] && module && !module.nodeType && module,
        moduleExports = freeModule && freeModule.exports === freeExports && freeExports,
        freeGlobal = objectTypes[typeof global] && global;
    
    if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
        root = freeGlobal;
    }

    // Because of build optimizers
    if (typeof define === 'function' && define.amd) {
        define(['rx', 'exports'], function (Rx, exports) {
            root.Rx = factory(root, exports, Rx);
            return root.Rx;
        });
    } else if (typeof module === 'object' && module && module.exports === freeExports) {
        module.exports = factory(root, module.exports, require('./rx'));
    } else {
        root.Rx = factory(root, {}, root.Rx);
    }
}.call(this, function (root, exp, Rx, undefined) {
    
    // Aliases
    var Observable = Rx.Observable,
        observableProto = Observable.prototype,
        AnonymousObservable = Rx.AnonymousObservable,
        observableThrow = Observable.throwException,
        observerCreate = Rx.Observer.create,
        SingleAssignmentDisposable = Rx.SingleAssignmentDisposable,
        CompositeDisposable = Rx.CompositeDisposable,
        AbstractObserver = Rx.internals.AbstractObserver,
        noop = Rx.helpers.noop,
        defaultComparer = Rx.internals.isEqual,
        inherits = Rx.internals.inherits,
        slice = Array.prototype.slice;

    // Utilities
    function argsOrArray(args, idx) {
        return args.length === 1 && Array.isArray(args[idx]) ?
            args[idx] :
            slice.call(args);
    }

    /** @private */
    var Map = (function () {

        /**
         * @constructor
         * @private
         */
        function Map() {
            this.keys = [];
            this.values = [];
        }

        /**
         * @private
         * @memberOf Map#
         */
        Map.prototype['delete'] = function (key) {
            var i = this.keys.indexOf(key);
            if (i !== -1) {
                this.keys.splice(i, 1);
                this.values.splice(i, 1);
            }
            return i !== -1;
        };

        /**
         * @private
         * @memberOf Map#
         */
        Map.prototype.get = function (key, fallback) {
            var i = this.keys.indexOf(key);
            return i !== -1 ? this.values[i] : fallback;
        };

        /**
         * @private
         * @memberOf Map#
         */
        Map.prototype.set = function (key, value) {
            var i = this.keys.indexOf(key);
            if (i !== -1) {
                this.values[i] = value;
            }
            this.values[this.keys.push(key) - 1] = value;
        };

        /**
         * @private
         * @memberOf Map#
         */
        Map.prototype.size = function () { return this.keys.length; };

        /**
         * @private
         * @memberOf Map#
         */        
        Map.prototype.has = function (key) {
            return this.keys.indexOf(key) !== -1;
        };

        /**
         * @private
         * @memberOf Map#
         */        
        Map.prototype.getKeys = function () { return this.keys.slice(0); };

        /**
         * @private
         * @memberOf Map#
         */        
        Map.prototype.getValues = function () { return this.values.slice(0); };

        return Map;
    }());

    /**
     * @constructor
     * Represents a join pattern over observable sequences.
     */
    function Pattern(patterns) {
        this.patterns = patterns;
    }

    /**
     *  Creates a pattern that matches the current plan matches and when the specified observable sequences has an available value.
     *  
     *  @param other Observable sequence to match in addition to the current pattern.
     *  @return Pattern object that matches when all observable sequences in the pattern have an available value.   
     */ 
    Pattern.prototype.and = function (other) {
        var patterns = this.patterns.slice(0);
        patterns.push(other);
        return new Pattern(patterns);
    };

    /**
     *  Matches when all observable sequences in the pattern (specified using a chain of and operators) have an available value and projects the values.
     *  
     *  @param selector Selector that will be invoked with available values from the source sequences, in the same order of the sequences in the pattern.
     *  @return Plan that produces the projected values, to be fed (with other plans) to the when operator.
     */
    Pattern.prototype.then = function (selector) {
        return new Plan(this, selector);
    };

    function Plan(expression, selector) {
        this.expression = expression;
        this.selector = selector;
    }
    
    Plan.prototype.activate = function (externalSubscriptions, observer, deactivate) {
        var self = this;
        var joinObservers = [];
        for (var i = 0, len = this.expression.patterns.length; i < len; i++) {
            joinObservers.push(planCreateObserver(externalSubscriptions, this.expression.patterns[i], observer.onError.bind(observer)));
        }
        var activePlan = new ActivePlan(joinObservers, function () {
            var result;
            try {
                result = self.selector.apply(self, arguments);
            } catch (exception) {
                observer.onError(exception);
                return;
            }
            observer.onNext(result);
        }, function () {
            for (var j = 0, jlen = joinObservers.length; j < jlen; j++) {
                joinObservers[j].removeActivePlan(activePlan);
            }
            deactivate(activePlan);
        });
        for (i = 0, len = joinObservers.length; i < len; i++) {
            joinObservers[i].addActivePlan(activePlan);
        }
        return activePlan;
    };

    function planCreateObserver(externalSubscriptions, observable, onError) {
        var entry = externalSubscriptions.get(observable);
        if (!entry) {
            var observer = new JoinObserver(observable, onError);
            externalSubscriptions.set(observable, observer);
            return observer;
        }
        return entry;
    }

    // Active Plan
    function ActivePlan(joinObserverArray, onNext, onCompleted) {
        var i, joinObserver;
        this.joinObserverArray = joinObserverArray;
        this.onNext = onNext;
        this.onCompleted = onCompleted;
        this.joinObservers = new Map();
        for (i = 0; i < this.joinObserverArray.length; i++) {
            joinObserver = this.joinObserverArray[i];
            this.joinObservers.set(joinObserver, joinObserver);
        }
    }

    ActivePlan.prototype.dequeue = function () {
        var values = this.joinObservers.getValues();
        for (var i = 0, len = values.length; i < len; i++) {
            values[i].queue.shift();
        }
    };
    ActivePlan.prototype.match = function () {
        var firstValues, i, len, isCompleted, values, hasValues = true;
        for (i = 0, len = this.joinObserverArray.length; i < len; i++) {
            if (this.joinObserverArray[i].queue.length === 0) {
                hasValues = false;
                break;
            }
        }
        if (hasValues) {
            firstValues = [];
            isCompleted = false;
            for (i = 0, len = this.joinObserverArray.length; i < len; i++) {
                firstValues.push(this.joinObserverArray[i].queue[0]);
                if (this.joinObserverArray[i].queue[0].kind === 'C') {
                    isCompleted = true;
                }
            }
            if (isCompleted) {
                this.onCompleted();
            } else {
                this.dequeue();
                values = [];
                for (i = 0; i < firstValues.length; i++) {
                    values.push(firstValues[i].value);
                }
                this.onNext.apply(this, values);
            }
        }
    };

    /** @private */
    var JoinObserver = (function (_super) {

        inherits(JoinObserver, _super);

        /**
         * @constructor
         * @private
         */
        function JoinObserver(source, onError) {
            _super.call(this);
            this.source = source;
            this.onError = onError;
            this.queue = [];
            this.activePlans = [];
            this.subscription = new SingleAssignmentDisposable();
            this.isDisposed = false;
        }

        var JoinObserverPrototype = JoinObserver.prototype;

        /**
         * @memberOf JoinObserver#
         * @private
         */
        JoinObserverPrototype.next = function (notification) {
            if (!this.isDisposed) {
                if (notification.kind === 'E') {
                    this.onError(notification.exception);
                    return;
                }
                this.queue.push(notification);
                var activePlans = this.activePlans.slice(0);
                for (var i = 0, len = activePlans.length; i < len; i++) {
                    activePlans[i].match();
                }
            }
        };

        /**
         * @memberOf JoinObserver#
         * @private
         */        
        JoinObserverPrototype.error = noop;

        /**
         * @memberOf JoinObserver#
         * @private
         */        
        JoinObserverPrototype.completed = noop;

        /**
         * @memberOf JoinObserver#
         * @private
         */
        JoinObserverPrototype.addActivePlan = function (activePlan) {
            this.activePlans.push(activePlan);
        };

        /**
         * @memberOf JoinObserver#
         * @private
         */        
        JoinObserverPrototype.subscribe = function () {
            this.subscription.setDisposable(this.source.materialize().subscribe(this));
        };

        /**
         * @memberOf JoinObserver#
         * @private
         */        
        JoinObserverPrototype.removeActivePlan = function (activePlan) {
            var idx = this.activePlans.indexOf(activePlan);
            this.activePlans.splice(idx, 1);
            if (this.activePlans.length === 0) {
                this.dispose();
            }
        };

        /**
         * @memberOf JoinObserver#
         * @private
         */        
        JoinObserverPrototype.dispose = function () {
            _super.prototype.dispose.call(this);
            if (!this.isDisposed) {
                this.isDisposed = true;
                this.subscription.dispose();
            }
        };
        
        return JoinObserver;
    } (AbstractObserver));

    /**
     *  Creates a pattern that matches when both observable sequences have an available value.
     *  
     *  @param right Observable sequence to match with the current sequence.
     *  @return {Pattern} Pattern object that matches when both observable sequences have an available value.     
     */
    observableProto.and = function (right) {
        return new Pattern([this, right]);
    };

    /**
     *  Matches when the observable sequence has an available value and projects the value.
     *  
     *  @param selector Selector that will be invoked for values in the source sequence.
     *  @returns {Plan} Plan that produces the projected values, to be fed (with other plans) to the when operator. 
     */    
    observableProto.then = function (selector) {
        return new Pattern([this]).then(selector);
    };

    /**
     *  Joins together the results from several patterns.
     *  
     *  @param plans A series of plans (specified as an Array of as a series of arguments) created by use of the Then operator on patterns.
     *  @returns {Observable} Observable sequence with the results form matching several patterns. 
     */
    Observable.when = function () {
        var plans = argsOrArray(arguments, 0);
        return new AnonymousObservable(function (observer) {
            var activePlans = [],
                externalSubscriptions = new Map(),
                group,
                i, len,
                joinObserver,
                joinValues,
                outObserver;
            outObserver = observerCreate(observer.onNext.bind(observer), function (exception) {
                var values = externalSubscriptions.getValues();
                for (var j = 0, jlen = values.length; j < jlen; j++) {
                    values[j].onError(exception);
                }
                observer.onError(exception);
            }, observer.onCompleted.bind(observer));
            try {
                for (i = 0, len = plans.length; i < len; i++) {
                    activePlans.push(plans[i].activate(externalSubscriptions, outObserver, function (activePlan) {
                        var idx = activePlans.indexOf(activePlan);
                        activePlans.splice(idx, 1);
                        if (activePlans.length === 0) {
                            outObserver.onCompleted();
                        }
                    }));
                }
            } catch (e) {
                observableThrow(e).subscribe(observer);
            }
            group = new CompositeDisposable();
            joinValues = externalSubscriptions.getValues();
            for (i = 0, len = joinValues.length; i < len; i++) {
                joinObserver = joinValues[i];
                joinObserver.subscribe();
                group.add(joinObserver);
            }
            return group;
        });
    };

    return Rx;
}));
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./rx":15}],15:[function(require,module,exports){
(function (process,global){
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.txt in the project root for license information.

;(function (undefined) {

  var objectTypes = {
    'boolean': false,
    'function': true,
    'object': true,
    'number': false,
    'string': false,
    'undefined': false
  };

  var root = (objectTypes[typeof window] && window) || this,
    freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports,
    freeModule = objectTypes[typeof module] && module && !module.nodeType && module,
    moduleExports = freeModule && freeModule.exports === freeExports && freeExports,
    freeGlobal = objectTypes[typeof global] && global;
  
  if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
    root = freeGlobal;
  }

  var Rx = { 
      internals: {}, 
      config: {
        Promise: root.Promise // Detect if promise exists
      },
      helpers: { }
  };
    
  // Defaults
  var noop = Rx.helpers.noop = function () { },
    identity = Rx.helpers.identity = function (x) { return x; },
    defaultNow = Rx.helpers.defaultNow = Date.now,
    defaultComparer = Rx.helpers.defaultComparer = function (x, y) { return isEqual(x, y); },
    defaultSubComparer = Rx.helpers.defaultSubComparer = function (x, y) { return x > y ? 1 : (x < y ? -1 : 0); },
    defaultKeySerializer = Rx.helpers.defaultKeySerializer = function (x) { return x.toString(); },
    defaultError = Rx.helpers.defaultError = function (err) { throw err; },
    isPromise = Rx.helpers.isPromise = function (p) { return !!p && typeof p.then === 'function' && p.then !== Rx.Observable.prototype.then; },
    asArray = Rx.helpers.asArray = function () { return Array.prototype.slice.call(arguments); },
    not = Rx.helpers.not = function (a) { return !a; };

  // Errors
  var sequenceContainsNoElements = 'Sequence contains no elements.';
  var argumentOutOfRange = 'Argument out of range';
  var objectDisposed = 'Object has been disposed';
  function checkDisposed() { if (this.isDisposed) { throw new Error(objectDisposed); } }  
  
  // Shim in iterator support
  var $iterator$ = (typeof Symbol === 'object' && Symbol.iterator) ||
    '_es6shim_iterator_';
  // Firefox ships a partial implementation using the name @@iterator.
  // https://bugzilla.mozilla.org/show_bug.cgi?id=907077#c14
  // So use that name if we detect it.
  if (root.Set && typeof new root.Set()['@@iterator'] === 'function') {
    $iterator$ = '@@iterator';
  }
  var doneEnumerator = { done: true, value: undefined };

  /** `Object#toString` result shortcuts */
  var argsClass = '[object Arguments]',
    arrayClass = '[object Array]',
    boolClass = '[object Boolean]',
    dateClass = '[object Date]',
    errorClass = '[object Error]',
    funcClass = '[object Function]',
    numberClass = '[object Number]',
    objectClass = '[object Object]',
    regexpClass = '[object RegExp]',
    stringClass = '[object String]';

  var toString = Object.prototype.toString,
    hasOwnProperty = Object.prototype.hasOwnProperty,  
    supportsArgsClass = toString.call(arguments) == argsClass, // For less <IE9 && FF<4
    suportNodeClass,
    errorProto = Error.prototype,
    objectProto = Object.prototype,
    propertyIsEnumerable = objectProto.propertyIsEnumerable;

  try {
      suportNodeClass = !(toString.call(document) == objectClass && !({ 'toString': 0 } + ''));
  } catch(e) {
      suportNodeClass = true;
  }

  var shadowedProps = [
    'constructor', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'valueOf'
  ];

  var nonEnumProps = {};
  nonEnumProps[arrayClass] = nonEnumProps[dateClass] = nonEnumProps[numberClass] = { 'constructor': true, 'toLocaleString': true, 'toString': true, 'valueOf': true };
  nonEnumProps[boolClass] = nonEnumProps[stringClass] = { 'constructor': true, 'toString': true, 'valueOf': true };
  nonEnumProps[errorClass] = nonEnumProps[funcClass] = nonEnumProps[regexpClass] = { 'constructor': true, 'toString': true };
  nonEnumProps[objectClass] = { 'constructor': true };

  var support = {};
  (function () {
    var ctor = function() { this.x = 1; },
      props = [];

    ctor.prototype = { 'valueOf': 1, 'y': 1 };
    for (var key in new ctor) { props.push(key); }      
    for (key in arguments) { }

    // Detect if `name` or `message` properties of `Error.prototype` are enumerable by default.
    support.enumErrorProps = propertyIsEnumerable.call(errorProto, 'message') || propertyIsEnumerable.call(errorProto, 'name');

    // Detect if `prototype` properties are enumerable by default.
    support.enumPrototypes = propertyIsEnumerable.call(ctor, 'prototype');

    // Detect if `arguments` object indexes are non-enumerable
    support.nonEnumArgs = key != 0;

    // Detect if properties shadowing those on `Object.prototype` are non-enumerable.
    support.nonEnumShadows = !/valueOf/.test(props);
  }(1));

  function isObject(value) {
    // check if the value is the ECMAScript language type of Object
    // http://es5.github.io/#x8
    // and avoid a V8 bug
    // https://code.google.com/p/v8/issues/detail?id=2291
    var type = typeof value;
    return value && (type == 'function' || type == 'object') || false;
  }

  function keysIn(object) {
    var result = [];
    if (!isObject(object)) {
      return result;
    }
    if (support.nonEnumArgs && object.length && isArguments(object)) {
      object = slice.call(object);
    }
    var skipProto = support.enumPrototypes && typeof object == 'function',
        skipErrorProps = support.enumErrorProps && (object === errorProto || object instanceof Error);

    for (var key in object) {
      if (!(skipProto && key == 'prototype') &&
          !(skipErrorProps && (key == 'message' || key == 'name'))) {
        result.push(key);
      }
    }

    if (support.nonEnumShadows && object !== objectProto) {
      var ctor = object.constructor,
          index = -1,
          length = shadowedProps.length;

      if (object === (ctor && ctor.prototype)) {
        var className = object === stringProto ? stringClass : object === errorProto ? errorClass : toString.call(object),
            nonEnum = nonEnumProps[className];
      }
      while (++index < length) {
        key = shadowedProps[index];
        if (!(nonEnum && nonEnum[key]) && hasOwnProperty.call(object, key)) {
          result.push(key);
        }
      }
    }
    return result;
  }

  function internalFor(object, callback, keysFunc) {
    var index = -1,
      props = keysFunc(object),
      length = props.length;

    while (++index < length) {
      var key = props[index];
      if (callback(object[key], key, object) === false) {
        break;
      }
    }
    return object;
  }   

  function internalForIn(object, callback) {
    return internalFor(object, callback, keysIn);
  }

  function isNode(value) {
    // IE < 9 presents DOM nodes as `Object` objects except they have `toString`
    // methods that are `typeof` "string" and still can coerce nodes to strings
    return typeof value.toString != 'function' && typeof (value + '') == 'string';
  }

  function isArguments(value) {
    return (value && typeof value == 'object') ? toString.call(value) == argsClass : false;
  }

  // fallback for browsers that can't detect `arguments` objects by [[Class]]
  if (!supportsArgsClass) {
    isArguments = function(value) {
      return (value && typeof value == 'object') ? hasOwnProperty.call(value, 'callee') : false;
    };
  }

  function isFunction(value) {
    return typeof value == 'function';
  }

  // fallback for older versions of Chrome and Safari
  if (isFunction(/x/)) {
    isFunction = function(value) {
      return typeof value == 'function' && toString.call(value) == funcClass;
    };
  }        

  var isEqual = Rx.internals.isEqual = function (x, y) {
    return deepEquals(x, y, [], []); 
  };

  /** @private
   * Used for deep comparison
   **/
  function deepEquals(a, b, stackA, stackB) {
    // exit early for identical values
    if (a === b) {
      // treat `+0` vs. `-0` as not equal
      return a !== 0 || (1 / a == 1 / b);
    }

    var type = typeof a,
        otherType = typeof b;

    // exit early for unlike primitive values
    if (a === a && (a == null || b == null ||
        (type != 'function' && type != 'object' && otherType != 'function' && otherType != 'object'))) {
      return false;
    }

    // compare [[Class]] names
    var className = toString.call(a),
        otherClass = toString.call(b);

    if (className == argsClass) {
      className = objectClass;
    }
    if (otherClass == argsClass) {
      otherClass = objectClass;
    }
    if (className != otherClass) {
      return false;
    }
    switch (className) {
      case boolClass:
      case dateClass:
        // coerce dates and booleans to numbers, dates to milliseconds and booleans
        // to `1` or `0` treating invalid dates coerced to `NaN` as not equal
        return +a == +b;

      case numberClass:
        // treat `NaN` vs. `NaN` as equal
        return (a != +a)
          ? b != +b
          // but treat `-0` vs. `+0` as not equal
          : (a == 0 ? (1 / a == 1 / b) : a == +b);

      case regexpClass:
      case stringClass:
        // coerce regexes to strings (http://es5.github.io/#x15.10.6.4)
        // treat string primitives and their corresponding object instances as equal
        return a == String(b);
    }
    var isArr = className == arrayClass;
    if (!isArr) {

      // exit for functions and DOM nodes
      if (className != objectClass || (!support.nodeClass && (isNode(a) || isNode(b)))) {
        return false;
      }
      // in older versions of Opera, `arguments` objects have `Array` constructors
      var ctorA = !support.argsObject && isArguments(a) ? Object : a.constructor,
          ctorB = !support.argsObject && isArguments(b) ? Object : b.constructor;

      // non `Object` object instances with different constructors are not equal
      if (ctorA != ctorB &&
            !(hasOwnProperty.call(a, 'constructor') && hasOwnProperty.call(b, 'constructor')) &&
            !(isFunction(ctorA) && ctorA instanceof ctorA && isFunction(ctorB) && ctorB instanceof ctorB) &&
            ('constructor' in a && 'constructor' in b)
          ) {
        return false;
      }
    }
    // assume cyclic structures are equal
    // the algorithm for detecting cyclic structures is adapted from ES 5.1
    // section 15.12.3, abstract operation `JO` (http://es5.github.io/#x15.12.3)
    var initedStack = !stackA;
    stackA || (stackA = []);
    stackB || (stackB = []);

    var length = stackA.length;
    while (length--) {
      if (stackA[length] == a) {
        return stackB[length] == b;
      }
    }
    var size = 0;
    result = true;

    // add `a` and `b` to the stack of traversed objects
    stackA.push(a);
    stackB.push(b);

    // recursively compare objects and arrays (susceptible to call stack limits)
    if (isArr) {
      // compare lengths to determine if a deep comparison is necessary
      length = a.length;
      size = b.length;
      result = size == length;

      if (result) {
        // deep compare the contents, ignoring non-numeric properties
        while (size--) {
          var index = length,
              value = b[size];

          if (!(result = deepEquals(a[size], value, stackA, stackB))) {
            break;
          }
        }
      }
    }
    else {
      // deep compare objects using `forIn`, instead of `forOwn`, to avoid `Object.keys`
      // which, in this case, is more costly
      internalForIn(b, function(value, key, b) {
        if (hasOwnProperty.call(b, key)) {
          // count the number of properties.
          size++;
          // deep compare each property value.
          return (result = hasOwnProperty.call(a, key) && deepEquals(a[key], value, stackA, stackB));
        }
      });

      if (result) {
        // ensure both objects have the same number of properties
        internalForIn(a, function(value, key, a) {
          if (hasOwnProperty.call(a, key)) {
            // `size` will be `-1` if `a` has more properties than `b`
            return (result = --size > -1);
          }
        });
      }
    }
    stackA.pop();
    stackB.pop();

    return result;
  }
    var slice = Array.prototype.slice;
    function argsOrArray(args, idx) {
        return args.length === 1 && Array.isArray(args[idx]) ?
            args[idx] :
            slice.call(args);
    }
    var hasProp = {}.hasOwnProperty;

    /** @private */
    var inherits = this.inherits = Rx.internals.inherits = function (child, parent) {
        function __() { this.constructor = child; }
        __.prototype = parent.prototype;
        child.prototype = new __();
    };

    /** @private */    
    var addProperties = Rx.internals.addProperties = function (obj) {
        var sources = slice.call(arguments, 1);
        for (var i = 0, len = sources.length; i < len; i++) {
            var source = sources[i];
            for (var prop in source) {
                obj[prop] = source[prop];
            }
        }
    };

    // Rx Utils
    var addRef = Rx.internals.addRef = function (xs, r) {
        return new AnonymousObservable(function (observer) {
            return new CompositeDisposable(r.getDisposable(), xs.subscribe(observer));
        });
    };

    // Collection polyfills
    function arrayInitialize(count, factory) {
        var a = new Array(count);
        for (var i = 0; i < count; i++) {
            a[i] = factory();
        }
        return a;
    }

    // Collections
    var IndexedItem = function (id, value) {
        this.id = id;
        this.value = value;
    };

    IndexedItem.prototype.compareTo = function (other) {
        var c = this.value.compareTo(other.value);
        if (c === 0) {
            c = this.id - other.id;
        }
        return c;
    };

    // Priority Queue for Scheduling
    var PriorityQueue = Rx.internals.PriorityQueue = function (capacity) {
        this.items = new Array(capacity);
        this.length = 0;
    };

    var priorityProto = PriorityQueue.prototype;
    priorityProto.isHigherPriority = function (left, right) {
        return this.items[left].compareTo(this.items[right]) < 0;
    };

    priorityProto.percolate = function (index) {
        if (index >= this.length || index < 0) {
            return;
        }
        var parent = index - 1 >> 1;
        if (parent < 0 || parent === index) {
            return;
        }
        if (this.isHigherPriority(index, parent)) {
            var temp = this.items[index];
            this.items[index] = this.items[parent];
            this.items[parent] = temp;
            this.percolate(parent);
        }
    };

    priorityProto.heapify = function (index) {
        if (index === undefined) {
            index = 0;
        }
        if (index >= this.length || index < 0) {
            return;
        }
        var left = 2 * index + 1,
            right = 2 * index + 2,
            first = index;
        if (left < this.length && this.isHigherPriority(left, first)) {
            first = left;
        }
        if (right < this.length && this.isHigherPriority(right, first)) {
            first = right;
        }
        if (first !== index) {
            var temp = this.items[index];
            this.items[index] = this.items[first];
            this.items[first] = temp;
            this.heapify(first);
        }
    };
    
    priorityProto.peek = function () {  return this.items[0].value; };

    priorityProto.removeAt = function (index) {
        this.items[index] = this.items[--this.length];
        delete this.items[this.length];
        this.heapify();
    };

    priorityProto.dequeue = function () {
        var result = this.peek();
        this.removeAt(0);
        return result;
    };

    priorityProto.enqueue = function (item) {
        var index = this.length++;
        this.items[index] = new IndexedItem(PriorityQueue.count++, item);
        this.percolate(index);
    };

    priorityProto.remove = function (item) {
        for (var i = 0; i < this.length; i++) {
            if (this.items[i].value === item) {
                this.removeAt(i);
                return true;
            }
        }
        return false;
    };
    PriorityQueue.count = 0;
    /**
     * Represents a group of disposable resources that are disposed together.
     * @constructor
     */
    var CompositeDisposable = Rx.CompositeDisposable = function () {
        this.disposables = argsOrArray(arguments, 0);
        this.isDisposed = false;
        this.length = this.disposables.length;
    };

    var CompositeDisposablePrototype = CompositeDisposable.prototype;

    /**
     * Adds a disposable to the CompositeDisposable or disposes the disposable if the CompositeDisposable is disposed.
     * @param {Mixed} item Disposable to add.
     */    
    CompositeDisposablePrototype.add = function (item) {
        if (this.isDisposed) {
            item.dispose();
        } else {
            this.disposables.push(item);
            this.length++;
        }
    };

    /**
     * Removes and disposes the first occurrence of a disposable from the CompositeDisposable.
     * @param {Mixed} item Disposable to remove.
     * @returns {Boolean} true if found; false otherwise.
     */
    CompositeDisposablePrototype.remove = function (item) {
        var shouldDispose = false;
        if (!this.isDisposed) {
            var idx = this.disposables.indexOf(item);
            if (idx !== -1) {
                shouldDispose = true;
                this.disposables.splice(idx, 1);
                this.length--;
                item.dispose();
            }

        }
        return shouldDispose;
    };

    /**
     *  Disposes all disposables in the group and removes them from the group.  
     */
    CompositeDisposablePrototype.dispose = function () {
        if (!this.isDisposed) {
            this.isDisposed = true;
            var currentDisposables = this.disposables.slice(0);
            this.disposables = [];
            this.length = 0;

            for (var i = 0, len = currentDisposables.length; i < len; i++) {
                currentDisposables[i].dispose();
            }
        }
    };

    /**
     * Removes and disposes all disposables from the CompositeDisposable, but does not dispose the CompositeDisposable.
     */   
    CompositeDisposablePrototype.clear = function () {
        var currentDisposables = this.disposables.slice(0);
        this.disposables = [];
        this.length = 0;
        for (var i = 0, len = currentDisposables.length; i < len; i++) {
            currentDisposables[i].dispose();
        }
    };

    /**
     * Determines whether the CompositeDisposable contains a specific disposable.    
     * @param {Mixed} item Disposable to search for.
     * @returns {Boolean} true if the disposable was found; otherwise, false.
     */    
    CompositeDisposablePrototype.contains = function (item) {
        return this.disposables.indexOf(item) !== -1;
    };

    /**
     * Converts the existing CompositeDisposable to an array of disposables
     * @returns {Array} An array of disposable objects.
     */  
    CompositeDisposablePrototype.toArray = function () {
        return this.disposables.slice(0);
    };
    
    /**
     * Provides a set of static methods for creating Disposables.
     *
     * @constructor 
     * @param {Function} dispose Action to run during the first call to dispose. The action is guaranteed to be run at most once.
     */
    var Disposable = Rx.Disposable = function (action) {
        this.isDisposed = false;
        this.action = action || noop;
    };

    /** Performs the task of cleaning up resources. */     
    Disposable.prototype.dispose = function () {
        if (!this.isDisposed) {
            this.action();
            this.isDisposed = true;
        }
    };

    /**
     * Creates a disposable object that invokes the specified action when disposed.
     * @param {Function} dispose Action to run during the first call to dispose. The action is guaranteed to be run at most once.
     * @return {Disposable} The disposable object that runs the given action upon disposal.
     */
    var disposableCreate = Disposable.create = function (action) { return new Disposable(action); };

    /** 
     * Gets the disposable that does nothing when disposed. 
     */
    var disposableEmpty = Disposable.empty = { dispose: noop };

    var BooleanDisposable = (function () {
        function BooleanDisposable (isSingle) {
            this.isSingle = isSingle;
            this.isDisposed = false;
            this.current = null;
        }

        var booleanDisposablePrototype = BooleanDisposable.prototype;

        /**
         * Gets the underlying disposable.
         * @return The underlying disposable.
         */
        booleanDisposablePrototype.getDisposable = function () {
            return this.current;
        };

        /**
         * Sets the underlying disposable.
         * @param {Disposable} value The new underlying disposable.
         */  
        booleanDisposablePrototype.setDisposable = function (value) {
            if (this.current && this.isSingle) {
                throw new Error('Disposable has already been assigned');
            }

            var shouldDispose = this.isDisposed, old;
            if (!shouldDispose) {
                old = this.current;
                this.current = value;
            }
            if (old) {
                old.dispose();
            }
            if (shouldDispose && value) {
                value.dispose();
            }
        };

        /** 
         * Disposes the underlying disposable as well as all future replacements.
         */
        booleanDisposablePrototype.dispose = function () {
            var old;
            if (!this.isDisposed) {
                this.isDisposed = true;
                old = this.current;
                this.current = null;
            }
            if (old) {
                old.dispose();
            }
        };

        return BooleanDisposable;
    }());

    /**
     * Represents a disposable resource which only allows a single assignment of its underlying disposable resource.
     * If an underlying disposable resource has already been set, future attempts to set the underlying disposable resource will throw an Error.
     */
    var SingleAssignmentDisposable = Rx.SingleAssignmentDisposable = (function (super_) {
        inherits(SingleAssignmentDisposable, super_);

        function SingleAssignmentDisposable() {
            super_.call(this, true);
        }

        return SingleAssignmentDisposable;
    }(BooleanDisposable));

    /**
     * Represents a disposable resource whose underlying disposable resource can be replaced by another disposable resource, causing automatic disposal of the previous underlying disposable resource.
     */
    var SerialDisposable = Rx.SerialDisposable = (function (super_) {
        inherits(SerialDisposable, super_);

        function SerialDisposable() {
            super_.call(this, false);
        }

        return SerialDisposable;
    }(BooleanDisposable));

    /**
     * Represents a disposable resource that only disposes its underlying disposable resource when all dependent disposable objects have been disposed.
     */  
    var RefCountDisposable = Rx.RefCountDisposable = (function () {

        function InnerDisposable(disposable) {
            this.disposable = disposable;
            this.disposable.count++;
            this.isInnerDisposed = false;
        }

        InnerDisposable.prototype.dispose = function () {
            if (!this.disposable.isDisposed) {
                if (!this.isInnerDisposed) {
                    this.isInnerDisposed = true;
                    this.disposable.count--;
                    if (this.disposable.count === 0 && this.disposable.isPrimaryDisposed) {
                        this.disposable.isDisposed = true;
                        this.disposable.underlyingDisposable.dispose();
                    }
                }
            }
        };

        /**
         * Initializes a new instance of the RefCountDisposable with the specified disposable.
         * @constructor
         * @param {Disposable} disposable Underlying disposable.
          */
        function RefCountDisposable(disposable) {
            this.underlyingDisposable = disposable;
            this.isDisposed = false;
            this.isPrimaryDisposed = false;
            this.count = 0;
        }

        /** 
         * Disposes the underlying disposable only when all dependent disposables have been disposed 
         */
        RefCountDisposable.prototype.dispose = function () {
            if (!this.isDisposed) {
                if (!this.isPrimaryDisposed) {
                    this.isPrimaryDisposed = true;
                    if (this.count === 0) {
                        this.isDisposed = true;
                        this.underlyingDisposable.dispose();
                    }
                }
            }
        };

        /**
         * Returns a dependent disposable that when disposed decreases the refcount on the underlying disposable.      
         * @returns {Disposable} A dependent disposable contributing to the reference count that manages the underlying disposable's lifetime.
         */        
        RefCountDisposable.prototype.getDisposable = function () {
            return this.isDisposed ? disposableEmpty : new InnerDisposable(this);
        };

        return RefCountDisposable;
    })();

    function ScheduledDisposable(scheduler, disposable) {
        this.scheduler = scheduler;
        this.disposable = disposable;
        this.isDisposed = false;
    }

    ScheduledDisposable.prototype.dispose = function () {
        var parent = this;
        this.scheduler.schedule(function () {
            if (!parent.isDisposed) {
                parent.isDisposed = true;
                parent.disposable.dispose();
            }
        });
    };

    var ScheduledItem = Rx.internals.ScheduledItem = function (scheduler, state, action, dueTime, comparer) {
        this.scheduler = scheduler;
        this.state = state;
        this.action = action;
        this.dueTime = dueTime;
        this.comparer = comparer || defaultSubComparer;
        this.disposable = new SingleAssignmentDisposable();
    }

    ScheduledItem.prototype.invoke = function () {
        this.disposable.setDisposable(this.invokeCore());
    };

    ScheduledItem.prototype.compareTo = function (other) {
        return this.comparer(this.dueTime, other.dueTime);
    };

    ScheduledItem.prototype.isCancelled = function () {
        return this.disposable.isDisposed;
    };

    ScheduledItem.prototype.invokeCore = function () {
        return this.action(this.scheduler, this.state);
    };

    /** Provides a set of static properties to access commonly used schedulers. */
    var Scheduler = Rx.Scheduler = (function () {

        /** 
         * @constructor 
         * @private
         */
        function Scheduler(now, schedule, scheduleRelative, scheduleAbsolute) {
            this.now = now;
            this._schedule = schedule;
            this._scheduleRelative = scheduleRelative;
            this._scheduleAbsolute = scheduleAbsolute;
        }

        function invokeRecImmediate(scheduler, pair) {
            var state = pair.first, action = pair.second, group = new CompositeDisposable(),
            recursiveAction = function (state1) {
                action(state1, function (state2) {
                    var isAdded = false, isDone = false,
                    d = scheduler.scheduleWithState(state2, function (scheduler1, state3) {
                        if (isAdded) {
                            group.remove(d);
                        } else {
                            isDone = true;
                        }
                        recursiveAction(state3);
                        return disposableEmpty;
                    });
                    if (!isDone) {
                        group.add(d);
                        isAdded = true;
                    }
                });
            };
            recursiveAction(state);
            return group;
        }

        function invokeRecDate(scheduler, pair, method) {
            var state = pair.first, action = pair.second, group = new CompositeDisposable(),
            recursiveAction = function (state1) {
                action(state1, function (state2, dueTime1) {
                    var isAdded = false, isDone = false,
                    d = scheduler[method].call(scheduler, state2, dueTime1, function (scheduler1, state3) {
                        if (isAdded) {
                            group.remove(d);
                        } else {
                            isDone = true;
                        }
                        recursiveAction(state3);
                        return disposableEmpty;
                    });
                    if (!isDone) {
                        group.add(d);
                        isAdded = true;
                    }
                });
            };
            recursiveAction(state);
            return group;
        }

        function invokeAction(scheduler, action) {
            action();
            return disposableEmpty;
        }

        var schedulerProto = Scheduler.prototype;

        /**
         * Returns a scheduler that wraps the original scheduler, adding exception handling for scheduled actions.       
         * @param {Function} handler Handler that's run if an exception is caught. The exception will be rethrown if the handler returns false.
         * @returns {Scheduler} Wrapper around the original scheduler, enforcing exception handling.
         */        
        schedulerProto.catchException = schedulerProto['catch'] = function (handler) {
            return new CatchScheduler(this, handler);
        };
        
        /**
         * Schedules a periodic piece of work by dynamically discovering the scheduler's capabilities. The periodic task will be scheduled using window.setInterval for the base implementation.       
         * @param {Number} period Period for running the work periodically.
         * @param {Function} action Action to be executed.
         * @returns {Disposable} The disposable object used to cancel the scheduled recurring action (best effort).
         */        
        schedulerProto.schedulePeriodic = function (period, action) {
            return this.schedulePeriodicWithState(null, period, function () {
                action();
            });
        };

        /**
         * Schedules a periodic piece of work by dynamically discovering the scheduler's capabilities. The periodic task will be scheduled using window.setInterval for the base implementation.       
         * @param {Mixed} state Initial state passed to the action upon the first iteration.
         * @param {Number} period Period for running the work periodically.
         * @param {Function} action Action to be executed, potentially updating the state.
         * @returns {Disposable} The disposable object used to cancel the scheduled recurring action (best effort).
         */
        schedulerProto.schedulePeriodicWithState = function (state, period, action) {
            var s = state, id = setInterval(function () {
                s = action(s);
            }, period);
            return disposableCreate(function () {
                clearInterval(id);
            });
        };

        /**
         * Schedules an action to be executed.        
         * @param {Function} action Action to execute.
         * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.schedule = function (action) {
            return this._schedule(action, invokeAction);
        };

        /**
         * Schedules an action to be executed.    
         * @param state State passed to the action to be executed.
         * @param {Function} action Action to be executed.
         * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleWithState = function (state, action) {
            return this._schedule(state, action);
        };

        /**
         * Schedules an action to be executed after the specified relative due time.       
         * @param {Function} action Action to execute.
         * @param {Number} dueTime Relative time after which to execute the action.
         * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleWithRelative = function (dueTime, action) {
            return this._scheduleRelative(action, dueTime, invokeAction);
        };

        /**
         * Schedules an action to be executed after dueTime.     
         * @param state State passed to the action to be executed.
         * @param {Function} action Action to be executed.
         * @param {Number} dueTime Relative time after which to execute the action.
         * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleWithRelativeAndState = function (state, dueTime, action) {
            return this._scheduleRelative(state, dueTime, action);
        };

        /**
         * Schedules an action to be executed at the specified absolute due time.    
         * @param {Function} action Action to execute.
         * @param {Number} dueTime Absolute time at which to execute the action.
         * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
          */
        schedulerProto.scheduleWithAbsolute = function (dueTime, action) {
            return this._scheduleAbsolute(action, dueTime, invokeAction);
        };

        /**
         * Schedules an action to be executed at dueTime.     
         * @param {Mixed} state State passed to the action to be executed.
         * @param {Function} action Action to be executed.
         * @param {Number}dueTime Absolute time at which to execute the action.
         * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleWithAbsoluteAndState = function (state, dueTime, action) {
            return this._scheduleAbsolute(state, dueTime, action);
        };

        /**
         * Schedules an action to be executed recursively.
         * @param {Function} action Action to execute recursively. The parameter passed to the action is used to trigger recursive scheduling of the action.
         * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleRecursive = function (action) {
            return this.scheduleRecursiveWithState(action, function (_action, self) {
                _action(function () {
                    self(_action);
                });
            });
        };

        /**
         * Schedules an action to be executed recursively.     
         * @param {Mixed} state State passed to the action to be executed.
         * @param {Function} action Action to execute recursively. The last parameter passed to the action is used to trigger recursive scheduling of the action, passing in recursive invocation state.
         * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleRecursiveWithState = function (state, action) {
            return this.scheduleWithState({ first: state, second: action }, function (s, p) {
                return invokeRecImmediate(s, p);
            });
        };

        /**
         * Schedules an action to be executed recursively after a specified relative due time.     
         * @param {Function} action Action to execute recursively. The parameter passed to the action is used to trigger recursive scheduling of the action at the specified relative time.
         * @param {Number}dueTime Relative time after which to execute the action for the first time.
         * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleRecursiveWithRelative = function (dueTime, action) {
            return this.scheduleRecursiveWithRelativeAndState(action, dueTime, function (_action, self) {
                _action(function (dt) {
                    self(_action, dt);
                });
            });
        };

        /**
         * Schedules an action to be executed recursively after a specified relative due time.  
         * @param {Mixed} state State passed to the action to be executed.
         * @param {Function} action Action to execute recursively. The last parameter passed to the action is used to trigger recursive scheduling of the action, passing in the recursive due time and invocation state.
         * @param {Number}dueTime Relative time after which to execute the action for the first time.
         * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleRecursiveWithRelativeAndState = function (state, dueTime, action) {
            return this._scheduleRelative({ first: state, second: action }, dueTime, function (s, p) {
                return invokeRecDate(s, p, 'scheduleWithRelativeAndState');
            });
        };

        /**
         * Schedules an action to be executed recursively at a specified absolute due time.    
         * @param {Function} action Action to execute recursively. The parameter passed to the action is used to trigger recursive scheduling of the action at the specified absolute time.
         * @param {Number}dueTime Absolute time at which to execute the action for the first time.
         * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleRecursiveWithAbsolute = function (dueTime, action) {
            return this.scheduleRecursiveWithAbsoluteAndState(action, dueTime, function (_action, self) {
                _action(function (dt) {
                    self(_action, dt);
                });
            });
        };

        /**
         * Schedules an action to be executed recursively at a specified absolute due time.     
         * @param {Mixed} state State passed to the action to be executed.
         * @param {Function} action Action to execute recursively. The last parameter passed to the action is used to trigger recursive scheduling of the action, passing in the recursive due time and invocation state.
         * @param {Number}dueTime Absolute time at which to execute the action for the first time.
         * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleRecursiveWithAbsoluteAndState = function (state, dueTime, action) {
            return this._scheduleAbsolute({ first: state, second: action }, dueTime, function (s, p) {
                return invokeRecDate(s, p, 'scheduleWithAbsoluteAndState');
            });
        };

        /** Gets the current time according to the local machine's system clock. */
        Scheduler.now = defaultNow;

        /**
         * Normalizes the specified TimeSpan value to a positive value.
         * @param {Number} timeSpan The time span value to normalize.
         * @returns {Number} The specified TimeSpan value if it is zero or positive; otherwise, 0
         */   
        Scheduler.normalize = function (timeSpan) {
            if (timeSpan < 0) {
                timeSpan = 0;
            }
            return timeSpan;
        };

        return Scheduler;
    }());

    var normalizeTime = Scheduler.normalize;
    
    var SchedulePeriodicRecursive = Rx.internals.SchedulePeriodicRecursive = (function () {
        function tick(command, recurse) {
            recurse(0, this._period);
            try {
                this._state = this._action(this._state);
            } catch (e) {
                this._cancel.dispose();
                throw e;
            }
        }

        function SchedulePeriodicRecursive(scheduler, state, period, action) {
            this._scheduler = scheduler;
            this._state = state;
            this._period = period;
            this._action = action;
        }

        SchedulePeriodicRecursive.prototype.start = function () {
            var d = new SingleAssignmentDisposable();
            this._cancel = d;
            d.setDisposable(this._scheduler.scheduleRecursiveWithRelativeAndState(0, this._period, tick.bind(this)));

            return d;
        };

        return SchedulePeriodicRecursive;
    }());

    /**
     * Gets a scheduler that schedules work immediately on the current thread.
     */    
    var immediateScheduler = Scheduler.immediate = (function () {

        function scheduleNow(state, action) { return action(this, state); }

        function scheduleRelative(state, dueTime, action) {
            var dt = normalizeTime(dt);
            while (dt - this.now() > 0) { }
            return action(this, state);
        }

        function scheduleAbsolute(state, dueTime, action) {
            return this.scheduleWithRelativeAndState(state, dueTime - this.now(), action);
        }

        return new Scheduler(defaultNow, scheduleNow, scheduleRelative, scheduleAbsolute);
    }());

    /** 
     * Gets a scheduler that schedules work as soon as possible on the current thread.
     */
    var currentThreadScheduler = Scheduler.currentThread = (function () {
        var queue;

        function runTrampoline (q) {
            var item;
            while (q.length > 0) {
                item = q.dequeue();
                if (!item.isCancelled()) {
                    // Note, do not schedule blocking work!
                    while (item.dueTime - Scheduler.now() > 0) {
                    }
                    if (!item.isCancelled()) {
                        item.invoke();
                    }
                }
            }            
        }

        function scheduleNow(state, action) {
            return this.scheduleWithRelativeAndState(state, 0, action);
        }

        function scheduleRelative(state, dueTime, action) {
            var dt = this.now() + Scheduler.normalize(dueTime),
                    si = new ScheduledItem(this, state, action, dt),
                    t;
            if (!queue) {
                queue = new PriorityQueue(4);
                queue.enqueue(si);
                try {
                    runTrampoline(queue);
                } catch (e) { 
                    throw e;
                } finally {
                    queue = null;
                }
            } else {
                queue.enqueue(si);
            }
            return si.disposable;
        }

        function scheduleAbsolute(state, dueTime, action) {
            return this.scheduleWithRelativeAndState(state, dueTime - this.now(), action);
        }

        var currentScheduler = new Scheduler(defaultNow, scheduleNow, scheduleRelative, scheduleAbsolute);
        currentScheduler.scheduleRequired = function () { return queue === null; };
        currentScheduler.ensureTrampoline = function (action) {
            if (queue === null) {
                return this.schedule(action);
            } else {
                return action();
            }
        };

        return currentScheduler;
    }());

    
    var scheduleMethod, clearMethod = noop;
    (function () {

        var reNative = RegExp('^' +
          String(toString)
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            .replace(/toString| for [^\]]+/g, '.*?') + '$'
        );

        var setImmediate = typeof (setImmediate = freeGlobal && moduleExports && freeGlobal.setImmediate) == 'function' &&
            !reNative.test(setImmediate) && setImmediate,
            clearImmediate = typeof (clearImmediate = freeGlobal && moduleExports && freeGlobal.clearImmediate) == 'function' &&
            !reNative.test(clearImmediate) && clearImmediate;

        function postMessageSupported () {
            // Ensure not in a worker
            if (!root.postMessage || root.importScripts) { return false; }
            var isAsync = false, 
                oldHandler = root.onmessage;
            // Test for async
            root.onmessage = function () { isAsync = true; };
            root.postMessage('','*');
            root.onmessage = oldHandler;

            return isAsync;
        }

        // Use in order, nextTick, setImmediate, postMessage, MessageChannel, script readystatechanged, setTimeout
        if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
            scheduleMethod = process.nextTick;
        } else if (typeof setImmediate === 'function') {
            scheduleMethod = setImmediate;
            clearMethod = clearImmediate;
        } else if (postMessageSupported()) {
            var MSG_PREFIX = 'ms.rx.schedule' + Math.random(),
                tasks = {},
                taskId = 0;

            function onGlobalPostMessage(event) {
                // Only if we're a match to avoid any other global events
                if (typeof event.data === 'string' && event.data.substring(0, MSG_PREFIX.length) === MSG_PREFIX) {
                    var handleId = event.data.substring(MSG_PREFIX.length),
                        action = tasks[handleId];
                    action();
                    delete tasks[handleId];
                }
            }

            if (root.addEventListener) {
                root.addEventListener('message', onGlobalPostMessage, false);
            } else {
                root.attachEvent('onmessage', onGlobalPostMessage, false);
            }

            scheduleMethod = function (action) {
                var currentId = taskId++;
                tasks[currentId] = action;
                root.postMessage(MSG_PREFIX + currentId, '*');
            };
        } else if (!!root.MessageChannel) {
            var channel = new root.MessageChannel(),
                channelTasks = {},
                channelTaskId = 0;

            channel.port1.onmessage = function (event) {
                var id = event.data,
                    action = channelTasks[id];
                action();
                delete channelTasks[id];
            };

            scheduleMethod = function (action) {
                var id = channelTaskId++;
                channelTasks[id] = action;
                channel.port2.postMessage(id);     
            };
        } else if ('document' in root && 'onreadystatechange' in root.document.createElement('script')) {
            
            scheduleMethod = function (action) {
                var scriptElement = root.document.createElement('script');
                scriptElement.onreadystatechange = function () { 
                    action();
                    scriptElement.onreadystatechange = null;
                    scriptElement.parentNode.removeChild(scriptElement);
                    scriptElement = null;  
                };
                root.document.documentElement.appendChild(scriptElement);  
            };
 
        } else {
            scheduleMethod = function (action) { return setTimeout(action, 0); };
            clearMethod = clearTimeout;
        }
    }());

    /** 
     * Gets a scheduler that schedules work via a timed callback based upon platform.
     */
    var timeoutScheduler = Scheduler.timeout = (function () {

        function scheduleNow(state, action) {
            var scheduler = this,
                disposable = new SingleAssignmentDisposable();
            var id = scheduleMethod(function () {
                if (!disposable.isDisposed) {
                    disposable.setDisposable(action(scheduler, state));
                }
            });
            return new CompositeDisposable(disposable, disposableCreate(function () {
                clearMethod(id);
            }));
        }

        function scheduleRelative(state, dueTime, action) {
            var scheduler = this,
                dt = Scheduler.normalize(dueTime);
            if (dt === 0) {
                return scheduler.scheduleWithState(state, action);
            }
            var disposable = new SingleAssignmentDisposable();
            var id = setTimeout(function () {
                if (!disposable.isDisposed) {
                    disposable.setDisposable(action(scheduler, state));
                }
            }, dt);
            return new CompositeDisposable(disposable, disposableCreate(function () {
                clearTimeout(id);
            }));
        }

        function scheduleAbsolute(state, dueTime, action) {
            return this.scheduleWithRelativeAndState(state, dueTime - this.now(), action);
        }

        return new Scheduler(defaultNow, scheduleNow, scheduleRelative, scheduleAbsolute);
    })();

    /** @private */
    var CatchScheduler = (function (_super) {

        function localNow() {
            return this._scheduler.now();
        }

        function scheduleNow(state, action) {
            return this._scheduler.scheduleWithState(state, this._wrap(action));
        }

        function scheduleRelative(state, dueTime, action) {
            return this._scheduler.scheduleWithRelativeAndState(state, dueTime, this._wrap(action));
        }

        function scheduleAbsolute(state, dueTime, action) {
            return this._scheduler.scheduleWithAbsoluteAndState(state, dueTime, this._wrap(action));
        }

        inherits(CatchScheduler, _super);

        /** @private */
        function CatchScheduler(scheduler, handler) {
            this._scheduler = scheduler;
            this._handler = handler;
            this._recursiveOriginal = null;
            this._recursiveWrapper = null;
            _super.call(this, localNow, scheduleNow, scheduleRelative, scheduleAbsolute);
        }

        /** @private */
        CatchScheduler.prototype._clone = function (scheduler) {
            return new CatchScheduler(scheduler, this._handler);
        };

        /** @private */
        CatchScheduler.prototype._wrap = function (action) {
            var parent = this;
            return function (self, state) {
                try {
                    return action(parent._getRecursiveWrapper(self), state);
                } catch (e) {
                    if (!parent._handler(e)) { throw e; }
                    return disposableEmpty;
                }
            };
        };

        /** @private */
        CatchScheduler.prototype._getRecursiveWrapper = function (scheduler) {
            if (this._recursiveOriginal !== scheduler) {
                this._recursiveOriginal = scheduler;
                var wrapper = this._clone(scheduler);
                wrapper._recursiveOriginal = scheduler;
                wrapper._recursiveWrapper = wrapper;
                this._recursiveWrapper = wrapper;
            }
            return this._recursiveWrapper;
        };

        /** @private */
        CatchScheduler.prototype.schedulePeriodicWithState = function (state, period, action) {
            var self = this, failed = false, d = new SingleAssignmentDisposable();

            d.setDisposable(this._scheduler.schedulePeriodicWithState(state, period, function (state1) {
                if (failed) { return null; }
                try {
                    return action(state1);
                } catch (e) {
                    failed = true;
                    if (!self._handler(e)) { throw e; }
                    d.dispose();
                    return null;
                }
            }));

            return d;
        };

        return CatchScheduler;
    }(Scheduler));

    /**
     *  Represents a notification to an observer.
     */
    var Notification = Rx.Notification = (function () {
        function Notification(kind, hasValue) { 
            this.hasValue = hasValue == null ? false : hasValue;
            this.kind = kind;
        }

        var NotificationPrototype = Notification.prototype;

        /**
         * Invokes the delegate corresponding to the notification or the observer's method corresponding to the notification and returns the produced result.
         * 
         * @memberOf Notification
         * @param {Any} observerOrOnNext Delegate to invoke for an OnNext notification or Observer to invoke the notification on..
         * @param {Function} onError Delegate to invoke for an OnError notification.
         * @param {Function} onCompleted Delegate to invoke for an OnCompleted notification.
         * @returns {Any} Result produced by the observation.
         */
        NotificationPrototype.accept = function (observerOrOnNext, onError, onCompleted) {
            if (arguments.length === 1 && typeof observerOrOnNext === 'object') {
                return this._acceptObservable(observerOrOnNext);
            }
            return this._accept(observerOrOnNext, onError, onCompleted);
        };

        /**
         * Returns an observable sequence with a single notification.
         * 
         * @memberOf Notification
         * @param {Scheduler} [scheduler] Scheduler to send out the notification calls on.
         * @returns {Observable} The observable sequence that surfaces the behavior of the notification upon subscription.
         */
        NotificationPrototype.toObservable = function (scheduler) {
            var notification = this;
            scheduler || (scheduler = immediateScheduler);
            return new AnonymousObservable(function (observer) {
                return scheduler.schedule(function () {
                    notification._acceptObservable(observer);
                    if (notification.kind === 'N') {
                        observer.onCompleted();
                    }
                });
            });
        };

        return Notification;
    })();

    /**
     * Creates an object that represents an OnNext notification to an observer.
     * @param {Any} value The value contained in the notification.
     * @returns {Notification} The OnNext notification containing the value.
     */
    var notificationCreateOnNext = Notification.createOnNext = (function () {

        function _accept (onNext) {
            return onNext(this.value);
        }

        function _acceptObservable(observer) {
            return observer.onNext(this.value);
        }

        function toString () {
            return 'OnNext(' + this.value + ')';
        }

        return function (value) {
            var notification = new Notification('N', true);
            notification.value = value;
            notification._accept = _accept;
            notification._acceptObservable = _acceptObservable;
            notification.toString = toString;
            return notification;
        };
    }());

    /**
     * Creates an object that represents an OnError notification to an observer.
     * @param {Any} error The exception contained in the notification.
     * @returns {Notification} The OnError notification containing the exception.
     */
    var notificationCreateOnError = Notification.createOnError = (function () {

        function _accept (onNext, onError) {
            return onError(this.exception);
        }

        function _acceptObservable(observer) {
            return observer.onError(this.exception);
        }

        function toString () {
            return 'OnError(' + this.exception + ')';
        }

        return function (exception) {
            var notification = new Notification('E');
            notification.exception = exception;
            notification._accept = _accept;
            notification._acceptObservable = _acceptObservable;
            notification.toString = toString;
            return notification;
        };
    }());

    /**
     * Creates an object that represents an OnCompleted notification to an observer.
     * @returns {Notification} The OnCompleted notification.
     */
    var notificationCreateOnCompleted = Notification.createOnCompleted = (function () {

        function _accept (onNext, onError, onCompleted) {
            return onCompleted();
        }

        function _acceptObservable(observer) {
            return observer.onCompleted();
        }

        function toString () {
            return 'OnCompleted()';
        }

        return function () {
            var notification = new Notification('C');
            notification._accept = _accept;
            notification._acceptObservable = _acceptObservable;
            notification.toString = toString;
            return notification;
        };
    }());

  var Enumerator = Rx.internals.Enumerator = function (next) {
    this._next = next;
  };

  Enumerator.prototype.next = function () {
    return this._next();
  };

  Enumerator.prototype[$iterator$] = function () { return this; }

  var Enumerable = Rx.internals.Enumerable = function (iterator) {
      this._iterator = iterator;
  };

  Enumerable.prototype[$iterator$] = function () {
      return this._iterator();
  };

  Enumerable.prototype.concat = function () {
      var sources = this;
      return new AnonymousObservable(function (observer) {
        var e;
        try {
          e = sources[$iterator$]();
        } catch(err) {
          observer.onError();
          return;
        }

        var isDisposed, 
          subscription = new SerialDisposable();
        var cancelable = immediateScheduler.scheduleRecursive(function (self) {
          var currentItem;
          if (isDisposed) { return; }

          try {
            currentItem = e.next();
          } catch (ex) {
            observer.onError(ex);
            return;
          }

          if (currentItem.done) {
            observer.onCompleted();
            return;
          }

          // Check if promise
          var currentValue = currentItem.value;
          isPromise(currentValue) && (currentValue = observableFromPromise(currentValue));

          var d = new SingleAssignmentDisposable();
          subscription.setDisposable(d);
          d.setDisposable(currentValue.subscribe(
            observer.onNext.bind(observer),
            observer.onError.bind(observer),
            function () { self(); })
          );
        });

        return new CompositeDisposable(subscription, cancelable, disposableCreate(function () {
          isDisposed = true;
        }));
      });
  };

  Enumerable.prototype.catchException = function () {
    var sources = this;
    return new AnonymousObservable(function (observer) {
      var e;
      try {
        e = sources[$iterator$]();
      } catch(err) {
        observer.onError();
        return;
      }

      var isDisposed, 
        lastException,
        subscription = new SerialDisposable();
      var cancelable = immediateScheduler.scheduleRecursive(function (self) {
        if (isDisposed) { return; }

        var currentItem;
        try {
          currentItem = e.next();
        } catch (ex) {
          observer.onError(ex);
          return;
        }

        if (currentItem.done) {
          if (lastException) {
            observer.onError(lastException);
          } else {
            observer.onCompleted();
          }
          return;
        }

        // Check if promise
        var currentValue = currentItem.value;
        isPromise(currentValue) && (currentValue = observableFromPromise(currentValue));        

        var d = new SingleAssignmentDisposable();
        subscription.setDisposable(d);
        d.setDisposable(currentValue.subscribe(
          observer.onNext.bind(observer),
          function (exn) {
            lastException = exn;
            self();
          },
          observer.onCompleted.bind(observer)));
      });
      return new CompositeDisposable(subscription, cancelable, disposableCreate(function () {
        isDisposed = true;
      }));
    });
  };


  var enumerableRepeat = Enumerable.repeat = function (value, repeatCount) {
    if (repeatCount == null) { repeatCount = -1; }
    return new Enumerable(function () {
      var left = repeatCount;
      return new Enumerator(function () {
        if (left === 0) { return doneEnumerator; }
        if (left > 0) { left--; }
        return { done: false, value: value };
      });
    });
  };

  var enumerableFor = Enumerable.forEach = function (source, selector, thisArg) {
    selector || (selector = identity);
    return new Enumerable(function () {
      var index = -1;
      return new Enumerator(
        function () {
          return ++index < source.length ?
            { done: false, value: selector.call(thisArg, source[index], index, source) } :
            doneEnumerator;
        });
    });
  };

    /**
     * Supports push-style iteration over an observable sequence.
     */
    var Observer = Rx.Observer = function () { };

    /**
     *  Creates a notification callback from an observer.
     *  
     * @param observer Observer object.
     * @returns The action that forwards its input notification to the underlying observer.
     */
    Observer.prototype.toNotifier = function () {
        var observer = this;
        return function (n) {
            return n.accept(observer);
        };
    };

    /**
     *  Hides the identity of an observer.

     * @returns An observer that hides the identity of the specified observer. 
     */   
    Observer.prototype.asObserver = function () {
        return new AnonymousObserver(this.onNext.bind(this), this.onError.bind(this), this.onCompleted.bind(this));
    };

    /**
     *  Checks access to the observer for grammar violations. This includes checking for multiple OnError or OnCompleted calls, as well as reentrancy in any of the observer methods.
     *  If a violation is detected, an Error is thrown from the offending observer method call.
     *  
     * @returns An observer that checks callbacks invocations against the observer grammar and, if the checks pass, forwards those to the specified observer.
     */    
    Observer.prototype.checked = function () { return new CheckedObserver(this); };

    /**
     *  Creates an observer from the specified OnNext, along with optional OnError, and OnCompleted actions.
     *  
     * @static
     * @memberOf Observer
     * @param {Function} [onNext] Observer's OnNext action implementation.
     * @param {Function} [onError] Observer's OnError action implementation.
     * @param {Function} [onCompleted] Observer's OnCompleted action implementation.
     * @returns {Observer} The observer object implemented using the given actions.
     */
    var observerCreate = Observer.create = function (onNext, onError, onCompleted) {
        onNext || (onNext = noop);
        onError || (onError = defaultError);
        onCompleted || (onCompleted = noop);
        return new AnonymousObserver(onNext, onError, onCompleted);
    };

    /**
     *  Creates an observer from a notification callback.
     *  
     * @static
     * @memberOf Observer
     * @param {Function} handler Action that handles a notification.
     * @returns The observer object that invokes the specified handler using a notification corresponding to each message it receives.
     */
    Observer.fromNotifier = function (handler) {
        return new AnonymousObserver(function (x) {
            return handler(notificationCreateOnNext(x));
        }, function (exception) {
            return handler(notificationCreateOnError(exception));
        }, function () {
            return handler(notificationCreateOnCompleted());
        });
    };

    /**
     * Schedules the invocation of observer methods on the given scheduler.
     * @param {Scheduler} scheduler Scheduler to schedule observer messages on.
     * @returns {Observer} Observer whose messages are scheduled on the given scheduler.
     */
    Observer.notifyOn = function (scheduler) {
        return new ObserveOnObserver(scheduler, this);
    };
    
    /**
     * Abstract base class for implementations of the Observer class.
     * This base class enforces the grammar of observers where OnError and OnCompleted are terminal messages. 
     */
    var AbstractObserver = Rx.internals.AbstractObserver = (function (_super) {
        inherits(AbstractObserver, _super);

        /**
         * Creates a new observer in a non-stopped state.
         *
         * @constructor
         */
        function AbstractObserver() {
            this.isStopped = false;
            _super.call(this);
        }

        /**
         * Notifies the observer of a new element in the sequence.
         *  
         * @memberOf AbstractObserver
         * @param {Any} value Next element in the sequence. 
         */
        AbstractObserver.prototype.onNext = function (value) {
            if (!this.isStopped) {
                this.next(value);
            }
        };

        /**
         * Notifies the observer that an exception has occurred.
         * 
         * @memberOf AbstractObserver
         * @param {Any} error The error that has occurred.     
         */    
        AbstractObserver.prototype.onError = function (error) {
            if (!this.isStopped) {
                this.isStopped = true;
                this.error(error);
            }
        };

        /**
         * Notifies the observer of the end of the sequence.
         */    
        AbstractObserver.prototype.onCompleted = function () {
            if (!this.isStopped) {
                this.isStopped = true;
                this.completed();
            }
        };

        /**
         * Disposes the observer, causing it to transition to the stopped state.
         */
        AbstractObserver.prototype.dispose = function () {
            this.isStopped = true;
        };

        AbstractObserver.prototype.fail = function (e) {
            if (!this.isStopped) {
                this.isStopped = true;
                this.error(e);
                return true;
            }

            return false;
        };

        return AbstractObserver;
    }(Observer));

  /**
   * Class to create an Observer instance from delegate-based implementations of the on* methods.
   */
  var AnonymousObserver = Rx.AnonymousObserver = (function (_super) {
    inherits(AnonymousObserver, _super);

    /**
     * Creates an observer from the specified OnNext, OnError, and OnCompleted actions.
     * @param {Any} onNext Observer's OnNext action implementation.
     * @param {Any} onError Observer's OnError action implementation.
     * @param {Any} onCompleted Observer's OnCompleted action implementation.  
     */      
    function AnonymousObserver(onNext, onError, onCompleted) {
      _super.call(this);
      this._onNext = onNext;
      this._onError = onError;
      this._onCompleted = onCompleted;
    }

    /**
     * Calls the onNext action.
     * @param {Any} value Next element in the sequence.   
     */     
    AnonymousObserver.prototype.next = function (value) {
      this._onNext(value);
    };

    /**
     * Calls the onError action.
     * @param {Any} error The error that has occurred.   
     */     
    AnonymousObserver.prototype.error = function (exception) {
      this._onError(exception);
    };

    /**
     *  Calls the onCompleted action.
     */        
    AnonymousObserver.prototype.completed = function () {
      this._onCompleted();
    };

    return AnonymousObserver;
  }(AbstractObserver));

    var CheckedObserver = (function (_super) {
        inherits(CheckedObserver, _super);

        function CheckedObserver(observer) {
            _super.call(this);
            this._observer = observer;
            this._state = 0; // 0 - idle, 1 - busy, 2 - done
        }

        var CheckedObserverPrototype = CheckedObserver.prototype;

        CheckedObserverPrototype.onNext = function (value) {
            this.checkAccess();
            try {
                this._observer.onNext(value);
            } catch (e) { 
                throw e;                
            } finally {
                this._state = 0;
            }
        };

        CheckedObserverPrototype.onError = function (err) {
            this.checkAccess();
            try {
                this._observer.onError(err);
            } catch (e) { 
                throw e;                
            } finally {
                this._state = 2;
            }
        };

        CheckedObserverPrototype.onCompleted = function () {
            this.checkAccess();
            try {
                this._observer.onCompleted();
            } catch (e) { 
                throw e;                
            } finally {
                this._state = 2;
            }
        };

        CheckedObserverPrototype.checkAccess = function () {
            if (this._state === 1) { throw new Error('Re-entrancy detected'); }
            if (this._state === 2) { throw new Error('Observer completed'); }
            if (this._state === 0) { this._state = 1; }
        };

        return CheckedObserver;
    }(Observer));

  var ScheduledObserver = Rx.internals.ScheduledObserver = (function (_super) {
    inherits(ScheduledObserver, _super);

    function ScheduledObserver(scheduler, observer) {
      _super.call(this);
      this.scheduler = scheduler;
      this.observer = observer;
      this.isAcquired = false;
      this.hasFaulted = false;
      this.queue = [];
      this.disposable = new SerialDisposable();
    }

    ScheduledObserver.prototype.next = function (value) {
      var self = this;
      this.queue.push(function () {
        self.observer.onNext(value);
      });
    };

    ScheduledObserver.prototype.error = function (exception) {
      var self = this;
      this.queue.push(function () {
        self.observer.onError(exception);
      });
    };

    ScheduledObserver.prototype.completed = function () {
      var self = this;
      this.queue.push(function () {
        self.observer.onCompleted();
      });
    };

    ScheduledObserver.prototype.ensureActive = function () {
      var isOwner = false, parent = this;
      if (!this.hasFaulted && this.queue.length > 0) {
        isOwner = !this.isAcquired;
        this.isAcquired = true;
      }
      if (isOwner) {
        this.disposable.setDisposable(this.scheduler.scheduleRecursive(function (self) {
          var work;
          if (parent.queue.length > 0) {
            work = parent.queue.shift();
          } else {
            parent.isAcquired = false;
            return;
          }
          try {
            work();
          } catch (ex) {
            parent.queue = [];
            parent.hasFaulted = true;
            throw ex;
          }
          self();
        }));
      }
    };

    ScheduledObserver.prototype.dispose = function () {
      _super.prototype.dispose.call(this);
      this.disposable.dispose();
    };

    return ScheduledObserver;
  }(AbstractObserver));

    /** @private */
    var ObserveOnObserver = (function (_super) {
        inherits(ObserveOnObserver, _super);

        /** @private */ 
        function ObserveOnObserver() {
            _super.apply(this, arguments);
        }

        /** @private */ 
        ObserveOnObserver.prototype.next = function (value) {
            _super.prototype.next.call(this, value);
            this.ensureActive();
        };

        /** @private */ 
        ObserveOnObserver.prototype.error = function (e) {
            _super.prototype.error.call(this, e);
            this.ensureActive();
        };

        /** @private */ 
        ObserveOnObserver.prototype.completed = function () {
            _super.prototype.completed.call(this);
            this.ensureActive();
        };

        return ObserveOnObserver;
    })(ScheduledObserver);

    var observableProto;

    /**
     * Represents a push-style collection.
     */
    var Observable = Rx.Observable = (function () {

        /**
         * @constructor
         * @private
         */
        function Observable(subscribe) {
            this._subscribe = subscribe;
        }

        observableProto = Observable.prototype;

        observableProto.finalValue = function () {
            var source = this;
            return new AnonymousObservable(function (observer) {
                var hasValue = false, value;
                return source.subscribe(function (x) {
                    hasValue = true;
                    value = x;
                }, observer.onError.bind(observer), function () {
                    if (!hasValue) {
                        observer.onError(new Error(sequenceContainsNoElements));
                    } else {
                        observer.onNext(value);
                        observer.onCompleted();
                    }
                });
            });
        };

        /**
         *  Subscribes an observer to the observable sequence.
         *  
         * @example
         *  1 - source.subscribe();
         *  2 - source.subscribe(observer);
         *  3 - source.subscribe(function (x) { console.log(x); });
         *  4 - source.subscribe(function (x) { console.log(x); }, function (err) { console.log(err); });
         *  5 - source.subscribe(function (x) { console.log(x); }, function (err) { console.log(err); }, function () { console.log('done'); });
         *  @param {Mixed} [observerOrOnNext] The object that is to receive notifications or an action to invoke for each element in the observable sequence.
         *  @param {Function} [onError] Action to invoke upon exceptional termination of the observable sequence.
         *  @param {Function} [onCompleted] Action to invoke upon graceful termination of the observable sequence.
         *  @returns {Diposable} The source sequence whose subscriptions and unsubscriptions happen on the specified scheduler. 
         */
        observableProto.subscribe = observableProto.forEach = function (observerOrOnNext, onError, onCompleted) {
            var subscriber;
            if (typeof observerOrOnNext === 'object') {
                subscriber = observerOrOnNext;
            } else {
                subscriber = observerCreate(observerOrOnNext, onError, onCompleted);
            }

            return this._subscribe(subscriber);
        };

        /**
         *  Creates a list from an observable sequence.
         *  
         * @memberOf Observable
         * @returns An observable sequence containing a single element with a list containing all the elements of the source sequence.  
         */
        observableProto.toArray = function () {
            function accumulator(list, i) {
                var newList = list.slice(0);
                newList.push(i);
                return newList;
            }
            return this.scan([], accumulator).startWith([]).finalValue();
        };

        return Observable;
    })();

     /**
     *  Wraps the source sequence in order to run its observer callbacks on the specified scheduler.
     * 
     *  This only invokes observer callbacks on a scheduler. In case the subscription and/or unsubscription actions have side-effects
     *  that require to be run on a scheduler, use subscribeOn.
     *          
     *  @param {Scheduler} scheduler Scheduler to notify observers on.
     *  @returns {Observable} The source sequence whose observations happen on the specified scheduler.     
     */
    observableProto.observeOn = function (scheduler) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            return source.subscribe(new ObserveOnObserver(scheduler, observer));
        });
    };

     /**
     *  Wraps the source sequence in order to run its subscription and unsubscription logic on the specified scheduler. This operation is not commonly used;
     *  see the remarks section for more information on the distinction between subscribeOn and observeOn.

     *  This only performs the side-effects of subscription and unsubscription on the specified scheduler. In order to invoke observer
     *  callbacks on a scheduler, use observeOn.

     *  @param {Scheduler} scheduler Scheduler to perform subscription and unsubscription actions on.
     *  @returns {Observable} The source sequence whose subscriptions and unsubscriptions happen on the specified scheduler.
     */
    observableProto.subscribeOn = function (scheduler) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var m = new SingleAssignmentDisposable(), d = new SerialDisposable();
            d.setDisposable(m);
            m.setDisposable(scheduler.schedule(function () {
                d.setDisposable(new ScheduledDisposable(scheduler, source.subscribe(observer)));
            }));
            return d;
        });
    };

  /**
   * Converts a Promise to an Observable sequence
   * @param {Promise} An ES6 Compliant promise.
   * @returns {Observable} An Observable sequence which wraps the existing promise success and failure.
   */
  var observableFromPromise = Observable.fromPromise = function (promise) {
    return new AnonymousObservable(function (observer) {
      promise.then(
        function (value) {
          observer.onNext(value);
          observer.onCompleted();
        }, 
        function (reason) {
          observer.onError(reason);
        });

      return function () {
        if (promise && promise.abort) {
          promise.abort();
        }
      }
    });
  };
    /*
     * Converts an existing observable sequence to an ES6 Compatible Promise
     * @example
     * var promise = Rx.Observable.return(42).toPromise(RSVP.Promise);
     * 
     * // With config
     * Rx.config.Promise = RSVP.Promise;
     * var promise = Rx.Observable.return(42).toPromise();
     * @param {Function} [promiseCtor] The constructor of the promise. If not provided, it looks for it in Rx.config.Promise.
     * @returns {Promise} An ES6 compatible promise with the last value from the observable sequence.
     */
    observableProto.toPromise = function (promiseCtor) {
        promiseCtor || (promiseCtor = Rx.config.Promise);
        if (!promiseCtor) {
            throw new Error('Promise type not provided nor in Rx.config.Promise');
        }
        var source = this;
        return new promiseCtor(function (resolve, reject) {
            // No cancellation can be done
            var value, hasValue = false;
            source.subscribe(function (v) {
                value = v;
                hasValue = true;
            }, function (err) {
                reject(err);
            }, function () {
                if (hasValue) {
                    resolve(value);
                }
            });
        });
    };
    /**
     *  Creates an observable sequence from a specified subscribe method implementation.
     *  
     * @example
     *  var res = Rx.Observable.create(function (observer) { return function () { } );
     *  var res = Rx.Observable.create(function (observer) { return Rx.Disposable.empty; } ); 
     *  var res = Rx.Observable.create(function (observer) { } ); 
     *  
     * @param {Function} subscribe Implementation of the resulting observable sequence's subscribe method, returning a function that will be wrapped in a Disposable.
     * @returns {Observable} The observable sequence with the specified implementation for the Subscribe method.
     */
    Observable.create = Observable.createWithDisposable = function (subscribe) {
        return new AnonymousObservable(subscribe);
    };

  /**
   *  Returns an observable sequence that invokes the specified factory function whenever a new observer subscribes.
   *  
   * @example
   *  var res = Rx.Observable.defer(function () { return Rx.Observable.fromArray([1,2,3]); });    
   * @param {Function} observableFactory Observable factory function to invoke for each observer that subscribes to the resulting sequence or Promise.
   * @returns {Observable} An observable sequence whose observers trigger an invocation of the given observable factory function.
   */
  var observableDefer = Observable.defer = function (observableFactory) {
    return new AnonymousObservable(function (observer) {
      var result;
      try {
        result = observableFactory();
      } catch (e) {
        return observableThrow(e).subscribe(observer);
      }
      isPromise(result) && (result = observableFromPromise(result));
      return result.subscribe(observer);
    });
  };

    /**
     *  Returns an empty observable sequence, using the specified scheduler to send out the single OnCompleted message.
     *  
     * @example
     *  var res = Rx.Observable.empty();  
     *  var res = Rx.Observable.empty(Rx.Scheduler.timeout);  
     * @param {Scheduler} [scheduler] Scheduler to send the termination call on.
     * @returns {Observable} An observable sequence with no elements.
     */
    var observableEmpty = Observable.empty = function (scheduler) {
        scheduler || (scheduler = immediateScheduler);
        return new AnonymousObservable(function (observer) {
            return scheduler.schedule(function () {
                observer.onCompleted();
            });
        });
    };

    /**
     *  Converts an array to an observable sequence, using an optional scheduler to enumerate the array.
     *  
     * @example
     *  var res = Rx.Observable.fromArray([1,2,3]);
     *  var res = Rx.Observable.fromArray([1,2,3], Rx.Scheduler.timeout);
     * @param {Scheduler} [scheduler] Scheduler to run the enumeration of the input sequence on.
     * @returns {Observable} The observable sequence whose elements are pulled from the given enumerable sequence.
     */
    var observableFromArray = Observable.fromArray = function (array, scheduler) {
        scheduler || (scheduler = currentThreadScheduler);
        return new AnonymousObservable(function (observer) {
            var count = 0;
            return scheduler.scheduleRecursive(function (self) {
                if (count < array.length) {
                    observer.onNext(array[count++]);
                    self();
                } else {
                    observer.onCompleted();
                }
            });
        });
    };

  /**
   *  Converts an iterable into an Observable sequence
   *  
   * @example
   *  var res = Rx.Observable.fromIterable(new Map());
   *  var res = Rx.Observable.fromIterable(new Set(), Rx.Scheduler.timeout);
   * @param {Scheduler} [scheduler] Scheduler to run the enumeration of the input sequence on.
   * @returns {Observable} The observable sequence whose elements are pulled from the given generator sequence.
   */
  Observable.fromIterable = function (iterable, scheduler) {
    scheduler || (scheduler = currentThreadScheduler);
    return new AnonymousObservable(function (observer) {
      var iterator;
      try {
        iterator = iterable[$iterator$]();
      } catch (e) {
        observer.onError(e);
        return;
      }

      return scheduler.scheduleRecursive(function (self) {
        var next;
        try {
          next = iterator.next();
        } catch (err) {
          observer.onError(err);
          return;
        }

        if (next.done) {
          observer.onCompleted();
        } else {
          observer.onNext(next.value);
          self();
        }
      });
    });
  };

    /**
     *  Generates an observable sequence by running a state-driven loop producing the sequence's elements, using the specified scheduler to send out observer messages.
     *  
     * @example
     *  var res = Rx.Observable.generate(0, function (x) { return x < 10; }, function (x) { return x + 1; }, function (x) { return x; });
     *  var res = Rx.Observable.generate(0, function (x) { return x < 10; }, function (x) { return x + 1; }, function (x) { return x; }, Rx.Scheduler.timeout);
     * @param {Mixed} initialState Initial state.
     * @param {Function} condition Condition to terminate generation (upon returning false).
     * @param {Function} iterate Iteration step function.
     * @param {Function} resultSelector Selector function for results produced in the sequence.
     * @param {Scheduler} [scheduler] Scheduler on which to run the generator loop. If not provided, defaults to Scheduler.currentThread.
     * @returns {Observable} The generated sequence.
     */
    Observable.generate = function (initialState, condition, iterate, resultSelector, scheduler) {
        scheduler || (scheduler = currentThreadScheduler);
        return new AnonymousObservable(function (observer) {
            var first = true, state = initialState;
            return scheduler.scheduleRecursive(function (self) {
                var hasResult, result;
                try {
                    if (first) {
                        first = false;
                    } else {
                        state = iterate(state);
                    }
                    hasResult = condition(state);
                    if (hasResult) {
                        result = resultSelector(state);
                    }
                } catch (exception) {
                    observer.onError(exception);
                    return;
                }
                if (hasResult) {
                    observer.onNext(result);
                    self();
                } else {
                    observer.onCompleted();
                }
            });
        });
    };

    /**
     *  Returns a non-terminating observable sequence, which can be used to denote an infinite duration (e.g. when using reactive joins).
     * @returns {Observable} An observable sequence whose observers will never get called.
     */
    var observableNever = Observable.never = function () {
        return new AnonymousObservable(function () {
            return disposableEmpty;
        });
    };

    /**
     *  Generates an observable sequence of integral numbers within a specified range, using the specified scheduler to send out observer messages.
     *  
     * @example
     *  var res = Rx.Observable.range(0, 10);
     *  var res = Rx.Observable.range(0, 10, Rx.Scheduler.timeout);
     * @param {Number} start The value of the first integer in the sequence.
     * @param {Number} count The number of sequential integers to generate.
     * @param {Scheduler} [scheduler] Scheduler to run the generator loop on. If not specified, defaults to Scheduler.currentThread.
     * @returns {Observable} An observable sequence that contains a range of sequential integral numbers.
     */
    Observable.range = function (start, count, scheduler) {
        scheduler || (scheduler = currentThreadScheduler);
        return new AnonymousObservable(function (observer) {
            return scheduler.scheduleRecursiveWithState(0, function (i, self) {
                if (i < count) {
                    observer.onNext(start + i);
                    self(i + 1);
                } else {
                    observer.onCompleted();
                }
            });
        });
    };

    /**
     *  Generates an observable sequence that repeats the given element the specified number of times, using the specified scheduler to send out observer messages.
     *  
     * @example
     *  var res = Rx.Observable.repeat(42);
     *  var res = Rx.Observable.repeat(42, 4);
     *  3 - res = Rx.Observable.repeat(42, 4, Rx.Scheduler.timeout);
     *  4 - res = Rx.Observable.repeat(42, null, Rx.Scheduler.timeout);
     * @param {Mixed} value Element to repeat.
     * @param {Number} repeatCount [Optiona] Number of times to repeat the element. If not specified, repeats indefinitely.
     * @param {Scheduler} scheduler Scheduler to run the producer loop on. If not specified, defaults to Scheduler.immediate.
     * @returns {Observable} An observable sequence that repeats the given element the specified number of times.
     */
    Observable.repeat = function (value, repeatCount, scheduler) {
        scheduler || (scheduler = currentThreadScheduler);
        if (repeatCount == null) {
            repeatCount = -1;
        }
        return observableReturn(value, scheduler).repeat(repeatCount);
    };

    /**
     *  Returns an observable sequence that contains a single element, using the specified scheduler to send out observer messages.
     *  There is an alias called 'returnValue' for browsers <IE9.
     *  
     * @example
     *  var res = Rx.Observable.return(42);
     *  var res = Rx.Observable.return(42, Rx.Scheduler.timeout);
     * @param {Mixed} value Single element in the resulting observable sequence.
     * @param {Scheduler} scheduler Scheduler to send the single element on. If not specified, defaults to Scheduler.immediate.
     * @returns {Observable} An observable sequence containing the single specified element.
     */
    var observableReturn = Observable['return'] = Observable.returnValue = function (value, scheduler) {
        scheduler || (scheduler = immediateScheduler);
        return new AnonymousObservable(function (observer) {
            return scheduler.schedule(function () {
                observer.onNext(value);
                observer.onCompleted();
            });
        });
    };

    /**
     *  Returns an observable sequence that terminates with an exception, using the specified scheduler to send out the single onError message.
     *  There is an alias to this method called 'throwException' for browsers <IE9.
     *  
     * @example
     *  var res = Rx.Observable.throwException(new Error('Error'));
     *  var res = Rx.Observable.throwException(new Error('Error'), Rx.Scheduler.timeout);
     * @param {Mixed} exception An object used for the sequence's termination.
     * @param {Scheduler} scheduler Scheduler to send the exceptional termination call on. If not specified, defaults to Scheduler.immediate.
     * @returns {Observable} The observable sequence that terminates exceptionally with the specified exception object.
     */
    var observableThrow = Observable['throw'] = Observable.throwException = function (exception, scheduler) {
        scheduler || (scheduler = immediateScheduler);
        return new AnonymousObservable(function (observer) {
            return scheduler.schedule(function () {
                observer.onError(exception);
            });
        });
    };

    /**
     *  Constructs an observable sequence that depends on a resource object, whose lifetime is tied to the resulting observable sequence's lifetime.
     *  
     * @example
     *  var res = Rx.Observable.using(function () { return new AsyncSubject(); }, function (s) { return s; });
     * @param {Function} resourceFactory Factory function to obtain a resource object.
     * @param {Function} observableFactory Factory function to obtain an observable sequence that depends on the obtained resource.
     * @returns {Observable} An observable sequence whose lifetime controls the lifetime of the dependent resource object.
     */
    Observable.using = function (resourceFactory, observableFactory) {
        return new AnonymousObservable(function (observer) {
            var disposable = disposableEmpty, resource, source;
            try {
                resource = resourceFactory();
                if (resource) {
                    disposable = resource;
                }
                source = observableFactory(resource);
            } catch (exception) {
                return new CompositeDisposable(observableThrow(exception).subscribe(observer), disposable);
            }
            return new CompositeDisposable(source.subscribe(observer), disposable);
        });
    };

  /**
   * Propagates the observable sequence or Promise that reacts first.
   * @param {Observable} rightSource Second observable sequence or Promise.
   * @returns {Observable} {Observable} An observable sequence that surfaces either of the given sequences, whichever reacted first.
   */  
  observableProto.amb = function (rightSource) {
    var leftSource = this;
    return new AnonymousObservable(function (observer) {
      var choice,
        leftChoice = 'L', rightChoice = 'R',
        leftSubscription = new SingleAssignmentDisposable(),
        rightSubscription = new SingleAssignmentDisposable();

      isPromise(rightSource) && (rightSource = observableFromPromise(rightSource));

      function choiceL() {
        if (!choice) {
          choice = leftChoice;
          rightSubscription.dispose();
        }
      }

      function choiceR() {
        if (!choice) {
          choice = rightChoice;
          leftSubscription.dispose();
        }
      }

      leftSubscription.setDisposable(leftSource.subscribe(function (left) {
        choiceL();
        if (choice === leftChoice) {
          observer.onNext(left);
        }
      }, function (err) {
        choiceL();
        if (choice === leftChoice) {
          observer.onError(err);
        }
      }, function () {
        choiceL();
        if (choice === leftChoice) {
          observer.onCompleted();
        }
      }));

      rightSubscription.setDisposable(rightSource.subscribe(function (right) {
        choiceR();
        if (choice === rightChoice) {
          observer.onNext(right);
        }
      }, function (err) {
        choiceR();
        if (choice === rightChoice) {
          observer.onError(err);
        }
      }, function () {
        choiceR();
        if (choice === rightChoice) {
          observer.onCompleted();
        }
      }));

      return new CompositeDisposable(leftSubscription, rightSubscription);
    });
  };

  /**
   * Propagates the observable sequence or Promise that reacts first.
   *
   * @example
   * var = Rx.Observable.amb(xs, ys, zs);
   * @returns {Observable} An observable sequence that surfaces any of the given sequences, whichever reacted first.
   */  
  Observable.amb = function () {
    var acc = observableNever(),
      items = argsOrArray(arguments, 0);
    function func(previous, current) {
      return previous.amb(current);
    }
    for (var i = 0, len = items.length; i < len; i++) {
      acc = func(acc, items[i]);
    }
    return acc;
  };

  function observableCatchHandler(source, handler) {
    return new AnonymousObservable(function (observer) {
      var d1 = new SingleAssignmentDisposable(), subscription = new SerialDisposable();
      subscription.setDisposable(d1);
      d1.setDisposable(source.subscribe(observer.onNext.bind(observer), function (exception) {
        var d, result;
        try {
          result = handler(exception);
        } catch (ex) {
          observer.onError(ex);
          return;
        }
        isPromise(result) && (result = observableFromPromise(result));

        d = new SingleAssignmentDisposable();
        subscription.setDisposable(d);
        d.setDisposable(result.subscribe(observer));
      }, observer.onCompleted.bind(observer)));
      
      return subscription;
    });
  }

  /**
   * Continues an observable sequence that is terminated by an exception with the next observable sequence.
   * @example
   * 1 - xs.catchException(ys)
   * 2 - xs.catchException(function (ex) { return ys(ex); })
   * @param {Mixed} handlerOrSecond Exception handler function that returns an observable sequence given the error that occurred in the first sequence, or a second observable sequence used to produce results when an error occurred in the first sequence.
   * @returns {Observable} An observable sequence containing the first sequence's elements, followed by the elements of the handler sequence in case an exception occurred.
   */      
  observableProto['catch'] = observableProto.catchException = function (handlerOrSecond) {
    return typeof handlerOrSecond === 'function' ?
      observableCatchHandler(this, handlerOrSecond) :
      observableCatch([this, handlerOrSecond]);
  };

    /**
     * Continues an observable sequence that is terminated by an exception with the next observable sequence.
     * 
     * @example
     * 1 - res = Rx.Observable.catchException(xs, ys, zs);
     * 2 - res = Rx.Observable.catchException([xs, ys, zs]);
     * @returns {Observable} An observable sequence containing elements from consecutive source sequences until a source sequence terminates successfully.
     */
    var observableCatch = Observable.catchException = Observable['catch'] = function () {
        var items = argsOrArray(arguments, 0);
        return enumerableFor(items).catchException();
    };

  /**
   * Merges the specified observable sequences into one observable sequence by using the selector function whenever any of the observable sequences or Promises produces an element.
   * This can be in the form of an argument list of observables or an array.
   *
   * @example
   * 1 - obs = observable.combineLatest(obs1, obs2, obs3, function (o1, o2, o3) { return o1 + o2 + o3; });
   * 2 - obs = observable.combineLatest([obs1, obs2, obs3], function (o1, o2, o3) { return o1 + o2 + o3; });
   * @returns {Observable} An observable sequence containing the result of combining elements of the sources using the specified result selector function. 
   */
  observableProto.combineLatest = function () {
    var args = slice.call(arguments);
    if (Array.isArray(args[0])) {
      args[0].unshift(this);
    } else {
      args.unshift(this);
    }
    return combineLatest.apply(this, args);
  };

  /**
   * Merges the specified observable sequences into one observable sequence by using the selector function whenever any of the observable sequences or Promises produces an element.
   * 
   * @example
   * 1 - obs = Rx.Observable.combineLatest(obs1, obs2, obs3, function (o1, o2, o3) { return o1 + o2 + o3; });
   * 2 - obs = Rx.Observable.combineLatest([obs1, obs2, obs3], function (o1, o2, o3) { return o1 + o2 + o3; });     
   * @returns {Observable} An observable sequence containing the result of combining elements of the sources using the specified result selector function.
   */
  var combineLatest = Observable.combineLatest = function () {
    var args = slice.call(arguments), resultSelector = args.pop();
    
    if (Array.isArray(args[0])) {
      args = args[0];
    }

    return new AnonymousObservable(function (observer) {
      var falseFactory = function () { return false; },
        n = args.length,
        hasValue = arrayInitialize(n, falseFactory),
        hasValueAll = false,
        isDone = arrayInitialize(n, falseFactory),
        values = new Array(n);

      function next(i) {
        var res;
        hasValue[i] = true;
        if (hasValueAll || (hasValueAll = hasValue.every(identity))) {
          try {
            res = resultSelector.apply(null, values);
          } catch (ex) {
            observer.onError(ex);
            return;
          }
          observer.onNext(res);
        } else if (isDone.filter(function (x, j) { return j !== i; }).every(identity)) {
          observer.onCompleted();
        }
      }

      function done (i) {
        isDone[i] = true;
        if (isDone.every(identity)) {
          observer.onCompleted();
        }
      }

      var subscriptions = new Array(n);
      for (var idx = 0; idx < n; idx++) {
        (function (i) {
          var source = args[i], sad = new SingleAssignmentDisposable();
          isPromise(source) && (source = observableFromPromise(source));
          sad.setDisposable(source.subscribe(function (x) {
            values[i] = x;
            next(i);
          }, observer.onError.bind(observer), function () {
            done(i);
          }));
          subscriptions[i] = sad;
        }(idx));
      }

      return new CompositeDisposable(subscriptions);
    });
  };

    /**
     * Concatenates all the observable sequences.  This takes in either an array or variable arguments to concatenate.
     * 
     * @example
     * 1 - concatenated = xs.concat(ys, zs);
     * 2 - concatenated = xs.concat([ys, zs]);
     * @returns {Observable} An observable sequence that contains the elements of each given sequence, in sequential order. 
     */ 
    observableProto.concat = function () {
        var items = slice.call(arguments, 0);
        items.unshift(this);
        return observableConcat.apply(this, items);
    };

    /**
     * Concatenates all the observable sequences.
     * 
     * @example
     * 1 - res = Rx.Observable.concat(xs, ys, zs);
     * 2 - res = Rx.Observable.concat([xs, ys, zs]);
     * @returns {Observable} An observable sequence that contains the elements of each given sequence, in sequential order. 
     */
    var observableConcat = Observable.concat = function () {
        var sources = argsOrArray(arguments, 0);
        return enumerableFor(sources).concat();
    };  

    /**
     * Concatenates an observable sequence of observable sequences.
     * @returns {Observable} An observable sequence that contains the elements of each observed inner sequence, in sequential order. 
     */ 
    observableProto.concatObservable = observableProto.concatAll =function () {
        return this.merge(1);
    };

    /**
     * Merges an observable sequence of observable sequences into an observable sequence, limiting the number of concurrent subscriptions to inner sequences.
     * Or merges two observable sequences into a single observable sequence.
     * 
     * @example
     * 1 - merged = sources.merge(1);
     * 2 - merged = source.merge(otherSource);  
     * @param {Mixed} [maxConcurrentOrOther] Maximum number of inner observable sequences being subscribed to concurrently or the second observable sequence.
     * @returns {Observable} The observable sequence that merges the elements of the inner sequences. 
     */ 
    observableProto.merge = function (maxConcurrentOrOther) {
        if (typeof maxConcurrentOrOther !== 'number') {
            return observableMerge(this, maxConcurrentOrOther);
        }
        var sources = this;
        return new AnonymousObservable(function (observer) {
            var activeCount = 0,
                group = new CompositeDisposable(),
                isStopped = false,
                q = [],
                subscribe = function (xs) {
                    var subscription = new SingleAssignmentDisposable();
                    group.add(subscription);

                    // Check for promises support
                    if (isPromise(xs)) { xs = observableFromPromise(xs); }

                    subscription.setDisposable(xs.subscribe(observer.onNext.bind(observer), observer.onError.bind(observer), function () {
                        var s;
                        group.remove(subscription);
                        if (q.length > 0) {
                            s = q.shift();
                            subscribe(s);
                        } else {
                            activeCount--;
                            if (isStopped && activeCount === 0) {
                                observer.onCompleted();
                            }
                        }
                    }));
                };
            group.add(sources.subscribe(function (innerSource) {
                if (activeCount < maxConcurrentOrOther) {
                    activeCount++;
                    subscribe(innerSource);
                } else {
                    q.push(innerSource);
                }
            }, observer.onError.bind(observer), function () {
                isStopped = true;
                if (activeCount === 0) {
                    observer.onCompleted();
                }
            }));
            return group;
        });
    };

    /**
     * Merges all the observable sequences into a single observable sequence.  
     * The scheduler is optional and if not specified, the immediate scheduler is used.
     * 
     * @example
     * 1 - merged = Rx.Observable.merge(xs, ys, zs);
     * 2 - merged = Rx.Observable.merge([xs, ys, zs]);
     * 3 - merged = Rx.Observable.merge(scheduler, xs, ys, zs);
     * 4 - merged = Rx.Observable.merge(scheduler, [xs, ys, zs]);    
     * @returns {Observable} The observable sequence that merges the elements of the observable sequences. 
     */  
    var observableMerge = Observable.merge = function () {
        var scheduler, sources;
        if (!arguments[0]) {
            scheduler = immediateScheduler;
            sources = slice.call(arguments, 1);
        } else if (arguments[0].now) {
            scheduler = arguments[0];
            sources = slice.call(arguments, 1);
        } else {
            scheduler = immediateScheduler;
            sources = slice.call(arguments, 0);
        }
        if (Array.isArray(sources[0])) {
            sources = sources[0];
        }
        return observableFromArray(sources, scheduler).mergeObservable();
    };   

  /**
   * Merges an observable sequence of observable sequences into an observable sequence.
   * @returns {Observable} The observable sequence that merges the elements of the inner sequences.   
   */  
  observableProto.mergeObservable = observableProto.mergeAll =function () {
    var sources = this;
    return new AnonymousObservable(function (observer) {
      var group = new CompositeDisposable(),
        isStopped = false,
        m = new SingleAssignmentDisposable();

      group.add(m);
      m.setDisposable(sources.subscribe(function (innerSource) {
        var innerSubscription = new SingleAssignmentDisposable();
        group.add(innerSubscription);

        // Check if Promise or Observable
        if (isPromise(innerSource)) {
            innerSource = observableFromPromise(innerSource);
        }

        innerSubscription.setDisposable(innerSource.subscribe(function (x) {
            observer.onNext(x);
        }, observer.onError.bind(observer), function () {
            group.remove(innerSubscription);
            if (isStopped && group.length === 1) { observer.onCompleted(); }
        }));
      }, observer.onError.bind(observer), function () {
        isStopped = true;
        if (group.length === 1) { observer.onCompleted(); }
      }));
      return group;
    });
  };

  /**
   * Continues an observable sequence that is terminated normally or by an exception with the next observable sequence.
   * @param {Observable} second Second observable sequence used to produce results after the first sequence terminates.
   * @returns {Observable} An observable sequence that concatenates the first and second sequence, even if the first sequence terminates exceptionally.
   */
  observableProto.onErrorResumeNext = function (second) {
    if (!second) {
      throw new Error('Second observable is required');
    }
    return onErrorResumeNext([this, second]);
  };

  /**
   * Continues an observable sequence that is terminated normally or by an exception with the next observable sequence.
   * 
   * @example
   * 1 - res = Rx.Observable.onErrorResumeNext(xs, ys, zs);
   * 1 - res = Rx.Observable.onErrorResumeNext([xs, ys, zs]);
   * @returns {Observable} An observable sequence that concatenates the source sequences, even if a sequence terminates exceptionally.   
   */
  var onErrorResumeNext = Observable.onErrorResumeNext = function () {
    var sources = argsOrArray(arguments, 0);
    return new AnonymousObservable(function (observer) {
      var pos = 0, subscription = new SerialDisposable(),
      cancelable = immediateScheduler.scheduleRecursive(function (self) {
        var current, d;
        if (pos < sources.length) {
          current = sources[pos++];
          isPromise(current) && (current = observableFromPromise(current));
          d = new SingleAssignmentDisposable();
          subscription.setDisposable(d);
          d.setDisposable(current.subscribe(observer.onNext.bind(observer), function () {
              self();
          }, function () {
              self();
          }));
        } else {
          observer.onCompleted();
        }
      });
      return new CompositeDisposable(subscription, cancelable);
    });
  };

    /**
     * Returns the values from the source observable sequence only after the other observable sequence produces a value.
     * @param {Observable} other The observable sequence that triggers propagation of elements of the source sequence.
     * @returns {Observable} An observable sequence containing the elements of the source sequence starting from the point the other sequence triggered propagation.    
     */
    observableProto.skipUntil = function (other) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var isOpen = false;
            var disposables = new CompositeDisposable(source.subscribe(function (left) {
                if (isOpen) {
                    observer.onNext(left);
                }
            }, observer.onError.bind(observer), function () {
                if (isOpen) {
                    observer.onCompleted();
                }
            }));

            var rightSubscription = new SingleAssignmentDisposable();
            disposables.add(rightSubscription);
            rightSubscription.setDisposable(other.subscribe(function () {
                isOpen = true;
                rightSubscription.dispose();
            }, observer.onError.bind(observer), function () {
                rightSubscription.dispose();
            }));

            return disposables;
        });
    };

    /**
     * Transforms an observable sequence of observable sequences into an observable sequence producing values only from the most recent observable sequence.
     * @returns {Observable} The observable sequence that at any point in time produces the elements of the most recent inner observable sequence that has been received.  
     */
    observableProto['switch'] = observableProto.switchLatest = function () {
        var sources = this;
        return new AnonymousObservable(function (observer) {
            var hasLatest = false,
                innerSubscription = new SerialDisposable(),
                isStopped = false,
                latest = 0,
                subscription = sources.subscribe(function (innerSource) {
                    var d = new SingleAssignmentDisposable(), id = ++latest;
                    hasLatest = true;
                    innerSubscription.setDisposable(d);

                    // Check if Promise or Observable
                    if (isPromise(innerSource)) {
                        innerSource = observableFromPromise(innerSource);
                    }

                    d.setDisposable(innerSource.subscribe(function (x) {
                        if (latest === id) {
                            observer.onNext(x);
                        }
                    }, function (e) {
                        if (latest === id) {
                            observer.onError(e);
                        }
                    }, function () {
                        if (latest === id) {
                            hasLatest = false;
                            if (isStopped) {
                                observer.onCompleted();
                            }
                        }
                    }));
                }, observer.onError.bind(observer), function () {
                    isStopped = true;
                    if (!hasLatest) {
                        observer.onCompleted();
                    }
                });
            return new CompositeDisposable(subscription, innerSubscription);
        });
    };

    /**
     * Returns the values from the source observable sequence until the other observable sequence produces a value.
     * @param {Observable} other Observable sequence that terminates propagation of elements of the source sequence.
     * @returns {Observable} An observable sequence containing the elements of the source sequence up to the point the other sequence interrupted further propagation.   
     */
    observableProto.takeUntil = function (other) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            return new CompositeDisposable(
                source.subscribe(observer),
                other.subscribe(observer.onCompleted.bind(observer), observer.onError.bind(observer), noop)
            );
        });
    };

  function zipArray(second, resultSelector) {
    var first = this;
    return new AnonymousObservable(function (observer) {
      var index = 0, len = second.length;
      return first.subscribe(function (left) {
        if (index < len) {
          var right = second[index++], result;
          try {
            result = resultSelector(left, right);
          } catch (e) {
            observer.onError(e);
            return;
          }
          observer.onNext(result);
        } else {
          observer.onCompleted();
        }
      }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
    });
  }    

  /**
   * Merges the specified observable sequences into one observable sequence by using the selector function whenever all of the observable sequences or an array have produced an element at a corresponding index.
   * The last element in the arguments must be a function to invoke for each series of elements at corresponding indexes in the sources.
   *
   * @example
   * 1 - res = obs1.zip(obs2, fn);
   * 1 - res = x1.zip([1,2,3], fn);  
   * @returns {Observable} An observable sequence containing the result of combining elements of the sources using the specified result selector function. 
   */   
  observableProto.zip = function () {
    if (Array.isArray(arguments[0])) {
      return zipArray.apply(this, arguments);
    }
    var parent = this, sources = slice.call(arguments), resultSelector = sources.pop();
    sources.unshift(parent);
    return new AnonymousObservable(function (observer) {
      var n = sources.length,
        queues = arrayInitialize(n, function () { return []; }),
        isDone = arrayInitialize(n, function () { return false; });
        
      function next(i) {
        var res, queuedValues;
        if (queues.every(function (x) { return x.length > 0; })) {
          try {
            queuedValues = queues.map(function (x) { return x.shift(); });
            res = resultSelector.apply(parent, queuedValues);
          } catch (ex) {
            observer.onError(ex);
            return;
          }
          observer.onNext(res);
        } else if (isDone.filter(function (x, j) { return j !== i; }).every(identity)) {
          observer.onCompleted();
        }
      };

      function done(i) {
        isDone[i] = true;
        if (isDone.every(function (x) { return x; })) {
          observer.onCompleted();
        }
      }

      var subscriptions = new Array(n);
      for (var idx = 0; idx < n; idx++) {
        (function (i) {
          var source = sources[i], sad = new SingleAssignmentDisposable();
          isPromise(source) && (source = observableFromPromise(source));
          sad.setDisposable(source.subscribe(function (x) {
            queues[i].push(x);
            next(i);
          }, observer.onError.bind(observer), function () {
            done(i);
          }));
          subscriptions[i] = sad;
        })(idx);
      }

      return new CompositeDisposable(subscriptions);
    });
  };
    /**
     * Merges the specified observable sequences into one observable sequence by using the selector function whenever all of the observable sequences have produced an element at a corresponding index.
     * @param arguments Observable sources.
     * @param {Function} resultSelector Function to invoke for each series of elements at corresponding indexes in the sources.
     * @returns {Observable} An observable sequence containing the result of combining elements of the sources using the specified result selector function.
     */
    Observable.zip = function () {
        var args = slice.call(arguments, 0),
            first = args.shift();
        return first.zip.apply(first, args);
    };

    /**
     * Merges the specified observable sequences into one observable sequence by emitting a list with the elements of the observable sequences at corresponding indexes.
     * @param arguments Observable sources.
     * @returns {Observable} An observable sequence containing lists of elements at corresponding indexes.
     */
    Observable.zipArray = function () {
        var sources = argsOrArray(arguments, 0);
        return new AnonymousObservable(function (observer) {
            var n = sources.length,
              queues = arrayInitialize(n, function () { return []; }),
              isDone = arrayInitialize(n, function () { return false; });

            function next(i) {
                if (queues.every(function (x) { return x.length > 0; })) {
                    var res = queues.map(function (x) { return x.shift(); });
                    observer.onNext(res);
                } else if (isDone.filter(function (x, j) { return j !== i; }).every(identity)) {
                    observer.onCompleted();
                    return;
                }
            };

            function done(i) {
                isDone[i] = true;
                if (isDone.every(identity)) {
                    observer.onCompleted();
                    return;
                }
            }

            var subscriptions = new Array(n);
            for (var idx = 0; idx < n; idx++) {
                (function (i) {
                    subscriptions[i] = new SingleAssignmentDisposable();
                    subscriptions[i].setDisposable(sources[i].subscribe(function (x) {
                        queues[i].push(x);
                        next(i);
                    }, observer.onError.bind(observer), function () {
                        done(i);
                    }));
                })(idx);
            }

            var compositeDisposable = new CompositeDisposable(subscriptions);
            compositeDisposable.add(disposableCreate(function () {
                for (var qIdx = 0, qLen = queues.length; qIdx < qLen; qIdx++) {
                    queues[qIdx] = [];
                }
            }));
            return compositeDisposable;
        });
    };

    /**
     *  Hides the identity of an observable sequence.
     * @returns {Observable} An observable sequence that hides the identity of the source sequence.    
     */
    observableProto.asObservable = function () {
        var source = this;
        return new AnonymousObservable(function (observer) {
            return source.subscribe(observer);
        });
    };

    /**
     *  Projects each element of an observable sequence into zero or more buffers which are produced based on element count information.
     *  
     * @example
     *  var res = xs.bufferWithCount(10);
     *  var res = xs.bufferWithCount(10, 1);
     * @param {Number} count Length of each buffer.
     * @param {Number} [skip] Number of elements to skip between creation of consecutive buffers. If not provided, defaults to the count.
     * @returns {Observable} An observable sequence of buffers.    
     */
    observableProto.bufferWithCount = function (count, skip) {
        if (arguments.length === 1) {
            skip = count;
        }
        return this.windowWithCount(count, skip).selectMany(function (x) {
            return x.toArray();
        }).where(function (x) {
            return x.length > 0;
        });
    };

    /**
     * Dematerializes the explicit notification values of an observable sequence as implicit notifications.
     * @returns {Observable} An observable sequence exhibiting the behavior corresponding to the source sequence's notification values.
     */ 
    observableProto.dematerialize = function () {
        var source = this;
        return new AnonymousObservable(function (observer) {
            return source.subscribe(function (x) {
                return x.accept(observer);
            }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };

    /**
     *  Returns an observable sequence that contains only distinct contiguous elements according to the keySelector and the comparer.
     *  
     *  var obs = observable.distinctUntilChanged();
     *  var obs = observable.distinctUntilChanged(function (x) { return x.id; });
     *  var obs = observable.distinctUntilChanged(function (x) { return x.id; }, function (x, y) { return x === y; });
     *
     * @param {Function} [keySelector] A function to compute the comparison key for each element. If not provided, it projects the value.
     * @param {Function} [comparer] Equality comparer for computed key values. If not provided, defaults to an equality comparer function.
     * @returns {Observable} An observable sequence only containing the distinct contiguous elements, based on a computed key value, from the source sequence.   
     */
    observableProto.distinctUntilChanged = function (keySelector, comparer) {
        var source = this;
        keySelector || (keySelector = identity);
        comparer || (comparer = defaultComparer);
        return new AnonymousObservable(function (observer) {
            var hasCurrentKey = false, currentKey;
            return source.subscribe(function (value) {
                var comparerEquals = false, key;
                try {
                    key = keySelector(value);
                } catch (exception) {
                    observer.onError(exception);
                    return;
                }
                if (hasCurrentKey) {
                    try {
                        comparerEquals = comparer(currentKey, key);
                    } catch (exception) {
                        observer.onError(exception);
                        return;
                    }
                }
                if (!hasCurrentKey || !comparerEquals) {
                    hasCurrentKey = true;
                    currentKey = key;
                    observer.onNext(value);
                }
            }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };

    /**
     *  Invokes an action for each element in the observable sequence and invokes an action upon graceful or exceptional termination of the observable sequence.
     *  This method can be used for debugging, logging, etc. of query behavior by intercepting the message stream to run arbitrary actions for messages on the pipeline.
     *  
     * @example
     *  var res = observable.doAction(observer);
     *  var res = observable.doAction(onNext);
     *  var res = observable.doAction(onNext, onError);
     *  var res = observable.doAction(onNext, onError, onCompleted);
     * @param {Mixed} observerOrOnNext Action to invoke for each element in the observable sequence or an observer.
     * @param {Function} [onError]  Action to invoke upon exceptional termination of the observable sequence. Used if only the observerOrOnNext parameter is also a function.
     * @param {Function} [onCompleted]  Action to invoke upon graceful termination of the observable sequence. Used if only the observerOrOnNext parameter is also a function.
     * @returns {Observable} The source sequence with the side-effecting behavior applied.   
     */
    observableProto['do'] = observableProto.doAction = function (observerOrOnNext, onError, onCompleted) {
        var source = this, onNextFunc;
        if (typeof observerOrOnNext === 'function') {
            onNextFunc = observerOrOnNext;
        } else {
            onNextFunc = observerOrOnNext.onNext.bind(observerOrOnNext);
            onError = observerOrOnNext.onError.bind(observerOrOnNext);
            onCompleted = observerOrOnNext.onCompleted.bind(observerOrOnNext);
        }
        return new AnonymousObservable(function (observer) {
            return source.subscribe(function (x) {
                try {
                    onNextFunc(x);
                } catch (e) {
                    observer.onError(e);
                }
                observer.onNext(x);
            }, function (exception) {
                if (!onError) {
                    observer.onError(exception);
                } else {
                    try {
                        onError(exception);
                    } catch (e) {
                        observer.onError(e);
                    }
                    observer.onError(exception);
                }
            }, function () {
                if (!onCompleted) {
                    observer.onCompleted();
                } else {
                    try {
                        onCompleted();
                    } catch (e) {
                        observer.onError(e);
                    }
                    observer.onCompleted();
                }
            });
        });
    };

    /**
     *  Invokes a specified action after the source observable sequence terminates gracefully or exceptionally.
     *  
     * @example
     *  var res = observable.finallyAction(function () { console.log('sequence ended'; });
     * @param {Function} finallyAction Action to invoke after the source observable sequence terminates.
     * @returns {Observable} Source sequence with the action-invoking termination behavior applied. 
     */  
    observableProto['finally'] = observableProto.finallyAction = function (action) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var subscription = source.subscribe(observer);
            return disposableCreate(function () {
                try {
                    subscription.dispose();
                } catch (e) { 
                    throw e;                    
                } finally {
                    action();
                }
            });
        });
    };

    /**
     *  Ignores all elements in an observable sequence leaving only the termination messages.
     * @returns {Observable} An empty observable sequence that signals termination, successful or exceptional, of the source sequence.    
     */
    observableProto.ignoreElements = function () {
        var source = this;
        return new AnonymousObservable(function (observer) {
            return source.subscribe(noop, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };

    /**
     *  Materializes the implicit notifications of an observable sequence as explicit notification values.
     * @returns {Observable} An observable sequence containing the materialized notification values from the source sequence.
     */    
    observableProto.materialize = function () {
        var source = this;
        return new AnonymousObservable(function (observer) {
            return source.subscribe(function (value) {
                observer.onNext(notificationCreateOnNext(value));
            }, function (e) {
                observer.onNext(notificationCreateOnError(e));
                observer.onCompleted();
            }, function () {
                observer.onNext(notificationCreateOnCompleted());
                observer.onCompleted();
            });
        });
    };

    /**
     *  Repeats the observable sequence a specified number of times. If the repeat count is not specified, the sequence repeats indefinitely.
     *  
     * @example
     *  var res = repeated = source.repeat();
     *  var res = repeated = source.repeat(42);
     * @param {Number} [repeatCount]  Number of times to repeat the sequence. If not provided, repeats the sequence indefinitely.
     * @returns {Observable} The observable sequence producing the elements of the given sequence repeatedly.   
     */
    observableProto.repeat = function (repeatCount) {
        return enumerableRepeat(this, repeatCount).concat();
    };

    /**
     *  Repeats the source observable sequence the specified number of times or until it successfully terminates. If the retry count is not specified, it retries indefinitely.
     *  
     * @example
     *  var res = retried = retry.repeat();
     *  var res = retried = retry.repeat(42);
     * @param {Number} [retryCount]  Number of times to retry the sequence. If not provided, retry the sequence indefinitely.
     * @returns {Observable} An observable sequence producing the elements of the given sequence repeatedly until it terminates successfully. 
     */
    observableProto.retry = function (retryCount) {
        return enumerableRepeat(this, retryCount).catchException();
    };

    /**
     *  Applies an accumulator function over an observable sequence and returns each intermediate result. The optional seed value is used as the initial accumulator value.
     *  For aggregation behavior with no intermediate results, see Observable.aggregate.
     * @example
     *  var res = source.scan(function (acc, x) { return acc + x; });
     *  var res = source.scan(0, function (acc, x) { return acc + x; });
     * @param {Mixed} [seed] The initial accumulator value.
     * @param {Function} accumulator An accumulator function to be invoked on each element.
     * @returns {Observable} An observable sequence containing the accumulated values.
     */
    observableProto.scan = function () {
        var hasSeed = false, seed, accumulator, source = this;
        if (arguments.length === 2) {
            hasSeed = true;
            seed = arguments[0];
            accumulator = arguments[1];        
        } else {
            accumulator = arguments[0];
        }
        return new AnonymousObservable(function (observer) {
            var hasAccumulation, accumulation, hasValue;
            return source.subscribe (
                function (x) {
                    try {
                        if (!hasValue) {
                            hasValue = true;
                        }
     
                        if (hasAccumulation) {
                            accumulation = accumulator(accumulation, x);
                        } else {
                            accumulation = hasSeed ? accumulator(seed, x) : x;
                            hasAccumulation = true;
                        }                    
                    } catch (e) {
                        observer.onError(e);
                        return;
                    }
     
                    observer.onNext(accumulation);
                },
                observer.onError.bind(observer),
                function () {
                    if (!hasValue && hasSeed) {
                        observer.onNext(seed);
                    }
                    observer.onCompleted();
                }
            );
        });
    };

    /**
     *  Bypasses a specified number of elements at the end of an observable sequence.
     * @description
     *  This operator accumulates a queue with a length enough to store the first `count` elements. As more elements are
     *  received, elements are taken from the front of the queue and produced on the result sequence. This causes elements to be delayed.     
     * @param count Number of elements to bypass at the end of the source sequence.
     * @returns {Observable} An observable sequence containing the source sequence elements except for the bypassed ones at the end.   
     */
    observableProto.skipLast = function (count) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var q = [];
            return source.subscribe(function (x) {
                q.push(x);
                if (q.length > count) {
                    observer.onNext(q.shift());
                }
            }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };

    /**
     *  Prepends a sequence of values to an observable sequence with an optional scheduler and an argument list of values to prepend.
     *  
     *  var res = source.startWith(1, 2, 3);
     *  var res = source.startWith(Rx.Scheduler.timeout, 1, 2, 3);
     *  
     * @memberOf Observable#
     * @returns {Observable} The source sequence prepended with the specified values.  
     */
    observableProto.startWith = function () {
        var values, scheduler, start = 0;
        if (!!arguments.length && 'now' in Object(arguments[0])) {
            scheduler = arguments[0];
            start = 1;
        } else {
            scheduler = immediateScheduler;
        }
        values = slice.call(arguments, start);
        return enumerableFor([observableFromArray(values, scheduler), this]).concat();
    };

    /**
     *  Returns a specified number of contiguous elements from the end of an observable sequence, using an optional scheduler to drain the queue.
     *  
     * @example
     *  var res = source.takeLast(5);
     *  var res = source.takeLast(5, Rx.Scheduler.timeout);
     *  
     * @description
     *  This operator accumulates a buffer with a length enough to store elements count elements. Upon completion of
     *  the source sequence, this buffer is drained on the result sequence. This causes the elements to be delayed.
     * @param {Number} count Number of elements to take from the end of the source sequence.
     * @param {Scheduler} [scheduler] Scheduler used to drain the queue upon completion of the source sequence.
     * @returns {Observable} An observable sequence containing the specified number of elements from the end of the source sequence.
     */   
    observableProto.takeLast = function (count, scheduler) {
        return this.takeLastBuffer(count).selectMany(function (xs) { return observableFromArray(xs, scheduler); });
    };

    /**
     *  Returns an array with the specified number of contiguous elements from the end of an observable sequence.
     *  
     * @description
     *  This operator accumulates a buffer with a length enough to store count elements. Upon completion of the
     *  source sequence, this buffer is produced on the result sequence.       
     * @param {Number} count Number of elements to take from the end of the source sequence.
     * @returns {Observable} An observable sequence containing a single array with the specified number of elements from the end of the source sequence.
     */
    observableProto.takeLastBuffer = function (count) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var q = [];
            return source.subscribe(function (x) {
                q.push(x);
                if (q.length > count) {
                    q.shift();
                }
            }, observer.onError.bind(observer), function () {
                observer.onNext(q);
                observer.onCompleted();
            });
        });
    };

    /**
     *  Projects each element of an observable sequence into zero or more windows which are produced based on element count information.
     *  
     *  var res = xs.windowWithCount(10);
     *  var res = xs.windowWithCount(10, 1);
     * @param {Number} count Length of each window.
     * @param {Number} [skip] Number of elements to skip between creation of consecutive windows. If not specified, defaults to the count.
     * @returns {Observable} An observable sequence of windows.  
     */
    observableProto.windowWithCount = function (count, skip) {
        var source = this;
        if (count <= 0) {
            throw new Error(argumentOutOfRange);
        }
        if (arguments.length === 1) {
            skip = count;
        }
        if (skip <= 0) {
            throw new Error(argumentOutOfRange);
        }
        return new AnonymousObservable(function (observer) {
            var m = new SingleAssignmentDisposable(),
                refCountDisposable = new RefCountDisposable(m),
                n = 0,
                q = [],
                createWindow = function () {
                    var s = new Subject();
                    q.push(s);
                    observer.onNext(addRef(s, refCountDisposable));
                };
            createWindow();
            m.setDisposable(source.subscribe(function (x) {
                var s;
                for (var i = 0, len = q.length; i < len; i++) {
                    q[i].onNext(x);
                }
                var c = n - count + 1;
                if (c >= 0 && c % skip === 0) {
                    s = q.shift();
                    s.onCompleted();
                }
                n++;
                if (n % skip === 0) {
                    createWindow();
                }
            }, function (exception) {
                while (q.length > 0) {
                    q.shift().onError(exception);
                }
                observer.onError(exception);
            }, function () {
                while (q.length > 0) {
                    q.shift().onCompleted();
                }
                observer.onCompleted();
            }));
            return refCountDisposable;
        });
    };

    /**
     *  Returns the elements of the specified sequence or the specified value in a singleton sequence if the sequence is empty.
     *  
     *  var res = obs = xs.defaultIfEmpty();
     *  2 - obs = xs.defaultIfEmpty(false);
     *      
     * @memberOf Observable#
     * @param defaultValue The value to return if the sequence is empty. If not provided, this defaults to null.
     * @returns {Observable} An observable sequence that contains the specified default value if the source is empty; otherwise, the elements of the source itself. 
     */
    observableProto.defaultIfEmpty = function (defaultValue) {
        var source = this;
        if (defaultValue === undefined) {
            defaultValue = null;
        }
        return new AnonymousObservable(function (observer) {
            var found = false;
            return source.subscribe(function (x) {
                found = true;
                observer.onNext(x);
            }, observer.onError.bind(observer), function () {
                if (!found) {
                    observer.onNext(defaultValue);
                }
                observer.onCompleted();
            });
        });
    };

    /**
     *  Returns an observable sequence that contains only distinct elements according to the keySelector and the comparer.
     *  Usage of this operator should be considered carefully due to the maintenance of an internal lookup structure which can grow large. 
     * 
     * @example
     *  var res = obs = xs.distinct();
     *  2 - obs = xs.distinct(function (x) { return x.id; });
     *  2 - obs = xs.distinct(function (x) { return x.id; }, function (x) { return x.toString(); });  
     * @param {Function} [keySelector]  A function to compute the comparison key for each element.
     * @param {Function} [keySerializer]  Used to serialize the given object into a string for object comparison.
     * @returns {Observable} An observable sequence only containing the distinct elements, based on a computed key value, from the source sequence.
     */
   observableProto.distinct = function (keySelector, keySerializer) {
        var source = this;
        keySelector || (keySelector = identity);
        keySerializer || (keySerializer = defaultKeySerializer);
        return new AnonymousObservable(function (observer) {
            var hashSet = {};
            return source.subscribe(function (x) {
                var key, serializedKey, otherKey, hasMatch = false;
                try {
                    key = keySelector(x);
                    serializedKey = keySerializer(key);
                } catch (exception) {
                    observer.onError(exception);
                    return;
                }
                for (otherKey in hashSet) {
                    if (serializedKey === otherKey) {
                        hasMatch = true;
                        break;
                    }
                }
                if (!hasMatch) {
                    hashSet[serializedKey] = null;
                    observer.onNext(x);
                }
            }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };

    /**
     *  Groups the elements of an observable sequence according to a specified key selector function and comparer and selects the resulting elements by using a specified function.
     *  
     * @example
     *  var res = observable.groupBy(function (x) { return x.id; });
     *  2 - observable.groupBy(function (x) { return x.id; }), function (x) { return x.name; });
     *  3 - observable.groupBy(function (x) { return x.id; }), function (x) { return x.name; }, function (x) { return x.toString(); });
     * @param {Function} keySelector A function to extract the key for each element.
     * @param {Function} [elementSelector]  A function to map each source element to an element in an observable group.
     * @param {Function} [keySerializer]  Used to serialize the given object into a string for object comparison.
     * @returns {Observable} A sequence of observable groups, each of which corresponds to a unique key value, containing all elements that share that same key value.    
     */
    observableProto.groupBy = function (keySelector, elementSelector, keySerializer) {
        return this.groupByUntil(keySelector, elementSelector, function () {
            return observableNever();
        }, keySerializer);
    };

    /**
     *  Groups the elements of an observable sequence according to a specified key selector function.
     *  A duration selector function is used to control the lifetime of groups. When a group expires, it receives an OnCompleted notification. When a new element with the same
     *  key value as a reclaimed group occurs, the group will be reborn with a new lifetime request.
     *  
     * @example
     *  var res = observable.groupByUntil(function (x) { return x.id; }, null,  function () { return Rx.Observable.never(); });
     *  2 - observable.groupBy(function (x) { return x.id; }), function (x) { return x.name; },  function () { return Rx.Observable.never(); });
     *  3 - observable.groupBy(function (x) { return x.id; }), function (x) { return x.name; },  function () { return Rx.Observable.never(); }, function (x) { return x.toString(); });
     * @param {Function} keySelector A function to extract the key for each element.
     * @param {Function} durationSelector A function to signal the expiration of a group.
     * @param {Function} [keySerializer]  Used to serialize the given object into a string for object comparison.
     * @returns {Observable} 
     *  A sequence of observable groups, each of which corresponds to a unique key value, containing all elements that share that same key value.
     *  If a group's lifetime expires, a new group with the same key value can be created once an element with such a key value is encoutered.
     *      
     */
    observableProto.groupByUntil = function (keySelector, elementSelector, durationSelector, keySerializer) {
        var source = this;
        elementSelector || (elementSelector = identity);
        keySerializer || (keySerializer = defaultKeySerializer);
        return new AnonymousObservable(function (observer) {
            var map = {},
                groupDisposable = new CompositeDisposable(),
                refCountDisposable = new RefCountDisposable(groupDisposable);
            groupDisposable.add(source.subscribe(function (x) {
                var duration, durationGroup, element, fireNewMapEntry, group, key, serializedKey, md, writer, w;
                try {
                    key = keySelector(x);
                    serializedKey = keySerializer(key);
                } catch (e) {
                    for (w in map) {
                        map[w].onError(e);
                    }
                    observer.onError(e);
                    return;
                }
                fireNewMapEntry = false;
                try {
                    writer = map[serializedKey];
                    if (!writer) {
                        writer = new Subject();
                        map[serializedKey] = writer;
                        fireNewMapEntry = true;
                    }
                } catch (e) {
                    for (w in map) {
                        map[w].onError(e);
                    }
                    observer.onError(e);
                    return;
                }
                if (fireNewMapEntry) {
                    group = new GroupedObservable(key, writer, refCountDisposable);
                    durationGroup = new GroupedObservable(key, writer);
                    try {
                        duration = durationSelector(durationGroup);
                    } catch (e) {
                        for (w in map) {
                            map[w].onError(e);
                        }
                        observer.onError(e);
                        return;
                    }
                    observer.onNext(group);
                    md = new SingleAssignmentDisposable();
                    groupDisposable.add(md);
                    var expire = function  () {
                        if (serializedKey in map) {
                            delete map[serializedKey];
                            writer.onCompleted();
                        }
                        groupDisposable.remove(md);
                    };
                    md.setDisposable(duration.take(1).subscribe(noop, function (exn) {
                        for (w in map) {
                            map[w].onError(exn);
                        }
                        observer.onError(exn);
                    }, function () {
                        expire();
                    }));
                }
                try {
                    element = elementSelector(x);
                } catch (e) {
                    for (w in map) {
                        map[w].onError(e);
                    }
                    observer.onError(e);
                    return;
                }
                writer.onNext(element);
            }, function (ex) {
                for (var w in map) {
                    map[w].onError(ex);
                }
                observer.onError(ex);
            }, function () {
                for (var w in map) {
                    map[w].onCompleted();
                }
                observer.onCompleted();
            }));
            return refCountDisposable;
        });
    };

    /**
     *  Projects each element of an observable sequence into a new form by incorporating the element's index.
     * @param {Function} selector A transform function to apply to each source element; the second parameter of the function represents the index of the source element.
     * @param {Any} [thisArg] Object to use as this when executing callback.
     * @returns {Observable} An observable sequence whose elements are the result of invoking the transform function on each element of source. 
     */
    observableProto.select = observableProto.map = function (selector, thisArg) {
        var parent = this;
        return new AnonymousObservable(function (observer) {
            var count = 0;
            return parent.subscribe(function (value) {
                var result;
                try {
                    result = selector.call(thisArg, value, count++, parent);
                } catch (exception) {
                    observer.onError(exception);
                    return;
                }
                observer.onNext(result);
            }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };

    /**
     * Retrieves the value of a specified property from all elements in the Observable sequence.
     * @param {String} property The property to pluck.
     * @returns {Observable} Returns a new Observable sequence of property values.
     */
    observableProto.pluck = function (property) {
        return this.select(function (x) { return x[property]; });
    };

    function selectMany(selector) {
      return this.select(function (x, i) {
        var result = selector(x, i);
        return isPromise(result) ? observableFromPromise(result) : result;
      }).mergeObservable();
    }

    /**
     *  One of the Following:
     *  Projects each element of an observable sequence to an observable sequence and merges the resulting observable sequences into one observable sequence.
     *  
     * @example
     *  var res = source.selectMany(function (x) { return Rx.Observable.range(0, x); });
     *  Or:
     *  Projects each element of an observable sequence to an observable sequence, invokes the result selector for the source element and each of the corresponding inner sequence's elements, and merges the results into one observable sequence.
     *  
     *  var res = source.selectMany(function (x) { return Rx.Observable.range(0, x); }, function (x, y) { return x + y; });
     *  Or:
     *  Projects each element of the source observable sequence to the other observable sequence and merges the resulting observable sequences into one observable sequence.
     *  
     *  var res = source.selectMany(Rx.Observable.fromArray([1,2,3]));
     * @param selector A transform function to apply to each element or an observable sequence to project each element from the 
     * source sequence onto which could be either an observable or Promise.
     * @param {Function} [resultSelector]  A transform function to apply to each element of the intermediate sequence.
     * @returns {Observable} An observable sequence whose elements are the result of invoking the one-to-many transform function collectionSelector on each element of the input sequence and then mapping each of those sequence elements and their corresponding source element to a result element.   
     */
    observableProto.selectMany = observableProto.flatMap = function (selector, resultSelector) {
      if (resultSelector) {
          return this.selectMany(function (x, i) {
            var selectorResult = selector(x, i),
              result = isPromise(selectorResult) ? observableFromPromise(selectorResult) : selectorResult;

            return result.select(function (y) {
              return resultSelector(x, y, i);
            });
          });
      }
      if (typeof selector === 'function') {
        return selectMany.call(this, selector);
      }
      return selectMany.call(this, function () {
        return selector;
      });
    };

    /**
     *  Projects each element of an observable sequence into a new sequence of observable sequences by incorporating the element's index and then 
     *  transforms an observable sequence of observable sequences into an observable sequence producing values only from the most recent observable sequence.
     * @param {Function} selector A transform function to apply to each source element; the second parameter of the function represents the index of the source element.
     * @param {Any} [thisArg] Object to use as this when executing callback.
     * @returns {Observable} An observable sequence whose elements are the result of invoking the transform function on each element of source producing an Observable of Observable sequences 
     *  and that at any point in time produces the elements of the most recent inner observable sequence that has been received.
     */
    observableProto.selectSwitch = observableProto.flatMapLatest = function (selector, thisArg) {
        return this.select(selector, thisArg).switchLatest();
    };

    /**
     * Bypasses a specified number of elements in an observable sequence and then returns the remaining elements.
     * @param {Number} count The number of elements to skip before returning the remaining elements.
     * @returns {Observable} An observable sequence that contains the elements that occur after the specified index in the input sequence.   
     */
    observableProto.skip = function (count) {
        if (count < 0) {
            throw new Error(argumentOutOfRange);
        }
        var observable = this;
        return new AnonymousObservable(function (observer) {
            var remaining = count;
            return observable.subscribe(function (x) {
                if (remaining <= 0) {
                    observer.onNext(x);
                } else {
                    remaining--;
                }
            }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };

    /**
     *  Bypasses elements in an observable sequence as long as a specified condition is true and then returns the remaining elements.
     *  The element's index is used in the logic of the predicate function.
     *  
     *  var res = source.skipWhile(function (value) { return value < 10; });
     *  var res = source.skipWhile(function (value, index) { return value < 10 || index < 10; });
     * @param {Function} predicate A function to test each element for a condition; the second parameter of the function represents the index of the source element.
     * @param {Any} [thisArg] Object to use as this when executing callback.     
     * @returns {Observable} An observable sequence that contains the elements from the input sequence starting at the first element in the linear series that does not pass the test specified by predicate.   
     */
    observableProto.skipWhile = function (predicate, thisArg) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var i = 0, running = false;
            return source.subscribe(function (x) {
                if (!running) {
                    try {
                        running = !predicate.call(thisArg, x, i++, source);
                    } catch (e) {
                        observer.onError(e);
                        return;
                    }
                }
                if (running) {
                    observer.onNext(x);
                }
            }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };

    /**
     *  Returns a specified number of contiguous elements from the start of an observable sequence, using the specified scheduler for the edge case of take(0).
     *  
     *  var res = source.take(5);
     *  var res = source.take(0, Rx.Scheduler.timeout);
     * @param {Number} count The number of elements to return.
     * @param {Scheduler} [scheduler] Scheduler used to produce an OnCompleted message in case <paramref name="count count</paramref> is set to 0.
     * @returns {Observable} An observable sequence that contains the specified number of elements from the start of the input sequence.  
     */
    observableProto.take = function (count, scheduler) {
        if (count < 0) {
            throw new Error(argumentOutOfRange);
        }
        if (count === 0) {
            return observableEmpty(scheduler);
        }
        var observable = this;
        return new AnonymousObservable(function (observer) {
            var remaining = count;
            return observable.subscribe(function (x) {
                if (remaining > 0) {
                    remaining--;
                    observer.onNext(x);
                    if (remaining === 0) {
                        observer.onCompleted();
                    }
                }
            }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };

    /**
     *  Returns elements from an observable sequence as long as a specified condition is true.
     *  The element's index is used in the logic of the predicate function.
     *  
     * @example
     *  var res = source.takeWhile(function (value) { return value < 10; });
     *  var res = source.takeWhile(function (value, index) { return value < 10 || index < 10; });
     * @param {Function} predicate A function to test each element for a condition; the second parameter of the function represents the index of the source element.
     * @param {Any} [thisArg] Object to use as this when executing callback.     
     * @returns {Observable} An observable sequence that contains the elements from the input sequence that occur before the element at which the test no longer passes.  
     */
    observableProto.takeWhile = function (predicate, thisArg) {
        var observable = this;
        return new AnonymousObservable(function (observer) {
            var i = 0, running = true;
            return observable.subscribe(function (x) {
                if (running) {
                    try {
                        running = predicate.call(thisArg, x, i++, observable);
                    } catch (e) {
                        observer.onError(e);
                        return;
                    }
                    if (running) {
                        observer.onNext(x);
                    } else {
                        observer.onCompleted();
                    }
                }
            }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };

    /**
     *  Filters the elements of an observable sequence based on a predicate by incorporating the element's index.
     *  
     * @example
     *  var res = source.where(function (value) { return value < 10; });
     *  var res = source.where(function (value, index) { return value < 10 || index < 10; });
     * @param {Function} predicate A function to test each source element for a condition; the second parameter of the function represents the index of the source element.
     * @param {Any} [thisArg] Object to use as this when executing callback.
     * @returns {Observable} An observable sequence that contains elements from the input sequence that satisfy the condition.   
     */
    observableProto.where = observableProto.filter = function (predicate, thisArg) {
        var parent = this;
        return new AnonymousObservable(function (observer) {
            var count = 0;
            return parent.subscribe(function (value) {
                var shouldRun;
                try {
                    shouldRun = predicate.call(thisArg, value, count++, parent);
                } catch (exception) {
                    observer.onError(exception);
                    return;
                }
                if (shouldRun) {
                    observer.onNext(value);
                }
            }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };

    var AnonymousObservable = Rx.AnonymousObservable = (function (_super) {
        inherits(AnonymousObservable, _super);

        // Fix subscriber to check for undefined or function returned to decorate as Disposable
        function fixSubscriber(subscriber) {
            if (typeof subscriber === 'undefined') {
                subscriber = disposableEmpty;
            } else if (typeof subscriber === 'function') {
                subscriber = disposableCreate(subscriber);
            }

            return subscriber;
        }

        function AnonymousObservable(subscribe) {
            if (!(this instanceof AnonymousObservable)) {
                return new AnonymousObservable(subscribe);
            }

            function s(observer) {
                var autoDetachObserver = new AutoDetachObserver(observer);
                if (currentThreadScheduler.scheduleRequired()) {
                    currentThreadScheduler.schedule(function () {
                        try {
                            autoDetachObserver.setDisposable(fixSubscriber(subscribe(autoDetachObserver)));
                        } catch (e) {
                            if (!autoDetachObserver.fail(e)) {
                                throw e;
                            } 
                        }
                    });
                } else {
                    try {
                        autoDetachObserver.setDisposable(fixSubscriber(subscribe(autoDetachObserver)));
                    } catch (e) {
                        if (!autoDetachObserver.fail(e)) {
                            throw e;
                        }
                    }
                }

                return autoDetachObserver;
            }

            _super.call(this, s);
        }

        return AnonymousObservable;

    }(Observable));

    /** @private */
    var AutoDetachObserver = (function (_super) {
        inherits(AutoDetachObserver, _super);

        function AutoDetachObserver(observer) {
            _super.call(this);
            this.observer = observer;
            this.m = new SingleAssignmentDisposable();
        }

        var AutoDetachObserverPrototype = AutoDetachObserver.prototype;

        AutoDetachObserverPrototype.next = function (value) {
            var noError = false;
            try {
                this.observer.onNext(value);
                noError = true;
            } catch (e) { 
                throw e;                
            } finally {
                if (!noError) {
                    this.dispose();
                }
            }
        };

        AutoDetachObserverPrototype.error = function (exn) {
            try {
                this.observer.onError(exn);
            } catch (e) { 
                throw e;                
            } finally {
                this.dispose();
            }
        };

        AutoDetachObserverPrototype.completed = function () {
            try {
                this.observer.onCompleted();
            } catch (e) { 
                throw e;                
            } finally {
                this.dispose();
            }
        };

        AutoDetachObserverPrototype.setDisposable = function (value) { this.m.setDisposable(value); };
        AutoDetachObserverPrototype.getDisposable = function (value) { return this.m.getDisposable(); };
        /* @private */
        AutoDetachObserverPrototype.disposable = function (value) {
            return arguments.length ? this.getDisposable() : setDisposable(value);
        };

        AutoDetachObserverPrototype.dispose = function () {
            _super.prototype.dispose.call(this);
            this.m.dispose();
        };

        return AutoDetachObserver;
    }(AbstractObserver));

    /** @private */
    var GroupedObservable = (function (_super) {
        inherits(GroupedObservable, _super);

        function subscribe(observer) {
            return this.underlyingObservable.subscribe(observer);
        }

        /** 
         * @constructor
         * @private
         */
        function GroupedObservable(key, underlyingObservable, mergedDisposable) {
            _super.call(this, subscribe);
            this.key = key;
            this.underlyingObservable = !mergedDisposable ?
                underlyingObservable :
                new AnonymousObservable(function (observer) {
                    return new CompositeDisposable(mergedDisposable.getDisposable(), underlyingObservable.subscribe(observer));
                });
        }

        return GroupedObservable;
    }(Observable));

    /** @private */
    var InnerSubscription = function (subject, observer) {
        this.subject = subject;
        this.observer = observer;
    };

    /**
     * @private
     * @memberOf InnerSubscription
     */
    InnerSubscription.prototype.dispose = function () {
        if (!this.subject.isDisposed && this.observer !== null) {
            var idx = this.subject.observers.indexOf(this.observer);
            this.subject.observers.splice(idx, 1);
            this.observer = null;
        }
    };

    /**
     *  Represents an object that is both an observable sequence as well as an observer.
     *  Each notification is broadcasted to all subscribed observers.
     */
    var Subject = Rx.Subject = (function (_super) {
        function subscribe(observer) {
            checkDisposed.call(this);
            if (!this.isStopped) {
                this.observers.push(observer);
                return new InnerSubscription(this, observer);
            }
            if (this.exception) {
                observer.onError(this.exception);
                return disposableEmpty;
            }
            observer.onCompleted();
            return disposableEmpty;
        }

        inherits(Subject, _super);

        /**
         * Creates a subject.
         * @constructor
         */      
        function Subject() {
            _super.call(this, subscribe);
            this.isDisposed = false,
            this.isStopped = false,
            this.observers = [];
        }

        addProperties(Subject.prototype, Observer, {
            /**
             * Indicates whether the subject has observers subscribed to it.
             * @returns {Boolean} Indicates whether the subject has observers subscribed to it.
             */         
            hasObservers: function () {
                return this.observers.length > 0;
            },
            /**
             * Notifies all subscribed observers about the end of the sequence.
             */                          
            onCompleted: function () {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var os = this.observers.slice(0);
                    this.isStopped = true;
                    for (var i = 0, len = os.length; i < len; i++) {
                        os[i].onCompleted();
                    }

                    this.observers = [];
                }
            },
            /**
             * Notifies all subscribed observers about the exception.
             * @param {Mixed} error The exception to send to all observers.
             */               
            onError: function (exception) {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var os = this.observers.slice(0);
                    this.isStopped = true;
                    this.exception = exception;
                    for (var i = 0, len = os.length; i < len; i++) {
                        os[i].onError(exception);
                    }

                    this.observers = [];
                }
            },
            /**
             * Notifies all subscribed observers about the arrival of the specified element in the sequence.
             * @param {Mixed} value The value to send to all observers.
             */                 
            onNext: function (value) {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var os = this.observers.slice(0);
                    for (var i = 0, len = os.length; i < len; i++) {
                        os[i].onNext(value);
                    }
                }
            },
            /**
             * Unsubscribe all observers and release resources.
             */                
            dispose: function () {
                this.isDisposed = true;
                this.observers = null;
            }
        });

        /**
         * Creates a subject from the specified observer and observable.
         * @param {Observer} observer The observer used to send messages to the subject.
         * @param {Observable} observable The observable used to subscribe to messages sent from the subject.
         * @returns {Subject} Subject implemented using the given observer and observable.
         */
        Subject.create = function (observer, observable) {
            return new AnonymousSubject(observer, observable);
        };

        return Subject;
    }(Observable));

    /**
     *  Represents the result of an asynchronous operation.
     *  The last value before the OnCompleted notification, or the error received through OnError, is sent to all subscribed observers.
     */   
    var AsyncSubject = Rx.AsyncSubject = (function (_super) {

        function subscribe(observer) {
            checkDisposed.call(this);
            
            if (!this.isStopped) {
                this.observers.push(observer);
                return new InnerSubscription(this, observer);
            }

            var ex = this.exception,
                hv = this.hasValue,
                v = this.value;

            if (ex) {
                observer.onError(ex);
            } else if (hv) {
                observer.onNext(v);
                observer.onCompleted();
            } else {
                observer.onCompleted();
            }

            return disposableEmpty;
        }

        inherits(AsyncSubject, _super);

        /**
         * Creates a subject that can only receive one value and that value is cached for all future observations.
         * @constructor
         */ 
        function AsyncSubject() {
            _super.call(this, subscribe);

            this.isDisposed = false;
            this.isStopped = false;
            this.value = null;
            this.hasValue = false;
            this.observers = [];
            this.exception = null;
        }

        addProperties(AsyncSubject.prototype, Observer, {
            /**
             * Indicates whether the subject has observers subscribed to it.
             * @returns {Boolean} Indicates whether the subject has observers subscribed to it.
             */         
            hasObservers: function () {
                checkDisposed.call(this);
                return this.observers.length > 0;
            },
            /**
             * Notifies all subscribed observers about the end of the sequence, also causing the last received value to be sent out (if any).
             */ 
            onCompleted: function () {
                var o, i, len;
                checkDisposed.call(this);
                if (!this.isStopped) {
                    this.isStopped = true;
                    var os = this.observers.slice(0),
                        v = this.value,
                        hv = this.hasValue;

                    if (hv) {
                        for (i = 0, len = os.length; i < len; i++) {
                            o = os[i];
                            o.onNext(v);
                            o.onCompleted();
                        }
                    } else {
                        for (i = 0, len = os.length; i < len; i++) {
                            os[i].onCompleted();
                        }
                    }

                    this.observers = [];
                }
            },
            /**
             * Notifies all subscribed observers about the exception.
             * @param {Mixed} error The exception to send to all observers.
             */ 
            onError: function (exception) {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var os = this.observers.slice(0);
                    this.isStopped = true;
                    this.exception = exception;

                    for (var i = 0, len = os.length; i < len; i++) {
                        os[i].onError(exception);
                    }

                    this.observers = [];
                }
            },
            /**
             * Sends a value to the subject. The last value received before successful termination will be sent to all subscribed and future observers.
             * @param {Mixed} value The value to store in the subject.
             */             
            onNext: function (value) {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    this.value = value;
                    this.hasValue = true;
                }
            },
            /**
             * Unsubscribe all observers and release resources.
             */
            dispose: function () {
                this.isDisposed = true;
                this.observers = null;
                this.exception = null;
                this.value = null;
            }
        });

        return AsyncSubject;
    }(Observable));

    /** @private */
    var AnonymousSubject = (function (_super) {
        inherits(AnonymousSubject, _super);

        function subscribe(observer) {
            return this.observable.subscribe(observer);
        }

        /**
         * @private
         * @constructor
         */
        function AnonymousSubject(observer, observable) {
            _super.call(this, subscribe);
            this.observer = observer;
            this.observable = observable;
        }

        addProperties(AnonymousSubject.prototype, Observer, {
            /**
             * @private
             * @memberOf AnonymousSubject#
            */
            onCompleted: function () {
                this.observer.onCompleted();
            },
            /**
             * @private
             * @memberOf AnonymousSubject#
            */            
            onError: function (exception) {
                this.observer.onError(exception);
            },
            /**
             * @private
             * @memberOf AnonymousSubject#
            */            
            onNext: function (value) {
                this.observer.onNext(value);
            }
        });

        return AnonymousSubject;
    }(Observable));

    if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
        root.Rx = Rx;

        define(function() {
            return Rx;
        });
    } else if (freeExports && freeModule) {
        // in Node.js or RingoJS
        if (moduleExports) {
            (freeModule.exports = Rx).Rx = Rx;
        } else {
          freeExports.Rx = Rx;
        }
    } else {
        // in a browser or Rhino
        root.Rx = Rx;
    }
}.call(this));
}).call(this,require("/usr/local/lib/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"/usr/local/lib/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":21}],16:[function(require,module,exports){
var Rx = require('./rx');
require('./rx.aggregates');
require('./rx.backpressure');
require('./rx.async');
require('./rx.binding');
require('./rx.coincidence');
require('./rx.experimental');
require('./rx.joinpatterns');
require('./rx.time');
require('./rx.virtualtime');
require('./rx.testing');

// Add specific Node functions
var EventEmitter = require('events').EventEmitter,
    Observable = Rx.Observable;

Rx.Node = {
    /**
     * @deprecated Use Rx.Observable.fromCallback from rx.async.js instead.
     *
     * Converts a callback function to an observable sequence. 
     * 
     * @param {Function} func Function to convert to an asynchronous function.
     * @param {Scheduler} [scheduler] Scheduler to run the function on. If not specified, defaults to Scheduler.timeout.
     * @param {Mixed} [context] The context for the func parameter to be executed.  If not specified, defaults to undefined.
     * @param {Function} [selector] A selector which takes the arguments from the event handler to produce a single item to yield on next.     
     * @returns {Function} Asynchronous function.
     */
    fromCallback: function (func, scheduler, context, selector) {
        return Observable.fromCallback(func, scheduler, context, selector);
    },

    /**
     * @deprecated Use Rx.Observable.fromNodeCallback from rx.async.js instead.
     *
     * Converts a Node.js callback style function to an observable sequence.  This must be in function (err, ...) format.
     *
     * @param {Function} func The function to call
     * @param {Scheduler} [scheduler] Scheduler to run the function on. If not specified, defaults to Scheduler.timeout.
     * @param {Mixed} [context] The context for the func parameter to be executed.  If not specified, defaults to undefined.
     * @param {Function} [selector] A selector which takes the arguments from the event handler to produce a single item to yield on next.     
     * @returns {Function} An async function which when applied, returns an observable sequence with the callback arguments as an array.
     */
    fromNodeCallback: function (func, scheduler, context, selector) {
        return Observable.fromNodeCallback(func, scheduler, context, selector);
    },

    /**
     * @deprecated Use Rx.Observable.fromNodeCallback from rx.async.js instead.
     *    
     * Handles an event from the given EventEmitter as an observable sequence.
     *
     * @param {EventEmitter} eventEmitter The EventEmitter to subscribe to the given event.
     * @param {String} eventName The event name to subscribe
     * @param {Function} [selector] A selector which takes the arguments from the event handler to produce a single item to yield on next.     
     * @returns {Observable} An observable sequence generated from the named event from the given EventEmitter.  The data will be returned as an array of arguments to the handler.
     */
    fromEvent: function (eventEmitter, eventName, selector) {
        return Observable.fromEvent(eventEmitter, eventName, selector);
    },

    /**
     * Converts the given observable sequence to an event emitter with the given event name. 
     * The errors are handled on the 'error' event and completion on the 'end' event.
     * @param {Observable} observable The observable sequence to convert to an EventEmitter.
     * @param {String} eventName The event name to emit onNext calls.
     * @returns {EventEmitter} An EventEmitter which emits the given eventName for each onNext call in addition to 'error' and 'end' events.  
     *   You must call publish in order to invoke the subscription on the Observable sequuence.
     */
    toEventEmitter: function (observable, eventName) {
        var e = new EventEmitter();

        // Used to publish the events from the observable
        e.publish = function () {
            e.subscription = observable.subscribe(
                function (x) {
                    e.emit(eventName, x);
                }, 
                function (err) {
                    e.emit('error', err);
                },
                function () {
                    e.emit('end');
                });
        };

        return e;
    },

    /**
     * Converts a flowing stream to an Observable sequence.
     * @param {Stream} stream A stream to convert to a observable sequence.
     * @returns {Observable} An observable sequence which fires on each 'data' event as well as handling 'error' and 'end' events.
     */
    fromStream: function (stream) {
        return Observable.create(function (observer) {
            function dataHandler (data) {
                observer.onNext(data);
            }

            function errorHandler (err) {
                observer.onError(err);
            }

            function endHandler () {
                observer.onCompleted();
            }

            stream.addListener('data', dataHandler);
            stream.addListener('error', errorHandler);
            stream.addListener('end', endHandler);
            
            return function () {
                stream.removeListener('data', dataHandler);
                stream.removeListener('error', errorHandler);
                stream.removeListener('end', endHandler);
            };
        }).publish().refCount();
    },

    /**
     * Writes an observable sequence to a stream
     * @param {Observable} observable Observable sequence to write to a stream.
     * @param {Stream} stream The stream to write to.
     * @param {String} [encoding] The encoding of the item to write.
     * @returns {Disposable} The subscription handle.
     */
    writeToStream: function (observable, stream, encoding) {
        return observable.subscribe(
            function (x) {
                stream.write(String(x), encoding);
            },
            function (err) {
                stream.emit('error', err);
            }, function () {
                // Hack check because STDIO is not closable
                if (!stream._isStdio) {
                    stream.end();
                }
            });
    }
};

module.exports = Rx;
},{"./rx":15,"./rx.aggregates":8,"./rx.async":9,"./rx.backpressure":10,"./rx.binding":11,"./rx.coincidence":12,"./rx.experimental":13,"./rx.joinpatterns":14,"./rx.testing":17,"./rx.time":18,"./rx.virtualtime":19,"events":20}],17:[function(require,module,exports){
(function (global){
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.txt in the project root for license information.

;(function (factory) {
    var objectTypes = {
        'boolean': false,
        'function': true,
        'object': true,
        'number': false,
        'string': false,
        'undefined': false
    };

    var root = (objectTypes[typeof window] && window) || this,
        freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports,
        freeModule = objectTypes[typeof module] && module && !module.nodeType && module,
        moduleExports = freeModule && freeModule.exports === freeExports && freeExports,
        freeGlobal = objectTypes[typeof global] && global;
    
    if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
        root = freeGlobal;
    }

    // Because of build optimizers
    if (typeof define === 'function' && define.amd) {
        define(['rx.virtualtime', 'exports'], function (Rx, exports) {
            root.Rx = factory(root, exports, Rx);
            return root.Rx;
        });
    } else if (typeof module === 'object' && module && module.exports === freeExports) {
        module.exports = factory(root, module.exports, require('./rx'));
    } else {
        root.Rx = factory(root, {}, root.Rx);
    }
}.call(this, function (root, exp, Rx, undefined) {
    
    // Defaults
    var Observer = Rx.Observer,
        Observable = Rx.Observable,
        Notification = Rx.Notification,
        VirtualTimeScheduler = Rx.VirtualTimeScheduler,
        Disposable = Rx.Disposable,
        disposableEmpty = Disposable.empty,
        disposableCreate = Disposable.create,
        CompositeDisposable = Rx.CompositeDisposable,
        SingleAssignmentDisposable = Rx.SingleAssignmentDisposable,
        slice = Array.prototype.slice,
        inherits = Rx.internals.inherits,
        defaultComparer = Rx.internals.isEqual;

    function argsOrArray(args, idx) {
        return args.length === 1 && Array.isArray(args[idx]) ?
            args[idx] :
            slice.call(args);
    }

    /** 
     * @private 
     * @constructor
     */
    function OnNextPredicate(predicate) {
        this.predicate = predicate;
    };

    /** 
     * @private 
     * @memberOf OnNextPredicate#
     */    
    OnNextPredicate.prototype.equals = function (other) {
        if (other === this) { return true; }
        if (other == null) { return false; }
        if (other.kind !== 'N') { return false; }
        return this.predicate(other.value);
    };

    /** 
     * @private 
     * @constructor
     */
    function OnErrorPredicate(predicate) {
        this.predicate = predicate;
    };

    /** 
     * @private 
     * @memberOf OnErrorPredicate#
     */       
    OnErrorPredicate.prototype.equals = function (other) {
        if (other === this) { return true; }
        if (other == null) { return false; }
        if (other.kind !== 'E') { return false; }
        return this.predicate(other.exception);
    };

    /** 
     * @static
     * type Object
     */
    var ReactiveTest = Rx.ReactiveTest = {
        /** Default virtual time used for creation of observable sequences in unit tests. */
        created: 100,
        /** Default virtual time used to subscribe to observable sequences in unit tests. */
        subscribed: 200,
        /** Default virtual time used to dispose subscriptions in unit tests. */
        disposed: 1000,

        /**
         * Factory method for an OnNext notification record at a given time with a given value or a predicate function.
         * 
         * 1 - ReactiveTest.onNext(200, 42);
         * 2 - ReactiveTest.onNext(200, function (x) { return x.length == 2; });
         * 
         * @param ticks Recorded virtual time the OnNext notification occurs.
         * @param value Recorded value stored in the OnNext notification or a predicate.
         * @return Recorded OnNext notification.
         */
        onNext: function (ticks, value) {
            if (typeof value === 'function') {
                return new Recorded(ticks, new OnNextPredicate(value));
            }
            return new Recorded(ticks, Notification.createOnNext(value));
        },
        /**
         * Factory method for an OnError notification record at a given time with a given error.
         * 
         * 1 - ReactiveTest.onNext(200, new Error('error'));
         * 2 - ReactiveTest.onNext(200, function (e) { return e.message === 'error'; });
         * 
         * @param ticks Recorded virtual time the OnError notification occurs.
         * @param exception Recorded exception stored in the OnError notification.
         * @return Recorded OnError notification. 
         */      
        onError: function (ticks, exception) {
            if (typeof exception === 'function') {
                return new Recorded(ticks, new OnErrorPredicate(exception));
            }
            return new Recorded(ticks, Notification.createOnError(exception));
        },
        /**
         * Factory method for an OnCompleted notification record at a given time.
         * 
         * @param ticks Recorded virtual time the OnCompleted notification occurs.
         * @return Recorded OnCompleted notification.
         */
        onCompleted: function (ticks) {
            return new Recorded(ticks, Notification.createOnCompleted());
        },
        /**
         * Factory method for a subscription record based on a given subscription and disposal time.
         * 
         * @param start Virtual time indicating when the subscription was created.
         * @param end Virtual time indicating when the subscription was disposed.
         * @return Subscription object.
         */
        subscribe: function (start, end) {
            return new Subscription(start, end);
        }
    };

    /**
     * Creates a new object recording the production of the specified value at the given virtual time.
     *
     * @constructor
     * @param {Number} time Virtual time the value was produced on.
     * @param {Mixed} value Value that was produced.
     * @param {Function} comparer An optional comparer.
     */
    var Recorded = Rx.Recorded = function (time, value, comparer) {
        this.time = time;
        this.value = value;
        this.comparer = comparer || defaultComparer;
    };

    /**
     * Checks whether the given recorded object is equal to the current instance.
     *
     * @param {Recorded} other Recorded object to check for equality.
     * @returns {Boolean} true if both objects are equal; false otherwise.  
     */  
    Recorded.prototype.equals = function (other) {
        return this.time === other.time && this.comparer(this.value, other.value);
    };

    /**
     * Returns a string representation of the current Recorded value.
     *
     * @returns {String} String representation of the current Recorded value. 
     */   
    Recorded.prototype.toString = function () {
        return this.value.toString() + '@' + this.time;
    };

    /**
     * Creates a new subscription object with the given virtual subscription and unsubscription time.
     * 
     * @constructor
     * @param {Number} subscribe Virtual time at which the subscription occurred.
     * @param {Number} unsubscribe Virtual time at which the unsubscription occurred.
     */
    var Subscription = Rx.Subscription = function (start, end) {
        this.subscribe = start;
        this.unsubscribe = end || Number.MAX_VALUE;
    };

    /**
     * Checks whether the given subscription is equal to the current instance.
     * @param other Subscription object to check for equality.
     * @returns {Boolean} true if both objects are equal; false otherwise.
     */
    Subscription.prototype.equals = function (other) {
        return this.subscribe === other.subscribe && this.unsubscribe === other.unsubscribe;
    };

    /**
     * Returns a string representation of the current Subscription value.
     * @returns {String} String representation of the current Subscription value.
     */
    Subscription.prototype.toString = function () {
        return '(' + this.subscribe + ', ' + this.unsubscribe === Number.MAX_VALUE ? 'Infinite' : this.unsubscribe + ')';
    };

    /** @private */
    var MockDisposable = Rx.MockDisposable = function (scheduler) {
        this.scheduler = scheduler;
        this.disposes = [];
        this.disposes.push(this.scheduler.clock);
    };

    /*
     * @memberOf MockDisposable#
     * @prviate
     */
    MockDisposable.prototype.dispose = function () {
        this.disposes.push(this.scheduler.clock);
    };

    /** @private */
    var MockObserver = (function (_super) {
        inherits(MockObserver, _super);

        /*
         * @constructor
         * @prviate
         */
        function MockObserver(scheduler) {
            _super.call(this);
            this.scheduler = scheduler;
            this.messages = [];
        }

        var MockObserverPrototype = MockObserver.prototype;

        /*
         * @memberOf MockObserverPrototype#
         * @prviate
         */
        MockObserverPrototype.onNext = function (value) {
            this.messages.push(new Recorded(this.scheduler.clock, Notification.createOnNext(value)));
        };

        /*
         * @memberOf MockObserverPrototype#
         * @prviate
         */
        MockObserverPrototype.onError = function (exception) {
            this.messages.push(new Recorded(this.scheduler.clock, Notification.createOnError(exception)));
        };

        /*
         * @memberOf MockObserverPrototype#
         * @prviate
         */
        MockObserverPrototype.onCompleted = function () {
            this.messages.push(new Recorded(this.scheduler.clock, Notification.createOnCompleted()));
        };

        return MockObserver;
    })(Observer);

    /** @private */    
    var HotObservable = (function (_super) {

        function subscribe(observer) {
            var observable = this;
            this.observers.push(observer);
            this.subscriptions.push(new Subscription(this.scheduler.clock));
            var index = this.subscriptions.length - 1;
            return disposableCreate(function () {
                var idx = observable.observers.indexOf(observer);
                observable.observers.splice(idx, 1);
                observable.subscriptions[index] = new Subscription(observable.subscriptions[index].subscribe, observable.scheduler.clock);
            });
        }

        inherits(HotObservable, _super);

        /**
         * @private
         * @constructor
         */
        function HotObservable(scheduler, messages) {
            _super.call(this, subscribe);
            var message, notification, observable = this;
            this.scheduler = scheduler;
            this.messages = messages;
            this.subscriptions = [];
            this.observers = [];
            for (var i = 0, len = this.messages.length; i < len; i++) {
                message = this.messages[i];
                notification = message.value;
                (function (innerNotification) {
                    scheduler.scheduleAbsoluteWithState(null, message.time, function () {
                        var obs = observable.observers.slice(0);

                        for (var j = 0, jLen = obs.length; j < jLen; j++) {
                            innerNotification.accept(obs[j]);
                        }
                        return disposableEmpty;
                    });
                })(notification);
            }
        }

        return HotObservable;
    })(Observable);

    /** @private */
    var ColdObservable = (function (_super) {

        function subscribe(observer) {
            var message, notification, observable = this;
            this.subscriptions.push(new Subscription(this.scheduler.clock));
            var index = this.subscriptions.length - 1;
            var d = new CompositeDisposable();
            for (var i = 0, len = this.messages.length; i < len; i++) {
                message = this.messages[i];
                notification = message.value;
                (function (innerNotification) {
                    d.add(observable.scheduler.scheduleRelativeWithState(null, message.time, function () {
                        innerNotification.accept(observer);
                        return disposableEmpty;
                    }));
                })(notification);
            }
            return disposableCreate(function () {
                observable.subscriptions[index] = new Subscription(observable.subscriptions[index].subscribe, observable.scheduler.clock);
                d.dispose();
            });
        }

        inherits(ColdObservable, _super);

        /**
         * @private
         * @constructor
         */
        function ColdObservable(scheduler, messages) {
            _super.call(this, subscribe);
            this.scheduler = scheduler;
            this.messages = messages;
            this.subscriptions = [];
        }

        return ColdObservable;
    })(Observable);

    /** Virtual time scheduler used for testing applications and libraries built using Reactive Extensions. */
    Rx.TestScheduler = (function (_super) {
        inherits(TestScheduler, _super);

        function baseComparer(x, y) {
            return x > y ? 1 : (x < y ? -1 : 0);
        }

        /** @constructor */
        function TestScheduler() {
            _super.call(this, 0, baseComparer);
        }

        /**
         * Schedules an action to be executed at the specified virtual time.
         * 
         * @param state State passed to the action to be executed.
         * @param dueTime Absolute virtual time at which to execute the action.
         * @param action Action to be executed.
         * @return Disposable object used to cancel the scheduled action (best effort).
         */
        TestScheduler.prototype.scheduleAbsoluteWithState = function (state, dueTime, action) {
            if (dueTime <= this.clock) {
                dueTime = this.clock + 1;
            }
            return _super.prototype.scheduleAbsoluteWithState.call(this, state, dueTime, action);
        };
        /**
         * Adds a relative virtual time to an absolute virtual time value.
         * 
         * @param absolute Absolute virtual time value.
         * @param relative Relative virtual time value to add.
         * @return Resulting absolute virtual time sum value.
         */
        TestScheduler.prototype.add = function (absolute, relative) {
            return absolute + relative;
        };
        /**
         * Converts the absolute virtual time value to a DateTimeOffset value.
         * 
         * @param absolute Absolute virtual time value to convert.
         * @return Corresponding DateTimeOffset value.
         */
        TestScheduler.prototype.toDateTimeOffset = function (absolute) {
            return new Date(absolute).getTime();
        };
        /**
         * Converts the TimeSpan value to a relative virtual time value.
         * 
         * @param timeSpan TimeSpan value to convert.
         * @return Corresponding relative virtual time value.
         */
        TestScheduler.prototype.toRelative = function (timeSpan) {
            return timeSpan;
        };
        /**
         * Starts the test scheduler and uses the specified virtual times to invoke the factory function, subscribe to the resulting sequence, and dispose the subscription.
         * 
         * @param create Factory method to create an observable sequence.
         * @param created Virtual time at which to invoke the factory to create an observable sequence.
         * @param subscribed Virtual time at which to subscribe to the created observable sequence.
         * @param disposed Virtual time at which to dispose the subscription.
         * @return Observer with timestamped recordings of notification messages that were received during the virtual time window when the subscription to the source sequence was active.
         */        
        TestScheduler.prototype.startWithTiming = function (create, created, subscribed, disposed) {
            var observer = this.createObserver(), source, subscription;
            this.scheduleAbsoluteWithState(null, created, function () {
                source = create();
                return disposableEmpty;
            });
            this.scheduleAbsoluteWithState(null, subscribed, function () {
                subscription = source.subscribe(observer);
                return disposableEmpty;
            });
            this.scheduleAbsoluteWithState(null, disposed, function () {
                subscription.dispose();
                return disposableEmpty;
            });
            this.start();
            return observer;
        };
        /**
         * Starts the test scheduler and uses the specified virtual time to dispose the subscription to the sequence obtained through the factory function.
         * Default virtual times are used for factory invocation and sequence subscription.
         * 
         * @param create Factory method to create an observable sequence.
         * @param disposed Virtual time at which to dispose the subscription.
         * @return Observer with timestamped recordings of notification messages that were received during the virtual time window when the subscription to the source sequence was active.
         */        
        TestScheduler.prototype.startWithDispose = function (create, disposed) {
            return this.startWithTiming(create, ReactiveTest.created, ReactiveTest.subscribed, disposed);
        };
        /**
         * Starts the test scheduler and uses default virtual times to invoke the factory function, to subscribe to the resulting sequence, and to dispose the subscription.
         * 
         * @param create Factory method to create an observable sequence.
         * @return Observer with timestamped recordings of notification messages that were received during the virtual time window when the subscription to the source sequence was active.
         */        
        TestScheduler.prototype.startWithCreate = function (create) {
            return this.startWithTiming(create, ReactiveTest.created, ReactiveTest.subscribed, ReactiveTest.disposed);
        };
        /**
         * Creates a hot observable using the specified timestamped notification messages either as an array or arguments.
         * 
         * @param messages Notifications to surface through the created sequence at their specified absolute virtual times.
         * @return Hot observable sequence that can be used to assert the timing of subscriptions and notifications.
         */        
        TestScheduler.prototype.createHotObservable = function () {
            var messages = argsOrArray(arguments, 0);
            return new HotObservable(this, messages);
        };
        /**
         * Creates a cold observable using the specified timestamped notification messages either as an array or arguments.
         * 
         * @param messages Notifications to surface through the created sequence at their specified virtual time offsets from the sequence subscription time.
         * @return Cold observable sequence that can be used to assert the timing of subscriptions and notifications.
         */        
        TestScheduler.prototype.createColdObservable = function () {
            var messages = argsOrArray(arguments, 0);
            return new ColdObservable(this, messages);
        };
        /**
         * Creates an observer that records received notification messages and timestamps those.
         * 
         * @return Observer that can be used to assert the timing of received notifications.
         */
        TestScheduler.prototype.createObserver = function () {
            return new MockObserver(this);
        };

        return TestScheduler;
    })(VirtualTimeScheduler);

    return Rx;
}));
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./rx":15}],18:[function(require,module,exports){
(function (global){
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.txt in the project root for license information.

;(function (factory) {
    var objectTypes = {
        'boolean': false,
        'function': true,
        'object': true,
        'number': false,
        'string': false,
        'undefined': false
    };

    var root = (objectTypes[typeof window] && window) || this,
        freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports,
        freeModule = objectTypes[typeof module] && module && !module.nodeType && module,
        moduleExports = freeModule && freeModule.exports === freeExports && freeExports,
        freeGlobal = objectTypes[typeof global] && global;
    
    if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
        root = freeGlobal;
    }

    // Because of build optimizers
    if (typeof define === 'function' && define.amd) {
        define(['rx', 'exports'], function (Rx, exports) {
            root.Rx = factory(root, exports, Rx);
            return root.Rx;
        });
    } else if (typeof module === 'object' && module && module.exports === freeExports) {
        module.exports = factory(root, module.exports, require('./rx'));
    } else {
        root.Rx = factory(root, {}, root.Rx);
    }
}.call(this, function (root, exp, Rx, undefined) {
    
    // Refernces
    var Observable = Rx.Observable,
        observableProto = Observable.prototype,
        AnonymousObservable = Rx.AnonymousObservable,
        observableDefer = Observable.defer,
        observableEmpty = Observable.empty,
        observableNever = Observable.never,
        observableThrow = Observable.throwException,
        observableFromArray = Observable.fromArray,
        timeoutScheduler = Rx.Scheduler.timeout,
        SingleAssignmentDisposable = Rx.SingleAssignmentDisposable,
        SerialDisposable = Rx.SerialDisposable,
        CompositeDisposable = Rx.CompositeDisposable,
        RefCountDisposable = Rx.RefCountDisposable,
        Subject = Rx.Subject,
        addRef = Rx.internals.addRef,
        normalizeTime = Rx.Scheduler.normalize;

    function observableTimerDate(dueTime, scheduler) {
        return new AnonymousObservable(function (observer) {
            return scheduler.scheduleWithAbsolute(dueTime, function () {
                observer.onNext(0);
                observer.onCompleted();
            });
        });
    }

    function observableTimerDateAndPeriod(dueTime, period, scheduler) {
        var p = normalizeTime(period);
        return new AnonymousObservable(function (observer) {
            var count = 0, d = dueTime;
            return scheduler.scheduleRecursiveWithAbsolute(d, function (self) {
                var now;
                if (p > 0) {
                    now = scheduler.now();
                    d = d + p;
                    if (d <= now) {
                        d = now + p;
                    }
                }
                observer.onNext(count++);
                self(d);
            });
        });
    }

    function observableTimerTimeSpan(dueTime, scheduler) {
        var d = normalizeTime(dueTime);
        return new AnonymousObservable(function (observer) {
            return scheduler.scheduleWithRelative(d, function () {
                observer.onNext(0);
                observer.onCompleted();
            });
        });
    }

    function observableTimerTimeSpanAndPeriod(dueTime, period, scheduler) {
        if (dueTime === period) {
            return new AnonymousObservable(function (observer) {
                return scheduler.schedulePeriodicWithState(0, period, function (count) {
                    observer.onNext(count);
                    return count + 1;
                });
            });
        }
        return observableDefer(function () {
            return observableTimerDateAndPeriod(scheduler.now() + dueTime, period, scheduler);
        });
    }

    /**
     *  Returns an observable sequence that produces a value after each period.
     *  
     * @example
     *  1 - res = Rx.Observable.interval(1000);
     *  2 - res = Rx.Observable.interval(1000, Rx.Scheduler.timeout);
     *      
     * @param {Number} period Period for producing the values in the resulting sequence (specified as an integer denoting milliseconds).
     * @param {Scheduler} [scheduler] Scheduler to run the timer on. If not specified, Rx.Scheduler.timeout is used.
     * @returns {Observable} An observable sequence that produces a value after each period.
     */
    var observableinterval = Observable.interval = function (period, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        return observableTimerTimeSpanAndPeriod(period, period, scheduler);
    };

    /**
     *  Returns an observable sequence that produces a value after dueTime has elapsed and then after each period.
     *  
     * @example
     *  1 - res = Rx.Observable.timer(new Date());
     *  2 - res = Rx.Observable.timer(new Date(), 1000);
     *  3 - res = Rx.Observable.timer(new Date(), Rx.Scheduler.timeout);
     *  4 - res = Rx.Observable.timer(new Date(), 1000, Rx.Scheduler.timeout);
     *  
     *  5 - res = Rx.Observable.timer(5000);
     *  6 - res = Rx.Observable.timer(5000, 1000);
     *  7 - res = Rx.Observable.timer(5000, Rx.Scheduler.timeout);
     *  8 - res = Rx.Observable.timer(5000, 1000, Rx.Scheduler.timeout);
     *  
     * @param {Number} dueTime Absolute (specified as a Date object) or relative time (specified as an integer denoting milliseconds) at which to produce the first value.
     * @param {Mixed} [periodOrScheduler]  Period to produce subsequent values (specified as an integer denoting milliseconds), or the scheduler to run the timer on. If not specified, the resulting timer is not recurring.
     * @param {Scheduler} [scheduler]  Scheduler to run the timer on. If not specified, the timeout scheduler is used.
     * @returns {Observable} An observable sequence that produces a value after due time has elapsed and then each period.
     */
    var observableTimer = Observable.timer = function (dueTime, periodOrScheduler, scheduler) {
        var period;
        scheduler || (scheduler = timeoutScheduler);
        if (periodOrScheduler !== undefined && typeof periodOrScheduler === 'number') {
            period = periodOrScheduler;
        } else if (periodOrScheduler !== undefined && typeof periodOrScheduler === 'object') {
            scheduler = periodOrScheduler;
        }
        if (dueTime instanceof Date && period === undefined) {
            return observableTimerDate(dueTime.getTime(), scheduler);
        }
        if (dueTime instanceof Date && period !== undefined) {
            period = periodOrScheduler;
            return observableTimerDateAndPeriod(dueTime.getTime(), period, scheduler);
        }
        if (period === undefined) {
            return observableTimerTimeSpan(dueTime, scheduler);
        }
        return observableTimerTimeSpanAndPeriod(dueTime, period, scheduler);
    };

    function observableDelayTimeSpan(dueTime, scheduler) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var active = false,
                cancelable = new SerialDisposable(),
                exception = null,
                q = [],
                running = false,
                subscription;
            subscription = source.materialize().timestamp(scheduler).subscribe(function (notification) {
                var d, shouldRun;
                if (notification.value.kind === 'E') {
                    q = [];
                    q.push(notification);
                    exception = notification.value.exception;
                    shouldRun = !running;
                } else {
                    q.push({ value: notification.value, timestamp: notification.timestamp + dueTime });
                    shouldRun = !active;
                    active = true;
                }
                if (shouldRun) {
                    if (exception !== null) {
                        observer.onError(exception);
                    } else {
                        d = new SingleAssignmentDisposable();
                        cancelable.setDisposable(d);
                        d.setDisposable(scheduler.scheduleRecursiveWithRelative(dueTime, function (self) {
                            var e, recurseDueTime, result, shouldRecurse;
                            if (exception !== null) {
                                return;
                            }
                            running = true;
                            do {
                                result = null;
                                if (q.length > 0 && q[0].timestamp - scheduler.now() <= 0) {
                                    result = q.shift().value;
                                }
                                if (result !== null) {
                                    result.accept(observer);
                                }
                            } while (result !== null);
                            shouldRecurse = false;
                            recurseDueTime = 0;
                            if (q.length > 0) {
                                shouldRecurse = true;
                                recurseDueTime = Math.max(0, q[0].timestamp - scheduler.now());
                            } else {
                                active = false;
                            }
                            e = exception;
                            running = false;
                            if (e !== null) {
                                observer.onError(e);
                            } else if (shouldRecurse) {
                                self(recurseDueTime);
                            }
                        }));
                    }
                }
            });
            return new CompositeDisposable(subscription, cancelable);
        });
    }

    function observableDelayDate(dueTime, scheduler) {
        var self = this;
        return observableDefer(function () {
            var timeSpan = dueTime - scheduler.now();
            return observableDelayTimeSpan.call(self, timeSpan, scheduler);
        });
    }

    /**
     *  Time shifts the observable sequence by dueTime. The relative time intervals between the values are preserved.
     *  
     * @example
     *  1 - res = Rx.Observable.delay(new Date());
     *  2 - res = Rx.Observable.delay(new Date(), Rx.Scheduler.timeout);
     *  
     *  3 - res = Rx.Observable.delay(5000);
     *  4 - res = Rx.Observable.delay(5000, 1000, Rx.Scheduler.timeout);
     * @memberOf Observable#
     * @param {Number} dueTime Absolute (specified as a Date object) or relative time (specified as an integer denoting milliseconds) by which to shift the observable sequence.
     * @param {Scheduler} [scheduler] Scheduler to run the delay timers on. If not specified, the timeout scheduler is used.
     * @returns {Observable} Time-shifted sequence.
     */
    observableProto.delay = function (dueTime, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        return dueTime instanceof Date ?
            observableDelayDate.call(this, dueTime.getTime(), scheduler) :
            observableDelayTimeSpan.call(this, dueTime, scheduler);
    };

    /**
     *  Ignores values from an observable sequence which are followed by another value before dueTime.
     *  
     * @example
     *  1 - res = source.throttle(5000); // 5 seconds
     *  2 - res = source.throttle(5000, scheduler);        
     * 
     * @param {Number} dueTime Duration of the throttle period for each value (specified as an integer denoting milliseconds).
     * @param {Scheduler} [scheduler]  Scheduler to run the throttle timers on. If not specified, the timeout scheduler is used.
     * @returns {Observable} The throttled sequence.
     */
    observableProto.throttle = function (dueTime, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        var source = this;
        return this.throttleWithSelector(function () { return observableTimer(dueTime, scheduler); })
    };

    /**
     *  Projects each element of an observable sequence into zero or more windows which are produced based on timing information.
     *  
     * @example
     *  1 - res = xs.windowWithTime(1000, scheduler); // non-overlapping segments of 1 second
     *  2 - res = xs.windowWithTime(1000, 500 , scheduler); // segments of 1 second with time shift 0.5 seconds
     *      
     * @param {Number} timeSpan Length of each window (specified as an integer denoting milliseconds).
     * @param {Mixed} [timeShiftOrScheduler]  Interval between creation of consecutive windows (specified as an integer denoting milliseconds), or an optional scheduler parameter. If not specified, the time shift corresponds to the timeSpan parameter, resulting in non-overlapping adjacent windows.
     * @param {Scheduler} [scheduler]  Scheduler to run windowing timers on. If not specified, the timeout scheduler is used.
     * @returns {Observable} An observable sequence of windows.
     */
    observableProto.windowWithTime = function (timeSpan, timeShiftOrScheduler, scheduler) {
        var source = this, timeShift;
        if (timeShiftOrScheduler === undefined) {
            timeShift = timeSpan;
        }
        if (scheduler === undefined) {
            scheduler = timeoutScheduler;
        }
        if (typeof timeShiftOrScheduler === 'number') {
            timeShift = timeShiftOrScheduler;
        } else if (typeof timeShiftOrScheduler === 'object') {
            timeShift = timeSpan;
            scheduler = timeShiftOrScheduler;
        }
        return new AnonymousObservable(function (observer) {
            var groupDisposable,
                nextShift = timeShift,
                nextSpan = timeSpan,
                q = [],
                refCountDisposable,
                timerD = new SerialDisposable(),
                totalTime = 0;
                groupDisposable = new CompositeDisposable(timerD),
                refCountDisposable = new RefCountDisposable(groupDisposable);

             function createTimer () {
                var m = new SingleAssignmentDisposable(),
                    isSpan = false,
                    isShift = false;
                timerD.setDisposable(m);
                if (nextSpan === nextShift) {
                    isSpan = true;
                    isShift = true;
                } else if (nextSpan < nextShift) {
                    isSpan = true;
                } else {
                    isShift = true;
                }
                var newTotalTime = isSpan ? nextSpan : nextShift,
                    ts = newTotalTime - totalTime;
                totalTime = newTotalTime;
                if (isSpan) {
                    nextSpan += timeShift;
                }
                if (isShift) {
                    nextShift += timeShift;
                }
                m.setDisposable(scheduler.scheduleWithRelative(ts, function () {
                    var s;
                    if (isShift) {
                        s = new Subject();
                        q.push(s);
                        observer.onNext(addRef(s, refCountDisposable));
                    }
                    if (isSpan) {
                        s = q.shift();
                        s.onCompleted();
                    }
                    createTimer();
                }));
            };
            q.push(new Subject());
            observer.onNext(addRef(q[0], refCountDisposable));
            createTimer();
            groupDisposable.add(source.subscribe(function (x) {
                var i, s;
                for (i = 0; i < q.length; i++) {
                    s = q[i];
                    s.onNext(x);
                }
            }, function (e) {
                var i, s;
                for (i = 0; i < q.length; i++) {
                    s = q[i];
                    s.onError(e);
                }
                observer.onError(e);
            }, function () {
                var i, s;
                for (i = 0; i < q.length; i++) {
                    s = q[i];
                    s.onCompleted();
                }
                observer.onCompleted();
            }));
            return refCountDisposable;
        });
    };

    /**
     *  Projects each element of an observable sequence into a window that is completed when either it's full or a given amount of time has elapsed.
     *  @example
     *  1 - res = source.windowWithTimeOrCount(5000, 50); // 5s or 50 items
     *  2 - res = source.windowWithTimeOrCount(5000, 50, scheduler); //5s or 50 items
     *      
     * @memberOf Observable#
     * @param {Number} timeSpan Maximum time length of a window.
     * @param {Number} count Maximum element count of a window.
     * @param {Scheduler} [scheduler]  Scheduler to run windowing timers on. If not specified, the timeout scheduler is used.
     * @returns {Observable} An observable sequence of windows.
     */
    observableProto.windowWithTimeOrCount = function (timeSpan, count, scheduler) {
        var source = this;
        scheduler || (scheduler = timeoutScheduler);
        return new AnonymousObservable(function (observer) {
            var createTimer,
                groupDisposable,
                n = 0,
                refCountDisposable,
                s,
                timerD = new SerialDisposable(),
                windowId = 0;
            groupDisposable = new CompositeDisposable(timerD);
            refCountDisposable = new RefCountDisposable(groupDisposable);
            createTimer = function (id) {
                var m = new SingleAssignmentDisposable();
                timerD.setDisposable(m);
                m.setDisposable(scheduler.scheduleWithRelative(timeSpan, function () {
                    var newId;
                    if (id !== windowId) {
                        return;
                    }
                    n = 0;
                    newId = ++windowId;
                    s.onCompleted();
                    s = new Subject();
                    observer.onNext(addRef(s, refCountDisposable));
                    createTimer(newId);
                }));
            };
            s = new Subject();
            observer.onNext(addRef(s, refCountDisposable));
            createTimer(0);
            groupDisposable.add(source.subscribe(function (x) {
                var newId = 0, newWindow = false;
                s.onNext(x);
                n++;
                if (n === count) {
                    newWindow = true;
                    n = 0;
                    newId = ++windowId;
                    s.onCompleted();
                    s = new Subject();
                    observer.onNext(addRef(s, refCountDisposable));
                }
                if (newWindow) {
                    createTimer(newId);
                }
            }, function (e) {
                s.onError(e);
                observer.onError(e);
            }, function () {
                s.onCompleted();
                observer.onCompleted();
            }));
            return refCountDisposable;
        });
    };

    /**
     *  Projects each element of an observable sequence into zero or more buffers which are produced based on timing information.
     *  
     * @example
     *  1 - res = xs.bufferWithTime(1000, scheduler); // non-overlapping segments of 1 second
     *  2 - res = xs.bufferWithTime(1000, 500, scheduler; // segments of 1 second with time shift 0.5 seconds
     *      
     * @param {Number} timeSpan Length of each buffer (specified as an integer denoting milliseconds).
     * @param {Mixed} [timeShiftOrScheduler]  Interval between creation of consecutive buffers (specified as an integer denoting milliseconds), or an optional scheduler parameter. If not specified, the time shift corresponds to the timeSpan parameter, resulting in non-overlapping adjacent buffers.
     * @param {Scheduler} [scheduler]  Scheduler to run buffer timers on. If not specified, the timeout scheduler is used.
     * @returns {Observable} An observable sequence of buffers.
     */
    observableProto.bufferWithTime = function (timeSpan, timeShiftOrScheduler, scheduler) {
        return this.windowWithTime.apply(this, arguments).selectMany(function (x) { return x.toArray(); });
    };

    /**
     *  Projects each element of an observable sequence into a buffer that is completed when either it's full or a given amount of time has elapsed.
     *  
     * @example
     *  1 - res = source.bufferWithTimeOrCount(5000, 50); // 5s or 50 items in an array 
     *  2 - res = source.bufferWithTimeOrCount(5000, 50, scheduler); // 5s or 50 items in an array
     *      
     * @param {Number} timeSpan Maximum time length of a buffer.
     * @param {Number} count Maximum element count of a buffer.
     * @param {Scheduler} [scheduler]  Scheduler to run bufferin timers on. If not specified, the timeout scheduler is used.
     * @returns {Observable} An observable sequence of buffers.
     */
    observableProto.bufferWithTimeOrCount = function (timeSpan, count, scheduler) {
        return this.windowWithTimeOrCount(timeSpan, count, scheduler).selectMany(function (x) {
            return x.toArray();
        });
    };

    /**
     *  Records the time interval between consecutive values in an observable sequence.
     *  
     * @example
     *  1 - res = source.timeInterval();
     *  2 - res = source.timeInterval(Rx.Scheduler.timeout);
     *      
     * @param [scheduler]  Scheduler used to compute time intervals. If not specified, the timeout scheduler is used.
     * @returns {Observable} An observable sequence with time interval information on values.
     */
    observableProto.timeInterval = function (scheduler) {
        var source = this;
        scheduler || (scheduler = timeoutScheduler);
        return observableDefer(function () {
            var last = scheduler.now();
            return source.select(function (x) {
                var now = scheduler.now(), span = now - last;
                last = now;
                return {
                    value: x,
                    interval: span
                };
            });
        });
    };

    /**
     *  Records the timestamp for each value in an observable sequence.
     *  
     * @example
     *  1 - res = source.timestamp(); // produces { value: x, timestamp: ts }
     *  2 - res = source.timestamp(Rx.Scheduler.timeout);
     *      
     * @param {Scheduler} [scheduler]  Scheduler used to compute timestamps. If not specified, the timeout scheduler is used.
     * @returns {Observable} An observable sequence with timestamp information on values.
     */
    observableProto.timestamp = function (scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        return this.select(function (x) {
            return {
                value: x,
                timestamp: scheduler.now()
            };
        });
    };

    function sampleObservable(source, sampler) {
        
        return new AnonymousObservable(function (observer) {
            var atEnd, value, hasValue;

            function sampleSubscribe() {
                if (hasValue) {
                    hasValue = false;
                    observer.onNext(value);
                }
                if (atEnd) {
                    observer.onCompleted();
                }
            }

            return new CompositeDisposable(
                source.subscribe(function (newValue) {
                    hasValue = true;
                    value = newValue;
                }, observer.onError.bind(observer), function () {
                    atEnd = true;
                }),
                sampler.subscribe(sampleSubscribe, observer.onError.bind(observer), sampleSubscribe)
            );
        });
    }

    /**
     *  Samples the observable sequence at each interval.
     *  
     * @example
     *  1 - res = source.sample(sampleObservable); // Sampler tick sequence
     *  2 - res = source.sample(5000); // 5 seconds
     *  2 - res = source.sample(5000, Rx.Scheduler.timeout); // 5 seconds
     *      
     * @param {Mixed} intervalOrSampler Interval at which to sample (specified as an integer denoting milliseconds) or Sampler Observable.
     * @param {Scheduler} [scheduler]  Scheduler to run the sampling timer on. If not specified, the timeout scheduler is used.
     * @returns {Observable} Sampled observable sequence.
     */
    observableProto.sample = function (intervalOrSampler, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        if (typeof intervalOrSampler === 'number') {
            return sampleObservable(this, observableinterval(intervalOrSampler, scheduler));
        }
        return sampleObservable(this, intervalOrSampler);
    };

    /**
     *  Returns the source observable sequence or the other observable sequence if dueTime elapses.
     *  
     * @example
     *  1 - res = source.timeout(new Date()); // As a date
     *  2 - res = source.timeout(5000); // 5 seconds
     *  3 - res = source.timeout(new Date(), Rx.Observable.returnValue(42)); // As a date and timeout observable
     *  4 - res = source.timeout(5000, Rx.Observable.returnValue(42)); // 5 seconds and timeout observable
     *  5 - res = source.timeout(new Date(), Rx.Observable.returnValue(42), Rx.Scheduler.timeout); // As a date and timeout observable
     *  6 - res = source.timeout(5000, Rx.Observable.returnValue(42), Rx.Scheduler.timeout); // 5 seconds and timeout observable
     *      
     * @param {Number} dueTime Absolute (specified as a Date object) or relative time (specified as an integer denoting milliseconds) when a timeout occurs.
     * @param {Observable} [other]  Sequence to return in case of a timeout. If not specified, a timeout error throwing sequence will be used.
     * @param {Scheduler} [scheduler]  Scheduler to run the timeout timers on. If not specified, the timeout scheduler is used.
     * @returns {Observable} The source sequence switching to the other sequence in case of a timeout.
     */
    observableProto.timeout = function (dueTime, other, scheduler) {
        var schedulerMethod, source = this;
        other || (other = observableThrow(new Error('Timeout')));
        scheduler || (scheduler = timeoutScheduler);
        if (dueTime instanceof Date) {
            schedulerMethod = function (dt, action) {
                scheduler.scheduleWithAbsolute(dt, action);
            };
        } else {
            schedulerMethod = function (dt, action) {
                scheduler.scheduleWithRelative(dt, action);
            };
        }
        return new AnonymousObservable(function (observer) {
            var createTimer,
                id = 0,
                original = new SingleAssignmentDisposable(),
                subscription = new SerialDisposable(),
                switched = false,
                timer = new SerialDisposable();
            subscription.setDisposable(original);
            createTimer = function () {
                var myId = id;
                timer.setDisposable(schedulerMethod(dueTime, function () {
                    switched = id === myId;
                    var timerWins = switched;
                    if (timerWins) {
                        subscription.setDisposable(other.subscribe(observer));
                    }
                }));
            };
            createTimer();
            original.setDisposable(source.subscribe(function (x) {
                var onNextWins = !switched;
                if (onNextWins) {
                    id++;
                    observer.onNext(x);
                    createTimer();
                }
            }, function (e) {
                var onErrorWins = !switched;
                if (onErrorWins) {
                    id++;
                    observer.onError(e);
                }
            }, function () {
                var onCompletedWins = !switched;
                if (onCompletedWins) {
                    id++;
                    observer.onCompleted();
                }
            }));
            return new CompositeDisposable(subscription, timer);
        });
    };

    /**
     *  Generates an observable sequence by iterating a state from an initial state until the condition fails.
     *  
     * @example
     *  res = source.generateWithAbsoluteTime(0, 
     *      function (x) { return return true; }, 
     *      function (x) { return x + 1; }, 
     *      function (x) { return x; }, 
     *      function (x) { return new Date(); }
     *  });
     *      
     * @param {Mixed} initialState Initial state.
     * @param {Function} condition Condition to terminate generation (upon returning false).
     * @param {Function} iterate Iteration step function.
     * @param {Function} resultSelector Selector function for results produced in the sequence.
     * @param {Function} timeSelector Time selector function to control the speed of values being produced each iteration, returning Date values.
     * @param {Scheduler} [scheduler]  Scheduler on which to run the generator loop. If not specified, the timeout scheduler is used.
     * @returns {Observable} The generated sequence.
     */
    Observable.generateWithAbsoluteTime = function (initialState, condition, iterate, resultSelector, timeSelector, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        return new AnonymousObservable(function (observer) {
            var first = true,
                hasResult = false,
                result,
                state = initialState,
                time;
            return scheduler.scheduleRecursiveWithAbsolute(scheduler.now(), function (self) {
                if (hasResult) {
                    observer.onNext(result);
                }
                try {
                    if (first) {
                        first = false;
                    } else {
                        state = iterate(state);
                    }
                    hasResult = condition(state);
                    if (hasResult) {
                        result = resultSelector(state);
                        time = timeSelector(state);
                    }
                } catch (e) {
                    observer.onError(e);
                    return;
                }
                if (hasResult) {
                    self(time);
                } else {
                    observer.onCompleted();
                }
            });
        });
    };

    /**
     *  Generates an observable sequence by iterating a state from an initial state until the condition fails.
     * 
     * @example 
     *  res = source.generateWithRelativeTime(0, 
     *      function (x) { return return true; }, 
     *      function (x) { return x + 1; }, 
     *      function (x) { return x; }, 
     *      function (x) { return 500; }
     *  );
     *      
     * @param {Mixed} initialState Initial state.
     * @param {Function} condition Condition to terminate generation (upon returning false).
     * @param {Function} iterate Iteration step function.
     * @param {Function} resultSelector Selector function for results produced in the sequence.
     * @param {Function} timeSelector Time selector function to control the speed of values being produced each iteration, returning integer values denoting milliseconds.
     * @param {Scheduler} [scheduler]  Scheduler on which to run the generator loop. If not specified, the timeout scheduler is used.
     * @returns {Observable} The generated sequence.
     */
    Observable.generateWithRelativeTime = function (initialState, condition, iterate, resultSelector, timeSelector, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        return new AnonymousObservable(function (observer) {
            var first = true,
                hasResult = false,
                result,
                state = initialState,
                time;
            return scheduler.scheduleRecursiveWithRelative(0, function (self) {
                if (hasResult) {
                    observer.onNext(result);
                }
                try {
                    if (first) {
                        first = false;
                    } else {
                        state = iterate(state);
                    }
                    hasResult = condition(state);
                    if (hasResult) {
                        result = resultSelector(state);
                        time = timeSelector(state);
                    }
                } catch (e) {
                    observer.onError(e);
                    return;
                }
                if (hasResult) {
                    self(time);
                } else {
                    observer.onCompleted();
                }
            });
        });
    };

    /**
     *  Time shifts the observable sequence by delaying the subscription.
     *  
     * @example
     *  1 - res = source.delaySubscription(5000); // 5s
     *  2 - res = source.delaySubscription(5000, Rx.Scheduler.timeout); // 5 seconds
     *      
     * @param {Number} dueTime Absolute or relative time to perform the subscription at.
     * @param {Scheduler} [scheduler]  Scheduler to run the subscription delay timer on. If not specified, the timeout scheduler is used.
     * @returns {Observable} Time-shifted sequence.
     */
    observableProto.delaySubscription = function (dueTime, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        return this.delayWithSelector(observableTimer(dueTime, scheduler), function () { return observableEmpty(); });
    };

    /**
     *  Time shifts the observable sequence based on a subscription delay and a delay selector function for each element.
     *  
     * @example
     *  1 - res = source.delayWithSelector(function (x) { return Rx.Scheduler.timer(5000); }); // with selector only
     *  1 - res = source.delayWithSelector(Rx.Observable.timer(2000), function (x) { return Rx.Observable.timer(x); }); // with delay and selector
     *
     * @param {Observable} [subscriptionDelay]  Sequence indicating the delay for the subscription to the source. 
     * @param {Function} delayDurationSelector Selector function to retrieve a sequence indicating the delay for each given element.
     * @returns {Observable} Time-shifted sequence.
     */
    observableProto.delayWithSelector = function (subscriptionDelay, delayDurationSelector) {
        var source = this, subDelay, selector;
        if (typeof subscriptionDelay === 'function') {
            selector = subscriptionDelay;
        } else {
            subDelay = subscriptionDelay;
            selector = delayDurationSelector;
        }
        return new AnonymousObservable(function (observer) {
            var delays = new CompositeDisposable(), atEnd = false, done = function () {
                if (atEnd && delays.length === 0) {
                    observer.onCompleted();
                }
            }, subscription = new SerialDisposable(), start = function () {
                subscription.setDisposable(source.subscribe(function (x) {
                    var delay;
                    try {
                        delay = selector(x);
                    } catch (error) {
                        observer.onError(error);
                        return;
                    }
                    var d = new SingleAssignmentDisposable();
                    delays.add(d);
                    d.setDisposable(delay.subscribe(function () {
                        observer.onNext(x);
                        delays.remove(d);
                        done();
                    }, observer.onError.bind(observer), function () {
                        observer.onNext(x);
                        delays.remove(d);
                        done();
                    }));
                }, observer.onError.bind(observer), function () {
                    atEnd = true;
                    subscription.dispose();
                    done();
                }));
            };

            if (!subDelay) {
                start();
            } else {
                subscription.setDisposable(subDelay.subscribe(function () {
                    start();
                }, observer.onError.bind(observer), function () { start(); }));
            }

            return new CompositeDisposable(subscription, delays);
        });
    };

    /**
     *  Returns the source observable sequence, switching to the other observable sequence if a timeout is signaled.
     *  
     * @example
     *  1 - res = source.timeoutWithSelector(Rx.Observable.timer(500)); 
     *  2 - res = source.timeoutWithSelector(Rx.Observable.timer(500), function (x) { return Rx.Observable.timer(200); });
     *  3 - res = source.timeoutWithSelector(Rx.Observable.timer(500), function (x) { return Rx.Observable.timer(200); }, Rx.Observable.returnValue(42));
     *      
     * @param {Observable} [firstTimeout]  Observable sequence that represents the timeout for the first element. If not provided, this defaults to Observable.never().
     * @param {Function} [timeoutDurationSelector] Selector to retrieve an observable sequence that represents the timeout between the current element and the next element.
     * @param {Observable} [other]  Sequence to return in case of a timeout. If not provided, this is set to Observable.throwException(). 
     * @returns {Observable} The source sequence switching to the other sequence in case of a timeout.
     */
    observableProto.timeoutWithSelector = function (firstTimeout, timeoutdurationSelector, other) {
        if (arguments.length === 1) {
            timeoutdurationSelector = firstTimeout;
            var firstTimeout = observableNever();
        }
        other || (other = observableThrow(new Error('Timeout')));
        var source = this;
        return new AnonymousObservable(function (observer) {
            var subscription = new SerialDisposable(), timer = new SerialDisposable(), original = new SingleAssignmentDisposable();

            subscription.setDisposable(original);

            var id = 0, switched = false, setTimer = function (timeout) {
                var myId = id, timerWins = function () {
                    return id === myId;
                };
                var d = new SingleAssignmentDisposable();
                timer.setDisposable(d);
                d.setDisposable(timeout.subscribe(function () {
                    if (timerWins()) {
                        subscription.setDisposable(other.subscribe(observer));
                    }
                    d.dispose();
                }, function (e) {
                    if (timerWins()) {
                        observer.onError(e);
                    }
                }, function () {
                    if (timerWins()) {
                        subscription.setDisposable(other.subscribe(observer));
                    }
                }));
            };

            setTimer(firstTimeout);
            var observerWins = function () {
                var res = !switched;
                if (res) {
                    id++;
                }
                return res;
            };

            original.setDisposable(source.subscribe(function (x) {
                if (observerWins()) {
                    observer.onNext(x);
                    var timeout;
                    try {
                        timeout = timeoutdurationSelector(x);
                    } catch (e) {
                        observer.onError(e);
                        return;
                    }
                    setTimer(timeout);
                }
            }, function (e) {
                if (observerWins()) {
                    observer.onError(e);
                }
            }, function () {
                if (observerWins()) {
                    observer.onCompleted();
                }
            }));
            return new CompositeDisposable(subscription, timer);
        });
    };

    /**
     *  Ignores values from an observable sequence which are followed by another value within a computed throttle duration.
     *  
     * @example
     *  1 - res = source.delayWithSelector(function (x) { return Rx.Scheduler.timer(x + x); }); 
     * 
     * @param {Function} throttleDurationSelector Selector function to retrieve a sequence indicating the throttle duration for each given element.
     * @returns {Observable} The throttled sequence.
     */
    observableProto.throttleWithSelector = function (throttleDurationSelector) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var value, hasValue = false, cancelable = new SerialDisposable(), id = 0, subscription = source.subscribe(function (x) {
                var throttle;
                try {
                    throttle = throttleDurationSelector(x);
                } catch (e) {
                    observer.onError(e);
                    return;
                }
                hasValue = true;
                value = x;
                id++;
                var currentid = id, d = new SingleAssignmentDisposable();
                cancelable.setDisposable(d);
                d.setDisposable(throttle.subscribe(function () {
                    if (hasValue && id === currentid) {
                        observer.onNext(value);
                    }
                    hasValue = false;
                    d.dispose();
                }, observer.onError.bind(observer), function () {
                    if (hasValue && id === currentid) {
                        observer.onNext(value);
                    }
                    hasValue = false;
                    d.dispose();
                }));
            }, function (e) {
                cancelable.dispose();
                observer.onError(e);
                hasValue = false;
                id++;
            }, function () {
                cancelable.dispose();
                if (hasValue) {
                    observer.onNext(value);
                }
                observer.onCompleted();
                hasValue = false;
                id++;
            });
            return new CompositeDisposable(subscription, cancelable);
        });
    };

    /**
     *  Skips elements for the specified duration from the end of the observable source sequence, using the specified scheduler to run timers.
     *  
     *  1 - res = source.skipLastWithTime(5000);     
     *  2 - res = source.skipLastWithTime(5000, scheduler); 
     *      
     * @description
     *  This operator accumulates a queue with a length enough to store elements received during the initial duration window.
     *  As more elements are received, elements older than the specified duration are taken from the queue and produced on the
     *  result sequence. This causes elements to be delayed with duration.          
     * @param {Number} duration Duration for skipping elements from the end of the sequence.
     * @param {Scheduler} [scheduler]  Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout
     * @returns {Observable} An observable sequence with the elements skipped during the specified duration from the end of the source sequence.
     */
    observableProto.skipLastWithTime = function (duration, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        var source = this;
        return new AnonymousObservable(function (observer) {
            var q = [];
            return source.subscribe(function (x) {
                var now = scheduler.now();
                q.push({ interval: now, value: x });
                while (q.length > 0 && now - q[0].interval >= duration) {
                    observer.onNext(q.shift().value);
                }
            }, observer.onError.bind(observer), function () {
                var now = scheduler.now();
                while (q.length > 0 && now - q[0].interval >= duration) {
                    observer.onNext(q.shift().value);
                }
                observer.onCompleted();
            });
        });
    };

    /**
     *  Returns elements within the specified duration from the end of the observable source sequence, using the specified schedulers to run timers and to drain the collected elements.
     *  
     * @example
     *  1 - res = source.takeLastWithTime(5000, [optional timer scheduler], [optional loop scheduler]); 
     * @description
     *  This operator accumulates a queue with a length enough to store elements received during the initial duration window.
     *  As more elements are received, elements older than the specified duration are taken from the queue and produced on the
     *  result sequence. This causes elements to be delayed with duration.    
     * @param {Number} duration Duration for taking elements from the end of the sequence.
     * @param {Scheduler} [timerScheduler]  Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
     * @param {Scheduler} [loopScheduler]  Scheduler to drain the collected elements. If not specified, defaults to Rx.Scheduler.immediate.
     * @returns {Observable} An observable sequence with the elements taken during the specified duration from the end of the source sequence.
     */
    observableProto.takeLastWithTime = function (duration, timerScheduler, loopScheduler) {
        return this.takeLastBufferWithTime(duration, timerScheduler).selectMany(function (xs) { return observableFromArray(xs, loopScheduler); });
    };

    /**
     *  Returns an array with the elements within the specified duration from the end of the observable source sequence, using the specified scheduler to run timers.
     *  
     * @example
     *  1 - res = source.takeLastBufferWithTime(5000, [optional scheduler]); 
     * @description
     *  This operator accumulates a queue with a length enough to store elements received during the initial duration window.
     *  As more elements are received, elements older than the specified duration are taken from the queue and produced on the
     *  result sequence. This causes elements to be delayed with duration.   
     * @param {Number} duration Duration for taking elements from the end of the sequence.
     * @param {Scheduler} scheduler Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
     * @returns {Observable} An observable sequence containing a single array with the elements taken during the specified duration from the end of the source sequence.
     */
    observableProto.takeLastBufferWithTime = function (duration, scheduler) {
        var source = this;
        scheduler || (scheduler = timeoutScheduler);
        return new AnonymousObservable(function (observer) {
            var q = [];

            return source.subscribe(function (x) {
                var now = scheduler.now();
                q.push({ interval: now, value: x });
                while (q.length > 0 && now - q[0].interval >= duration) {
                    q.shift();
                }
            }, observer.onError.bind(observer), function () {
                var now = scheduler.now(), res = [];
                while (q.length > 0) {
                    var next = q.shift();
                    if (now - next.interval <= duration) {
                        res.push(next.value);
                    }
                }

                observer.onNext(res);
                observer.onCompleted();
            });
        });
    };

    /**
     *  Takes elements for the specified duration from the start of the observable source sequence, using the specified scheduler to run timers.
     *  
     * @example
     *  1 - res = source.takeWithTime(5000,  [optional scheduler]); 
     * @description
     *  This operator accumulates a queue with a length enough to store elements received during the initial duration window.
     *  As more elements are received, elements older than the specified duration are taken from the queue and produced on the
     *  result sequence. This causes elements to be delayed with duration.    
     * @param {Number} duration Duration for taking elements from the start of the sequence.
     * @param {Scheduler} scheduler Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
     * @returns {Observable} An observable sequence with the elements taken during the specified duration from the start of the source sequence.
     */
    observableProto.takeWithTime = function (duration, scheduler) {
        var source = this;
        scheduler || (scheduler = timeoutScheduler);
        return new AnonymousObservable(function (observer) {
            var t = scheduler.scheduleWithRelative(duration, function () {
                observer.onCompleted();
            });

            return new CompositeDisposable(t, source.subscribe(observer));
        });
    };

    /**
     *  Skips elements for the specified duration from the start of the observable source sequence, using the specified scheduler to run timers.
     *  
     * @example
     *  1 - res = source.skipWithTime(5000, [optional scheduler]); 
     *  
     * @description     
     *  Specifying a zero value for duration doesn't guarantee no elements will be dropped from the start of the source sequence.
     *  This is a side-effect of the asynchrony introduced by the scheduler, where the action that causes callbacks from the source sequence to be forwarded
     *  may not execute immediately, despite the zero due time.
     *  
     *  Errors produced by the source sequence are always forwarded to the result sequence, even if the error occurs before the duration.      
     * @param {Number} duration Duration for skipping elements from the start of the sequence.
     * @param {Scheduler} scheduler Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
     * @returns {Observable} An observable sequence with the elements skipped during the specified duration from the start of the source sequence.
     */
    observableProto.skipWithTime = function (duration, scheduler) {
        var source = this;
        scheduler || (scheduler = timeoutScheduler);
        return new AnonymousObservable(function (observer) {
            var open = false,
                t = scheduler.scheduleWithRelative(duration, function () { open = true; }),
                d = source.subscribe(function (x) {
                    if (open) {
                        observer.onNext(x);
                    }
                }, observer.onError.bind(observer), observer.onCompleted.bind(observer));

            return new CompositeDisposable(t, d);
        });
    };

    /**
     *  Skips elements from the observable source sequence until the specified start time, using the specified scheduler to run timers.
     *  Errors produced by the source sequence are always forwarded to the result sequence, even if the error occurs before the start time>.
     *  
     * @examples
     *  1 - res = source.skipUntilWithTime(new Date(), [optional scheduler]);         
     * @param startTime Time to start taking elements from the source sequence. If this value is less than or equal to Date(), no elements will be skipped.
     * @param scheduler Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
     * @returns {Observable} An observable sequence with the elements skipped until the specified start time. 
     */
    observableProto.skipUntilWithTime = function (startTime, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        var source = this;
        return new AnonymousObservable(function (observer) {
            var open = false,
                t = scheduler.scheduleWithAbsolute(startTime, function () { open = true; }),
                d = source.subscribe(function (x) {
                    if (open) {
                        observer.onNext(x);
                    }
                }, observer.onError.bind(observer), observer.onCompleted.bind(observer));

            return new CompositeDisposable(t, d);
        });
    };

    /**
     *  Takes elements for the specified duration until the specified end time, using the specified scheduler to run timers.
     *  
     * @example
     *  1 - res = source.takeUntilWithTime(new Date(), [optional scheduler]);   
     * @param {Number} endTime Time to stop taking elements from the source sequence. If this value is less than or equal to new Date(), the result stream will complete immediately.
     * @param {Scheduler} scheduler Scheduler to run the timer on.
     * @returns {Observable} An observable sequence with the elements taken until the specified end time.
     */
    observableProto.takeUntilWithTime = function (endTime, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        var source = this;
        return new AnonymousObservable(function (observer) {
            return new CompositeDisposable(scheduler.scheduleWithAbsolute(endTime, function () {
                observer.onCompleted();
            }),  source.subscribe(observer));
        });
    };

    return Rx;
}));
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./rx":15}],19:[function(require,module,exports){
(function (global){
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.txt in the project root for license information.

;(function (factory) {
    var objectTypes = {
        'boolean': false,
        'function': true,
        'object': true,
        'number': false,
        'string': false,
        'undefined': false
    };

    var root = (objectTypes[typeof window] && window) || this,
        freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports,
        freeModule = objectTypes[typeof module] && module && !module.nodeType && module,
        moduleExports = freeModule && freeModule.exports === freeExports && freeExports,
        freeGlobal = objectTypes[typeof global] && global;
    
    if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
        root = freeGlobal;
    }

    // Because of build optimizers
    if (typeof define === 'function' && define.amd) {
        define(['rx', 'exports'], function (Rx, exports) {
            root.Rx = factory(root, exports, Rx);
            return root.Rx;
        });
    } else if (typeof module === 'object' && module && module.exports === freeExports) {
        module.exports = factory(root, module.exports, require('./rx'));
    } else {
        root.Rx = factory(root, {}, root.Rx);
    }
}.call(this, function (root, exp, Rx, undefined) {
    
	// Aliases
	var Scheduler = Rx.Scheduler,
		PriorityQueue = Rx.internals.PriorityQueue,
		ScheduledItem = Rx.internals.ScheduledItem,
		SchedulePeriodicRecursive  = Rx.internals.SchedulePeriodicRecursive,
		disposableEmpty = Rx.Disposable.empty,
		inherits = Rx.internals.inherits,
    defaultSubComparer = Rx.helpers.defaultSubComparer;

    /** Provides a set of extension methods for virtual time scheduling. */
    Rx.VirtualTimeScheduler = (function (_super) {

        function notImplemented() {
            throw new Error('Not implemented');
        }

        function localNow() {
            return this.toDateTimeOffset(this.clock);
        }

        function scheduleNow(state, action) {
            return this.scheduleAbsoluteWithState(state, this.clock, action);
        }

        function scheduleRelative(state, dueTime, action) {
            return this.scheduleRelativeWithState(state, this.toRelative(dueTime), action);
        }

        function scheduleAbsolute(state, dueTime, action) {
            return this.scheduleRelativeWithState(state, this.toRelative(dueTime - this.now()), action);
        }

        function invokeAction(scheduler, action) {
            action();
            return disposableEmpty;
        }

        inherits(VirtualTimeScheduler, _super);

        /**
         * Creates a new virtual time scheduler with the specified initial clock value and absolute time comparer.
         *
         * @constructor
         * @param {Number} initialClock Initial value for the clock.
         * @param {Function} comparer Comparer to determine causality of events based on absolute time.
         */
        function VirtualTimeScheduler(initialClock, comparer) {
            this.clock = initialClock;
            this.comparer = comparer;
            this.isEnabled = false;
            this.queue = new PriorityQueue(1024);
            _super.call(this, localNow, scheduleNow, scheduleRelative, scheduleAbsolute);
        }

        var VirtualTimeSchedulerPrototype = VirtualTimeScheduler.prototype;

        /**
         * Adds a relative time value to an absolute time value.
         * @param {Number} absolute Absolute virtual time value.
         * @param {Number} relative Relative virtual time value to add.
         * @return {Number} Resulting absolute virtual time sum value.
         */
        VirtualTimeSchedulerPrototype.add = notImplemented;

        /**
         * Converts an absolute time to a number 
         * @param {Any} The absolute time.
         * @returns {Number} The absolute time in ms
         */
        VirtualTimeSchedulerPrototype.toDateTimeOffset = notImplemented;

        /**
         * Converts the TimeSpan value to a relative virtual time value.       
         * @param {Number} timeSpan TimeSpan value to convert.
         * @return {Number} Corresponding relative virtual time value.
         */
        VirtualTimeSchedulerPrototype.toRelative = notImplemented;

        /**
         * Schedules a periodic piece of work by dynamically discovering the scheduler's capabilities. The periodic task will be emulated using recursive scheduling.       
         * @param {Mixed} state Initial state passed to the action upon the first iteration.
         * @param {Number} period Period for running the work periodically.
         * @param {Function} action Action to be executed, potentially updating the state.
         * @returns {Disposable} The disposable object used to cancel the scheduled recurring action (best effort).
         */      
        VirtualTimeSchedulerPrototype.schedulePeriodicWithState = function (state, period, action) {
            var s = new SchedulePeriodicRecursive(this, state, period, action);
            return s.start();
        };

        /**
         * Schedules an action to be executed after dueTime.
         * @param {Mixed} state State passed to the action to be executed.
         * @param {Number} dueTime Relative time after which to execute the action.
         * @param {Function} action Action to be executed.
         * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
         */            
        VirtualTimeSchedulerPrototype.scheduleRelativeWithState = function (state, dueTime, action) {
            var runAt = this.add(this.clock, dueTime);
            return this.scheduleAbsoluteWithState(state, runAt, action);
        };

        /**
         * Schedules an action to be executed at dueTime.      
         * @param {Number} dueTime Relative time after which to execute the action.
         * @param {Function} action Action to be executed.
         * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
         */          
        VirtualTimeSchedulerPrototype.scheduleRelative = function (dueTime, action) {
            return this.scheduleRelativeWithState(action, dueTime, invokeAction);
        };    

        /** 
         * Starts the virtual time scheduler. 
         */
        VirtualTimeSchedulerPrototype.start = function () {
            var next;
            if (!this.isEnabled) {
                this.isEnabled = true;
                do {
                    next = this.getNext();
                    if (next !== null) {
                        if (this.comparer(next.dueTime, this.clock) > 0) {
                            this.clock = next.dueTime;
                        }
                        next.invoke();
                    } else {
                        this.isEnabled = false;
                    }
                } while (this.isEnabled);
            }
        };

        /** 
         * Stops the virtual time scheduler.  
         */
        VirtualTimeSchedulerPrototype.stop = function () {
            this.isEnabled = false;
        };

        /**
         * Advances the scheduler's clock to the specified time, running all work till that point.
         * @param {Number} time Absolute time to advance the scheduler's clock to.
         */
        VirtualTimeSchedulerPrototype.advanceTo = function (time) {
            var next;
            var dueToClock = this.comparer(this.clock, time);
            if (this.comparer(this.clock, time) > 0) {
                throw new Error(argumentOutOfRange);
            }
            if (dueToClock === 0) {
                return;
            }
            if (!this.isEnabled) {
                this.isEnabled = true;
                do {
                    next = this.getNext();
                    if (next !== null && this.comparer(next.dueTime, time) <= 0) {
                        if (this.comparer(next.dueTime, this.clock) > 0) {
                            this.clock = next.dueTime;
                        }
                        next.invoke();
                    } else {
                        this.isEnabled = false;
                    }
                } while (this.isEnabled);
                this.clock = time;
            }
        };

        /**
         * Advances the scheduler's clock by the specified relative time, running all work scheduled for that timespan.
         * @param {Number} time Relative time to advance the scheduler's clock by.
         */
        VirtualTimeSchedulerPrototype.advanceBy = function (time) {
            var dt = this.add(this.clock, time);
            var dueToClock = this.comparer(this.clock, dt);
            if (dueToClock > 0) {
                throw new Error(argumentOutOfRange);
            }
            if (dueToClock === 0) {
                return;
            }
            this.advanceTo(dt);
        };        

        /**
         * Advances the scheduler's clock by the specified relative time.      
         * @param {Number} time Relative time to advance the scheduler's clock by.
         */
        VirtualTimeSchedulerPrototype.sleep = function (time) {
            var dt = this.add(this.clock, time);

            if (this.comparer(this.clock, dt) >= 0) {
                throw new Error(argumentOutOfRange);
            }

            this.clock = dt;
        };

        /**
         * Gets the next scheduled item to be executed.          
         * @returns {ScheduledItem} The next scheduled item.
         */          
        VirtualTimeSchedulerPrototype.getNext = function () {
            var next;
            while (this.queue.length > 0) {
                next = this.queue.peek();
                if (next.isCancelled()) {
                    this.queue.dequeue();
                } else {
                    return next;
                }
            }
            return null;
        };

        /**
         * Schedules an action to be executed at dueTime.       
         * @param {Scheduler} scheduler Scheduler to execute the action on.
         * @param {Number} dueTime Absolute time at which to execute the action.
         * @param {Function} action Action to be executed.
         * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
         */           
        VirtualTimeSchedulerPrototype.scheduleAbsolute = function (dueTime, action) {
            return this.scheduleAbsoluteWithState(action, dueTime, invokeAction);
        };

        /**
         * Schedules an action to be executed at dueTime.
         * @param {Mixed} state State passed to the action to be executed.
         * @param {Number} dueTime Absolute time at which to execute the action.
         * @param {Function} action Action to be executed.
         * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
         */
        VirtualTimeSchedulerPrototype.scheduleAbsoluteWithState = function (state, dueTime, action) {
            var self = this,
                run = function (scheduler, state1) {
                    self.queue.remove(si);
                    return action(scheduler, state1);
                },
                si = new ScheduledItem(self, state, run, dueTime, self.comparer);
            self.queue.enqueue(si);
            return si.disposable;
        };

        return VirtualTimeScheduler;
    }(Scheduler));

    /** Provides a virtual time scheduler that uses Date for absolute time and number for relative time. */
    Rx.HistoricalScheduler = (function (_super) {
        inherits(HistoricalScheduler, _super);

        /**
         * Creates a new historical scheduler with the specified initial clock value.
         * 
         * @constructor
         * @param {Number} initialClock Initial value for the clock.
         * @param {Function} comparer Comparer to determine causality of events based on absolute time.
         */
        function HistoricalScheduler(initialClock, comparer) {
            var clock = initialClock == null ? 0 : initialClock;
            var cmp = comparer || defaultSubComparer;
            _super.call(this, clock, cmp);
        }

        var HistoricalSchedulerProto = HistoricalScheduler.prototype;

        /**
         * Adds a relative time value to an absolute time value.
         * @param {Number} absolute Absolute virtual time value.
         * @param {Number} relative Relative virtual time value to add.
         * @return {Number} Resulting absolute virtual time sum value.
         */
        HistoricalSchedulerProto.add = function (absolute, relative) {
            return absolute + relative;
        };

        /**
         * @private
         */
        HistoricalSchedulerProto.toDateTimeOffset = function (absolute) {
            return new Date(absolute).getTime();
        };

        /**
         * Converts the TimeSpan value to a relative virtual time value.
         * 
         * @memberOf HistoricalScheduler         
         * @param {Number} timeSpan TimeSpan value to convert.
         * @return {Number} Corresponding relative virtual time value.
         */
        HistoricalSchedulerProto.toRelative = function (timeSpan) {
            return timeSpan;
        };

        return HistoricalScheduler;    
    }(Rx.VirtualTimeScheduler));
    return Rx;
}));
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./rx":15}],20:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      console.trace();
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],21:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[1])