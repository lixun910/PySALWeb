
// Author: xunli at asu.edu
define(['jquery', './msgbox', './utils'], function($, MsgBox, Utils) {

var SpacetimeDlg = (function($){
  var instance;
  
  function init() {
    // singleton
    
    // private methods/vars
    var sel_table_poly = '#sel-spacetime-table-poly',
        sel_table_point = '#sel-spacetime-table-point';
        
    $('#datepicker-start').datepicker();
    $('#datepicker-end').datepicker();
    $('#tabs-dlg-spacetime').tabs();
    $("#spacetime_catalog").accordion({heightStyle : "content"});
    
    $("#dialog-spacetime").dialog({
      height: 500,
      width: 600,
      autoOpen: false,
      modal: false,
      resizable: false,
      dialogClass: "dialogWithDropShadow",
      beforeClose: function(event,ui){$('#dialog-arrow').hide();},
      buttons: [{
        text: "OK",
        click: function() {
          var poly_tbl = $(sel_table_poly).find(':selected').text(),
              point_tbl = $(sel_table_point).find(':selected').text(),
              col_name = $('#txt-spacetime-col-name').val();
          require(['ui/cartoProxy', 'ui/mapManager','ui/uiManager'], function(CartoProxy, MapManager, UIManager){
            $('#progress_bar_spacetime').show();
            CartoProxy.SpatialCount(poly_tbl, point_tbl, col_name, function(data){
              $('#progress_bar_spacetime').hide();
              if (data["error"]) {
                MsgBox.getInstance().Show("Error","Spatial counting failed."); 
              } else {
                MsgBox.getInstance().Show("","Spatial counting done.");
                var mapManager = MapManager.getInstance(),
                    map = mapManager.GetMapByName(poly_tbl);
                if (map) {
                  map.fields[col_name] = "integer";
                  console.log(map.fields);
                  UIManager.getInstance().UpdateFieldNames(map.fields);
                }
              }
            });
          });
        },
      },{
        text: "Close",
        click: function() { $( this ).dialog( "close" ); },
      }]
    });
    
    
    return {
      // public methods/vars
      UpdateFields : function() {
      },
      
      UpdateTableSel: function(table_geo) {
        var carto_table_sel = {}
        carto_table_sel[sel_table_point] = 'Point';
        carto_table_sel[sel_table_poly] =  'Polygon';
        
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

return SpacetimeDlg;
});