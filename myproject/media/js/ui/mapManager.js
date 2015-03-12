
// Author: xunli at asu.edu
define(['jquery', 'geoda/io/shapefile', 'geoda/io/shapefile_map','geoda/viz/map_canvas'], 
function($, ShpReader, ShapeFileMap, MapCanvas) {

var Manager = (function(window){
  
  var instance;
  
  function init() {
    // singleton
    
    // private
    var container = $("#map-container");
 
    var width = container.width();
    var height = container.height();
   
    var numMaps = 0;
    var mapCanvasList = [];
    var mapOrder= [];
    
    var layerColors = ['#006400','#FFCC33','#CC6699','#95CAE4','#993333','#279B61'];
    var uuid = null;
   
    var currentMapName;
    
    var hlcanvas = $('.hl-canvas');
    
    var resizeTimer;
    
   
    function OnResize( evt ) {
      $('canvas, .ui-dialog, .down-arrow').hide();
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function(){
        console.log('resize');
        $('canvas').show();
        for (var i=0; i<numMaps; i++)  {
          mapCanvasList[i].update();
        }
      }, 250);
    }
    
    function OnKeyDown( evt ) {
      if ( evt.keyCode = 77 ) {
        hlcanvas[0].style.pointerEvents= 'none';  
      }
    }
    
    function OnKeyUp( evt ) {
      if ( evt.keyCode = 77 ) {
        hlcanvas[0].style.pointerEvents= 'auto';  
      }
    }

    function ShowCartoDBMap(carto_uid, carto_key, table_name, geo_type) {
      var css = "";
      if (geo_type == "Point") {
        css = '#layer {marker-fill: #FF6600; marker-opacity: 1; marker-width: 6; marker-line-color: white; marker-line-width: 1; marker-line-opacity: 0.9; marker-placement: point; marker-type: ellipse; marker-allow-overlap: true;}';
      } else if (geo_type == "Line") {
        css = '#layer {line-width: 2; line-opacity: 0.9; line-color: #006400; }';
      } else if (geo_type == "Polygon") {
        css = "#layer {polygon-fill: #006400; polygon-opacity: 0.9; line-color: #CCCCCC; }";
      }
      //show cartodb layer and downloading iconp
      SetupLeafletMap();
      lmap.setView(new L.LatLng(43, -98), 1);
      if (carto_layer) {
        lmap.removeLayer(carto_layer);
      }
      carto_layer = cartodb.createLayer(lmap, 
        {
          user_name: carto_uid, 
          type: 'cartodb',
          sublayers:[{
            sql:"SELECT * FROM " + table_name,
            cartocss: css
          }],
        },
        {
          https: true,
        }
      )
      .addTo(lmap)
      .on('done', function(layer_) {
        var sql = new cartodb.SQL({user: carto_uid});
        sql.getBounds("SELECT * FROM " + table_name).done(function(bounds){
          lmap.fitBounds(bounds);
        });
      });
    }
    
    function CleanMaps() {
      for (var i=0; i<numMaps; i++) {
        mapCanvasList[i].clean();
      }
    }
   
    function PanMaps(offsetX, offsetY) {
      for (var i=0; i<numMaps; i++) {
        mapCanvasList[i].move(offsetX, offsetY);
      }
    } 
    
    function UpdateMaps(params) {
      for (var i=0; i<numMaps; i++) {
        mapCanvasList[i].update(params, true);
      }
    }
    
    var basemap;
    
    require(['ui/basemap'], function(BaseMap){
      basemap = BaseMap.getInstance();
    });
    
    var Lmove_start, Lmove, Lmove_end, gOffsetX, gOffsetY;
    
    function SetupBasemapEvent() {
      var lmap = basemap.GetLmap();
      
      lmap.on('zoomstart', function() {
        CleanMaps();
      });
      lmap.on('zoomend', function() {
        // already taken care by moveend
      });
      lmap.on('movestart', function(e) {
        Lmove_start = e.target._getTopLeftPoint();
        CleanMaps();
      });
      lmap.on('move', function(e) {
        Lmove = e.target._getTopLeftPoint();
        if (Lmove_start == undefined) {
          // resize window
          Lmove_start = e.target.getPixelOrigin();
          CleanMaps();
          return;
        }
        var offsetX = Lmove.x - Lmove_start.x,
            offsetY = Lmove.y - Lmove_start.y;
        if (Math.abs(offsetX) > 0 && Math.abs(offsetY) > 0) {
          PanMaps(-offsetX, -offsetY);
        }
      });
      lmap.on('moveend', function(e) {
        Lmove_end = e.target._getTopLeftPoint();
        var offsetX = Lmove_end.x - Lmove_start.x,
            offsetY = Lmove_end.y - Lmove_start.y;
        if (Math.abs(offsetX) > 0 || Math.abs(offsetY) > 0) {
          if (gOffsetX != offsetX || gOffsetY != offsetY) {
            gOffsetX = offsetX;
            gOffsetY = offsetY;
            UpdateMaps();
          }
        }
      });
    }
    
    //create basemap
    function OnAddMap(map) {
      // create a HTML5 canvas object for this map
      var canvas = $('<canvas/>', {'id':numMaps}).attr('class','paint-canvas');
      container.append(canvas);
     
      var  params = {};
      // assign default fill color
      if (params['fill_color'] === undefined) {
        params['fill_color'] = layerColors[numMaps % 6];
      }
      
      var mapCanvas = new MapCanvas(map, canvas, hlcanvas, params);
      
      for (var i=0; i<mapCanvasList.length; i++) {
        mapCanvasList[i].updateExtent(map);
      }
      
      mapCanvasList.push(mapCanvas);
      mapOrder.push(numMaps);
      numMaps += 1;
      
      SetupBasemapEvent();
    }
    
    window.addEventListener('keydown', OnKeyDown, true);
    window.addEventListener('keyup', OnKeyUp, true);
    window.addEventListener('resize', OnResize, true);
    
    return {
      // public
      
      AddMap : function(data, callback) {
        if (data.file_type === 'shp') {
          var shp = data.file_content.shp;
          if (!shp.lastModifiedDate || shp.constructor == Blob) {
            var reader = new FileReader();
            reader.onload = function(e) {
              var shpReader = new ShpReader(reader.result);
              var map = new ShapeFileMap(data.file_name, shpReader, basemap.GetL(), basemap.GetLmap());
              OnAddMap(map);
              if (callback) callback(map);
            };
            reader.readAsArrayBuffer(shp);
          }
        }
      },
      
      GetNumMaps : function() {
        return numMaps;
      },
      
      GetMapCanvas : function(idx) {
        if (idx === undefined) idx = mapOrder[numMaps-1];
        return mapCanvasList[idx];
      },
      
      GetMap : function(idx) {
        if (idx === undefined) idx = mapOrder[numMaps-1];
        return  this.GetMapCanvas(idx).map;
      },
     
      Reorder : function(newOrder) {
        // mapOrder [2,1,3,4]
        var n = numMaps;
        var newExtent = newOrder[n-1]  != mapOrder[n-1];
        mapOrder = newOrder;
        
        // update orders of canvas by given new order 
        for (var i=0; i < n; i++) {
          $('canvas[id=' + newOrder[i] + ']').appendTo(container);
        }
        
        if (newExtent) {
          var topLayerIdx = newOrder[n-1],
              mapcanvas = mapCanvasList[topLayerIdx],
              map = mapcanvas.map,
              extent = map.setExtent();
              
          map.setLmapExtent(extent);
        }
      }, 
      
    };
  };
  
  return {
    getInstance : function() {
      if (!instance) {
        instance = init();
      }
      return instance;
    },
  };

})(this);

return Manager;

});
