

define(function(){

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
  this.shpType = this.map.shpType.toUpperCase(); 
  
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
      var screenObjs = this.map.shapes; 
      var colors = {};
      //colors["rgba(255,255,0,0.7)"] = ids;
      var imageObj = new Image();
      imageObj.onload = function() {
        var fillPattern = ctx.createPattern(imageObj,'repeat'); 
        ctx.strokeColor = "#000000";
        ctx.lineWidth = 1;
        var colors = {};
        colors['dummy'] = ids;
        if (this.shpType == "POLYGON" || this.shpType == "MULTIPOLYGON") {
          ctx.fillStyle = fillPattern;
          this.drawPolygons( ctx, screenObjs, colors);
        } else if (this.shpType == "POINT" || this.shpType == "MULTIPOINT") {
          ctx.fillStyle = fillPattern;
          this.drawPoints( ctx, screenObjs, colors );
        } else if (this.shpType == "LINESTRING" || this.shpType == "LINE") {
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
 
  drawArcs : function(ctx, arcs)  {
    var cnt = 0,
        x, y,
        iter, arcs, arcId;
    for (var i=0, n=arcs.length; i<n; i++) {
      arcId = arcs[i];
      iter = this.map.arcs.getArcIter(arcId);
      while (iter.hasNext()) {
        if (cnt === 0) {
          x = iter.x;
          y = iter.y;
          ctx.moveTo(x, y);
        } else {
          if ( x !== iter.x || y !== iter.y ) {
            ctx.lineTo(x, y);
            x = iter.x;
            y = iter.y;
          }
        }
        cnt++;
      }
    }
  },
  
  drawLines: function( ctx, lines, colors ) {
    if ( lines == undefined || lines.length == 0 )
      return;
    var arcs, arc, parts;
    if ( colors == undefined ) { 
      ctx.beginPath();
      for (var i=0, n=lines.length; i<n; i++) {
        parts = lines[i];
        for (var j=0,m=parts.length; j<m;j++) {
          arcs = parts[j];
          this.drawArcs( ctx, arcs);
        }
      }
      if (this.shpType === "POLYGON") ctx.fill();
      ctx.stroke();
    } else {
      var ids;
      for ( var c in colors ) {
        ids = colors[c];
        ctx.strokeStyle = c;
        
        for ( var i=0, n=ids.length; i< n; ++i) {
          ctx.beginPath();
          parts = lines[ids[i]];
          
          for (var i=0,n=parts.length; i<n;i++) {
            arcs = parts[i];
            this.drawArc(ctx, arcs);
          }
          if (this.shpType === "POLYGON") ctx.fill();
          ctx.stroke();
        }
      }
    }  
  },
  
  drawPoints: function( ctx, points, colors ) {
    var end = 2*Math.PI,
        draw_dict = {},
        part, pt;
    
    if ( colors == undefined ) { 
      for ( var i=0, n=points.length; i<n; i++ ) {
        part = points[i];
        for (var j=0, m=part.length; j<m; j++) {
          //ctx.fillRect(pt[0], pt[1], 3, 3);
          pt = part[0];
          if (draw_dict[pt] === undefined) {
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], 2, 0, end, true);
            ctx.stroke();
            ctx.fill();
            draw_dict[pt] = null;
          }
        }
      } 
    } else {
      for ( var c in colors ) {
        ctx.fillStyle = c;
        var ids = colors[c];
        for ( var i=0, n=ids.length; i< n; ++i) {
          part = points[ids[i]];
          for (var j=0, m=part.length; j<m; j++) {
            //ctx.fillRect(pt[0], pt[1], 3, 3);
            pt = part[0];
            if (draw_dict[pt] === undefined) {
              //ctx.fillRect(pt[0], pt[1], 3, 3);
              ctx.beginPath();
              ctx.arc(pt[0], pt[1], 2, 0, end, true);
              ctx.stroke();
              ctx.fill();
            }
          }
        } 
      }
    } 
    
  },
  
  draw: function(ctx,  colors, fillColor, strokeColor, lineWidth) {
    ctx.imageSmoothingEnabled= false;
    ctx.lineWidth = this.STROKE_WIDTH;
    ctx.globalAlpha = this.ALPHA;
    var shpType = this.shpType,
        map = this.map;
    
    if (shpType === "POLYLINE" || shpType === "LINESTRING" || shpType === "LINE") {
      ctx.strokeStyle = fillColor ? fillColor : this.FILL_CLR;
      ctx.lineWidth = lineWidth ? lineWidth: this.STROKE_WIDTH;
      
    } else if (shpType === "POLYGON" || shpType === "MULTIPOLYGON") {
      ctx.strokeStyle = strokeColor ? strokeColor : this.STROKE_CLR;
      ctx.fillStyle = fillColor ? fillColor : this.FILL_CLR;
      
    } else {
      ctx.strokeStyle = strokeColor ? strokeColor : this.STROKE_CLR;
      ctx.fillStyle = fillColor ? fillColor : this.FILL_CLR;
      
    }
    
    if (shpType === "POLYGON" || shpType === "MULTIPOLYGON" ) {
      this.drawLines( ctx, map.shapes, colors) ;
      
    } else if (shpType === "POINT" || shpType === "MULTIPOINT") {
      if ( this.heatmap == true) {
        // test heatmap
        var hm = new Canvas2dRenderer(this.buffer);
        hm.renderAll(map.shapes);
        this.heatmap = false;
      }
      this.drawPoints( ctx, map.shapes, colors) ;
      
    } else if (shpType === "POLYLINE" || shpType === "LINE" || shpType === "LINESTRING") {
      this.drawLines( ctx, map.shapes, colors) ;
      
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
    var screenObjs = this.map.shapes; 
    if (this.shpType == "POLYGON" || this.shpType == "MULTIPOLYGON") {
      this.drawPolygons( ctx, screenObjs, colors);
    } else if (this.shpType == "POINT" || this.shpType == "MULTIPOINT") {
      this.drawPoints( ctx, screenObjs, colors );
    } else if (this.shpType == "LINESTRING" || this.shpType == "LINE") {
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
    if (!window.gViz) return;
    
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
    if (!window.gViz) return;
    
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
    if (!window.gViz) return;
    
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


return MapCanvas;

});