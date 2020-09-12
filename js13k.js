// TINY TRUCK SIMULATOR
// made by @mcfunkypants
// for js13kgames.com #js13k 2020
// this is gonna be so fun

const PLAYERID = 0; // the 1st truck is not AI

// mapgen settings
var numroads = 1+Math.round(Math.random()*25);
var numturns = 3+Math.round(Math.random()*50);
var grid = 50 + Math.round(Math.random()*200);
var straightaway = 250 + Math.round(Math.random()*400);
var trafficCount = 404;//1 + Math.round(Math.random()*100);

// globals for speed
var mouseIsDown, gasPedalDown, brakePedalDown, mouseX, mouseY, mouseWorldX, mouseWorldY, camX, camY, sprites, gameCanvas, gameCTX, mapCanvas, mapCTX, collideCanvas, collideCTX, collisionData;
// reusable temps
var x,y,u,v,num;
// an audio tag (currently unused!)
var music;
var framecount = 0;
// game settings
const STRESSTESTNUM = 0; // if >0 draw random sprites everywhere
const MAP_W = 16000;
const MAP_H = 2000;
const minimapW = MAP_W/30;
const minimapH = MAP_H/30;
const LOOP_ROADS = false; // draw a final curve from endpoint to startpoint
const USE_MUSIC = false;
const LOOP_MUSIC = true; // imperfect
const USE_MOTOR_SOUND = true; // a synth
const MOTOR_SOUND_SPEED_SCALE = 2;
const MINSPD = 0.1;// ai speed range
const MAXSPD = 0.5;//0.1; // if these are different, what to do about cars passing each other
const PLAYER_MAXSPD = 8;
const PLAYER_ACCEL = 0.005;
const PLAYER_BRAKES = -0.025;
const PLAYER_COAST = -0.0005;
const SPR_W = 20;
const SPR_H = 8;
const NUM_VEHICLE_SPRITES = 3; // in spritesheet used during addEntity
const FWD = 1;
const REV = -1;
const DEG2RAD = Math.PI/180;
const DEBUGTRUCKAI = false;
const DEBUG_PLAYER = true;
const BUILDING_RGBA = "rgba(88,80,80,1)";//"rgba(0,0,0,0.1)";
const waterRGBA = "rgba(0,16,40,1)";

// a particle-engine-like simplified entity component systems
var numEnts = 0;
var spr = []; // which spritesheet index
var ex = []; // position
var ey = [];
var xs = []; // speed
var ys = [];
var rot = []; // move angle in randians
var odo = []; // total distance travelled
var spd = []; // in pixels per frame
var per = []; // percent 0..1 done current road curve
var seg = []; // what segment of a road are we on
var rod = []; // what road are we on
var dir = []; // 1 or -1 for which way we follow roads

// events
document.addEventListener('contextmenu', event => event.preventDefault());
window.addEventListener('click',onclick);
window.addEventListener('mouseup',onmouseup);
window.addEventListener('mousedown',onmousedown);
window.addEventListener('mousemove',onmove);
window.addEventListener('resize',resize);
window.addEventListener('load',onload);

// easy pickings
Array.prototype.randomItem = function() { 
    return this[Math.floor((Math.random()*this.length))]; 
}

var menuActive = true;
function drawMenu() {
    const dark = "rgba(0,0,0,0.5)";
    const lite = "rgba(255,255,222,1)";
    const w2 = 256; // half!
    const h2 = 128;
    var cx = Math.round(gameCanvas.width/2);
    var cy = Math.round(gameCanvas.height/2);
    gameCTX.fillStyle = dark;
    gameCTX.fillRect(cx-w2,cy-h2,w2*2,h2*2);
    gameCTX.strokeStyle = dark;
    gameCTX.lineWidth = 10;
    gameCTX.strokeRect(cx-w2,cy-h2,w2*2,h2*2)
    // center map
    camX = MAP_W/2-cx;
    camY = MAP_H/2-cy;
    // plus a little wobble
    camX -= Math.round(Math.cos((framecount+300) / 444) * MAP_W/20);
    camY -= Math.round(Math.cos((framecount+300) / 167) * MAP_H/20);
    
    gameCTX.textAlign = "center";
    gameCTX.fillStyle = lite;
    gameCTX.font = "64px Verdana";
    gameCTX.strokeStyle = dark;
    gameCTX.lineWidth = 10;
    gameCTX.strokeText("Tangletruck",cx,cy-h2+70);
    gameCTX.fillText("Tangletruck",cx,cy-h2+70);
 
    gameCTX.font = "16px Verdana";
    gameCTX.fillText("Click to play!",cx,cy-10);
    gameCTX.fillText("Refresh your browser to generate a random city!",cx,cy+50);
    gameCTX.fillText("Warning: delivery address not found. Good luck!",cx,cy+30);
    gameCTX.fillText("Hint: the mouse buttons are the gas and brake.",cx,cy+70);

    gameCTX.fillText("Made for #js13k 2020 by @McFunkypants",cx,cy+h2-20);

}

function collides(x,y) {
    return collisionData[(Math.floor(x)+(Math.floor(y)*MAP_W))*4+3] != 0;
}

function addEntity(x,y) {
    // position of the mouse click
    ex[numEnts] = x;
    ey[numEnts] = y;
    xs[numEnts] = 0;
    ys[numEnts] = 0;
    rot[numEnts] = 0;
    odo[numEnts] = 0;
    spd[numEnts] = MINSPD+Math.random()*(MAXSPD-MINSPD);
    rod[numEnts] = Math.floor(Math.random()*(roads.length-1)); // start on a random road!
    per[numEnts] = Math.random(); // random distance travelled on this segment
    //console.log("new ai on road "+rod[numEnts]);
    // we have an off by one error somewhere
    seg[numEnts] = Math.floor(Math.random()*(roads[rod[numEnts]].length-2)); // random road segment FIXME -2 hmmmm seems to avoid overflowing maybe missed last one
    dir[numEnts] = Math.random()<0.5?FWD:REV;

    // fixme: choose the "nearest point on the nearest road" =)
    // welcome to science class kids, nah let's just choose a start point
    // of a road segment: those are reliable! =)
    // position of a random road segment start point
    // var pos = roads.randomItem().randomItem().startPt;
    var randomSegment = curves.randomItem().randomItem(); // [road][curve]
    var pos = randomSegment.startxy; // WORKS GREAT! but then many cars atart in same place
    // advance a random amount into that segment
    pos = getQuadraticBezierXYatPercent(randomSegment.startxy,randomSegment.ctrlxy,randomSegment.endxy,Math.random());

    ex[numEnts] = pos.x;
    ey[numEnts] = pos.y;

    // random velocity
    xs[numEnts] = Math.random() * 8 - 4;
    ys[numEnts] = Math.random() * 8 - 4;
    // fixme: move in the correct direction via a 5% step forward in the curve?
    // take those two points, make vect, norm, that's the heading of the road
    // needs curve interp fix first blah

    // different sprite for each car
    spr[numEnts] = numEnts % NUM_VEHICLE_SPRITES; //Math.floor(Math.random()*8);
    // increase pool size
    numEnts++;
}

function onclick(e) {
    e.preventDefault();
}
function onmouseup(e) {
    mouseIsDown = false;
    gasPedalDown = false;
    brakePedalDown = false;
    e.preventDefault();
}
function onmousedown(e) {
    
    e.preventDefault();

    mouseX = e.clientX;
    mouseY = e.clientY;

    mouseIsDown = true;

    if (e.which>1) {
        gasPedalDown = false;
        brakePedalDown = true;
    } else {
        gasPedalDown = true;
        brakePedalDown = false;
    }


    mouseWorldX = Math.round(mouseX + camX);
    mouseWorldY = Math.round(mouseY + camY);

    console.log('click '+mouseX+','+mouseY);

    if (menuActive) {
        menuActive = false;
        console.log("menu clicked! starting game!");
    }

    // test collision detection!
    if (collides(mouseX+camX,mouseY+camY)) console.log('You clicked the road!');

    if (USE_MOTOR_SOUND && !motorSound) initEngineSound();

    if (USE_MUSIC && !music) {
        console.log('init music');
        music = document.getElementById('engineloop');
        if (LOOP_MUSIC) {
            //music.loop = true;
            //music.loopStart = 0.1;
            //music.loopEnd = music.duration - 0.1;
            music.addEventListener('timeupdate', function(){
            var buffer = 0.1; //0.44?
            if(this.currentTime > this.duration - buffer){
                this.currentTime = 0.15;
                this.play();
            }
            });
        }
        music.play();
    }
    
    //for (var spam=0; spam<10; spam++) {
    //addEntity(mouseX,mouseY);
    //}
}

function onmove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    mouseWorldX = Math.round(mouseX + camX);
    mouseWorldY = Math.round(mouseY + camY);
}

function update() {
    framecount++;

    var w = gameCanvas.width;
    var h = gameCanvas.height;
    var prevx,prevy;
    
    // we might not be moving the mouse, but the camera is moving
    mouseWorldX = Math.round(mouseX + camX);
    mouseWorldY = Math.round(mouseY + camY);

    // TODO: actually simulate some entities!
    for (var i=0; i<numEnts; i++) {

        if (i==PLAYERID) {

            if (menuActive) continue;

            // store in case we collide
            prevx = ex[i];
            prevy = ey[i];

            // point at mouse
            rot[i] = Math.atan2(mouseWorldY-ey[i],mouseWorldX-ex[i]);

            // hack fix: the rot FLIPS when rot is exactly 0 ugh... huh?
            // prob was cam moved early
            //if (rot[i]==0) rot[i]==0.00000001; // no fix..

            var dist = Math.hypot(mouseWorldX - ex[i], mouseWorldY - ey[i]);

            if (gasPedalDown) {
                spd[i] = Math.min(spd[i]+PLAYER_ACCEL,PLAYER_MAXSPD);
            } else if (brakePedalDown) {
                spd[i] = Math.max(spd[i]+PLAYER_BRAKES,0);
            } else {
                // coast!
                // slowly slow down a bit
                spd[i] = Math.max(spd[i]+PLAYER_COAST,0);
            }

            // rev them engines!
            if (motorSound) motorSound.setSpeed(spd[i]*MOTOR_SOUND_SPEED_SCALE);

            // move according to speed! I am math genius!
            ex[i] += spd[i] * Math.cos(rot[i]);
            ey[i] += spd[i] * Math.sin(rot[i]);

            // collision detection whoo hoo
            crashed = !collides(ex[i],ey[i]); // true==on the road
            if (crashed) {

                // wall sliding: check each axis individually
                if (collides(ex[i],prevy)) {
                    ey[i]=prevy;
                } else if (collides(prevx,ey[i])) {
                    ex[i]=prevx;
                } else { 
                    if (DEBUG_PLAYER) console.log('boom!');
                    spd[i]=0;
                    ex[i]=prevx;
                    ey[i]=prevy;
                }

            }

            // debug spam
            if (DEBUG_PLAYER) console.log("Player pos:"+ex[i].toFixed(0)+","+ey[i].toFixed(0)+
                " rot:"+rot[i].toFixed(2)+" spd:"+spd[i].toFixed(2)+
                " mouse:"+mouseWorldX+","+mouseWorldY+" dist:"+dist.toFixed(1));

            // camera follows the player
            if (!menuActive) {
                // FIXME: center on truck?
                // the very center of the world:
                //camX = MAP_W/2-w/2;
                //camY = MAP_H/2-h/2;
                camX = ex[PLAYERID]-w/2;
                camY = ey[PLAYERID]-h/2;
            }
            
            continue; // don't run any curve ai below!
        }

        /*
        // add velocity to position (particles) WORKS:
        ex[i] += xs[i];
        ey[i] += ys[i];
        // wrap at screen edges
        if (ex[i]>canvas.width) ex[i] -= canvas.width;
        else if (ex[i]<0) ex[i] += canvas.width;
        if (ey[i]>canvas.height) ey[i] -= canvas.height;
        else if (ey[i]<0) ey[i] += canvas.height;
        */

        var myroad = rod[i]; //i % roads.length; // each truck get a road! FIXME
        //var segment = Math.floor((framecount+(i*10))/100)%(curves[myroad].length);
        var segment = seg[i]; // FIXE: seg[i]
        var curve = curves[myroad][segment];
        if (!curve || ! curve.startxy) {
            console.log('missing curve for rod '+(myroad+1)+'/'+roads.length+' seg '+(segment+1)+'/'+curves[myroad].length);
        }
        //var curveLength = quadraticBezierLength(curve.ctrlxy.x,curve.ctrlxy.y,curve.startxy.x,curve.startxy.y,curve.endxy.x,curve.endxy.y);
        //var curveLength = quadraticBezierLength2(curve.startxy,curve.ctrlxy,curve.endxy); // nothing works right
        var curveLength = approxBezierLength(curve.startxy,curve.ctrlxy,curve.endxy); // nothing works right
        if (isNaN(curveLength) || !curveLength) {
            //console.log("invalid curve length! using 300"); // this happens a lot! params must be swapped?
            curveLength = 999.99; // go slow!
        }
        
        // WORKS: the longer the road, the faster we go
        // var percent = (((framecount+(i*10))%100))/100;

        //var pixelsPerPercent = curveLength / 100; // 1% of this line is how long?
        var percentPerPixel = 1/curveLength; // 1px of how many percent?
        var percentTravelled = percentPerPixel * spd[i] * dir[i]; 
        per[i] += percentTravelled;

        if (per[i]<0 || per[i]>=1) { // next/prev segment time HMM
            
            if (dir[i]==FWD) { per[i] = 0; seg[i]++; }
            if (dir[i]==REV) { per[i] = 1; seg[i]--; }
            
            //per[i] -= dir[i]; // loop back to 0% or 100% with carryover
            //seg[i] += dir[i]; // transition to the next segment in the road FIXME
        
            // out of segs?
            if (seg[i] < 0 || seg[i] > curves[myroad].length-1) {
                
                if (DEBUGTRUCKAI) console.log('seg '+(seg[i]+1)+'/'+curves[myroad].length+' is past end of road '+(myroad+1)+'/'+roads.length);
                
                //go to the next road - works!
                //seg[i] = 0; 
                //rod[i] += dir[1];

                if (dir[i]==FWD) {
                    if (DEBUGTRUCKAI) console.log('truck '+i+' REVERSING!');
                    dir[i] = REV;
                    //per[i] = 1;                    
                    seg[i] -= 1;

                } else { // was reversing
                    if (DEBUGTRUCKAI) console.log('truck '+i+' FORWARDING!');
                    dir[i] = FWD;
                    //per[i] = 0; 
                    seg[i] += 1; 
                }
                
                /*
                if (rod[i] > roads.length-1) {
                    // out of road
                    console.log('road '+rod[i]+' is past end of the world');
                    rod[i] = 0;
                }

                if (rod[i] < 0) {
                    // out of road
                    console.log('road '+rod[i]+' is back to the start');
                    rod[i] =  roads.length-1;
                }
                */

                // FIXME: switch roads?

            }
            // move to next road if we ran out of segments
            // loop to first road if out of roads (or leave?)

        }

        // great spammy debug info
        if (DEBUGTRUCKAI) console.log('truck '+(i+1)+' is '+per[i].toFixed(2)+
            '% of road '+(myroad+1)+'/'+roads.length+
            ' curve '+(segment+1)+'/'+curves[myroad].length+
            ' length:'+curveLength.toFixed(2)+
            ' spd[i]'+spd[i].toFixed(2)+
            ' percentPerPixel:'+percentPerPixel.toFixed(2)+
            ' percentTravelled:'+percentTravelled.toFixed(2));

        //console.log("segment:"+segment+"/"+curves[myroad].length+" percent:"+percent);
        if (!curve) {
            console.log("ERROR: missing curve! myroad:"+myroad+" segment:"+segment);
        }

        // start, ctrlpoint, end, percent
        var xy = getQuadraticBezierXYatPercent(curve.startxy,curve.ctrlxy,curve.endxy,per[i]);

        // offset for left/right side of road!
        // calculate the angle in radians between current pos
        // and one up ahead in the curve
        var roadLaneOffset = 5;
        var aheadxy = getQuadraticBezierXYatPercent(curve.startxy,curve.ctrlxy,curve.endxy,per[i]+0.1);
        var roadangle = Math.atan2(aheadxy.y-xy.y,aheadxy.x-xy.x);
        rot[i] = roadangle; // remember for rendering!
        // move perpendicular either left or right
        var sideangle = roadangle + ((dir[i]==FWD?90:-90)*DEG2RAD);
        // move start position to the side of the road
        xy.x += roadLaneOffset * Math.cos(sideangle);
        xy.y += roadLaneOffset * Math.sin(sideangle);        

        // update truck pos
        ex[i] = xy.x;
        ey[i] = xy.y;

    }
}

// what a hack! =( and a waste of time
function approxBezierLength(startxy,ctrlxy,endxy) {
    var xy=0,prevxy=0,dist=0,total=0;
    for (chunk=0; chunk<10; chunk++) {
        xy=getQuadraticBezierXYatPercent(startxy,ctrlxy,endxy,chunk/10);
        if (prevxy) {
            dist = Math.hypot(prevxy.x - xy.x, prevxy.y - xy.y);
            total += dist;
        }
        prevxy = xy;
    }
    return total;
}

function render() {
    // clear screen
    //gameCTX.clearRect(0,0,gameCanvas.width,gameCanvas.height);
    //ctx.fillStyle = "rgba(60,120,80,1)"; // light green
    gameCTX.fillStyle = waterRGBA;
    gameCTX.fillRect(0,0,gameCanvas.width,gameCanvas.height);

    drawCachedMap();

    // draw random sprites just to test
    if (STRESSTESTNUM) {
        for (var i=0; i<STRESSTESTNUM; i++) {
            x = Math.round(Math.random()*gameCanvas.width);
            y = Math.round(Math.random()*gameCanvas.height);
            num = Math.floor(Math.random()*8);
            u = num * SPR_W; // col
            v = 0; // row
            gameCTX.drawImage(sprites,u,v,SPR_W,SPR_H,x,y,SPR_W,SPR_H);
        }
    }

    // draw all known entities
    for (var i=0; i<numEnts; i++) {
        u = spr[i] * SPR_W; // col
        v = 0; // row
        gameCTX.setTransform(1,0,0,1,ex[i]-camX,ey[i]-camY);
        gameCTX.rotate(rot[i]);
        gameCTX.drawImage(sprites,u,v,SPR_W,SPR_H,-SPR_W/2,-SPR_H/2,SPR_W,SPR_H);

    }
    gameCTX.setTransform(1,0,0,1,0,0); // reset

    drawMiniMap();
    
    if (menuActive) drawMenu();

}

function animate(dt) {
    update(dt);
    render(dt);
    requestAnimationFrame(animate);
}

var roads = []; // array of [{x,y},{x,y}] lines aplenty
var curves = []; // data lookup for tweening
function generatemap() {
    console.log('generatemap! numroads:'+numroads);
    var r = 0;
    var nx = 0;
    var ny = 0;
    var shouldturn = false;
    var margin = 100; // keep roads away from edges of canvas
    var curvecount = 0;
    for (r=0; r<numroads; r++) {
        roads[r] = [];
        
        // start pos is center of screen! FIXME
        nx = Math.round(MAP_W/2);
        ny = Math.round(MAP_H/2);
        
        for (var t=0; t<numturns; t++) {
            
            // randomly inside canvas snapped to a grid
            shouldturn = true; //Math.random() < 0.2;
            if (shouldturn) {
                // choose anywhere on screen! crazy fun!
                //nx = Math.round(Math.random()*MAP_W/grid)*grid;
                //ny = Math.round(Math.random()*MAP_H/grid)*grid;
                // drunken walk
                nx += (Math.random()<0.5?1:-1) * (1+Math.round(Math.random()*4)*grid);
                ny += (Math.random()<0.5?1:-1) * (1+Math.round(Math.random()*4)*grid);

            } else { // straightaway
                if (Math.random()<0.5)
                    nx += (Math.random()<0.5)?straightaway:-straightaway;
                else 
                    ny += (Math.random()<0.5)?straightaway:-straightaway;
            }

            // stay away from screen edges
            if (nx>MAP_W-margin) nx=MAP_W-margin;
            if (nx<margin) nx=margin;
            if (ny>MAP_H-margin) ny=MAP_H-margin;
            if (ny<margin) ny=margin;

            // extend start and end offcanvas
            if (t==0 || t==numturns-1) {
                
                if (r%3==0) {
                    // go off screen toward FARTHEST side
                    if (nx > MAP_W/2) nx = -grid; else nx = MAP_W + grid;
                    if (ny > MAP_H/2) ny = -grid; else ny = MAP_H + grid;
                } else if (r%3==1) {
                    // go off screen toward nearest side
                    if (nx < MAP_W/2) nx = -grid; else nx = MAP_W + grid;
                    if (ny < MAP_H/2) ny = -grid; else ny = MAP_H + grid;
                } else {
                    // end and start in center of screen
                    nx = MAP_W/2;
                    ny = MAP_H/2;
                }

            }

            roads[r][t] = {x:nx,y:ny};
            curvecount++;


        } // for each turn in a road

        //curves[r] = roadcurves(roads[r]); // generate data for tweening
        curves[r] = drawcurve(roads[r],null,true); // output data only

    } // for all roads

    console.log('generated map with '+roads.length+' roads and '+curvecount+' curves.');
}

function drawCachedMap() {
    gameCTX.drawImage(mapCanvas,camX,camY,gameCanvas.width,gameCanvas.height,0,0,gameCanvas.width,gameCanvas.height);
}

function drawMiniMap() {
    gameCTX.fillStyle=waterRGBA;
    // properly scaled
    //gameCTX.fillRect(gameCanvas.width-minimapW,gameCanvas.height-minimapH,minimapW,minimapH);
    //gameCTX.drawImage(mapCanvas,gameCanvas.width-minimapW,gameCanvas.height-minimapH,minimapW,minimapH);
    // stretched to entire width
    gameCTX.fillRect(0,gameCanvas.height-minimapH,gameCanvas.width,minimapH);
    gameCTX.drawImage(mapCanvas,0,gameCanvas.height-minimapH,gameCanvas.width,minimapH);
}

function drawmap() {
    console.log("Rendering city map! Roads:"+roads.length);

    var r = 0;
    var len = roads.length;
    var roadW = 20;
    var curbW = 2;
    var lineW = 2;
    var sidewalkW = 15;

    // shore
    for (r=0; r<len; r++) {
        mapCTX.beginPath();
        drawcurve(roads[r]);
        mapCTX.setLineDash([]);
        mapCTX.lineWidth = 450;
        mapCTX.strokeStyle = "rgba(10,26,50,1)";
        mapCTX.stroke();
    }

    // grass
    for (r=0; r<len; r++) {
        mapCTX.beginPath();
        drawcurve(roads[r]);
        mapCTX.setLineDash([]);
        mapCTX.lineWidth = 400;
        mapCTX.strokeStyle = 'rgba(70,80,70,1)';//'rgba(25,80,25,1)';
        mapCTX.stroke();
    }

    // buildings
    decorateRoadsides();

    // sidewalk
    for (r=0; r<len; r++) {
        mapCTX.beginPath();
        drawcurve(roads[r]);
        // cracks in sidewalk
        mapCTX.lineWidth = roadW+curbW+curbW+sidewalkW+sidewalkW+4;
        mapCTX.strokeStyle = 'rgba(100,90,90,1)';
        mapCTX.setLineDash([]);
        mapCTX.stroke();
        // sidewalk blocks
        mapCTX.lineWidth = roadW+curbW+curbW+sidewalkW+sidewalkW;
        mapCTX.strokeStyle = 'rgba(120,100,100,1)';
        mapCTX.setLineDash([20,2]);
        mapCTX.stroke();
    }

    // curb
    for (r=0; r<len; r++) {
        mapCTX.setLineDash([]);
        mapCTX.beginPath();
        drawcurve(roads[r]);
        mapCTX.strokeStyle = 'rgba(80,80,80,1)';
        mapCTX.lineWidth = roadW+curbW+curbW;
        mapCTX.stroke();
    }
    
    // pavement
    for (r=0; r<len; r++) {
        mapCTX.setLineDash([]);
        mapCTX.beginPath();
        drawcurve(roads[r]);
        mapCTX.strokeStyle = 'rgba(25,25,30,1)';
        mapCTX.lineWidth = roadW;
        mapCTX.stroke();

        // this canvas ONLY has the road on it
        collideCTX.beginPath();
        drawcurve(roads[r],collideCTX);
        collideCTX.strokeStyle = 'rgba(25,25,30,1)';
        collideCTX.lineWidth = roadW;
        collideCTX.stroke();
    }

    // painted road lines - - -
    for (r=0; r<len; r++) {
        mapCTX.beginPath();
        drawcurve(roads[r]);
        mapCTX.setLineDash([10, 20]);
        mapCTX.strokeStyle = 'rgba(100,80,40,1)';
        mapCTX.lineWidth = lineW;
        mapCTX.stroke();
    }

    // trees
    //decorateRoadsides(3,0,8,8,false); // with no curb offset this is still offset into each lane...

    // grab collision array
    var collideImageData = collideCTX.getImageData(0,0,MAP_W,MAP_H);
    collisionData = collideImageData.data;

}

function decorateRoadsides(spriteNum=-1,curbDist=25,minW=10,maxW=64,evenlySpaced=false) {
    
    // if no spriteNum, then draw large random rectangles
    const pixelsPerBuilding = 25; //maxW+10; // no overlaps means a lot of wasted space... use a incrementor! FIXME
    
    for (var roadnum=0; roadnum<curves.length; roadnum++) { // was roads.length
        for (var segnum=0; segnum<curves[roadnum].length; segnum++) {
            var curve = curves[roadnum][segnum];
            // buggy
            //var curveLength = quadraticBezierLength(curve.ctrlxy.x,curve.ctrlxy.y,curve.startxy.x,curve.startxy.y,curve.endxy.x,curve.endxy.y);
            var curveLength = approxBezierLength(curve.startxy,curve.ctrlxy,curve.endxy);
            //console.log("decoration segment length: "+curveLength.toFixed(2)); // 200 to 600 it seems
            if (isNaN(curveLength)) { // broken??? STRAIGHTAWAY
                //curveLength = 2000; // assume a long road!? FIXME: measure line ez
                continue;
            }
            //if (curveLength<maxW) { // ignore short curves
            //    console.log('not decorating a very short road segment of length '+curveLength.toFixed(2));
            //    continue; // skip this curve and keep trying others
            //}
            var stepcount = curveLength / pixelsPerBuilding; // FIXME: measure line length and divide by target pixel width
            var percentPerStep = 1 / stepcount; // if we want evenly spaced
            var percent, xy, aheadxy, roadangle, sideangle, bw, bh; 
            for (var step=0; step<stepcount; step++) {
                percent = step*percentPerStep;
                xy = getQuadraticBezierXYatPercent(curve.startxy,curve.ctrlxy,curve.endxy,percent);
                // calculate the angle in radians between current pos
                // and one up ahead in the curve
                aheadxy = getQuadraticBezierXYatPercent(curve.startxy,curve.ctrlxy,curve.endxy,percent+0.1);
                roadangle = Math.atan2(xy.y-aheadxy.y,xy.x-aheadxy.x);
                // move perpendicular either left or right
                sideangle = roadangle + ((step%2?90:-90)*DEG2RAD);
                // move start position to the side of the road
                xy.x += curbDist * Math.cos(sideangle);
                xy.y += curbDist * Math.sin(sideangle);
                // random size
                bw = minW+Math.random()*(maxW-minW);//Math.round(minW+Math.sin(xy.x)*(maxW-minW));
                bh = minW+Math.random()*(maxW-minW);//Math.round(minW+Math.sin(xy.x)*(maxW-minW));
                // move farther from curb so building never overlaps road
                xy.x += Math.max(bw,bh) * Math.cos(sideangle);
                xy.y += Math.max(bw,bh) * Math.sin(sideangle);

                // draw it
                mapCTX.setTransform(1, 0, 0 , 1, xy.x, xy.y);
                mapCTX.rotate(sideangle);
                if (spriteNum==-1) { // big grey boxes for buildings
                    if (curveLength>minW) // skip tiny areas
                    mapCTX.fillStyle = BUILDING_RGBA;
                    mapCTX.fillRect(-bw/2,-bh/2,bw,bh);
                } else {
                    mapCTX.globalAlpha = 1;
                    
                    //mapCTX.fillStyle = "rgba(255,0,0,1)";
                    //mapCTX.fillRect(-minW/2,-minW/2,minW,minW);

                    u = spriteNum * SPR_W; // col
                    v = 0; // row
                    mapCTX.drawImage(sprites,u,v,SPR_W,SPR_H,-SPR_W/2,-SPR_H/2,SPR_W,SPR_H);


                }
                mapCTX.setTransform(1, 0, 0, 1, 0, 0); // reset rotation
            }
        }
    }
}

function generateTraffic() {
    console.log('generating traffic: ' + trafficCount);
    for (var i=0; i<trafficCount; i++) {
        addEntity(0,0);
    }
}

function startgame() {
    console.log('initialized!');
    generatemap();
    drawmap(); // cache
    generateTraffic();
    animate();
}

function resize() {
    console.log('resizing canvas...');
    gameCanvas.width = window.innerWidth;
    gameCanvas.height = window.innerHeight;
}

function onload() {
    console.log('initializing...');

    gameCanvas = document.getElementById('gameCanvas');
    gameCTX = gameCanvas.getContext('2d');

    mapCanvas = document.createElement("canvas");
    mapCanvas.width = MAP_W;
    mapCanvas.height = MAP_H;
    mapCTX = mapCanvas.getContext('2d');

    collideCanvas = document.createElement("canvas");
    collideCanvas.width = MAP_W;
    collideCanvas.height = MAP_H;
    collideCTX = collideCanvas.getContext('2d');

    resize();

    sprites = new Image();
    sprites.onload = startgame;
    sprites.src = 'js13k.png';

}

// https://stackoverflow.com/questions/7054272/how-to-draw-smooth-curve-through-n-points-using-javascript-html5-canvas
function drawcurve(points,ctx=mapCTX,onlyReturnCurveData=false)
{
    var data = [];
    
    if(!points || points.length < 2) return; // no straight lines allowed here

    if(points.length == 2) // straight line
    {
        console.log("straighaway!");
        if (!onlyReturnCurveData) {
            ctx.moveTo(points[0].x, points[0].y);
            ctx.lineTo(points[1].x, points[1].y);
        }
        return data;
    }

    // a curve that hits all the points
    if (!onlyReturnCurveData) ctx.moveTo(points[0].x, points[0].y); // startxy
    for (var i = 1; i < points.length - 1; i ++)// NICE CURVY: 2; i ++)
    {
        var xc = (points[i].x + points[i + 1].x) / 2;
        var yc = (points[i].y + points[i + 1].y) / 2;
        
        // nice curvy road, but interp is wonky
        //ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc); // current coords are the control point?! weird
        
        // matches the interp (and math) perfectly! but spiky
        if (!onlyReturnCurveData) ctx.quadraticCurveTo(xc, yc, points[i].x, points[i].y); // looks correcter in code, but not curvy

        data.push({ // road curve cache
            startxy:{x:points[i-1].x, y:points[i-1].y},
            ctrlxy:{x:xc, y:yc},
            endxy:{x:points[i].x, y:points[i].y},
        });

    }
    // nice curvy road but interp is wonky
    //if (!onlyReturnCurveData) ctx.quadraticCurveTo(points[i].x, points[i].y, points[i+1].x, points[i+1].y);

    /* hmmmm
    data.push({ // road curve cache
        startxy:{x:points[i-1].x, y:points[i-1].y},
        ctrlxy:{x:points[i].x, y:points[i].y},
        endxy:{x:points[i+1].x, y:points[i+1].x},
    });
    */

    // make all roads a loop lol =)
    // this works great!
    if (LOOP_ROADS) {
        var xc = (points[i].x + points[0].x) / 2;
        var yc = (points[i].y + points[0].y) / 2;

        if (!onlyReturnCurveData) ctx.quadraticCurveTo(xc, yc, points[0].x, points[0].y);

        data.push({ // road curve cache
            startxy:{x:points[i+1].x, y:points[i+1].y},
            ctrlxy:{x:xc, y:yc},
            endxy:{x:points[0].x, y:points[0].y},
        });

    }

    if (onlyReturnCurveData) return data;
}

function roadcurves(points) // buggy?
{
    //if(!points || points.length < 3) return [[]];// fixme: straightaways
    var data = [];
    var max = points.length; // skip the 2nd last curve, too!? fixme -2
    for (var i = 1; i < max; i ++)
    {
        var xc = (points[i].x + points[i + 1].x) / 2;
        var yc = (points[i].y + points[i + 1].y) / 2;
        data.push({
            // math-correct when spiky but exact - "works" but angled lol
            startxy:{x:points[i-1].x, y:points[i-1].y},
            endxy:{x:points[i].x, y:points[i].y},
            ctrlxy:{x:xc, y:yc},
        });
    }


    // we're missing the final curve?
    /*
    var xc = (points[i+1].x + points[0].x) / 2;
    var yc = (points[i+1].y + points[0].y) / 2;
    data.push({
        startxy:{x:points[i].x, y:points[i].y},
        ctrlxy:{x:xc, y:xc},
        endxy:{x:points[0].x, y:points[0].y},
    });
    */

    // both of these are incorrect, with control points in the wrong place

    // last segment... tee hee
    /*
    data.push({
        startxy:{x:points[i].x, y:points[i].y},
        ctrlxy:{x:points[i].x, y:points[i].y},
        endxy:{x:points[i+1].x, y:points[i+1].y},
    });
    */

    // loop lol
    /*
    var xc = (points[i].x + points[0].x) / 2;
    var yc = (points[i].y + points[0].y) / 2;
    data.push({
        startxy:{x:points[i+1].x, y:points[i+1].y},
        ctrlxy:{x:xc, y:xc},
        endxy:{x:points[0].x, y:points[0].y},
    });
    */

    return data;
}

// http://jsfiddle.net/m1erickson/LumMX/
/*
// line: percent is 0-1
function getLineXYatPercent(startPt,endPt,percent) {
    var dx = endPt.x-startPt.x;
    var dy = endPt.y-startPt.y;
    var X = startPt.x + dx*percent;
    var Y = startPt.y + dy*percent;
    return( {x:X,y:Y} );
}
*/

// quadratic bezier: percent is 0-1
function getQuadraticBezierXYatPercent(startPt,controlPt,endPt,percent) {
    var x = Math.pow(1-percent,2) * startPt.x + 2 * (1-percent) * percent * controlPt.x + Math.pow(percent,2) * endPt.x; 
    var y = Math.pow(1-percent,2) * startPt.y + 2 * (1-percent) * percent * controlPt.y + Math.pow(percent,2) * endPt.y; 
    return( {x:x,y:y} );
}

function quadraticBezierLength(x1,y1,x2,y2,x3,y3) { // untested
    var a, e, c, d, u, a1, e1, c1, d1, u1, v1x, v1y;
    v1x = x2 * 2;
    v1y = y2 * 2;
    d = x1 - v1x + x3;
    d1 = y1 - v1y + y3;
    e = v1x - 2 * x1;
    e1 = v1y - 2 * y1;
    c1 = (a = 4 * (d * d + d1 * d1));
    c1 += (b = 4 * (d * e + d1 * e1));
    c1 += (c = e * e + e1 * e1);
    c1 = 2 * Math.sqrt(c1);
    a1 = 2 * a * (u = Math.sqrt(a));
    u1 = b / u;
    a = 4 * c * a - b * b;
    c = 2 * Math.sqrt(c);
    return (a1 * c1 + u * b * (c1 - c) + a * Math.log((2 * u + u1 + c1) / (u1 + c))) / (4 * a1);
} 

function quadraticBezierLength2(p0, p1, p2) {
    var ax = p0.x - 2 * p1.x + p2.x;
    var ay = p0.y - 2 * p1.y + p2.y;
    var bx = 2 * p1.x - 2 * p0.x;
    var by = 2 * p1.y - 2 * p0.y;
    var A = 4 * (ax * ax + ay * ay);
    var B = 4 * (ax * bx + ay * by);
    var C = bx * bx + by * by;
    var Sabc = 2 * Math.sqrt(A+B+C);
    var A_2 = Math.sqrt(A);
    var A_32 = 2 * A * A_2;
    var C_2 = 2 * Math.sqrt(C);
    var BA = B / A_2;
   return (A_32 * Sabc + A_2 * B * (Sabc - C_2) + (4 * C * A - B * B) * Math.log((2 * A_2 + BA + Sabc) / (BA + C_2))) / (4 * A_32);
}


/*
// cubic bezier percent is 0-1
function getCubicBezierXYatPercent(startPt,controlPt1,controlPt2,endPt,percent){
    var x=CubicN(percent,startPt.x,controlPt1.x,controlPt2.x,endPt.x);
    var y=CubicN(percent,startPt.y,controlPt1.y,controlPt2.y,endPt.y);
    return({x:x,y:y});
}

// cubic helper formula at percent distance
function CubicN(pct, a,b,c,d) {
    var t2 = pct * pct;
    var t3 = t2 * pct;
    return a + (-a * 3 + pct * (3 * a - a * pct)) * pct
    + (3 * b + pct * (-6 * b + b * 3 * pct)) * pct
    + (c * 3 - c * 3 * pct) * t2
    + d * t3;
}
*/

// animate a position on a curve!
//xy=getQuadraticBezierXYatPercent({x:200,y:160},{x:230,y:200},{x:250,y:120},percent);


// MOTOR SOUND SYNTH
var motorSound;
function initEngineSound() {
    console.log("init engine sound");
    // credit: https://github.com/cemrich/js-motor-sound-generation
    // demo: https://christine-coenen.de/demos/motor-sound/
    // actual sound stuff
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    var acontext = new AudioContext();
    if (!acontext) return;
    motorSound = new MotorSound(acontext, new LinearGenerator());
    motorSound.setSpeed(0.5); // 0-2+
    motorSound.setVolume(0.2); // 0-1
    motorSound.regenerate();
    motorSound.start();
}

var MotorSound = function (context, generator) {
    this.currentFrame = 0;
    this.context = context;
    this.speed = 0.6;
    this.isPlaying = false;
    this.generator = generator;
    // scriptNode to change sound wave on the run
    this.scriptNode = context.createScriptProcessor(1024);
    this.scriptNode.onaudioprocess = this.process.bind(this);
    // gainNode for volume control
    this.gainNode = context.createGain();
    this.gainNode.gain.value = 0.5;
    this.scriptNode.connect(this.gainNode);
    this.regenerate();
};

MotorSound.prototype.start = function () {
    this.gainNode.connect(this.context.destination);
};

MotorSound.prototype.stop = function () {
    this.gainNode.disconnect(this.context.destination);
};

MotorSound.prototype.regenerate = function () {
    this.data = this.generator.generate();
};

MotorSound.prototype.setVolume = function (volume) {
    this.gainNode.gain.value = volume;
};

MotorSound.prototype.setGenerator = function (generator) {
    this.generator = generator;
    this.regenerate();
};

MotorSound.prototype.setSpeed = function (speed) {
    this.speed = speed;
};

MotorSound.prototype.process = function (event) {
    // this is the output buffer we can fill with new data
    var channel = event.outputBuffer.getChannelData(0);
    var index;
    for (var i = 0; i < channel.length; ++i) {
        // skip more data frames on higher speed
        this.currentFrame += this.speed;
        index = Math.floor(this.currentFrame) % this.data.length;
        // update buffer from data
        channel[i] = this.data[index];
    }
    this.currentFrame %= this.data.length;
};

var LinearGenerator = function () {
    this.dataLength = 1024;
};
LinearGenerator.prototype.pushLinear = function (data, toValue, toPosition) {
    var lastPosition = data.length - 1;
    var lastValue = data.pop();
    var positionDiff = toPosition - lastPosition;
    var step = (toValue - lastValue) / positionDiff;
    for (var i = 0; i < positionDiff; i++) {
        data.push(lastValue + step * i);
    }
    return data;
};
LinearGenerator.prototype.generate = function () {
    var data = [];
    var lastValue = 1;
    var lastPosition = 0;
    var nextValue, nextPosition;
    data.push(lastValue);
    for (var i = 0.05; i < 1; i += Math.random()/8+0.01) {
        nextPosition = Math.floor(i * this.dataLength);
        nextValue = Math.random() * 2 - 1;
        this.pushLinear(data, nextValue, nextPosition);
    }
    this.pushLinear(data, 1, this.dataLength);
    return data;
};
/*
var NoiseGenerator = function () {
    this.dataLength = 4096;
    this.linearLength = 30;
    this.smoothness = 3;
};
NoiseGenerator.prototype.generate = function () {
    var data = [];
    var lastValue = 0.5;
    data.push(lastValue);
    for (var i = 1; i <= this.dataLength-this.linearLength; i++) {
        lastValue += (Math.random() - 0.5) / this.smoothness;
        lastValue = Math.min(1, lastValue);
        lastValue = Math.max(-1, lastValue);
        data.push(lastValue);
    }
    // interpolate the last view values
    var step = (0.5 - lastValue) / this.linearLength;
    for (var j = 0; j < this.linearLength; j++) {
        data.push(lastValue + step * j);
    }
    data.push(0.5);
    return data;
};

var CanvasGenerator = function () {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 1;
    this.ctx = this.canvas.getContext('2d');
};
CanvasGenerator.prototype.getRandomGradient = function () {
    // get a horizontal gradient with several stops
    var gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);  
    gradient.addColorStop(0, "rgba(0, 0, 0, 255)");
    for (var i = 0.05; i < 1; i += Math.random()/8+0.01) {
        gradient.addColorStop(i, "rgba(0, 0, 0," + Math.random() + ")");
    }
    gradient.addColorStop(1, "rgba(0, 0, 0, 255)");
    return gradient;
};
CanvasGenerator.prototype.generate = function () {
    // draw new gradient
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = this.getRandomGradient();
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // get data from gradient
    var imageData = this.ctx.getImageData(0, 0, this.canvas.width, 1).data;
    var data = [];
    for (var i = 3, len = imageData.length; i < len; i += 4) {
        data.push(imageData[i] / 128 - 1);
    }
    return data;
};
*/
