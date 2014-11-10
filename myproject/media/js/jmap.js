// Author: xunli at asu.edu
(function(window,undefined){

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

  var ShpMap = function(shpReader, LL, Lmap, prj) {
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
    this.mapHeight = this.mapTop - this.mapBottom;
    this.mapWidth = this.mapRight - this.mapLeft;
    this.extent = [this.mapLeft, this.mapRight, this.mapBottom, this.mapTop];
    this.bbox = [];
    this.centroids = [];
    this.screenCoords = [];
    
    this.prj = prj;
    this.LL = LL; 
    this.Lmap = Lmap;
    this.Lmap.fitBounds([[this.mapBottom,this.mapLeft],[this.mapTop,this.mapRight]]);
  };

  ShpMap.prototype.fitScreen = function(screenWidth, screenHeight, marginLeft, marginTop) {
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
    var shp, parts, x, y, points, p, pt;
   
    while (shp = this.shpReader.nextShape() ) { 
      if (shp.isNull) return;
      if (this.shpType == 'Point') {
        var xy = shp.readPoints();
        this.centroids.push(xy);
        if ( this.prj) {
          xy = this.prj.forward(xy);
        }
        pt = this.mapToScreen(xy[0], xy[1]);
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
              pt = this.prj.foward([x,y]);
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
      }
      if (this.bbox.length <  this.n)  {
        var bounds = shp.readBounds();
        this.bbox.push([bounds[0], bounds[2], bounds[1], bounds[3]]);
        this.centroids.push([(bounds[2]-bounds[0])/2.0, (bounds[3]-bounds[1])/2.0]);
      }
    }
  };
  
  ShpMap.prototype.screenToMap = function(px, py) {
    var x, y;
    if (this.LL) {
      px = px - _self.offsetX;
      py = py - _self.offsetY;
      var pt = this.Lmap.layerPointToLatLng(new this.LL.point(px,py));
      x = pt.lng;
      y = pt.lat;
    } else {
      x = this.scalePX * (px - this.offsetX) + this.mapLeft;
      y = this.mapTop - this.scalePY * (py - this.offsetY);
    }
    return [x, y];
  };
  
  ShpMap.prototype.mapToScreen = function(x, y) {
    var px, py;
    if (this.LL) {
      var pt = this.Lmap.latLngToLayerPoint(new this.LL.LatLng(y,x));
      px = pt.x + _self.offsetX;
      py = pt.y + _self.offsetY;
    } else {
      px = this.scaleX * (x - this.mapLeft) + this.offsetX;
      py = this.scaleY * (this.mapTop - y) + this.offsetY;
    }
    return [px, py];
  };

  //////////////////////////////////////////////////////////////
  // JsonMap
  //////////////////////////////////////////////////////////////
  var JsonMap = function(geoJson, extent, prj) {
    this.geojson = geoJson;
    this.prj = prj;
    this.shpType = this.geojson.features[0].geometry.type;
    this.bbox = [];
    this.centroids = [];
    this.extent = extent==undefined ? this.getExtent() : extent;
    this.mapLeft = this.extent[0];
    this.mapRight = this.extent[1];
    this.mapBottom = this.extent[2];
    this.mapTop = this.extent[3];
    this.mapWidth = this.extent[1] - this.extent[0];
    this.mapHeight = this.extent[3] - this.extent[2];
    this.screenObjects = [];
  };
  
  JsonMap.prototype.updateExtent = function(basemap) {
    // when overlay this map on top of a base map, the extent of this map
    // should be changed to the extent of the base map
    this.extent = basemap.extent;
    this.mapLeft = basemap.mapLeft;
    this.mapRight = basemap.mapRight;
    this.mapTop = basemap.mapTop;
    this.mapBottom = basemap.mapBottom;
    this.mapWidth = basemap.mapWidth;
    this.mapHeight = basemap.mapHeight;
  };
  
  JsonMap.prototype.getExtent = function() {
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
  };
  
  JsonMap.prototype.fitScreen = function(screenWidth, screenHeight,marginLeft, marginTop) {
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
  };
    
  JsonMap.prototype.latlon2Points = function() {
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
  };
  
  JsonMap.prototype.screenToMap = function(px, py) {
    var x = this.scalePX * (px - this.offsetX) + this.mapLeft;
    var y = this.mapTop - this.scalePY * (py - this.offsetY);
    return [x, y];
  };
  
  JsonMap.prototype.mapToScreen = function(x, y) {
    var px = this.scaleX * (x - this.mapLeft) + this.offsetX;
    var py = this.scaleY * (this.mapTop - y) + this.offsetY;
    return [px, py];
  };
  
  //////////////////////////////////////////////////////////////
  // LeaftletMap inherited from JsonMap
  //////////////////////////////////////////////////////////////
  LeafletMap = function(geojson, LL, Lmap, prj) {
    extent = undefined;
    JsonMap.call(this, geojson, extent, prj);
   
    this.LL = LL; 
    this.Lmap = Lmap;
    this.Lmap.fitBounds([[this.mapBottom,this.mapLeft],[this.mapTop,this.mapRight]]);
  };
  
  LeafletMap.prototype = Object.create(JsonMap.prototype);
  
  LeafletMap.prototype.constructor = LeafletMap; // prepare for own constructor
  
  LeafletMap.prototype.fitScreen = function(screenWidth, screenHeight) {
    this.screenObjects = [];
    this.latlon2Points(); 
  };
  
  LeafletMap.prototype.screenToMap = function(px, py) {
    px = px - _self.offsetX;
    py = py - _self.offsetY;
    var pt = this.Lmap.layerPointToLatLng(new this.LL.point(px,py));
    return [pt.lng, pt.lat];
  };
  
  LeafletMap.prototype.mapToScreen = function(x, y) {
    var pt = this.Lmap.latLngToLayerPoint(new this.LL.LatLng(y,x));
    return [pt.x + _self.offsetX, pt.y + _self.offsetY];
  };
  
  
  //////////////////////////////////////////////////////////////
  // GeoVizMap
  //////////////////////////////////////////////////////////////
  var GColor = function( r, g, b, a ) {
    if ( isNaN(r) ) {
      this.r = parseInt((this.cutHex(r)).substring(0,2),16);
      this.g = parseInt((this.cutHex(r)).substring(2,4),16);
      this.b = parseInt((this.cutHex(r)).substring(4,7),16);
      this.a = 255;
    } else {
      this.r = r;
      this.g = g;
      this.b = b;
      this.a = a;
      if (!a) this.a = 1;
    }
  };
 
  GColor.prototype = {
    cutHex: function(h) {
      return (h.charAt(0)=="#") ? h.substring(1,7):h;
    },
    _toHex: function(n) {
      n = parseInt(n,10);
     if (isNaN(n)) return "00";
     n = Math.max(0,Math.min(n,255));
     return "0123456789ABCDEF".charAt((n-n%16)/16)
      + "0123456789ABCDEF".charAt(n%16);
    },
    toString: function() {
      //return "rgba(" + this.r|0 + "," + this.g|0 + "," + this.b|0 + "," + this.a + ")";
      return "#"+this._toHex(this.r) + this._toHex(this.g) + this._toHex(this.b); 
    },
    toRGB: function(bg) {
      if (!bg) {
        bg = new GColor(255,255,255,1);
      }
      var a = this.a;
      return new GColor(
          (1 - a) * bg.r + a * this.r,
          (1 - a) * bg.g + a * this.g,
          (1 - a) * bg.b + a * this.b
      );
    },
  };
  
  var GPoint = function( x, y ) {
    this.x = x;
    this.y = y;
  };
  
  GPoint.prototype = {
  };
  
  var GRect = function( x0, y0, x1, y1 ) {
    this.x0 = x0 <= x1 ? x0 : x1;
    this.y0 = y0 <= y1 ? y0 : y1;
    this.x1 = x0 > x1 ? x0 : x1;
    this.y1 = y0 > y1 ? y0 : y1;
  };
  
  GRect.prototype = {
    Contains: function( gpoint ) {
      return gpoint.x >= this.x0 && gpoint.x <= this.x1 && 
             gpoint.y >= this.y0 && gpoint.y <= this.y1;
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

  var GeoVizMap = function(map, mapcanvas, params) {
    // noForeground: don't draw the map , only for highlight
    this.noForeground = params ? params["noforeground"] : false;
    if (!this.noForeground) this.noForeground = false;
    // color scheme
    this.color_theme = params ? params["color_theme"] : undefined;
    // hratio: horizontal ratio of map width / screen width
    this.hratio = params ? params["hratio"] : 0.8;
    if (!this.hratio) this.hratio = 0.8;
    // vratio: verticle ratio of map height / screen height
    this.vratio = params ? params["vratio"] : 0.8;
    if (!this.vratio) this.vratio = 0.8;
    // alpha: draw the map with transparency
    this.ALPHA = params ? params['alpha'] : 0.9;
    if (!this.ALPHA) this.ALPHA = 0.9;
    // highlight alpha: when highlight, the alpha of background map
    this.HL_ALPHA = 0.4;
    
    // private members
    this.HLT_BRD_CLR = "#CCCCCC";
    this.HLT_CLR = "#FFFF00";
    this.STROKE_CLR = "#CCCCCC";
    this.FILL_CLR = "#006400";
    this.LINE_WIDTH = 1;
  
    this.mapcanvas = mapcanvas instanceof jQuery ? mapcanvas[0] : mapcanvas;
    this.mapcanvas.width = this.mapcanvas.parentNode.clientWidth;
    this.mapcanvas.height = this.mapcanvas.parentNode.clientHeight;
    this.margin_left = this.mapcanvas.width * (1-this.hratio)/2.0;
    this.margin_top = this.mapcanvas.height * (1-this.vratio)/2.0;
    
    this.map = map;
    this.shpType = this.map.shpType; 
    // multi-layer support 
    this.layers = {}; // uuid: JsonMap/LeafletMap
    this.layerColors = ['#FFCC33','#CC6699','#95CAE4','#993333','#279B61'];
    _self = this;
    
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
    
    this.mapcanvas.addEventListener('mousemove', this.OnMouseMove, false);
    this.mapcanvas.addEventListener('mousedown', this.OnMouseDown, false);
    this.mapcanvas.addEventListener('mouseup', this.OnMouseUp, false);
    this.mapcanvas.addEventListener('keydown', this.OnKeyDown, true);
    this.mapcanvas.addEventListener('keyup', this.OnKeyUp, true);
    window.addEventListener('keydown', this.OnKeyDown, true);
    window.addEventListener('keyup', this.OnKeyUp, true);
    window.addEventListener('resize', this.OnResize, true);
    
    
    // draw map on Canvas
    this.map.fitScreen(this.mapcanvas.width, this.mapcanvas.height, this.margin_left, this.margin_top);
    
    this.buffer = this.createBuffer();
    
    this.draw(this.buffer.getContext("2d"), this.color_theme); 
    
    if ( !this.noForeground ) {
      this.buffer2Screen();
    }   
  };
  
  // static variable
  GeoVizMap.version = "0.1";
  
  // member functions
  GeoVizMap.prototype = {
    addLayer : function(uuid, submap) {
      this.layers[uuid] = submap;
      submap.updateExtent(this.map);
      this.update(); 
    },
    
    updateColor: function(color_theme) {
      if ( !this.noForeground ) {
        this.color_theme  = color_theme;
        this.buffer = this.createBuffer(this.mapcanvas);
        this.draw(this.buffer.getContext("2d"), this.color_theme);
        if ( !this.noForeground ) {
          this.buffer2Screen();
        }   
      }
    },
    
    buffer2Screen: function() {
      var context = _self.mapcanvas.getContext("2d");
      context.imageSmoothingEnabled= false;
      context.clearRect(0, 0, _self.mapcanvas.width, _self.mapcanvas.height);
      context.drawImage(_self.buffer, 0, 0);
      return context;
    },
    // create buffer canvas
    createBuffer: function() {
      var _buffer = document.createElement("canvas");
      _buffer.width = this.mapcanvas.width;
      _buffer.height = this.mapcanvas.height;
      return _buffer;
    },
    clean: function() {
      var context = _self.mapcanvas.getContext("2d");
      context.imageSmoothingEnabled= false;
      context.clearRect(0, 0, _self.mapcanvas.width, _self.mapcanvas.height);
      return context;
    },  

    old_highlight: function( ids, context, nolinking ) {
      if ( ids == undefined ) 
        return;
      if ( context == undefined) { 
        context = _self.mapcanvas.getContext("2d");
        context.lineWidth = 0.3;
        context.imageSmoothingEnabled= false;
        context.clearRect(0, 0, _self.mapcanvas.width, _self.mapcanvas.height);
        if (!_self.noForeground) {
          if ( ids && ids.length > 0 ) {
            context.globalAlpha = _self.HL_ALPHA;
          }
          context.drawImage( _self.buffer, 0, 0);
          context.globalAlpha = 1;
        }
      } 
    
      if (ids.length > 0) {
        var screenObjs = _self.map.screenObjects; 
        var colors = {};
        //colors["rgba(255,255,0,0.7)"] = ids;
        var imageObj = new Image();
        imageObj.onload = function() {
          var fillPattern = context.createPattern(imageObj,'repeat'); 
          context.strokeColor = "#000000";
          context.lineWidth = 1;
          var colors = {};
          colors['dummy'] = ids;
          if (_self.shpType == "Polygon" || _self.shpType == "MultiPolygon") {
            context.fillStyle = fillPattern;
            _self.drawPolygons( context, screenObjs, colors);
          } else if (_self.shpType == "Point" || _self.shpType == "MultiPoint") {
            context.fillStyle = fillPattern;
            _self.drawPoints( context, screenObjs, colors );
          } else if (_self.shpType == "LineString" || _self.shpType == "Line") {
            context.strokeStyle = fillPattern;
            _self.drawLines( context, screenObjs, colors );
          }
          context.strokeStyle = _self.STROKE_CLR;
          context.lineWidth = 0.3;
          _self.selected = ids;
          if ( nolinking ) {
            _self.triggerLink(ids);
          }
        };
        imageObj.src='http://127.0.0.1:8000/img/cross.png';
      }
    },
    
    highlight: function( ids, context, nolinking ) {
      if ( ids == undefined ) 
        return;
      if ( context == undefined) { 
        context = _self.mapcanvas.getContext("2d");
        context.lineWidth = 0.3;
        context.imageSmoothingEnabled= false;
        context.clearRect(0, 0, _self.mapcanvas.width, _self.mapcanvas.height);
        if (!_self.noForeground) {
          if ( ids && ids.length > 0 ) {
            context.globalAlpha = _self.HL_ALPHA;
          }
          context.drawImage( _self.buffer, 0, 0);
          context.globalAlpha = 1;
        }
      } 
      
      if (ids.length > 0) {
        //context.lineWidth = 2;
        context.strokeStyle = "#000000";
        _self.drawSelect( ids, context );
        //context.lineWidth = 0.3;
        context.strokeStyle = _self.STROKE_CLR;
       
        _self.selected = ids;
        if ( nolinking == false) {
          _self.triggerLink(ids);
        }
      }
      return context;
    },
    
    highlightExt: function( ids, extent, linking) {
      if ( ids.length == 0 && extent == undefined ) {
        return;
      }
      var x0 = extent[0], y0 = extent[1], x1 = extent[2], y1 = extent[3];
      var pt0 = _self.map.mapToScreen(x0, y0),
          pt1 = _self.map.mapToScreen(x1, y1);
      var startX = pt0[0], startY = pt0[1], 
          w = pt1[0] - startX, 
          h = pt1[1] - startY;
      if (w == 0 && h == 0) 
        return;
      _self.selected = []; 
      var hdraw = [], ddraw = []; 
      var minPX = Math.min( pt0[0], pt1[0]),
          maxPX = Math.max( pt0[0], pt1[0]),
          minPY = Math.min( pt0[1], pt1[1]),
          maxPY = Math.max( pt0[1], pt1[1]);
      for ( var i=0, n=_self.map.centroids.length; i<n; ++i) {
        var pt = _self.map.centroids[i],
            inside = false;
        if ( pt[0] >= x0 && pt[0] <= x1 && 
             pt[1] >= y0 && pt[1] <= y1 ) {
          _self.selected.push(i);
          inside = true;
        }
        // fine polygons on border of rect
        var bx = _self.map.bbox[i]; 
        if (bx[0] > x1 || bx[1] < x0 || bx[2] > y1 || bx[3] < y0) {
        } else if (x0 < bx[0] && bx[1] < x1 && y0 < bx[2] && bx[3] < y1) {
        } else {
          if (inside) { // draw it with highligh
            hdraw.push(i);
          } else { // draw it with default
            ddraw.push(i);
          }
        }
      }
      if ( hdraw.length + ddraw.length == 0) {
        return false;
      }
      if (_self.noForeground) {
        _self.old_highlight(_self.selected, undefined, true);
        return;
      }
      context = _self.mapcanvas.getContext("2d");
      context.imageSmoothingEnabled= false;
      context.lineWidth = 0.3;
      context.clearRect(0, 0, _self.mapcanvas.width, _self.mapcanvas.height);
      context.globalAlpha = _self.HL_ALPHA;
      if (!_self.noForeground) {
        context.drawImage( _self.buffer, 0, 0);
      }
      context.globalAlpha = 1;
      context.save(); // save for clipping
      context.beginPath(); // specify area for clipping
      context.rect( startX, startY, w, h);
      context.closePath();
      context.clip(); // do clipping
      // change stroke color to match transparent color
      var old_stroke_c = new GColor(_self.STROKE_CLR);
      old_stroke_c.a = _self.HL_ALPHA;
      var new_stroke_c = old_stroke_c.toRGB();
      context.strokeStyle = new_stroke_c;
      context.drawImage( _self.buffer, 0, 0);
      _self.drawSelect(ddraw, context, "unhighligh");
      context.restore(); // restore from clipping, and draw reset
      context.globalAlpha = _self.ALPHA;
      context.strokeStyle = new_stroke_c;
      //_self.highlight(hdraw, context);
      _self.drawSelect(hdraw, context);
      
      context.beginPath();
      context.strokeStyle = "#000000";
      context.rect( startX, startY, w, h);
      //context.fillStyle = "rgba(255,255,255,0)";
      context.stroke();
      context.closePath();
      context.strokeStyle = _self.STROKE_CLR;
      if (linking) {
        var hl_range = [x0, y0, x1, y1];
        _self.triggerLink(_self.selected, hl_range);
      }
      return true;
    },
    
    triggerLink: function(select_ids, highlight_range) {
      // trigger to brush/link
      var hl = {};
      if ( localStorage["HL_IDS"] ){ 
        hl = JSON.parse(localStorage["HL_IDS"]);
      }
      hl[_self.mapcanvas.id] = select_ids;//_self.selected;
      localStorage["HL_IDS"] = JSON.stringify(hl);
    
      var hl_map = {}; 
      if ( localStorage["HL_MAP"] ){ 
        hl_map = JSON.parse(localStorage["HL_MAP"]);
      }
      hl_map[_self.mapcanvas.id] = highlight_range;
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
    
    draw: function(context,  colors, fillColor, strokeColor, lineWidth) {
      context.imageSmoothingEnabled= false;
      context.lineWidth = 0.3;
      context.globalAlpha = this.ALPHA;
      if (_self.shpType == "LineString" || _self.shpType == "Line") {
        context.strokeStyle = fillColor ? fillColor : _self.FILL_CLR;
        context.lineWidth = lineWidth ? lineWidth: _self.LINE_WIDTH;
      } else {
        context.strokeStyle = strokeColor ? strokeColor : _self.STROKE_CLR;
        context.fillStyle = fillColor ? fillColor : _self.FILL_CLR;
      }
      
      if (_self.shpType == "Polygon" || _self.shpType == "MultiPolygon" ) {
        _self.drawPolygons( context, _self.map.screenObjects, colors) ;
      } else if (_self.shpType == "Point" || _self.shpType == "MultiPoint") {
        _self.drawPoints( context, _self.map.screenObjects, colors) ;
      } else if (_self.shpType == "Line" || _self.shpType == "LineString") {
        _self.drawLines( context, _self.map.screenObjects, colors) ;
      }
      var i=0;
      for ( var uuid in _self.layers ) {
        var subMap = _self.layers[uuid];
        if (subMap.shpType == "LineString" || subMap.shpType == "Line") {
          context.strokeStyle = _self.layerColors[i];
          context.lineWidth = lineWidth ? lineWidth: _self.LINE_WIDTH;
        } else {
          context.strokeStyle = strokeColor ? strokeColor : _self.STROKE_CLR;
          context.fillStyle = _self.layerColors[i];
        }
        if (subMap.shpType == "Polygon" || subMap.shpType == "MultiPolygon" ) {
          _self.drawPolygons( context, subMap.screenObjects, colors) ;
        } else if (subMap.shpType == "Point" || subMap.shpType == "MultiPoint") {
          _self.drawPoints( context, subMap.screenObjects, colors) ;
        } else if (subMap.shpType == "Line" || subMap.shpType == "LineString") {
          _self.drawLines( context, subMap.screenObjects, colors) ;
        }
        i += 1;
      }
      context.globalAlpha = 1;
    }, 
    
    drawSelect: function( ids, context, invisible) {
      var ids_dict = {};     
      for ( var i=0, n=ids.length; i<n; i++ ) {
        ids_dict[ids[i]] = 1;
      }
      var screenObjs = _self.map.screenObjects; 
      var colors = {}; 
      if ( _self.color_theme ) {
        for ( var c in _self.color_theme ) {
          var orig_ids = _self.color_theme[c];
          var new_ids = [];
          for (var i in orig_ids ) {
            var oid = orig_ids[i];
            if ( ids_dict[oid] == 1) {
              new_ids.push(oid);
            }
          }
          if (invisible == "unhighligh") {
            var old_c = new GColor(c);
            old_c.a = _self.HL_ALPHA;
            var new_c = old_c.toRGB(); 
            c = new_c.toString();
          }
          colors[c] = new_ids;
        }
      } else {
        var c = _self.FILL_CLR;
        if (invisible == "unhighligh") {
          var old_c = new GColor(c);
          old_c.a = _self.HL_ALPHA;
          var new_c = old_c.toRGB(); 
          c = new_c.toString();
        }
        colors[c] = ids;
      }
      if (invisible == "invisible") {
        colors = {};
        colors["rgba(255,255,255,0)"] = ids;
      }
      if (_self.shpType == "Polygon" || _self.shpType == "MultiPolygon") {
        _self.drawPolygons( context, screenObjs, colors);
      } else if (_self.shpType == "Point" || _self.shpType == "MultiPoint") {
        _self.drawPoints( context, screenObjs, colors );
      } else if (_self.shpType == "LineString" || _self.shpType == "Line") {
        _self.drawLines( context, screenObjs, colors );
      }
    },
    update: function(params) {
      if (params) {
        if (params['alpha']) this.ALPHA = alpha;
        this.offsetX = params['offsetX'] ? params['offsetX'] : 0;
        this.offsetY = params['offsetY'] ? params['offsetY'] : 0;
      }
      var newWidth = _self.mapcanvas.parentNode.clientWidth;
      var newHeight = _self.mapcanvas.parentNode.clientHeight;
      _self.mapcanvas.width = newWidth;
      _self.mapcanvas.height = newHeight;
      marginLeft = newWidth * (1-_self.hratio)/2.0;
      marginTop = newHeight * (1-_self.vratio)/2.0;
      _self.margin_left = marginLeft;
      _self.margin_top = marginTop;
      _self.map.fitScreen(newWidth, newHeight,marginLeft, marginTop);
      for (var uuid in _self.layers) {
        _self.layers[uuid].fitScreen(newWidth, newHeight,marginLeft,marginTop);
      }
      _self.buffer = _self.createBuffer();
      _self.draw(_self.buffer.getContext("2d"), _self.color_theme);
      
      if ( !_self.noForeground ) {
        _self.buffer2Screen();
      }   
     
    },
    resetDraw: function(e) {
        var context = _self.mapcanvas.getContext("2d");
        context.lineWidth = 0.3;
        context.imageSmoothingEnabled= false;
        context.globalAlpha = 1;
        context.clearRect(0, 0, _self.mapcanvas.width, _self.mapcanvas.height);
        if ( !_self.noForeground) {
          context.drawImage( _self.buffer, 0, 0);
        }
    },
    // register mouse events of canvas
    OnResize: function( e) {
      _self.update();
      console.log("OnResize");
    },
    OnKeyDown: function( e ) {
      if ( e.keyCode == 83 ) {
        _self.isKeyDown = true;
      } else if ( e.keyCode = 77 ) {
        _self.mapcanvas.style.pointerEvents= 'none';  
      }
    },
    OnKeyUp: function( e ) {
      if ( e.keyCode = 77 ) {
        _self.mapcanvas.style.pointerEvents= 'auto';  
      }
    },
    OnMouseDown: function( evt ) {
      //var x = evt.pageX, y = evt.pageY;
      var x = evt.offsetX, y = evt.offsetY;
      _self.isMouseDown = true;
      _self.startX = x;
      _self.startY = y;
      if ( _self.isKeyDown == true ) {
        if (_self.brushRect && _self.brushRect.Contains(new GPoint(x, y)) ) {
          console.log("brushing");
          _self.isBrushing = true;
        }
      }
      if (_self.brushRect == undefined ||
          _self.brushRect && !_self.brushRect.Contains(new GPoint(x, y)) ) {
        _self.brushRect = undefined;
        _self.isBrushing = false;
        //context.globalAlpha = this.ALPHA;
      }
    },
    OnMouseMove: function(evt) {
      if ( _self.isMouseDown == true ) {
        var currentX = evt.offsetX, 
            currentY = evt.offsetY,
            startX = _self.startX,
            startY = _self.startY;
        
        var x0 = startX >= currentX ? currentX : startX;
        var x1 = startX < currentX ? currentX : startX;
        var y0 = startY >= currentY ? currentY : startY;
        var y1 = startY < currentY ? currentY : startY;
        
        if ( _self.isBrushing == true ) {
          var offsetX = currentX - startX,
              offsetY = currentY - startY;
          x0 = _self.brushRect.x0 + offsetX;
          x1 = _self.brushRect.x1 + offsetX;
          y0 = _self.brushRect.y0 + offsetY;
          y1 = _self.brushRect.y1 + offsetY;
        } 
        var pt0 = _self.map.screenToMap(x0, y0), 
            pt1 = _self.map.screenToMap(x1, y1);
            
        x0 = pt0[0] <= pt1[0] ? pt0[0] : pt1[0];
        x1 = pt0[0] > pt1[0] ? pt0[0] : pt1[0];
        y0 = pt0[1] <= pt1[1] ? pt0[1] : pt1[1];
        y1 = pt0[1] > pt1[1] ? pt0[1] : pt1[1];
        
        _self.highlightExt([], [x0,y0,x1,y1], true);
      }
    },
    OnMouseUp: function(evt) {
      //var x = evt.pageX, y = evt.pageY;
      var x = evt.offsetX, y = evt.offsetY;
      if ( _self.isMouseDown == true) {
        if ( _self.startX == x && _self.startY == y ) {
          // point select
          var pt = _self.map.screenToMap(x, y);
          x = pt[0];
          y = pt[1];
          for ( var i=0, n=_self.map.bbox.length; i<n; i++ ) {
            var box = _self.map.bbox[i];
            if ( x > box[0] && x < box[1] && 
                 y > box[2] && y < box[3] ) {
              _self.isKeyDown = false;
              _self.isBrushing = false;
              _self.brushRect = undefined;
              _self.highlight([i]);
              _self.isMouseDown = false;
              return;
            }
          }
          _self.resetDraw();
          _self.triggerLink([], undefined);
          
        } else if ( _self.isKeyDown == true &&  _self.isBrushing == false) {
          // setup brushing box
          _self.brushRect = new GRect( _self.startX, _self.startY, x, y);
          console.log(_self.brushRect.x0,_self.brushRect.x1,_self.brushRect.y0,_self.brushRect.y1);
        }
      }
      _self.isMouseDown = false;
    },
    
  };
  
  window["ShpMap"] = ShpMap;
  window["JsonMap"] = JsonMap;
  window["LeafletMap"] = LeafletMap;
  window["GeoVizMap"] = GeoVizMap;
})(self);
