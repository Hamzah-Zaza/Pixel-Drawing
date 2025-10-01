/* =====================================================
                            globabls
   ===================================================== */
const grid = document.getElementById('grid');
const sizeInput = document.getElementById('sizeInput');
const setSizeBtn = document.getElementById('setSizeBtn');
const pencilBtn = document.getElementById('pencilBtn');
const lineBtn = document.getElementById('lineBtn');
const mirrorBtn = document.getElementById('mirrorBtn');
const selectBtn = document.getElementById('selectBtn');
const clearBtn = document.getElementById('clearBtn');
const flipHBtn = document.getElementById('flipHBtn');
const flipVBtn = document.getElementById('flipVBtn');
const rotateBtn = document.getElementById('rotateBtn');
const reflectBtn = document.getElementById('reflectBtn');
const curveBtn = document.getElementById('curveBtn');
const clearSelBtn = document.getElementById("clearSelBtn");
const sprayCursor = document.getElementById("sprayCursor");
const sprayRadiusInput = document.getElementById("sprayRadiusInput");
const sprayDensityInput = document.getElementById("sprayDensityInput");
const fillBtn = document.getElementById("fillBtn");
const squareBtn = document.getElementById("squareBtn");
const colorReplaceBtn = document.getElementById("colorReplaceBtn");
const fromColorInput = document.getElementById("fromColor");
const toColorInput = document.getElementById("toColor");
const squareFilledBtn = document.getElementById("squareFilledBtn");
const squareOutlineBtn = document.getElementById("squareOutlineBtn");
const circleBtn = document.getElementById("circleBtn");
const circleFilledBtn = document.getElementById("circleFilledBtn");
const circleOutlineBtn = document.getElementById("circleOutlineBtn");
const colorPicker = document.getElementById("colorPicker");
const sprayBtn = document.getElementById('sprayBtn');
const gridContainer = document.getElementById("gridContainer");
const lockBtn = document.getElementById("lockBtn");
const resizeLock = document.getElementById('resizeLockContainer');
const resizeLockContainer = document.getElementById('resizeLockContainer');
const resizeHandle = document.getElementById('resizeHandle');
const resizeLockBtn = document.getElementById('lockBtn');
const previewCanvas = document.getElementById("previewCanvas");
const gradientBtn = document.getElementById("gradientBtn");
const gradientRadiusInput = document.getElementById("gradientRadius");
const inverseGradientBtn = document.getElementById("inverseGradientBtn");
const pencilGradientBtn = document.getElementById("pencilGradientBtn");
const pencilLightenBtn = document.getElementById("pencilLightenBtn");
const moveSelectionBtn = document.getElementById("moveSelectionBtn");

let gradientRadius = parseInt(gradientRadiusInput.value);
let isLocked = true;  // grid locked by default
let offsetX = 0;
let locked = false;
let isResizing = false;
let fillCircle = true; // default filled
let drawing = false;
let currentColor = "black";
let history = [];
let currentTool = "pencil";
let lineStart = null;
let selectStart = null;
let selectionBox = null;
let isSelecting = false;
let curveOffset = 0;
let curveStartPixel = null;
let curveEndPixel = null;
let sprayInterval = null;
let sprayRadius = 3;   // how far spray scatters
let sprayDensity = 5;  // how many pixels per spray tick
let squareStart = null;
let fillSquare = true; // set to false if you want outline only
let squareStartPixel = null;
let squareEndPixel = null;
let circleCenterPixel = null;
let circleRadius = 0;
let drawingCircle = false;
let initialGridSize = parseInt(sizeInput.value);
let lastPixel = null;
let selectionStart = null;
let selectionEnd = null;
let selectedPixels = []; // stores DOM elements
let clipboard = [];      // stores { row, col, color }
let startRow, startCol;
let isMoving = false;
let moveStartRow, moveStartCol;
let previewOffset = { dx: 0, dy: 0 };
let moveOffset = { dx: 0, dy: 0 };
let previewPixels = [];


let originalGrid = {}; // snapshot of colors before move
let isDragging = false;
let dragStart = null;
/* =====================================================
   UI EVENT LISTENERS / CONTROL HANDLERS
   -----------------------------------------------------
   These connect HTML controls (buttons, inputs, sliders)
   to the drawing logic and global state variables.
   ===================================================== */

gradientBtn.addEventListener("click", () => setTool("gradient"));
gradientRadiusInput.addEventListener("input", () => {
    gradientRadius = parseInt(gradientRadiusInput.value);
});

previewCanvas.addEventListener("click", () => {
    if (!document.fullscreenElement) {
        previewCanvas.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
});

resizeHandle.addEventListener('mousedown', (e) => {
    if (isLocked) return;
    e.preventDefault();
    isResizing = true;
});

// Lock button toggles resizing
resizeLockBtn.addEventListener('click', () => {
    isLocked = !isLocked;
    resizeLockBtn.textContent = isLocked ? '🔒' : '🔓';
});

//--------------------------------------------------------------------------------------
colorPicker.addEventListener("input", (e) => {
    currentColor = e.target.value;  // update the global currentColor
});

sprayRadiusInput.addEventListener("input", () => {
    sprayRadius = parseInt(sprayRadiusInput.value);
});
sprayDensityInput.addEventListener("input", () => {
    sprayDensity = parseInt(sprayDensityInput.value);
});

squareFilledBtn.addEventListener("click", () => {
    fillSquare = true;
    setTool("square");
    squareFilledBtn.classList.add("active");
    squareOutlineBtn.classList.remove("active");
});

squareOutlineBtn.addEventListener("click", () => {
    fillSquare = false;
    setTool("square");
    squareOutlineBtn.classList.add("active");
    squareFilledBtn.classList.remove("active");
});

circleFilledBtn.addEventListener("click", () => {
    fillCircle = true;
    setTool("circle");
    circleFilledBtn.classList.add("active");
    circleOutlineBtn.classList.remove("active");
});

circleOutlineBtn.addEventListener("click", () => {
    fillCircle = false;
    setTool("circle");
    circleOutlineBtn.classList.add("active");
    circleFilledBtn.classList.remove("active");
});

setSizeBtn.addEventListener('click', () => {
    const newSize = parseInt(sizeInput.value);
    if (newSize >= 2 && newSize <= 64) {
        history = [];
        createGrid(newSize);
    } else alert("Please choose a size between 2 and 64");
});

clearBtn.addEventListener("click", () => {
    document.querySelectorAll(".pixel").forEach(pixel => pixel.style.backgroundColor = "white");
    history = [];
});

grid.addEventListener("mousemove", e => {
    if (currentTool === "spray") {
        sprayCursor.style.display = "block";
        sprayCursor.style.width = sprayRadius * 2 * 21 + "px";
        sprayCursor.style.height = sprayRadius * 2 * 21 + "px";
        sprayCursor.style.left = (e.pageX - sprayRadius * 21) + "px";
        sprayCursor.style.top = (e.pageY - sprayRadius * 21) + "px";
    } else {
        sprayCursor.style.display = "none";
    }
});

/* =====================================================
                        tool Registry
   ===================================================== */
const tools = {
pencil: {
    mousedown: pixel => {
        drawing = true;
        lastPixel = pixel;
        paintPixel(pixel);
    },
    mouseover: pixel => {
        if (drawing && lastPixel) {
            paintLine(lastPixel, pixel); // draw a line between last and current pixel
            lastPixel = pixel;
        }
    },
    mouseup: () => {
        drawing = false;
        lastPixel = null;
    }
},
    line: {
        mousedown: pixel => {
            if (!lineStart) lineStart = pixel;
            else { drawLine(lineStart, pixel); clearPreview(); lineStart = null; }
        },
        mouseover: pixel => { if (lineStart) { clearPreview(); previewLine(lineStart, pixel); } },
        mouseup: () => { }
    },
    mirror: {
        mousedown: pixel => { drawing = true; paintMirror(pixel); },
        mouseover: pixel => { if (drawing) paintMirror(pixel); },
        mouseup: () => { drawing = false; }
    },
    reflect: {
        mousedown: pixel => { drawing = true; paintReflect(pixel); },
        mouseover: pixel => { if (drawing) paintReflect(pixel); },
        mouseup: () => { drawing = false; }
    },
    select: {
        mousedown: pixel => { selectStart = pixel; isSelecting = true; createSelectionBox(); },
        mouseover: pixel => { if (isSelecting && selectStart) updateSelectionBox(selectStart, pixel); },
        mouseup: () => { isSelecting = false; selectStart = null; }
    },
    curve: {
        mousedown(pixel) {
            if (!curveStartPixel) {
                curveStartPixel = pixel;
                drawing = true;
            } else {
                curveEndPixel = pixel;
                drawCurve(curveStartPixel, curveEndPixel, curveOffset);
                curveStartPixel = null;
                curveEndPixel = null;
                drawing = false;
                clearPreview();
            }
        },
        mouseover(pixel) {
            if (drawing && curveStartPixel) {
                curveEndPixel = pixel;
                clearPreview();
                previewCurve(curveStartPixel, curveEndPixel, curveOffset);
            }
        },
        mouseup() { }
    }, spray: {
        mousedown: pixel => {
            drawing = true;
            startSpraying(pixel);
        },
        mouseover: pixel => {
            if (drawing) startSpraying(pixel);
        },
        mouseup: () => {
            drawing = false;
            stopSpraying();
        }
    }, fill: {
        mousedown: pixel => {
            const pixels = Array.from(document.querySelectorAll('.pixel'));
            const size = parseInt(sizeInput.value);
            const startIndex = pixels.indexOf(pixel);
            const targetColor = pixel.style.backgroundColor;


            if (targetColor !== currentColor) {
                floodFill(pixels, startIndex, targetColor, currentColor, size);
            }
        },
        mouseover: () => { },
        mouseup: () => { }
    }, square: {
        mousedown: pixel => {
            squareStartPixel = pixel;
            drawing = true;
        },
        mouseover: pixel => {
            if (drawing && squareStartPixel) {
                squareEndPixel = pixel; // track current hover
                clearPreview();
                previewSquare(squareStartPixel, squareEndPixel);
            }
        },
        mouseup: () => {
            if (drawing && squareStartPixel && squareEndPixel) {
                drawSquare(squareStartPixel, squareEndPixel);
            }
            squareStartPixel = null;
            squareEndPixel = null;
            drawing = false;
            clearPreview();
        }
    }, circle: {
    mousedown: pixel => {
        circleCenterPixel = pixel;
        circleRadius = 0;
        drawingCircle = true;
        handleCircle(false); // preview mode
    },
    mouseover: pixel => {
        // optional: update preview while adjusting radius with wheel
        if (drawingCircle && circleCenterPixel) handleCircle(false);
    },
    mouseup: pixel => {
        if (drawingCircle && circleCenterPixel) {
            handleCircle(true); // actually draw the circle
            clearPreview();
            drawingCircle = false;
            circleCenterPixel = null;
            circleRadius = 0;
        }
    }
},gradient: {
    mousedown: pixel => {
        drawing = true;
        applyGradient(pixel);
    },
    mouseover: pixel => {
        if (drawing) applyGradient(pixel);
    },
    mouseup: () => {
        drawing = false;
    }
},inverseGradient: {
    mousedown: pixel => {
        drawing = true;
        applyInverseGradient(pixel);
    },
    mouseover: pixel => {
        if (drawing) applyInverseGradient(pixel);
    },
    mouseup: () => {
        drawing = false;
    }
},pencilGradient: {
    mousedown: pixel => {
        drawing = true;
        lastPixel = pixel;
        darkenPixel(pixel);
    },
    mouseover: pixel => {
        if (drawing && lastPixel) {
            paintLineDarken(lastPixel, pixel); // draw line with darkening
            lastPixel = pixel;
        }
    },
    mouseup: () => {
        drawing = false;
        lastPixel = null;
    }
},pencilLighten: {
    mousedown: pixel => {
        drawing = true;
        lastPixel = pixel;
        lightenPixel(pixel);
    },
    mouseover: pixel => {
        if (drawing && lastPixel) {
            paintLineLighten(lastPixel, pixel);
            lastPixel = pixel;
        }
    },
    mouseup: () => {
        drawing = false;
        lastPixel = null;
    }


},


};
/* =====================================================
                        functions
   ===================================================== */
function createGrid(size) {
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${size}, 20px)`;
    grid.style.gridTemplateRows = `repeat(${size}, 20px)`;

    for (let i = 0; i < size * size; i++) {
        const pixel = document.createElement('div');
        pixel.classList.add('pixel');
        pixel.style.backgroundColor = "white";

        // Calculate row and column
        const row = Math.floor(i / size);
        const col = i % size;
        pixel.dataset.row = row;
        pixel.dataset.col = col;

        grid.appendChild(pixel);
    }

    addEventListeners(); // attach grid events after pixels exist
}

function addEventListeners() {
grid.addEventListener("mousedown", e => {
  if (tools[currentTool]?.mousedown) tools[currentTool].mousedown(e.target);
});

grid.addEventListener("mouseover", e => {
  if (tools[currentTool]?.mouseover) tools[currentTool].mouseover(e.target);
});

grid.addEventListener("mouseup", e => {
  if (tools[currentTool]?.mouseup) tools[currentTool].mouseup(e.target);
});

}





function paintLineLighten(startPixel, endPixel) {
    const pixels = Array.from(document.querySelectorAll('.pixel'));
    const size = parseInt(sizeInput.value);
    const startIndex = pixels.indexOf(startPixel);
    const endIndex = pixels.indexOf(endPixel);


    const x0 = startIndex % size;
    const y0 = Math.floor(startIndex / size);
    const x1 = endIndex % size;
    const y1 = Math.floor(endIndex / size);


    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;


    while (true) {
        lightenPixel(pixels[y * size + x]);
        if (x === x1 && y === y1) break;
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
    }
}
function lightenPixel(pixel, amount = 0.1) {
    const color = pixel.style.backgroundColor || "rgb(255,255,255)";
    const rgb = parseColor(color);


    const r = Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * amount));
    const g = Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * amount));
    const b = Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * amount));


    pixel.style.backgroundColor = `rgb(${r},${g},${b})`;
    updatePreview();
}

function darkenPixel(pixel, amount = 0.1) {
    const color = pixel.style.backgroundColor || "rgb(255,255,255)";
    const rgb = parseColor(color);


    // Reduce each channel by the given amount
    const r = Math.max(0, Math.floor(rgb.r * (1 - amount)));
    const g = Math.max(0, Math.floor(rgb.g * (1 - amount)));
    const b = Math.max(0, Math.floor(rgb.b * (1 - amount)));


    pixel.style.backgroundColor = `rgb(${r},${g},${b})`;
    updatePreview();
}

function paintLineDarken(startPixel, endPixel, amount = 0.1) {
    const pixels = Array.from(document.querySelectorAll('.pixel'));
    const size = parseInt(sizeInput.value);
    const startIndex = pixels.indexOf(startPixel);
    const endIndex = pixels.indexOf(endPixel);
    const x0 = startIndex % size;
    const y0 = Math.floor(startIndex / size);
    const x1 = endIndex % size;
    const y1 = Math.floor(endIndex / size);


    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;


    while (true) {
        darkenPixel(pixels[y * size + x], amount);
        if (x === x1 && y === y1) break;
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
    }
}

function applyInverseGradient(centerPixel) {
    const pixels = Array.from(document.querySelectorAll('.pixel'));
    const size = parseInt(sizeInput.value);
    const centerIndex = pixels.indexOf(centerPixel);
    const cx = centerIndex % size;
    const cy = Math.floor(centerIndex / size);


    const innerColor = "white";  // center
    const outerColor = currentColor;  // edges


    for (let y = cy - gradientRadius; y <= cy + gradientRadius; y++) {
        for (let x = cx - gradientRadius; x <= cx + gradientRadius; x++) {
            if (x < 0 || x >= size || y < 0 || y >= size) continue;


            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx*dx + dy*dy);


            if (dist <= gradientRadius) {
                const factor = dist / gradientRadius; // 0 at center, 1 at edge
                const idx = y * size + x;
                pixels[idx].style.backgroundColor = blendColors(innerColor, outerColor, factor);
            }
        }
    }


    updatePreview();
}

function applyGradient(centerPixel) {
    const pixels = Array.from(document.querySelectorAll('.pixel'));
    const size = parseInt(sizeInput.value);
    const centerIndex = pixels.indexOf(centerPixel);
    const cx = centerIndex % size;
    const cy = Math.floor(centerIndex / size);


    const innerColor = currentColor; // center
    const outerColor = "white"; // edges


    for (let y = cy - gradientRadius; y <= cy + gradientRadius; y++) {
        for (let x = cx - gradientRadius; x <= cx + gradientRadius; x++) {
            if (x < 0 || x >= size || y < 0 || y >= size) continue;


            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx*dx + dy*dy);


            if (dist <= gradientRadius) {
                const factor = dist / gradientRadius; // 0 at center, 1 at edge
                const idx = y * size + x;
                pixels[idx].style.backgroundColor = blendColors(innerColor, outerColor, factor);
            }
        }
    }


    updatePreview();
}

function blendColors(color1, color2, factor) {
    const c1 = parseColor(color1);
    const c2 = parseColor(color2);


    const r = Math.round(c1.r * (1 - factor) + c2.r * factor);
    const g = Math.round(c1.g * (1 - factor) + c2.g * factor);
    const b = Math.round(c1.b * (1 - factor) + c2.b * factor);


    return `rgb(${r},${g},${b})`;
}

function parseColor(color) {
    if (color.startsWith("rgb")) {
        const nums = color.match(/\d+/g);
        return { r: +nums[0], g: +nums[1], b: +nums[2] };
    } else {
        const temp = document.createElement("div");
        temp.style.color = color;
        document.body.appendChild(temp);
        const cs = getComputedStyle(temp).color;
        document.body.removeChild(temp);
        const nums = cs.match(/\d+/g);
        return { r: +nums[0], g: +nums[1], b: +nums[2] };
    }
}

function fadeColor(color, factor) {
    let r, g, b;
    if (color.startsWith("rgb")) {
        const nums = color.match(/\d+/g);
        r = parseInt(nums[0]);
        g = parseInt(nums[1]);
        b = parseInt(nums[2]);
    } else {
        // fallback for named colors like "white", "black"
        const temp = document.createElement("div");
        temp.style.color = color;
        document.body.appendChild(temp);
        const cs = getComputedStyle(temp).color;
        document.body.removeChild(temp);
        const nums = cs.match(/\d+/g);
        r = parseInt(nums[0]);
        g = parseInt(nums[1]);
        b = parseInt(nums[2]);
    }
    r = Math.floor(r * factor);
    g = Math.floor(g * factor);
    b = Math.floor(b * factor);
    return `rgb(${r},${g},${b})`;
}

function updatePreview() {
    const canvas = document.getElementById("previewCanvas");
    const ctx = canvas.getContext("2d");
    const pixels = Array.from(document.querySelectorAll(".pixel"));
    const size = parseInt(sizeInput.value);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pixelWidth = canvas.width / size;
    const pixelHeight = canvas.height / size;

    pixels.forEach((pixel, idx) => {
        const x = idx % size;
        const y = Math.floor(idx / size);
        ctx.fillStyle = pixel.style.backgroundColor || "white";
        ctx.fillRect(x * pixelWidth, y * pixelHeight, pixelWidth, pixelHeight);
    });
}

function setInitialGridSize(size) {
    const pixelSize = 20;
    gridContainer.style.width = size * pixelSize + "px";
    gridContainer.style.height = size * pixelSize + "px";
}
   
function addEventListeners() {
    const pixels = document.querySelectorAll('.pixel');
    if (!pixels.length) return; // grid not ready yet

    // Add event listeners to each pixel
    pixels.forEach(pixel => {
        if (!pixel) return; // safety check

        // mousedown
        pixel.addEventListener('mousedown', () => {
            if (tools[currentTool] && tools[currentTool].mousedown) {
                tools[currentTool].mousedown(pixel);
            }
        });

        // mouseover
        pixel.addEventListener('mouseover', () => {
            if (tools[currentTool] && tools[currentTool].mouseover) {
                tools[currentTool].mouseover(pixel);
            }
        });
    });

    // Global mouseup listener
    document.addEventListener('mouseup', () => {
        if (tools[currentTool] && tools[currentTool].mouseup) {
            tools[currentTool].mouseup();
        }
    });








    // Additional listeners if needed (example: spray inputs)
    sprayRadiusInput.addEventListener("input", () => {
        sprayRadius = parseInt(sprayRadiusInput.value);
    });
    sprayDensityInput.addEventListener("input", () => {
        sprayDensity = parseInt(sprayDensityInput.value);
    });
}
function paintLine(startPixel, endPixel) {
    const pixels = Array.from(document.querySelectorAll('.pixel'));
    const size = parseInt(sizeInput.value);
    const startIndex = pixels.indexOf(startPixel);
    const endIndex = pixels.indexOf(endPixel);
    const x0 = startIndex % size;
    const y0 = Math.floor(startIndex / size);
    const x1 = endIndex % size;
    const y1 = Math.floor(endIndex / size);

    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;

    while (true) {
        paintPixel(pixels[y * size + x]);
        if (x === x1 && y === y1) break;
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
    }
}

function undo() {
    const lastAction = history.pop();
    if (!lastAction) return;
    if (lastAction.type === "fill" || lastAction.type === "square") {
        lastAction.pixels.forEach(p => p.pixel.style.backgroundColor = p.oldColor);
    } else if (lastAction.pixel) {
        lastAction.pixel.style.backgroundColor = lastAction.oldColor;
    }
}
function testCircle() {
    const pixels = document.querySelectorAll('.pixel');
    if (!pixels.length) return;
    currentTool = "circle";
    drawingCircle = true;
    circleCenterPixel = pixels[Math.floor(pixels.length / 2)]; // pick center pixel
    circleRadius = 5;
    fillCircle = true;
    previewCircle(); // this should highlight some pixels
    console.log("Test circle drawn at center with radius", circleRadius);
}
function handleCircle(recordHistory = true) {
    if (!circleCenterPixel) return;
    const pixels = Array.from(document.querySelectorAll(".pixel"));
    const size = parseInt(sizeInput.value); // grid width and height (square)
    const cx = pixels.indexOf(circleCenterPixel) % size;
    const cy = Math.floor(pixels.indexOf(circleCenterPixel) / size);
    const changedPixels = [];

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dist = Math.round(Math.sqrt((x - cx) ** 2 + (y - cy) ** 2));
            if ((fillCircle && dist <= circleRadius) || (!fillCircle && dist === circleRadius)) {
                const idx = y * size + x;
                if (!pixels[idx]) continue; // safety check

                if (recordHistory) {
                    const oldColor = pixels[idx].style.backgroundColor;
                    if (oldColor !== currentColor) {
                        pixels[idx].style.backgroundColor = currentColor;
                        changedPixels.push({ pixel: pixels[idx], oldColor, newColor: currentColor });
                    }
                } else {
                    // preview mode
                    pixels[idx].classList.add("preview");
                }
            }
        }
    }








    if (recordHistory && changedPixels.length) {
        history.push({ type: "circle", pixels: changedPixels });
    }
}

function previewCircleMerged() {
    clearPreview();
    if (!circleCenterPixel) return;

    const pixels = Array.from(document.querySelectorAll(".pixel"));
    const size = parseInt(sizeInput.value); // grid is square, so width = height = size
    const cx = pixels.indexOf(circleCenterPixel) % size;
    const cy = Math.floor(pixels.indexOf(circleCenterPixel) / size);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dist = Math.round(Math.sqrt((x - cx) ** 2 + (y - cy) ** 2));
            if ((fillCircle && dist <= circleRadius) || (!fillCircle && dist === circleRadius)) {
                const idx = y * size + x;
                if (pixels[idx]) pixels[idx].classList.add("preview"); // safety check
            }
        }
    }
}

function drawSquare(startPixel, endPixel) {
    const pixels = Array.from(document.querySelectorAll('.pixel'));
    const size = parseInt(sizeInput.value);
    const startX = pixels.indexOf(startPixel) % size;
    const startY = Math.floor(pixels.indexOf(startPixel) / size);
    const endX = pixels.indexOf(endPixel) % size;
    const endY = Math.floor(pixels.indexOf(endPixel) / size);
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    const changedPixels = [];

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const idx = y * size + x;


            if (!fillSquare) {
                if (y !== minY && y !== maxY && x !== minX && x !== maxX) continue;
            }

            if (pixels[idx].style.backgroundColor !== currentColor) {
                changedPixels.push({
                    pixel: pixels[idx],
                    oldColor: pixels[idx].style.backgroundColor,
                    newColor: currentColor
                });
                pixels[idx].style.backgroundColor = currentColor;
            }
        }
    }
































    if (changedPixels.length) {
        history.push({ type: "square", pixels: changedPixels });
    }
}

function previewSquare(startPixel, endPixel) {
    const pixels = Array.from(document.querySelectorAll('.pixel'));
    const size = parseInt(sizeInput.value);
    const startX = pixels.indexOf(startPixel) % size;
    const startY = Math.floor(pixels.indexOf(startPixel) / size);
    const endX = pixels.indexOf(endPixel) % size;
    const endY = Math.floor(pixels.indexOf(endPixel) / size);
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);








    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            // Outline preview
            if (!fillSquare) {
                if (y !== minY && y !== maxY && x !== minX && x !== maxX) continue;
            }
            const idx = y * size + x;
            pixels[idx].classList.add("preview");
        }
    }
}

function startSpraying(pixel) {
    if (sprayInterval) return;
    sprayInterval = setInterval(() => {
        const pixels = Array.from(document.querySelectorAll('.pixel'));
        const size = parseInt(sizeInput.value);
        const index = pixels.indexOf(pixel);
        const x = index % size, y = Math.floor(index / size);

        for (let i = 0; i < sprayDensity; i++) {
            // random point within a circle
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * sprayRadius;
            const dx = Math.round(Math.cos(angle) * radius);
            const dy = Math.round(Math.sin(angle) * radius);
            const nx = x + dx, ny = y + dy;

            if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                paintPixel(pixels[ny * size + nx]);
            }
        }
    }, 50); // sprays every 50ms
}

function stopSpraying() {
    clearInterval(sprayInterval);
    sprayInterval = null;
}

function drawLine(startPixel, endPixel) {
    const pixels = Array.from(document.querySelectorAll('.pixel'));
    const size = parseInt(sizeInput.value);
    const startIndex = pixels.indexOf(startPixel);
    const endIndex = pixels.indexOf(endPixel);
    const startX = startIndex % size, startY = Math.floor(startIndex / size);
    const endX = endIndex % size, endY = Math.floor(endIndex / size);

    let dx = Math.abs(endX - startX), dy = Math.abs(endY - startY);
    let sx = startX < endX ? 1 : -1, sy = startY < endY ? 1 : -1;
    let err = dx - dy;
    let x = startX, y = startY;

    while (true) {
        paintPixel(pixels[y * size + x]);
        if (x === endX && y === endY) break;
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
    }
}

function previewLine(startPixel, endPixel) {
    const pixels = Array.from(document.querySelectorAll('.pixel'));
    const size = parseInt(sizeInput.value);
    const startIndex = pixels.indexOf(startPixel);
    const endIndex = pixels.indexOf(endPixel);
    const startX = startIndex % size, startY = Math.floor(startIndex / size);
    const endX = endIndex % size, endY = Math.floor(endIndex / size);

    let dx = Math.abs(endX - startX), dy = Math.abs(endY - startY);
    let sx = startX < endX ? 1 : -1, sy = startY < endY ? 1 : -1;
    let err = dx - dy;
    let x = startX, y = startY;

    while (true) {
        pixels[y * size + x].classList.add("preview");
        if (x === endX && y === endY) break;
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
    }
}

function clearPreview() {
    document.querySelectorAll('.pixel.preview').forEach(p => p.classList.remove("preview"));
}

function drawCurve(startPixel, endPixel, offset) {
    const pixels = Array.from(document.querySelectorAll('.pixel'));
    const size = parseInt(sizeInput.value);
    const x0 = pixels.indexOf(startPixel) % size;
    const y0 = Math.floor(pixels.indexOf(startPixel) / size);
    const x1 = pixels.indexOf(endPixel) % size;
    const y1 = Math.floor(pixels.indexOf(endPixel) / size);
    let mx = (x0 + x1) / 2;
    let my = (y0 + y1) / 2;

    if (x0 === x1) mx += offset; // vertical
    else if (y0 === y1) my += offset; // horizontal
    else { // diagonal
        const dx = x1 - x0, dy = y1 - y0;
        const len = Math.sqrt(dx * dx + dy * dy);
        mx += -dy / len * offset;
        my += dx / len * offset;
    }

    for (let t = 0; t <= 1; t += 0.02) {
        const xt = Math.round((1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1);
        const yt = Math.round((1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * y1);
        if (pixels[yt * size + xt]) paintPixel(pixels[yt * size + xt]);
    }
}

function previewCurve(startPixel, endPixel, offset) {
    const pixels = Array.from(document.querySelectorAll('.pixel'));
    const size = parseInt(sizeInput.value);
    const x0 = pixels.indexOf(startPixel) % size;
    const y0 = Math.floor(pixels.indexOf(startPixel) / size);
    const x1 = pixels.indexOf(endPixel) % size;
    const y1 = Math.floor(pixels.indexOf(endPixel) / size);

    // Define the midpoint
    let mx = (x0 + x1) / 2;
    let my = (y0 + y1) / 2;

    if (x0 === x1) mx += offset; // vertical
    else if (y0 === y1) my += offset; // horizontal
    else { // diagonal
        const dx = x1 - x0, dy = y1 - y0;
        const len = Math.sqrt(dx * dx + dy * dy);
        mx += -dy / len * offset;
        my += dx / len * offset;
    }

    for (let t = 0; t <= 1; t += 0.02) {
        const xt = Math.round((1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1);
        const yt = Math.round((1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * y1);
        if (pixels[yt * size + xt]) pixels[yt * size + xt].classList.add("preview");
    }
}


function createSelectionBox() {
    if (!selectionBox) {
        selectionBox = document.createElement("div");
        selectionBox.style.position = "absolute";
        selectionBox.style.border = "2px dashed #000";
        selectionBox.style.backgroundColor = "rgba(0,0,255,0.2)";
        selectionBox.style.pointerEvents = "none";
        selectionBox.style.zIndex = "1000";

        const label = document.createElement("div");
        label.style.position = "absolute";
        label.style.top = "-20px";
        label.style.left = "0px";
        label.style.background = "rgba(0,0,0,0.7)";
        label.style.color = "white";
        label.style.padding = "2px 4px";
        label.style.fontSize = "12px";
        label.classList.add("sizeLabel");
        selectionBox.appendChild(label);
        document.body.appendChild(selectionBox);
    }
}

function updateSelectionBox(startPixel, endPixel) {
    const pixels = Array.from(document.querySelectorAll(".pixel"));
    const size = parseInt(sizeInput.value);
    const startIndex = pixels.indexOf(startPixel);
    const endIndex = pixels.indexOf(endPixel);
    let startX = startIndex % size, startY = Math.floor(startIndex / size);
    let endX = endIndex % size, endY = Math.floor(endIndex / size);
    let width = Math.abs(endX - startX) + 1;
    let height = Math.abs(endY - startY) + 1;
    let side = Math.max(width, height);

    if (endX >= startX) endX = startX + side - 1;
    else endX = startX - side + 1;

    if (endY >= startY) endY = startY + side - 1;
    else endY = startY - side + 1;

    endX = Math.max(0, Math.min(size - 1, endX));
    endY = Math.max(0, Math.min(size - 1, endY));

    let minX = Math.min(startX, endX);
    let maxX = Math.max(startX, endX);
    let minY = Math.min(startY, endY);
    let maxY = Math.max(startY, endY);

    const gridRect = grid.getBoundingClientRect();
    const pixelSize = 21;

    selectionBox.style.display = "block";
    selectionBox.style.left = gridRect.left + minX * pixelSize + "px";
    selectionBox.style.top = gridRect.top + minY * pixelSize + "px";
    selectionBox.style.width = (maxX - minX + 1) * pixelSize + "px";
    selectionBox.style.height = (maxY - minY + 1) * pixelSize + "px";
    selectionBox.querySelector(".sizeLabel").textContent =
        `${maxX - minX + 1} × ${maxY - minY + 1}`;
}


function flipSelectionH() {
    const size = parseInt(sizeInput.value);
    const { startX, startY, endX, endY, pixels } = getSelectedPixels();

    for (let y = startY; y <= endY; y++) {
        for (let x = 0; x < Math.floor((endX - startX + 1) / 2); x++) {
            const leftIdx = y * size + (startX + x);
            const rightIdx = y * size + (endX - x);
            [pixels[leftIdx].style.backgroundColor, pixels[rightIdx].style.backgroundColor] =
                [pixels[rightIdx].style.backgroundColor, pixels[leftIdx].style.backgroundColor];
        }
    }
}

function flipSelectionV() {
    const size = parseInt(sizeInput.value);
    const { startX, startY, endX, endY, pixels } = getSelectedPixels();

    for (let y = 0; y < Math.floor((endY - startY + 1) / 2); y++) {
        for (let x = startX; x <= endX; x++) {
            const topIdx = (startY + y) * size + x;
            const bottomIdx = (endY - y) * size + x;
            [pixels[topIdx].style.backgroundColor, pixels[bottomIdx].style.backgroundColor] =
                [pixels[bottomIdx].style.backgroundColor, pixels[topIdx].style.backgroundColor];
        }
    }
}
function rotateSelection90() {
    const size = parseInt(sizeInput.value);
    const { startX, startY, endX, endY, pixels } = getSelectedPixels();
    const cx = (startX + endX) / 2;
    const cy = (startY + endY) / 2;

    // Collect all colored pixels first
    const colored = [];
    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const idx = y * size + x;
            const color = pixels[idx].style.backgroundColor;
            if (color !== "white") colored.push({ x, y, color });
        }
    }








    // Clear the area first
    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            pixels[y * size + x].style.backgroundColor = "white";
        }
    }








    // Rotate 90° clockwise
    colored.forEach(({ x, y, color }) => {
        const dx = x - cx;
        const dy = y - cy;








        const rx = Math.round(cx - dy); // new x after 90° clockwise
        const ry = Math.round(cy + dx); // new y after 90° clockwise








        // Clamp inside selection bounds
        if (rx >= startX && rx <= endX && ry >= startY && ry <= endY) {
            pixels[ry * size + rx].style.backgroundColor = color;
        }
    });
}

function flipWholeH() {
    const size = parseInt(sizeInput.value);
    const pixels = Array.from(document.querySelectorAll(".pixel"));

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < Math.floor(size / 2); x++) {
            const leftIdx = y * size + x;
            const rightIdx = y * size + (size - 1 - x);
            [pixels[leftIdx].style.backgroundColor, pixels[rightIdx].style.backgroundColor] =
                [pixels[rightIdx].style.backgroundColor, pixels[leftIdx].style.backgroundColor];
        }
    }
}

function flipWholeV() {
    const size = parseInt(sizeInput.value);
    const pixels = Array.from(document.querySelectorAll(".pixel"));

    for (let y = 0; y < Math.floor(size / 2); y++) {
        for (let x = 0; x < size; x++) {
            const topIdx = y * size + x;
            const bottomIdx = (size - 1 - y) * size + x;
            [pixels[topIdx].style.backgroundColor, pixels[bottomIdx].style.backgroundColor] =
                [pixels[bottomIdx].style.backgroundColor, pixels[topIdx].style.backgroundColor];
        }
    }
}

function rotateWhole90() {
    const size = parseInt(sizeInput.value);
    const pixels = Array.from(document.querySelectorAll(".pixel"));

    // Copy current colors
    const colors = pixels.map(p => p.style.backgroundColor);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = y * size + x;
            const newX = size - 1 - y;
            const newY = x;
            pixels[newY * size + newX].style.backgroundColor = colors[idx];
        }
    }
}

function clearSelection() {
    const selection = getSelectedPixels();
    if (!selection) return; // exit if no selection

    const { startX, startY, endX, endY, pixels } = selection;
    const size = parseInt(sizeInput.value);

    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            pixels[y * size + x].style.backgroundColor = "white";
        }
    }
}


/* =====================================================
              functions pixel management
   ===================================================== */

function paintPixel(pixel) {
    const oldColor = pixel.style.backgroundColor;
    if (oldColor !== currentColor) {
        pixel.style.backgroundColor = currentColor;
        history.push({ pixel, oldColor, newColor: currentColor });
    }

        updatePreview();
    }

function paintMirror(pixel) {
    const pixels = Array.from(document.querySelectorAll('.pixel'));
    const size = parseInt(sizeInput.value);
    const index = pixels.indexOf(pixel);
    const x = index % size, y = Math.floor(index / size);
    paintPixel(pixel);
    paintPixel(pixels[y * size + (size - 1 - x)]);
}

function paintReflect(pixel) {
    const pixels = Array.from(document.querySelectorAll('.pixel'));
    const size = parseInt(sizeInput.value);
    const index = pixels.indexOf(pixel);
    const x = index % size, y = Math.floor(index / size);
    paintPixel(pixel);
    paintPixel(pixels[(size - 1 - y) * size + (size - 1 - x)]);
}

function floodFill(pixels, startIndex, targetColor, replacementColor, size) {
    if (targetColor === replacementColor) return;

    const stack = [startIndex];
    const changedPixels = []; // store all changed pixels for one undo
    while (stack.length > 0) {
        const idx = stack.pop();
        if (!pixels[idx] || pixels[idx].style.backgroundColor !== targetColor) continue;
        changedPixels.push({
            pixel: pixels[idx],
            oldColor: pixels[idx].style.backgroundColor,
            newColor: replacementColor
        });

        pixels[idx].style.backgroundColor = replacementColor;
        const x = idx % size;
        const y = Math.floor(idx / size);

        if (x > 0) stack.push(idx - 1);
        if (x < size - 1) stack.push(idx + 1);
        if (y > 0) stack.push(idx - size);
        if (y < size - 1) stack.push(idx + size);
    }








    if (changedPixels.length) history.push({ type: "fill", pixels: changedPixels });
}

function getSelectedPixels() {
    const pixels = Array.from(document.querySelectorAll(".pixel"));
    const size = parseInt(sizeInput.value);

    if (selectionBox && selectionBox.style.display === "block") {
        const boxRect = selectionBox.getBoundingClientRect();
        const gridRect = grid.getBoundingClientRect();
        const pixelSize = 21;
        const startX = Math.floor((boxRect.left - gridRect.left) / pixelSize);
        const startY = Math.floor((boxRect.top - gridRect.top) / pixelSize);
        const endX = startX + Math.floor(boxRect.width / pixelSize) - 1;
        const endY = startY + Math.floor(boxRect.height / pixelSize) - 1;
        return { startX, startY, endX, endY, pixels };
    } else {
        // No selection exists
        return null;
    }
}


/* =====================================================
                        buttons
   ===================================================== */

pencilBtn.addEventListener("click", () => setTool("pencil"));
lineBtn.addEventListener("click", () => setTool("line"));
mirrorBtn.addEventListener("click", () => setTool("mirror"));
reflectBtn.addEventListener("click", () => setTool("reflect"));
selectBtn.addEventListener("click", () => setTool("select"));
curveBtn.addEventListener("click", () => setTool("curve"));
squareBtn.addEventListener("click", () => setTool("square"));
circleBtn.addEventListener("click", () => setTool("circle"));
fillBtn.addEventListener("click", () => setTool("fill"));
sprayBtn.addEventListener("click", () => setTool("spray"));
flipHBtn.addEventListener("click", flipSelectionH);
flipVBtn.addEventListener("click", flipSelectionV);
rotateBtn.addEventListener("click", rotateSelection90);
clearSelBtn.addEventListener("click", clearSelection);
document.getElementById("flipHWholeBtn").addEventListener("click", flipWholeH);
document.getElementById("flipVWholeBtn").addEventListener("click", flipWholeV);
document.getElementById("rotateWholeBtn").addEventListener("click", rotateWhole90);
gradientBtn.addEventListener("click", () => setTool("gradient")); // normal gradient
inverseGradientBtn.addEventListener("click", () => setTool("inverseGradient")); // inverse gradient
pencilGradientBtn.addEventListener("click", () => setTool("pencilGradient"));
pencilLightenBtn.addEventListener("click", () => setTool("pencilLighten"));




/* =====================================================
                        Tool
   ===================================================== */

function setTool(tool) {
    currentTool = tool;

    // Remove "active" from all buttons
    [pencilBtn, lineBtn, mirrorBtn, selectBtn, reflectBtn, curveBtn, sprayBtn, fillBtn, squareBtn, circleBtn, gradientBtn, inverseGradientBtn,pencilGradientBtn, pencilLightenBtn].forEach(btn => btn.classList.remove("active"));
    // Highlight the active tool
    if (tool === "fill") fillBtn.classList.add("active");
    if (tool === "spray") sprayBtn.classList.add("active");
    if (tool === "pencil") pencilBtn.classList.add("active");
    if (tool === "line") lineBtn.classList.add("active");
    if (tool === "mirror") mirrorBtn.classList.add("active");
    if (tool === "reflect") reflectBtn.classList.add("active");
    if (tool === "select") selectBtn.classList.add("active");
    if (tool === "curve") curveBtn.classList.add("active");
    if (tool === "square") squareBtn.classList.add("active");
    if (tool === "circle") circleBtn.classList.add("active");
    // Hide selection box if not using selection
    if (tool !== "select" && selectionBox) selectionBox.style.display = "none";
    if (tool === "gradient") gradientBtn.classList.add("active");
if (tool === "inverseGradient") inverseGradientBtn.classList.add("active");
if (tool === "pencilGradient") pencilGradientBtn.classList.add("active");
if (tool === "pencilLighten") pencilLightenBtn.classList.add("active");


}

/* =====================================================
                 global event listeners
===================================================== */

document.addEventListener("wheel", e => {
    // Curve tool
    if (currentTool === "curve" && drawing && curveStartPixel && curveEndPixel) {
        e.preventDefault();
        curveOffset += e.deltaY > 0 ? 1 : -1;
        curveOffset = Math.max(-20, Math.min(20, curveOffset));
        clearPreview();
        previewCurve(curveStartPixel, curveEndPixel, curveOffset);
    }

    // Circle tool
    if (currentTool === "circle" && circleCenterPixel && (drawing || drawingCircle)) {
        e.preventDefault();
        circleRadius += e.deltaY > 0 ? 1 : -1;
        circleRadius = Math.max(0, circleRadius);
        previewCircleMerged(); // merged circle preview function
    }
}, { passive: false });


document.addEventListener('keydown', e => {
    if (e.key === "z") undo(); // Ctrl+Z alternative can be added later
});



document.addEventListener('mousemove', (e) => {
    if (!isResizing || isLocked) return;

    const rect = gridContainer.getBoundingClientRect();
    let newWidth = e.clientX - rect.left;

    // Calculate pixels per row (grid cells)
    const pixelSize = 20;
    let pixelsPerRow = Math.round(newWidth / pixelSize);
    pixelsPerRow = Math.max(2, Math.min(64, pixelsPerRow));








    // Update grid container live
    const sizePx = pixelsPerRow * pixelSize;
    gridContainer.style.width = sizePx + 'px';
    gridContainer.style.height = sizePx + 'px';

    // Move handle to top-right
    resizeHandle.style.right = '0px';
    resizeHandle.style.top = '0px';

    // Update input value
    sizeInput.value = pixelsPerRow;
});


document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;

    // Rebuild grid after drag
    const newSize = parseInt(sizeInput.value);
    createGrid(newSize);
});


/* =====================================================
    creating grid
===================================================== */

setInitialGridSize(initialGridSize);
createGrid(initialGridSize);






