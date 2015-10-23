
// Author: xunli at asu.edu
define(['jquery', './utils', './mapManager','./cartoProxy'], function($, Utils, MapManager, CartoProxy) {

var HistogramDlg = (function($){
  var instance;
  
  function init() {
    // singleton
    $( "#dlg-histogram" ).dialog({
      dialogClass: "dialogWithDropShadow",
      width: 500,
      height: 400,
      autoOpen: false,
      modal: false,
      resizable:  false,
      draggable: false,
      beforeClose: function(event,ui){
	  $('#dialog-arrow').hide();
      },
      buttons: {
	"Open": function() {
		  
	  var sel_x = $('#sel-histogram-x').val();
	  if (sel_x == '') {
	    ShowMsgBox("Info", "Please select variable for histogram plot.")
	    return;
	  }
	  
	  var url = '../../static/histogram.html?';
	  
	  var map = MapManager.getInstance().GetMap();
	  if (map.uuid) url += 'uuid=' + map.uuid + '&';
	  else if (map.name) {
	    url += 'table_name=' + map.name;
	    url += '&carto_uid=' + CartoProxy.GetUID();
	    url += '&carto_key=' + CartoProxy.GetKey() + '&';
	  }
	  url += '&x=' + sel_x;
	  
	  var newWindow = $('#chk-newtab-hist').is(':checked');
	  var frame_uuid = Utils.popFrame(url, newWindow);
	  $(this).dialog("close");
	}, 
	Cancel: function() {$( this ).dialog( "close" );},
      },
    });

    // private methods/vars
    var sel_hist_x = $('#sel-histogram-x') ;
    
    return {
      // public methods/vars
      UpdateFields : function(fields) {
        Utils.updateSelector(fields, sel_hist_x, ['integer', 'double']);
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

return HistogramDlg;
});