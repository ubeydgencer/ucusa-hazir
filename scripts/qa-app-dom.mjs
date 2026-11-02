// Optional DOM integration QA; no browser or runtime dependency is installed.
// Usage: node scripts/qa-app-dom.mjs /absolute/path/to/jsdom/lib/api.js
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {buildPlan,itemSignature} from '../dist/lib/planner.js';
const {JSDOM}=await import(pathToFileURL(process.argv[2]).href);
const dom=new JSDOM(await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),{url:'https://synthetic-test.invalid/'});
const w=dom.window;
Object.assign(globalThis,{document:w.document,window:w,localStorage:w.localStorage,FormData:w.FormData,matchMedia:()=>({matches:false})});
const $=id=>document.getElementById(id);
const trip={origin:'IST',destination:'LHR',date:'2026-11-10',time:'10:30',routeType:'auto',airline:'TK',cabin:'economy',fare:'EcoFly',baggageType:'weight',allowance:20,plannedWeight:18,needs:{meal:true}};
const plan=buildPlan(trip),item=plan.items.find(i=>i.id==='baggage-right');
localStorage.setItem('ucusa-hazir-v1',JSON.stringify({version:1,trip:plan.trip,completed:{[item.id]:itemSignature(item,plan.trip)}}));
const state=()=>JSON.parse(localStorage.getItem('ucusa-hazir-v2'));
const input=(id,value,event='input')=>{ $(id).value=value;$(id).dispatchEvent(new w.Event(event,{bubbles:true})); };
const submit=()=>{ $('trip-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal($('form-error').hidden,true,$('form-error').textContent); };
let printText='',download=null;
w.print=()=>{ printText=$('plan-details').textContent+' '+$('plan-baggage').textContent+' '+document.querySelector('.boarding-top').textContent; };
w.HTMLAnchorElement.prototype.click=function(){ download={href:this.href,name:this.download}; };
try {
  await import(new URL('../dist/app.js',import.meta.url));
  assert.equal(state().entries.length,1);assert.equal(localStorage.getItem('ucusa-hazir-v1'),null);assert.equal($('item-baggage-right').checked,true);
  const outboundId=state().activeId;
  $('add-return').click();assert.equal($('origin').value,'LHR');assert.equal($('date').value,'');assert.equal($('airline').value,'OTHER');assert.equal($('baggageType').value,'unknown');
  input('date','2026-11-20');input('baggageType','piece','change');input('pieces','1');input('perPiece','23');submit();
  assert.equal(state().entries.length,2);const returnId=state().activeId;assert.notEqual(returnId,outboundId);assert.equal($('item-baggage-right').checked,false);
  input('trip-select',outboundId,'change');assert.equal($('allowance').value,'20');assert.equal($('item-baggage-right').checked,true);
  input('allowance','25');assert.equal($('trip-select').disabled,true);assert.equal($('clear').disabled,true);
  // Example changes, submit and checkbox toggles must not touch real storage.
  const beforeExample=localStorage.getItem('ucusa-hazir-v2');$('example').click();input('date','2026-12-01');submit();
  assert.equal(localStorage.getItem('ucusa-hazir-v2'),beforeExample);assert.equal($('new-trip').disabled,true);
  $('return-trip').click();assert.equal($('allowance').value,'25');assert.equal($('trip-select').disabled,true);
  $('discard-changes').click();assert.equal($('allowance').value,'20');assert.equal($('trip-select').disabled,false);
  input('trip-select',returnId,'change');assert.equal($('perPiece').value,'23');
  $('print').click();assert.match(printText,/20 Kasım 2026/);assert.match(printText,/DÖNÜŞ/);assert.doesNotMatch(printText,/10 Kasım|20 kg/);
  $('download').click();assert.match(download.name,/LHR-IST-2026-11-20/);assert.match(await (await fetch(download.href)).text(),/Dönüş · LHR → IST · 2026-11-20/);
  $('clear').click();assert.equal(state().entries.length,1);assert.equal(state().activeId,outboundId);assert.equal($('item-baggage-right').checked,true);
  $('undo-delete').click();assert.equal(state().entries.length,2);assert.equal(state().activeId,returnId);assert.equal($('perPiece').value,'23');
  console.log('DOM integration passed: v1 migration, independent return, switching, dirty guard, example/submit restore, selected print/download, delete/undo. Visual browser layout not tested.');
} finally {w.close();}
