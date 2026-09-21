const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width = canvas.width;
let height = canvas.height;

let time = 0;
let currentPart = 0;
let allFouriers = [];
let drawnPath = [];
let finishedPaths = [];

function generateBouquetParts() {
    let parts = [];

    const createStem = (x0, y0, x1, y1) => {
        let pts = [];
        for (let i = 0; i <= 50; i++) {
            let t = i / 50;
            let x = x0 + (x1 - x0) * t + Math.sin(t * Math.PI) * 15; 
            let y = y0 + (y1 - y0) * t;
            pts.push({x, y});
        }
        parts.push(pts);
    };

    const createFlower = (cx, cy, radius, petals) => {
        let pts = [];
        // 1. Espiral desde el centro
        let coils = 3.5;
        let spiralR = radius * 0.35;
        for (let i = 0; i <= 80; i++) {
            let t = (i / 80) * Math.PI * 2 * coils;
            let r = (spiralR / (Math.PI * 2 * coils)) * t;
            pts.push({x: cx + r * Math.cos(t), y: cy + r * Math.sin(t)});
        }
        // 2. Pétalos de la flor (continúa donde terminó el espiral)
        let baseR = radius * 0.5;
        let varR = radius * 0.5;
        for (let i = 0; i <= 150; i++) {
            let t = (i / 150) * Math.PI * 2;
            let r = baseR + varR * Math.abs(Math.sin(petals * t));
            pts.push({x: cx + r * Math.cos(t), y: cy + r * Math.sin(t)});
        }
        parts.push(pts);
    };

    createStem(0, -90, 0, 220);       // Tallo Central
    createStem(-130, -110, -20, 100); // Tallo Sup Izq
    createStem(130, -110, 20, 100);   // Tallo Sup Der
    createStem(-160, 40, -10, 150);   // Tallo Inf Izq
    createStem(160, 40, 10, 150);     // Tallo Inf Der

    createFlower(0, -90, 75, 6);      // Flor Central
    createFlower(-130, -110, 45, 5);  // Flor Sup Izq
    createFlower(130, -110, 45, 5);   // Flor Sup Der
    createFlower(-160, 40, 40, 4);    // Flor Inf Izq
    createFlower(160, 40, 40, 4);     // Flor Inf Der

    return parts;
}

// Transformada Discreta de Fourier
function dft(vals) {
    let X = [];
    let N = vals.length;
    for (let k = 0; k < N; k++) {
        let re = 0;
        let im = 0;
        for (let n = 0; n < N; n++) {
            let phi = (Math.PI * 2 * k * n) / N;
            re += vals[n].x * Math.cos(phi) + vals[n].y * Math.sin(phi);
            im += vals[n].y * Math.cos(phi) - vals[n].x * Math.sin(phi);
        }
        re /= N;
        im /= N;

        let freq = k;
        if (k > N / 2) freq = k - N;

        let amp = Math.sqrt(re * re + im * im);
        let phase = Math.atan2(im, re);
        X.push({ re, im, freq, amp, phase });
    }
    return X;
}

function init() {
    let parts = generateBouquetParts();
    for (let i = 0; i < parts.length; i++) {
        let fourier = dft(parts[i]);
        fourier.sort((a, b) => b.amp - a.amp);
        allFouriers.push(fourier);
    }
    draw();
}

function draw() {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    let centerX = width / 2;
    let centerY = height / 2 - 30;

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FFB300';
    
    for (let j = 0; j < finishedPaths.length; j++) {
        let p = finishedPaths[j];
        ctx.beginPath();
        for (let i = 0; i < p.length; i++) {
            if (i === 0) ctx.moveTo(p[i].x, p[i].y);
            else ctx.lineTo(p[i].x, p[i].y);
        }
        ctx.stroke();
    }

    if (currentPart < allFouriers.length) {
        let fourierX = allFouriers[currentPart];
        let x = centerX;
        let y = centerY;

        for (let i = 0; i < fourierX.length; i++) {
            let prevX = x;
            let prevY = y;
            let freq = fourierX[i].freq;
            let radius = fourierX[i].amp;
            let phase = fourierX[i].phase;

            x += radius * Math.cos(freq * time + phase);
            y += radius * Math.sin(freq * time + phase);

            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(prevX, prevY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(x, y);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.stroke();
        }

        drawnPath.push({x, y});

        ctx.beginPath();
        for (let i = 0; i < drawnPath.length; i++) {
            if (i === 0) ctx.moveTo(drawnPath[i].x, drawnPath[i].y);
            else ctx.lineTo(drawnPath[i].x, drawnPath[i].y);
        }
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#FFB300';
        ctx.stroke();

        const dt = (Math.PI * 2) / fourierX.length;
        time += dt;

        if (time > Math.PI * 2) {
            time = 0;
            finishedPaths.push([...drawnPath]);
            drawnPath = [];
            currentPart++;
        }

        requestAnimationFrame(draw);
    } else {
        if (!window.restartTimeout) {
            window.restartTimeout = setTimeout(() => {
                currentPart = 0;
                finishedPaths = [];
                window.restartTimeout = null;
                requestAnimationFrame(draw);
            }, 5000);
        }
    }
}

init();
