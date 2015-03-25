
// Author: xunli at asu.edu
define(['jquery', './utils'], function($, Utils) {

var SpacetimeDlg = (function($){
  var instance;
  
  function init() {
    // singleton
    
    // private methods/vars
    $('#datepicker-start').datepicker();
    $('#datepicker-end').datepicker();
    $('#tabs-dlg-spacetime').tabs();
    $("#spacetime_catalog").accordion({heightStyle : "content"});
    $("#dialog-spacetime").dialog({
      height: 490,
      width: 580,
      autoOpen: false,
      modal: false,
      dialogClass: "dialogWithDropShadow",
      beforeClose: function(event,ui){$('#dialog-arrow').hide();},
      buttons: [{
        text: "OK",
        click: function() {
          var poly_uuid = $('#sel-spacetime-table-poly').find(':selected').val(),
              point_uuid = $('#sel-spacetime-table-point').find(':selected').val(),
              count_col_name = $('#txt-spacetime-col-name').val();
          var params = {
            'poly_uuid' : poly_uuid,
            'point_uuid' : point_uuid,
            'count_col_name' : count_col_name
          };
          $.get('../spacetime/', params, function(){
            $('#progress_bar_spacetime').show();
          }).done( function( data ) {
            $('#progress_bar_spacetime').hide();
            if ( data["success"] == 1 ) {
              ShowMsgBox("","Space(time) aggregation done.");
              LoadFieldNames();
            } else {
              ShowMsgBox("Error","Space(time) aggregation failed.");
            }
          });
          $( this ).dialog( "close" );
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