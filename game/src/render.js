// Everything the player sees, drawn on one canvas with plain 2D shapes:
// the turkey, the chasing farmer, the farmyard, garden, kitchen yard and
// woods, the HUD and the title / caught / escaped screens. No images.
import { VIEW, GROUND_Y, TURKEY, RUN, STAGES } from './config.js';
import { SCREENS } from './config.js';

export { SCREENS };

const FONT = (px, weight = 700) => `${weight} ${px}px "Trebuchet MS", "Segoe UI", sans-serif`;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function text(ctx, str, x, y, font, color, align = 'center', outline = null) {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (outline) {
    ctx.lineWidth = 5;
    ctx.strokeStyle = outline;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.scale = Math.min(this.canvas.width / VIEW.width, this.canvas.height / VIEW.height);
    this.offsetX = (this.canvas.width - VIEW.width * this.scale) / 2;
    this.offsetY = (this.canvas.height - VIEW.height * this.scale) / 2;
    this.dpr = dpr;
  }

  /** Draw the whole frame for `screen`, given the live `world` (or a staged one). */
  draw(world, screen, ui) {
    const ctx = this.ctx;
    const stage = world.stage;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#2b1d12';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);

    this.drawSky(ctx, stage, world.scroll);
    this.drawGround(ctx, stage, world.scroll);
    this.drawScenery(ctx, stage, world.scroll, world.distance);
    if (screen === SCREENS.TITLE) this.drawTitleBackdrop(ctx, world);
    this.drawPickups(ctx, world);
    this.drawObstacles(ctx, world);
    this.drawFarmer(ctx, world);
    this.drawTurkey(ctx, world, screen);
    this.drawParticles(ctx, world);

    if (screen === SCREENS.PLAY) this.drawHud(ctx, world, ui);
    if (screen === SCREENS.TITLE) this.drawTitle(ctx, ui);
    if (screen === SCREENS.OVER) this.drawCaught(ctx, world, ui);
    if (screen === SCREENS.ESCAPED) this.drawEscaped(ctx, world, ui);
    ctx.restore();
  }

  drawSky(ctx, stage, scroll) {
    const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    grad.addColorStop(0, stage.sky[0]);
    grad.addColorStop(1, stage.sky[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW.width, GROUND_Y);
    // Drifting clouds.
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 4; i += 1) {
      const cx = ((i * 317 - scroll * 0.12) % 1100 + 1100) % 1100 - 70;
      const cy = 52 + i * 34;
      ellipse(ctx, cx, cy, 46, 16);
      ellipse(ctx, cx + 30, cy + 6, 34, 13);
      ellipse(ctx, cx - 32, cy + 7, 28, 11);
    }
    // A low autumn sun.
    ctx.fillStyle = '#fff3c4';
    ellipse(ctx, 830, 74, 34, 34);
    ctx.fillStyle = 'rgba(255,243,196,0.35)';
    ellipse(ctx, 830, 74, 52, 52);
  }

  drawGround(ctx, stage, scroll) {
    ctx.fillStyle = stage.ground;
    ctx.fillRect(0, GROUND_Y, VIEW.width, VIEW.height - GROUND_Y);
    ctx.fillStyle = stage.grass;
    ctx.fillRect(0, GROUND_Y, VIEW.width, 10);
    // Dirt speckles scrolling with the world.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 0; i < 26; i += 1) {
      const x = ((i * 173 - scroll) % 1020 + 1020) % 1020 - 30;
      const y = GROUND_Y + 22 + ((i * 37) % 58);
      ellipse(ctx, x, y, 7, 3);
    }
  }

  drawScenery(ctx, stage, scroll, distance) {
    const stageIndex = STAGES.indexOf(stage);
    // Distant silhouettes: barn, trees, fence posts, the farmhouse roof.
    const layer = (factor, drawOne) => {
      for (let i = -1; i < 5; i += 1) {
        const x = i * 260 - ((scroll * factor) % 260);
        drawOne(x, i);
      }
    };
    ctx.fillStyle = 'rgba(90,50,20,0.28)';
    layer(0.25, (x, i) => {
      if (stageIndex === 3) {
        // Woods: tall pines.
        ctx.beginPath();
        ctx.moveTo(x + 40, GROUND_Y);
        ctx.lineTo(x + 70, GROUND_Y - 150);
        ctx.lineTo(x + 100, GROUND_Y);
        ctx.closePath();
        ctx.fill();
      } else {
        // Farm buildings on the horizon.
        ctx.fillRect(x + 20, GROUND_Y - 66, 90, 66);
        ctx.beginPath();
        ctx.moveTo(x + 10, GROUND_Y - 66);
        ctx.lineTo(x + 65, GROUND_Y - 108);
        ctx.lineTo(x + 120, GROUND_Y - 66);
        ctx.closePath();
        ctx.fill();
      }
    });
    // Near fence posts.
    ctx.fillStyle = 'rgba(70,40,16,0.5)';
    layer(0.6, (x) => {
      ctx.fillRect(x, GROUND_Y - 34, 8, 34);
      ctx.fillRect(x + 60, GROUND_Y - 34, 8, 34);
      ctx.fillRect(x, GROUND_Y - 30, 68, 5);
      ctx.fillRect(x, GROUND_Y - 16, 68, 5);
    });
    // Stage props on the ground: pumpkins in the garden, a scarecrow, a woodpile.
    if (stageIndex === 1) {
      for (let i = 0; i < 3; i += 1) {
        const x = ((i * 430 + 260 - scroll * 0.9) % 1100 + 1100) % 1100 - 70;
        this.drawPumpkin(ctx, x, GROUND_Y - 16, 30);
      }
    }
    if (stageIndex === 2) {
      // The kitchen window glows ahead — the oven is in there.
      const x = ((700 - scroll * 0.9) % 1100 + 1100) % 1100 - 70;
      ctx.fillStyle = '#5a3a1e';
      ctx.fillRect(x, GROUND_Y - 120, 130, 120);
      ctx.fillStyle = '#ffd76a';
      ctx.fillRect(x + 18, GROUND_Y - 96, 34, 40);
      ctx.fillRect(x + 78, GROUND_Y - 96, 34, 40);
      ctx.fillStyle = '#8a5a30';
      ctx.fillRect(x + 52, GROUND_Y - 58, 26, 58);
    }
    // Distance marker: a little signpost every 250 m.
    const nextSign = (Math.floor(distance / 250) + 1) * 250;
    const signX = VIEW.width + 40 - ((nextSign - distance) * RUN.pxPerMetre);
    if (signX > -60 && signX < VIEW.width + 60) {
      ctx.fillStyle = '#6b4423';
      ctx.fillRect(signX, GROUND_Y - 64, 6, 64);
      ctx.fillStyle = '#f5e6c8';
      roundRect(ctx, signX - 34, GROUND_Y - 96, 74, 34, 6);
      ctx.fill();
      text(ctx, `${nextSign} m`, signX + 3, GROUND_Y - 79, FONT(15), '#6b4423');
    }
  }

  drawPumpkin(ctx, x, y, size) {
    ctx.fillStyle = '#e07820';
    ellipse(ctx, x, y, size, size * 0.8);
    ctx.fillStyle = '#c85f10';
    ellipse(ctx, x - size * 0.4, y, size * 0.45, size * 0.7);
    ellipse(ctx, x + size * 0.4, y, size * 0.45, size * 0.7);
    ctx.fillStyle = '#4d7a3a';
    ctx.fillRect(x - 3, y - size * 0.95, 6, 12);
  }

  drawPickups(ctx, world) {
    for (const item of world.pickups) {
      if (!item.active) continue;
      const bobY = Math.sin(item.bob) * 4;
      if (item.kind === 'corn') {
        ctx.save();
        ctx.translate(item.x + 15, item.y + 15 + bobY);
        ctx.fillStyle = '#3f7a2e';
        ctx.beginPath();
        ctx.moveTo(-12, 6);
        ctx.lineTo(-20, 16);
        ctx.lineTo(-8, 12);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(12, 6);
        ctx.lineTo(20, 16);
        ctx.lineTo(8, 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffcf3f';
        ellipse(ctx, 0, 0, 11, 15);
        ctx.fillStyle = '#e0a92e';
        for (let r = -1; r <= 1; r += 1) {
          ctx.fillRect(-8, r * 8, 16, 2);
        }
        ctx.restore();
      } else {
        // Golden feather: a shield pickup.
        ctx.save();
        ctx.translate(item.x + 17, item.y + 17 + bobY);
        ctx.rotate(Math.sin(item.bob * 0.7) * 0.3);
        ctx.fillStyle = '#ffd94d';
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.quadraticCurveTo(14, -4, 8, 14);
        ctx.quadraticCurveTo(0, 10, -6, 14);
        ctx.quadraticCurveTo(-12, -4, 0, -16);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#c8952a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(0, 12);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  drawObstacles(ctx, world) {
    for (const o of world.obstacles) {
      if (!o.active) continue;
      const x = o.x;
      const y = o.y;
      if (o.kind === 'haybale') {
        ctx.fillStyle = '#d9a441';
        roundRect(ctx, x, y, o.width, o.height, 8);
        ctx.fill();
        ctx.strokeStyle = '#a67c22';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 10);
        ctx.lineTo(x + o.width - 6, y + 10);
        ctx.moveTo(x + 6, y + o.height / 2);
        ctx.lineTo(x + o.width - 6, y + o.height / 2);
        ctx.moveTo(x + 6, y + o.height - 10);
        ctx.lineTo(x + o.width - 6, y + o.height - 10);
        ctx.stroke();
      } else if (o.kind === 'fence') {
        ctx.fillStyle = '#8a5a30';
        ctx.fillRect(x + 4, y, 8, o.height);
        ctx.fillRect(x + o.width - 12, y, 8, o.height);
        ctx.fillRect(x, y + 10, o.width, 7);
        ctx.fillRect(x, y + 32, o.width, 7);
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(x, y, o.width, 5);
      } else if (o.kind === 'puddle') {
        ctx.fillStyle = '#5aa3d0';
        ellipse(ctx, x + o.width / 2, GROUND_Y - 4, o.width / 2, 8);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ellipse(ctx, x + o.width / 2 - 12, GROUND_Y - 6, 16, 3);
      } else if (o.kind === 'clothesline') {
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(x, GROUND_Y - 92, 6, 92);
        ctx.fillRect(x + o.width - 6, GROUND_Y - 92, 6, 92);
        ctx.strokeStyle = '#3a2a18';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y - 90);
        ctx.lineTo(x + o.width, GROUND_Y - 90);
        ctx.stroke();
        ctx.fillStyle = '#e8e4da';
        ctx.fillRect(x + 12, GROUND_Y - 90, 18, 30);
        ctx.fillStyle = '#c96a4a';
        ctx.fillRect(x + 38, GROUND_Y - 90, 18, 26);
      } else if (o.kind === 'pumpkin') {
        this.drawPumpkin(ctx, x + o.width / 2, GROUND_Y - o.height / 2, 26);
        // A rolling pumpkin wobbles.
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ellipse(ctx, x + o.width / 2, GROUND_Y - 2, 24, 4);
      } else if (o.kind === 'oven') {
        ctx.fillStyle = '#4a4a52';
        roundRect(ctx, x, y, o.width, o.height, 6);
        ctx.fill();
        ctx.fillStyle = '#22222a';
        roundRect(ctx, x + 8, y + 10, o.width - 16, 34, 4);
        ctx.fill();
        ctx.fillStyle = '#ff7a2a';
        ctx.beginPath();
        ctx.moveTo(x + 16, y + 38);
        ctx.quadraticCurveTo(x + 26, y + 16, x + 36, y + 38);
        ctx.quadraticCurveTo(x + 46, y + 20, x + 56, y + 38);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#c8c8d0';
        ctx.fillRect(x + 10, y + 54, o.width - 20, 6);
        ctx.fillStyle = '#ff5a3c';
        ellipse(ctx, x + 16, y + 68, 4, 4);
        ellipse(ctx, x + 32, y + 68, 4, 4);
      } else if (o.kind === 'knife') {
        // The carving knife swings down from above on a rope.
        const swing = Math.sin(o.swing) * 0.5;
        const pivotX = x + o.width / 2;
        const pivotY = 0;
        const tipX = pivotX + Math.sin(swing) * 110;
        const tipY = 150;
        ctx.strokeStyle = '#3a2a18';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(tipX, tipY - 40);
        ctx.stroke();
        ctx.save();
        ctx.translate(tipX, tipY - 30);
        ctx.rotate(swing * 0.9);
        ctx.fillStyle = '#d8dce2';
        ctx.beginPath();
        ctx.moveTo(0, -34);
        ctx.lineTo(10, 6);
        ctx.lineTo(0, 30);
        ctx.lineTo(-10, 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#5a3a1e';
        ctx.fillRect(-5, -52, 10, 20);
        ctx.restore();
      }
    }
  }

  drawTurkey(ctx, world, screen) {
    const p = world.player;
    const blink = world.time < p.invincibleUntil && Math.floor(world.time * 14) % 2 === 0;
    if (blink && screen === SCREENS.PLAY) return; // invincibility flicker
    const x = p.x;
    const y = p.y;
    const bob = p.grounded && screen === SCREENS.PLAY ? Math.sin(p.runPhase) * 2.5 : 0;
    const shielded = world.time < world.shieldUntil;
    ctx.save();
    ctx.translate(x + TURKEY.width / 2, y + TURKEY.height + bob);

    if (p.sliding) {
      // Ducked low, wings tucked, beak forward.
      ctx.fillStyle = '#8a5a2e';
      ellipse(ctx, 0, -14, 34, 14);
      ctx.fillStyle = '#a06a35';
      ellipse(ctx, 30, -18, 16, 11);
      ctx.fillStyle = '#e07820';
      ctx.beginPath();
      ctx.moveTo(42, -20);
      ctx.lineTo(56, -15);
      ctx.lineTo(42, -11);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#222';
      ellipse(ctx, 32, -22, 2.5, 2.5);
    } else {
      // Fanned tail.
      const flap = p.grounded ? 0 : Math.sin(world.time * 18) * 0.25;
      ctx.save();
      ctx.rotate(-0.5 + flap);
      for (let i = -2; i <= 2; i += 1) {
        ctx.fillStyle = ['#a8622d', '#c07a35', '#8a4a1e', '#c07a35', '#a8622d'][i + 2];
        ctx.save();
        ctx.rotate(i * 0.32);
        ellipse(ctx, -26, -16, 7, 22);
        ctx.restore();
      }
      ctx.restore();
      // Body.
      ctx.fillStyle = '#8a5a2e';
      ellipse(ctx, 0, -26, 24, 27);
      ctx.fillStyle = '#a06a35';
      ellipse(ctx, 2, -22, 17, 19);
      // Wing.
      ctx.fillStyle = '#6b4423';
      ctx.save();
      ctx.rotate(p.grounded ? Math.sin(p.runPhase) * 0.35 : -0.9);
      ellipse(ctx, -4, -24, 13, 8);
      ctx.restore();
      // Head, beak, wattle, eye.
      ctx.fillStyle = '#a06a35';
      ellipse(ctx, 18, -48, 11, 12);
      ctx.fillStyle = '#e07820';
      ctx.beginPath();
      ctx.moveTo(27, -50);
      ctx.lineTo(40, -46);
      ctx.lineTo(27, -42);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d43d2a';
      ellipse(ctx, 25, -38, 3.5, 6);
      ctx.fillStyle = '#1a1a1a';
      ellipse(ctx, 21, -51, 2.6, 2.6);
      ctx.fillStyle = '#fff';
      ellipse(ctx, 22, -52, 1, 1);
      // Legs: two little running legs.
      const legSwing = p.grounded ? Math.sin(p.runPhase) * 8 : 4;
      ctx.strokeStyle = '#e07820';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-6, -4);
      ctx.lineTo(-6 + legSwing, 0);
      ctx.moveTo(8, -4);
      ctx.lineTo(8 - legSwing, 0);
      ctx.stroke();
    }
    if (shielded) {
      ctx.strokeStyle = 'rgba(255,217,77,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -26, 40, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawFarmer(ctx, world) {
    // The farmer runs behind the turkey; his gap shrinks after each hit.
    const gap = world.farmerGap;
    const x = world.player.x - gap - 46;
    if (x < -90) return;
    const runPhase = world.time * 11;
    const bob = Math.abs(Math.sin(runPhase)) * 4;
    ctx.save();
    ctx.translate(x, GROUND_Y - bob);
    // Legs.
    ctx.strokeStyle = '#3a3a4a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(-10 + Math.sin(runPhase) * 10, 0);
    ctx.moveTo(0, -34);
    ctx.lineTo(10 - Math.sin(runPhase) * 10, 0);
    ctx.stroke();
    // Overalls and shirt.
    ctx.fillStyle = '#4a6a9a';
    ctx.fillRect(-14, -64, 28, 32);
    ctx.fillStyle = '#c94f38';
    ctx.fillRect(-16, -92, 32, 30);
    // Arms pumping, one hand gripping the carving knife.
    ctx.strokeStyle = '#c94f38';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-12, -86);
    ctx.lineTo(-26, -66 + Math.sin(runPhase) * 6);
    ctx.moveTo(12, -86);
    ctx.lineTo(26, -68 - Math.sin(runPhase) * 6);
    ctx.stroke();
    ctx.fillStyle = '#d8dce2';
    ctx.save();
    ctx.translate(30, -62 - Math.sin(runPhase) * 6);
    ctx.rotate(0.7);
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(5, 4);
    ctx.lineTo(0, 14);
    ctx.lineTo(-5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Head with straw hat.
    ctx.fillStyle = '#e8b98a';
    ellipse(ctx, 0, -100, 11, 12);
    ctx.fillStyle = '#d9a441';
    ellipse(ctx, 0, -110, 20, 5);
    ctx.fillRect(-9, -122, 18, 12);
    ctx.fillStyle = '#1a1a1a';
    ellipse(ctx, 4, -102, 2, 2);
    // Moustache.
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(-4, -94, 12, 3);
    ctx.restore();
  }

  drawParticles(ctx, world) {
    for (const pt of world.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
  }

  drawTitleBackdrop(ctx, world) {
    // A little life behind the title: the turkey idles on the grass.
    const p = world.player;
    p.runPhase += 0.02;
  }

  drawHud(ctx, world, ui) {
    // Top bar: score, distance, stage, hearts, feathers.
    ctx.fillStyle = 'rgba(43,29,18,0.72)';
    roundRect(ctx, 12, 10, VIEW.width - 24, 52, 12);
    ctx.fill();
    text(ctx, `SCORE ${world.score}`, 30, 36, FONT(22), '#ffd94d', 'left');
    text(ctx, `${Math.floor(world.distance)} m / ${RUN.escapeDistance} m`, VIEW.width / 2, 30, FONT(22), '#fff');
    text(ctx, world.stage.name.toUpperCase(), VIEW.width / 2, 50, FONT(13), '#ffcf8a');
    // Hearts.
    for (let i = 0; i < RUN.lives; i += 1) {
      const hx = VIEW.width - 40 - i * 34;
      ctx.fillStyle = i < world.lives ? '#e8452c' : 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.moveTo(hx, 44);
      ctx.bezierCurveTo(hx - 12, 30, hx - 22, 40, hx, 54);
      ctx.bezierCurveTo(hx + 22, 40, hx + 12, 30, hx, 44);
      ctx.fill();
    }
    text(ctx, `🌽 ${world.cornEaten}   🪶 ${world.feathers}`, VIEW.width - 150, 22, FONT(15), '#fff', 'left');
    if (world.time < world.shieldUntil) {
      text(ctx, 'GOLDEN FEATHER SHIELD!', VIEW.width / 2, 84, FONT(16), '#ffd94d', 'center', '#6b4423');
    }
    if (world.farmerGap < 60) {
      text(ctx, "⚠ HE'S RIGHT BEHIND YOU! ⚠", VIEW.width / 2, 84, FONT(18), '#ff5a3c', 'center', '#fff');
    }
    // Progress bar to freedom.
    const barW = 320;
    const barX = (VIEW.width - barW) / 2;
    const barY = VIEW.height - 24;
    ctx.fillStyle = 'rgba(43,29,18,0.6)';
    roundRect(ctx, barX - 6, barY - 4, barW + 12, 14, 7);
    ctx.fill();
    ctx.fillStyle = '#ffd94d';
    roundRect(ctx, barX, barY - 1, barW * Math.min(1, world.distance / RUN.escapeDistance), 8, 4);
    ctx.fill();
    text(ctx, '🦃', barX - 22, barY + 2, FONT(16), '#fff');
    text(ctx, '🌲 FREEDOM', barX + barW + 34, barY + 2, FONT(12), '#fff', 'left');
    if (ui.best > 0) text(ctx, `BEST ${ui.best}`, 30, 84, FONT(14), 'rgba(255,255,255,0.85)', 'left');
    if (ui.muted) text(ctx, '🔇 MUTED (M)', VIEW.width - 30, 84, FONT(13), '#fff', 'right');
  }

  drawTitle(ctx, ui) {
    ctx.fillStyle = 'rgba(43,29,18,0.45)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    text(ctx, '🦃', VIEW.width / 2, 96, FONT(64), '#fff');
    text(ctx, 'TURKEY RUN', VIEW.width / 2, 158, FONT(64), '#ffd94d', 'center', '#6b4423');
    text(ctx, 'The Great Thanksgiving Escape', VIEW.width / 2, 200, FONT(24), '#fff', 'center', '#6b4423');
    text(ctx, 'Thanksgiving morning. The farmer has the carving knife.', VIEW.width / 2, 240, FONT(17), '#ffe9c4');
    text(ctx, 'Run 1500 m from the farmyard to the woods — and do not become dinner.', VIEW.width / 2, 264, FONT(17), '#ffe9c4');
    text(ctx, 'SPACE / CLICK / TAP — jump (twice to flap)      ↓ — slide under the line', VIEW.width / 2, 312, FONT(16), '#fff');
    text(ctx, '🌽 corn +25    🪶 golden feather = shield    ❤ 3 lives — a stumble lets him catch up', VIEW.width / 2, 338, FONT(15), '#ffe9c4');
    if (ui.best > 0) text(ctx, `Best escape so far: ${ui.best} points`, VIEW.width / 2, 372, FONT(16), '#ffd94d');
    text(ctx, '▶  CLICK OR PRESS ENTER TO RUN  ◀', VIEW.width / 2, 420, FONT(20), '#fff', 'center', '#6b4423');
    text(ctx, 'P pause · M mute · R restart', VIEW.width / 2, 452, FONT(13), 'rgba(255,255,255,0.8)');
  }

  drawCaught(ctx, world, ui) {
    ctx.fillStyle = 'rgba(60,10,5,0.62)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    text(ctx, '🔪', VIEW.width / 2, 96, FONT(56), '#fff');
    text(ctx, 'CAUGHT!', VIEW.width / 2, 156, FONT(58), '#ff6a4a', 'center', '#3a0d05');
    text(ctx, 'The farmer got you… this time.', VIEW.width / 2, 200, FONT(20), '#fff');
    text(ctx, `You ran ${Math.floor(world.distance)} m and scored ${world.score} points.`, VIEW.width / 2, 244, FONT(18), '#ffe9c4');
    text(ctx, `Corn eaten: ${world.cornEaten} · Feathers: ${world.feathers}`, VIEW.width / 2, 272, FONT(16), '#ffe9c4');
    if (ui.best > 0) text(ctx, `Best score: ${ui.best}`, VIEW.width / 2, 300, FONT(16), '#ffd94d');
    text(ctx, '▶  PRESS ENTER OR CLICK TO RUN AGAIN  ◀', VIEW.width / 2, 360, FONT(19), '#fff', 'center', '#3a0d05');
  }

  drawEscaped(ctx, world, ui) {
    ctx.fillStyle = 'rgba(20,50,25,0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    text(ctx, '🌲🦃🌲', VIEW.width / 2, 96, FONT(48), '#fff');
    text(ctx, 'ESCAPED!', VIEW.width / 2, 156, FONT(58), '#7be07b', 'center', '#12351a');
    text(ctx, 'You made it to the woods. Thanksgiving is cancelled — for you.', VIEW.width / 2, 200, FONT(20), '#fff');
    text(ctx, `1500 m in one glorious run · ${world.score} points`, VIEW.width / 2, 244, FONT(18), '#ffe9c4');
    text(ctx, `Corn eaten: ${world.cornEaten} · Feathers: ${world.feathers} · Stumbles: ${world.hits}`, VIEW.width / 2, 272, FONT(16), '#ffe9c4');
    if (ui.best > 0) text(ctx, `Best score: ${ui.best}`, VIEW.width / 2, 300, FONT(16), '#ffd94d');
    text(ctx, '▶  PRESS ENTER OR CLICK TO RUN AGAIN  ◀', VIEW.width / 2, 360, FONT(19), '#fff', 'center', '#12351a');
  }
}
