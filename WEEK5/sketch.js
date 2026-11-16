/* 
 * Week 5 - Computer Vision
  I wanted it to be like wiping blood on the screen hence the droplet shape and the colours of red
  I am scared of real blood so having a fake one on screen is fun
 */

var camera;
var prevImg;
var currImg;
var diffImg;
var spotImg;
var threshold = 0.2; // *** change sensitivity (decimal between 0 - 1)
var grid;
let img;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  camera = createCapture(VIDEO, { flipped: true });
  camera.hide();

  grid = new Grid(1280, 720);
}

function draw() {
  background(120);
  image(camera, 0, 0, 1280, 720);
  camera.loadPixels();

  var smallW = camera.width / 4;
  var smallH = camera.height / 4;

  currImg = createImage(smallW, smallH);
  currImg.copy(camera, 0, 0, camera.width, camera.height, 0, 0, smallW, smallH);
  currImg.filter("gray");
  currImg.filter("blur", 2);

  diffImg = createImage(smallW, smallH);

  spotImg = createImage(smallW / 2, smallH / 2);
  spotImg.copy(
    camera,
    0,
    0,
    camera.width,
    camera.height,
    0,
    0,
    smallW / 2,
    smallH / 2
  );
  spotImg.filter("gray");

  if (typeof prevImg !== "undefined") {
    currImg.loadPixels();
    prevImg.loadPixels();
    diffImg.loadPixels();
    spotImg.loadPixels();

    for (var x = 0; x < currImg.width; x += 1) {
      for (var y = 0; y < currImg.height; y += 1) {
        var index = (x + y * currImg.width) * 4;
        var redCurr = currImg.pixels[index];
        var redPrev = prevImg.pixels[index];
        var d = abs(redCurr - redPrev);

        diffImg.pixels[index + 0] = d;
        diffImg.pixels[index + 1] = d;
        diffImg.pixels[index + 2] = d;
        diffImg.pixels[index + 3] = 255;
      }
    }

    diffImg.updatePixels();
  }

  prevImg = createImage(smallW, smallH);
  prevImg.copy(
    currImg,
    0,
    0,
    currImg.width,
    currImg.height,
    0,
    0,
    smallW,
    smallH
  );

  diffImg.filter("threshold", threshold);

  image(currImg, 1280, 0);
  image(diffImg, 1280, currImg.height);

  grid.update(diffImg);
}

function mousePressed() {
  threshold = map(mouseX, 0, 1280, 0, 1);
  console.log(threshold);
}

var Grid = function (_w, _h) {
  this.diffImg = 0;
  this.noteWidth = 15; // *** change spacing between each point
  this.worldWidth = _w;
  this.worldHeight = _h;
  this.numOfNotesX = int(this.worldWidth / this.noteWidth);
  this.numOfNotesY = int(this.worldHeight / this.noteWidth);
  this.arrayLength = this.numOfNotesX * this.numOfNotesY;
  this.noteStates = new Array(this.arrayLength).fill(0);
  console.log(this);
  console.log(_w, _h);

  // gradient runs from colourA (left) to colourB (right)
  this.colourA = color(189, 38, 21);
  this.colourB = color(255, 141, 128, 120);

  // *** fade settings
  this.HOLD = 0.6;       // extra time a shape stays solid before fading (0 = fade straight away)
  this.FADE_MIN = 0.015; // slowest fade 
  this.FADE_MAX = 0.06;  // fastest fade

  // every shape gets its own fade speed and size, so they don't all vanish in sync
  this.fadeRates = [];
  this.sizeJitter = [];
  for (var i = 0; i < this.arrayLength; i++) {
    this.fadeRates.push(random(this.FADE_MIN, this.FADE_MAX));
    this.sizeJitter.push(random(0.8, 1.2));
  }

  this.update = function (_img) {
    this.diffImg = _img;
    this.diffImg.loadPixels();

    for (var x = 0; x < this.diffImg.width; x += 1) {
      for (var y = 0; y < this.diffImg.height; y += 1) {
        var index = (x + y * this.diffImg.width) * 4;
        var state = diffImg.pixels[index + 0];

        if (state == 255) {
          var screenX = map(x, 0, this.diffImg.width, 0, this.worldWidth);
          var screenY = map(y, 0, this.diffImg.height, 0, this.worldHeight);
          var noteIndexX = int(screenX / this.noteWidth);
          var noteIndexY = int(screenY / this.noteWidth);
          var noteIndex = noteIndexX + noteIndexY * this.numOfNotesX;
          this.noteStates[noteIndex] = 1 + this.HOLD;   // above 1 = stays solid for a moment
        }
      }
    }

    // fade each point at its own speed
    for (var i = 0; i < this.arrayLength; i++) {
      this.noteStates[i] -= this.fadeRates[i];
      this.noteStates[i] = constrain(this.noteStates[i], 0, 1 + this.HOLD);
    }

    this.draw();
  };

  this.draw = function () {
    push();
    noStroke();
    var baseW = camera.width / 20;
    var baseH = camera.height / 20;

    for (var x = 0; x < this.numOfNotesX / 2; x++) {
      for (var y = 0; y < this.numOfNotesY / 2; y++) {
        var posX = this.noteWidth / 2 + 2 * x * this.noteWidth;
        var posY = this.noteWidth / 2 + 2 * y * this.noteWidth;
        var noteIndex = x + y * this.numOfNotesX;

        if (this.noteStates[noteIndex] > 0) {
          var life = min(1, this.noteStates[noteIndex]);   // 1 = fully visible, 0 = gone

          // gradient colour from left to right, made see-through as it fades
          var t = posX / this.worldWidth;
          var c = lerpColor(this.colourA, this.colourB, t);
          c.setAlpha(alpha(c) * life * life);              // life * life = softer fade-out
          fill(c);

          // shapes shrink a little as they fade, each with its own size
          var s = (0.5 + 0.5 * life) * this.sizeJitter[noteIndex];
          var w = baseW * s;
          var h = baseH * s;

          // Teardrop shape
          beginShape();
          vertex(posX, posY - h / 2); // Sharp top tip
          bezierVertex(posX + w / 2, posY - h / 6, posX + w / 2, posY + h / 2, posX, posY + h / 2); // Right bulb
          bezierVertex(posX - w / 2, posY + h / 2, posX - w / 2, posY - h / 6, posX, posY - h / 2); // Left bulb back to tip
          endShape(CLOSE);
        }
      }
    }
    pop();
  };
};