'use strict';

(() => {
  const BG_W = 640;
  const BG_H = 360;
  const FRAME_W = 64;
  const FRAME_H = 96;

  function makeCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    return [canvas, context];
  }

  function seeded(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function gradient(context, top, bottom) {
    const fill = context.createLinearGradient(0, 0, 0, BG_H);
    fill.addColorStop(0, top);
    fill.addColorStop(1, bottom);
    context.fillStyle = fill;
    context.fillRect(0, 0, BG_W, BG_H);
  }

  function text(context, value, x, y, color, shadow = '#261819') {
    context.font = 'bold 7px monospace';
    context.textBaseline = 'top';
    context.fillStyle = shadow;
    context.fillText(value, x + 1, y + 1);
    context.fillStyle = color;
    context.fillText(value, x, y);
  }

  function bricks(context, x, y, width, height, base, mortar, size = 10) {
    context.fillStyle = base;
    context.fillRect(x, y, width, height);
    context.fillStyle = mortar;
    for (let row = y + 5, index = 0; row < y + height; row += size, index++) {
      context.fillRect(x, row, width, 1);
      const offset = index % 2 ? size * .5 : 0;
      for (let col = x + offset; col < x + width; col += size) {
        context.fillRect(col, row - size + 1, 1, size);
      }
    }
  }

  function windowBox(context, x, y, lit, night) {
    context.fillStyle = '#1b1d27';
    context.fillRect(x - 1, y - 1, 20, 20);
    context.fillStyle = lit ? '#f4bd59' : night ? '#315c72' : '#5c8fa0';
    context.fillRect(x, y, 18, 18);
    context.fillStyle = '#263441';
    context.fillRect(x + 8, y, 2, 18);
    context.fillRect(x, y + 8, 18, 2);
    if (lit) {
      context.fillStyle = '#ffe3a1';
      context.fillRect(x + 2, y + 2, 14, 2);
    }
  }

  function drawCar(context, x, y, color) {
    context.fillStyle = '#16191d';
    context.fillRect(x + 8, y - 3, 16, 7);
    context.fillRect(x + 52, y - 3, 16, 7);
    context.fillStyle = color;
    context.fillRect(x, y - 15, 76, 15);
    context.fillRect(x + 14, y - 25, 49, 11);
    context.fillStyle = '#558594';
    context.fillRect(x + 28, y - 23, 18, 8);
    context.fillStyle = '#e9e1bc';
    context.fillRect(x + 2, y - 10, 4, 4);
    context.fillStyle = '#a52f36';
    context.fillRect(x + 70, y - 10, 4, 4);
  }

  function marketBackground() {
    const [canvas, context] = makeCanvas(BG_W, BG_H);
    const random = seeded(1307);
    gradient(context, '#4d90bb', '#d8c99c');

    context.fillStyle = '#eaf0d9';
    for (let i = 0; i < 24; i++) {
      const x = Math.floor(random() * 670) - 20;
      const y = 10 + Math.floor(random() * 78);
      const width = 12 + Math.floor(random() * 22);
      context.fillRect(x, y, width, 5);
      context.fillRect(x + 4, y - 3, Math.max(5, width - 11), 11);
    }

    for (let x = 0; x < BG_W; x += 38) {
      const height = 40 + Math.floor(random() * 55);
      context.fillStyle = random() > .5 ? '#687d85' : '#75878b';
      context.fillRect(x, 145 - height, 32, height);
      context.fillStyle = '#9fb7b3';
      for (let yy = 152 - height; yy < 140; yy += 12) {
        for (let xx = x + 6; xx < x + 28; xx += 10) {
          if (random() > .36) context.fillRect(xx, yy, 3, 5);
        }
      }
    }

    const buildings = [
      [-12, 91, 144, '#8b4936'],
      [128, 70, 130, '#814433'],
      [248, 103, 124, '#a65739'],
      [360, 82, 137, '#7f4939'],
      [490, 100, 160, '#a36345']
    ];

    buildings.forEach((building, index) => {
      const [x, y, width, color] = building;
      bricks(context, x, y, width, 158, color, '#5d3028', 10);
      context.fillStyle = '#3b3030';
      context.fillRect(x, y - 6, width, 6);

      for (let yy = y + 16; yy < Math.min(y + 95, 188); yy += 28) {
        for (let xx = x + 12; xx < x + width - 20; xx += 34) {
          windowBox(context, xx, yy, ((xx + yy + index) % 5 === 0), false);
        }
      }

      const shopY = 194;
      context.fillStyle = '#283235';
      context.fillRect(x + 6, shopY, width - 12, 55);
      const awnings = ['#d54058', '#159ba3', '#d4543b', '#27905f', '#bc4250'];
      context.fillStyle = awnings[index % awnings.length];
      context.beginPath();
      context.moveTo(x + 4, shopY);
      context.lineTo(x + width - 4, shopY);
      context.lineTo(x + width - 14, shopY + 14);
      context.lineTo(x + 14, shopY + 14);
      context.closePath();
      context.fill();

      context.fillStyle = '#547a7e';
      context.fillRect(x + 16, shopY + 20, width - 32, 22);
      context.fillStyle = '#88aaa6';
      context.fillRect(x + 19, shopY + 23, width - 38, 16);
      const labels = ['KEDAI KOPI', 'BUKU', 'NEON MART', '24 JAM', 'KLINIK'];
      text(context, labels[index], x + 16, shopY + 3, '#f7dc83');
    });

    [112, 520].forEach(treeX => {
      context.fillStyle = '#57402c';
      context.fillRect(treeX - 4, 98, 8, 151);
      const leaves = [
        [-20, 0, 24], [10, -8, 28], [27, 10, 23], [-4, -25, 26]
      ];
      leaves.forEach(([offsetX, offsetY, radius], leafIndex) => {
        context.fillStyle = leafIndex % 2 ? '#3d8d4b' : '#2c713d';
        context.fillRect(treeX + offsetX - radius, 90 + offsetY - radius * .5, radius * 2, radius * 1.35);
        context.fillStyle = '#54a95a';
        context.fillRect(treeX + offsetX - radius + 5, 93 + offsetY - radius * .5, radius * 1.5, radius);
      });
    });

    context.fillStyle = '#87897f';
    context.fillRect(0, 248, BG_W, 31);
    context.fillStyle = '#646963';
    for (let x = 0; x < BG_W; x += 32) {
      context.fillRect(x, 248, 1, 31);
      context.fillRect(x, 277, 32, 2);
    }

    context.fillStyle = '#303a42';
    context.fillRect(0, 281, BG_W, 79);
    context.fillStyle = '#3c4850';
    for (let y = 287; y < BG_H; y += 11) context.fillRect(0, y, BG_W, 1);
    context.fillStyle = '#d8d0a3';
    for (let x = 20; x < BG_W; x += 105) context.fillRect(x, 330, 55, 3);

    drawCar(context, 18, 282, '#466f8a');
    drawCar(context, 438, 282, '#8d3935');

    for (let i = 0; i < 260; i++) {
      const x = Math.floor(random() * BG_W);
      const y = 282 + Math.floor(random() * 78);
      const palette = ['#3b4b54', '#46565c', '#2b343c', '#675b49'];
      context.fillStyle = palette[Math.floor(random() * palette.length)];
      context.fillRect(x, y, 1 + Math.floor(random() * 3), 1);
    }

    return canvas;
  }

  function alleyBackground() {
    const [canvas, context] = makeCanvas(BG_W, BG_H);
    const random = seeded(8821);
    gradient(context, '#08152f', '#552746');

    for (let x = 0; x < BG_W; x += 34) {
      const height = 55 + Math.floor(random() * 105);
      context.fillStyle = random() > .5 ? '#14243f' : '#1c2949';
      context.fillRect(x, 171 - height, 31, height);
      const lights = ['#36a6c4', '#de6688', '#eeb64e'];
      for (let yy = 178 - height; yy < 166; yy += 12) {
        for (let xx = x + 5; xx < x + 27; xx += 9) {
          if (random() > .42) {
            context.fillStyle = lights[Math.floor(random() * lights.length)];
            context.fillRect(xx, yy, 3, 5);
          }
        }
      }
    }

    const buildings = [
      [-20, 80, 166, '#482e35'],
      [138, 99, 145, '#37313f'],
      [271, 65, 152, '#49313b'],
      [412, 91, 126, '#303543'],
      [527, 72, 145, '#4e3038']
    ];

    buildings.forEach((building, index) => {
      const [x, y, width, color] = building;
      bricks(context, x, y, width, 180, color, '#2b222a', 8);
      for (let yy = y + 14; yy < 185; yy += 26) {
        for (let xx = x + 10; xx < x + width - 20; xx += 32) {
          windowBox(context, xx, yy, random() > .57, true);
        }
      }
      const shopY = 191;
      context.fillStyle = '#151d24';
      context.fillRect(x + 5, shopY, width - 10, 61);
      const signs = ['#be3156', '#169aa6', '#ca852e', '#653696'];
      context.fillStyle = signs[index % signs.length];
      context.fillRect(x + 14, shopY + 6, width - 28, 15);
      const labels = ['KEDAI', 'KOPI O', 'MAMAK', '24 JAM', 'HOTEL'];
      text(context, labels[index], x + 21, shopY + 8, '#f5dfa4');
      context.fillStyle = '#31565e';
      context.fillRect(x + 16, shopY + 26, width - 32, 28);
      context.fillStyle = '#46d8e3';
      context.fillRect(x + 7, shopY - 1, width - 14, 2);
    });

    context.fillStyle = '#10264a';
    context.fillRect(288, 105, 69, 18);
    text(context, 'JALAN 88', 295, 109, '#ead096', '#081122');

    context.fillStyle = '#18232e';
    context.fillRect(0, 252, BG_W, 108);

    for (let i = 0; i < 52; i++) {
      const x = Math.floor(random() * BG_W);
      const y = 256 + Math.floor(random() * 104);
      const width = 8 + Math.floor(random() * 48);
      const colors = ['#254459', '#4b2d49', '#624b40', '#1d3442'];
      context.fillStyle = colors[Math.floor(random() * colors.length)];
      context.fillRect(x, y, width, 1 + Math.floor(random() * 3));
    }

    [[70,315,100],[250,286,75],[404,330,132],[542,281,70]].forEach(([x,y,width]) => {
      context.fillStyle = '#1c4c66';
      context.fillRect(x, y, width, 7);
      context.fillStyle = '#5a9bb2';
      context.fillRect(x + 8, y + 3, width - 16, 1);
    });

    [75, 360, 585].forEach(lampX => {
      context.fillStyle = '#25232b';
      context.fillRect(lampX, 138, 4, 116);
      context.fillRect(lampX - 5, 132, 14, 10);
      context.fillStyle = '#ffd078';
      context.fillRect(lampX - 1, 134, 6, 6);
      context.fillStyle = 'rgba(255,190,90,.12)';
      context.fillRect(lampX - 20, 124, 43, 29);
    });

    return canvas;
  }

  function rooftopBackground() {
    const [canvas, context] = makeCanvas(BG_W, BG_H);
    const random = seeded(2209);
    gradient(context, '#150d2e', '#932d59');

    context.fillStyle = '#ead9aa';
    context.fillRect(487, 42, 27, 27);
    context.fillStyle = '#302040';
    context.fillRect(494, 42, 21, 20);

    for (let x = -10; x < BG_W; x += 36) {
      const height = 50 + Math.floor(random() * 120);
      context.fillStyle = random() > .5 ? '#171a36' : '#211a3d';
      context.fillRect(x, 226 - height, 31, height);
      const lights = ['#3ed0de', '#f36d9b', '#f1bb4c'];
      for (let yy = 233 - height; yy < 220; yy += 11) {
        for (let xx = x + 5; xx < x + 27; xx += 9) {
          if (random() > .44) {
            context.fillStyle = lights[Math.floor(random() * lights.length)];
            context.fillRect(xx, yy, 3, 5);
          }
        }
      }
      if ((x / 36) % 4 === 0) {
        context.fillStyle = '#d94a80';
        context.fillRect(x + 14, 209 - height, 2, 17);
      }
    }

    context.fillStyle = '#251f39';
    context.fillRect(0, 222, BG_W, 33);
    context.fillStyle = '#50364e';
    context.fillRect(0, 217, BG_W, 6);
    context.fillStyle = '#1c192e';
    for (let x = 0; x < BG_W; x += 28) context.fillRect(x, 224, 1, 28);

    context.fillStyle = '#353044';
    context.fillRect(0, 255, BG_W, 105);
    context.fillStyle = '#423b50';
    for (let y = 264; y < BG_H; y += 18) context.fillRect(0, y, BG_W, 1);
    context.fillStyle = '#272436';
    for (let x = -20; x < BG_W; x += 70) {
      context.beginPath();
      context.moveTo(x, 255);
      context.lineTo(x + 36, BG_H);
      context.lineTo(x + 39, BG_H);
      context.lineTo(x + 3, 255);
      context.fill();
    }

    context.fillStyle = '#493d52';
    context.fillRect(32, 267, 84, 71);
    context.fillStyle = '#765a70';
    context.fillRect(41, 276, 66, 10);
    context.fillStyle = '#4b3d51';
    context.fillRect(510, 246, 108, 92);
    context.fillStyle = '#9d5056';
    context.fillRect(523, 259, 83, 12);

    [160, 220, 420].forEach(ventX => {
      context.fillStyle = '#4d505b';
      context.fillRect(ventX, 284, 39, 43);
      context.fillStyle = '#6a6e78';
      for (let y = 290; y < 323; y += 7) context.fillRect(ventX + 5, y, 29, 1);
    });

    [90, 330, 565].forEach(antennaX => {
      context.fillStyle = '#2b2839';
      context.fillRect(antennaX, 150, 2, 70);
      context.fillRect(antennaX - 16, 170, 34, 2);
      context.fillRect(antennaX - 10, 185, 22, 2);
      context.fillStyle = '#ff4d69';
      context.fillRect(antennaX - 2, 147, 6, 5);
    });

    return canvas;
  }

  window.NEON_BACKGROUNDS=[marketBackground(),alleyBackground(),rooftopBackground()];
})();
