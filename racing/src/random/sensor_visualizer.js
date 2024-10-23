// todo: coeffをバネごとに変えたほうがいいのか??

const canvas = document.getElementById("squareCanvas");
const ctx = canvas.getContext("2d");

document.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', draw);
});

function getInput(name) {
    return parseFloat(document.getElementById(name).value);
}

function draw() {
    drawSquare(getInput("v1"), getInput("v2"), getInput("v3"), getInput("v4"));
}

// v1   v2
// v3   v4
function drawSquare(v1, v2, v3, v4) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 正方形の座標
    const squareSize = 250;
    const startX = 125;
    const startY = 125;

    const coeff = getInput("coeff");

    const d1 = (v1 - getInput("d1")) * coeff;
    const d2 = (v2 - getInput("d2")) * coeff;
    const d3 = (v3 - getInput("d3")) * coeff;
    const d4 = (v4 - getInput("d4")) * coeff;

    // 値とメーターの表示
    drawValue(startX, startY, v1, d1);
    drawValue(startX + squareSize, startY, v2, d2);
    drawValue(startX, startY + squareSize, v3, d3);
    drawValue(startX + squareSize, startY + squareSize, v4, d4);

    ctx.strokeStyle = "black";
    ctx.strokeRect(startX, startY, squareSize, squareSize);

    // 矢印を描画
    drawGradientArrow(d1, d2, d3, d4, startX, startY, squareSize);
}

function drawValue(x, y, value, diff) {
    ctx.font = "30px Arial";
    ctx.fillStyle = "black";
    ctx.fillText(value.toFixed(2), x - 13, y - 13);

    // 差分のメーターの描画
    const color = diff > 0 ? `rgba(255, 0, 0, ${Math.min(Math.abs(diff), 1)})` : `rgba(0, 0, 255, ${Math.min(Math.abs(diff), 1)})`;

    // メーターの表示（横向きバー）
    const meterWidth = 63;
    const meterHeight = 13;
    const meterX = x - meterWidth / 2;
    const meterY = y + 7;
    
    // メーター背景
    ctx.fillStyle = "lightgray";
    ctx.fillRect(meterX, meterY, meterWidth, meterHeight);

    // 差分の色付きバー
    ctx.fillStyle = color;
    const diffBarWidth = diff * (meterWidth / 2);
    ctx.fillRect(meterX + meterWidth / 2, meterY, diffBarWidth, meterHeight);
}

function drawGradientArrow(v1, v2, v3, v4, startX, startY, squareSize) {
    const centerX = startX + squareSize / 2;
    const centerY = startY + squareSize / 2;

    // 勾配の計算
    const gradientX = (v2 + v4) - (v1 + v3);
    const gradientY = (v3 + v4) - (v1 + v2);

    // 勾配の大きさに基づいて矢印の長さを決定
    const gradientMagnitude = Math.sqrt(gradientX ** 2 + gradientY ** 2);
    const maxArrowLength = 1000;  // 矢印の最大長さ
    const arrowLength = Math.min(maxArrowLength, gradientMagnitude * 30); // 勾配が大きいほど矢印が長くなる

    const angle = Math.atan2(gradientY, gradientX);

    ctx.strokeStyle = "green";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + arrowLength * Math.cos(angle), centerY + arrowLength * Math.sin(angle));
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    const thres = getInput("thres") * getInput("coeff");
    if (gradientMagnitude <= thres) {
        ctx.strokeStyle = "blue";
    } else {
        ctx.strokeStyle = "red";
    }
    ctx.arc(centerX, centerY, thres * 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.closePath();

    ctx.strokeStyle = "green";
    // 矢印の先端を描画
    drawArrowHead(centerX + arrowLength * Math.cos(angle), centerY + arrowLength * Math.sin(angle), angle);
}

function drawArrowHead(x, y, angle) {
    const headLength = 10;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - headLength * Math.cos(angle - Math.PI / 6), y - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x, y);
    ctx.lineTo(x - headLength * Math.cos(angle + Math.PI / 6), y - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
}

function setDefault() {
    document.getElementById("d1").value = document.getElementById("v1").value;
    document.getElementById("d2").value = document.getElementById("v2").value;
    document.getElementById("d3").value = document.getElementById("v3").value;
    document.getElementById("d4").value = document.getElementById("v4").value;
}

function setValue(v1, v2, v3, v4) {
    document.getElementById("v1").value = v1;
    document.getElementById("v2").value = v2;
    document.getElementById("v3").value = v3;
    document.getElementById("v4").value = v4;
}

document.body.addEventListener("keydown", (e) => {
    if (e.key == "Enter") {
        setDefault();
        draw();
    }
});

draw();

const socket = io();
// データ受信時の処理
socket.on('receiveData', (data) => {
    console.log(data);
    const d = data.split(',');
    setValue(parseFloat(d[0]), parseFloat(d[1]), parseFloat(d[2]), parseFloat(d[3]));
    draw();
});