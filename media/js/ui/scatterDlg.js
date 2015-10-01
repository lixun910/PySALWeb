
// Author: xunli at asu.edu
define(['jquery', './utils', './mapManager', './cartoProxy'], function($, Utils, MapManager, CartoProxy) {

var ScatterDlg = (function($){
  var instance;
  
  function init() {
    // singleton
    
    // private methods/vars
    var sel_x = $('#sel-scatter-x');
    var sel_y = $('#sel-scatter-y');
    
    $( "#dlg-scatter-plot" ).dialog({
      dialogClass: "dialogWithDropShadow",
      width: 400,
      height: 200,
      autoOpen: false,
      modal: false,
      resizable:  false,
      draggable: false,
      beforeClose: function(event,ui){
	  $('#dialog-arrow').hide();
      },
      buttons: {
	"Open": function() {
	  var var_x = sel_x.val(),
	      var_y = sel_y.val();
	  if (var_x == '' || var_y == '') {
	    ShowMsgBox("Info", "Please select variables for scatter plot.")
	    return;
	  }
	  var url = '../../static/scatterplot.html?';
	  
	  var map = MapManager.getInstance().GetMap();
	  if (map.uuid) url += 'uuid=' + map.uuid + '&';
	  else if (map.name) {
	    url += 'table_name=' + map.name;
	    url += '&carto_uid=' + CartoProxy.GetUID();
	    url += '&carto_key=' + CartoProxy.GetKey() + '&';
	  }
	  url += '&x=' + var_x + '&y=' + var_y;
	  var newWindow = $('#chk-newtab-scatter').is(':checked');
	  console.log(newWindow);
	  var frame_uuid = Utils.popFrame(url, newWindow);
	}, 
      },
    });
      
    
    return {
      // public methods/vars
      UpdateFields : function(fields) {
        Utils.updateSelector(fields, sel_x, ['integer', 'double']);
        Utils.updateSelector(fields, sel_y, ['integer', 'double']);
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

return ScatterDlg;
});