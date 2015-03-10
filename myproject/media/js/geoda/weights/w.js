
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
  // share points
  if (shp.w_queen === undefined) {
    var w_queen = {};
    var pt2shp = {};
    var x, y, m, arcIds, arcId, iter; 
    
    for (var i=0; i<shp.n; i++) {
      m = shp.shapes[i].length;
      for (var j=0; j<m; j++) {
        arcIds = shp.shapes[i][j];
        for (var k=0, nn=arcIds.length; k<nn; k++) {
          arcId = arcIds[k];
          if (arcId < 0) arcId = ~arcId;
         
          iter = shp.rawArcs.getArcIter(arcId);
          
          while (iter.hasNext()) {
            x = iter.x;
            y = iter.y;
            if (pt2shp[[x,y]] === undefined) pt2shp[[x,y]] = {};
            pt2shp[[x,y]][i] = null;
          }
        }
      }
    }
   
    var neighbors,  n;
    
    for (var pt in pt2shp)  {
      neighbors = pt2shp[pt];
      for (i in neighbors) {
        for (j in neighbors) {
          if (i !== j) {
            if (w_queen[i] === undefined) {
              w_queen[i] = {};
            }
            w_queen[i][j] = null;
          }
        }     
      }
    }
    
    shp.w_queen = {};
    for (var id in w_queen) {
      shp.w_queen[id] = [];
      for (var _id in w_queen[id]) {
        shp.w_queen[id].push(_id);
      }
    }
  }
  return shp.w_queen;
};
  
W.createRookWeights = function(shp) {
  //share edge
  if (shp.w_rook === undefined) {
    var w_rook = {};
    var seg2shp = {};
    var px, py, x, y, seg, m, arcIds, arcId, iter; 
    
    for (var i=0; i<shp.n; i++) {
      m = shp.shapes[i].length;
      for (var j=0; j<m; j++) {
        arcIds = shp.shapes[i][j];
        for (var k=0, nn=arcIds.length; k<nn; k++) {
          arcId = arcIds[k];
          if (arcId < 0) arcId = ~arcId;
         
          iter = shp.rawArcs.getArcIter(arcId);
        
          if (iter.hasNext())  {
            px = iter.x;
            py = iter.y;
          }
          while (iter.hasNext()) {
            x = iter.x;
            y = iter.y;
            seg = [px,py,x,y];
            if (seg2shp[seg] === undefined) seg2shp[seg] = {};
            seg2shp[seg][i] = null;
            px = x;
            py = y;
          }
        }
      }
    }
   
    var neighbors,  n;
    
    for (var seg in seg2shp)  {
      neighbors = seg2shp[seg];
      for (i in neighbors) {
        for (j in neighbors) {
          if (i !== j) {
            if (w_rook[i] === undefined) {
              w_rook[i] = {};
            }
            w_rook[i][j] = null;
          }
        }     
      }
    }
    
    shp.w_rook = {};
    for (var id in w_rook) {
      shp.w_rook[id] = [];
      for (var _id in w_rook[id]) {
        shp.w_rook[id].push(_id);
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
