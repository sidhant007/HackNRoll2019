var EDROPPER_VERSION = 11;
const CANVAS_MAX_SIZE = 32767 - 20
const DEBUG = false;

var colorArray = [], myWidth, myHeight;

//console.log($(document).width(), " : ", $(document).height() )
var page = {
    width: 818,
    height: 789,
    imageData: null,
    canvasBorders: 20,
    canvasData: null,
    dropperActivated: false,
    screenWidth: 0,
    screenHeight: 0,
    options: {
        cursor: 'default',
        enableColorToolbox: true,
        enableColorTooltip: true,
        enableRightClickDeactivate: true
    },

    defaults: function() {
        page.canvas = document.createElement("canvas");
        page.rects = [];
        page.screenshoting = false;
    },

    // ---------------------------------
    // MESSAGING
    // ---------------------------------
    messageListener: function() {
        // Listen for pickup activate
        //console.log('dropper: page activated');
        chrome.runtime.onMessage.addListener(function(req, sender, sendResponse) {
            switch (req.type) {
                case 'edropper-version':
                    sendResponse({
                        version: EDROPPER_VERSION,
                        tabid: req.tabid
                    });
                    break;
                case 'pickup-activate':
                    page.options = req.options;
                    page.dropperActivate();
                    break;
                case 'pickup-deactivate':
                    page.dropperDeactivate();
                    break;
                case 'update-image':
                //console.log('dropper: background send me updated screenshot');
                    page.imageData = req.data;
                    page.capture();
                    break;
            }
        });
    },

    sendMessage: function(message) {
        chrome.extension.connect().postMessage(message);
    },

    // ---------------------------------
    // DROPPER CONTROL
    // ---------------------------------

    dropperActivate: function() {
        if (page.dropperActivated)
            return;

        // load external css for cursor changes
        var injectedCss = '<link id="eye-dropper-css-cursor" rel="stylesheet" type="text/css" href="' + chrome.extension.getURL('inject/anchor-cursor-' + page.options.cursor + '.css?0.3.0') + '" /><link id="eye-dropper-css" rel="stylesheet" type="text/css" href="' + chrome.extension.getURL('inject/edropper2.css?0.3.0') + '" />';

        if ($("head").length == 0) { // rare cases as i.e. image page
            $("body").before(injectedCss);
        } else {
            $("head").append(injectedCss);
        }

        // create overlay div
        $("body").before('<div id="eye-dropper-overlay" style="position: absolute; width: ' + page.width + 'px; height: ' + page.height + 'px; opacity: 1; background: none; border: none; z-index: 5000;"></div>');

        // insert tooltip and toolbox
        var inserted = ''
        if (page.options.enableColorTooltip === true) {
            inserted += '<div id="color-tooltip"> </div>';
        }
        if (page.options.enableColorToolbox === true) {
            inserted += '<div id="color-toolbox"><div id="color-toolbox-color"></div><div id="color-toolbox-text"></div></div>';
        }
        $("#eye-dropper-overlay").append(inserted);

        if (page.options.enableColorTooltip === true) {
            page.elColorTooltip = $('#color-tooltip');
        }
        if (page.options.enableColorToolbox === true) {
            page.elColorToolbox = $('#color-toolbox');
            page.elColorToolboxColor = $('#color-toolbox-color');
            page.elColorToolboxText = $('#color-toolbox-text');
        }

      //console.log('dropper: activating page dropper');
        page.defaults();

        page.dropperActivated = true;
        page.screenChanged();

        // set listeners
        $(document).bind('scrollstop', page.onScrollStop);
        document.addEventListener("mousemove", page.onMouseMove, false);
        document.addEventListener("click", page.onMouseClick, false);
        if (page.options.enableRightClickDeactivate === true) {
            document.addEventListener("contextmenu", page.onContextMenu, false);
        }
        // enable keyboard shortcuts
        page.shortcuts(true);
    },

    dropperDeactivate: function() {
        if (!page.dropperActivated)
            return;

        // disable keyboard shortcuts
        page.shortcuts(false);

        // reset cursor changes
        $("#eye-dropper-overlay").css('cursor', 'default');
        $("#eye-dropper-css").remove();
        $("#eye-dropper-css-cursor").remove();

        page.dropperActivated = false;

        console.log('dropper: deactivating page dropper');
        document.removeEventListener("mousemove", page.onMouseMove, false);
        document.removeEventListener("click", page.onMouseClick, false);
        if (page.options.enableRightClickDeactivate === true) {
            document.removeEventListener("contextmenu", page.onContextMenu, false);
        }
        $(document).unbind('scrollstop', page.onScrollStop);

        if (page.options.enableColorTooltip === true) {
            page.elColorTooltip.remove();
        }
        if (page.options.enableColorToolbox === true) {
            page.elColorToolbox.remove();
        }
        $("#eye-dropper-overlay").remove();
    },

    // ---------------------------------
    // EVENT HANDLING
    // ---------------------------------

    onMouseMove: function(e) {
        if (!page.dropperActivated)
            return;
      //console.log("printing here:", e)
        page.tooltip(e);
    },

    onMouseClick: function(e) {
        if (!page.dropperActivated)
            return;

        e.preventDefault();

        page.dropperDeactivate();
        page.sendMessage({
            type: "set-color",
            color: page.pickColor(e)
        });
    },

    onScrollStop: function() {
        if (!page.dropperActivated)
            return;

      //console.log("dropper: Scroll stop");
        page.screenChanged();
    },

    onScrollStart: function() {
        if (!page.dropperActivated)
            return;

    },

    // keyboard shortcuts
    // enable with argument as true, disable with false
    shortcuts: function(start) {
        // enable shortcuts
        if (start == true) {
            shortcut.add('Esc', function(evt) {
                page.dropperDeactivate();
            });
            shortcut.add('U', function(evt) {
                page.screenChanged(true);
            });

            // disable shortcuts
        } else {
            shortcut.remove('U');
            shortcut.remove('Esc');
        }
    },


    // right click
    onContextMenu: function(e) {
        if (!page.dropperActivated)
            return;

        e.preventDefault();

        page.dropperDeactivate();
    },

    // window is resized
    onWindowResize: function(e) {
        if (!page.dropperActivated)
            return;

      //console.log('dropper: window resized');

        // set defaults
        page.defaults();

        // width and height changed so we have to get new one
        page.width = $(document).width();
        page.height = $(document).height();
        //page.screenWidth = window.innerWidth;
        //page.screenHeight = window.innerHeight;

        // also don't forget to set overlay
        $("#eye-dropper-overlay").css('width', page.width).css('height', page.height);

        // call screen chaned
        page.screenChanged();
    },

    // ---------------------------------
    // MISC
    // ---------------------------------

    tooltip: function(e) {
        if (!page.dropperActivated || page.screenshoting)
            return;
        //MODIFIED
        var color = page.pickColor(e);

        var fromTop = -15;
        var fromLeft = 10;

        if ((e.pageX - page.XOffset) > page.screenWidth / 2)
            fromLeft = -20;
        if ((e.pageY - page.YOffset) < page.screenHeight / 2)
            fromTop = 15;

        // set tooltip
        if (page.options.enableColorTooltip === true) {
          /*
            page.elColorTooltip.css({
                'background-color': '#' + color.rgbhex,
                'top': e.pageY + fromTop,
                'left': e.pageX + fromLeft,
                'border-color': '#' + color.opposite
            }).show();
            */
        }

        // set toolbox
        if (page.options.enableColorToolbox === true) {
            page.elColorToolboxColor.css({
                'background-color': '#' + color.rgbhex
            });
            page.elColorToolboxText.html('#' + color.rgbhex + '<br />rgb(' + color.r + ',' + color.g + ',' + color.b + ')');
          //page.elColorToolbox.show();
        }
    },

    // return true if rectangle A is whole in rectangle B
    rectInRect: function(A, B) {
        if (A.x >= B.x && A.y >= B.y && (A.x + A.width) <= (B.x + B.width) && (A.y + A.height) <= (B.y + B.height))
            return true;
        else
            return false;
    },

    // found out if two points and length overlaps
    // and merge it if needed. Helper method for
    // rectMerge
    rectMergeGeneric: function(a1, a2, length) {
        // switch them if a2 is above a1
        if (a2 < a1) {
            tmp = a2;
            a2 = a1;
            a1 = tmp;
        }

        // shapes are overlaping
        if (a2 <= a1 + length)
            return {
                a: a1,
                length: (a2 - a1) + length
            };
        else
            return false;

    },

    // merge same x or y positioned rectangles if overlaps
    // width (or height) of B has to be equal to A
    rectMerge: function(A, B) {
        var t;

        // same x position and same width
        if (A.x == B.x && A.width == B.width) {
            t = page.rectMergeGeneric(A.y, B.y, A.height);

            if (t != false) {
                A.y = t.a;
                A.height = length;
                return A;
            }

            // same y position and same height
        } else if (A.y == B.y && A.height == B.height) {
            t = page.rectMergeGeneric(A.x, B.x, A.width);

            if (t != false) {
                A.x = t.a;
                A.width = length;
                return A;
            }
        }

        return false;
    },

    // ---------------------------------
    // COLORS
    // ---------------------------------

    pickColor: function(e) {
        if (page.canvasData === null)
            return;

        var canvasIndex = (e.pageX + e.pageY * page.canvas.width) * 4;
        //console.log(e.pageX + ' ' + e.pageY + ' ' + page.canvas.width);
      //console.log("printing event e: ", e.offsetX, e.offsetY)

        var color = {
            r: page.canvasData[canvasIndex],
            g: page.canvasData[canvasIndex + 1],
            b: page.canvasData[canvasIndex + 2],
            alpha: page.canvasData[canvasIndex + 3]
        };

        color.rgbhex = page.rgbToHex(color.r, color.g, color.b);
        //console.log(color.rgbhex);
        color.opposite = page.rgbToHex(255 - color.r, 255 - color.g, 255 - color.b);
        return color;
    },

    // ---------------------------------
    // COLORS
    // ---------------------------------

    pickColor2: function(myPageX, myPageY) {
        if (page.canvasData === null)
            return;

        var canvasIndex = (myPageX + myPageY * page.canvas.width) * 4;
        //console.log(e.pageX + ' ' + e.pageY + ' ' + page.canvas.width);
        //console.log("printing event e: ", e.offsetX, e.offsetY)

        var color = {
            r: page.canvasData[canvasIndex],
            g: page.canvasData[canvasIndex + 1],
            b: page.canvasData[canvasIndex + 2],
            alpha: page.canvasData[canvasIndex + 3]
        };

        color.rgbhex = page.rgbToHex(color.r, color.g, color.b);
        //console.log(color.rgbhex);
        color.opposite = page.rgbToHex(255 - color.r, 255 - color.g, 255 - color.b);
        return color;
    },

    // i: color channel value, integer 0-255
    // returns two character string hex representation of a color channel (00-FF)
    toHex: function(i) {
        if (i === undefined) return 'FF'; // TODO this shouldn't happen; looks like offset/x/y might be off by one
        var str = i.toString(16);
        while (str.length < 2) {
            str = '0' + str;
        }
        return str;
    },

    // r,g,b: color channel value, integer 0-255
    // returns six character string hex representation of a color
    rgbToHex: function(r, g, b) {
        return page.toHex(r) + page.toHex(g) + page.toHex(b);
    },

    // ---------------------------------
    // UPDATING SCREEN
    // ---------------------------------

    checkCanvas: function() {
        // we have to create new canvas element
        if (page.canvas.width != (page.width + page.canvasBorders) || page.canvas.height != (page.height + page.canvasBorders)) {
          //console.log('dropper: creating new canvas');
            page.canvas = document.createElement('canvas');
            page.canvas.width = page.width + page.canvasBorders;
            page.canvas.height = page.height + page.canvasBorders;
            page.canvasContext = page.canvas.getContext('2d');
            page.canvasContext.scale(1 / window.devicePixelRatio, 1 / window.devicePixelRatio);
            page.rects = [];
        }
    },

    screenChanged: function(force) {
        if (!page.dropperActivated)
            return;

      //console.log("dropper: screenChanged");
        page.YOffset = $(document).scrollTop();
        page.XOffset = $(document).scrollLeft();

        var rect = {
            x: page.XOffset,
            y: page.YOffset,
            width: page.screenWidth,
            height: page.screenHeight
        };

        // don't screenshot if we already have this one
        if (!force && page.rects.length > 0) {
            for (index in page.rects) {
                if (page.rectInRect(rect, page.rects[index])) {
                  //console.log('dropper: already shoted, skipping');
                    return;
                }
            }
        }

        page.screenshoting = true;

        $("#eye-dropper-overlay").css('cursor', 'progress')

      //console.log('dropper: screenshoting');
        // TODO: this is terrible. It have to be done better way
        if (page.options.enableColorTooltip === true && page.options.enableColorToolbox === true) {
            page.elColorTooltip.hide(1, function() {
                page.elColorToolbox.hide(1, function() {
                    page.sendMessage({
                        type: 'screenshot'
                    }, function() {});
                });
            });
        } else if (page.options.enableColorTooltip === true) {
            page.elColorTooltip.hide(1, function() {
                page.sendMessage({
                    type: 'screenshot'
                }, function() {});
            });
        } else if (page.options.enableColorToolbox === true) {
            page.elColorToolbox.hide(1, function() {
                page.sendMessage({
                    type: 'screenshot'
                }, function() {});
            });
        } else {
            page.sendMessage({
                type: 'screenshot'
            }, function() {});
        }

    },

    // capture actual Screenshot
    capture: function() {
        page.checkCanvas();
        //console.log(page.rects);

        //    var image = new Image();
        var image = document.createElement('img');

        image.onload = function() {
            var w= page.screenWidth = image.width;
            var h= page.screenHeight = image.height;


            var rect = {
                x: page.XOffset,
                y: page.YOffset,
                width: image.width,
                height: image.height
            };
            var merged = false;



            var myOffsetX = rect.x;
            var myOffsetY = rect.y;
            myWidth =rect.width;
            myHeight = rect.height;
			      colorArray = new Array(myWidth);
			      var heightArray = new Array(myHeight);
            //image width and height are fixed
            //xoffset is always 0
            //yoffset is scroll dependent

            // if there are already any rectangles
            if (page.rects.length > 0) {
                // try to merge shot with others
                for (index in page.rects) {
                    var t = page.rectMerge(rect, page.rects[index]);
                  //console.log("Checking index value: ", index)
                    if (t != false) {
                      //console.log('dropper: merging');
                        merged = true;
                        page.rects[index] = t;
                    }
                }
            }

            // put rectangle in array
            if (merged == false)
                page.rects.push(rect);

            page.canvasContext.drawImage(image, page.XOffset, page.YOffset);
            page.canvasData = page.canvasContext.getImageData(0, 0, page.canvas.width, page.canvas.height).data;
            // TODO - je nutne refreshnout ctverecek a nastavit mu spravnou barvu

            page.screenshoting = false;
            $("#eye-dropper-overlay").css('cursor', page.options.cursor);

            // ---------------------------------
            // ARRAY FINDING CODE- MODIFIED
            // ---------------------------------
            var var1 = 0;
            var var2 = 0;
            var cnt = 0;
            console.log("my vals: ", myOffsetX, myOffsetY, myWidth, myHeight)
            for(var i = myOffsetX; i < (myOffsetX+myWidth); i++) {
                for(var j = myOffsetY; j < (myOffsetY+myHeight); j++) {
                	//console.log("checking i j", i, j)
                    heightArray[var1] = page.pickColor2(i, j).rgbhex;
                    var1++;
                    if(heightArray[var1] == "ffffff")	cnt++;
                }
                colorArray[var2] = heightArray;
                var2++;
                var1=0;
            }
            console.log("Printing colour array: ", colorArray);
            console.log("Percentage white: ", cnt / (myWidth * myHeight));

            start_game();

            // re-enable tooltip and toolbox
            if (page.options.enableColorTooltip === true) {
              //page.elColorTooltip.show(1);
            }
            if (page.options.enableColorToolbox === true) {
              // page.elColorToolbox.show(1);
            }

            if ( DEBUG ) {
                page.sendMessage({type: 'debug-tab', image: page.canvas.toDataURL()}, function() {});
                debugger
            }
        }

        if (page.imageData) {
            image.src = page.imageData;
        } else {
            console.error('ed: no imageData');
        }
    },

    init: function() {
        page.messageListener();

        if ( page.width > CANVAS_MAX_SIZE ) {
            page.width = CANVAS_MAX_SIZE
        }
        if ( page.height > CANVAS_MAX_SIZE ) {
            page.height = CANVAS_MAX_SIZE
        }

    }
}

page.init();

window.onresize = function() {
    page.onWindowResize();
}

/*
var images = document.getElementsByTagName('img');
for (var i = 0, l = images.length; i < l; i++) {
  images[i].src = 'http://placekitten.com/' + images[i].width + '/' + images[i].height;
}
*/
/*
var image = document.createElement("img");
image.setAttribute("style", "margin-left:200px;");
image.setAttribute("style", "margin-top:200px;");
document.getElementsByTagName("body")[0].appendChild(image);
*/
document.documentElement.style.height = '100%';
document.body.style.height = '100%';
document.documentElement.style.width = '100%';
document.body.style.width = '100%';

var pacman, score_card, p_text, score_text;
var dots = [], walls = [];
var powers = [];
var dot_sz = 0, wall_sz = 0, power_sz = 0;
var score = 0;

function add_score_card() {
  score_card = document.createElement('div');
  score_card.id = 'score_card';
  score_card.style.position = 'fixed';
  score_card.style.top = '100px';
  score_card.style.left = '1250px';
  score_card.style.width = '180px';
  score_card.style.height = '70px';
  document.body.appendChild(score_card);
  score_card.style.backgroundColor = 'lime';
  p_text = document.createElement('p');
  p_text.style.fontSize = "30px";
  p_text.appendChild(document.createTextNode("Score: " + score));
  score_card.appendChild(p_text);
  /*
  progress_bar = document.createElement('span');
  progress_bar.id = 'progress_bar';
  document.body.appendChild(progress_bar);
  */
}

function add_pacman(x, y, sz) {
  pacman = document.createElement('img');
  document.body.appendChild(pacman);
  pacman.src = "https://imgur.com/ybQwK4F.gif";
  pacman.id = 'packyboi';
  pacman.style.position = 'fixed';
  pacman.style.top = y + 'px'
  pacman.style.left = x + 'px';
  pacman.style.width = sz + 'px';
  pacman.style.height = sz + 'px';
}

function add_dots(x, y, sz) {
  dots[dot_sz] = document.createElement('img');
  document.body.appendChild(dots[dot_sz]);
  dots[dot_sz].src = "https://imgur.com/nzZOdmI.gif";
  dots[dot_sz].id = dot_sz + '_dot';
  dots[dot_sz].style.position = 'fixed';
  dots[dot_sz].style.top = y + 'px';
  dots[dot_sz].style.left = x + 'px';
  dots[dot_sz].style.width = sz + 'px';
  dots[dot_sz].style.height = sz + 'px';
  dot_sz++;
}

function add_power(x, y, sz) {
  powers[power_sz] = document.createElement('img');
  document.body.appendChild(powers[power_sz]);
  powers[power_sz].src = "https://imgur.com/GG9OdaD.gif"
  powers[power_sz].id = power_sz + '_power';
  powers[power_sz].style.position = 'fixed';
  powers[power_sz].style.top = y + 'px';
  powers[power_sz].style.left = x + 'px';
  powers[power_sz].style.width = sz + 'px';
  powers[power_sz].style.height = sz + 'px';
  power_sz++;
}

function add_walls(x1, y1, x2, y2) {
  walls[wall_sz] = {x1: x1, y1: y1, x2: x2, y2: y2};
  wall_sz++;
}

//set attributes for btnForm
//btnForm.action = '';

//set attributes for btn
//"btn.removeAttribute( 'style' );
/*
btn.type = 'button';
btn.value = 'hello';
btn.style.position = 'absolute';
tn.style.top = '50%';
btn.style.left = '50%';
*/
var speed = 8, max_speed = 20, acc = 0, prev_dir = -1, delta = 0;

function to_int(x) {
  return parseFloat(x.split('p')[0]);
}

function intersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  return !(x3 > x2 || x4 < x1 || y3 > y2 || y4 < y1);
}

function intersect_dom(a, b) {
  var x1 = to_int(a.style.left), y1 = to_int(a.style.top);
  var x2 = x1 + to_int(a.style.width), y2 = y1 + to_int(a.style.height);

  var x3 = to_int(b.style.left), y3 = to_int(b.style.top);
  var x4 = x3 + to_int(b.style.width), y4 = y3 + to_int(b.style.height);

  return intersect(x1, y1, x2, y2, x3, y3, x4, y4);
}

function update_score(score_add) {
  score += score_add
  p_text.removeChild(p_text.childNodes[0]);
  p_text.appendChild(document.createTextNode("Score: " + score));
}

function isEat(element) {
  for(var i = 0; i < dot_sz; i++) {
    if(intersect_dom(element, dots[i])) {
      update_score(50);
      dots[i].style.left = '0px';
      dots[i].style.top = '0px';
      dots[i].style.width = '0px';
      dots[i].style.height = '0px';
    }
  }
  for(var i = 0; i < power_sz; i++) {
    if(intersect_dom(element, powers[i])) {
      // time_start
      pacman.style.width = to_int(pacman.style.width)/2 + 'px';
      pacman.style.height = to_int(pacman.style.height)/2 + 'px';
      setTimeout(function(){
        pacman.style.width = to_int(pacman.style.width)*2 + 'px';
        pacman.style.height = to_int(pacman.style.height)*2 + 'px';
      }, 10000);
      /*
      var timeleft = 10;
      var download_timer = setInterval(function() {
        timeleft--;
        document.getElementById("progress_bar").textContent = timeleft;
        if(timeleft <= 0)   clearInterval(download_timer);
      });
      */
      powers[i].style.left = '0px';
      powers[i].style.top = '0px';
      powers[i].style.width = '0px';
      powers[i].style.height = '0px';
    }
  }
}
function isHit2(x1, y1, x2, y2) {
  var c_width = myWidth / MAX_X, c_height = myHeight / MAX_Y;
  var cntr = 0;
  for(var tmp_x = x1; tmp_x <= x2; tmp_x++) {
    for(var tmp_y = y1; tmp_y <= y2; tmp_y++) {
      var tmp2_x = Math.round(tmp_x * c_width);
      var tmp2_y = Math.round(tmp_y * c_height);
      //console.log("C-x --> ", tmp_x, tmp2_x, tmp_y, tmp2_y, colorArray[tmp2_x][tmp2_y]);
      if(colorArray[tmp_x][tmp_y] != "ffffff")  cntr++;
    }
  }
  var tolerance = cntr / ((x2 - x1) * (y2 - y1));
  if(tolerance >= 0.2)  return true;
  return false;
  /*
  /*
  for(var x_offset = -50; x_offset <= 50; x_offset++) {
    for(var y_offset = -50; y_offset <= 50; y_offset++) {
      for(var i = 0; i < wall_sz; i++) {
        if(intersect(x1 + x_offset, y1 + y_offset, x2 + x_offset, y2 + y_offset, walls[i].x1, walls[i].y1, walls[i].x2, walls[i].y2)) {
          return true;
        }
      }
    }
  }
  return false;
  */
}

function isHit(x1, y1) {
  x2 = x1 + to_int(pacman.style.width), y2 = y1 + to_int(pacman.style.height);
  return isHit2(x1, y1, x2, y2);
  /*
  for(var i = 0; i < wall_sz; i++) {
    if(intersect(x1, y1, x2, y2, walls[i].x1, walls[i].y1, walls[i].x2, walls[i].y2)) {
      return true;
    }
  }
  return false;
  */
}

function leftArrowPressed() {
  var element = document.getElementById("packyboi");
  element.style.transform = "rotate(180deg)"
  if(prev_dir != 0) acc = 0;acc
  var new_left = parseFloat(element.style.left) - Math.min(max_speed, speed + acc) + 'px';
  if(isHit(to_int(new_left), to_int(element.style.top)))  return ;
  element.style.left = new_left;
  acc += delta;
  prev_dir = 0;
  isEat(element);
}

function rightArrowPressed() {
  var element = document.getElementById("packyboi");
  element.style.transform = "rotate(0deg)"
  if(prev_dir != 1) acc = 0;
  var new_left = parseFloat(element.style.left) + Math.min(max_speed, speed + acc) + 'px';
  if(isHit(to_int(new_left), to_int(element.style.top)))  return ;
  element.style.left = new_left;
  acc += delta;
  prev_dir = 1;
  isEat(element)
}

function upArrowPressed() {
  var element = document.getElementById("packyboi");
  element.style.transform = "rotate(270deg)"
  if(prev_dir != 2) acc = 0;
  var new_top = parseFloat(element.style.top) - Math.min(max_speed, speed + acc) + 'px';
  if(isHit(to_int(element.style.left), to_int(new_top)))  return ;
  element.style.top = new_top;
  acc += delta;
  prev_dir = 2;
  isEat(element)
}

function downArrowPressed() {
  var element = document.getElementById("packyboi");
  element.style.transform = "rotate(90deg)"
  if(prev_dir != 3) acc = 0;
  var new_top = parseFloat(element.style.top) + Math.min(max_speed, speed + acc) + 'px';
  if(isHit(to_int(element.style.left), to_int(new_top)))  return ;
  element.style.top = new_top;
  acc += delta;
  prev_dir = 3;
  isEat(element)
}

var game_started = true;

function moveSelection(evt) {
  if(evt.keyCode == 80 && game_started == false) { //press P to start
    start_game();
    game_started = true;
  }
  if(!game_started) return ;
  switch (evt.keyCode) {
    case 65:
      leftArrowPressed();
      break;
    case 68:
      rightArrowPressed();
      break;
    case 87:
      upArrowPressed();
      break;
    case 83:
      downArrowPressed();
      break;
    case 82: // R key for Respawn
      respawn();
      break;
  }
};

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

var MAX_X;
var MAX_Y;// = document.documentElement.clientHeight;
var PACMAN_SZ = 16, DOT_SZ = 16, DOTS_CNT = 20, POWER_CNT = 5;

function respawn() {
  console.log("BC --> ", MAX_X, MAX_Y);
  var rnd_x = getRandomInt(0, MAX_X), rnd_y = getRandomInt(0, MAX_Y);
  while(isHit2(rnd_x, rnd_y, rnd_x + PACMAN_SZ, rnd_y + PACMAN_SZ)) {
    rnd_x = getRandomInt(0, MAX_X), rnd_y = getRandomInt(0, MAX_Y);
  }
  pacman.style.top = rnd_y + 'px'
  pacman.style.left = rnd_x + 'px';
  update_score(-10);
}

window.addEventListener('keydown', moveSelection);
function start_game() {

  MAX_X = document.documentElement.clientWidth;
  MAX_Y = document.documentElement.clientHeight;
  // Adding score_card + PACMAN
  add_score_card();
  var rnd_x = getRandomInt(0, MAX_X), rnd_y = getRandomInt(0, MAX_Y);
  while(isHit2(rnd_x, rnd_y, rnd_x + PACMAN_SZ, rnd_y + PACMAN_SZ)) {
    rnd_x = getRandomInt(0, MAX_X), rnd_y = getRandomInt(0, MAX_Y);
  }
  add_pacman(rnd_x, rnd_y, PACMAN_SZ);

  // Adding normal dots
  for(var i = 0; i < DOTS_CNT; i++) {
    rnd_x = getRandomInt(0, MAX_X), rnd_y = getRandomInt(0, MAX_Y);
    while(isHit2(rnd_x, rnd_y, rnd_x + DOT_SZ, rnd_y + DOT_SZ)) {
      rnd_x = getRandomInt(0, MAX_X), rnd_y = getRandomInt(0, MAX_Y);
    }
    add_dots(rnd_x, rnd_y, DOT_SZ);
  }

  // Adding power up points
  for(var i = 0; i < POWER_CNT; i++) {
    rnd_x = getRandomInt(0, MAX_X), rnd_y = getRandomInt(0, MAX_Y);
    while(isHit2(rnd_x, rnd_y, rnd_x + DOT_SZ, rnd_y + DOT_SZ)) {
      rnd_x = getRandomInt(0, MAX_X), rnd_y = getRandomInt(0, MAX_Y);
    }
    add_power(rnd_x, rnd_y, DOT_SZ);
  }

  function area_of(rect) {
    return (rect.right - rect.left) * (rect.bottom - rect.top);
  }
  /*
  var taglist = ["P", "A", "BUTTON", "SUMMARY", "SVG", "DETAILS"];
  var all = document.getElementsByTagName("*");
  for (var i = 0; i < all.length; i++) {
    var rect = all[i].getBoundingClientRect();
    var valid = false;
    //if(all[i].name == "score_card") continue;
    for(var j = 0; j < taglist.length; j++) {
      if(all[i].tagName == taglist[j])  valid = true;
    }
    if(valid == false)  continue;
    if(Math.round(area_of(rect)) > 30000) continue;
    add_walls(Math.round(rect.left), Math.round(rect.top), Math.round(rect.right), Math.round(rect.bottom));
  }
  */
  //pacman.style.backgroundColor = 'red';
}
