// Author: xunli at asu.edu
(function(window,undefined){
  var GPoint = function( x, y ) {
    this.x = x;
    this.y = y;
  };
  
  GPoint.prototype = {
  };
  
  var GRect = function( x0, y0, x1, y1 ) {
    this.x0 = x0;
    this.y0 = y0;
    this.x1 = x1;
    this.y1 = y1;
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
  };
  
  var GeoVizMap = function(geojson, mapcanvas, color_theme, id_category, extent) {
    // private members
    this.HLT_BRD_CLR = "#CCC";
    this.HLT_CLR = "yellow";
    this.STROKE_CLR = "#CCCCCC";
    this.FILL_CLR = "green";
    this.LINE_WIDTH = 1;
  
    this.mapcanvas = mapcanvas instanceof jQuery ? mapcanvas[0] : mapcanvas;
    this.geojson = geojson;
    this.width = window.innerWidth * 0.8;//mapcanvas.width;
    this.height = window.innerHeight * 0.8; //mapcanvas.height;
    this.mapcanvas.width = this.width;
    this.mapcanvas.height = this.height;
    this.shpType = geojson.features[0].geometry.type;
    
    this.color_theme = color_theme;
    this.id_category = id_category;
    this.bbox = [];
    this.centroids = [];
    this.extent = extent;
    if ( extent == undefined ) {
      this.extent = this.getExtent();
    }
    this.mapLeft = this.extent[0];
    this.mapRight = this.extent[1];
    this.mapBottom = this.extent[2];
    this.mapTop = this.extent[3];
    this.mapWidth = this.extent[1] - this.extent[0];
    this.mapHeight = this.extent[3] - this.extent[2];
    
    this.updateTransf();
    
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
    
    this.mapcanvas.addEventListener('mousemove', this.OnMouseMove, false);
    this.mapcanvas.addEventListener('mousedown', this.OnMouseDown, false);
    this.mapcanvas.addEventListener('mouseup', this.OnMouseUp, false);
    this.mapcanvas.addEventListener('keydown', this.OnKeyDown, true);
    window.addEventListener('keypress', this.OnKeyDown, true);
    window.addEventListener('resize', this.OnResize, true);
    
    this.hbuffer = document.createElement("canvas");
    this.hbuffer.width = this.mapcanvas.width;
    this.hbuffer.height = this.mapcanvas.height;
   
    this.buffer = document.createElement("canvas");
    this.buffer.width = this.mapcanvas.width;
    this.buffer.height = this.mapcanvas.height;
     
    this.draw();
    
    //this.buffer = this.createBuffer(this.mapcanvas);
  };
  
  // multi constructors
  //GeoVizMap.fromComponents = function(geojson_url, canvas) {};
  //GeoVizMap.fromComponents = function(zipfile_url, canvas) {};
  
  // static variable
  GeoVizMap.version = "0.1";
  
  // 
  GeoVizMap.prototype = {
    // member functions
    updateTransf: function() {
      console.log("updateTransf");
      var whRatio = this.mapWidth / this.mapHeight,
          xyRatio = this.width / this.height;
      this.offsetX = 0.0;
      this.offsetY = 0.0; 
      
      if ( xyRatio > whRatio ) {
        this.offsetX = (this.width - this.height * whRatio) / 2.0;
      } else if ( xyRatio < whRatio ) {
        this.offsetY = (this.height - this.width / whRatio) / 2.0;
      }
      
      this.screenWidth = this.width - this.offsetX * 2;
      this.screenHeight =  this.height - this.offsetY * 2;
      this.scaleX = this.screenWidth / this.mapWidth;
      this.scaleY = this.screenHeight / this.mapHeight;
      this.scalePX = this.mapWidth / this.screenWidth;
      this.scalePY = this.mapHeight / this.screenHeight;
    },
    
    updateColor: function(colorbrewer_obj) {
      this.color_theme  = colorbrewer_obj;
      this.draw();
      this.buffer = this.createBuffer(this.mapcanvas);
    },
    
    mapToScreen: function(px,py) {
      var x = this.scaleX * (px-this.mapLeft) + this.offsetX;
      var y = this.scaleY * (this.mapTop-py) + this.offsetY;
      return [x, y];
    },
    
    screenToMap: function(x,y) {
      var px = this.scalePX * (x - this.offsetX) + this.mapLeft;
      var py = this.mapTop - this.scalePY * (y - this.offsetY);
      return [px, py];
    },
    
    getExtent: function() {
      var minX = Number.POSITIVE_INFINITY,
          maxX = Number.NEGATIVE_INFINITY,
          minY = Number.POSITIVE_INFINITY,
          maxY = Number.NEGATIVE_INFINITY;
      this.bbox = [];
      that = this;
      if ( this.shpType == "Polygon" || this.shpType == "MultiPolygon" ) {
        this.geojson.features.forEach(function(feat,i) {
          var bminX = Number.POSITIVE_INFINITY,
              bmaxX = Number.NEGATIVE_INFINITY,
              bminY = Number.POSITIVE_INFINITY,
              bmaxY = Number.NEGATIVE_INFINITY;
          feat.geometry.coordinates.forEach(function(coords,j) {
            coords.forEach( function( xy,k ) {
              x = xy[0], y = xy[1];
              if (x > maxX) {maxX = x;}
              if (x < minX) {minX = x;}
              if (y > maxY) {maxY = y;}
              if (y < minY) {minY = y;}
              if (x > bmaxX) {bmaxX = x;}
              if (x < bminX) {bminX = x;}
              if (y > bmaxY) {bmaxY = y;}
              if (y < bminY) {bminY = y;}
            });
          });
          that.bbox.push([bminX, bmaxX, bminY, bmaxY]);
          that.centroids.push([bminX + ((bmaxX - bminX)/2.0), bminY + ((bmaxY - bminY)/2.0)]);
        });
      } else if ( this.shpType == "Point" || this.shpType == "MultiPoint" ) {
        this.geojson.features.forEach(function(feat,i) {
          var xy = feat.geometry.coordinates, 
              x = xy[0], y = xy[1],
              bminX = x, bmaxX = x,
              bminY = y, bmaxY = y;
          if (x > maxX) {maxX = x;}
          if (x < minX) {minX = x;}
          if (y > maxY) {maxY = y;}
          if (y < minY) {minY = y;}
          that.bbox.push([x, x, y, y]);
          that.centroids.push([x, y]);
        });
      } else if ( this.shpType == "LineString" || this.shpType == "Line" ) {
        this.geojson.features.forEach(function(feat,i) {
          var bminX = Number.POSITIVE_INFINITY,
              bmaxX = Number.NEGATIVE_INFINITY,
              bminY = Number.POSITIVE_INFINITY,
              bmaxY = Number.NEGATIVE_INFINITY;
          var l = feat.geometry.coordinates;
          if (l[0][0] instanceof Array) {
            // multi-lines
            for (var i=0, n=l.length; i < n; i++) {
              var sl = l[i];
              for (var j=0, m=sl.length; j < m; j++) {
                var x = sl[j][0],
                    y = sl[j][1];
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
          } else {
            for (var j=0, m=l.length; j < m; j++) {
              var x = l[j][0],
                  y = l[j][1];
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
          that.bbox.push([bminX, bmaxX, bminY, bmaxY]);
          that.centroids.push([bminX + ((bmaxX - bminX)/2.0), bminY + ((bmaxY - bminY)/2.0)]);
        });
      }
      return [minX, maxX, minY, maxY];
    },
  
    // create buffer canvas
    createBuffer: function() {
      var _buffer = document.createElement("canvas");
      _buffer.width = this.mapcanvas.width;
      _buffer.height = this.mapcanvas.height;
      var bufferCtx = _buffer.getContext("2d");
      bufferCtx.drawImage(this.mapcanvas, 0, 0);
  
      return _buffer;
    },
  
    highlight: function( ids, nolinking ) {
      context = _self.mapcanvas.getContext("2d");
      context.clearRect(0, 0, _self.width, _self.height);
      context.drawImage( _self.buffer, 0, 0);
      context.lineWidth = 1;
      context.strokeStyle = _self.HLT_BRD_CLR;
      context.fillStyle = _self.HLT_CLR;
      
      ids.forEach( function( id) {
        if (_self.shpType == "Polygon" || _self.shpType == "MultiPolygon") {
          _self.drawPolygon( context, _self.geojson.features[id] );
        } else if (_self.shpType == "Point" || _self.shpType == "MultiPoint") {
          _self.drawPoint( context, _self.geojson.features[id] );
        } else if (_self.shpType == "LineString" || _self.shpType == "Line") {
          _self.drawLine( context, _self.geojson.features[id] );
        }
      });
      if (nolinking == undefined) {
        localStorage["HL_LAYER"] = _self.mapcanvas.id;
        localStorage["HL_IDS"] = ids.toString();
      }
      return context;
    },
    
    drawSelect: function( context, ids, strokeColor, fillColor ) {
      context.strokeStyle = strokeColor==undefined ? _self.STROKE_CLR:strokeColor;
      context.fillStyle = fillColor==undefined ? _self.HLT_CLR:fillColor;
      
      ids.forEach( function( id) {
        if (_self.shpType == "Polygon" || _self.shpType == "MultiPolygon") {
          _self.drawPolygon( context, _self.geojson.features[id] );
        } else if (_self.shpType == "Point" || _self.shpType == "MultiPoint") {
          _self.drawPoint( context, _self.geojson.features[id] );
        } else if (_self.shpType == "LineString" || _self.shpType == "Line") {
          _self.drawLine( context, _self.geojson.features[id] );
        }
      });
    },
    
    drawPolygons: function(ctx, polygons, hctx) {
      var screen_plgs = [];
      for (var i=0, n=polygons.length; i<n; i++) {
        var plg = polygons[i]; 
        var screen_plg = [];
        var nParts = plg.geometry.coordinates.length;
        for ( var j=0; j < nParts; j++ ) { 
          var m = plg.geometry.coordinates[j].length;
          for ( var k=0; k < m; k++ ) { 
            var x = plg.geometry.coordinates[j][k][0], 
                y = plg.geometry.coordinates[j][k][1];
            x = this.scaleX * (x-this.mapLeft) + this.offsetX;
            y = this.scaleY * (this.mapTop-y) + this.offsetY;
            screen_plg.push([x,y]); 
          }
          screen_plgs.push(screen_plg);
        }
      } 
      
      for (var i=0, n=screen_plgs.length; i<n; i++) {
        ctx.beginPath();
        ctx.moveTo(screen_plgs[i][0][0], screen_plgs[i][0][1]);
        for ( var j=1, m=screen_plgs[i].length; j < m; j++ ) { 
          ctx.lineTo(screen_plgs[i][j][0], screen_plgs[i][j][1]);
        }
        ctx.stroke();
        ctx.fill();
      } 
      setTimeout(function(){
        if(hctx != undefined) {    
          hctx.strokeStyle = this.HLT_BRD_CLR;
          hctx.fillStyle = this.HLT_CLR;
          for (var i=0, n=screen_plgs.length; i<n; i++) {
            hctx.beginPath();
            hctx.moveTo(screen_plgs[i][0][0], screen_plgs[i][0][1]);
            for ( var j=1, m=screen_plgs[i].length; j < m; j++ ) { 
              hctx.lineTo(screen_plgs[i][j][0], screen_plgs[i][j][1]);
            }
            hctx.stroke();
            hctx.fill();
          } 
        }
      },1);
    },
    drawPolygon: function( ctx, plg, stk_clr, fill_clr) {
      //if (plg) {
        var screen_plgs = [];
        var nParts = plg.geometry.coordinates.length;
        for ( var j=0; j < nParts; j++ ) { 
          var screen_plg = [];
          var m = plg.geometry.coordinates[j].length;
          for ( var k=0; k < m; k++ ) { 
            var x = plg.geometry.coordinates[j][k][0], 
                y = plg.geometry.coordinates[j][k][1];
            x = this.scaleX * (x-this.mapLeft) + this.offsetX;
            y = this.scaleY * (this.mapTop-y) + this.offsetY;
            screen_plg.push([x,y]); 
          }
          screen_plgs.push(screen_plg);
        }
                
        ctx.beginPath();
        for ( var i=0, n = screen_plgs.length; i < n; i++ ) {
          var screen_plg = screen_plgs[i];
          ctx.moveTo(screen_plg[0][0], screen_plg[0][1]);
          for ( var j=1, m= screen_plg.length; j < m; j++ ){ 
            ctx.lineTo(screen_plg[j][0], screen_plg[j][1]);
          }
          if ( stk_clr ) ctx.strokeStyle = stk_clr;
          ctx.stroke();
          if ( fill_clr ) ctx.fillStyle = fill_clr;
          ctx.fill();
        }
        
      //}
    },
    
    drawLine: function( ctx, ln, stk_clr, fill_clr ) {
      var line = ln.geometry.coordinates;
      var lines = [];
      if (line[0][0] instanceof Array) {
        // multi-lines
        for (var i=0,n=line.length; i < n; i++) {
          lines.push(line[i]);
        }
      }  else {
        lines.push(line);
      }
      for (var i=0, n=lines.length; i < n; i++) {
        var l = lines[i],
            x = l[0][0],
            y = l[0][1];
        var pxy = _self.mapToScreen(x,y);
        x = pxy[0];
        y = pxy[1];
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (var j=1, m=l.length; j < m; j++) {
          x = l[j][0],
          y = l[j][1];
          var pxy = _self.mapToScreen(x,y);
          x = pxy[0];
          y = pxy[1];
          ctx.lineTo(x, y);
        }
        if ( stk_clr ) ctx.strokeStyle = stk_clr;
        ctx.stroke();
      }
    },
    
    drawPoint: function( ctx, pt, stk_clr, fill_clr) {
      var xy = pt.geometry.coordinates,
          x = xy[0],
          y = xy[1];
        var pxy = _self.mapToScreen(x,y);
        x = pxy[0];
        y = pxy[1];
        ctx.fillRect(x, y, 2, 2);
    },
    
    draw: function() {
      var context = this.buffer.getContext("2d");
      context.imageSmoothingEnabled= false;
      context.lineWidth = this.LINE_WIDTH;
      context.strokeStyle = this.STROKE_CLR;
      context.fillStyle = this.FILL_CLR;
     
      var hcontext = this.hbuffer.getContext("2d");
      hcontext.imageSmoothingEnabled= false;
      hcontext.lineWidth = this.LINE_WIDTH;
      hcontext.strokeStyle = this.HLT_BRD_CLR;
      hcontext.fillStyle = this.HLT_CLR;
      
      if (this.color_theme == undefined) {
        var that = this;
        if (this.shpType == "Polygon") {
          that.drawPolygons( context, this.geojson.features, hcontext);
        } else if (this.shpType == "Point" || this.shpType == "MultiPoint") {
          this.geojson.features.forEach( function(feat,i) {
            that.drawPoint( context, feat, that.STROKE_CLR, that.FILL_CLR );
            that.drawPoint( hcontext, feat, that.HLT_CLR, that.HLT_CLR);
          });
        } else if (this.shpType == "Line" || this.shpType == "LineString") {
          this.geojson.features.forEach( function(feat,i) {
            that.drawLine( context, feat, that.STROKE_CLR, that.FILL_CLR );
            that.drawLine( hcontext, feat, that.HLT_CLR, that.HLT_CLR);
          });
        }
      } else {
        var that = this;
        for (var i=0, n= that.color_theme.length; i < n; i++) {
          var color = that.color_theme[i];
          for (var j=0, m=that.id_category[i].length; j < m; j++) {
            var id = that.id_category[i][j],
                feat = that.geojson.features[id];
            if (that.shpType == "Polygon") {
              that.drawPolygon(context, feat, that.STROKE_CLR, color);
            } else if (this.shpType == "Point" || this.shpType == "MultiPoint") {
              that.drawPoint( context, feat, that.STROKE_CLR, color);
            } else if (this.shpType == "Line" || this.shpType == "LineString") {
              that.drawLine( context, feat, that.STROKE_CLR, color);
            }
          }
        }
      }
      
      var screenContext = this.mapcanvas.getContext("2d");
      screenContext.drawImage( this.buffer, 0, 0);
    }, 
    
    // register mouse events of canvas
    OnResize: function( e) {
      _self.width = window.innerWidth * 0.8;//mapcanvas.width;
      _self.height = window.innerHeight * 0.8; //mapcanvas.height;
      _self.mapcanvas.width = _self.width;
      _self.mapcanvas.height = _self.height;
      _self.updateTransf();
      _self.draw();
      console.log("OnResize");
      _self.buffer = _self.createBuffer(_self.mapcanvas);
    },
    OnKeyDown: function( e ) {
      if ( e.keyCode == 115 ) {
        _self.isKeyDown = true;
      }
    },
    OnMouseDown: function( evt ) {
      //var x = evt.pageX, y = evt.pageY;
      var x = evt.offsetX, y = evt.offsetY;
      _self.isMouseDown = true;
      _self.startX = x;
      _self.startY = y;
      console.log("isKeyDown:", _self.isKeyDown);
      console.log("brushRect:", _self.brushRect);
      if ( _self.isKeyDown == true ) {
        if (_self.brushRect && _self.brushRect.Contains(new GPoint(x, y)) ) {
          console.log("brushing");
          _self.isBrushing = true;
        }
      }
      if (_self.brushRect == undefined ||
          _self.brushRect && !_self.brushRect.Contains(new GPoint(x, y)) ) {
        console.log("cancel brushing");
        var context = _self.mapcanvas.getContext("2d");
        context.clearRect(0, 0, _self.width, _self.height);
        context.drawImage( _self.buffer, 0, 0);
        _self.brushRect = undefined;
        _self.isBrushing = false;
      }
    },
    OnMouseMove: function(evt) {
      var x = evt.offsetX, y = evt.offsetY;
      var startX, 
          startY;
          
      if ( _self.isMouseDown == true ) {
        var context;
        if ( _self.isBrushing == true ) {
          var offsetX = x - _self.startX,
              offsetY = y - _self.startY;
          startX = _self.brushRect.x0 + offsetX;
          startY = _self.brushRect.y0 + offsetY;
        } else {
          startX = _self.startX;
          startY = _self.startY;
        }
        // highlight selection
        var pt0 = _self.screenToMap(startX, startY), 
            pt1;
        if ( _self.isBrushing == true ) {
          pt1 = _self.screenToMap(startX + _self.brushRect.GetW(), 
                                  startY + _self.brushRect.GetH());
        } else {
          pt1 = _self.screenToMap(x,y);
        } 
        
        var x0 = pt0[0] <= pt1[0] ? pt0[0] : pt1[0];
        var x1 = pt0[0] > pt1[0] ? pt0[0] : pt1[0];
        var y0 = pt0[1] <= pt1[1] ? pt0[1] : pt1[1];
        var y1 = pt0[1] > pt1[1] ? pt0[1] : pt1[1];
        var hdraw= [];
        var ddraw = []; 
        if ( x == _self.startX && y == _self.startY ) {
        } else {
          var minPX = Math.min( pt0[0], pt1[0]),
              maxPX = Math.max( pt0[0], pt1[0]),
              minPY = Math.min( pt0[1], pt1[1]),
              maxPY = Math.max( pt0[1], pt1[1]);
          _self.selected = [];
          _self.centroids.forEach( function( pt, i ) {
            var inside = false;
            if ( pt[0] >= minPX && pt[0] <= maxPX && 
                 pt[1] >= minPY && pt[1] <= maxPY) {
              _self.selected.push(i);
              inside = true;
            }
            // fine polygons on border of rect
            var bx = _self.bbox[i]; 
            if (bx[0] > x1 || bx[1] < x0 || bx[2] > y1 || bx[3] < y0) {
            } else if (x0 < bx[0] && bx[1] < x1 && y0 < bx[2] && bx[3] < y1) {
            } else {
              if (inside) {
                // draw it with highligh
                hdraw.push(i);
              } else {
                // draw it with default
                ddraw.push(i);
              }
            }
          });
          //context = _self.highlight(ddraw);
        }
        context = _self.mapcanvas.getContext("2d");
        context.clearRect(0, 0, _self.width, _self.height);
        context.drawImage( _self.buffer, 0, 0);
        context.save();
        // draw a selection box
        context.beginPath();
        if ( _self.isBrushing == true ) {
          context.rect(startX, startY, 
                       _self.brushRect.GetW(), _self.brushRect.GetH());
        } else {
          var w = x - startX, 
              h = y - startY;
          context.rect( startX, startY, w, h);
        }
        context.closePath();
       
        context.clip();
        
        context.drawImage( _self.hbuffer, 0, 0);
        context.restore();
        console.log(hdraw.length);
        _self.drawSelect(context, hdraw, _self.HLT_BRD_CLR, _self.HLT_CLR);
        _self.drawSelect(context, ddraw, _self.STROKE_CLR, _self.FILL_CLR);
        
        context.beginPath();
        context.rect( startX, startY, w, h);
        context.strokeStyle = "black";
        context.stroke();
        context.closePath();
      }
    },
    OnMouseUp: function(evt) {
      //var x = evt.pageX, y = evt.pageY;
      var x = evt.offsetX, y = evt.offsetY;
      if ( _self.isMouseDown == true) {
        if ( _self.startX == x && _self.startY == y ) {
          // point select
          var pt = _self.screenToMap(x, y);
          x = pt[0];
          y = pt[1];
          _self.bbox.forEach( function( box, i ) {
            if ( x > box[0] && x < box[1] && 
                 y > box[2] && y < box[3] ) {
              _self.highlight([i]);
              _self.isMouseDown = false;
              return;
            }
          });
        }
        else if ( _self.isKeyDown == true ) {
          // setup brushing box
          _self.brushRect = new GRect( _self.startX, _self.startY, x, y);
        }
      }
      _self.isMouseDown = false;
    },
    
  };
  
  window["GeoVizMap"] = GeoVizMap;
})(self);
