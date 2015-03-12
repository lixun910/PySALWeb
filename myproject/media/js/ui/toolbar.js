
// Author: xunli at asu.edu
define(['jquery',  './openfileDlg'], function($, FileDlg) {

var Toolbar = (function($, FileDlg){
  var instance;
  
  function init() {
    // singleton
    
    // private methods/vars
    var layerTree,
	mapManager;
    
    // set position of popup toolbar menu in the bottom area 
    $('.tool-menu').css({ left: 0, bottom: 40}).hide();
   
    // link each item on bottom bar to a popup menu  
    // OnToolMenuClick() is link between tool item and menu
    var toolMenu = {
      '#btnMultiLayer':'#layer-tree', 
      '#btnNewMap':'#map-menu', 
      //'#btnShowTable':'#map-menu', 
      '#btnExplore':'#explore-menu', 
      '#btnSpace':'#space-menu', 
      //'#btnSpreg':'#spreg-menu'
    };
    
    var OnToolMenuClick = function(btn, menu) {
      $(btn).click(function(){
        if ($(menu).is(".visible") || $(menu).css('display') == 'block') {
          $(menu).hide();
          $('#tool-menu-arrow, #dialog-arrow, .ui-dialog').hide();
          return;
        }
        $('div.tool-menu, .ui-dialog, #dialog-arrow').hide();
        $(menu).show();
        // adjust the pos of arrow
        var pos = $(btn).offset();
        $('#tool-menu-arrow').css({'left':pos.left});
        $('#tool-menu-arrow').show();
      });
    };
    
    for (var btn in toolMenu) {
      var menu = toolMenu[btn];
      OnToolMenuClick(btn, menu);
    }

    // each button on popup menu is linking to a dialog, 
    // SetMenuButton() is used to link between button and dialog
    var buttonDialog = {
      '#btnSimMap' : '#dlg-simple-map',
      '#btnCatMap' : '#dlg-quantile-map',
      '#btnHist' : '#dlg-histogram',
      '#btnScatter' : '#dlg-scatter-plot',
      '#btnMoranScatter' : '#dlg-moran-scatter-plot',
      '#btnCreateW' : '#dialog-weights',
      '#btnRoad' : '#dialog-road',
      '#btnSpaceTime' : '#dialog-spacetime',
      '#btnLISA' : '#dlg-lisa-map',
    };
    
    var OnMenuButtonClick = function(btnID, dlgID) {
      $(btnID).click(function(){
        //if ($(menu).is(".visible") || $(menu).css('display') == 'block') {
        // hide all dialogs
        $('.ui-dialog-content').dialog('close');
        $(dlgID).dialog('option', "position", {
          my: "bottom-38",
          at: "top",
          of: btnID
        });
        var pos=$(btnID).offset();
        $('#dialog-arrow').css({'left':pos.left});
        $('#dialog-arrow').show();
        $(dlgID).dialog('open');
      });
    };
    
    for (var btnID in buttonDialog) {
      var dlgID = buttonDialog[btnID];
      OnMenuButtonClick(btnID, dlgID);
    }
     
    $('#btnCartoDB').click(function(){
      $('#dialog-cartodb').dialog('open');
    });
    
    $('#btnSpreg').click(function(){
      $('#dialog-regression').dialog('open');
    });
    
    $('#btnDensity').click(function(){
      var mapcanvas = gViz.GetMap();
      mapcanvas.update({'heatmap': true});
    });
  
    var toolbar_buttons = [
      '#btnShowTable',
      '#btnNewMap',
      '#btnExplore',
      '#btnSpace',
      '#btnSpreg',
    ];
    
    var ToggleButtons = function(enable) {
      for( var i=0; i<toolbar_buttons.length; i++) {
        var btn = toolbar_buttons[i];
        if (enable) {
          $(btn).show('slide');
        } else {
          $(btn).hide();
        }
      }
    };
    
    ToggleButtons(false);
    
    // setup first button on bottom toolbar
    $('#btnOpenData').click(function(){
      FileDlg.getInstance().Show();
    });
        
    return {
      // public methods/vars
      UpdateFields : function() {
      },
      
      RegistLayerTree : function(obj) {
	layerTree = obj;
      },
      
      RegistMapManager : function(obj) {
	mapManager = obj;
      },
      
      Show : function(map) {
	if (map['uuid'] === undefined) {
	  // cartodb app
	  // hide some buttons
	  $('#btnCreateW, #btnHistW').hide();
	} else {
	  // pysal cloud app
	}
	ToggleButtons(true);
	layerTree.AddMap(map.name);
      },
      
      Hide : function() {
	ToggleButtons(false);
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
  
})($, FileDlg);

return Toolbar;
});