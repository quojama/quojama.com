/*
 * 背景のジャングル。森の小道を歩いていく景色を、文字だけで画面いっぱいに描く。
 * 地形は列ごとに手前から奥へ高さを調べ、見えたぶんだけ下から塗る（ボクセルスペース方式）。
 * 木はカメラのまわりのマス目ごとに乱数で生やすので、どこまで進んでも尽きない。
 * カーソル（スマホは指）で見回せて、カーソルのまわりの文字がざわつく。
 * 色は style.css の :root の変数から読む。
 */
(() => {
    const canvas = document.getElementById("jungle");
    if (!canvas || !canvas.getContext) return;
    const g = canvas.getContext("2d");
    const css = getComputedStyle(document.documentElement);
    function tok(n) { return css.getPropertyValue("--" + n).trim(); }
    const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 色の種類（cls）: 1 地面 / 3 草木 / 4 アクセント / 5 幹・土 / 6 遠くの霞（2 は使わない）
    const COLORS = [null, tok("bg-plant"), null, tok("bg-plant"), tok("accent"), tok("bg-trunk"), tok("bg-haze")];
    const BG = tok("bg");

    // ===== カーソル（NDC: -1〜1。指でも同じ） =====
    const P = { x: 0, y: 0, sx: 0, sy: 0, amt: 0, on: false };
    function setP(cx, cy) { P.x = cx / innerWidth * 2 - 1; P.y = -(cy / innerHeight * 2 - 1); P.on = true; }
    addEventListener("pointermove", (e) => setP(e.clientX, e.clientY), { passive: true });
    addEventListener("pointerdown", (e) => setP(e.clientX, e.clientY), { passive: true });
    addEventListener("touchstart", (e) => setP(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    addEventListener("touchmove", (e) => setP(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    addEventListener("touchend", () => { P.on = false; });
    document.documentElement.addEventListener("mouseleave", () => { P.on = false; });
    addEventListener("blur", () => { P.on = false; });

    function smoothstep(a, b, x) { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); }
    function hash(i, j, k) { const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); }

    // ===== 文字のマス目 =====
    const S = {};
    function resize() {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        S.W = innerWidth; S.H = innerHeight;
        canvas.width = S.W * dpr; canvas.height = S.H * dpr;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const fs = Math.max(10, Math.min(16, S.W / 100));
        g.font = `${fs}px "M PLUS 1 Code", monospace`;
        g.textBaseline = "top";
        S.cw = g.measureText("0").width;
        S.chh = fs * 1.2;
        S.cols = Math.ceil(S.W / S.cw);
        S.rows = Math.ceil(S.H / S.chh);
        const n = S.cols * S.rows;
        S.ch = new Uint16Array(n); S.cls = new Uint8Array(n); S.depth = new Float32Array(n);
        S.ybuf = new Int16Array(S.cols);
        S.line = new Uint16Array(S.cols);
    }

    // 手前の物ほど depth が小さいので、描く順番に関係なく前後が決まる
    function put(c, r, code, cl, z) {
        c |= 0; r |= 0;
        if (c < 0 || r < 0 || c >= S.cols || r >= S.rows) return;
        const i = c + r * S.cols;
        if (z >= S.depth[i]) return;
        S.ch[i] = code; S.cls[i] = cl; S.depth[i] = z;
    }

    // ===== 地形（森の小道と、奥の丘） =====
    const GROUND = "   ..,,\"\"'";
    const LEAF = " .:;+*&%@#";
    // 同じ明るさの丘が横縞にならないよう、4×4 のディザで字を散らす
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((b) => b / 16 - 0.5);
    function path(y) { return 6 * Math.sin(y * 0.02) + 3 * Math.sin(y * 0.05); }
    function height(x, y) {
        const d = Math.abs(x - path(y));
        return smoothstep(30, 70, d) * (7 + 4 * Math.sin(y * 0.05 + x * 0.03));
    }
    // 地面の見た目。ramp があればその明るさ v から字を選ぶ。grain はざらっとした乱数で散らす
    const L = { code: 32, cls: 0, ramp: null, v: 0, grain: false };
    function look(x, y, h, z) {
        const fog = Math.max(0, 1 - z / 120);
        L.grain = false;
        if (h > 1.5) {   // 奥の丘は森
            L.ramp = LEAF; L.v = (0.45 + 0.25 * Math.sin(x * 0.7) * Math.sin(y * 0.6)) * (0.2 + 0.8 * fog);
            L.cls = fog < 0.35 ? 6 : 3;
            return;
        }
        if (Math.abs(x - path(y)) < 2.5) { L.ramp = null; L.code = hash(x | 0, y | 0, 1) > 0.5 ? 46 : 44; L.cls = 5; return; }
        L.ramp = GROUND; L.grain = true; L.v = 0.1 + 0.45 * fog; L.cls = fog < 0.3 ? 6 : 1;
    }

    // ===== 木と草むら =====
    // 葉の固まり（でこぼこの楕円）。中は濃い字、縁は軽い字、下側は影の字
    const LEAVES = { inner: "%&@#&%", edge: ",;'", dark: "*+:" };
    const BUSH = { inner: "wWvYw", edge: "\"'", dark: "vw" };
    function blob(cx, cy, ax, ay, seed, z, set) {
        if (ax < 0.6) ax = 0.6;
        if (ay < 0.6) ay = 0.6;
        const c0 = Math.max(0, Math.floor(cx - ax * 1.3)), c1 = Math.min(S.cols - 1, Math.ceil(cx + ax * 1.3));
        const r0 = Math.max(0, Math.floor(cy - ay * 1.3)), r1 = Math.min(S.rows - 1, Math.ceil(cy + ay * 1.3));
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
            const u = (c + 0.5 - cx) / ax, v = (r + 0.5 - cy) / ay;
            const a = Math.atan2(v, u);
            const edge = 1 + 0.18 * Math.sin(a * 6 + seed) + 0.08 * Math.sin(a * 13 + seed * 2);
            const rr = Math.sqrt(u * u + v * v) / edge;
            if (rr > 1) continue;
            const s = rr > 0.82 ? set.edge : v > 0.45 ? set.dark : set.inner;
            put(c, r, s.charCodeAt((hash(c, r, seed) * s.length) | 0), 3, z);
        }
    }

    function trunk(V, len, width, bend) {
        const n = Math.max(2, Math.ceil(len * V.sy));
        const w = Math.max(1, Math.round(width * V.sx));
        const top = { c: V.bc, r: V.br };
        for (let k = 0; k <= n; k++) {
            const s = k / n;
            const c = V.bc + bend * s * s * len * V.sx * 0.35 - (w - 1) / 2;
            const r = V.br - s * len * V.sy;
            const code = Math.abs(bend) > 0.35 && s > 0.4 ? (bend > 0 ? 47 : 92) : 124;
            for (let x = 0; x < w; x++) put(c + x, r, w > 2 && x > 0 && x < w - 1 ? 58 : code, 5, V.zc);
            top.c = c + (w - 1) / 2; top.r = r;
        }
        return top;
    }

    const SPRITES = {
        // ヤシ: 曲がった幹と、先が垂れる葉
        palm(p, V) {
            const sway = Math.sin(V.t * 0.9 + p.ph) * 0.25;
            const top = trunk(V, p.trunk, 0.35, p.bend + sway);
            for (let k = 0; k < 7; k++) {
                const a = k / 7 * 6.2832 + p.ph + sway * 0.5;
                const ca = Math.cos(a), sa = Math.sin(a);
                const lc = ca * V.rx + sa * V.ry, fc = ca * V.fx + sa * V.fy;
                const steps = Math.ceil(p.frond * Math.max(V.sx, V.sy) * 1.5) + 2;
                let pc = top.c, pr = top.r;
                for (let j = 1; j <= steps; j++) {
                    const s = j / steps, ln = p.frond * s;
                    const c2 = top.c + lc * ln * V.sx;
                    const r2 = top.r - fc * ln * V.sy * 0.35 + (s * s * 0.75 - s * 0.3) * p.frond * V.sy;
                    const vx = (c2 - pc) * S.cw, vy = (r2 - pr) * S.chh;
                    const code = Math.abs(vx) > 2 * Math.abs(vy) ? 45 : Math.abs(vy) > 2 * Math.abs(vx) ? 58 : ((vx > 0) === (vy < 0) ? 47 : 92);
                    put(c2, r2, code, 3, V.zc - 0.01);
                    pc = c2; pr = r2;
                }
            }
        },
        // 丸い木: 短い幹にこんもりした葉
        round(p, V) {
            const top = trunk(V, p.trunk, 0.5, 0);
            blob(top.c, top.r - p.r * 0.55 * V.sy, p.r * V.sx, p.r * 0.75 * V.sy, p.seed, V.zc - 0.02, LEAVES);
        },
        // 背の高い木: 細長い幹に平たい葉、そこからつるが垂れる
        tall(p, V) {
            const top = trunk(V, p.trunk, 0.6, 0);
            const ax = p.r * V.sx, ay = p.r * 0.32 * V.sy;
            blob(top.c, top.r - ay * 0.5, ax, ay, p.seed, V.zc - 0.02, LEAVES);
            for (let k = 0; k < 4; k++) {
                const c = top.c + (hash(k, p.seed, 9) - 0.5) * ax * 1.4;
                const len = (0.25 + hash(k, p.seed, 8) * 0.4) * p.trunk * V.sy;
                for (let r = 0; r < len; r++) {
                    const w = Math.sin(r * 0.5 + V.t + k) * Math.min(1.5, r * 0.08);
                    put(c + w, top.r + ay * 0.4 + r, Math.cos(r * 0.5 + V.t + k) > 0 ? 40 : 41, 3, V.zc - 0.03);
                }
            }
        },
        // 草むら
        bush(p, V) {
            blob(V.bc, V.br - p.r * 0.45 * V.sy, p.r * V.sx, p.r * 0.6 * V.sy, p.seed, V.zc, BUSH);
        },
        // 黄色い花の咲いた草むら
        flower(p, V) {
            SPRITES.bush(p, V);
            for (let k = 0; k < 3; k++) {
                put(V.bc + (hash(k, p.seed, 3) - 0.5) * p.r * V.sx * 1.4, V.br - (0.5 + hash(k, p.seed, 4) * 0.6) * p.r * V.sy, 42, 4, V.zc - 0.05);
            }
        }
    };

    // カメラのまわりのマス目ごとに、乱数で木を生やす（小道の上には生やさない）
    const CELL = 4, trees = [];
    function plant(cx, cy, fx, fy) {
        trees.length = 0;
        const ci = Math.floor(cx / CELL), cj = Math.floor(cy / CELL), R = 18;
        for (let i = ci - R; i <= ci + R; i++) for (let j = cj - R; j <= cj + R; j++) {
            const x = (i + hash(i, j, 1)) * CELL, y = (j + hash(i, j, 2)) * CELL;
            const zc = (x - cx) * fx + (y - cy) * fy;
            if (zc < 1.5 || zc > 80) continue;
            const d = Math.abs(x - path(y));
            if (d < 3 || hash(i, j, 3) > 0.8) continue;
            const k = hash(i, j, 4), sz = 0.8 + hash(i, j, 5) * 0.5;
            const type = d < 12
                ? (k < 0.3 ? "palm" : k < 0.55 ? "bush" : k < 0.7 ? "flower" : "tall")
                : (k < 0.4 ? "round" : k < 0.7 ? "tall" : k < 0.85 ? "palm" : "bush");
            trees.push({
                type: type, x: x, y: y, h: height(x, y),
                trunk: (type === "tall" ? 11 : type === "palm" ? 6.5 : 3) * sz,
                r: (type === "tall" ? 5 : type === "round" ? 3.2 : 1.6) * sz,
                frond: 3.8 * sz, bend: (k - 0.5) * 1.4, ph: k * 20, seed: hash(i, j, 6) * 50
            });
        }
        return trees;
    }

    // 黄色い鳥
    const BIRDS = [];
    for (let b = 0; b < 5; b++) BIRDS.push({ az: -1.6 + b * 0.5, sp: 0.03 + (b % 3) * 0.02, e: 0.1 + (b % 4) * 0.035, ph: b * 2.2 });

    // 画面のいちばん手前: 頭上の葉の帯と、そこから垂れ下がるつる
    function vines(t) {
        const cols = S.cols, rows = S.rows;
        for (let c = 0; c < cols; c++) {
            const band = 1.6 + 1.3 * Math.sin(c * 0.21 + 1.3) + 0.9 * Math.sin(c * 0.53) + 0.5 * Math.sin(c * 1.7);
            for (let r = 0; r < band; r++) put(c, r, LEAVES.inner.charCodeAt((hash(c, r, 5) * 6) | 0), 3, 0.4);
        }
        const nv = Math.max(4, (cols / 14) | 0);
        for (let v = 0; v < nv; v++) {
            const x0 = (v + 0.5 + 0.35 * Math.sin(v * 7.1)) / nv * cols - P.sx * 5;
            const len = (0.12 + 0.4 * hash(v, 1, 1)) * rows, ph = v * 1.9;
            for (let r = 1; r < len; r++) {
                const a = r * 0.25 + t * 0.8 + ph;
                const c = x0 + Math.sin(a) * 1.3 * r / len;
                put(c, r, Math.cos(a) > 0 ? 40 : 41, 3, 0.5);
                if ((r + v) % 4 === 0) put(c + (r % 8 < 4 ? 1 : -1), r, 38, 3, 0.5);
            }
            put(x0 + Math.sin(len * 0.25 + t * 0.8 + ph) * 1.3, len, 37, 3, 0.5);
        }
    }

    // ===== 1コマ描く =====
    function draw(t) {
        const cols = S.cols, rows = S.rows, ch = S.ch, cls = S.cls, depth = S.depth, ybuf = S.ybuf;
        const cw = S.cw, chh = S.chh;
        ch.fill(32); cls.fill(0); depth.fill(1e9); ybuf.fill(rows);

        // カメラ: 小道に沿って歩く。カーソルで首を振る
        const cy = -t * 2.2, cx = path(cy), camH = 3;
        const yaw = Math.atan2(-2, path(cy - 2) - cx) - P.sx * 0.6;
        const fx = Math.cos(yaw), fy = Math.sin(yaw), rx = fy, ry = -fx;
        const K = rows * 0.95, Kx = K * chh / cw;
        const hor = rows * 0.55 + P.sy * rows * 0.12;

        // 地形
        let z = 1, dz = 0.25;
        while (z < 170) {
            let any = false;
            for (let c = 0; c < cols; c++) {
                const yb = ybuf[c];
                if (yb <= 0) continue;
                any = true;
                const lat = (c + 0.5 - cols / 2) / Kx * z;
                const x = cx + fx * z + rx * lat, y = cy + fy * z + ry * lat;
                const h = height(x, y);
                let top = (hor + (camH - h) / z * K) | 0;
                if (top >= yb) continue;
                if (top < 0) top = 0;
                look(x, y, h, z);
                for (let r = top; r < yb; r++) {
                    const i = c + r * cols;
                    if (L.ramp) {
                        const q = Math.round(L.v * 9 + (L.grain ? hash(c, r, 7) - 0.5 : BAYER[(r & 3) * 4 + (c & 3)]) * 1.6);
                        ch[i] = L.ramp.charCodeAt(q < 0 ? 0 : q > 9 ? 9 : q);
                    } else ch[i] = L.code;
                    cls[i] = L.cls; depth[i] = z;
                }
                ybuf[c] = top;
            }
            if (!any) break;
            z += dz;
            dz *= 1.025;
        }

        // 空: 雲と、地平線のもや。列ごとの方角と行ごとの高さから決める
        for (let r = 0; r < rows && r < hor; r++) {
            const e = (hor - r) / K;
            for (let c = 0; c < cols; c++) {
                const i = c + r * cols;
                if (depth[i] < 1e9) continue;
                const az = yaw - Math.atan((c + 0.5 - cols / 2) / Kx);
                const f = Math.sin(az * 5 + t * 0.03) * Math.sin(e * 16 + az * 3) + 0.6 * Math.sin(az * 13 - e * 9 + t * 0.05);
                if (f > 1) { ch[i] = f > 1.35 ? 45 : 46; cls[i] = 6; }
                else if (e < 0.05 && Math.sin(az * 40 + e * 90 + t * 0.2) > 0.4) { ch[i] = 46; cls[i] = 6; }
            }
        }
        BIRDS.forEach((b) => {
            let rel = yaw - (b.az + t * b.sp);
            rel = Math.atan2(Math.sin(rel), Math.cos(rel));
            if (Math.abs(rel) > 1.2) return;
            put(cols / 2 + Math.tan(rel) * Kx, hor - (b.e + 0.015 * Math.sin(t * 0.7 + b.ph)) * K, ((t * 3 + b.ph) | 0) % 2 ? 118 : 45, 4, 5e8);
        });

        // 木
        const list = plant(cx, cy, fx, fy), halfTan = cols / 2 / Kx;
        for (let si = 0; si < list.length; si++) {
            const p = list[si];
            const dx = p.x - cx, dy = p.y - cy;
            const zc = dx * fx + dy * fy;
            const lt = dx * rx + dy * ry;
            if (Math.abs(lt) > zc * halfTan + 12) continue;
            SPRITES[p.type](p, {
                bc: cols / 2 + lt / zc * Kx, br: hor + (camH - p.h) / zc * K,
                sx: Kx / zc, sy: K / zc, zc: zc, t: t, fx: fx, fy: fy, rx: rx, ry: ry
            });
        }
        vines(t);

        // カーソルのまわりの文字がざわつく
        if (P.amt > 0.01) {
            const NOISE = ".,:;-=+*~";
            const pc = (P.x + 1) / 2 * cols, pr = (1 - P.y) / 2 * rows, rad = 9;
            const r0 = Math.max(0, (pr - rad * cw / chh) | 0), r1 = Math.min(rows - 1, (pr + rad * cw / chh) | 0);
            const c0 = Math.max(0, (pc - rad) | 0), c1 = Math.min(cols - 1, (pc + rad) | 0);
            for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
                const d = Math.hypot(c - pc, (r - pr) * chh / cw) / rad;
                if (d >= 1) continue;
                const f = P.amt * (1 - d), i = c + r * cols;
                if (ch[i] !== 32 && Math.random() < f * 0.7) ch[i] = NOISE.charCodeAt((Math.random() * NOISE.length) | 0);
                else if (ch[i] === 32 && Math.random() < f * 0.05) { ch[i] = 46; cls[i] = 6; }
            }
        }

        // 色ごとに1行ずつ文字列にして描く
        g.fillStyle = BG;
        g.fillRect(0, 0, S.W, S.H);
        const line = S.line;
        for (let r = 0; r < rows; r++) {
            const base = r * cols;
            for (let k = 1; k < COLORS.length; k++) {
                if (!COLORS[k]) continue;
                let has = false;
                for (let c = 0; c < cols; c++) {
                    if (cls[base + c] === k) { line[c] = ch[base + c]; has = true; }
                    else line[c] = 32;
                }
                if (!has) continue;
                g.fillStyle = COLORS[k];
                g.fillText(String.fromCharCode.apply(null, line), 0, r * chh);
            }
        }
    }

    // ===== ループ =====
    // 動きを減らす設定のときは、止まった1コマだけ描く。タブが裏にあるときは止める。
    // 負荷を半分にするため 1秒に30コマだけ描く（進み方は経過時間で決まるので、歩く速さは変わらない）
    const FPS = 30;
    let t = 6, last = 0;
    function step(dt) {
        const k = dt * 60;
        P.amt += ((P.on ? 1 : 0) - P.amt) * Math.min(1, 0.08 * k);
        P.sx += ((P.on ? P.x : 0) - P.sx) * Math.min(1, 0.04 * k);
        P.sy += ((P.on ? P.y : 0) - P.sy) * Math.min(1, 0.04 * k);
        draw(t);
    }
    function frame(now) {
        requestAnimationFrame(frame);
        // 前のコマからまだ 1/30 秒たっていなければ描かない（画面の更新の揺れぶん少し早めに許す）
        if (last && now - last < 1000 / FPS - 4) return;
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
        last = now;
        if (document.hidden) return;
        t += dt;
        step(dt);
    }

    // 字の幅を測るので、フォントが読み込まれてから始める
    const fontReady = document.fonts
        ? Promise.race([document.fonts.load('16px "M PLUS 1 Code"', ".:;+*&%@#"), new Promise((resolve) => setTimeout(resolve, 3000))])
        : Promise.resolve();
    fontReady.catch(() => {}).then(() => {
        resize();
        addEventListener("resize", () => { resize(); if (REDUCE) step(0); });
        if (REDUCE) step(0);
        else requestAnimationFrame(frame);
    });
})();
