
// Author: xunli at asu.edu
// Note: The source code in this file is modified from mapshaper.org. Please 
// refer the license in www.mapshaper.org.
// The credit will goes to www.mapshaper.org
define(['./geojson'], function(GeoJSON){

var TopoJSON =  {};

TopoJSON.decodeArcs = function(arcs, transform) {
  var mx = transform.scale[0],
      my = transform.scale[1],
      bx = transform.translate[0],
      by = transform.translate[1];

  for (var i=0, n=arcs.length; i < n; i++) {
    var arc = arcs[i],
        prevX = 0,
        prevY = 0,
        xy, x, y;
    for (var j=0, len=arc.length; j<len; j++) {
      xy = arc[j];
      x = xy[0] + prevX;
      y = xy[1] + prevY;
      xy[0] = x * mx + bx;
      xy[1] = y * my + by;
      prevX = x;
      prevY = y;
    }
  }
};

TopoJSON.importObject = function(obj, opts) {
  if (obj.type != 'GeometryCollection') {
    obj = {
      type: "GeometryCollection",
      geometries: [obj]
    };
  }
  return TopoJSON.importGeometryCollection(obj, opts);
};

TopoJSON.importGeometryCollection = function(obj, opts) {
  var importer = new TopoJSON.GeometryImporter(opts);
  for (var i=0, n=obj.geometries.length; i < n; i++) {
    var geom = obj.geometries[i];
    importer.addGeometry(geom);
  }
  return importer.done();
};


TopoJSON.GeometryImporter = function(opts) {
  var idField = opts && opts.id_field || null,
      properties = [],
      shapes = [], // topological ids
      collectionType = null;

  this.addGeometry = function(geom) {
    var type = GeoJSON.translateGeoJSONType(geom.type),
        shapeId = shapes.length,
        rec;
    this.updateCollectionType(type);

    if (idField || geom.properties) {
      rec = geom.properties || {};
      if (idField) {
        rec[idField] = geom.id || null;
      }
      properties[shapeId] = rec;
    }

    var shape = null;
    if (type == 'point') {
      shape = this.importPointGeometry(geom);
    } else if (geom.type in TopoJSON.pathImporters) {
      shape = TopoJSON.pathImporters[geom.type](geom.arcs);
    } else {
      if (geom.type) {
        console.log("[TopoJSON] Unknown geometry type:", geom.type);
      }
      // null geometry -- ok
    }
    shapes.push(shape);
  };

  this.importPointGeometry = function(geom) {
    var shape = null;
    if (geom.type == 'Point') {
      shape = [geom.coordinates];
    } else if (geom.type == 'MultiPoint') {
      shape = geom.coordinates;
    } else {
      console.log("Invalid TopoJSON point geometry:", geom);
    }
    return shape;
  };

  this.updateCollectionType = function(type) {
    if (!collectionType) {
      collectionType = type;
    } else if (type && collectionType != type) {
      collectionType = 'mixed';
    }
  };

  this.done = function() {
    var lyr = {
      shapes: shapes,
      geometry_type: collectionType
    };
    if (properties.length > 0) {
      //lyr.data = new DataTable(properties);
    }
    // console.log(lyr.shapes)
    return lyr;
  };
};

TopoJSON.pathImporters = {
  LineString: function(arcs) {
    return [arcs];
  },
  MultiLineString: function(arcs) {
    return arcs;
  },
  Polygon: function(arcs) {
    return arcs;
  },
  MultiPolygon: function(arcs) {
    var len = arcs && arcs.length || 0,
        result = [];
    for (var i=0; i<len; i++) {
      var arr = arcs[i];
      for (var j=0, n=arr.length; j<n; j++) {
        result.push(arr[j]);
      }
    }
    return result;
  }
};

return TopoJSON;

}); // end define