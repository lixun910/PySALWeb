

define(function(){

var _getColorPalette = function(config) {
  var gradientConfig = { 0.25: "rgb(0,0,255)", 0.55: "rgb(0,255,0)", 0.85: "yellow", 1.0: "rgb(255,0,0)"};
  var paletteCanvas = document.createElement('canvas');
  var paletteCtx = paletteCanvas.getContext('2d');

  paletteCanvas.width = 256;
  paletteCanvas.height = 1;

  var gradient = paletteCtx.createLinearGradient(0, 0, 256, 1);
  for (var key in gradientConfig) {
    gradient.addColorStop(key, gradientConfig[key]);
  }

  paletteCtx.fillStyle = gradient;
  paletteCtx.fillRect(0, 0, 256, 1);

  return paletteCtx.getImageData(0, 0, 256, 1).data;
};

var _getPointTemplate = function(radius, blurFactor) {
  radius = 30;
  blurFactor = 0.45;
  var tplCanvas = document.createElement('canvas');
  var tplCtx = tplCanvas.getContext('2d');
  var x = radius;
  var y = radius;
  tplCanvas.width = tplCanvas.height = radius*2;

  if (blurFactor == 1) {
    tplCtx.beginPath();
    tplCtx.arc(x, y, radius, 0, 2 * Math.PI, false);
    tplCtx.fillStyle = 'rgba(0,0,0,1)';
    tplCtx.fill();
  } else {
    var gradient = tplCtx.createRadialGradient(x, y, radius*blurFactor, x, y, radius);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    tplCtx.fillStyle = gradient;
    tplCtx.fillRect(0, 0, 2*radius, 2*radius);
  }
  return tplCanvas;
};
 
var Canvas2dRenderer = function(canvas) {
  var shadowCanvas = this.shadowCanvas = document.createElement('canvas');
  var renderBoundaries = this._renderBoundaries = [10000, 10000, 0, 0];

  this._width = canvas.width;
  this._height = canvas.height;
  shadowCanvas.width = this._width;
  shadowCanvas.height = this._height;

  this.shadowCtx = shadowCanvas.getContext('2d');
  this.ctx = canvas.getContext('2d');

  this._palette = _getColorPalette();
  this._templates = {};

    this._blur = 0.25;
    this._opacity = 0.1;
    this._maxOpacity = 0.5;
    this._minOpacity = 0;
    this._useGradientOpacity = true;
};

Canvas2dRenderer.prototype = {
  renderPartial: function(data) {
    this._drawAlpha(data);
    this._colorize();
  },
  renderAll: function(data) {
    // reset render boundaries
    this._clear();
    this.data = data; //
    this._drawAlpha(data);
    this._colorize();
  },
  setDimensions: function(width, height) {
    this._width = width;
    this._height = height;
    this.canvas.width = this.shadowCanvas.width = width;
    this.canvas.height = this.shadowCanvas.height = height;
  },
  _clear: function() {
    this.shadowCtx.clearRect(0, 0, this._width, this._height);
    this.ctx.clearRect(0, 0, this._width, this._height);
  },
  _drawAlpha: function(data) {
    var min = this._min = 0;//data.min;
    var max = this._max = 1;//data.max;
    
    var dataLen = data.length;
    
    // on a point basis?
    var blur = 1 - this._blur;

    while(dataLen--) {

      var point = data[dataLen];

      var x = point[0];
      var y = point[1];
      var radius = 20;//point.radius;
      // if value is bigger than max
      // use max as value
      var value = 1;//Math.min(value, max);
      var rectX = x - radius;
      var rectY = y - radius;
      var shadowCtx = this.shadowCtx;

      var tpl;
      if (!this._templates[radius]) {
        this._templates[radius] = tpl = _getPointTemplate(radius, blur);
      } else {
        tpl = this._templates[radius];
      }
      // value from minimum / value range
      // => [0, 1]
      shadowCtx.globalAlpha = 0.04;//(value-min)/(max-min);

      shadowCtx.drawImage(tpl, rectX, rectY);

      // update renderBoundaries
      if (rectX < this._renderBoundaries[0]) {
          this._renderBoundaries[0] = rectX;
        } 
        if (rectY < this._renderBoundaries[1]) {
          this._renderBoundaries[1] = rectY;
        }
        if (rectX + 2*radius > this._renderBoundaries[2]) {
          this._renderBoundaries[2] = rectX + 2*radius;
        }
        if (rectY + 2*radius > this._renderBoundaries[3]) {
          this._renderBoundaries[3] = rectY + 2*radius;
        }

    }
  },
  _colorize: function() {
    var x = this._renderBoundaries[0];
    var y = this._renderBoundaries[1];
    var width = this._renderBoundaries[2] - x;
    var height = this._renderBoundaries[3] - y;
    var maxWidth = this._width;
    var maxHeight = this._height;
    var opacity = this._opacity;
    var maxOpacity = this._maxOpacity;
    var minOpacity = this._minOpacity;
    var useGradientOpacity = this._useGradientOpacity;

    if (x < 0) {
      x = 0;
    }
    if (y < 0) {
      y = 0;
    }
    if (x + width > maxWidth) {
      width = maxWidth - x;
    }
    if (y + height > maxHeight) {
      height = maxHeight - y;
    }

    var img = this.shadowCtx.getImageData(x, y, width, height);
    var imgData = img.data;
    var len = imgData.length;
    var palette = this._palette;


    for (var i = 3; i < len; i+= 4) {
      var alpha = imgData[i];
      var offset = alpha * 4;


      if (!offset) {
        continue;
      }

      var finalAlpha;
      if (opacity > 0) {
        finalAlpha = opacity;
      } else {
        if (alpha < maxOpacity) {
          if (alpha < minOpacity) {
            finalAlpha = minOpacity;
          } else {
            finalAlpha = alpha;
          }
        } else {
          finalAlpha = maxOpacity;
        }
      }

      imgData[i-3] = palette[offset];
      imgData[i-2] = palette[offset + 1];
      imgData[i-1] = palette[offset + 2];
      imgData[i] = useGradientOpacity ? palette[offset + 3] : finalAlpha;

    }

    img.data = imgData;
    this.ctx.putImageData(img, x, y);

    this._renderBoundaries = [1000, 1000, 0, 0];

  },
  getValueAt: function(point) {
    var value;
    var shadowCtx = this.shadowCtx;
    var img = shadowCtx.getImageData(point[0], point[1], 1, 1);
    var data = img.data[3];
    var max = this._max;
    var min = this._min;

    value = (Math.abs(max-min) * (data/255)) >> 0;

    return value;
  },
  getDataURL: function() {
    return this.canvas.toDataURL();
  }
};


return Canvas2dRenderer;

});