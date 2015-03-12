
// Author: xunli at asu.edu
define(['jquery', 
        './layertree','./toolbar','./uiManager', './msgbox', './cartoProxy', './openfileDlg',  './mapManager', 'jqueryui'], 
        
function($, LayerTree, Toolbar, UIManager, MsgBox,  CartoProxy, FileDlg, MapManager) {

  // hide all divs 
  $('#w-dist-loading, #divPop, #img-id-chk, #img-id-spin, #img-id-nochk,  .dlg-loading, #progress_bar_openfile, #progress_bar_cartodb,#progress_bar_road, #progress_bar_spacetime, #btnMultiLayer, #progress_bar_lisa, #tool-menu-arrow, #dialog-arrow, #mapInfo, #prgInfo, #legend').hide();
  
  $.download = function(url, data, method) {
    //url and data options required
    if (url && data) { 
        //data can be string of parameters or array/object
        data = typeof data == 'string' ? data : jQuery.param(data);
        //split params into form inputs
        var inputs = '';
        jQuery.each(data.split('&'), function() { 
            var pair = this.split('=');
            inputs += '<input type="hidden" name="' + pair[0] +
                '" value="' + pair[1] + '" />'; 
        });
        //send request
        jQuery('<form action="' + url +
            '" method="' + (method || 'post') +'">' + inputs + '</form>')
        .appendTo('body').submit().remove();
    }
  };
  
  $.GetTextsFromObjs = function(objs) {
    var texts = [];
    objs.each(function(i, obj){
      if (obj.className != "placeholder") {
        texts.push($(obj).text());
      }
    });
    return texts;
  };
  
  $.GetValsFromObjs = function(objs) {
    var vals = [];
    objs.each(function(i, obj){
      if (obj.className != "placeholder") {
        vals.push($(obj).val());
      }
    });
    return vals;
  };
  
  $.fn.popupDiv = function (divToPop, text) {
    var pos=$(this).offset();
    var h=$(this).height();
    var w=$(this).width();
    if (w == 0) w = 40;
    if ( text != undefined ) {
      $(divToPop).html(text);
    }
    $(divToPop).css({ left: pos.left + w , top: pos.top - h });
    $(divToPop).show(function() {
      setTimeout(function(){ $(divToPop).fadeOut('slow');}, 2000);
    });
  };

  String.prototype.endsWith = function(suffix) {
      return this.indexOf(suffix, this.length - suffix.length) !== -1;
  };
  
  var uid = "lixun910";
  var key = "340808e9a453af9680684a65990eb4eb706e9b56";
  
  CartoProxy.GetVariables(uid, key, "natregimes", ["hr60","hr70"], true, function(data) {
    console.log(data);
  });
  
  
  // UI Manager 
  var ui = UIManager.getInstance();

  // Map Manager 
  var mapManager = MapManager.getInstance(); 
  ui.RegistMapManager(mapManager);

  // layer tree  
  var layerTree = LayerTree.getInstance();
  layerTree.RegistMapManager(mapManager);
  
  // toolbar
  var toolbar = Toolbar.getInstance();
  toolbar.RegistLayerTree(layerTree);
  toolbar.RegistMapManager(mapManager);
  
  ui.RegistToolbar(toolbar);
  
  // dialogs
  var fileDlg = FileDlg.getInstance();

 
});
