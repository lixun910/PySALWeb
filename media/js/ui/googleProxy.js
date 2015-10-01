
// Author: xunli at asu.edu

define(['jquery'], function($) {

var map = new google.maps.Map($('#googlemap')[0], {
    center: new google.maps.LatLng(-33.8668283734, 151.2064891821),
    zoom: 15
  });

var service = new google.maps.places.PlacesService(map);


function d2r(x) {
  return x * Math.PI / 180.0;
}

function r2d(x) {
  return x * 180.0 / Math.PI;
}

function haversine(x) {
  x = Math.sin(x/2);
  return x * x;
}

function radangle(p0, p1) {
  var x0 = d2r(p0.lng),
      y0 = d2r(p0.lat),
      x1 = d2r(p1.lng),
      y1 = d2r(p1.lat);
  var d = 2.0 * Math.asin(Math.sqrt(haversine(y1 - y0) + Math.cos(y0) * Math.cos(y1) * haversine(x1 - x0)));
  return d;
}

function harcdist(p0, p1) {
  var radius = 6371.0,
      d = radangle(p0, p1);
  d = d * radius;
  return d;
}

function queryradius(p0, p1) {
  return harcdist(p0,p1) * 1000.0;
}

var GoogleProxy = {

  //bounds [sw.lat, sw.lng, ne.lat, ne.lng];
  SearchByKeyword : function(keyword, bounds, k, onSuccess, onFailed) {
    if (k === undefined) k = 5;
    
    var lat_range = Math.abs(bounds[2] - bounds[0]),
        lng_range = Math.abs(bounds[3] - bounds[1]);
        
    var seg_range = lat_range < lng_range ? lat_range / k : lng_range / k,
        radius = queryradius(
          {lat:bounds[0], lng:bounds[1]}, 
          {lat:bounds[0] + seg_range/2.0, lng:bounds[1] + seg_range/2.0}
        );
    
    // sw.lng to ne.lng
    var next_lng = bounds[1],
        lng_points = [];
    while (next_lng < bounds[3]) {
      next_lng += seg_range;
      var half_lng = next_lng -  seg_range / 2.0;
      lng_points.push(half_lng)
    }
    
    // sw.lat to ne.lat
    var next_lat = bounds[0] + seg_range,
        lat_points = [];
    while (next_lat < bounds[2]) {
      next_lat += seg_range;
      var half_lat = next_lat -  seg_range / 2.0;
      lat_points.push(half_lat)
    }
   
    var allCount = lng_points.length + lat_points.length,
        queryCount = 0,
        breakQuery = false,
        searchMsg = null,
        findings = {};
    
    // location=latitude,longitude
    for (var i=0, n=lng_points.length; i<n; i++) {
      var lng = lng_points[i];
      for (var j=0, m=lat_points.length; j<m; j++) {
        if (breakQuery)
          return;
        var lat = lat_points[j];
        var request = {
          location: new google.maps.LatLng(lat, lng),
          radius : radius,
          keyword : keyword,
        };
        setTimeout(function() {
          service.radarSearch(request, function(results, status){
            if (status != google.maps.places.PlacesServiceStatus.OK) {
              console.log(status);
            } else {
              var nn = results.length;
              if (nn == 200) {
                searchMsg = "Warning: FINER_QUERY_NEEDED. Please use large k value";
              }
              for (var r=0; r<nn; r++) {
                var item = results[r],
                    place_id = item['place_id'],
                    loc = item['geometry']['location'];
                findings[place_id] = loc;
              }
            }
            queryCount += 1;
            if (queryCount == allCount) {
              // this is the last query
              if (onSuccess) onSuccess(keyword, findings, searchMsg);
            }
          });
        }, 200);
      }
    }
  },
  
};

return GoogleProxy;

});
