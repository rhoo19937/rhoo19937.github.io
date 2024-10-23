let cvs = [$('#game0'), $('#game1')];
let origin = [[], []];
let cvsx = [0, 0];
let cvsy = [0, 0];

for(let i = 0; i <= 1; i++) {
    cvsx[i] = cvs[i].position().left;
    cvsy[i] = cvs[i].position().top;
    let cvswidth = cvs[i].width();
    let cvsheight = cvs[i].height();

    origin[i] = [
        [0, 0],
        [cvswidth, 0],
        [cvswidth, cvsheight],
        [0, cvsheight]
    ];
}


function refresh() {
    for(let i = 0; i <= 1; i++) {
        let M = [], V = [];
        let x, y, X, Y;
        for(let j = 0; j < 4; j++) {
            x = origin[i][j][0];
            y = origin[i][j][1];
            X = markers[i][j].x() - cvsx[i];
            Y = markers[i][j].y() - cvsy[i];
            M.push([x, y, 1, 0, 0, 0, -x*X, -y*X]);
            M.push([0, 0, 0, x, y, 1, -x*Y, -y*Y]);
            V.push(X);
            V.push(Y);
        }
    
        let ans = $M(M).inv().x($V(V));
        let transform = "perspective(1px)scaleZ(-1)translateZ(-1px)matrix3d(" +
            ans.e(1) + ',' + ans.e(4) + ',' + ans.e(7) + ',0,' +
            ans.e(2) + ',' + ans.e(5) + ',' + ans.e(8) + ',0,' +
            ans.e(3) + ',' + ans.e(6) + ',1,0,' +
            '0,0,0,1)translateZ(1px)';
        cvs[i].css('-webkit-transform', transform);
    }
}


function Marker(elem, func) {
    elem = $(elem);
    this.elem = elem;
    elem.draggable({
        drag: func || refresh
    });
}
Marker.prototype.x = function(x) {
    let e = this.elem;
    if(x) {
        e.css('left', '' + x + 'px');
        return this;
    } else {
        return e.position().left + e.width()/2;
    }
};
Marker.prototype.y = function(y) {
    let e = this.elem;
    if(y) {
        e.css('top', '' + y + 'px');
        return this;
    } else {
        return e.position().top + e.height()/2;
    }
};


let markers = [
    [
        new Marker('#marker0-0'),
        new Marker('#marker0-1'),
        new Marker('#marker0-2'),
        new Marker('#marker0-3'),
    ],
    [
        new Marker('#marker1-0'),
        new Marker('#marker1-1'),
        new Marker('#marker1-2'),
        new Marker('#marker1-3'),
    ],
];


$(function() {
    for(let i = 0; i <= 1; i++) {
        for(let j = 0; j < 4; j++) {
            let x = cvsx[i] + origin[i][j][0];
            let y = cvsy[i] + origin[i][j][1];
            markers[i][j].x(x).y(y);
        }
    }

    refresh();
});



Dom.on(document, 'keydown', (event) => {
    if (event.key != 'r') {
        return;
    }

    for(let i = 0; i <= 1; i++) {
        function swap(a,b) {
            let ax = markers[i][a].elem.position().left;
            let ay = markers[i][a].elem.position().top;
            let bx = markers[i][b].elem.position().left;
            let by = markers[i][b].elem.position().top;

            markers[i][a].x(bx).y(by);
            markers[i][b].x(ax).y(ay);
        }

        swap(0,1);
        swap(2,3);
    }

    refresh();
});