
// Author: xunli at asu.edu
define(['kdtree'], function(kdtree) {

var W= function(edge_dict, point_dict) {
  this.transformations = {};
  this.neighbors = {};
};

W.prototype = {
  sparse : function() {
    
  },
};

W.createQueenWeights = function(shp) {
  if (shp.w_queen === undefined) {
    var ids, n, w;
    shp.w_queen = {};
    for (var shared_pt in queen_dict) {
      ids = queen_dict[shared_pt];
      n = ids.length;
      w = 1/n;
      if (n > 1) {
        for (var i=0; i<n; i++) {
          if (shp.w_queen[ids[i]]===undefined) 
            shp.w_queen[ids[i]] = {};
          for (var j=i+1; j<n; j++) {
            shp.w_queen[ids[i]][ids[j]] = w;
          }
        }
      }
    }
  }
  return shp.w_queen;
};
  
W.createRookWeights = function(shp) {
  //share edge
  if (shp.w_rook === undefined) {
    var ids, n, w;
    shp.w_rook= {};
    for (var edge in arc_dict) {
      ids = arc_dict[edge];
      n = ids.length;
      w = 1/n;
      if (n > 1) {
        for (var i=0; i<n; i++) {
          if (shp.w_rook[ids[i]]===undefined) 
            shp.w_rook[ids[i]] = {};
          for (var j=i+1; j<n; j++) {
            shp.w_rook[ids[i]][ids[j]] = w;
          }
        }
      }
    }
  }
  return shp.w_rook;
};
 
W.createKnnWeights = function(shp, k)  {
  // create kd-tree if needed
  if (shp.kdtree === undefined) {
    var pts = shp.centroids;
    shp.kdtree = kdtree(pts);
  } 

  var nn, m, w, w_knn = {}; 
  for (var i=0, n=shp.n; i <n; i++)  {
    nn = shp.kdtree.knn(shp.centroids[i], k);
    if (w_knn[i] === undefined)
      w_knn[i] = {};
    m = nn.length;
    w = 1 / m;
    for ( var j=0; j<m; j++) {
      w_knn[i][nn[j]] = w;
    }
  }
  return w_knn;
};

 
return W;

});
