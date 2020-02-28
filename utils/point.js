export default class Point {
  constructor(x, y, time) {
    this.x = x;
    this.y = y;
    this.time = time || Date.now();
  }
  distanceTo(start) {
    return Math.sqrt(Math.pow(this.x - start.x, 2) + Math.pow(this.y - start.y, 2));
  }
  equals(other) {
    return this.x === other.x && this.y === other.y && this.time === other.time;
  }
  velocityFrom(start) {
    return (this.time !== start.time) ? this.distanceTo(start) / (this.time - start.time) : 0;
  }
}
