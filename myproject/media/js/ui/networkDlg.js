
// Author: xunli at asu.edu
define(['jquery', './utils'], function($, Utils) {

var NetworkDlg = (function($){
  var instance;
  
  function init() {
    // singleton
    
    // private methods/vars
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
          
          if (sel_id == 0) {
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
          } else if (sel_id == 1) {
            // snapping point to road
            var point_uuid = $('#sel-road-snap-point-layer').find(':selected').val(),
                road_uuid = $('#sel-road-snap-road-layer').find(':selected').val(),
                count_col_name = $('#txt-snap-count-col-name').val(),
                road_seg_length = $('#txt-snap-seg-road-length').val();
            var params = {
              'cartodb_uid' : uid,
              'cartodb_key' : key,
              'point_uuid' : point_uuid,
              'road_uuid' : road_uuid,
              'count_col_name' : count_col_name,
              'road_seg_length' : road_seg_length,
            };
            $.get('../road_snap_points/', params).done(function(data) {
              $('#progress_bar_road').hide();
              if ( data["success"] == 1 ) {
                ShowMsgBox("","Snapping points to roads done.");
                if (gViz.GetUUID() == road_uuid) {
                  LoadFieldNames();
                }
              } else {
                ShowMsgBox("","Snapping points to roads done.");
              }
            });
          } else if (sel_id == 2) {
            //create weights for roads
            var road_uuid = $('#sel-road-w-layer').find(':selected').val(),
                road_seg_length = $('#txt-w-seg-road-length').val(),
                w_name = $('#txt-road-w-name').val(),
                w_type = $('#sel-road-cont-type').find(':selected').val();
            var params = {
              'cartodb_uid' : uid,
              'cartodb_key' : key,
              'road_uuid' : road_uuid,
              'w_name' : w_name,
              'w_type' : 0,
              'road_seg_length' : road_seg_length,
            };
            $.get('../road_create_w/', params).done(function(data) {
              $('#progress_bar_road').hide();
              if ( data["success"] == 1 ) {
                ShowMsgBox("","Create W for roads done.");
                if (gViz.GetUUID() == road_uuid) {
                  LoadWnames();
                }
              } else {
                ShowMsgBox("","Create W for roads fialed.");
              }
            });
                
          }
        },
      },{
        text: "Close",
        click: function() {
          $( this ).dialog( "close" );
        },
      }]
    });
         
    return {
      // public methods/vars
      UpdateFields : function() {
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