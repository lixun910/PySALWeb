
(function(window,undefined){

  /***
   * CartoDB instance: setup/download/upload/query
   */
  var cartolx = function(winID, userid, key, socket) {
    this.winID = winID; 
    this.userid = userid;
    this.key = key;
    this.socket = socket;
    
    this.dataDict = {};
    self = this;
  };
 
  cartolx.prototype.GetJSON = function(url, successHandler, errorHandler) {
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

  cartolx.prototype.GetAllTables = function(uid, key, successHandler) {
    var msg = {"command":"cartodb_get_all_tables"};
    if (uid) msg["wid"] = this.winID;
    if (uid) msg["uid"] = uid;
    if (key) msg["key"] = key;
    if (this.socket && this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(msg));
      this.callback_GetAllTables = successHandler;
    } else {
      setTimeout(function(){self.GetAllTables(uid, key, successHandler)}, 10);
    }
  };
  
  cartolx.prototype.DownloadTable = function(uid, key, table_name, successHandler) {
    var msg = {"command":"cartodb_download_table"};
    if (uid) msg["wid"] = this.winID;
    if (uid) msg["uid"] = uid;
    if (key) msg["key"] = key;
    if (key) msg["table_name"] = table_name;
    if (this.socket && this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(msg));
      this.callback_DownloadTable = successHandler;
    } else {
      setTimeout(function(){self.DownloadTable(uid, key, successHandler)}, 10);
    }
  };
  
  /**
   * Setup WebSocket Server Communications
  */
  cartolx.prototype.SetupWebSocket = function(server_addr) {
    if (! ("WebSocket" in window)) WebSocket = MozWebSocket; // firefox
    this.socket = new WebSocket("ws://127.0.0.1:9000");
    var socket = this.socket;
    socket.onopen = function(event) {
      //socket.send('{connected:'+ pageid + '}');
      var msg, command, winID, addMsg, rspMsg;
      socket.onmessage = function(e) {
        try {
          msg = JSON.parse(e.data);
          command = msg.command;  
          winID = msg.wid;
          
          if ( command == "request_params" && self.id == winID) {
            if (typeof self.callback_RequestParam === "function") {
              self.callback_RequestParam(msg.parameters);
            }
          } else if ( command == "rsp_cartodb_get_all_tables" && self.id == winID) {
            self.callback_GetAllTables(msg);
          } else if ( command == "rsp_cartodb_download_table" && self.id == winID) {
            self.callback_DownloadTable(msg);
          } 
        } catch (err) {
          console.error("Parsing server msg error:", msg, err);            
        }
      };
    };
  };
 
  // End and expose cartolx to 'window'
  window["cartolx"] = cartolx;
})(self);
