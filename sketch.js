// p5.js 測驗系統 (中文註解)
// 功能要點：
// - preload 載入 questions.csv
// - 顯示題目與四個選項
// - 打字特效顯示題目文字
// - 選項點擊時有選取特效與正誤反饋
// - 根據最終成績顯示不同動畫（confetti / encourage）

let table; // p5 的 Table 物件
let questions = []; // 解析後的題目陣列
let currentIndex = 0; // 目前題目索引
let selected = -1; // 使用者選擇的選項索引
let answered = false; // 本題是否已回答
let score = 0; // 正確題數
let state = 'loading'; // 'loading' | 'quiz' | 'result'

// 打字特效相關
let typingText = '';
let fullText = '';
let typingPos = 0;
let typingSpeed = 2; // 每 frame 顯示的字元數

// 特效系統
let ripples = []; // 點擊選項的擴散特效
let particles = []; // 結果畫面的粒子（confetti / encourage）

function preload() {
  // 請把 questions.csv 放在同一資料夾下
  // 使用 header 格式：question,choice1,choice2,choice3,choice4,answer
  table = loadTable('questions.csv', 'csv', 'header', () => {
    console.log('CSV 載入成功');
  }, (err) => {
    console.warn('CSV 載入失敗，請確認檔案路徑與伺服器設定', err);
  });
}

function setup() {
  // 使用視窗寬高以支援響應式畫面
  createCanvas(windowWidth, windowHeight);
  textFont('Arial');
  // 解析 table
  if (table && table.getRowCount() > 0) {
    for (let r = 0; r < table.getRowCount(); r++) {
      let row = table.getRow(r);
      let q = row.get('question');
      let choices = [
        row.get('choice1'),
        row.get('choice2'),
        row.get('choice3'),
        row.get('choice4')
      ];
      let answer = parseInt(row.get('answer')) - 1; // 轉成 0-base
      questions.push({ question: q, choices: choices, answer: answer });
    }
    state = 'quiz';
    startTypingCurrent();
  } else {
    // 若 CSV 載入失敗或沒題目，顯示提示
    state = 'loading';
  }
}

function windowResized() {
  // 視窗尺寸改變時調整畫布
  resizeCanvas(windowWidth, windowHeight);
  // 保持打字特效在當前題目
  // 若需要可重新啟動 typing 效果： startTypingCurrent();
}

function draw() {
  background(245);

  if (state === 'loading') {
    drawLoading();
    return;
  }

  if (state === 'quiz') {
    drawQuiz();
  } else if (state === 'result') {
    drawResult();
  }

  // 更新並顯示全部 ripple 與粒子
  for (let i = ripples.length - 1; i >= 0; i--) {
    ripples[i].update();
    ripples[i].show();
    if (ripples[i].finished()) ripples.splice(i, 1);
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].show();
    if (particles[i].isDead) particles.splice(i, 1);
  }
}

// -------------------- UI 與繪圖函式 --------------------
function drawLoading() {
  push();
  fill(50);
  textSize(20);
  textAlign(CENTER, CENTER);
  text('正在載入題庫...請使用 HTTP server 開啟此頁面以允許 CSV 載入', width / 2, height / 2);
  pop();
}

function drawQuiz() {
  let qObj = questions[currentIndex];
  // 左側題目區塊
  push();
  fill(30);
  textSize(18);
  textAlign(LEFT, TOP);
  // 問題標題（打字特效）
  let x = 40, y = 40, w = width - 80;
  drawProgressBar(40, 20, width - 80);
  textSize(22);
  wrapText(typingText, x, y + 10, w, 28);
  pop();

  // 選項區塊
  let optX = 40;
  let optY = 160;
  let optW = width - 80;
  let gap = 18;
  for (let i = 0; i < 4; i++) {
    let oy = optY + i * (60 + gap);
    let hovered = isMouseOverOption(i, optX, oy, optW, 60);
    // 背景
    stroke(200);
    if (answered) {
      // 顯示正確與錯誤
      if (i === qObj.answer) {
        fill(200, 255, 200);
      } else if (i === selected && selected !== qObj.answer) {
        fill(255, 220, 220);
      } else {
        fill(255);
      }
    } else {
      fill(hovered ? 245 : 255);
    }
    rect(optX, oy, optW, 60, 8);

    // 選項文字
    noStroke();
    fill(30);
    textSize(18);
    textAlign(LEFT, CENTER);
    let label = String.fromCharCode(65 + i) + '. ' + qObj.choices[i];
    text(label, optX + 18, oy + 30);

    // 如果已回答且是正確答案，畫勾勾；若錯誤則畫叉
    if (answered) {
      if (i === qObj.answer) {
        push();
        translate(optX + optW - 40, oy + 30);
        stroke(40, 150, 40);
        strokeWeight(4);
        noFill();
        line(-10, 0, -2, 10);
        line(-2, 10, 12, -8);
        pop();
      } else if (i === selected && selected !== qObj.answer) {
        push();
        translate(optX + optW - 40, oy + 30);
        stroke(180, 40, 40);
        strokeWeight(4);
        line(-8, -8, 8, 8);
        line(-8, 8, 8, -8);
        pop();
      }
    }
  }

  // 小提示區
  push();
  fill(80);
  textSize(14);
  textAlign(LEFT);
  text('題目 ' + (currentIndex + 1) + ' / ' + questions.length + '    分數: ' + score, 40, height - 36);
  pop();
}

function drawResult() {
  // 顯示分數與根據分數顯示不同動畫
  push();
  textAlign(CENTER, CENTER);
  textSize(32);
  fill(40);
  text('測驗完成', width / 2, 80);
  textSize(26);
  text('你的分數：' + score + ' / ' + questions.length, width / 2, 140);

  let percent = (score / questions.length) * 100;
  textSize(20);
  if (percent >= 80) {
    fill(30, 120, 30);
    text('太棒了！表現優異 🎉', width / 2, 190);
  } else if (percent >= 50) {
    fill(80, 80, 200);
    text('不錯！再多練習可以更好 💪', width / 2, 190);
  } else {
    fill(180, 50, 50);
    text('加油！別灰心，繼續努力 ❤️', width / 2, 190);
  }
  pop();

  // 若粒子已經清空，可顯示「重新測驗」按鈕
  push();
  let bx = width / 2 - 80, by = height - 110, bw = 160, bh = 48;
  fill(240);
  stroke(200);
  rect(bx, by, bw, bh, 8);
  noStroke();
  fill(30);
  textSize(18);
  textAlign(CENTER, CENTER);
  text('重新測驗', width / 2, by + bh / 2);
  pop();
}

// -------------------- 互動處理 --------------------
function mousePressed() {
  if (state === 'quiz') {
    let qObj = questions[currentIndex];
    let optX = 40;
    let optY = 160;
    let optW = width - 80;
    let gap = 18;
    for (let i = 0; i < 4; i++) {
      let oy = optY + i * (60 + gap);
      if (isMouseOverOption(i, optX, oy, optW, 60) && !answered) {
        selected = i;
        answered = true;
        // 建立點擊擴散特效
        ripples.push(new Ripple(mouseX, mouseY));
        // 判斷是否正確
        if (selected === qObj.answer) {
          score++;
        }
        // 顯示短暫反饋然後進入下一題或結果
        setTimeout(() => {
          currentIndex++;
          selected = -1;
          answered = false;
          if (currentIndex >= questions.length) {
            // 結束，顯示結果並產生顆粒動畫
            state = 'result';
            startParticles();
          } else {
            startTypingCurrent();
          }
        }, 900);
        break;
      }
    }
  } else if (state === 'result') {
    // 檢查是否點選「重新測驗」按鈕
    let bx = width / 2 - 80, by = height - 110, bw = 160, bh = 48;
    if (mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh) {
      // reset
      currentIndex = 0;
      score = 0;
      state = 'quiz';
      startTypingCurrent();
    }
  }
}

function isMouseOverOption(i, x, y, w, h) {
  return mouseX >= x && mouseX <= x + w && mouseY >= y + i * 0 && mouseY <= y + h + i * 0 && mouseY >= y && mouseY <= y + h ? (mouseY >= y && mouseY <= y + h && mouseX >= x && mouseX <= x + w) : (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h);
}

// -------------------- 打字特效 --------------------
function startTypingCurrent() {
  fullText = questions[currentIndex].question;
  typingText = '';
  typingPos = 0;
}

function wrapText(txt, x, y, maxWidth, lineHeight) {
  // 簡單的換行繪製器
  let words = txt.split(' ');
  let line = '';
  let ty = y;
  textSize(22);
  for (let n = 0; n < words.length; n++) {
    let testLine = line + words[n] + ' ';
    let testWidth = textWidth(testLine);
    if (testWidth > maxWidth && n > 0) {
      text(line, x, ty);
      line = words[n] + ' ';
      ty += lineHeight;
    } else {
      line = testLine;
    }
  }
  text(line, x, ty);
  // 每 frame 漸進增加打字長度
  if (typingPos < fullText.length) {
    typingPos += typingSpeed;
    typingText = fullText.substring(0, floor(typingPos));
  } else {
    typingText = fullText;
  }
}

// -------------------- 特效類別 --------------------
class Ripple {
  // 擴散圈特效
  constructor(x, y) {
    this.x = x; this.y = y; this.r = 8; this.alpha = 200;
  }
  update() {
    this.r += 6;
    this.alpha -= 10;
  }
  show() {
    push();
    noFill();
    stroke(100, this.alpha);
    strokeWeight(2);
    ellipse(this.x, this.y, this.r * 2);
    pop();
  }
  finished() { return this.alpha <= 0; }
}

class Particle {
  // 用於 confetti 與鼓勵粒子
  constructor(x, y, col) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-2, 2), random(-6, -2));
    this.acc = createVector(0, 0.12);
    this.col = col || color(random(255), random(255), random(255));
    this.life = 255;
    this.isDead = false;
  }
  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.life -= 3;
    if (this.life <= 0) this.isDead = true;
  }
  show() {
    push();
    noStroke();
    fill(red(this.col), green(this.col), blue(this.col), this.life);
    rect(this.pos.x, this.pos.y, 8, 12);
    pop();
  }
}

function startParticles() {
  // 根據分數產生不同動畫
  let percent = (score / questions.length) * 100;
  particles = [];
  if (percent >= 80) {
    // 慶祝 - confetti
    for (let i = 0; i < 120; i++) {
      particles.push(new Particle(random(width), random(-50, 0), color(random(60,255), random(60,255), random(60,255))));
    }
  } else if (percent >= 50) {
    // 溫和鼓勵 - 少量彩帶
    for (let i = 0; i < 60; i++) {
      particles.push(new Particle(random(width / 4, width * 3 / 4), random(-50, 0), color(120, 140 + random(100), 200)));
    }
  } else {
    // 加油鼓勵 - 心型跳動效果（用粒子代表）
    for (let i = 0; i < 40; i++) {
      particles.push(new Particle(width / 2 + random(-60, 60), height - 180 + random(-40, 40), color(240, 80, 120)));
    }
  }
}

// -------------------- 進度條 --------------------
function drawProgressBar(x, y, w) {
  let h = 8;
  let pct = (currentIndex / max(1, questions.length));
  push();
  noStroke();
  fill(230);
  rect(x, y, w, h, 4);
  fill(100, 180, 255);
  rect(x, y, w * pct, h, 4);
  pop();
}

// 在 draw loop 中每 frame 更新打字（為了更平滑，我們在 wrapText 裡更新 typingPos）

