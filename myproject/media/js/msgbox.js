var ShowMsgBox = function(title, content) {
  $("#msg-title").text(title);
  $("#msg-content").text(content);
  $('#dlg-msg').dialog('open');
};
