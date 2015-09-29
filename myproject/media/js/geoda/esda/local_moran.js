
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
    
    this.quads = [1,2,3,4];
    this.permutations = 999;    
    this.Is = [];
    this.p_sim = [];
    this.q = [];
    
    this.calc(w, this.z);
  };
  
  
  Moran_Local.prototype = {
  
    calc: function(w, z) {
      var m_2 = this.den / this.n_1,
          half_perm = this.permutations / 2;
      
      for (var cnt=0; cnt < this.n; cnt++) {
        if (w[cnt] == undefined) {
          this.Is.push(0);
          this.p_sim.push(0);
          this.q.push(5);
          continue;
        }
        
        // compute LISA
        var neighbors = this.w[cnt],
            tmp = 0,
            nn = this.w_n_dict[cnt];
        for (var k=0; k < nn; k++) {
          tmp += z[neighbors[k]] / nn;
        }
        I = z[cnt] * tmp / m_2;
        this.Is.push(I);
        
        // assign cluster
        if (z[cnt] > 0 && I > 0) this.q[cnt] = 1;
        else if (z[cnt] < 0 && I <0) this.q[cnt] = 2;
        else if (z[cnt] > 0 && I <0) this.q[cnt] = 4;
        else this.q[cnt] = 3;
       
        // pseudo p-value 
        var countLarger = 0;
        for (var perm=0; perm < this.permutations; perm++)  {
          var rand = 0,
              workPermutation = {},
              rids = [];
          while (rand < nn) {
            // computing 'perfect' permutation of given size
            var newRandom = (Math.random() * this.n_1) | 0;
            if (newRandom != cnt && workPermutation[newRandom]===undefined) {
              workPermutation[newRandom] = 0;
              rids.push(newRandom);
              rand++;
            }
          }
          var permutedLag = 0;
          // use permutation to compute the lag
          // compute the lag for weights
          for (var cp=0; cp < nn; cp++) {
            permutedLag += z[rids[cp]];
          }
          
          // row standardization
          if (nn) permutedLag /= nn;
          var localMoranPermuted = z[cnt] * permutedLag;
          if (localMoranPermuted >= this.Is[cnt]) ++countLarger;
        }
        
        // pick the smallest
        if (countLarger > half_perm) {
          countLarger = this.permutations - countLarger;
        }
        
        this.p_sim.push((countLarger + 1.0) / (this.permutations+1));
      }      
    },
    
  };
 
  return Moran_Local;
});
