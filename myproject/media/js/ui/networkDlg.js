
// Author: xunli at asu.edu
define(['jquery', './msgbox', './utils'], function($, MsgBox, Utils) {

var NetworkDlg = (function($){
  var instance;
  
  function init() {
    // singleton
    
    // private methods/vars
    var sel_table_line = '#sel-road-snap-road-layer',
        sel_table_point = '#sel-road-snap-point-layer';
        
    $('#tabs-dlg-road').tabs();
    $( "#dialog-road" ).dialog({
      height: 380,
      width: 520,
      autoOpen: false,
      modal: false,
      dialogClass: "dialogWithDropShadow",
      beforeClose: function(event,ui){
          $('#dialog-arrow').hide();
      },
      buttons: [{
        text: "OK",
        click: function() {
          var that = $( this );
          var sel_id = $("#tabs-dlg-road").tabs('option','active'),
              uid = $('#txt-carto-setup-id').val(),
              key = $('#txt-carto-setup-key').val();
          $('#progress_bar_road').show();
          
          if (sel_id == 1) {
            // segment road
            var road_uuid = $('#sel-road-seg').find(':selected').val(),
                seg_length = $('#txt-seg-road-length').val(),
                output_filename = $('#txt-seg-road-name').val();
            var params = {
              'cartodb_uid' : uid,
              'cartodb_key' : key,
              'road_uuid' : road_uuid,
              'road_seg_length' : seg_length,
              'road_seg_fname' : output_filename,
            };
            $.get('../road_segment/', params).done( function(data){
              $('#progress_bar_road').hide();
              if ( data["success"] == 1 ) {
                ShowMsgBox("","Road segmentation done.");
                LoadMapNames();
              } else {
                ShowMsgBox("Error","Road segmentation failed.");
              }
              //if (output_filename.indexOf(".shp") >=0 ){
              //  output_filename = output_filename.substring(0,output_filename.indexOf('.shp'));
              //  $.download('./cgi-bin/download.py','name='+output_filename,'get');
              //} else {
              //  $.download('./cgi-bin/download.py','name='+output_filename,'get');
              //}
            });
          } else if (sel_id == 0) {
            // snapping point to road
            var point_tbl = $(sel_table_point).find(':selected').text(),
                road_tbl = $(sel_table_line).find(':selected').text(),
                col_name = $('#txt-snap-count-col-name').val();
            require(['ui/cartoProxy', 'ui/mapManager','ui/uiManager'], function(CartoProxy, MapManager, UIManager) {
              $('#progress_bar_road').show();
              CartoProxy.SnapPointsToLines(road_tbl, point_tbl, col_name, function(data){
                $('#progress_bar_road').hide();
                if ( data["error"]) {
                  MsgBox.getInstance().Show("","Snapping points to roads failed.");
                } else {
                  MsgBox.getInstance().Show("","Snapping points to roads done.");
                  var mapManager = MapManager.getInstance(),
                      map = mapManager.GetMapByName(road_tbl);
                  if (map) {
                    map.fields[col_name] = "integer";
                    console.log(map.fields);
                    UIManager.getInstance().UpdateFieldNames(map.fields);
                  }
                }
              });
            });
          } 
        }
      },{
        text: "Close",
        click: function() {$( this ).dialog( "close" );},
      }]
    });
         
    return {
      // public methods/vars
      UpdateFields : function() {
      },
      
      UpdateTableSel: function(table_geo) {
        var carto_table_sel = {}
        carto_table_sel[sel_table_point] = 'Point';
        carto_table_sel[sel_table_line] =  'Line';
        
        for (var sel in carto_table_sel) {
          $(sel).find('option').remove().end();
          for (var table_name in table_geo) {
            var geo_type = table_geo[table_name];
            if (geo_type === carto_table_sel[sel])
              $(sel).append($('<option>', {value: geo_type}).text(table_name));
          }
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
  
})($, Utils);

return NetworkDlg;
});