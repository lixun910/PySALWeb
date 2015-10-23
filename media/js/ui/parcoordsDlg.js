
// Author: xunli at asu.edu
define(['jquery', './utils', './mapManager', './cartoProxy'], function($, Utils, MapManager, CartoProxy) {

var ParcoordsDlg = (function($){
  var instance;
  
  function init() {
    // singleton
    
    // private methods/vars
    var sel_el_name = "parcoords-vars"; 
    var sel_container= $("#parcoords-sels");
    
    $( "#dlg-parcoords" ).dialog({
      dialogClass: "dialogWithDropShadow",
      width: 500,
      height: 450,
      autoOpen: false,
      modal: false,
      resizable:  false,
      draggable: true,
      beforeClose: function(event,ui){
	$('#dialog-arrow').hide();
      },
      buttons: {
	"Open": function() {
	  var fields = [];
	  $('input[name='+sel_el_name+']:checked').each(function(i, obj){
	    fields.push(obj.value);
	  });
	  
	  if (fields.length <2) {
	    ShowMsgBox("Info", "Please select at least 2 variables for scatter matrix.")
	    return;
	  }
	  var url = '../../static/parcoords.html?';
	  
	  var map = MapManager.getInstance().GetMap();
	  if (map.uuid) url += 'uuid=' + map.uuid + '&';
	  else if (map.name) {
	    var carto_param = {'table_name' : map.name,
	      'carto_uid' : CartoProxy.GetUID(),
	      'carto_key' : CartoProxy.GetKey(),
	      'fields' : fields,
	    }
	    url += 'carto=' + JSON.stringify(carto_param);
	  }
	  var newWindow = $('#chk-newtab-parcoords').is(':checked');
	  var frame_uuid = Utils.popFrame(url, newWindow);
	}, 
      },
    });
      
    
    return {
      // public methods/vars
      UpdateFields : function(fields) {
	Utils.addMultiCheckbox(sel_el_name, fields, sel_container, ['integer', 'double']);
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

})($);

return ParcoordsDlg;
});