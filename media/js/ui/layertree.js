
// Author: xunli at asu.edu
define(['jquery','./utils'], function($, Utils) {

var LayerTree = (function($) {
  var instance;
  
  var init = function() {
    // singleton
    // private
  
    var mapManager;
    
    var PositionLayerTree = function() {
      return $('#layer-tree').css({ left: 0, bottom: 40, height: 'auto'});
    };
    
    // set position of multi-layer tree div and hide it
    PositionLayerTree().hide();
    
    function PlaceLayerName(name) {
      $('#btnMultiLayer').parent().width(160);
      $('#btnMultiLayer').parent().css("background", "#333");
      $('#btnMultiLayer span').attr('title', name);
      $('#btnMultiLayer span').attr('title', name);
      $('#btnMultiLayer span').text(Utils.shrinkText(name));
      $('#btnMultiLayer').show();
    };
    
    function SwitchLayer(elm, idx) {
      if ($(elm[0]).css('background-image').indexOf('off')>0) {
        $($('canvas')[idx]).show();
        $(elm[0]).css({'background-image':'url("../../media/img/switch-on.png")'})
      } else {
        $($('canvas')[idx]).hide();
        $(elm[0]).css({'background-image':'url("../../media/img/switch-off.png")'})
      }
    }
    
    
    $( "#sortable-layers" ).sortable({
      start: function(event, ui) {
        var start_pos = ui.item.index();
        ui.item.data('start_pos', start_pos);
      },
      change: function(event, ui) {
        var start_pos = ui.item.data('start_pos');
        var index = ui.placeholder.index() -1;
        ui.item.data('end_pos', index);
      },
      update: function(event, ui) {
        var layer_ids = [],
            start_pos = ui.item.data('start_pos'),
            end_pos = ui.item.data('end_pos'),
            layers = $("#sortable-layers").children(),
            current_layer = layers[0],
            layer_name = current_layer.textContent,
            space_pos = layer_name.indexOf(' ');
        if (space_pos > 0) {
          layer_name = layer_name.substr(0, layer_name.indexOf(' '));
        }
        PlaceLayerName(layer_name);
       
        for (var i=layers.length-1; i>=0; i--) {
          layer_ids.push(parseInt(layers[i].id));
        }
        
        require(['ui/mapManager','ui/uiManager','geoda/viz/map_canvas'], function(MapManager, UIManager, MapCanvas){
          var mapManager = MapManager.getInstance();
          mapManager.Reorder(layer_ids);
          var map = mapManager.GetMap(),
              mapcanvas = mapManager.GetMapCanvas();
          mapcanvas.SetDefaultMap();
          //mapManager.UpdateExtent(map);
          
          UIManager.getInstance().UpdateFieldNames(map.fields);
        });
      }
    });

    return {
      // public
  
      RegistMapManager : function(obj) {
        mapManager = obj;
      },
      
      AddMap: function(name) {
        // add item in layer-tree
        var nMaps = mapManager.GetNumMaps() - 1;
        var elm = '<li id="' +nMaps+ '" class="ui-state-default"><span class="ui-icon ui-icon-arrowthick-2-n-s"></span><span class="leaf-name" title="'+name+'">' + name + '</span><span  id="'+nMaps+'"  class="tree-item-delete"></span><span id="'+nMaps+'" class="tree-item-eye"></span></li>';
        
        $(elm).prependTo($('#sortable-layers'));
        
        PositionLayerTree();
        
        // change current layer name
        PlaceLayerName(name);
        $('.tree-item-eye[id='+nMaps+']').click(function() {
          SwitchLayer($(this), mapManager.GetOrigIdx($(this).attr("id")));
        });
        
        // reposition
      },
      
    };
  };
  
  return {
    getInstance: function() {
      if (!instance) {
        instance = init();
      }
      return instance;
    },
  };

})($);

return LayerTree;
});
