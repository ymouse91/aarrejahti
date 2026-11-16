require('fs').mkdirSync('output',{recursive:true});
const assert=require('node:assert/strict'),fs=require('fs'),E=require('../rounds'),G=require('../engine');
const refs=[0,1,3].flatMap(shape=>[0,1].map(color=>({kind:'markers',shape,color})));
for(const a of refs)for(const b of refs){if(a===b)continue;for(const kind of ['equal','closer','difference'])for(const n of (kind==='difference'?[1,2]:[undefined]))assert(E.catalog.some(c=>c.rule.kind===kind&&c.rule.n===n&&((JSON.stringify(c.rule.ref)===JSON.stringify(a)&&JSON.stringify(c.rule.other)===JSON.stringify(b))||(kind==='equal'&&JSON.stringify(c.rule.ref)===JSON.stringify(b)&&JSON.stringify(c.rule.other)===JSON.stringify(a)))));}
assert(!E.clueUsageValid([{clueIds:[1]},{clueIds:[1]}]));assert(!E.clueUsageValid([{clueIds:[1]},{clueIds:[2]},{clueIds:[1]},{clueIds:[3]},{clueIds:[1]}]));
assert(E.clueUsageValid([{clueIds:[1]},{clueIds:[2]},{clueIds:[1]}]));
for(let id=53;id<=56;id++){const html=G.describe(E.catalog[id-1].rule).html;assert(html.includes('terrain-stack'));assert(html.includes('≥ 1'));assert(!html.includes(' + '));}
assert(!E.catalog.some(c=>c.rule.kind==='sum'));const bank=[];for(const level of ['normal','medium','challenging'])for(const seed of [123,456]){const start=Date.now(),r=E.generate(seed,level);E.validate(r);assert.deepEqual(r.tasks.map(t=>t.kind),['normal','normal','normal','skull','disappearance','addition']);assert(r.tasks[5].clueIds.every(id=>id<=60));assert(level==='normal'?r.difficulty<550:level==='medium'?r.difficulty>=550&&r.difficulty<750:r.difficulty>=750&&r.tasks.slice(0,3).every(t=>t.difficulty>=400));for(const t of r.tasks.slice(0,3)){for(const id of t.clueIds){const tests=t.clueIds.filter(n=>n!==id).map(n=>G.compile(r,E.catalog[n-1].rule));assert(Array.from({length:120},(_,i)=>i).filter(i=>tests.every(f=>f(i))).length>1);}}bank.push(r);console.log(level,seed,Math.round(r.difficulty),Date.now()-start+'ms');}
fs.writeFileSync('output/pc-level-bank.json',JSON.stringify(bank));console.log('PASS: catalog coverage, repetition, levels, unique solutions and six expedition types');

assert.throws(()=>E.generate(123,"normal",{maxAttempts:0}),/Tuoretta/);
