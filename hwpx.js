// 선택한 문항을 평가원 수학 문제지 양식(A4, 2단)의 한글 파일(.hwpx)로 만든다.
(function () {
  const T = window.HWPX_TPL;

  // ---------- ZIP (무압축 저장) ----------
  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(u8) {
    let c = 0xffffffff;
    for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function zipStore(files) {
    const enc = new TextEncoder();
    const parts = [], central = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name);
      const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      const crc = crc32(data), size = data.length;
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, 0, true); lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, size, true); lh.setUint32(22, size, true);
      lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
      ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, size, true); ch.setUint32(24, size, true);
      ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + size;
    }
    const cdSize = central.reduce((a, b) => a + b.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/hwp+zip' });
  }

  // ---------- 이미지 ----------
  function loadImg(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }
  // 원래 문항 번호를 지우고 새 번호를 쓴다
  async function renumbered(src, box, label, italic) {
    const img = await loadImg(src);
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0);
    if (box && label != null) {
      const [x, y, w, h] = box;
      g.fillStyle = '#fff'; g.fillRect(x, y, w, h);
      g.fillStyle = '#000'; g.textBaseline = 'alphabetic';
      const fs = Math.round(h * 0.82);
      g.font = `${italic ? 'italic ' : ''}bold ${fs}px "Times New Roman", "Batang", serif`;
      const tw = g.measureText(label).width;
      const room = w + 6;
      g.save();
      g.translate(x + 2, y + h - h * 0.2);
      if (tw > room) g.scale(room / tw, 1);
      g.fillText(label, 0, 0);
      g.restore();
    }
    return c;
  }
  // 문항 번호를 지우고 문서에서 ptSize 포인트가 되도록 다시 쓴다.
  // 번호가 원래보다 커서 본문과 겹치면 그림 왼쪽에 자리를 더 내어 본문을 오른쪽으로 민다.
  // 반환: {c: 캔버스, W, H: 문서에서의 크기(HWPUNIT)}
  async function numberedProblem(src, box, label, ptSize, maxH) {
    const img = await loadImg(src);
    const w0 = img.naturalWidth, h0 = img.naturalHeight;
    const [x, y, w, h] = box;
    const base = y + h * 0.8;                       // 원래 번호의 글자 기준선
    // 번호 오른쪽에서 처음 잉크가 나오는 곳 (본문 시작)
    const pc = document.createElement('canvas'); pc.width = w0; pc.height = h;
    const pg = pc.getContext('2d');
    pg.fillStyle = '#fff'; pg.fillRect(0, 0, w0, h); pg.drawImage(img, 0, -y);
    const d = pg.getImageData(0, 0, w0, h).data;
    let next = w0;
    scan: for (let xx = x + w; xx < w0; xx++) for (let yy = 0; yy < h; yy++) if (d[(yy * w0 + xx) * 4] < 128) { next = xx; break scan; }
    const font = fs => `italic bold ${fs}px "Times New Roman", "Batang", serif`;
    const size = (wpx, hpx) => { let W = COLW, H = Math.round(hpx * COLW / wpx); if (H > maxH) { W = Math.round(W * maxH / H); H = maxH; } return { W, H }; };
    let extra = 0, top = 0, fs = 0;
    for (let i = 0; i < 4; i++) {                  // 크기와 여백이 서로 영향을 주므로 몇 번 맞춘다
      const { W } = size(w0 + extra, h0 + top);
      fs = ptSize * 100 * (w0 + extra) / W;
      pg.font = font(fs);
      const m = pg.measureText(label);
      extra = Math.max(0, Math.ceil(m.width + fs * 0.3 - (next - x)));
      top = Math.max(0, Math.ceil(m.actualBoundingBoxAscent - base + 4));
    }
    const c = document.createElement('canvas');
    c.width = w0 + extra; c.height = h0 + top;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, extra, top);
    g.fillRect(x + extra, y + top, w, h);
    g.fillStyle = '#000'; g.textBaseline = 'alphabetic'; g.font = font(fs);
    g.fillText(label, x, base + top);
    return { c, ...size(c.width, c.height) };
  }
  // 세로로 너무 긴 이미지는 빈 줄에서 자른다
  function split(c, maxH) {
    if (c.height <= maxH) return [c];
    const g = c.getContext('2d');
    const out = [];
    let top = 0;
    while (c.height - top > maxH) {
      let cut = top + maxH;
      const data = g.getImageData(0, top + Math.floor(maxH * 0.6), c.width, Math.ceil(maxH * 0.4)).data;
      const rows = Math.ceil(maxH * 0.4);
      for (let r = rows - 1; r >= 0; r--) {
        let blank = true;
        for (let x = 0; x < c.width; x += 2) {
          if (data[(r * c.width + x) * 4] < 200) { blank = false; break; }
        }
        if (blank) { cut = top + Math.floor(maxH * 0.6) + r; break; }
      }
      out.push(sub(c, top, cut));
      top = cut;
    }
    out.push(sub(c, top, c.height));
    return out;
  }
  function sub(c, y0, y1) {
    const s = document.createElement('canvas');
    s.width = c.width; s.height = y1 - y0;
    s.getContext('2d').drawImage(c, 0, y0, c.width, y1 - y0, 0, 0, c.width, y1 - y0);
    return s;
  }
  function dataUrlBytes(src) {
    const bin = atob(src.slice(src.indexOf(',') + 1));
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }
  function png(c) {
    return new Promise(res => c.toBlob(b => b.arrayBuffer().then(a => res(new Uint8Array(a))), 'image/png'));
  }

  // ---------- 레이아웃 상수 (HWPUNIT, 1mm ≈ 283.46) ----------
  const PAGE = { w: 59528, h: 84186, ml: 4252, mr: 4252, mt: 2268, mb: 2834, hd: 4252, ft: 1417 };
  const BODYW = PAGE.w - PAGE.ml - PAGE.mr;
  const GAP = 2268;
  const COLW = Math.floor((PAGE.w - PAGE.ml - PAGE.mr - GAP) / 2);
  const COLH = 70500;          // 한 단에 들어가는 높이(여유 포함)
  const TITLEH = 9600;         // 첫 쪽 제목 영역
  const BODYTOP = PAGE.mt + PAGE.hd, BODYBOT = PAGE.h - PAGE.mb - PAGE.ft;
  const MIDX = PAGE.ml + COLW + Math.round(GAP / 2);   // 단 구분선 위치
  const NUMPT = 15;            // 문항 번호 크기(pt)
  const LABELH = 2600;         // '5지선다형'/'단답형' 표시
  const LINE = 1600;           // 빈 줄 하나의 높이 (10pt, 줄간격 160%)

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  let uid = 1000000;
  const rid = () => String(++uid + Math.floor(Math.random() * 1000) * 1000000);

  function header() {
    let h = T.header;
    const maxId = tag => Math.max(...[...h.matchAll(new RegExp(`<hh:${tag} id="(\\d+)"`, 'g'))].map(m => +m[1]));
    const bump = (list, k) => { h = h.replace(new RegExp(`<hh:${list} itemCnt="(\\d+)">`), (m, n) => `<hh:${list} itemCnt="${+n + k}">`); };
    const border = (id, sides, w) => `<hh:borderFill id="${id}" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0"><hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/>${['left', 'right', 'top', 'bottom'].map(k => `<hh:${k}Border type="${sides.includes(k) ? 'SOLID' : 'NONE'}" width="${sides.includes(k) ? w : '0.1 mm'}" color="#000000"/>`).join('')}<hh:diagonal type="NONE" width="0.1 mm" color="#000000"/></hh:borderFill>`;
    const bfId = maxId('borderFill') + 1;
    // bfId: 아래 굵은 선(제목), +1: 아래 선(머리말), +2: 네모 상자, +3: 테두리 없음
    h = h.replace('</hh:borderFills>', border(bfId, ['bottom'], '0.7 mm') + border(bfId + 1, ['bottom'], '0.4 mm') + border(bfId + 2, ['left', 'right', 'top', 'bottom'], '0.12 mm') + border(bfId + 3, [], '') + '</hh:borderFills>');
    bump('borderFills', 4);

    const ppId = maxId('paraPr') + 1;
    const pp20 = h.match(/<hh:paraPr id="20"[\s\S]*?<\/hh:paraPr>/)[0];
    const pp0 = h.match(/<hh:paraPr id="0"[\s\S]*?<\/hh:paraPr>/)[0];
    const withBorder = (src, id, bf, below) => src.replace(/id="\d+"/, `id="${id}"`).replace(/borderFillIDRef="\d+"/, `borderFillIDRef="${bf}"`)
      .replace('offsetBottom="0"', `offsetBottom="${below}"`).replace(/<hc:next value="0"/g, `<hc:next value="${below * 3}"`);
    const pps = [
      withBorder(pp20, ppId, bfId, 300),                                   // 첫 쪽 제목 아래 굵은 선
      pp0.replace('id="0"', `id="${ppId + 1}"`).replace('horizontal="JUSTIFY"', 'horizontal="LEFT"'),
      withBorder(pp20, ppId + 2, bfId + 1, 120),                           // 머리말 아래 선
      pp0.replace('id="0"', `id="${ppId + 3}"`).replace('horizontal="JUSTIFY"', 'horizontal="RIGHT"'),
    ];
    h = h.replace('</hh:paraProperties>', pps.join('') + '</hh:paraProperties>'); bump('paraProperties', pps.length);

    const cpId = maxId('charPr') + 1;
    const cp9 = h.match(/<hh:charPr id="9"[\s\S]*?<\/hh:charPr>/)[0];
    const sized = (k, ht) => cp9.replace('id="9"', `id="${cpId + k}"`).replace('height="2100"', `height="${ht}"`);
    const cps = [sized(0, 3200), sized(1, 1300), sized(2, 2400), sized(3, 1400), sized(4, 1100), sized(5, 1000)];
    h = h.replace('</hh:charProperties>', cps.join('') + '</hh:charProperties>'); bump('charProperties', cps.length);
    return {
      xml: h,
      bf: { box: bfId + 2, none: bfId + 3 },
      pp: { title: ppId, left: ppId + 1, head: ppId + 2, right: ppId + 3, center: 20, body: 0 },
      cp: { title: cpId, sub: cpId + 1, page: cpId + 2, head: cpId + 3, label: cpId + 4, small: cpId + 5, h15: 12, body: 0, bold: 9 },
    };
  }

  function secPr() {
    const pbf = t => `<hp:pageBorderFill type="${t}" borderFillIDRef="1" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER"><hp:offset left="1417" right="1417" top="1417" bottom="1417"/></hp:pageBorderFill>`;
    return `<hp:secPr id="" textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" tabStopVal="4000" tabStopUnit="HWPUNIT" outlineShapeIDRef="1" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0"><hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/><hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/><hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/><hp:lineNumberShape restartType="0" countBy="0" distance="0" startNumber="0"/><hp:pagePr landscape="WIDELY" width="${PAGE.w}" height="${PAGE.h}" gutterType="LEFT_ONLY"><hp:margin header="${PAGE.hd}" footer="${PAGE.ft}" gutter="0" left="${PAGE.ml}" right="${PAGE.mr}" top="${PAGE.mt}" bottom="${PAGE.mb}"/></hp:pagePr><hp:footNotePr><hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/><hp:noteLine length="-1" type="SOLID" width="0.12 mm" color="#000000"/><hp:noteSpacing betweenNotes="283" belowLine="567" aboveLine="850"/><hp:numbering type="CONTINUOUS" newNum="1"/><hp:placement place="EACH_COLUMN" beneathText="0"/></hp:footNotePr><hp:endNotePr><hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/><hp:noteLine length="14692344" type="SOLID" width="0.12 mm" color="#000000"/><hp:noteSpacing betweenNotes="0" belowLine="567" aboveLine="850"/><hp:numbering type="CONTINUOUS" newNum="1"/><hp:placement place="END_OF_DOCUMENT" beneathText="0"/></hp:endNotePr>${pbf('BOTH')}${pbf('EVEN')}${pbf('ODD')}</hp:secPr>`;
  }
  const colPr = n => n === 1
    ? `<hp:ctrl><hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/></hp:ctrl>`
    : `<hp:ctrl><hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="2" sameSz="1" sameGap="${GAP}"/></hp:ctrl>`;   // 구분선은 bar()로 쪽 끝까지 그린다

  // 검은 막대(가로·세로 선). 글자 앞에 떠 있는 개체로, 기준은 종이(가로)와 rel(세로)
  function bar(w, h, x, y, rel = 'PAPER', outline = true) {
    const I = 'e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"';
    return `<hp:rect id="${rid()}" zOrder="5" numberingType="PICTURE" textWrap="IN_FRONT_OF_TEXT" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" href="" groupLevel="0" instid="${rid()}" ratio="0"><hp:offset x="0" y="0"/><hp:orgSz width="${w}" height="${h}"/><hp:curSz width="0" height="0"/><hp:flip horizontal="0" vertical="0"/><hp:rotationInfo angle="0" centerX="${w >> 1}" centerY="${h >> 1}" rotateimage="1"/><hp:renderingInfo><hc:transMatrix ${I}/><hc:scaMatrix ${I}/><hc:rotMatrix ${I}/></hp:renderingInfo><hp:lineShape color="#000000" width="0" style="${outline ? 'SOLID' : 'NONE'}" endCap="FLAT" headStyle="NORMAL" tailStyle="NORMAL" headfill="1" tailfill="1" headSz="MEDIUM_MEDIUM" tailSz="MEDIUM_MEDIUM" outlineStyle="NORMAL" alpha="0"/><hc:fillBrush><hc:winBrush faceColor="#000000" hatchColor="#000000" alpha="0"/></hc:fillBrush><hp:shadow type="NONE" color="#B2B2B2" offsetX="0" offsetY="0" alpha="0"/><hc:pt0 x="0" y="0"/><hc:pt1 x="${w}" y="0"/><hc:pt2 x="${w}" y="${h}"/><hc:pt3 x="0" y="${h}"/><hp:sz width="${w}" widthRelTo="ABSOLUTE" height="${h}" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="0" affectLSpacing="0" flowWithText="0" allowOverlap="1" holdAnchorAndSO="0" vertRelTo="${rel}" horzRelTo="PAPER" vertAlign="TOP" horzAlign="LEFT" vertOffset="${y}" horzOffset="${x}"/><hp:outMargin left="0" right="0" top="0" bottom="0"/></hp:rect>`;
  }
  const THIN = 28;   // 단 구분선 0.1mm (테두리 없이 채우기만)
  const colLine = top => bar(THIN, BODYBOT - top, MIDX - (THIN >> 1), top, 'PAPER', false);
  // 둘째 쪽부터: 맨 위 굵은 가로선과 그 아래부터 쪽 끝까지 단 구분선 (그 쪽 첫 문단에 단다)
  const pageLines = () => bar(BODYW, 198, PAGE.ml, BODYTOP - 500) + colLine(BODYTOP - 200);

  function para(inner, { pp = 0, cp = 0, pageBreak = 0, colBreak = 0 } = {}) {
    return `<hp:p id="0" paraPrIDRef="${pp}" styleIDRef="0" pageBreak="${pageBreak}" columnBreak="${colBreak}" merged="0"><hp:run charPrIDRef="${cp}">${inner}</hp:run></hp:p>`;
  }
  const text = s => `<hp:t>${esc(s)}</hp:t>`;

  // 한 줄짜리 표. cells: [{w, inner, pp, cp, bf}]
  function table(cells, ht, bf) {
    const W = cells.reduce((a, c) => a + c.w, 0);
    return `<hp:tbl id="${rid()}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="0" rowCnt="1" colCnt="${cells.length}" cellSpacing="0" borderFillIDRef="${bf}" noAdjust="0"><hp:sz width="${W}" widthRelTo="ABSOLUTE" height="${ht}" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/><hp:outMargin left="0" right="0" top="0" bottom="0"/><hp:inMargin left="283" right="283" top="141" bottom="141"/><hp:tr>${cells.map((c, i) => `<hp:tc name="" header="0" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="${c.bf || bf}"><hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0"><hp:p id="0" paraPrIDRef="${c.pp}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="${c.cp}">${c.inner || ''}</hp:run></hp:p></hp:subList><hp:cellAddr colAddr="${i}" rowAddr="0"/><hp:cellSpan colSpan="1" rowSpan="1"/><hp:cellSz width="${c.w}" height="${ht}"/><hp:cellMargin left="283" right="283" top="141" bottom="141"/></hp:tc>`).join('')}</hp:tr></hp:tbl>`;
  }

  // '5지선다형' / '단답형' 상자
  const label = (H, t) => table([{ w: 9500, inner: text(t), pp: H.pp.center, cp: H.cp.label, bf: H.bf.box }], 1700, H.bf.none);

  function pic(binId, pxW, pxH, W, H) {
    const ow = pxW * 75, oh = pxH * 75;
    const id = rid();
    return `<hp:pic id="${id}" zOrder="0" numberingType="PICTURE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" href="" groupLevel="0" instid="${rid()}" reverse="0"><hp:offset x="0" y="0"/><hp:orgSz width="${ow}" height="${oh}"/><hp:curSz width="${W}" height="${H}"/><hp:flip horizontal="0" vertical="0"/><hp:rotationInfo angle="0" centerX="${Math.round(W / 2)}" centerY="${Math.round(H / 2)}" rotateimage="1"/><hp:renderingInfo><hc:transMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/><hc:scaMatrix e1="${(W / ow).toFixed(6)}" e2="0" e3="0" e4="0" e5="${(H / oh).toFixed(6)}" e6="0"/><hc:rotMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/></hp:renderingInfo><hc:img binaryItemIDRef="${binId}" bright="0" contrast="0" effect="REAL_PIC" alpha="0"/><hp:imgRect><hc:pt0 x="0" y="0"/><hc:pt1 x="${ow}" y="0"/><hc:pt2 x="${ow}" y="${oh}"/><hc:pt3 x="0" y="${oh}"/></hp:imgRect><hp:imgClip left="0" right="${ow}" top="0" bottom="${oh}"/><hp:inMargin left="0" right="0" top="0" bottom="0"/><hp:imgDim dimwidth="${ow}" dimheight="${oh}"/><hp:effects/><hp:sz width="${W}" widthRelTo="ABSOLUTE" height="${H}" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/><hp:outMargin left="0" right="0" top="0" bottom="0"/></hp:pic>`;
  }

  const CIRC = ['', '①', '②', '③', '④', '⑤'];

  // items: [{y, n}] ; opts: {title, subtitle, withAnswers, withSolutions, onProgress}
  async function build(items, opts) {
    const D = window.MOCK_DATA;
    const H = header();
    const bins = [];   // {id, path, data}
    const addBin = async canvas => {
      const id = 'image' + (bins.length + 1);
      bins.push({ id, path: `BinData/${id}.png`, data: await png(canvas) });
      return id;
    };
    const ps = [];
    // 첫 문단: 구역 설정 + 1단 + 윗줄 문구
    const title = opts.title || '수학 영역';
    ps.push(para(secPr() + colPr(1) + text(opts.subtitle || ''), { pp: H.pp.center, cp: H.cp.sub }));
    ps.push(para(text(title), { pp: H.pp.center, cp: H.cp.title }));
    // 제목 아래 굵은 가로선(이 문단 기준)과, 첫 쪽의 단 구분선(가로선 아래부터 쪽 끝까지)
    ps.push(para(bar(BODYW, 198, PAGE.ml, 300, 'PARA') + colLine(BODYTOP + 8100), { pp: H.pp.left, cp: H.cp.small }));

    // 문항: 한 단에 두 칸(위/아래), 큰 문항은 한 단 전체
    let first = true, colIndex = 0, slotUsed = 0;   // slotUsed: 현재 단에서 쓴 칸 수(0~2)
    const capOf = ci => (ci < 2 ? COLH - TITLEH : COLH);
    for (let k = 0; k < items.length; k++) {
      const { y, n } = items[k];
      const it = D[y][n - 1];
      opts.onProgress && opts.onProgress(k / items.length);
      // 문항 유형이 바뀌는 곳에 '5지선다형'/'단답형' 표시
      const kind = n <= 21 ? '5지선다형' : '단답형';
      const prevKind = k ? (items[k - 1].n <= 21 ? '5지선다형' : '단답형') : null;
      const lab = kind !== prevKind ? label(H, kind) : '';
      const extra = lab ? LABELH : 0;
      let colBreak = 0, lines = '';
      // 크기를 먼저 재고(큰 문항인지), 단을 넘길지 정한다
      // items[k].src: 문제 그림 대신 쓸 그림(예: 내 필기를 겹친 그림). 원본과 폭이 같아 번호 위치가 그대로 맞는다
      const qsrc = items[k].src || it.q.src;
      let r = await numberedProblem(qsrc, it.q.num, `${k + 1}.`, NUMPT, capOf(colIndex) - extra - 1000);
      let big = r.H + extra > capOf(colIndex) / 2 - 1200;
      if (!first && (slotUsed >= 2 || (big && slotUsed > 0))) {
        colBreak = 1; colIndex++; slotUsed = 0;
        if (colIndex % 2 === 0) lines = pageLines();          // 새 쪽
        if (colIndex === 2) {                                   // 첫 쪽을 지나면 단 높이가 커진다
          r = await numberedProblem(qsrc, it.q.num, `${k + 1}.`, NUMPT, capOf(colIndex) - extra - 1000);
          big = r.H + extra > capOf(colIndex) / 2 - 1200;
        }
      }
      const { c, W, H: Hh } = r;
      const capNow = capOf(colIndex);
      const bin = await addBin(c);
      if (lab) {
        ps.push(para((first ? colPr(2) : '') + lines + lab, { pp: H.pp.left, cp: H.cp.small, colBreak }));
        first = false; colBreak = 0; lines = '';
      }
      ps.push(para((first ? colPr(2) : '') + lines + pic(bin, c.width, c.height, W, Hh), { pp: H.pp.left, cp: H.cp.body, colBreak }));
      first = false;
      if (big) { slotUsed = 2; }
      else {
        slotUsed++;
        if (slotUsed === 1) {
          const blank = Math.max(1, Math.floor((capNow / 2 - Hh - extra - 800) / LINE));
          for (let i = 0; i < blank; i++) ps.push(para('', { pp: H.pp.left }));
        }
      }
    }

    // 정답·해설: 단 높이를 직접 세어 단을 나누고, 새 쪽의 첫 문단에 선을 단다
    let col = 0, used = 0;
    const startPage = (inner, h, o) => { col = 0; used = h; ps.push(para(pageLines() + inner, { pp: H.pp.left, pageBreak: 1, ...o })); };
    const flow = (inner, h, o = {}) => {
      let colBreak = 0, lines = '';
      if (used > 0 && used + h > COLH - 1500) { colBreak = 1; col++; used = 0; if (col % 2 === 0) lines = pageLines(); }
      used += h;
      ps.push(para(lines + inner, { pp: H.pp.left, colBreak, ...o }));
    };

    if (opts.withAnswers) {
      startPage(text('정답'), 2600, { cp: H.cp.h15 });
      flow('', LINE);
      items.forEach(({ y, n }, k) => {
        const it = D[y][n - 1];
        const a = it.ans <= 5 && n <= 21 ? CIRC[it.ans] : String(it.ans);
        flow(text(`${k + 1}.  ${a}      (${y}학년도 3월 ${n}번, ${it.score}점)`), LINE, { cp: H.cp.body });
      });
    }

    if (opts.withSolutions) {
      startPage(text('해설'), 2600, { cp: H.cp.h15 });
      for (let k = 0; k < items.length; k++) {
        const { y, n } = items[k];
        const it = D[y][n - 1];
        opts.onProgress && opts.onProgress(k / items.length);
        for (let s = 0; s < it.s.length; s++) {
          const seg = it.s[s];
          const maxPx = Math.floor((COLH - 2000) * seg.w / COLW);
          if (s > 0 && seg.h <= maxPx) {
            // 번호를 바꿀 필요가 없으면 원본 PNG를 그대로 넣는다
            const id = 'image' + (bins.length + 1);
            bins.push({ id, path: `BinData/${id}.png`, data: dataUrlBytes(seg.src) });
            const Hh = Math.round(seg.h * COLW / seg.w);
            flow(pic(id, seg.w, seg.h, COLW, Hh), Hh + 300);
            continue;
          }
          const c = await renumbered(seg.src, s === 0 ? seg.num : null, s === 0 ? `${k + 1}.` : null, false);
          for (const part of split(c, maxPx)) {
            const Hh = Math.round(part.height * COLW / part.width);
            const bin = await addBin(part);
            flow(pic(bin, part.width, part.height, COLW, Hh), Hh + 300);
          }
        }
        flow('', LINE);
      }
    }

    const section = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>${T.secRoot}${ps.join('')}</hs:sec>`;
    const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    const hpf = `${T.hpfHead}<opf:metadata><opf:title>${esc(opts.title || '')}</opf:title><opf:language>ko</opf:language><opf:meta name="creator" content="text">고1 3월 모의고사 앱</opf:meta><opf:meta name="subject" content="text"/><opf:meta name="description" content="text"/><opf:meta name="lastsaveby" content="text"/><opf:meta name="CreatedDate" content="text">${now}</opf:meta><opf:meta name="ModifiedDate" content="text">${now}</opf:meta><opf:meta name="date" content="text"/><opf:meta name="keyword" content="text"/></opf:metadata><opf:manifest><opf:item id="header" href="Contents/header.xml" media-type="application/xml"/>${bins.map(b => `<opf:item id="${b.id}" href="${b.path}" media-type="image/png" isEmbeded="1"/>`).join('')}<opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/><opf:item id="settings" href="settings.xml" media-type="application/xml"/></opf:manifest><opf:spine><opf:itemref idref="header" linear="yes"/><opf:itemref idref="section0" linear="yes"/></opf:spine></opf:package>`;
    const files = [
      { name: 'mimetype', data: 'application/hwp+zip' },
      { name: 'version.xml', data: T.version },
      { name: 'Contents/header.xml', data: H.xml },
      { name: 'Contents/section0.xml', data: section },
      { name: 'Contents/content.hpf', data: hpf },
      ...bins.map(b => ({ name: b.path, data: b.data })),
      { name: 'settings.xml', data: T.settings },
      { name: 'Preview/PrvText.txt', data: `${opts.title || ''}\r\n${opts.subtitle || ''}` },
      { name: 'META-INF/container.xml', data: T.container },
      { name: 'META-INF/manifest.xml', data: T.manifest },
      { name: 'META-INF/container.rdf', data: T.rdf },
    ];
    opts.onProgress && opts.onProgress(1);
    return zipStore(files);
  }

  window.HWPX = { build };
})();
