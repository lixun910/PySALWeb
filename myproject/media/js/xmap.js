// Author: xunli at asu.edu
(function(window,undefined){



//////////////////////////////////////////////////////////////
// Density Map
//////////////////////////////////////////////////////////////
var _getColorPalette = function(config) {
  var gradientConfig = { 0.25: "rgb(0,0,255)", 0.55: "rgb(0,255,0)", 0.85: "yellow", 1.0: "rgb(255,0,0)"};
  var paletteCanvas = document.createElement('canvas');
  var paletteCtx = paletteCanvas.getContext('2d');

  paletteCanvas.width = 256;
  paletteCanvas.height = 1;

  var gradient = paletteCtx.createLinearGradient(0, 0, 256, 1);
  for (var key in gradientConfig) {
    gradient.addColorStop(key, gradientConfig[key]);
  }

  paletteCtx.fillStyle = gradient;
  paletteCtx.fillRect(0, 0, 256, 1);

  return paletteCtx.getImageData(0, 0, 256, 1).data;
};

var _getPointTemplate = function(radius, blurFactor) {
  radius = 30;
  blurFactor = 0.45;
  var tplCanvas = document.createElement('canvas');
  var tplCtx = tplCanvas.getContext('2d');
  var x = radius;
  var y = radius;
  tplCanvas.width = tplCanvas.height = radius*2;

  if (blurFactor == 1) {
    tplCtx.beginPath();
    tplCtx.arc(x, y, radius, 0, 2 * Math.PI, false);
    tplCtx.fillStyle = 'rgba(0,0,0,1)';
    tplCtx.fill();
  } else {
    var gradient = tplCtx.createRadialGradient(x, y, radius*blurFactor, x, y, radius);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    tplCtx.fillStyle = gradient;
    tplCtx.fillRect(0, 0, 2*radius, 2*radius);
  }
  return tplCanvas;
};
 
var Canvas2dRenderer = function(canvas) {
  var shadowCanvas = this.shadowCanvas = document.createElement('canvas');
  var renderBoundaries = this._renderBoundaries = [10000, 10000, 0, 0];

  this._width = canvas.width;
  this._height = canvas.height;
  shadowCanvas.width = this._width;
  shadowCanvas.height = this._height;

  this.shadowCtx = shadowCanvas.getContext('2d');
  this.ctx = canvas.getContext('2d');

  this._palette = _getColorPalette();
  this._templates = {};

    this._blur = 0.25;
    this._opacity = 0.1;
    this._maxOpacity = 0.5;
    this._minOpacity = 0;
    this._useGradientOpacity = true;
};

Canvas2dRenderer.prototype = {
  renderPartial: function(data) {
    this._drawAlpha(data);
    this._colorize();
  },
  renderAll: function(data) {
    // reset render boundaries
    //this._clear();
    this._drawAlpha(data);
    this._colorize();
  },
  setDimensions: function(width, height) {
    this._width = width;
    this._height = height;
    this.canvas.width = this.shadowCanvas.width = width;
    this.canvas.height = this.shadowCanvas.height = height;
  },
  _clear: function() {
    this.shadowCtx.clearRect(0, 0, this._width, this._height);
    this.ctx.clearRect(0, 0, this._width, this._height);
  },
  _drawAlpha: function(data) {
    var min = this._min = 0;//data.min;
    var max = this._max = 1;//data.max;
    
    var dataLen = data.length;
    
    // on a point basis?
    var blur = 1 - this._blur;

    while(dataLen--) {

      var point = data[dataLen];

      var x = point[0];
      var y = point[1];
      var radius = 20;//point.radius;
      // if value is bigger than max
      // use max as value
      var value = 1;//Math.min(value, max);
      var rectX = x - radius;
      var rectY = y - radius;
      var shadowCtx = this.shadowCtx;

      var tpl;
      if (!this._templates[radius]) {
        this._templates[radius] = tpl = _getPointTemplate(radius, blur);
      } else {
        tpl = this._templates[radius];
      }
      // value from minimum / value range
      // => [0, 1]
      shadowCtx.globalAlpha = 0.04;//(value-min)/(max-min);

      shadowCtx.drawImage(tpl, rectX, rectY);

      // update renderBoundaries
      if (rectX < this._renderBoundaries[0]) {
          this._renderBoundaries[0] = rectX;
        } 
        if (rectY < this._renderBoundaries[1]) {
          this._renderBoundaries[1] = rectY;
        }
        if (rectX + 2*radius > this._renderBoundaries[2]) {
          this._renderBoundaries[2] = rectX + 2*radius;
        }
        if (rectY + 2*radius > this._renderBoundaries[3]) {
          this._renderBoundaries[3] = rectY + 2*radius;
        }

    }
  },
  _colorize: function() {
    var x = this._renderBoundaries[0];
    var y = this._renderBoundaries[1];
    var width = this._renderBoundaries[2] - x;
    var height = this._renderBoundaries[3] - y;
    var maxWidth = this._width;
    var maxHeight = this._height;
    var opacity = this._opacity;
    var maxOpacity = this._maxOpacity;
    var minOpacity = this._minOpacity;
    var useGradientOpacity = this._useGradientOpacity;

    if (x < 0) {
      x = 0;
    }
    if (y < 0) {
      y = 0;
    }
    if (x + width > maxWidth) {
      width = maxWidth - x;
    }
    if (y + height > maxHeight) {
      height = maxHeight - y;
    }

    var img = this.shadowCtx.getImageData(x, y, width, height);
    var imgData = img.data;
    var len = imgData.length;
    var palette = this._palette;


    for (var i = 3; i < len; i+= 4) {
      var alpha = imgData[i];
      var offset = alpha * 4;


      if (!offset) {
        continue;
      }

      var finalAlpha;
      if (opacity > 0) {
        finalAlpha = opacity;
      } else {
        if (alpha < maxOpacity) {
          if (alpha < minOpacity) {
            finalAlpha = minOpacity;
          } else {
            finalAlpha = alpha;
          }
        } else {
          finalAlpha = maxOpacity;
        }
      }

      imgData[i-3] = palette[offset];
      imgData[i-2] = palette[offset + 1];
      imgData[i-1] = palette[offset + 2];
      imgData[i] = useGradientOpacity ? palette[offset + 3] : finalAlpha;

    }

    img.data = imgData;
    this.ctx.putImageData(img, x, y);

    this._renderBoundaries = [1000, 1000, 0, 0];

  },
  getValueAt: function(point) {
    var value;
    var shadowCtx = this.shadowCtx;
    var img = shadowCtx.getImageData(point[0], point[1], 1, 1);
    var data = img.data[3];
    var max = this._max;
    var min = this._min;

    value = (Math.abs(max-min) * (data/255)) >> 0;

    return value;
  },
  getDataURL: function() {
    return this.canvas.toDataURL();
  }
};

//////////////////////////////////////////////////////////////
// BaseMap not used 
//////////////////////////////////////////////////////////////
var BaseMap = function() {
  this.shpType = undefined;
  this.bbox = [];
  this.centroids = [];
  this.mapExtent = [];
  this.mapLeft = undefined;
  this.mapRight = undefined;
  this.mapBottom = undefined; 
  this.mapTop = undefined;
  this.mapWidth = undefined;
  this.mapHeight = undefined;
  this.screenObjects = [];
};

//////////////////////////////////////////////////////////////
// ShpMap
//////////////////////////////////////////////////////////////
var ShpType = {
NULL: 0,
POINT: 1,
POLYLINE: 3,
POLYGON: 5,
MULTIPOINT: 8,
POINTZ: 11,
POLYLINEZ: 13,
POLYGONZ: 15,
MULTIPOINTZ: 18,
POINTM: 21,
POLYLINEM: 23,
POLYGONM: 25,
MULIPOINTM: 28,
MULTIPATCH: 31 // not supported
};

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




//////////////////////////////////////////////////////////////
// JsonMap
//////////////////////////////////////////////////////////////
var JsonMap = function(name, geoJson, LL, Lmap, prj) {
  this.name = name;
  this.geojson = geoJson;
  this.prj = prj;
  this.shpType = this.geojson.features[0].geometry.type;
  this.bbox = [];
  this.centroids = [];
  this.extent = this.getExtent();
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
  
  getExtent : function() {
    // Get extent from raw data
    var minX = Number.POSITIVE_INFINITY,
        maxX = Number.NEGATIVE_INFINITY,
        minY = Number.POSITIVE_INFINITY,
        maxY = Number.NEGATIVE_INFINITY;
    var prjPt;
    for ( var i=0, n=this.geojson.features.length; i<n; i++ ) {
      var bminX = Number.POSITIVE_INFINITY,
          bmaxX = Number.NEGATIVE_INFINITY,
          bminY = Number.POSITIVE_INFINITY,
          bmaxY = Number.NEGATIVE_INFINITY,
          coords = this.geojson.features[i].geometry.coordinates,
          x, y, j, k, part;
      if ( Array.isArray(coords[0][0])) {
        // multi-geometries
        for ( j=0, nParts=coords.length; j < nParts; j++ ) {
          part = coords[j];
          part =  Array.isArray(part[0][0])? part[0] : part;
          for ( k=0, nPoints=part.length; k < nPoints; k++ ) {
            x = part[k][0], y = part[k][1];
            if (this.prj) {
              projPt = this.prj.forward([x, y]);
              x = projPt[0];
              y = projPt[1];
              part[k][0] = x;
              part[k][1] = y;
            }
            if (x > maxX) {maxX = x;}
            if (x < minX) {minX = x;}
            if (y > maxY) {maxY = y;}
            if (y < minY) {minY = y;}
            if (x > bmaxX) {bmaxX = x;}
            if (x < bminX) {bminX = x;}
            if (y > bmaxY) {bmaxY = y;}
            if (y < bminY) {bminY = y;}
          }
        }
      } else if ( typeof coords[0] == 'number') {
          x = coords[0], y = coords[1];
          if (this.prj) {
            projPt = this.prj.forward([x, y]);
            x = projPt[0];
            y = projPt[1];
            coords[0] = x;
            coords[1] = y;
          }
          if (x > maxX) {maxX = x;}
          if (x < minX) {minX = x;}
          if (y > maxY) {maxY = y;}
          if (y < minY) {minY = y;}
          if (x > bmaxX) {bmaxX = x;}
          if (x < bminX) {bminX = x;}
          if (y > bmaxY) {bmaxY = y;}
          if (y < bminY) {bminY = y;}
      
      } else {
        for ( k=0, nPoints=coords.length; k < nPoints; k++ ) {
          x = coords[k][0], y = coords[k][1];
          if (this.prj) {
            projPt = this.prj.forward([x, y]);
            x = projPt[0];
            y = projPt[1];
            coords[k][0] = x;
            coords[k][1] = y;
          }
          if (x > maxX) {maxX = x;}
          if (x < minX) {minX = x;}
          if (y > maxY) {maxY = y;}
          if (y < minY) {minY = y;}
          if (x > bmaxX) {bmaxX = x;}
          if (x < bminX) {bminX = x;}
          if (y > bmaxY) {bmaxY = y;}
          if (y < bminY) {bminY = y;}
        }
      }
      if ( this.shpType == "Polygon" || this.shpType == "MultiPolygon" ||
           this.shpType == "LineString" || this.shpType == "Line" ) {
        this.bbox.push([bminX, bmaxX, bminY, bmaxY]);
        this.centroids.push([bminX + ((bmaxX - bminX)/2.0), 
                             bminY + ((bmaxY - bminY)/2.0)]);
      } else {
        this.bbox.push([x, x, y, y]);
        this.centroids.push([x, y]);
      }
    }
    return [minX, maxX, minY, maxY];
  },
  
  fitScreen : function(screenWidth, screenHeight,marginLeft, marginTop, moveX, moveY) {
    if (screenWidth == this.screenWidth && screenHeight == this.screenHeight)  {
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
    this.screenObjects = [];
    var i, j, k, nParts, part, lastX, lastY, coords, pt,
        n = this.geojson.features.length;
    for ( i=0; i<n; i++ ) {
      var screenCoords = [];
      coords = this.geojson.features[i].geometry.coordinates;
      if ( Array.isArray(coords[0][0])) {
        // multi-geometries
        nParts=coords.length
        for ( j=0; j < nParts; j++ ) {
          var screenPart = [];
          part = coords[j];
          if ( Array.isArray(part[0][0])) {
            part = part[0];
          }
          nPoints = part.length;
          x = part[0][0];
          y = part[0][1];
          pt = this.mapToScreen(x, y);
          x = pt[0] | 0;
          y = pt[1] | 0;
          screenPart.push([x,y]);
          lastX = x;
          lastY = y; 
          for ( k=1; k < nPoints; k++ ) {
            x = part[k][0];
            y = part[k][1];
            pt = this.mapToScreen(x, y);
            x = pt[0] | 0;
            y = pt[1] | 0;
            if ( x!= lastX || y != lastY ){ 
              screenPart.push([x,y]);
              lastX = x;
              lastY = y;
            } 
          }
          screenCoords.push( screenPart );
        }
      } else if ( typeof coords[0] == 'number') {
        var x = coords[0], y = coords[1];
        pt = this.mapToScreen(x, y);
        x = pt[0] | 0;
        y = pt[1] | 0;
        screenCoords=[x,y];
      } else {
        var x = coords[0][0], y = coords[0][1];
        pt = this.mapToScreen(x, y);
        x = pt[0] | 0;
        y = pt[1] | 0;
        screenCoords.push([x,y]);
        lastX = x;
        lastY = y; 
        for ( var k=0, nPoints=coords.length; k < nPoints; k++ ) {
          var x = coords[k][0], y = coords[k][1];
          pt = this.mapToScreen(x, y);
          x = pt[0] | 0;
          y = pt[1] | 0;
          if ( x!= lastX || y != lastY ) {
            screenCoords.push([x,y]);
            lastX = x;
            lastY = y;
          }
        }
      }
      this.screenObjects.push(screenCoords);
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

//////////////////////////////////////////////////////////////
// GeoVizMap
//////////////////////////////////////////////////////////////
var GRect = function( x0, y0, x1, y1 ) {
  this.x0 = x0 <= x1 ? x0 : x1;
  this.y0 = y0 <= y1 ? y0 : y1;
  this.x1 = x0 > x1 ? x0 : x1;
  this.y1 = y0 > y1 ? y0 : y1;
};

GRect.prototype = {
  Contains: function( x, y) {
    return x >= this.x0 && x <= this.x1 && 
           y >= this.y0 && y <= this.y1;
  },
  GetW: function() {
    return this.x1 - this.x0;
  },
  GetH: function() {
    return this.y1 - this.y0;
  },
  Move: function(offsetX, offsetY) {
    this.x0 += offsetX;
    this.x1 += offsetX;
    this.y0 += offsetY;
    this.y1 += offsetY;
  },
};


var GeoVizMap = function(mapContainer, hlcanvas) {
  // shoule be an instanceof jQuery 
  this.mapContainer = mapContainer; 
  this.hlcanvas = hlcanvas;
  this.width = this.mapContainer.width();
  this.height = this.mapContainer.height();
  this.numMaps = 0;
  this.mapList = [];
  this.mapOrder = [];
  this.layerColors = ['#006400','#FFCC33','#CC6699','#95CAE4','#993333','#279B61'];
  this.uuid = null;
};

GeoVizMap.prototype = {
  addMap : function(map, params) {
    // create a HTML5 canvas object for this map
    var canvas = $('<canvas/>', {'id':this.numMaps}).attr('class','paint-canvas');
    this.mapContainer.append(canvas);
    if (!('fill_color' in params) || params['fill_color'] == undefined) {
      params['fill_color'] = this.layerColors[this.numMaps % 6];
    }
    var mapCanvas = new MapCanvas(map, canvas, this.hlcanvas, params);
    
    for (var i=0; i<this.mapList.length; i++) {
      this.mapList[i].updateExtent(map);
    }
    
    this.mapList.push(mapCanvas);
    this.mapOrder.push(this.numMaps);
    this.numMaps += 1;
  }, 
    
  removeMap : function(mapIndex) {
    // remove canvas
    this.mapContainer.find('#'+mapIndex).remove();
    
    // update the id of rest canvas
    for (var i =0; i < this.numMaps; i++) {
      if ( i > mapIndex ) {
        $('canvas[id=' + i + ']').attr('id', i - 1);
      }
    }
    
    // clean memory
    mapIndex = this.mapOrder.indexOf(mapIndex);
    this.mapList[mapIndex].destroy();
    this.mapList[mapIndex]= null;
    this.mapList = this.mapList.splice(mapIndex, 1);
    this.numMaps -= 1;
  }, 
  
  moveAllMaps : function(offsetX, offsetY) {
    for (var i=0; i<this.mapList.length; i++) {
      this.mapList[i].move(offsetX, offsetY);
    }
  }, 
  
  updateAllMaps : function(params) {
    for (var i=0; i<this.mapList.length; i++) {
      this.mapList[i].update(params, true);
    }
  }, 
  
  cleanAllMaps : function() {
    for (var i=0; i<this.mapList.length; i++) {
      this.mapList[i].clean();
    }
  }, 
  
  removeMap : function(index) {
    var mapcanvas = this.mapList.splice(index, 1);
    // gc
    mapcanvas = null; 
  }, 
 
  reorderMaps : function(mapOrder) {
    var n = this.numMaps;
    var newExtent = mapOrder[n-1]  != this.mapOrder[n-1];
    this.mapOrder = mapOrder;
    // update orders of canvas by given new order [3,0,1,2]
    for (var i=0; i < n; i++) {
      $('canvas[id=' + mapOrder[i] + ']').appendTo(this.mapContainer);
    }
    if (newExtent) {
      var topLayerIdx = mapOrder[n-1];
      var mapcanvas = this.mapList[topLayerIdx];
      var map = mapcanvas.map;
      var extent = map.setExtent();
      map.setLmapExtent(extent);
    }
  }, 
  
  getMap : function(idx) {
    idx = typeof(idx) == "undefined" ? this.mapOrder[this.numMaps - 1] : parseInt(idx);
    return this.mapList[idx];
  }, 
};

var MapCanvas = function(map, canvas, hlcanvas, params) {
  // color scheme
  this.color_theme = undefined;
  // alpha: draw the map with transparency
  this.ALPHA = 0.8;
  // highlight alpha: when highlight, the alpha of background map
  this.HL_ALPHA = 0.4;
  // stroke width 
  this.STROKE_WIDTH = 0.3;
  // stroke color
  this.STROKE_CLR = '#FFFFFF';
  // fill color
  this.FILL_CLR = '#006400';
  // hratio: horizontal ratio of map width / screen width
  this.hratio = 0.8;
  // vratio: verticle ratio of map height / screen height
  this.vratio = 0.8;
  // noForeground: don't draw the map , only for highlight
  this.noForeground = false;
  // highlight stroke color 
  //this.HL_STROKE_CLR = '#CCCCCC';
  // highlight fill color
  //this.HL_FILL_CLR = '#FFFF00';
  this.heatmap = false;
  
  this.updateParameters(params);
  
  this.canvas = canvas instanceof jQuery ? canvas[0] : canvas;
  this.canvas.width = this.canvas.parentNode.clientWidth;
  this.canvas.height = this.canvas.parentNode.clientHeight;
  this.margin_left = this.canvas.width * (1-this.hratio)/2.0;
  this.margin_top = this.canvas.height * (1-this.vratio)/2.0;
  this.hlcanvas =  hlcanvas instanceof jQuery ? hlcanvas[0] : hlcanvas;
  this.hlcanvas.width = this.canvas.width;
  this.hlcanvas.height = this.canvas.height;
  
  this.map = map;
  this.shpType = this.map.shpType; 
  
  this.selected = [];
  this.brushRect = undefined;
  this.isBrushing = false;
  this.startX = -1;
  this.startY = -1;
  this.startPX = undefined;
  this.startPY = undefined;
  this.isMouseDown = false;
  this.isMouseUp = false;
  this.isMouseMove = false;
  this.isKeyDown = false;
  
  this.offsetX = 0;
  this.offsetY = 0;
  
  this.hlcanvas.addEventListener('mousemove', this.OnMouseMove, false);
  this.hlcanvas.addEventListener('mousedown', this.OnMouseDown, false);
  this.hlcanvas.addEventListener('mouseup', this.OnMouseUp, false);
  this.hlcanvas.addEventListener('keydown', this.OnKeyDown, true);
  this.hlcanvas.addEventListener('keyup', this.OnKeyUp, true);
  window.addEventListener('keydown', this.OnKeyDown, true);
  window.addEventListener('keyup', this.OnKeyUp, true);
  window.addEventListener('resize', this.OnResize, true);
  
  
  // draw map on Canvas
  this.map.fitScreen(this.canvas.width, this.canvas.height, this.margin_left, this.margin_top);
  
  this.buffer = this.createBuffer();
  
  this.draw(this.buffer.getContext("2d"), this.color_theme); 
  
  if ( !this.noForeground ) {
    this.buffer2Screen();
  }   
};

// static variable
MapCanvas.version = "0.1";

// member functions
MapCanvas.prototype = {

  updateParameters: function(params) {
    if (params == undefined) 
      return;
      
    if ('color_theme' in params) this.color_theme = params['color_theme'];
    if ('transparency' in params) this.ALPHA = params['transparency'];
    if ('stroke_width' in params) this.STROKE_WIDTH= params['stroke_width'];
    if ('stroke_color' in params) this.STROKE_CLR = params['stroke_color'];
    if ('fill_color' in params) this.FILL_CLR = params['fill_color'];
    if ('horizontal_ratio' in params) this.hratio = params['horizontal_ratio'];
    if ('vertical_ratio' in params) this.vratio = params['vertical_ratio'];
    if ('noForeground' in params) this.ALPHA = params['noForeground'];
    
    if ('offsetX' in params) this.offsetX = params.offsetX;
    if ('offsetY' in params) this.offsetY = params.offsetY;
    
    if ('heatmap' in params) this.heatmap = params.heatmap;
  },
  
  updateExtent: function(map) {
    this.map.updateExtent(map);
    this.update(); 
  },
  
  updateColor: function(color_theme) {
    if ( !this.noForeground ) {
      this.color_theme  = color_theme;
      this.buffer = this.createBuffer();
      this.draw(this.buffer.getContext("2d"), this.color_theme);
      if ( !this.noForeground ) {
        this.buffer2Screen();
      }   
    }
  },
  
  buffer2Screen: function() {
    var ctx = this.canvas.getContext("2d");
    ctx.imageSmoothingEnabled= false;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.buffer, 0, 0);
    return ctx;
  },
 
  clearCanvas: function(canvas) {
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  } ,
  fadeCanvas : function(nMaps, is_highlight) {
    //var nMaps = window.gViz.GetNumMaps();
    for (var i=0; i < nMaps; i++) {
      var that = window.gViz.GetMap(i);
      var ctx = that.canvas.getContext("2d");
      ctx.clearRect(0, 0, that.canvas.width, that.canvas.height);
      if (is_highlight)
        ctx.globalAlpha = that.HL_ALPHA;
      else
        ctx.globalAlpha = that.ALPHA;
      if (!that.noForeground) {
        ctx.drawImage( that.buffer, 0, 0);
      }
    }
  },
  // create buffer canvas
  createBuffer: function() {
    var _buffer = document.createElement("canvas");
    _buffer.width = this.canvas.width;
    _buffer.height = this.canvas.height;
    return _buffer;
  },
  destroy: function() {
    var ctx = this.canvas.getContext("2d");
    ctx.imageSmoothingEnabled= false;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.hlcanvas.removeEventListener('mousemove', this.OnMouseMove, false);
    this.hlcanvas.removeEventListener('mousedown', this.OnMouseDown, false);
    this.hlcanvas.removeEventListener('mouseup', this.OnMouseUp, false);
    this.hlcanvas.removeEventListener('keydown', this.OnKeyDown, true);
    this.hlcanvas.removeEventListener('keyup', this.OnKeyUp, true);
  },  

  move : function(offsetX, offsetY) {
    var ctx = this.canvas.getContext("2d");
    ctx.imageSmoothingEnabled= false;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.buffer, offsetX, offsetY);
  },
  
  highlight_cartodb: function( ids, ctx, nolinking ) {
    if ( ids == undefined ) 
      return;
      
    if ( ctx == undefined) { 
      ctx = this.canvas.getContext("2d");
      ctx.lineWidth = this.STROKE_WIDTH;
      ctx.imageSmoothingEnabled= false;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (!this.noForeground) {
        if ( ids && ids.length > 0 ) {
          ctx.globalAlpha = this.HL_ALPHA;
        }
        ctx.drawImage( this.buffer, 0, 0);
        ctx.globalAlpha = 1;
      }
    } 
  
    if (ids.length > 0) {
      var screenObjs = this.map.screenObjects; 
      var colors = {};
      //colors["rgba(255,255,0,0.7)"] = ids;
      var imageObj = new Image();
      imageObj.onload = function() {
        var fillPattern = ctx.createPattern(imageObj,'repeat'); 
        ctx.strokeColor = "#000000";
        ctx.lineWidth = 1;
        var colors = {};
        colors['dummy'] = ids;
        if (this.shpType == "Polygon" || this.shpType == "MultiPolygon") {
          ctx.fillStyle = fillPattern;
          this.drawPolygons( ctx, screenObjs, colors);
        } else if (this.shpType == "Point" || this.shpType == "MultiPoint") {
          ctx.fillStyle = fillPattern;
          this.drawPoints( ctx, screenObjs, colors );
        } else if (this.shpType == "LineString" || this.shpType == "Line") {
          ctx.strokeStyle = fillPattern;
          this.drawLines( ctx, screenObjs, colors );
        }
        ctx.strokeStyle = this.STROKE_CLR;
        ctx.lineWidth = this.STROKE_WIDTH;
        this.selected = ids;
        if ( nolinking ) {
          this.triggerLink(ids);
        }
      };
      imageObj.src='http://127.0.0.1:8000/img/cross.png';
    }
  },
  
  highlight: function( ids, ctx, nolinking ) {
    if ( ids == undefined ) 
      return;
      
    if ( ctx == undefined) { 
      ctx = this.canvas.getContext("2d");
      ctx.lineWidth = this.STROKE_WIDTH;
      ctx.imageSmoothingEnabled= false;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (!this.noForeground) {
        if ( ids && ids.length > 0 ) {
          ctx.globalAlpha = this.HL_ALPHA;
        }
        ctx.drawImage( this.buffer, 0, 0);
        ctx.globalAlpha = 1;
      }
    } 
    
    if (ids.length > 0) {
      ctx.lineWidth = this.STROKE_WIDTH;
      ctx.strokeStyle = this.STROKE_CLR;
      this.drawSelect( ids, ctx );
     
      this.selected = ids;
      if ( nolinking == false) {
        this.triggerLink(ids);
      }
    }
    return ctx;
  },
  
  highlightExt: function( ids, extent, linking) {
    if ( ids.length == 0 && extent == undefined ) 
      return;
      
    var x0 = extent[0], 
        y0 = extent[1], 
        x1 = extent[2], 
        y1 = extent[3];
        
    var pt0 = this.map.mapToScreen(x0, y0),
        pt1 = this.map.mapToScreen(x1, y1);
        
    var startX = pt0[0], 
        startY = pt0[1], 
        w = pt1[0] - startX, 
        h = pt1[1] - startY;
        
    if (w == 0 && h == 0) 
      return;
      
    this.selected = []; 
    
    var hdraw = [], 
        ddraw = []; 
        
    var minPX = Math.min( pt0[0], pt1[0]),
        maxPX = Math.max( pt0[0], pt1[0]),
        minPY = Math.min( pt0[1], pt1[1]),
        maxPY = Math.max( pt0[1], pt1[1]);
        
    for ( var i=0, n=this.map.centroids.length; i<n; ++i) {
      var pt = this.map.centroids[i],
          inside = false;
      if ( pt[0] >= x0 && pt[0] <= x1
           && pt[1] >= y0 && pt[1] <= y1 ) {
        this.selected.push(i);
        inside = true;
      }
      
      if (this.shpType != "Point" && this.shpType != "MultiPoint") {
        // fine polygons on border of rect
        var bx = this.map.bbox[i]; 
        if (bx[0] > x1 || bx[1] < x0 || bx[2] > y1 || bx[3] < y0) {
        
        } else if (x0 < bx[0] && bx[1] < x1 && y0 < bx[2] && bx[3] < y1) {
        
        } else {
          if (inside) { 
            // draw it with highligh
            hdraw.push(i);
          } else { 
            // erase draw 
            ddraw.push(i);
          }
        }
      }
    }
   
    var ctx = this.hlcanvas.getContext("2d");
    ctx.clearRect(0, 0, this.hlcanvas.width, this.hlcanvas.height);
    if ( this.selected.length > 0 ) {
      if (this.noForeground) {
        this.highlight_cartodb(this.selected, undefined, true);
      } else {
       
        // fade the current canvas-es 
        var nMaps = window.gViz.GetNumMaps();
        this.fadeCanvas(nMaps, true);
        
        // highlight ext area
        ctx.globalAlpha = 1;
        ctx.save(); // save for clipping
        ctx.beginPath(); // specify area for clipping
        ctx.rect( startX, startY, w, h);
        ctx.closePath();
        ctx.clip(); // do clipping
        ctx.drawImage( this.buffer, 0, 0);
        ctx.restore(); // restore from clipping, and draw reset
        
        if (this.shpType != "Point" && this.shpType != "MultiPoint") {
          // for polygons and lines
          if ( hdraw.length + ddraw.length == 0) 
            return false;
          // erase those out of highlight area
          ctx.lineWidth = this.STROKE_WIDTH;
          ctx.fillStyle = "rgba(0,0,0,1)";
          ctx.globalCompositeOperation = "destination-out";
          this.drawSelect(ddraw, ctx);
          this.drawSelect(hdraw, ctx);
         
          // draw those not completed objects 
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = this.ALPHA;
          ctx.strokeStyle = this.STROKE_CLR;
          this.drawSelect(hdraw, ctx);
        } 
      }
    } 
    // draw selection rectangle
    ctx.beginPath();
    ctx.strokeStyle = "#000000";
    ctx.rect(startX, startY, w, h);
    ctx.stroke();
    ctx.closePath();
    // restore stroke color
    ctx.strokeStyle = this.STROKE_CLR;
    
    
    if (linking) {
      var hl_range = [x0, y0, x1, y1];
      this.triggerLink(this.selected, hl_range);
    }
    return true;
  },
  
  triggerLink: function(select_ids, highlight_range) {
    // trigger to brush/link
    var hl = {};
    if ( localStorage["HL_IDS"] ){ 
      hl = JSON.parse(localStorage["HL_IDS"]);
    }
    hl[this.uuid] = select_ids;//this.selected;
    localStorage["HL_IDS"] = JSON.stringify(hl);
  
    var hl_map = {}; 
    if ( localStorage["HL_MAP"] ){ 
      hl_map = JSON.parse(localStorage["HL_MAP"]);
    }
    hl_map[this.uuid] = highlight_range;
    localStorage["HL_MAP"] = JSON.stringify(hl_map);
  },
  
  drawPolygons: function(ctx, polygons, colors) {
    if ( polygons == undefined || polygons.length == 0) {
      return;
    }
    if ( colors == undefined ) { 
      for ( var i=0, n=polygons.length; i<n; i++ ) {
        var obj = polygons[i];
        if ( Array.isArray(obj[0][0])) {
          // multi parts 
          for ( var j=0, nParts=obj.length; j<nParts; j++ ) {
            ctx.beginPath();
            ctx.moveTo(obj[j][0][0], obj[j][0][1]);
            for ( var k=1, nPoints=obj[j].length; k<nPoints; k++) {
              var x = obj[j][k][0],
                  y = obj[j][k][1];
              ctx.lineTo(x, y);
            }
            ctx.fill();
            ctx.stroke();
          }
        } else {
          ctx.beginPath();
          ctx.moveTo(obj[0][0], obj[0][1]);
          for ( var k=1, nPoints=obj.length; k<nPoints; k++) {
            var x = obj[k][0],
                y = obj[k][1];
            ctx.lineTo(x, y);
          }
          ctx.fill();
          ctx.stroke();
        }
      } 
    } else {
      for ( var c in colors ) {
        var ids = colors[c];
        if (c != "dummy") {
          ctx.fillStyle = c;
        }
        for ( var i=0, n=ids.length; i< n; ++i) {
          var obj = polygons[ids[i]];
          if ( obj[0][0] && Array.isArray(obj[0][0])) {
            // multi parts 
            for ( var j=0, nParts=obj.length; j<nParts; j++ ) {
              ctx.beginPath();
              ctx.moveTo(obj[j][0][0], obj[j][0][1]);
              for ( var k=1, nPoints=obj[j].length; k<nPoints; k++) {
                var x = obj[j][k][0],
                    y = obj[j][k][1];
                ctx.lineTo(x, y);
              }
              ctx.fill();
              ctx.stroke();
            }
          } else {
            ctx.beginPath();
            ctx.moveTo(obj[0][0], obj[0][1]);
            for ( var k=1, nPoints=obj.length; k<nPoints; k++) {
              var x = obj[k][0],
                  y = obj[k][1];
              ctx.lineTo(x, y);
            }
            ctx.fill();
            ctx.stroke();
          }
        }
      }
    }
  },
  
  drawLines: function( ctx, lines, colors ) {
    if ( lines == undefined || lines.length == 0 )
      return;
    if ( colors == undefined ) { 
      ctx.beginPath();
      for ( var i=0, n=lines.length; i<n; i++ ) {
        var obj = lines[i];
        if ( Array.isArray(obj[0][0]) ) {
          // multi parts 
          for ( var j=0, nParts=obj.length; j<nParts; j++ ) {
            ctx.moveTo(obj[j][0][0], obj[j][0][1]);
            for ( var k=1, nPoints=obj[j].length; k<nPoints; k++) {
              var x = obj[j][k][0], y = obj[j][k][1];
              ctx.lineTo(x, y);
            }
          }
        } else {
          ctx.moveTo(obj[0][0], obj[0][1]);
          for ( var k=1, nPoints=obj.length; k<nPoints; k++) {
            var x = obj[k][0], y = obj[k][1];
            ctx.lineTo(x, y);
          }
        }
      } 
      ctx.stroke();
    } else {
      for ( var c in colors ) {
        var ids = colors[c];
        ctx.strokeStyle = c;
        for ( var i=0, n=ids.length; i< n; ++i) {
          ctx.beginPath();
          var obj = lines[ids[i]];
          if ( Array.isArray(obj[0][0]) ) {
            // multi parts 
            for ( var j=0, nParts=obj.length; j<nParts; j++ ) {
              ctx.moveTo(obj[j][0][0], obj[j][0][1]);
              for ( var k=1, nPoints=obj[j].length; k<nPoints; k++) {
                var x = obj[j][k][0], y = obj[j][k][1];
                ctx.lineTo(x, y);
              }
            }
          } else {
            ctx.moveTo(obj[0][0], obj[0][1]);
            for ( var k=1, nPoints=obj.length; k<nPoints; k++) {
              var x = obj[k][0], y = obj[k][1];
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        }
      }
    }  
  },
  
  drawPoints: function( ctx, points, colors ) {
    var end = 2*Math.PI;
    if ( colors == undefined ) { 
      for ( var i=0, n=points.length; i<n; i++ ) {
        var pt = points[i];
        //ctx.fillRect(pt[0], pt[1], 3, 3);
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 2, 0, end, true);
        ctx.stroke();
        ctx.fill();
      } 
    } else {
      for ( var c in colors ) {
        ctx.fillStyle = c;
        var ids = colors[c];
        for ( var i=0, n=ids.length; i< n; ++i) {
          var pt = points[ids[i]];
          //ctx.fillRect(pt[0], pt[1], 3, 3);
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], 2, 0, end, true);
          ctx.stroke();
          ctx.fill();
        } 
      }
    } 
    
  },
  
  draw: function(ctx,  colors, fillColor, strokeColor, lineWidth) {
    ctx.imageSmoothingEnabled= false;
    ctx.lineWidth = this.STROKE_WIDTH;
    ctx.globalAlpha = this.ALPHA;
    
    if (this.shpType == "LineString" || this.shpType == "Line") {
      ctx.strokeStyle = fillColor ? fillColor : this.FILL_CLR;
      ctx.lineWidth = lineWidth ? lineWidth: this.STROKE_WIDTH;
      
    } else if (this.shpType == "Polygon" || this.shpType == "MultiPolygon") {
      ctx.strokeStyle = strokeColor ? strokeColor : this.STROKE_CLR;
      ctx.fillStyle = fillColor ? fillColor : this.FILL_CLR;
      
    } else {
      ctx.strokeStyle = strokeColor ? strokeColor : this.STROKE_CLR;
      ctx.fillStyle = fillColor ? fillColor : this.FILL_CLR;
      
    }
    
    if (this.shpType == "Polygon" || this.shpType == "MultiPolygon" ) {
      this.drawPolygons( ctx, this.map.screenObjects, colors) ;
      
    } else if (this.shpType == "Point" || this.shpType == "MultiPoint") {
      if ( this.heatmap == true) {
        // test heatmap
        var hm = new Canvas2dRenderer(this.buffer);
        hm.renderAll(this.map.screenObjects);
        this.heatmap = false;
      }
      this.drawPoints( ctx, this.map.screenObjects, colors) ;
      
    } else if (this.shpType == "Line" || this.shpType == "LineString") {
      this.drawLines( ctx, this.map.screenObjects, colors) ;
      
    }
    ctx.globalAlpha = 1;
  }, 
  
  drawSelect: function( ids, ctx, invisible ) {
    var colors = {}; 
    if ( this.color_theme ) {
      // filter: remove dup ids
      var ids_dict = {};     
      for ( var i=0, n=ids.length; i<n; i++ ) {
        ids_dict[ids[i]] = 1;
      }
      for ( var c in this.color_theme ) {
        var orig_ids = this.color_theme[c];
        var new_ids = [];
        for (var i in orig_ids ) {
          var oid = orig_ids[i];
          if ( ids_dict[oid] == 1) {
            new_ids.push(oid);
          }
        }
        colors[c] = new_ids;
      }
    } else {
      // draw all ids using default uniform fill color
      var c = this.FILL_CLR;
      colors[c] = ids;
    }
    var screenObjs = this.map.screenObjects; 
    if (this.shpType == "Polygon" || this.shpType == "MultiPolygon") {
      this.drawPolygons( ctx, screenObjs, colors);
    } else if (this.shpType == "Point" || this.shpType == "MultiPoint") {
      this.drawPoints( ctx, screenObjs, colors );
    } else if (this.shpType == "LineString" || this.shpType == "Line") {
      this.drawLines( ctx, screenObjs, colors );
    }
  },
  
  update: function(params, bForceUpdate) {
    if (bForceUpdate!=undefined) {
      this.map.screenWidth = null;
      this.map.screenHeight = null;
    }
    this.updateParameters(params);
    
    var newWidth = this.canvas.parentNode.clientWidth,
        newHeight = this.canvas.parentNode.clientHeight;
    this.canvas.width = newWidth;
    this.canvas.height = newHeight;
    this.hlcanvas.width = newWidth;
    this.hlcanvas.height = newHeight;
  
    this.clearCanvas(this.hlcanvas);
    this.clearCanvas(this.canvas);
   
    this.margin_left = newWidth * (1-this.hratio)/2.0;
    this.margin_top = newHeight * (1-this.vratio)/2.0;
    
    this.map.fitScreen(newWidth, newHeight, this.margin_left, this.margin_top, this.offsetX, this.offsetY);
    
    this.buffer = null; // gc
    this.buffer = this.createBuffer();
    this.draw(this.buffer.getContext("2d"), this.color_theme);
    if ( !this.noForeground ) {
      this.buffer2Screen();
    }   
    this.offsetX = 0;
    this.offsetY = 0;
  },
  
  clean: function(){
    // called when zoom/move leafletmap
    this.clearCanvas(this.canvas);
    this.clearCanvas(this.hlcanvas);
  },
  
  resetDraw: function(e) {
      var ctx = this.canvas.getContext("2d");
      ctx.lineWidth = this.STROKE_WIDTH;
      ctx.imageSmoothingEnabled= false;
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if ( !this.noForeground) {
        ctx.drawImage( this.buffer, 0, 0);
      }
  },
  
  // register mouse events of canvas
  OnResizeDone : function() {
    $('canvas').show();
    var n = window.gViz.GetNumMaps();
    for (var i=0; i < n; i++) {
      var self = window.gViz.GetMap(i);
      self.update();
    }
    console.log('resize');
  },
  
  OnResize: function( evt ) {
    var n = window.gViz.GetNumMaps(),
        cur = window.gViz.GetMap(); 
    $('canvas, .ui-dialog, .down-arrow').hide();
    clearTimeout(window.gViz.resizeTimer);
    window.gViz.resizeTimer = setTimeout(cur.OnResizeDone, 500);
  },
  
  OnKeyDown: function( evt ) {
    if ( evt.keyCode == 83 ) {
      var self = window.gViz.GetMap();
      self.isKeyDown = true;
    } else if ( evt.keyCode = 77 ) {
      var self = window.gViz.GetMap();
      self.hlcanvas.style.pointerEvents= 'none';  
    }
  },
  OnKeyUp: function( evt ) {
    if ( evt.keyCode = 77 ) {
      var self = window.gViz.GetMap();
      self.hlcanvas.style.pointerEvents= 'auto';  
    }
  },
  OnMouseDown: function( evt ) {
    var self = window.gViz.GetMap();
    //var x = evt.pageX, y = evt.pageY;
    var x = evt.offsetX, y = evt.offsetY;
    self.isMouseDown = true;
    self.startX = x;
    self.startY = y;
    if ( self.isKeyDown == true ) {
      if (self.brushRect && self.brushRect.Contains(x, y) ) {
        self.isBrushing = true;
      }
    }
    if (self.brushRect == undefined ||
        self.brushRect && !self.brushRect.Contains(x, y) ) {
      self.brushRect = undefined;
      self.isBrushing = false;
      //ctx.globalAlpha = self.ALPHA;
    }
  },
  OnMouseMove: function(evt) {
    var self = window.gViz.GetMap();
    if ( self.isMouseDown == true ) {
      var currentX = evt.offsetX, 
          currentY = evt.offsetY,
          startX = self.startX,
          startY = self.startY;
      
      var x0 = startX >= currentX ? currentX : startX;
      var x1 = startX < currentX ? currentX : startX;
      var y0 = startY >= currentY ? currentY : startY;
      var y1 = startY < currentY ? currentY : startY;
      
      if ( self.isBrushing == true ) {
        var offsetX = currentX - startX,
            offsetY = currentY - startY;
        x0 = self.brushRect.x0 + offsetX;
        x1 = self.brushRect.x1 + offsetX;
        y0 = self.brushRect.y0 + offsetY;
        y1 = self.brushRect.y1 + offsetY;
      } 
      var pt0 = self.map.screenToMap(x0, y0), 
          pt1 = self.map.screenToMap(x1, y1);
          
      x0 = pt0[0] <= pt1[0] ? pt0[0] : pt1[0];
      x1 = pt0[0] > pt1[0] ? pt0[0] : pt1[0];
      y0 = pt0[1] <= pt1[1] ? pt0[1] : pt1[1];
      y1 = pt0[1] > pt1[1] ? pt0[1] : pt1[1];
      
      self.highlightExt([], [x0,y0,x1,y1], true);
    }
  },
  OnMouseUp: function(evt) {
    var self = window.gViz.GetMap();
    if ( self.isMouseDown == true) {
      var x = evt.offsetX, y = evt.offsetY;
      if ( self.startX == x && self.startY == y ) {
        // point select
        self.clearCanvas(self.hlcanvas);
        var pt = self.map.screenToMap(x, y);
        x = pt[0];
        y = pt[1];
        for ( var i=0, n=self.map.bbox.length; i<n; i++ ) {
          var box = self.map.bbox[i];
          if ( x > box[0] && x < box[1] && 
               y > box[2] && y < box[3] ) {
            self.isKeyDown = false;
            self.isBrushing = false;
            self.brushRect = undefined;
            self.highlight([i]);
            // fade out other canvas-es with highlight
            var nMaps = window.gViz.GetNumMaps();
            self.fadeCanvas(nMaps-1, true);
            self.isMouseDown = false;
            return;
          }
        }
        self.resetDraw();
        // reset other canvas-es without highlight
        var nMaps = window.gViz.GetNumMaps();
        self.fadeCanvas(nMaps-1, false);
        self.triggerLink([], undefined);
        
      } else if ( self.isKeyDown == true &&  self.isBrushing == false) {
        // setup brushing box
        self.brushRect = new GRect( self.startX, self.startY, x, y);
      }
    }
    self.isMouseDown = false;
  },
  
};

window["ShpMap"] = ShpMap;
window["JsonMap"] = JsonMap;
window["MapCanvas"] = MapCanvas;
window["GeoVizMap"] = GeoVizMap;

window["HeatMap"] = Canvas2dRenderer;

})(self);
