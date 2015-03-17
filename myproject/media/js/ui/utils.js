

// Author: xunli at asu.edu
define(['jquery', 'd3', './msgbox', './message'], function($, d3, MsgBox, M) {


return {
  // update field selector
  addMultiCheckbox: function(name, fields, div, filter) {
    div.empty();
    var field_names = [];
    for (var field in fields) {
      field_names.push(field);
    }
    field_names.sort();
    for (var field in fields) {
      var type = fields[field];
      if (filter && filter.indexOf(type) >= 0) {
        $('<input/>', {type: 'checkbox', name: name, value: field, text: field}).appendTo(div);
        $('<label/>', {text: field}).appendTo(div);
        $('<br/>').appendTo(div);
      }
    }
  },
  
  // update field selector
  updateSelector : function(fields, selector, filter) {
    var field_names = [];
    for (var field in fields) {
      field_names.push(field);
    }
    field_names.sort();
    
    selector.find('option').remove().end();
    selector.append($('<option>', {value: ''}).text(''));
    for (var field in fields) {
      var type = fields[field];
      if (filter && filter.indexOf(type) >= 0) {
        selector.append($('<option>', {value: field}).text(field));
      }
    }
  },
  
  shrinkText : function(text, maxlength) {
    if (!maxlength) maxlength = 22;
    if (text.length > maxlength) {
      text = text.slice(0, maxlength -2);
      return text + "...";
    } 
    return text;
  },

  guid : function() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
                 .toString(16)
                 .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
           s4() + '-' + s4() + s4() + s4();
  },

  getParameterByName : function(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == undefined ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  },

  getFileName : function(url) {
    return url.substring(url.lastIndexOf('/')+1);
  },

  getSuffix : function(path) {
      return path.substring(path.lastIndexOf('.')+1);
  },
  
  getName : function(path) {
    return path.substring(0, path.lastIndexOf('.'));
  },
  
  getFileNameNoExt : function(url) {
    return getName(getFileName(url));
  },
  
  sortKeys :function(dict) {
    var field_names = [];
    for ( var key in fields ){
      field_names.push(key); 
    }
    field_names.sort();
  },
  
  isValidEmailAddress : function(emailAddress) {
    var pattern = new RegExp(/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i);
    return pattern.test(emailAddress);
  },
  
  exportTableToCSV : function($table, filename) {
    var $rows = $table.find('tr:has(td)'),

        // Temporary delimiter characters unlikely to be typed by keyboard
        // This is to avoid accidentally splitting the actual contents
        tmpColDelim = String.fromCharCode(11), // vertical tab character
        tmpRowDelim = String.fromCharCode(0), // null character

        // actual delimiter characters for CSV format
        colDelim = '","',
        rowDelim = '"\r\n"',

        // Grab text from table into CSV formatted string
        csv = '"' + $rows.map(function (i, row) {
            var $row = $(row),
                $cols = $row.find('td');

            return $cols.map(function (j, col) {
                var $col = $(col),
                    text = $col.text();

                return text.replace('"', '""'); // escape double quotes

            }).get().join(tmpColDelim);

        }).get().join(tmpRowDelim)
            .split(tmpRowDelim).join(rowDelim)
            .split(tmpColDelim).join(colDelim) + '"',

        // Data URI
        csvData = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csv);

    $(this).attr({
      'download': filename,
      'href': csvData,
      'target': '_blank'
    });
  },
  
  create_legend : function(div, bins, colors) {
    var txts = [];
    div.empty();
    div.append('<table></table>');
    var table = div.children();
    for (var i=0, n = colors.length; i < n; i++) {
      var txt = "";
      var _bin = bins[i] === undefined ? bins[i-1] : bins[i];
      if (typeof _bin == 'string' || _bin instanceof String) {
        txt = _bin;
      } else {
        var lower, upper = _bin.toFixed(2);
        if (i > 0 && bins[i] !== undefined) {
          lower = bins[i-1].toFixed(2);
          txt = lower ? "(" + lower + ", " + upper + "]" : "<=" + upper;
        } else {
          txt = "> " + upper;
        }
      }
      txts.push(txt);
      var html = '<tr><td><div style="height:15px;width:20px;border:1px solid black;background-color:' + colors[i] + '"></div></td><td align="left">'+ txt +'</td></tr>';
      table.append(html);
    }
    div.draggable().show();
    
    return txts;
  },
  
  GetJSON : function(url, successHandler, errorHandler) {
    var xhr = new XMLHttpRequest();
    xhr.open('get', url, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
      var status = xhr.status;
      if (status == 200) {
        successHandler && successHandler(xhr.response);
      } else {
        errorHandler && errorHandler(status);
      }
    };
    xhr.send();
  },

  popFrame : function(url, newWindow) {
    if (newWindow==true) {
      window.open(
        url,
        "_blank",
        "titlebar=no,toolbar=no,location=no,width=900, height=700, scrollbars=yes"
      );
      return;
    }
    var uuid = this.guid();
    var main = $('<div/>', {
      class:'popup-frame',
      id: uuid,
    });
    var closeBtn = $('<div/>', {class:'popup-close'}).click(function(){
      $(this).parent().remove();
    });
    main.draggable().resizable();
    main.resize(function() {
        $('#tool-menu-arrow, #dialog-arrow, .ui-dialog').hide();
    });
    closeBtn.appendTo(main);
    var frame = $('<iframe />', {
      width: '100%',
      height: '100%',
      src: url,
      scrolling: 'no',
      frameborder: 0,
    });
    frame.appendTo(main);
    main.appendTo($('body'));
    main.css({ 
      position: 'fixed',
      left: 100 + Math.random() * 20, 
      top: 100 + Math.random() * 20,
    });
    main.show();
    return uuid;
  },
  
  map2vizJson : function() {
  },
  
};

});
