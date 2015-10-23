
// Author: xunli at asu.edu
define(['jquery', './utils', './mapManager','./cartoProxy'], function($, Utils, MapManager, CartoProxy) {

var MoranDlg = (function($){
  var instance;
  
  function init() {
    // singleton
    
    // private methods/vars
    var sel_moran_var = $('#sel-moran-var');
    
    $( "#dlg-moran-scatter-plot" ).dialog({
      dialogClass: "dialogWithDropShadow",
      width: 560,
      height: 480,
      autoOpen: false,
      modal: false,
      resizable:  false,
      draggable: false,
      open: function(event, ui) {
        $('#tabs-dlg-weights').appendTo('#moran-weights-plugin');
      },
      beforeClose: function(event,ui){
	$('#dialog-arrow').hide();
      },
      buttons: {
        "Open": function() {
          var sel_var = sel_moran_var.val();
          var url = '../../static/moran_scatterplot.html?';
	  var map = MapManager.getInstance().GetMap();
	  
	  if (map.uuid) {
	    var sel_w = $('#sel-moran-w').val();
	    url += 'uuid=' + map.uuid + '&x=' + sel_var + '&w=' + sel_w;
	    
	  }  else if (map.name) {
	    url += 'table_name=' + map.name;
	    url += '&carto_uid=' + CartoProxy.GetUID();
	    url += '&carto_key=' + CartoProxy.GetKey() + '&';
    	    url += '&x=' + sel_var;
	    
	    var that = $(this);
	    
	    require(['ui/weightsDlg'], function(WeightsDlg) {
	      var w_conf = WeightsDlg.getInstance().GetCartoWeights();
	      url += '&w_conf=' + JSON.stringify(w_conf);
	      var frame_uuid = Utils.popFrame(url);
	      that.dialog("close");
	    });
	  }
	  
	  var newWindow = $('#chk-newtab-moranscatter').is(':checked');
          var frame_uuid = Utils.popFrame(url, newWindow);
          $(this).dialog("close");
        }, 
        Cancel: function() {$( this ).dialog( "close" );},
      },
    });

    return {
      // public methods/vars
      UpdateFields : function(fields) {
        Utils.updateSelector(fields, sel_moran_var, ['integer', 'double']);
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

return MoranDlg;
});