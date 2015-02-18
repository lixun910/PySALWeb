
// Author: xunli at asu.edu

define(function(){

var shapes = function() {
  this.points;
};

var GeoJSON = function(name, json, prj) {
  this.name = name;
  this.json = json;
  this.n = this.json.features.length;
  this.shpType = this.json.features[0].geometry.type.toUpperCase();
  this.bbox = [];
  this.centroids = [];
  this.prj = prj;
  this.extent = null;
  
  this.points = [];
  this.pt_dict = {};
  this.arcs = [];
  this.arc_dict = {};
  this.shapes = [];
 
  this.nn = 0; 
  this.aa = 0;
  this.init();
};

GeoJSON.translateGeoJSONType = function(type) {
  return GeoJSON.typeLookup[type] || null;
};

GeoJSON.typeLookup = {
  LineString: 'polyline',
  MultiLineString: 'polyline',
  Polygon: 'polygon',
  MultiPolygon: 'polygon',
  Point: 'point',
  MultiPoint: 'point'
};

GeoJSON.prototype = {

  addPoint : function(x, y) {
    if (this.pt_dict[x]) {
      if (this.pt_dict[x][y]) {
        return this.pt_dict[x][y];
      }
    }
    this.pt_dict[x] = {}
    this.points.push([x,y]);
    this.pt_dict[x][y] = this.nn;
    return this.nn++;   
  },
  
  addArc : function(arc) {
    if (this.arc_dict[arc]) {
      return this.arc_dict[arc];
    }
    this.arcs.push(arc);
    this.arc_dict[arc] = this.aa;
    return this.aa++;
  },
  
  init: function() {
  
    // get extent, bbox, centroids
    var minX = Number.POSITIVE_INFINITY,
        maxX = Number.NEGATIVE_INFINITY,
        minY = Number.POSITIVE_INFINITY,
        maxY = Number.NEGATIVE_INFINITY;
     
    for ( var i=0; i<this.n; i++ ) {
      var bminX = Number.POSITIVE_INFINITY,
          bmaxX = Number.NEGATIVE_INFINITY,
          bminY = Number.POSITIVE_INFINITY,
          bmaxY = Number.NEGATIVE_INFINITY,
          geom = this.json.features[i].geometry,
          x, y, part, projPt, ptIdx, arcIdx;
        
      var arcs, arc; 
      
      if (geom.type === "MultiLineString" || geom.type === "MultiPolygon") {
        arcs = [];
        for (var j=0, nParts=geom.coordinates.length; j<nParts; j++ ) {
          arc = [];
          part = geom.coordinates[j];
          for (var k=0, nPoints=part.length; k<nPoints; k++) {
            x = part[k][0];
            y = part[k][1];
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
            ptIdx = this.addPoint(x, y);
            arc.push(ptIdx);
          }
          arcIdx = this.addArc(arc);
          arcs.push(arcIdx);
        }
        this.shapes.push(arcs);
        
      } else if (geom.type === "LineString" || geom.type === "Polygon" ||
                 geom.type === "MultiPoint") {
        arc = [];
        for (var k=0, nPoints=geom.coordinates.length; k < nPoints; k++ ) {
          x = geom.coordinates[k][0];
          y = geom.coordinates[k][1];
          if (this.prj) {
            projPt = this.prj.forward([x, y]);
            x = projPt[0];
            y = projPt[1];
            geom.coordinates[k][0] = x;
            geom.coordinates[k][1] = y;
          }
          if (x > maxX) {maxX = x;}
          if (x < minX) {minX = x;}
          if (y > maxY) {maxY = y;}
          if (y < minY) {minY = y;}
          if (x > bmaxX) {bmaxX = x;}
          if (x < bminX) {bminX = x;}
          if (y > bmaxY) {bmaxY = y;}
          if (y < bminY) {bminY = y;}
          ptIdx = this.addPoint(x, y);
          arc.push(ptIdx);
        }
        arcIdx = this.addArc(arc);
        this.shapes.push(arcIdx);
        
      } else if (geom.type === "Point") {
          x = geom.coordinates[0];
          y = geom.coordinates[1];
          if (this.prj) {
            projPt = this.prj.forward([x, y]);
            x = projPt[0];
            y = projPt[1];
            geom.coordinates[0] = x;
            geom.coordinates[1] = y;
          }
          if (x > maxX) {maxX = x;}
          if (x < minX) {minX = x;}
          if (y > maxY) {maxY = y;}
          if (y < minY) {minY = y;}
          if (x > bmaxX) {bmaxX = x;}
          if (x < bminX) {bminX = x;}
          if (y > bmaxY) {bmaxY = y;}
          if (y < bminY) {bminY = y;}
          
          ptIdx = this.addPoint(x, y);
          this.shapes.push(ptIdx);
      } 
      
      if ( this.shpType == "Polygon" || this.shpType == "MultiPolygon" ||
           this.shpType == "LineString" || this.shpType == "Line" ) {
        this.bbox.push([bminX, bmaxX, bminY, bmaxY]);
        this.centroids.push([(bmaxX + bminX)/2.0, (bmaxY + bminY)/2.0]);
      } else {
        this.bbox.push([x, x, y, y]);
        this.centroids.push([x, y]);
      }
    }
    this.extent = [minX, maxX, minY, maxY];
  },
  
};

return GeoJSON;

}); // end define



