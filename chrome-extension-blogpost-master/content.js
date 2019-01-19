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
  score_card.style.top = '500px';
  score_card.style.left = '500px';
  score_card.style.width = '200px';
  score_card.style.height = '100px';
  document.body.appendChild(score_card);
  //score_card.style.backgroundColor = 'red';
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

add_score_card();
add_pacman(1000, 30, 30);
for(var i = 0; i < 8; i++) {
  add_dots(0, 100 * (i + 1), 15);
}
function area_of(rect) {
  return (rect.right - rect.left) * (rect.bottom - rect.top);
}
var all = document.getElementsByTagName("*");
for (var i = 0; i < all.length; i++) {
  var rect = all[i].getBoundingClientRect();
  if(all[i].tagName != "P" && all[i].tagName != "A")  continue;
  if(Math.round(area_of(rect)) > 30000) continue;
  add_walls(Math.round(rect.left), Math.round(rect.top), Math.round(rect.right), Math.round(rect.bottom));
}
for(var i = 0; i < 2; i++) {
  //add_walls(120, 120, 800, 200);
  //add_walls(0, 100, 400, 120);
}
add_power(100, 500, 15);
add_power(500, 100, 15);

//pacman.style.backgroundColor = 'red';

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
var speed = 8, max_speed = 20, acc = 0, prev_dir = -1, delta = 1;

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

function update_score() {
  p_text.removeChild(p_text.childNodes[0]);
  p_text.appendChild(document.createTextNode("Score: " + score));
}

function isEat(element) {
  for(var i = 0; i < dot_sz; i++) {
    if(intersect_dom(element, dots[i])) {
      score++;
      update_score();
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

function isHit(x1, y1) {
  x2 = x1 + to_int(pacman.style.width), y2 = y1 + to_int(pacman.style.height);
  for(var i = 0; i < wall_sz; i++) {
    if(intersect(x1, y1, x2, y2, walls[i].x1, walls[i].y1, walls[i].x2, walls[i].y2)) {
      return true;
    }
  }
  return false;
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

function moveSelection(evt) {
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
  }
};

window.addEventListener('keydown', moveSelection);
