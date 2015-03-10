
// Author: xunli at asu.edu

define(function(){

var JsonMap = function(geojson, LL, Lmap) {
  this.geojson = geojson;
  this.name = geojson.name;
  this.shpType = geojson.shpType;
  
  this.bbox = geojson.bbxo;
  this.centroids = geojson.centroids;
  this.extent = geojson.extent;
  
  this.screenObjects = [];
  this.moveX = 0;
  this.moveY = 0;
  this.setExtent(); 
  
  this.LL = LL; 
  this.Lmap = Lmap;
  if ( this.Lmap) {
    this.Lmap.fitBounds([[this.mapBottom,this.mapLeft],[this.mapTop,this.mapRight]]);
  }
  
  this.screenWidth = null;
  this.screenHeight = null;
};

JsonMap.prototype = {
  getData: function() {
    return this.geojson;
  },
 
  setExtent : function() {
    this.mapLeft = this.extent[0];
    this.mapRight = this.extent[1];
    this.mapBottom = this.extent[2];
    this.mapTop = this.extent[3];
    this.mapWidth = this.extent[1] - this.extent[0];
    this.mapHeight = this.extent[3] - this.extent[2];
    return this.extent;
  },
  
  setLmapExtent : function(extent)  {
    if ( this.Lmap) {
      this.Lmap.fitBounds([[extent[2], extent[0]],[extent[3], extent[1]]]);
    }
  },
  
  updateExtent : function(basemap) {
    // when overlay this map on top of a base map, the extent of this map
    // should be changed to the extent of the base map
    this.mapLeft = basemap.mapLeft;
    this.mapRight = basemap.mapRight;
    this.mapTop = basemap.mapTop;
    this.mapBottom = basemap.mapBottom;
    this.mapWidth = basemap.mapWidth;
    this.mapHeight = basemap.mapHeight;
  },
  
  fitScreen : function(screenWidth, screenHeight,marginLeft, marginTop, moveX, moveY) {
    if (screenWidth === this.screenWidth && 
        screenHeight === this.screenHeight)  {
      return;
    }
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    
    // not used  in leaflet map
    if (moveX) this.moveX = moveX;
    if (moveY) this.moveY = moveY;
    // convert raw points to screen coordinators
    var whRatio = this.mapWidth / this.mapHeight,
        offsetX = marginLeft,
        offsetY = marginTop; 
    var clip_screenWidth = screenWidth - marginLeft * 2;
    var clip_screenHeight = screenHeight - marginTop * 2;
    var xyRatio = clip_screenWidth / clip_screenHeight;
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
    var n = this.geojson.points.length;
    var x, y, pt, xx=[], yy=[]; 
    
    for (var i=0; i<n; i++) {
      pt = this.geojson.points[i];
      x = pt[0];
      y = pt[1];
      pt = this.mapToScreen(x, y);
      x = pt[0] | 0;
      y = pt[1] | 0;
      xx.push(x);
      yy.push(y);
    }
   
    this.screenObjects = [];
    n = this.geojson.n;
    if (this.shpType === "POINT") {
      var ptIdx;
      for (var i=0; i<n; i++) {
        ptIdx = this.geojson.shapes[i];
        this.screenObjects.push([xx[ptIdx], yy[ptIdx]]);
      }
      
    } else if (this.shpType === "LINESTRING" || this.shpType === "POLYGON" || this.shpType === "MULTIPOINT") {
      var arcIdx, arc;
      for (var i=0; i<n; i++) {
        arcIdx = this.geojson.shapes[i];
        arc = this.geojson.arcs[arcIdx];
        var xys = [], ptIdx;
        for (var j=0, m=arc.length; j<m; j++) {
          ptIdx = arc[j];
          xys.push([xx[ptIdx], yy[ptIdx]]);
        }
        this.screenObjects.push(xys);
      }
      
    } else if (this.shpType === "MULTILINESTRING" || this.shpType === "MULTIPOLYGON") {
      var arcIdx, arcs, arc;
      for (var i=0; i<n; i++) {
        arcs = this.geojson.shapes[i];
        var part = [];
        for (var j=0, m=arcs.length; j<m; j++) {
          var xys = [], ptIdx;
          for (var k=0, p=arcs[j].length; k<p; k++) {
            ptIdx = arcs[j][k];
            xys.push([xx[ptIdx], yy[ptIdx]]);
          }
          part.push(xys);
        }
        this.screenObjects.push(part);
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
  
};

return JsonMap;

});