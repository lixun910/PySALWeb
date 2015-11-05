

// Author: xunli at asu.edu
define(['jquery'], function($) {

var GDABasemap = (function($, L, cartodb){

  var instance;
  
  function init() {
    // singleton
    
    // private
    var lmap = new L.Map('map');
    var isHide = false;
    var baselayer = null;
    var cartolayer = null;
    
    var cartodb_att = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>';
  
    var esri_att = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
  
    var nokia_att = 'Map &copy; 1987-2014 <a href="http://developer.here.com">HERE</a>';
      
    var tileUrls = ['http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    'http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    'http://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
    'http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    'http://{s}.{base}.maps.cit.api.here.com/maptile/2.1/maptile/{mapID}/hybrid.day/{z}/{x}/{y}/256/png8?app_id=DXEWcinCPybfIS9yHKbM&app_code=vPBKeXjNk_iROosIzNNNRg',
    'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ];
      
    var tileIdx = 3;
    var tileProviders = {};
    tileProviders[tileUrls[0]] = cartodb_att;
    tileProviders[tileUrls[1]] = esri_att;
    tileProviders[tileUrls[2]] = cartodb_att;
    tileProviders[tileUrls[3]] = cartodb_att;
    tileProviders[tileUrls[4]] = nokia_att;
    tileProviders[tileUrls[5]] = esri_att;
   
    
    var mapProvider = $('#mapproviders');
    
    var mapProviders = mapProvider.children();
    
    var currentTileUrl = tileUrls[tileIdx];
    
    $(mapProviders[3]).css({'border':'2px solid orange'});
    
    function OnMapInfoChange() {
      if ($('#mapInfo').is(':hidden') ) {
        $('.hl-canvas')[0].style.pointerEvents = 'auto';
      } else {
        $('.hl-canvas')[0].style.pointerEvents = 'none';
      }
    }    
    
    $('body').keydown(function(event){
      if (event.which == 77) {
        $('.hl-canvas')[0].style.pointerEvents = 'none';
      }
    });
    $('body').keyup(function(event){
      if (event.which == 77) {
        $('.hl-canvas')[0].style.pointerEvents = 'auto';
      }
    });
    
    // basemap buton on the right side of top bar
    $('.basemap').click(function(){
      $('#userInfo').hide();
      $('#mapInfo').toggle();
      OnMapInfoChange();
    });

    $('.account').click(function(){
      $('#mapInfo').hide();
      $('#userInfo').toggle();
    });
    
    function CreateBaseLayer() {
      
      $('#map').css("opacity",1);
      
      // remove previous basemap
      if (baselayer) {
        lmap.removeLayer(baselayer);
      }
      
      var attr = tileProviders[currentTileUrl];
      var options = {
        attribution: attr,
        maxZoom: 18,
        subdomains: 'abcd',
      };
      if (attr == nokia_att) {
        options['app_id'] = 'DXEWcinCPybfIS9yHKbM';
        options['app_code'] = 'vPBKeXjNk_iROosIzNNNRg';
        options['base'] = 'aerial';
        options['mapID'] = 'newest';
        options['subdomains'] = '1234';
      }
      
      baselayer = L.tileLayer(currentTileUrl, options);
      lmap.addLayer(baselayer);
      //lmap.setView(new L.LatLng(33.419457, -111.937404), 12);
      return baselayer;
    }
  
    baselayer = CreateBaseLayer();
    
    for (var i=0, n = mapProviders.length; i<n; i++) {
      $(mapProviders[i]).click(function(){
        // update UI
        mapProviders.css({'border':'none'});
        $(this).css({'border':'2px solid orange'});
        tileIdx = parseInt($(this).attr('id'));
        currentTileUrl = tileUrls[tileIdx];
        $('#mapInfo').hide();
        OnMapInfoChange();
        
        baselayer = CreateBaseLayer();
      });
    }
    
    return {
      // public
      SelectBasemap : function(idx) {
        tileIdx = idx;
        currentTileUrl = tileUrls[tileIdx];
        baselayer = CreateBaseLayer();
      },
      GetTileIdx : function() {
        return tileIdx;
      },
      
      GetL : function() {
        return L;
      },
      
      GetLmap : function() {
        return lmap;
      },
      
      SetHidden: function(flag) {
        isHide = flag;
      },
      
      IsHide : function() {
        return isHide;
      },
  
      GetBounds : function() {
        var bounds = lmap.getBounds(),
            sw = bounds.getSouthWest(),
            ne = bounds.getNorthEast();
        return [sw.lat, sw.lng, ne.lat, ne.lng];
      },
      
      GetCenter : function() {
        var center = lmap.getCenter();
        return [center.lat, center.lng];
      },
      
      GetZoom : function() {
        return lmap.getZoom();
      },
      
      ShowCartoDBMap : function(uid, key, table_name, geo_type) {
      
        var css = "";
        if (geo_type == "Point") {
          css = '#layer {marker-fill: #FF6600; marker-opacity: 1; marker-width: 6; marker-line-color: white; marker-line-width: 1; marker-line-opacity: 0.9; marker-placement: point; marker-type: ellipse; marker-allow-overlap: true;}';
        } else if (geo_type == "Line") {
          css = '#layer {line-width: 2; line-opacity: 0.9; line-color: #006400; }';
        } else if (geo_type == "Polygon") {
          css = "#layer {polygon-fill: #006400; polygon-opacity: 0.9; line-color: #CCCCCC; }";
        } else {
          return;
        }
        //show cartodb layer and downloading iconp
        lmap.setView(new L.LatLng(43, -98), 1);
        if (cartolayer) {
          lmap.removeLayer(cartolayer);
        }
        cartolayer = cartodb.createLayer(lmap, 
          {
            user_name: uid, 
            type: 'cartodb',
            sublayers:[{
              sql:"SELECT * FROM " + table_name,
              cartocss: css
            }],
          },
          {
            https: true,
          }
        ).addTo(lmap).on('done', function(layer) {
          var sql = new cartodb.SQL({user: uid});
          sql.getBounds("SELECT * FROM " + table_name).done(function(bounds){
            lmap.fitBounds(bounds);
          });
           layer
            .on('featureOver', function(e, latlng, pos, data) {
              console.log(e, latlng, pos, data);
            })
            .on('error', function(err) {
              console.log('error: ' + err);
            });
        });
      },
      
    }; // end return ()
  } // end init() 
  
  return {
    getInstance : function() {
      
      if (!instance) {
        instance = init();
      }
      
      return instance;
    },
  };
  
})($, this.cartodb.L, this.cartodb);

return GDABasemap;

});
