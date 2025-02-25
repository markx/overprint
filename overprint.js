var overprint = (function (exports) {
  'use strict';

  const Char = {};

  Char.WHITE_SMILING_FACE = '☺';
  Char.BLACK_SMILING_FACE = '☻';
  Char.BLACK_HEART_SUIT = '♥';
  Char.BLACK_DIAMOND_SUIT = '♦';
  Char.BLACK_CLUB_SUIT = '♣';
  Char.BLACK_SPADE_SUIT = '♠';
  Char.BULLET = '•';
  Char.INVERSE_BULLET = '◘';
  Char.WHITE_CIRCLE = '○';
  Char.INVERSE_WHITE_CIRCLE = '◙';
  Char.MALE_SIGN = '♂';
  Char.FEMALE_SIGN = '♀';
  Char.EIGHTH_NOTE = '♪';
  Char.BEAMED_EIGHTH_NOTES = '♫';
  Char.WHITE_SUN_WITH_RAYS = '☼';

  Char.NULL = ' ';
  Char.SPACE = ' ';
  Char.AMPERSAND = '&';
  Char.DOT = '.';
  Char.FULL_STOP = '.';
  Char.PLUS = '+';
  Char.MINUS = '-';
  Char.HASH = '#';
  Char.DOLLAR = '$';
  Char.PERCENT = '%';
  Char.CARET = '^';
  Char.ASTERISK = '*';
  Char.TILDE = '~';
  Char.LEFT_PARENS = '(';
  Char.RIGHT_PARENS = ')';
  Char.LEFT_BRACKET = '[';
  Char.RIGHT_BRACKET = ']';
  Char.AT = '@';

  const Color = {
    BLACK: '#000',
    WHITE: '#fff'
  };

  const Cell = function(character, foregroundColor, backgroundColor) {
  	return {
  		character: character || Char.NULL,
  		foregroundColor: foregroundColor || Color.WHITE,
  		backgroundColor: backgroundColor || Color.BLACK
  	}
  };

  Cell.blank = function(backgroundColor) {
    return Cell(false, false, backgroundColor);
  };

  const Font$1 = function(family, weight, size) {
  	return {
  		family: family || 'monospace',
  		weight: weight || 'normal',
  		size: size || 16,
  		toCSS: function() {
  			return this.weight + ' '+ this.size +'px ' + this.family;
  		}
  	}
  };

  const Glyph = function(character, color, bgColor) {
  	return {
  		char: character || Char.NULL,
  		color: color || Color.WHITE,
  		bgColor: bgColor || Color.BLACK
  	}
  };

  function fillArray2D(width, height, fill) {
    const list = new Array(width);
    for (let col=0; col<width; col++) {
      list[col] = new Array(height);
      for (let row=0; row<height; row++) {
        list[col][row] = fill;
      }
    }
    return list;
  }

  class DisplayState {
    constructor(width, height) {
      this._width = width;
    	this._height = height;

      this._renderedCells = fillArray2D(width, height, null);
    	this._updatedCells = fillArray2D(width, height, null);

    	this._dirty = true;
    }

    setCharacter(x, y, character) {
      if (x < 0) return;
      if (x >= this._width) return;
      if (y < 0) return;
      if (y >= this._height) return;

      if (!character) return;

      if (this._renderedCells[x][y].character != character) {
        const foregroundColor = this._updatedCells[x][y].foregroundColor || this._renderedCells[x][y].foregroundColor;
        const backgroundColor = this._updatedCells[x][y].backgroundColor || this._renderedCells[x][y].backgroundColor;
        this._updatedCells[x][y] = {
          character,
          foregroundColor,
          backgroundColor
        };
        this._dirty = true;
      } else {
        this._updatedCells[x][y] = null;
      }
    }

    setCell(x, y, cell) {
    	if (x < 0) return;
    	if (x >= this._width) return;
    	if (y < 0) return;
    	if (y >= this._height) return;

    	if (this._renderedCells[x][y] !== cell) {
    		this._updatedCells[x][y] = cell;
    		this._dirty = true;
    	} else {
    		this._updatedCells[x][y] = null;
    	}
    }

    getCell(x, y) {
      if (x < 0) return;
    	if (x >= this._width) return;
    	if (y < 0) return;
    	if (y >= this._height) return;

      return this._updatedCells[x][y] || this._renderedCells[x][y];
    }

    render(callback) {
    	if (!this._dirty) return;
      let cell;

    	for (let col=0; col<this._width; col++) {
    		for (let row=0; row<this._height; row++) {
    			cell = this._updatedCells[col][row];

    			if (cell == null) continue;

    			callback(col, row, cell);

    			this._renderedCells[col][row] = cell;
    			this._updatedCells[col][row] = null;
    		}
    	}
    }
  }

  const Terminal = function(width, height, canvas, font, isResponsive, forceSquare) {
  	this._width = width;
  	this._height = height;
  	this._canvas = canvas;
  	this._font = font || Font();
  	this._responsive = isResponsive ? true : false;
  	this._squared = forceSquare ? true : false;

  	this._context = this._canvas.getContext('2d');

  	this._ratio = window.devicePixelRatio || 1;

  	this._context.font = this._font.toCSS();

  	this.resetLayout();

  	var cell = this._emptyCell = Glyph();
  	this._display = new DisplayState(width, height, cell);
  };

  Terminal.prototype.resetLayout = function() {
  	if (this._responsive) {
  		// Calculates the dimensions of the containing element first
  		if (!this._canvas.style.width) this._canvas.style.width = 640;
  		if (!this._canvas.style.height) this._canvas.style.height = 480;

  		var elementWidth = parseInt(this._canvas.style.width, 10)  * this._ratio;
  		var elementHeight = parseInt(this._canvas.style.height, 10) * this._ratio;

  		// Calculates cell width and height based on the containing element
  		this._cellWidth = Math.floor(elementWidth / this._width);
  		this._cellHeight = Math.floor(elementHeight / this._height);

  		// Force square aspect ratio
  		if (this._squared) {
  			this._cellWidth = this._cellHeight = Math.max(this._cellWidth, this._cellHeight);
  		}

  		this._canvas.width = elementWidth;
  		this._canvas.height = elementHeight;

  	} else {
  		// Measure text width from canvas context
  		var textMeasure = this._context.measureText("M");

  		// Canvas measure text with direct multiple of font size
  		var textWidth = Math.ceil(textMeasure.width);
  		var textHeight = this._font.size;

  		// Force square aspect ratio
  		if (this._squared) {
  			textWidth = textHeight = Math.max(textWidth, textHeight);
  		}

  		var glyphWidth = textWidth;
  		var glyphHeight = textHeight;

  		this._cellWidth = glyphWidth * this._ratio;
  		this._cellHeight = glyphHeight * this._ratio;

  		var drawWidth = glyphWidth * this._width;
  		var drawHeight = glyphHeight * this._height;

  		this._canvas.width = drawWidth * this._ratio;
  		this._canvas.height = drawHeight * this._ratio;

  		this._canvas.style.width = drawWidth;
  		this._canvas.style.height = drawHeight;
  	}

  	this._font.size = this._font.size * this._ratio;
  	this._context.font = this._font.toCSS();
  	this._context.textAlign = 'center';
  	this._context.textBaseline = 'middle';
  };

  Terminal.prototype.clear = function(glyph) {
  	var bgGlyph = glyph ? glyph : this._emptyCell;
  	for (var col=0; col<this._width; col++) {
  		for (var row=0; row<this._height; row++) {
  			this._display.setCell(col, row, bgGlyph);
  		}
  	}
  };

  Terminal.prototype.fill = function(glyph) {
  	this.clear(glyph);
  };

  Terminal.prototype.writeGlyph = function(x, y, glyph) {
  	this._display.setCell(x, y, glyph);
  };

  Terminal.prototype.writeText = function(x, y, text) {
  	var cursorPosition = 0;
  	var endPosition = this._width - x;

  	while (cursorPosition <= endPosition) {
  		var textGlyph = Glyph(text[cursorPosition]);
  		this._display.setCell(cursorPosition + x, y, textGlyph);
  		cursorPosition++;
  	}
  };

  Terminal.prototype.render = function() {
  	this._display.render(function(x, y, glyph){
  		var cellWidth = this._cellWidth;
  		var cellHeight = this._cellHeight;

  		this._context.fillStyle = glyph.bgColor;
  		this._context.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);

  		if (glyph.char == Char.NULL) return;

  		this._context.fillStyle = glyph.color;

  		var xPos = (x * cellWidth) + cellWidth / 2;
  		var yPos = (y * cellHeight) + cellHeight / 2;
  		this._context.fillText(glyph.char, xPos, yPos);
  	}.bind(this));
  };

  Terminal.prototype.pxToCell = function(ev) {
  	var bounds = this._canvas.getBoundingClientRect();
  	var relativeX = ev.clientX - bounds.left;
  	var relativeY = ev.clientY - bounds.top;
  	var colPos = Math.trunc(relativeX / this._cellWidth * this._ratio);
  	var rowPos = Math.trunc(relativeY / this._cellHeight * this._ratio);
  	return [colPos, rowPos];
  };

  Terminal.prototype.onClick = function(cb) {
  	this._canvas.addEventListener('click', function(ev) {
  		var cell = this.pxToCell(ev);
  		cb(cell[0], cell[1]);
  	}.bind(this));
  };

  Terminal.prototype.onMouseMove = function(cb) {
  	this._canvas.addEventListener('mousemove', function(ev) {
  		var cell = this.pxToCell(ev);
  		cb(cell[0], cell[1]);
  	}.bind(this));
  };

  const CodePage = {
    [Char.NULL]: 0,
    [Char.WHITE_SMILING_FACE]: 1,
    [Char.BLACK_SMILING_FACE]: 2,
    [Char.BLACK_HEART_SUIT]: 3,
    [Char.BLACK_SPADE_SUIT]: 4,
    [Char.BLACK_CLUB_SUIT]: 5,
    [Char.BLACK_SPADE_SUIT]: 6,
    [Char.BULLET]: 7,
    [Char.INVERSE_BULLET]: 8,
    [Char.WHITE_CIRCLE]: 9,
    [Char.INVERSE_WHITE_CIRCLE]: 10,
    [Char.MALE_SIGN]: 11,
    [Char.FEMALE_SIGN]: 12,
    [Char.EIGHTH_NOTE]: 13,
    [Char.BEAMED_EIGHTH_NOTES]: 14,
    [Char.WHITE_SUN_WITH_RAYS]: 15
  };

  const BitmapTerminal = function(width, height, canvas, atlas, tileWidth, tileHeight) {
  	this._atlas = atlas;
  	this._width = width;
  	this._height = height;
  	this._canvas = canvas;
  	this._tileWidth = tileWidth;
  	this._tileHeight = tileHeight;
  	this._context = this._canvas.getContext('2d');
  	this._ratio = window.devicePixelRatio || 1;
  	this.resetLayout();
  	var cell = this._emptyCell = Glyph();
  	this._display = new DisplayState(width, height, cell);
  };

  BitmapTerminal.prototype.resetLayout = function() {
  	var glyphWidth = this._tileWidth;
  	var glyphHeight = this._tileHeight;

  	this._cellWidth = glyphWidth * this._ratio;
  	this._cellHeight = glyphHeight * this._ratio;

  	var drawWidth = glyphWidth * this._width;
  	var drawHeight = glyphHeight * this._height;

  	this._canvas.width = drawWidth * this._ratio;
  	this._canvas.height = drawHeight * this._ratio;

  	this._canvas.style.width = drawWidth;
  	this._canvas.style.height = drawHeight;
  };

  BitmapTerminal.prototype.writeGlyph = function(x, y, glyph) {
  	this._display.setCell(x, y, glyph);
  };

  BitmapTerminal.prototype.render = function() {
  	this._display.render(function(x, y, glyph){

  		this._context.fillStyle = glyph.bgColor;
  		this._context.fillRect(
  			Math.round(x * this._tileWidth),
  			Math.round(y * this._tileHeight),
  			this._tileWidth,
  			this._tileHeight
  		);

  		if (glyph.char == Char.NULL) return;

      var codePoint = CodePage[glyph.char] || glyph.char;
      var glyphX = codePoint % this._atlas.rowLength;
      var glyphY = Math.trunc(codePoint / this._atlas.rowLength);

  		this._context.drawImage(
  			this._atlas.image,
  			glyphX * this._atlas.width * this._ratio,
  			glyphY * this._atlas.height * this._ratio,
  			this._atlas.width * this._ratio,
  			this._atlas.height * this._ratio,
  			Math.round(x * this._tileWidth),
  			Math.round(y * this._tileHeight),
  			this._tileWidth,
  			this._tileHeight
  		);
  	}.bind(this));
  };

  class BitmapFont {
  	constructor(imagePath, width, height, rowLength) {
  		this.width = width;
  		this.height = height;
  	  this.rowLength = rowLength;
  		this.image = new Image();
  		this.image.addEventListener('load', function() {
  			if (this._onReady) this._onReady();
  		}.bind(this), false);
  		this.image.src = imagePath;
  	}

  	ready(onReady) {
  		this._onReady = onReady;
  	}
  }

  const defaultSettings = {
    width: 40,
    height: 30,
    font: Font$1(),
    emptyCell: Cell(),
    isResponsive: false,
    forceSquare: true
  };

  class TextGrid {
    constructor(canvas, settings) {
      const _settings = Object.assign(defaultSettings, { ...settings });
      this._width = _settings.width;
    	this._height = _settings.height;
    	this._font = _settings.font;
    	this._responsive = _settings.isResponsive;
    	this._squared = _settings.forceSquare;
      this._emptyCell = _settings.emptyCell;

      this._canvas = canvas;
      this._context = this._canvas.getContext('2d');
    	this._context.font = this._font.toCSS();

      this._ratio = window.devicePixelRatio || 1;
      this._display = new DisplayState(this._width, this._height);

      this.resetLayout();
      this.clear();
    }

    resetLayout() {
      if (this._responsive) {
    		// Calculates the dimensions of the containing element first
    		if (!this._canvas.style.width) this._canvas.style.width = 640;
    		if (!this._canvas.style.height) this._canvas.style.height = 480;

    		const elementWidth = parseInt(this._canvas.style.width, 10)  * this._ratio;
    		const elementHeight = parseInt(this._canvas.style.height, 10) * this._ratio;

    		// Calculates cell width and height based on the containing element
    		this._cellWidth = Math.floor(elementWidth / this._width);
    		this._cellHeight = Math.floor(elementHeight / this._height);

    		// Force square aspect ratio
    		if (this._squared) {
    			this._cellWidth = this._cellHeight = Math.max(this._cellWidth, this._cellHeight);
    		}

    		this._canvas.width = elementWidth;
    		this._canvas.height = elementHeight;

    	} else {
    		// Measure text width from canvas context
    		const textMeasure = this._context.measureText("M");

    		// Canvas measure text with direct multiple of font size
    		let textWidth = Math.ceil(textMeasure.width);
    		let textHeight = this._font.size;

    		// Force square aspect ratio
    		if (this._squared) {
    			textWidth = textHeight = Math.max(textWidth, textHeight);
    		}

    		this._cellWidth = textWidth * this._ratio;
    		this._cellHeight = textHeight * this._ratio;

    		const drawWidth = textWidth * this._width;
    		const drawHeight = textHeight * this._height;

    		this._canvas.width = drawWidth * this._ratio;
    		this._canvas.height = drawHeight * this._ratio;

        this._canvas.style.width = `${drawWidth}px`;
    		this._canvas.style.height = `${drawHeight}px`;
    	}

    	this._font.size = this._font.size * this._ratio;
    	this._context.font = this._font.toCSS();
    	this._context.textAlign = 'center';
    	this._context.textBaseline = 'middle';
    }

    get width() {
      return this._width;
    }

    get height() {
      return this._height;
    }

    clear() {
      this.fill(this._emptyCell);
    }

    fill(cell) {
      for (let col=0; col<this._width; col++) {
        for (let row=0; row<this._height; row++) {
          this._display.setCell(col, row, cell);
        }
      }
    }

    readCell(x, y) {
      return this._display.getCell(x, y);
    }

    writeCell(x, y, cell) {
      this._display.setCell(x, y, cell);
    }

    writeCharacter(x, y, character) {
      this._display.setCharacter(x, y, character);
    }

    render() {
      this._display.render((x, y, cell) => {
        const cellWidth = this._cellWidth;
        const cellHeight = this._cellHeight;

        this._context.fillStyle = cell.backgroundColor;
        this._context.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);

        if (cell.character == Char.NULL) return;

        this._context.fillStyle = cell.foregroundColor;

        const xPos = (x * cellWidth) + cellWidth / 2;
        const yPos = (y * cellHeight) + cellHeight / 2;
        this._context.fillText(cell.character, xPos, yPos);
      });
    }

    pxToCell(ev) {
    	const bounds = this._canvas.getBoundingClientRect();
    	const relativeX = ev.clientX - bounds.left;
    	const relativeY = ev.clientY - bounds.top;
    	const colPos = Math.trunc(relativeX / this._cellWidth * this._ratio);
    	const rowPos = Math.trunc(relativeY / this._cellHeight * this._ratio);
    	return [colPos, rowPos];
    }

    onClick(handler) {
      this._canvas.addEventListener('click', (ev) => {
        const cell = this.pxToCell(ev);
        handler(cell[0], cell[1]);
      });
    }

    onMouseMove(handler) {
      this._canvas.addEventListener('mousemove', (ev) => {
        const cell = this.pxToCell(ev);
        handler(cell[0], cell[1]);
      });
    }
  }

  exports.BitmapFont = BitmapFont;
  exports.BitmapTerminal = BitmapTerminal;
  exports.Cell = Cell;
  exports.Char = Char;
  exports.Color = Color;
  exports.Font = Font$1;
  exports.Glyph = Glyph;
  exports.Terminal = Terminal;
  exports.TextGrid = TextGrid;

  return exports;

}({}));
