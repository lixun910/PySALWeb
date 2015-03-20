jQuery.download = function(url, data, method) {
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
    };
}

jQuery.GetTextsFromObjs = function(objs) {
  var texts = [];
  objs.each(function(i, obj){
    if (obj.className != "placeholder") {
      texts.push($(obj).text());
    }
  });
  return texts;
}

jQuery.GetValsFromObjs = function(objs) {
  var vals = [];
  objs.each(function(i, obj){
    if (obj.className != "placeholder") {
      vals.push($(obj).val());
    }
  });
  return vals;
}

function shrinkText(text, maxlength) {
  if (!maxlength) maxlength = 18;
  if (text.length > maxlength) {
    text = text.slice(0, maxlength -2);
    return text + "...";
  } 
  return text;
}

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16)
               .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
         s4() + '-' + s4() + s4() + s4();
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == undefined ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function getFileName(url) {
    return url.substring(url.lastIndexOf('/')+1);
}

function getSuffix(path) {
    return path.substring(path.lastIndexOf('.')+1);
}

function getName(path) {
    return path.substring(0, path.lastIndexOf('.'));
}

function getFileNameNoExt(url) {
    return getName(getFileName(url));
}

function sortKeys(dict) {
  var field_names = [];
  for ( var key in fields ){
    field_names.push(key); 
  }
  field_names.sort();
}

function isValidEmailAddress(emailAddress) {
    var pattern = new RegExp(/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i);
    return pattern.test(emailAddress);
};

function exportTableToCSV($table, filename) {

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

    $(this)
        .attr({
        'download': filename,
            'href': csvData,
            'target': '_blank'
    });
}

function create_legend(div, bins, colors) {
  div.empty();
  div.append('<table></table>');
  var table = div.children();
  for (var i=0, n = bins.length; i < n; i++) {
    var txt = "";
    if (typeof bins[i] == 'string' || bins[i] instanceof String) {
        txt = bins[i];
    } else {
        var lower, upper = bins[i].toFixed(2);
        if (i > 0) {
          lower = bins[i-1].toFixed(2);
        }
        txt = lower ? "(" + lower + ", " + upper + "]" : "<=" + upper;
    }
    var html = '<tr><td><div style="height:15px;width:20px;border:1px solid black;background-color:' + colors[i] + '"></div></td><td align="left">'+ txt +'</td></tr>';
    table.append(html);
  }
  div.draggable().show();
}


var GetJSON = function(url, successHandler, errorHandler) {
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
};

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};
