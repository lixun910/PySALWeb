// Author: xunli at asu.edu

define( ["./topojson", "../weights/w"], function(TopoJSON, W) {

var TopoJsonMap = function(name, topology, LL, Lmap, prj) {
  // "type" : "Topology",
  // "transform" : {'scale' :, "translate": }
  // "objects" : {'polygon': {'type':'Geome'}, 'geometries':[]}
  // "arcs": []
  this.name = name;
  this.topology = topology;
  this.layers = [];
  this.opts = {};
  
  if (topology.arcs && topology.arcs.length > 0) {
    if (topology.transform) {
      TopoJSON.decodeArcs(topology.arcs, topology.transform);
    }
  }
 
  this.arcs = topology.arcs;
  this.arcs_bbox = [];
    
  for (var name in topology.objects) {
    var object = topology.objects[name];
    var lyr = TopoJSON.importObject(object, this.opts);
        
    if (lyr.shapes && (lyr.geometry_type == 'polygon' || lyr.geometry_type == 'polyline')) {
      // clean polygon or polyline shapes, in-place
      // we rely on users to take care of shapes
    }
    lyr.name = name;
    this.layers.push(lyr);
  } 
  // TODO: here we only take care of one layer in one json file 
  this.layer = this.layers[0];
  
  this.bbox = [];
  this.centroids = [];
  this.shpType = this.layer.geometry_type.toUpperCase(); 
  this.extent = this.getExtent(this.layer);
  this.setExtent();
  
  this.prj = prj;
  this.LL = LL;
  this.Lmap = Lmap;
  if ( this.Lmap) {
    this.Lmap.fitBounds([[this.mapBottom,this.mapLeft],[this.mapTop,this.mapRight]]);
  }
  
  this.screenWidth = null;
  this.screenHeight = null;
  this.screenObjects = [];
  
  this.fitScreen(800,600);
  console.log(this.screenObjects);
};

TopoJsonMap.prototype = {

  setExtent : function() {
    this.mapLeft = this.extent[0];
    this.mapRight = this.extent[1];
    this.mapBottom = this.extent[2];
    this.mapTop = this.extent[3];
    this.mapWidth = this.extent[1] - this.extent[0];
    this.mapHeight = this.extent[3] - this.extent[2];
  },
  
  getExtent : function() {
    var minX = Number.POSITIVE_INFINITY,
        maxX = Number.NEGATIVE_INFINITY,
        minY = Number.POSITIVE_INFINITY,
        maxY = Number.NEGATIVE_INFINITY;
  
    // get bbox for each arc 
    var x, y, points;    
    for (var i=0, n=this.arcs.length; i <n; i++) {
      var bminX = Number.POSITIVE_INFINITY,
          bmaxX = Number.NEGATIVE_INFINITY,
          bminY = Number.POSITIVE_INFINITY,
          bmaxY = Number.NEGATIVE_INFINITY;
          
      if ( this.shpType === "POLYGON" || this.shpType === "MULTIPOLYGON") {
        points = this.arcs[i];
        for (var j=0, m=points.length; j<m; j++) {
          x = points[j][0];
          y = points[j][1];
          if (x > maxX) {maxX = x;}
          if (x < minX) {minX = x;}
          if (y > maxY) {maxY = y;}
          if (y < minY) {minY = y;}
          if (x > bmaxX) {bmaxX = x;}
          if (x < bminX) {bminX = x;}
          if (y > bmaxY) {bmaxY = y;}
          if (y < bminY) {bminY = y;}
        }
        this.arcs_bbox.push([bminX, bmaxX, bminY, bmaxY]);
      }
    }
 
    // get bbox for each shape 
    var arc, box, _box, x0,x1,y0,y1; 
    for (var i=0, n=this.layer.shapes.length; i<n;i++)  {
      arc = this.layer.shapes[i];
      box = this.arcs_bbox[arc[0]];
      
      for (var j=1, m=arc.length; j<m; j++) {
        _box = this.arcs_bbox[arc[j]];
        if (_box[0] < box[0]) box[0] = _box[0];
        if (_box[1] > box[1]) box[1] = _box[1];
        if (_box[2] < box[2]) box[2] = _box[2];
        if (_box[3] > box[3]) box[3] = _box[3];
      }
      
      this.bbox.push(box);
      this.centroids.push([(box[0]+ box[1])/2.0, (box[2]+ box[3])/2.0]);
    }
    
    return [minX, maxX, minY, maxY];
  },
  
  fitScreen : function(screenWidth, screenHeight, marginLeft, marginTop, moveX, moveY) {
    if (screenWidth === this.screenWidth && screenHeight === this.screenHeight) return;
    
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    
    // not used  in leaflet map
    if (moveX) this.moveX = moveX;
    if (moveY) this.moveY = moveY;
    if (!marginLeft) marginLeft = 0;
    if (!marginTop) marginTop = 0;
    
    // convert raw points to screen coordinators
    var whRatio = this.mapWidth / this.mapHeight,
        offsetX = marginLeft,
        offsetY = marginTop,
        clip_screenWidth = screenWidth - marginLeft * 2,
        clip_screenHeight = screenHeight - marginTop * 2,
        xyRatio = clip_screenWidth / clip_screenHeight;
        
    if ( xyRatio >= whRatio ) {
      offsetX = (clip_screenWidth - clip_screenHeight * whRatio) / 2.0 + marginLeft;
    } else if ( xyRatio < whRatio ) {
      offsetY = (clip_screenHeight - clip_screenWidth / whRatio) / 2.0 + marginTop;
    }
    
    screenWidth = screenWidth - offsetX * 2;
    screenHeight =  screenHeight - offsetY * 2;
    scaleX = screenWidth / this.mapWidth;
    scaleY = screenHeight / this.mapHeight;
    
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.scaleX = scaleX;
    this.scaleY = scaleY;
    this.scalePX = 1/scaleX;
    this.scalePY = 1/scaleY;
    
    this.screenObjects = [];
    this.latlon2Points(); 
  },
  
  latlon2Points : function() {
    this.screenObjects = [];
    var x, y, points, pt, xxxyyy=[];    
    for (var i=0, n=this.arcs.length; i <n; i++) {
      points = this.arcs[i];
      var xxyy=[];
      for (var j=0, m=points.length; j<m; j++) {
        x = points[j][0];
        y = points[j][1];
        pt = this.mapToScreen(x,y);
        x = pt[0] | 0;
        y = pt[1] | 0;
        xxyy.push([x,y]);
      }
      xxxyyy.push(xxyy);
    }
    var shape, m;
    for (var i=0, n=this.layer.shapes.length; i<n; i++) {
      shape = this.layer.shapes[i];
      m = shape.length;
      if (m >1) {
        var parts = [];
        for (var j=0; j<m; j++) {
          parts.push(xxxyyy[shape[j]]);
        } 
        this.screenObjects.push(parts);
      } else {
        this.screenObjects.push(xxxyyy[shape[0]]);
      }
    }
  },
  
  screenToMap : function(px, py) {
    var x, y;
    if (this.LL) {
      px = px;
      py = py;
      var pt = this.Lmap.containerPointToLatLng(new this.LL.point(px,py));
      x = pt.lng;
      y = pt.lat;
    } else {
      x = this.scalePX * (px - this.offsetX) + this.mapLeft;
      y = this.mapTop - this.scalePY * (py - this.offsetY);
    }
    return [x, y];
  },
  
  mapToScreen : function(x, y) {
    var px, py;
    if (this.LL) {
      var pt = this.Lmap.latLngToContainerPoint(new this.LL.LatLng(y,x));
      px = pt.x;
      py = pt.y;
    } else {
      px = this.scaleX * (x - this.mapLeft) + this.offsetX;
      py = this.scaleY * (this.mapTop - y) + this.offsetY;
    }
    return [px, py];
  },
  
  
  createQueenWeights: function() {
    var edge_dict = {},
        arcs, arc,m;
    for (var i=0, n=this.layer.shapes.length; i<n;i++)  {
      arcs = this.layer.shapes[i];
      m = arcs.length;
      for (var j=0; j<m; j++) {
        arc = arcs[j];
        if ( edge_dict[arc] === undefined ) {
          edge_dict[arc] = {};
        }
        edge_dict[arc][i] = null;
      }
    } 
    var ids, w_dict = {};
    for (var arc in edge_dict) {
      ids = edge_dict[arc];
      
      for (var i=0, n=ids.length; i<n; i++) {
        for (var j=i+1; j<n; j++) {
          w_dict[i][j] = 1;
          w_dict[j][i] = 1;
        }
      }
    }
    return new W(w_dict);
  },
};

return TopoJsonMap;

}); // end define
