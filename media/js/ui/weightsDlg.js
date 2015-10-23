
// Author: xunli at asu.edu
define(['jquery', './utils'], function($, Utils) {

var WeightsDlg= (function($, Utils){
  var instance;

  function init() {
    // singleton

    // private methods/vars
    var sel_w_id = $('#sel-w-id');
    
    $('#sel-w-files').change( function() {
      var uuid = gViz.GetUUID();
      var w_name = $('#sel-w-files').val();
      if ( w_name && uuid ) {
        var w_type = $('#sel-w-type').val();
        $.download(
          "../download_w/",
          "uuid=" + uuid + "&w_name=" + w_name + "&w_type=" + w_type,
          "get"
        ); 
      }
      $(this).prop("selectedIndex", -1);
    });

    var txt_w_name = $('#txt-w-name');
    
    var timeoutRef;
    function checkWname() {
      if (!timeoutRef) return;
      timeoutRef = null;
      if (!gViz || !gViz.GetUUID()) return;
      var layer_uuid = gViz.GetUUID(),
          w_name = txt_w_name.val();
      txt_w_name.next().remove();
      if ( layer_uuid && w_name ) { 
        $(html_load_img).insertAfter("#txt-w-name");
        $.get('../check_w/', { 'w_name': w_name, 'layer_uuid':layer_uuid,}, function(){
          txt_w_name.next().remove();
        }).done( function( data ) {
          txt_w_name.next().remove();
          if ( data == "1" ) {
            $('<font color=red>duplicated name</span>').insertAfter($("#txt-w-name"));
          } else {
            $(html_check_img).insertAfter("#txt-w-name");
          }
        }).always( function() {});
      }
    }
    
    txt_w_name.keypress(function() {
      var el = this;
      if ( timeoutRef ) clearTimeout(timeoutRef);
      timeoutRef = setTimeout(function() {checkWname.call(el);}, 1000);
      txt_w_name.blur(function(){ checkWname.call(el); });
    });

    $("#img-id-chk, #img-id-nochk, #img-id-spin").hide();          
    $('#dist-slider').slider({
      min: 0, max: 100,
      slide: function( event, ui ) { $('#txt-dist-thr').val(ui.value); }
    });
    $('#spn-pow-idst, #spn-cont-order, #spn-dist-knn').spinner();
    $('#tabs-dlg-weights').tabs();
  
    $('#sel-w-id').prop("selectedIndex", -1);
    $('#sel-w-id').change(function() {
      var layer_uuid = gViz.GetUUID();
        id_name = $('#sel-w-id').val();
      $("#img-id-chk, #img-id-nochk, #img-id-spin").hide();          
      if (id_name == "") {
        return;
      } else if (id_name == "0") {
        $('#dlg-add-uniqid').dialog('open');
        return;
      } else if (id_name && layer_uuid) {
        $("#img-id-spin").show();          
        $.get('../check_ID/',{'layer_uuid':layer_uuid, 'id_name':id_name},function(){ 
          $("#img-id-spin").show(); 
        }).done(function(data) {
          if ( data == "1" ) {
            $("#img-id-chk").show();          
            $("#img-id-nochk, #img-id-spin").hide();          
          } else {
            $("#img-id-nochk").show();          
            $("#img-id-chk, #img-id-spin").hide();          
          }
        });
      }
    });
  
    $('input:radio[name=rdo-dist]').change(function(){
      dist_method = $('input:radio[name=rdo-dist]:checked').attr("id");
      if (dist_method == 1 && gViz) {
        LoadMinPairDist();
      }
    });
  
    function GetWeightsConf() {
      var active = $('#tabs-dlg-weights').tabs("option","active"),
          param = {};

      if ( active == 0 ) {
        var cont_type = $('#sel-cont-type').find(":selected").val(),
            cont_order = $('#spn-cont-order').val(),
            cont_ilo = $('#cbx-cont-ilo').prop("checked");
        param['cont_type'] = parseInt(cont_type);
        param['cont_order'] = parseInt(cont_order);
        param['cont_ilo'] = cont_ilo;
      
      } else if ( active == 1 ) {
        var dist_value = "",
            dist_metric = $('#sel-dist-metr').val(),
            dist_method =$('input:radio[name=rdo-dist]:checked').attr("id");
        if ( dist_method == 0 ) {
          dist_value = $('#spn-dist-knn').val();
        } else if ( dist_method == 1 ) {
          dist_value = $('#txt-dist-thr').val();
        } else if ( dist_method == 2 ) {
          dist_value = $('#txt-dist-thr').val();
          param['pow_idist'] = parseInt($('#spn-pow-idst').val());
        } else {
          ShowMsgBox("","Please select a distance method.");
          return;
        }
        param['dist_metric'] = dist_metric;
        param['dist_method'] = dist_method;
        param['dist_value'] = parseFloat(dist_value);
      
      } else if ( active == 2 ) {
        param['kernel_type'] = $("#sel-kel-type").val(); 
        param['kernel_nn'] = parseInt($("#txt-kel-nn").val());
      }
      param['w_type'] = active;
      return param;
    }

    $( "#dialog-weights" ).dialog({
      height: 520, 
      width: 560,
      autoOpen: false, 
      modal: false,
      dialogClass: "dialogWithDropShadow",
      open: function(event, ui) {
        $('#tabs-dlg-weights').appendTo('#weights-plugin');
      },
      beforeClose: function(event,ui){
        $('#dialog-arrow').hide();
      },
      buttons: [{
        text: "Create",
        id: "btn-create-w",
        click: function() {
          if ( !gViz || !gViz.GetUUID()) return;
          var w_name = txt_w_name.val(),
              w_id = $('#sel-w-id').find(":selected").val(),
              active = $('#tabs-dlg-weights').tabs("option","active");
          if ( w_name.length == 0 ) {
            ShowMsgBox("Error", "Weights name can't be empty.");
            return;
          }
          if ( w_id.length == 0 || $('#img-id-nochk').is(":visible") ) {
            ShowMsgBox("Error", "An unique ID for weights creation is required.");
            return;
          }
          var post_param = GetWeightsConf();
          post_param['layer_uuid'] =  gViz.GetUUID();
          post_param['w_id'] = w_id;
          post_param['w_name'] = w_name;
          post_param['csrfmiddlewaretoken'] = csrftoken;

          // submit request
          $("#btn-create-w").attr("disabled",true).fadeTo(0, 0.5);
          $(html_load_img).insertBefore("#btn-create-w");

          $.post("../create_weights/", post_param, function(){})
          .done(function( data ) {
            console.log("create_weights", data);
            if ( data["success"] == 1 ) {
              txt_w_name.val("").next().remove();
              $('#sel-w-id').next().remove();
              LoadWnames();
              $('#sel-w-id').prop("selectedIndex", -1);
              ShowMsgBox("","Create weights done.");
              return;
            }
            ShowMsgBox("Error", "Create weights failed.");
          })
          .fail(function() { ShowMsgBox("Error", "Create weights failed."); })
          .always(function(){
            $("#btn-create-w").attr("disabled",false)
              .fadeTo(0, 1)
              .prev().remove();
          });
        }
      },{
        text: "Close",
        click: function() {
          $( this ).dialog( "close" );
        },
      }]
    }); // end dialog

    return {
      // public methods/vars
      UpdateFields : function(fields) {
        Utils.updateSelector(fields, sel_w_id, ['Integer']);
      },

      GetCartoWeights : function() {
        return GetWeightsConf();
      },
    };
  } // end function init()

  return {
    getInstance : function() {
      if (!instance) {
        instance = init();
      }
      return instance;
    },
  };

})($, Utils);

return WeightsDlg;
});