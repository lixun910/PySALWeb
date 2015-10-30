
// Author: xunli at asu.edu
define(['jquery'], function($) {

var GDAMsgBox = (function($){
  var instance;
  
  function init() {
    // singleton
    
    // private methods/vars
    var id = "dlg-msg";
    var titleID = "msg-title";
    var contentID = "msg-content";
   
    var dlg = $('#' +id);
    var titleEl = $('#' + titleID);
    var contentEl = $('#' + contentID);
    
    dlg.dialog({
      dialogClass: "dialogWithDropShadow",
      width: 400, 
      height: 300, 
      autoOpen: false, 
      modal: true,
      buttons: {OK: function() {$( this ).dialog( "close" );}}
    }).hide();
    
    return {
      // public methods/vars
      Show : function(title, content) {
        titleEl.text(title);
        contentEl.text(content);
        dlg.dialog('open');
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

return GDAMsgBox;
});
