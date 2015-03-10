// Author: xunli at asu.edu

define( ["mapshaper","rtree"], function(mapshaper, RTree) {


var ShapeMap = function(fname, content, prj, basemap) {

  var opts = {
    files: [fname],
    precision: 0,
    auto_snap: false,
    presimplify: false,
    //prettify: false,
    //output_file: "output.json",
  };

  var type = mapshaper.MapShaper.guessFileType(fname);
  
  var dataset = mapshaper.MapShaper.importFileContent(content, type, opts);

  this.arcs = dataset.arcs;
  this.info = dataset.info;
  this.layer = dataset.layers[0];
  
  this.name = this.info.input_files[0];
  this.shpType = this.layer.geometry_type;
  this.shapes = this.layer.shapes;
  this.n = this.shapes.length;

  this.fields = {};
  
  // apply projection if specified 
  this.prj = prj;  
  this.applyProjection(prj);
 
  if (this.arcs) {
    // save raw data 
    this.rawArcs = this.arcs.getCopy();
    this.rawData = this.rawArcs.getVertexData();
  } else {
    // points data
    this.rawData = this.copyPoints(this.shapes);
  }
  
  // get extent
  this.extent = mapshaper.MapShaper.getLayerBounds(this.layer, this.arcs); 
  this.bbox = [];
  this.centroids = [];
  this.setExtent();

  this.basemap = basemap;
  this.LL = basemap.GetL();
  this.Lmap = basemap.GetLmap();
  if ( this.Lmap) {
    this.Lmap.fitBounds([[this.mapBottom,this.mapLeft],[this.mapTop,this.mapRight]]);
  }
  
  this.screenWidth = null;
  this.screenHeight = null;
  this.screenObjects = [];
  
};

ShapeMap.prototype = {

  createRTree : function() {
    if (this.arcs) {
      var rt = new RTree(10);
      var parts, arcs, arcId, offs;      
      var bb = this.rawData.bb;
      var nn = this.rawData.nn;
      
      for (var i=0; i< this.n; i++) {
        parts = this.shapes[i];
        var minX = Number.POSITIVE_INFINITY,
            maxX = Number.NEGATIVE_INFINITY,
            minY = Number.POSITIVE_INFINITY,
            maxY = Number.NEGATIVE_INFINITY;
        for (var j=0, m=parts.length; j<m; j++) {
          arcs = parts[j];
          for (var k=0, nn=arcs.length; k<nn; k++) {
            arcId = arcs[k];
            if (arcId <0 ) arcId = ~arcId;
            offs = arcId * 4;
            if (bb[offs] < minX) {minX = bb[offs];}
            if (bb[offs+1] < minY) {minY = bb[offs+1];}
            if (bb[offs+2] > maxX) {maxX = bb[offs+2];}
            if (bb[offs+3] > maxY) {maxY = bb[offs+3];}
          }
        }
        rt.insert({x:minX, y:minY, w:maxX -minX, h:maxY - minY},i);
      }
      this.rtree = rt;
    }
  },
  
  copyPoints : function(ptShapes) {
    var rawData = [];
    for (var i=0; i<this.n; i++) {
      rawData[i] = [];
      for (var j=0, m=ptShapes[i].length; j<m; j++) {
        rawData[i].push(ptShapes[i][j].slice());
      }
    }
    return rawData;
  },
  
  setExtent : function() {
    this.mapLeft = this.extent.xmin;
    this.mapRight = this.extent.xmax;
    this.mapBottom = this.extent.ymin;
    this.mapTop = this.extent.ymax;
    this.mapWidth = this.mapRight - this.mapLeft;
    this.mapHeight = this.mapTop - this.mapBottom;
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
  
  applyProjection : function(prj) {
    if (prj) {
      if (this.arcs) {
        var rawData = this.arcs.getVertexData(),
            xx = rawData.xx,
            yy = rawData.yy,
            n = xx.length,
            pt;
        for (var i=0; i<n; i++) {
          pt = prj.forward([xx[i], yy[i]]);
          xx[i] = pt[0];
          yy[i] = pt[1];
        }
      } else {
        // point dataset
        var points = this.shapes,
            parts, pt, _pt;
        for (var i=0, n=points.length; i<n; i++) {
          parts = points[i];
          for (var j=0, m=parts.length; j<m; j++) {
            pt = parts[j];
            _pt = prj.forward(pt);
            pt[0] = _pt[0];
            pt[1] = _pt[1];
          }
        }
      }
    } 
  },
  
  fitScreen : function(screenWidth, screenHeight, 
                       marginLeft, marginTop, 
                       moveX, moveY) {
    if (screenWidth === this.screenWidth && screenHeight === this.screenHeight) 
      return;
    
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    
    // not used  in leaflet map
    if (moveX) 
      this.moveX = moveX;
    if (moveY) 
      this.moveY = moveY;
    if (!marginLeft) 
      marginLeft = 0;
    if (!marginTop) 
      marginTop = 0;
    
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
    
    this.compoX = this.scalePX * this.offsetX - this.mapLeft;
    this.compoY = this.mapTop + this.scalePY * this.offsetY; 
    this.RcompoX = this.scaleX * this.mapLeft - this.offsetX;
    this.RcompoY = this.scaleY * this.mapTop + this.offsetY; 
    
    this.latlon2Points(); 
  },
  
  latlon2Points : function() {
    if (this.arcs) {
      var vertices = this.arcs.getVertexData();
      
      if (this.rawData.xx[0] !== vertices.xx[0] ||
          this.rawData.yy[0] !== vertices.yy[0] ) {
      
        var origArcs = this.rawArcs.getCopy(),
            origData = origArcs.getVertexData();
        vertices = origData;
      }
      
      var xx = vertices.xx,
          yy = vertices.yy,
          n  = xx.length, 
          pt;
          
      for (var i=0; i<n; i++)  {
        pt = this.mapToScreen(xx[i], yy[i]);
        xx[i] = pt[0] | 0;
        yy[i] = pt[1] | 0;
      }
    } else {
      var pt;
      
      if (this.rawData[0][0][0] !== this.shapes[0][0][0] ||
          this.rawData[0][0][1] !== this.shapes[0][0][1]) {
        this.shapes = this.copyPoints(this.rawData);
      }
      
      for (var i=0; i < this.n; i++) {
        for (var j=0, m=this.shapes[i].length; j<m; j++) {
          pt = this.mapToScreen(this.shapes[i][j][0], this.shapes[i][j][1]);
          this.shapes[i][j][0] = pt[0] | 0;
          this.shapes[i][j][1] = pt[1] | 0;
        }
      }
    }
  },
  
  screenToMap : function(px, py) {
    var x, y;
    if (!this.basemap.IsHide() && this.LL) {
      var pt = this.Lmap.containerPointToLatLng(new this.LL.point(px,py));
      x = pt.lng;
      y = pt.lat;
    } else {
      x = this.scalePX * (px - this.offsetX) + this.mapLeft;
      y = this.mapTop - this.scalePY * (py - this.offsetY);
      //x = this.scalePX * px - this.compoX;
      //y = this.compoY - this.scalePY * py;
    }
    return [x, y];
  },
  
  mapToScreen : function(x, y) {
    var px, py;
    if (!this.basemap.IsHide() && this.LL) {
      var pt = this.Lmap.latLngToContainerPoint(new this.LL.LatLng(y,x));
      px = pt.x;
      py = pt.y;
    } else {
      px = this.scaleX * (x - this.mapLeft) + this.offsetX;
      py = this.scaleY * (this.mapTop - y) + this.offsetY;
      //px = this.scaleX * x - this.RcompoX;
      //py = this.RcompoY - this.scaleY * y;
    }
    return [px, py];
  },
  
};

return ShapeMap;

}); // end define
