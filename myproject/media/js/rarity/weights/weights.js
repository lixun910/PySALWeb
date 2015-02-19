
// Author: xunli at asu.edu
define(function() {

var W= function(edge_dict, point_dict) {
  this.transformations = {};
  this.neighbors = {};
};

W.prototype = {
  sparse : function() {
    
  },
};

W.createQueenWeights = function(queen_dict) {
  var ids, n, w, w_queen = {};
  for (var shared_pt in queen_dict) {
    ids = queen_dict[shared_pt];
    n = ids.length;
    w = 1/n;
    if (n > 1) {
      for (var i=0; i<n; i++) {
        if (w_queen[ids[i]]===undefined) 
          w_queen[ids[i]] = {};
        for (var j=i+1; j<n; j++) {
          w_queen[ids[i]][ids[j]] = w;
        }
      }
    }
  }
  return w_queen;
};
  
W.createRookWeights = function(arc_dict) {
  //share edge
  var ids, n, w, w_rook;
  for (var edge in arc_dict) {
    ids = arc_dict[edge];
    n = ids.length;
    w = 1/n;
    if (n > 1) {
      for (var i=0; i<n; i++) {
        if (w_rook[ids[i]]===undefined) 
          w_rook[ids[i]] = {};
        for (var j=i+1; j<n; j++) {
          w_rook[ids[i]][ids[j]] = w;
        }
      }
    }
  }
  return w_rook;
};
 
W.createKnnWeights = function(centroids, kdtree)  {
  // create kd-tree
};

 
return W;

});
