
// Author: xunli at asu.edu

define(function(){

var VoronoiMap = function(name, points, polygons, bounds, LL, Lmap, prj) {
  this.name = name;
  this.shpType = 'Polygon'; 
  this.polygons = polygons;
  this.n = polygons.length;
  
  // xmin, ymin, xmax, ymax
  this.bounds = bounds;
  this.mapLeft = this.bounds[0];
  this.mapBottom = this.bounds[1];
  this.mapRight = this.bounds[2];
  this.mapTop = this.bounds[3];
  
  this.prj = prj;
  if (this.prj) {
    var pt = this.prj.forward([this.mapLeft, this.mapBottom]);
    this.mapLeft = pt[0];
    this.mapBottom = pt[1];
    pt = this.prj.forward([this.mapRight, this.mapTop]);
    this.mapRight = pt[0];
    this.mapTop = pt[1];
  }
  
  this.mapHeight = this.mapTop - this.mapBottom;
  this.mapWidth = this.mapRight - this.mapLeft;
  this.extent = [this.mapLeft, this.mapRight, this.mapBottom, this.mapTop];
  this.bbox = [];
  this.centroids = points;
  this.moveX = 0;
  this.moveY = 0;
  
  this.LL = LL; 
  this.Lmap = Lmap;
  if ( this.Lmap) {
    this.Lmap.fitBounds([[this.mapBottom,this.mapLeft],[this.mapTop,this.mapRight]]);
  }
};

VoronoiMap.prototype = {

  getData : function() {
    return this.shpReader;
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
    this.extent = basemap.extent;
    this.mapLeft = basemap.mapLeft;
    this.mapRight = basemap.mapRight;
    this.mapTop = basemap.mapTop;
    this.mapBottom = basemap.mapBottom;
    this.mapWidth = basemap.mapWidth;
    this.mapHeight = basemap.mapHeight;
  },
  
  fitScreen : function(screenWidth, screenHeight, marginLeft, marginTop, moveX, moveY) {
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
    this.offsetX = offsetX + moveX; 
    this.offsetY = offsetY + moveY;
    this.scaleX = scaleX;
    this.scaleY = scaleY;
    this.scalePX = 1/scaleX;
    this.scalePY = 1/scaleY;
    
    this.screenObjects = [];

    for (var i=0; i<this.n; i++) {
      var poly = this.polygons[i],
          part = [];
          
      if (poly === undefined) continue; // could be duplicated
       var bminX = Number.POSITIVE_INFINITY,
          bmaxX = Number.NEGATIVE_INFINITY,
          bminY = Number.POSITIVE_INFINITY,
          bmaxY = Number.NEGATIVE_INFINITY;
          
      for (j = 0, m=poly.length; j < m; j++ ) {
        x = poly[j][0];
        y = poly[j][1];
        if (x === undefined || y === undefined || x === NaN || y === NaN) 
          continue;
          
        if (this.prj) {
          pt = this.prj.forward([x,y]);
          x = pt[0];
          y = pt[1]; 
        }
        if (x > bmaxX) {bmaxX = x;}
        if (x < bminX) {bminX = x;}
        if (y > bmaxY) {bmaxY = y;}
        if (y < bminY) {bminY = y;}
        pt = this.mapToScreen(x,y);
        part.push(pt);
      }
      
      this.screenObjects.push(part);
      this.bbox.push([bminX, bmaxX, bminY, bmaxY]);
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

return VoronoiMap;

});
