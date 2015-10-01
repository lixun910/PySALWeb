
// Author: xunli at asu.edu

define(function(){

var ShpMap = function(name, shpReader, LL, Lmap, prj) {
  this.name = name;
  this.shpReader = shpReader;
  var shpType = shpReader.type();
  if (shpType == 1 || shpType == 11 || shpType == 21 || shpType == 28){
    this.shpType = 'Point'; 
  } else if (shpType == 5 || shpType == 15 || shpType == 25) {
    this.shpType = 'Polygon'; 
  } else {
    this.shpType = 'Line'; 
  }
 
  this.n = shpReader.getCounts().shapeCount; 
  // xmin, ymin, xmax, ymax
  this.bounds = this.shpReader.header().bounds;
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
  this.centroids = [];
  this.screenCoords = [];
  this.moveX = 0;
  this.moveY = 0;
  
  this.LL = LL; 
  this.Lmap = Lmap;
  if ( this.Lmap) {
    this.Lmap.fitBounds([[this.mapBottom,this.mapLeft],[this.mapTop,this.mapRight]]);
  }
};

ShpMap.prototype = {

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
    //this.extent = basemap.extent;
    this.mapLeft = basemap.mapLeft;
    this.mapRight = basemap.mapRight;
    this.mapTop = basemap.mapTop;
    this.mapBottom = basemap.mapBottom;
    this.mapWidth = basemap.mapWidth;
    this.mapHeight = basemap.mapHeight;
  },
  
  fitScreen : function(screenWidth, screenHeight, marginLeft, marginTop, moveX, moveY) {
    this.centroids = [];
    this.bbox = [];
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    
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
    var shp, parts, x, y, points, p, pt;
   
    while (shp = this.shpReader.nextShape() ) { 
      if (shp.isNull) return;
      if (this.shpType == 'Point') {
        var xy = shp.readPoints()[0];
        x = xy[0];
        y = xy[1];
        if ( this.prj) {
          pt = this.prj.forward(xy);
          x = pt[0];
          y = pt[1];
        }
        this.centroids.push([x,y]);
        this.bbox.push([x,y,x,y]);
        pt = this.mapToScreen(x,y);
        this.screenObjects.push(pt);
        
      } else {
        var xy = shp.readXY();
        var parts = shp.readPartSizes();
        var screenPart = [];
        var start = 0;
        
        for (var i=0; i<parts.length; i++ ) {
          var part = [],
              len = parts[i];
          for (j = 0; j < len; j++ ) {
            x = xy[2*j + start];
            y = xy[2*j+1 + start];
            if (this.prj) {
              pt = this.prj.forward([x,y]);
              x = pt[0];
              y = pt[1]; 
            }
            pt = this.mapToScreen(x,y);
            part.push(pt);
          }
          start += len*2;
          screenPart.push(part);
        }
        this.screenObjects.push(screenPart);
        if (this.bbox.length <  this.n)  {
          var bounds = shp.readBounds();
          if ( this.prj) {
            var ll = this.prj.forward([bounds[0], bounds[1]]);
            bounds[0] = ll[0];
            bounds[1] = ll[1];
            ll = this.prj.forward([bounds[2], bounds[3]]);
            bounds[2] = ll[0];
            bounds[3] = ll[1];
          }
          this.bbox.push([bounds[0], bounds[2], bounds[1], bounds[3]]);
          this.centroids.push([ (bounds[2]+bounds[0])/2.0, (bounds[3]+bounds[1])/2.0]);
        }
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

return ShpMap;

});
