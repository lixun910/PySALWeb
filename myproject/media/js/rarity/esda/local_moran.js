
// Author: xunli at asu.edu
define( ["../utils"], function(Utils) {

  var Moran_Local = function(y, w) {
    this.y = y;
    this.w = w;
    this.n = this.y.length;
    this.n_1 = this.n - 1;
    
    var mean = Utils.mean(y),
        sy = Utils.std(y),
        tmp;
    
    this.den = 0;
    this.z = [];
    
    for (var i=0; i< this.n; i++) {
      tmp = (y[i] - mean) / sy;
      this.den += tmp * tmp;
      this.z.push(tmp);
    }

    this.w_n_dict = {};
    this.sum_of_w = 0;
    for (var i in w) {
      var nn = w[i],
          j = nn.length;
      this.w_n_dict[i] = j;
      this.sum_of_w += j;
    }
    
    this.permutations = 999;    
    this.Is = this.calc(w, z);
    this.quads = [1,2,3,4];
    
    this.__quads();
  };
  
  
  Moran_Local.prototype = {
  
    calc : function(w, z) {
      
      var m_2 = this.den / this.n;
      
      for (var i =0; i < this.n; i++) {
        var I = 0;
        if (this.w[i]) {
          I = z[i];
          var nn = this.w[i],
              tmp = 0;
          for (var k=0, j=this.w_n_dict[i]; k < j; k++) {
            tmp += z[nn[k]];
          }
          I = I * tmp / m_2;
        }
        this.Is.push(I);
      }
    },
    
    crand : function() {
      var workPermutation = new Set();
      for (var cnt=0; cnt < this.n; cnt++) {
        if (this.w[i] == undefined) {
          continue;
        }
        var nn = this.w[i].length,
            countLarger = 0;
        for (var perm=0; perm < this.permutations; perm++)  {
          var rand = 0;
          while (rand < nn) {
            // computing 'perfect' permutation of given size
            var newRandom = (Math.random() * max_rand) | 0;
            if (newRandom != cnt && !workPermutation.has(newRandom)) {
              workPermutation.add(newRandom);
              rand++;
            }
          }
          var permutedLag = 0;
          for (var cp=0; cp < nn; cp++) {
          }
        }
      }
    },
    
    _ppermutate : function(z, pp) {
      if (pp == undefined) pp = 99999;
      
      var zs = [];      
      for (var i=0; i < pp; i++) {
        z = Utils.shuffle(z.slice(0));
        zs.push(z);
      }
     
      var calc = function(z) {
        var upper = 0.0;
        
        for (var i in global.env.w) {
          var nn = global.env.w[i];
          for (var k=0, j=nn.length; k < j; k++) {
            upper += z[i] * z[nn[k]];
          }
        }
        return upper/global.env.lower;   
      };
      
      var p = new Parallel(zs, {
        env : {
          w : this.w,
          lower: this.lower,
        },
      });
         
      p.map(calc).then(function(data){
        var t1 = performance.now();
        console.log((t1-this.t0)/1000);
        //console.log(data);
      });
    },
      
  };
 
  return Moran_Local;
});
