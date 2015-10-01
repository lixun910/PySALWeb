
define({
  // O(n) Fisher–Yates shuffle
  shuffle : function(array) {
    var m = array.length, t, i;

    // While there remain elements to shuffle…
    while (m) {

      // Pick a remaining element…
      i = (Math.random() * m--) |0;

      // And swap it with the current element.
      t = array[m];
      array[m] = array[i];
      array[i] = t;
    }

    return array;
  },

  sum : function(array, n) {
    if (!n)  n = array.length;
    var _sum = 0.0;
    for (var i=0; i < n; i++)   {
      _sum += array[i];
    }
    return _sum;
  },
  
  mean : function(array, n) {
    if (!n)  n = array.length;
    return this.sum(array, n) / n;
  },
  
  variance : function(array, mean, n) {
    if (n <= 1) return 0;
   
    var v = 0, tmp;
    for (var i=0; i < n; i++) {
      tmp = (array[i] - mean);
      v += tmp * tmp;
    }
    
    return v / n;
  },
  
  std : function(array, n, _mean) {
    if (!n)  n = array.length;
    if (!_mean) _mean = this.mean(array, n);
    
    var tmp, _std=0.0;
    
    for (var i=0; i < n; i++)   {
      tmp = (array[i] - _mean);
      _std += tmp * tmp;
    } 
    
    return Math.sqrt(_std / n);
  },

  // erf
  erf : function(x) {
    // save the sign of x
    var sign = (x >= 0) ? 1 : -1;
    x = Math.abs(x);
    
    // constants
    var a1 =  0.254829592;
    var a2 = -0.284496736;
    var a3 =  1.421413741;
    var a4 = -1.453152027;
    var a5 =  1.061405429;
    var p  =  0.3275911;
  
    // A&S formula 7.1.26
    var t = 1.0/(1.0 + p*x);
    var y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y; // erf(-x) = -erf(x);
  },
  
  // norm.cdf 
  cdf : function(x, _mean, _variance) {
    if (!_mean) _mean = 0;
    if (!_variance) _variance = 0;
    
    return 0.5 * (1 + this.erf((x - _mean) / (Math.sqrt(2 * _variance))));
  },
  
  buildKDtree : function(points) {
      var points = [
  [0, 1, 100],
  [-5, 0.11, Math.PI],
  [0, 10, -13]];
      var tree = kdtree(points);
  },
});