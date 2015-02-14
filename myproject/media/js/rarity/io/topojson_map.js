// Author: xunli at asu.edu

define( ["./topology"], function(TopoJSON) {

var TopoJsonMap = function(name, topology, LL, Lmap, prj) {
  // "type" : "Topology",
  // "transform" : {'scale' :, "translate": }
  // "objects" : {'polygon': {'type':'Geome'}, 'geometries':[]}
  // "arcs": []
  this.name = name;
  this.topology = topology;
  this.layers = [];
  this.opts = {};
  
  if (topology.arcs && topology.arcs.length > 0) {
    if (topology.transform) {
      TopoJSON.decodeArcs(topology.arcs, topology.transform);
    }
  }
  
  for (var name in topology.objects) {
    var object = topology.objects[name];
    var lyr = TopoJSON.importObject(object, this.opts);
        
    if (lyr.shapes && (lyr.geometry_type == 'polygon' || lyr.geometry_type == 'polyline')) {
      // clean polygon or polyline shapes, in-place
      // we rely on users to take care of shapes
    }
    lyr.name = name;
    this.layers.push(lyr);
  } 
};

return TopoJsonMap;

}); // end define
