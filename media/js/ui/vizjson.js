
// Author: xunli at asu.edu
define(['jquery'], function($) {

var VizJsonReader = (function($){
  var instance;
  
  function init() {
    // singleton
    
    // private methods/vars
    var id = "dlg-msg";
    
    return {
      // public methods/vars
      GetNumLayers: function() {
        return 0;
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

return VizJsonReader;
});
