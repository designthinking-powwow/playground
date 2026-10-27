/* 找人聊 15 分鐘：依「找誰」和「聊什麼」產生邀約訊息、6 個好問題、聊完筆記 */
(function(root){

const WHO = {
  coworker: {label:'同事',         polite:false},
  senior:   {label:'前輩',         polite:true},
  friend:   {label:'朋友',         polite:false},
  family:   {label:'家人',         polite:false},
  stranger: {label:'不熟但想認識的人', polite:true}
};

const TOPICS = {
  next:    {label:'接下來的方向', situation:'最近在想接下來要往哪個方向走', want:'你當初選方向的經驗',
            qs:['你當初是怎麼決定要往現在這個方向走的？','那時候做的哪一件事，後來發現最有用？']},
  career:  {label:'換工作方向', situation:'最近在想工作要不要換個方向', want:'你在工作選擇上的經驗',
            qs:['你當初是怎麼走到現在這份工作的？','如果重來一次，你會在什麼時候做不一樣的決定？']},
  stuck:   {label:'工作上卡關', situation:'最近工作上有件事卡住了', want:'你遇到類似狀況時是怎麼處理的',
            qs:['你遇過最卡的一次是什麼情況？後來怎麼過去的？','卡住的時候，你通常會先找誰、先做什麼？']},
  study:   {label:'要不要進修', situation:'最近在考慮要不要去進修、學點新東西', want:'你學習和進修的經驗',
            qs:['你學過最值得的一樣東西是什麼？怎麼知道它值得？','有沒有什麼是學了之後才發現用不到的？']},
  return:  {label:'重回職場', situation:'最近在想要不要重新回到職場', want:'你對現在職場的觀察',
            qs:['這幾年，你覺得職場最大的改變是什麼？','如果是你，會先從哪一種工作開始試？']},
  ownbiz:  {label:'創業或接案', situation:'最近在想要不要自己出來做', want:'你自己出來做的經驗',
            qs:['剛開始的第一年，最讓你意外的是什麼？','你怎麼判斷一個機會值不值得接？']},
  retire:  {label:'退休後的生活', situation:'最近在想退休之後的日子要怎麼過', want:'你安排生活的方式',
            qs:['你現在的一週，大概是怎麼過的？','有什麼事，是你很慶幸早一點開始的？']},
  other:   {label:'其他', situation:'', want:'你的想法和經驗',
            qs:['你有遇過類似的事嗎？當時是怎麼想的？','如果是你，會先從哪裡開始了解這件事？']}
};

const COMMON_QS = [
  '現在回頭看，有什麼是你希望早一點知道的？',
  '這件事最常被誤會的地方是什麼？',
  '如果你站在我現在的位置，會先試哪一件小事？',
  '你覺得我還可以去問誰？'
];

const NOTES = [
  '最讓我意外的一句話：',
  '我原本以為＿＿＿，其實＿＿＿。',
  '這週我要試的一件小事：'
];

function clean(s, max){
  s = String(s || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
    .replace(/^[「『"'“]+|[」』"'”]+$/g, '')
    .replace(/[？?。.!！~～…,，、;；:：\s]+$/u, '').trim();
  return cut(s, max);
}
// 太長時在標點或空格處截斷，不從詞中間切；找不到好位置才硬截並加「…」
function cut(s, max){
  const chars = [...s];
  if(chars.length <= max) return s;
  const head = chars.slice(0, max).join('');
  const pos = Math.max(head.lastIndexOf('，'), head.lastIndexOf('、'), head.lastIndexOf(','), head.lastIndexOf(' '), head.lastIndexOf('。'));
  if(pos >= Math.floor(max / 2)) return head.slice(0, pos).trim();
  return chars.slice(0, max - 1).join('') + '…';
}
function meaningful(s){
  const letters = (s.match(/[\p{Script=Han}A-Za-z0-9]/gu) || []).length;
  if(letters < 2 || new Set([...s.replace(/\s/g,'')]).size <= 2) return false;
  if(/^[A-Za-z]+$/.test(s) && (!/[aeiouy]/i.test(s) || /(asdf|qwer|zxcv|hjkl|sdfg)/i.test(s))) return false;
  return true;
}

function build(opt){
  const who = WHO[opt.who] || WHO.friend;
  const tp = TOPICS[opt.topic] || TOPICS.next;
  const them = clean(opt.them, 12);
  const me = clean(opt.me, 12);
  const where = clean(opt.where, 24);

  let situation = tp.situation, want = tp.want, topicLabel = tp.label;
  if(opt.topic === 'other'){
    const o = clean(opt.other, 24).replace(/^(?:我|最近|想聊|想問)+/, '');
    const ok = o && meaningful(o);
    situation = ok ? `最近在想「${o}」這件事` : '最近有件事一直在想';
    topicLabel = ok ? cut(o, 12) : '想聊的事';
  }
  if(who.polite) want = want.replace(/你/g, '您');

  let msg;
  switch(opt.who){
    case 'coworker':
      msg = `${them ? them + '，' : '嗨，'}想跟你約 15 分鐘聊一下。我${situation}，想聽聽${want}。\n午休或下班前都可以，咖啡我請。最近比較忙的話也完全沒關係，跟我說一聲就好！`;
      break;
    case 'senior':
      msg = `${them ? them + '您好，' : '您好，'}不好意思打擾了。我${situation}，一直很想聽聽${want}。\n不知道最近方不方便撥 15 分鐘給我？線上或約杯咖啡都可以，時間地點配合您。如果最近比較忙，完全沒關係，不用勉強！`;
      break;
    case 'family':
      msg = `${them ? them + '，' : ''}想找你聊一件事，15 分鐘就好。我${situation}，想聽聽${want}。\n這週吃飯的時候，或你方便的時候都可以，不急。`;
      break;
    case 'stranger':
      msg = `${them ? them + '您好，' : '您好，'}我是${me || '（你的名字）'}，${where ? where : '（在哪裡認識或看到對方，例如：上次的講座聽過您分享）'}。\n冒昧傳訊息給您。我${situation}，很想聽聽${want}。不知道方不方便撥 15 分鐘，線上聊就可以，時間配合您。如果不方便也完全沒關係，謝謝您看完這段訊息！`;
      break;
    default: // friend
      msg = `${them ? them + '，' : '嗨，'}最近好嗎？想約你聊個 15 分鐘。我${situation}，想聽聽${want}。\n視訊或喝咖啡都可以，看你方便。忙的話也沒關係，改天再約！`;
  }
  msg = msg.replace(/^，/, '');

  // 對前輩、不熟的人，問題也用「您」，跟訊息一致
  let qs = [...tp.qs, ...COMMON_QS];
  if(who.polite) qs = qs.map(q => q.replace(/你/g, '您'));
  return {msg, qs, notes: NOTES.slice(), who: who.label, topic: topicLabel};
}

const api = {WHO, TOPICS, build, clean, cut};
if(typeof module !== 'undefined' && module.exports) module.exports = api;
else root.Chat = api;
})(this);
