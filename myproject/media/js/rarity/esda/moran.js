
// Author: xunli at asu.edu
define( ["../utils"], function(Utils) {

  var Moran = function(y, w) {
    this.y = y;    
    this.w = w;
    this.n = this.y.length;
    this.sum = 0.0;
    
    for (var i=0; i< this.n; i++) {
      this.sum += this.y[i]
    }
    
    this.mean = this.sum / this.n;
    
    this.lower = 0.0;
    
    this.z = [];
   
    var tmp; 
    
    for (var i=0; i< this.n; i++) {
      tmp = this.y[i] - this.mean;
      this.z.push(tmp);
      this.lower += tmp * tmp;
    }
    
    this.upper = 0.0;
    this.sum_of_w = 0;
    this.w_n_dict = {};
    
    for (var i in this.w) {
      var nn = this.w[i],
          j = nn.length;
      this.w_n_dict[i] = j;
      this.sum_of_w += j;
      for (var k=0; k < j; k++) {
        this.upper += this.z[i] * this.z[nn[k]];
      }
    }
    
    this.lower *= this.sum_of_w / this.n;
    this.I = this.upper / this.lower;
    this.EI = -1 / (this.n - 1);
   
    var t0 = performance.now();
    this._permutate(this.z);
    var t1 = performance.now();
    console.log((t1-t0)/1000);
  };
  
  
  Moran.prototype = {
  
    __calc : function(z) {
      var upper = 0.0;
      
      for (var i in this.w) {
        var nn = this.w[i];
        for (var k=0, j=this.w_n_dict[i]; k < j; k++) {
          upper += z[i] * z[nn[k]];
        }
      }
      return upper / this.lower;   
    },
    
    _permutate : function(z, pp) {
      if (pp == undefined) pp = 999;
      var larger = 0, sum_I = 0, Is = [], I = 0;
       
      for (var i=0; i < pp; i++) {
        z = Utils.shuffle(z);
        I = this.__calc(z);
        
        if (I >= this.I) {
          larger += 1;
        }
        if ( (pp - larger) < larger ) {
          larger = pp - larger;
        }
        sum_I += I;
        Is.push(I);
      }
      
      this.p_sim = (larger + 1.0) / (pp + 1.0);
      this.EI_sim =  sum_I / pp;
      this.seI_sim = Utils.std(Is);
      this.VI_sim = this.seI_sim * this.seI_sim;
      this.z_sim = (this.I - this.EI_sim) / this.seI_sim;
      
      if (this.z_sim > 0) {
        this.p_z_sim = 1 - Utils.cdf(this.z_sim);
      } else {
        this.p_z_sim = Utils.cdf(this.z_sim);
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
 
  return Moran;
});
