/* 煩惱改寫卡：把一句煩惱改寫成 5 個可以動手的問題（不用 AI，全部在瀏覽器裡算） */
(function(root){

const MAX = 28;           // 引用進題目的最長字數
const ACT_MAX = 12;       // 「要不要 X」的 X 最長字數
const QUOTE_MAX = 14;     // 引用進題目裡的「核心句」最長字數

// 去掉 emoji、多餘空白與句尾標點
function clean(raw){
  let s = String(raw || '');
  s = s.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ');   // 去掉 HTML 標籤
  s = s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '');
  s = s.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  s = s.replace(/^[「『"'“‘（(\[]+|[」』"'”’）)\]]+$/g, '').trim();
  s = s.replace(/[？?。.!！~～…,，、;；:：\s]+$/u, '').trim();
  return s;
}

const WORRY_WORDS = /不知道|不確定|怕|擔心|困住|卡住|卡|累|迷惘|迷茫|焦慮|不想|不敢|沒辦法|沒動力|要不要|該不該|還是|怎麼辦|煩/;

// 太長時，挑出最像煩惱的那一段；還是太長就在逗號或字數處截斷
function shorten(s){
  if([...s].length <= MAX) return s;
  if(/^[\x00-\x7F]+$/.test(s)){                     // 英文：在字的邊界截斷
    const cut = s.slice(0, 60);
    return s.length <= 60 ? s : cut.slice(0, cut.lastIndexOf(' ') > 20 ? cut.lastIndexOf(' ') : 60) + '…';
  }
  const parts = s.split(/[。！？!?；;，,]/).map(x => x.trim()).filter(Boolean);
  let hit = -1;
  parts.forEach((x, i) => { if(WORRY_WORDS.test(x)) hit = i; });   // 取最後一個像煩惱的段落
  if(hit >= 0){
    let pick = parts[hit].replace(/(?:才好|比較好)$/, '');
    if(hit > 0 && [...(parts[hit-1] + '，' + pick)].length <= MAX) pick = parts[hit-1] + '，' + pick;
    if([...pick].length <= MAX && !/^還是/.test(pick)) return pick;
    if(/^還是/.test(parts[hit])) return [...s].slice(0, MAX - 1).join('') + '…';
  }
  const first = s.split(/[。！？!?；;\n]/)[0].trim();
  if(first && [...first].length <= MAX) return first;
  const base = first || s;
  const chars = [...base].slice(0, MAX);
  const cut = chars.join('');
  const comma = Math.max(cut.lastIndexOf('，'), cut.lastIndexOf(','), cut.lastIndexOf('、'));
  if(comma >= 8) return cut.slice(0, comma);
  return chars.slice(0, MAX - 1).join('') + '…';
}

// 看起來像亂打或沒有內容
function isNoise(s){
  if(!s) return true;
  const letters = (s.match(/[\p{Script=Han}A-Za-z0-9]/gu) || []).length;
  if(letters < 2) return true;
  const chars = [...s.replace(/\s/g, '')];
  if(new Set(chars).size <= 2 && chars.length >= 3) return true;          // 哈哈哈、aaaa
  if(/^[A-Za-z]+$/.test(s) && s.length >= 5 && !/[aeiouy]/i.test(s)) return true; // sdfghjk
  if(/^[A-Za-z]{6,}$/.test(s) && /(asdf|qwer|zxcv|hjkl|sdfg|jkl)/i.test(s)) return true;
  if(/^[\d\s\W]+$/u.test(s) && !/[\p{Script=Han}]/u.test(s)) return true;  // 只有數字符號
  return false;
}

const LEAD = /^(?:我|其實|最近|現在|一直|好像|真的|總是|常常|有時候|老是|覺得|想說|就是|到底|是不是)+/;
const TAIL = /(?:呢|嗎|啊|吧|耶|欸|呀|喔|哦|啦|比較好|才好|好了|好)+$/;

function trimAct(x){
  return x.replace(TAIL, '').replace(/^(?:要|該|去做|先)/, '').trim();
}

// 判斷句型，抓出主題
function parse(raw){
  const s = clean(raw);
  if(isNoise(s)) return {kind:'empty', raw:s};
  const en = /^[\x00-\x7F]+$/.test(s);

  // A 還是 B
  const m2 = s.match(/^(.*?)還是(?!很|好|會|一樣|沒|不|在|有點|覺得|那麼|一直|常|老是|放不下|忘不了)(.+)$/);
  if(m2 && !en && !LOSS.test(s)){
    let a = m2[1], b = m2[2];
    // 把 A 前面的情境拿掉：取最後一個「要／該／想／是要」之後
    const cut = a.search(/(?:應該要|應該|是要|該要|要|該|想)(?!.*(?:應該要|應該|是要|該要|要|該|想))/);
    if(cut >= 0) a = a.slice(cut).replace(/^(?:應該要|應該|是要|該要|要|該|想)/, '');
    a = a.replace(LEAD, '').replace(/[，,、\s]+$/, '').trim();
    b = b.replace(/[，,、\s]+$/, '').replace(TAIL, '').replace(/^(?:要|該|去)/, '').trim();
    if(a && b && [...a].length <= ACT_MAX && [...b].length <= ACT_MAX)
      return {kind:'choice', a, b, raw:s};
  }

  // 該不該 X／要不要 X
  const m1 = s.match(/(?:該不該|應不應該|要不要|是不是該|是不是要|需不需要|適不適合)(.+)$/);
  if(m1 && !en && !LOSS.test(s)){
    const x = trimAct(m1[1]);
    if(x && [...x].length <= ACT_MAX) return {kind:'decide', x, raw:s};
  }

  // 其他：直接引用整句煩惱
  let w = shorten(s).replace(/(?:呢|嗎|啊|吧|耶|欸|呀|啦)$/, '');
  if(!en && !/^我/.test(w) && /^(?:不知道|不確定|不想|不敢|好累|很累|很怕|害怕|擔心|想|沒有|沒辦法|一直|總是|每天|最近)/.test(w)) w = '我' + w;
  return {kind:'worry', w, en, raw:s};
}

// 核心句：整句夠短就用整句；不然取最後一段，去掉「可是、但是」等連接詞
function core(p){
  if(p.en) return '';
  const w = p.w.replace(/…$/, '');
  if([...w].length <= QUOTE_MAX && !/…/.test(p.w)) return w;
  const parts = w.split(/[，,、]/).map(x => x.trim()).filter(Boolean);
  let last = (parts[parts.length - 1] || '').replace(/^(?:可是|但是|但|而且|所以|然後|結果|只是|卻)/, '').trim();
  if(/^還是/.test(last)) return '';
  const n = [...last].length;
  return (n >= 2 && n <= QUOTE_MAX) ? last : '';
}

const LABELS = ['縮小到這一週','換成小實驗','找一個人問','換個角度','先放下一個'];
const LOSS_LABELS = ['照顧這一週','好好想念','找一個人說','換個角度','慢一點'];

// 求救字眼：先顯示溫和的卡片，不產生改寫題（查查 10/27 同意）。改成 false 就關掉。
const CRISIS_CARD = true;
const CRISIS = /想死|不想活|活不下去|想自殺|自殺|想消失|結束生命|輕生|割腕|跳樓|了結自己/;
const CRISIS_MSG = '謝謝你願意寫下來。這句話聽起來很重，先不用急著改寫它。如果你現在很難受，可以打 1925（安心專線，24 小時、免付費）或 1995（生命線），找一個人說說話。如果只是想抒發，也可以換一句最近卡住的事試試。';

// 失去：不給行動題，改成照顧自己、好好想念
const LOSS = /死了|過世|去世|離世|往生|走了|不在了|離開我了|分手了|離婚了|失去了/;
const PET = /狗|貓|寵物|毛小孩|兔|鳥|倉鼠|魚/;
const BREAKUP = /分手|離婚|前任/;
// 抱怨或情緒：給「讓自己好過一點」的問法，不說「讓它往前」
const FEEL = /很爛|好爛|超爛|爛透|討厭|受不了|很煩|好煩|超煩|機車|很糟|好糟|很差|好累|很累|超累|難過|傷心|委屈|壓力好大|壓力很大|好氣|很氣|生氣|不爽|崩潰|想哭/;

// 從幾種說法裡挑一個；pick 可以傳固定數字方便測試
function choose(arr, pick){ return arr[(pick == null ? Math.floor(Math.random()*997) : pick) % arr.length]; }

// 引用給題目用的字：中文用核心句，英文用原句（在字的邊界截），都抓不到就用「這件事」
function quoteOf(p){
  if(p.en){
    let t = p.raw;
    if(t.length > 40){ const c = t.slice(0, 40); const sp = c.lastIndexOf(' '); t = (sp > 15 ? c.slice(0, sp) : c) + '…'; }
    return t ? `「${t}」` : '這件事';
  }
  const c = core(p);
  if(c) return `「${c}」`;
  // 核心句太長：在標點處取前段，不從字中間截
  const w = p.w.replace(/…$/, '');
  const seg = w.split(/[，,、]/)[0].trim();
  if(seg && [...seg].length <= QUOTE_MAX + 4) return `「${seg}」`;
  return '這件事';
}

function rewrite(raw, pick){
  const p = parse(raw);
  if(p.kind === 'empty') return {ok:false, parsed:p,
    msg:'再多寫幾個字吧。用一句話說說你最近卡住的事，例如「我不知道下一步要往哪裡走」。'};
  if(CRISIS_CARD && CRISIS.test(p.raw)) return {ok:false, crisis:true, parsed:p, msg:CRISIS_MSG};
  const r = n => (pick == null ? null : pick + n);   // 每題用不同的說法序號
  let qs, labels = LABELS, hint = '';
  if(p.kind === 'decide'){
    const x = `「${p.x}」`;
    qs = [
      choose([`先不急著決定要不要${x}。這一週，我可以先做哪一件 30 分鐘內做得完的小事，讓自己看得更清楚？`,
              `要不要${x}先放著。這一週，有哪一件小事做完，會讓我更知道答案？`], r(0)),
      choose([`與其一次決定${x}，我可以安排什麼一週的小實驗，先試試看它適不適合我？`,
              `如果先用一週假裝已經決定${x}，我會在哪一刻覺得對、哪一刻覺得不對？`], r(1)),
      choose([`我認識的人裡，誰做過${x}，或認真考慮過？我可以約對方聊 15 分鐘，問問當時是怎麼想的？`,
              `關於${x}，誰的經驗我最想聽？我可以怎麼開口約對方聊 15 分鐘？`], r(2)),
      choose([`如果是好朋友問我要不要${x}，我會先請對方想清楚哪一件事？`,
              `一年後的我回頭看，會希望現在的我怎麼想${x}這件事？`], r(3)),
      choose([`想到${x}，我最放不下的顧慮是哪一個？先把它放到一邊，答案會不會不一樣？`,
              `關於${x}，有哪一個顧慮其實不用現在就解決？`], r(4))
    ];
  } else if(p.kind === 'choice'){
    const a = `「${p.a}」`, b = `「${p.b}」`;
    qs = [
      choose([`先不急著在${a}和${b}之間選。這一週，我可以先做哪一件 30 分鐘內做得完的小事，讓自己看得更清楚？`,
              `${a}和${b}先不選。這一週，有哪一件小事做完，會讓我更知道自己偏向哪邊？`], r(0)),
      choose([`我能不能各用一週的小實驗，分別試試${a}和${b}的感覺，再來決定？`,
              `如果先假裝選了${a}過一週，再假裝選了${b}過一週，哪一週我比較期待醒來？`], r(1)),
      choose([`我認識的人裡，誰走過${a}或${b}其中一條路？我可以約對方聊 15 分鐘，問問當時是怎麼選的？`,
              `走過${a}的人和走過${b}的人，我各認識誰？我可以先約哪一位聊 15 分鐘？`], r(2)),
      choose([`如果是好朋友卡在${a}和${b}之間，我會先請對方想清楚哪一件事？`,
              `有沒有可能不是只能選${a}或${b}？第三條路會長什麼樣子？`], r(3)),
      choose([`在${a}和${b}之間，我最放不下的顧慮是哪一個？先把它放到一邊，答案會不會不一樣？`,
              `選${a}或${b}，哪一個顧慮其實不用現在就解決？`], r(4))
    ];
  } else {
    const w = quoteOf(p);
    if(p.en) hint = '用中文寫，改寫會更貼近你的狀況。';
    if(!p.en && LOSS.test(p.raw)){
      labels = LOSS_LABELS;
      const pet = PET.test(p.raw), breakup = BREAKUP.test(p.raw);
      const who = pet ? '牠' : '他';
      qs = [
        `想到${w}，這一週有哪一件 30 分鐘內做得到的小事，能讓我好過一點？`,
        breakup ? `這一週，我可以用什麼方式，好好整理這段關係留給我的東西？`
                : `這一週，我可以用什麼方式好好想念${who}？例如寫下一段回憶，或整理一張照片。`,
        breakup ? `我身邊誰願意聽我說說這件事？我可以約對方聊 15 分鐘嗎？`
                : `誰也認識${who}，或也經歷過類似的事？我可以找對方聊 15 分鐘，說說心裡的話嗎？`,
        `如果是好朋友跟我說${w}，我會先對他說什麼？`,
        `這段時間，有哪一件原本的待辦，可以先放下，讓自己慢一點？`
      ];
    } else if(!p.en && FEEL.test(p.raw)){
      qs = [
        choose([`想到${w}，這一週有哪一件 30 分鐘內做得到的小事，能讓我好過一點？`,
                `這一週，有什麼小事能讓${w}對我的影響少一點？`], r(0)),
        choose([`關於${w}，這週我可以試一個什麼小改變，看看感覺會不會不一樣？`,
                `面對${w}，有沒有一個我還沒試過的小做法，這週可以試一次？`], r(1)),
        choose([`我認識的人裡，誰也有過${w}的時候？我可以找對方聊 15 分鐘，問問他是怎麼撐過來的？`,
                `關於${w}，我最想聽誰的看法？我可以怎麼開口約對方聊 15 分鐘？`], r(2)),
        `如果是好朋友跟我說${w}，我會先對他說什麼？`,
        choose([`關於${w}，哪些是我改變不了的，可以先放下？哪一件是我可以動的？`,
                `${w}裡，有哪一部分不是我的責任，可以先放下？`], r(4))
      ];
    } else {
      qs = [
        choose([w === '這件事' ? `這件事有點大。這一週，我可以先做哪一件 30 分鐘內做得完的小事，讓它往前一點點？`
                               : `${w}這件事有點大。這一週，我可以先做哪一件 30 分鐘內做得完的小事，讓它往前一點點？`,
                `關於${w}，這一週我可以先做哪一件 30 分鐘內做得完的小事？`,
                `如果只給自己 30 分鐘處理${w}，這一週我會先做什麼？`], r(0)),
        choose([`關於${w}，我這週可以先試哪一個小做法，看看會發生什麼？`,
                `關於${w}，我願意先試一週的小做法是什麼？`,
                `面對${w}，有沒有一個以前沒試過的小做法，我可以這週試一次？`], r(1)),
        choose([w === '這件事' ? `我認識的人裡，誰也遇過類似的狀況？我可以約對方聊 15 分鐘，問問當時是怎麼走過來的？`
                               : `我認識的人裡，誰也遇過類似${w}的狀況？我可以約對方聊 15 分鐘，問問當時是怎麼走過來的？`,
                `關於${w}，誰的經驗我最想聽？我可以怎麼開口約對方聊 15 分鐘？`], r(2)),
        choose([`如果是好朋友跟我說${w}，我會建議對方先做哪一件事？`,
                `一年後的我回頭看${w}，會希望現在的我先做什麼？`], r(3)),
        choose([`想到${w}，我心裡一直掛著的顧慮裡，有哪一個可以先放下？`,
                `關於${w}，有哪一件不是現在一定要決定的事，可以先放到一邊？`], r(4))
      ];
    }
  }
  const worry = p.kind==='worry' ? p.w : p.raw.length <= MAX ? p.raw : shorten(p.raw);
  return {ok:true, parsed:p, worry, hint, items: qs.map((q,i) => ({label:labels[i], q}))};
}

const api = {clean, shorten, isNoise, parse, rewrite, LABELS, LOSS_LABELS, CRISIS_CARD, CRISIS};
if(typeof module !== 'undefined' && module.exports) module.exports = api;
else root.Rewrite = api;
})(this);
