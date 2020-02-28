/**
 * The main idea and some parts of the code (e.g. drawing variable width Bézier curve) are taken from:
 * http://corner.squareup.com/2012/07/smoother-signatures.html
 *
 * Implementation of interpolation using cubic Bézier curves is taken from:
 * http://www.benknowscode.com/2012/09/path-interpolation-using-cubic-bezier_9742.html
 *
 * Algorithm for approximated length of a Bézier curve is taken from:
 * http://www.lemoda.net/maths/bezier-length/index.html
 */

import Bezier from './bezier';
import Point from './point';
import throttle from './throttle';


export default class SignaturePad {
  constructor(options = {}) {
    // this.canvas = canvas;
    this.options = options;
    
    this.velocityFilterWeight = options.velocityFilterWeight || 0.7;
    this.minWidth = options.minWidth || 0.5;
    this.maxWidth = options.maxWidth || 2.5;
    this.throttle = ('throttle' in options ? options.throttle : 16);
    this.minDistance = ('minDistance' in options ? options.minDistance : 5);
    if (this.throttle) {
      this._strokeMoveUpdate = throttle(SignaturePad.prototype._strokeUpdate, this.throttle);
    }
    else {
      this._strokeMoveUpdate = SignaturePad.prototype._strokeUpdate;
    }
    this.dotSize = options.dotSize || function () {
      return (this.minWidth + this.maxWidth) / 2;
    };
    this.penColor = options.penColor || 'black';
    this.backgroundColor = options.backgroundColor || 'rgba(0,0,0,0)';
    this.onBegin = options.onBegin;
    this.onEnd = options.onEnd;
    // this._ctx = canvas.getContext('2d');
    // this.clear();
    // this.on();
  }

  init = (canvas) => {
    this.canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this.clear();
  }
  clear = () => {
    const ctx = this._ctx;
    const canvas = this.canvas;
    ctx.fillStyle = this.backgroundColor;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this._data = [];
    this._reset();
    this._isEmpty = true;
  }
  handleTouchStart = (event) => {
    // event.preventDefault();
    if (event.touches.length === 1) {
      const touch = event.changedTouches[0];
      this._strokeBegin(touch);
    }
  }
  handleTouchMove = (event) => {
    // event.preventDefault();
    const touch = event.touches[0];
    this._strokeMoveUpdate(touch);
  }
  handleTouchEnd = (event) => {
    const wasCanvasTouched = event.target === this.canvas;
    if (wasCanvasTouched) {
      // event.preventDefault();
      const touch = event.changedTouches[0];
      this._strokeEnd(touch);
    }
  }
  fromDataURL(dataUrl, options = {}, callback) {
    const image = new Image();
    const ratio = options.ratio || 1;
    const width = options.width || (this.canvas.width / ratio);
    const height = options.height || (this.canvas.height / ratio);
    this._reset();
    image.onload = () => {
      this._ctx.drawImage(image, 0, 0, width, height);
      if (callback) {
        callback();
      }
    };
    image.onerror = (error) => {
      if (callback) {
        callback(error);
      }
    };
    image.src = dataUrl;
    this._isEmpty = false;
  }
  // 微信小程序canvas对象没有toDataURL函数，需要使用小程序canvas对象的canvasGetImageData
  toDataURL(type = 'image/png', encoderOptions) {
    switch (type) {
      default:
        return this.canvas.toDataURL(type, encoderOptions);
    }
  }
  isEmpty() {
    return this._isEmpty;
  }
  fromData(pointGroups) {
    this.clear();
    this._fromData(pointGroups, ({ color, curve }) => this._drawCurve({ color, curve }), ({ color, point }) => this._drawDot({ color, point }));
    this._data = pointGroups;
  }
  toData() {
    return this._data;
  }
  _strokeBegin(event) {
    const newPointGroup = {
      color: this.penColor,
      points: [],
    };
    this._data.push(newPointGroup);
    this._reset();
    this._strokeUpdate(event);
    if (typeof this.onBegin === 'function') {
      this.onBegin(event);
    }
  }
  _strokeUpdate(event) {
    const x = event.x;
    const y = event.y;
    const point = this._createPoint(x, y);
    const lastPointGroup = this._data[this._data.length - 1];
    const lastPoints = lastPointGroup.points;
    const lastPoint = lastPoints.length > 0 && lastPoints[lastPoints.length - 1];
    const isLastPointTooClose = lastPoint ? point.distanceTo(lastPoint) <= this.minDistance : false;
    const color = lastPointGroup.color;
    if (!lastPoint || !(lastPoint && isLastPointTooClose)) {
      const curve = this._addPoint(point);
      if (!lastPoint) {
        this._drawDot({ color, point });
      }
      else if (curve) {
        this._drawCurve({ color, curve });
      }
      lastPoints.push({
        time: point.time,
        x: point.x,
        y: point.y,
      });
    }
  }
  _strokeEnd(event) {
    this._strokeUpdate(event);
    if (typeof this.onEnd === 'function') {
      this.onEnd(event);
    }
  }
  _reset() {
    this._lastPoints = [];
    this._lastVelocity = 0;
    this._lastWidth = (this.minWidth + this.maxWidth) / 2;
    this._ctx.fillStyle = this.penColor;
  }
  _createPoint(x, y) {
    // const rect = this._ctx.canvas.getBoundingClientRect();
    const rect = {
      left: this.canvas._left,
      top: this.canvas._top,
    }
    return new Point(x - rect.left, y - rect.top, new Date().getTime());
  }
  _addPoint(point) {
    const { _lastPoints } = this;
    _lastPoints.push(point);
    if (_lastPoints.length > 2) {
      if (_lastPoints.length === 3) {
        _lastPoints.unshift(_lastPoints[0]);
      }
      const widths = this._calculateCurveWidths(_lastPoints[1], _lastPoints[2]);
      const curve = Bezier.fromPoints(_lastPoints, widths);
      _lastPoints.shift();
      return curve;
    }
    return null;
  }
  _calculateCurveWidths(startPoint, endPoint) {
    const velocity = (this.velocityFilterWeight * endPoint.velocityFrom(startPoint))
      + ((1 - this.velocityFilterWeight) * this._lastVelocity);
    const newWidth = this._strokeWidth(velocity);
    const widths = {
      end: newWidth,
      start: this._lastWidth,
    };
    this._lastVelocity = velocity;
    this._lastWidth = newWidth;
    return widths;
  }
  _strokeWidth(velocity) {
    return Math.max(this.maxWidth / (velocity + 1), this.minWidth);
  }
  _drawCurveSegment(x, y, width) {
    const ctx = this._ctx;
    ctx.moveTo(x, y);
    ctx.arc(x, y, width, 0, 2 * Math.PI, false);
    this._isEmpty = false;
  }
  _drawCurve({ color, curve }) {
    const ctx = this._ctx;
    const widthDelta = curve.endWidth - curve.startWidth;
    const drawSteps = Math.floor(curve.length()) * 2;
    ctx.beginPath();
    ctx.fillStyle = color;
    for (let i = 0; i < drawSteps; i += 1) {
      const t = i / drawSteps;
      const tt = t * t;
      const ttt = tt * t;
      const u = 1 - t;
      const uu = u * u;
      const uuu = uu * u;
      let x = uuu * curve.startPoint.x;
      x += 3 * uu * t * curve.control1.x;
      x += 3 * u * tt * curve.control2.x;
      x += ttt * curve.endPoint.x;
      let y = uuu * curve.startPoint.y;
      y += 3 * uu * t * curve.control1.y;
      y += 3 * u * tt * curve.control2.y;
      y += ttt * curve.endPoint.y;
      const width = curve.startWidth + (ttt * widthDelta);
      this._drawCurveSegment(x, y, width);
    }
    ctx.closePath();
    ctx.fill();
  }
  _drawDot({ color, point }) {
    const ctx = this._ctx;
    const width = typeof this.dotSize === 'function' ? this.dotSize() : this.dotSize;
    ctx.beginPath();
    this._drawCurveSegment(point.x, point.y, width);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  _fromData(pointGroups, drawCurve, drawDot) {
    for (const group of pointGroups) {
      const { color, points } = group;
      if (points.length > 1) {
        for (let j = 0; j < points.length; j += 1) {
          const basicPoint = points[j];
          const point = new Point(basicPoint.x, basicPoint.y, basicPoint.time);
          this.penColor = color;
          if (j === 0) {
            this._reset();
          }
          const curve = this._addPoint(point);
          if (curve) {
            drawCurve({ color, curve });
          }
        }
      }
      else {
        this._reset();
        drawDot({
          color,
          point: points[0],
        });
      }
    }
  }
}