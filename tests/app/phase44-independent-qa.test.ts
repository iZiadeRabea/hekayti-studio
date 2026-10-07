import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { transformSync } from 'esbuild';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SqliteProjectRepository, PrivateBookAssetStore } from '@hekayti/persistence';
import { StoryWorkflowService } from '@hekayti/core/workflow';
import { StoryPlannerService } from '@hekayti/core/planner';
import { SimpleCreatorService } from '@hekayti/core/creator';
import { BookStudioService } from '@hekayti/core/book';
import { MockStoryConceptProvider } from '@hekayti/core/story';
import { MockStoryDraftProvider } from '@hekayti/core/language';
import { importLibraryBatch, parseLibraryBatch } from '@hekayti/core/creative';
import { canonicalJson } from '@hekayti/core';
import type { AssetManifest, BookCommand, BookStudioSnapshot } from '@hekayti/contracts/book';

const clothIdea = 'تولين تشوف حاجة ناعمة ومدورة تحت القماشة، تكشفها وتحضنها وتنام.';
function harness() {
  const repo = new SqliteProjectRepository(':memory:');
  let n = 0;
  const seam = { id: () => `independent-${++n}`, now: () => '2026-10-07T12:00:00Z' };
  const workflow = new StoryWorkflowService(repo, new MockStoryConceptProvider(), new MockStoryDraftProvider(), seam);
  const planner = new StoryPlannerService(repo, workflow, seam, 'planner-quality/1.1');
  const creator = new SimpleCreatorService(repo, workflow, planner, seam);
  const studio = new BookStudioService(repo, creator, workflow, planner, seam, async () => 'f'.repeat(64));
  importLibraryBatch(repo, parseLibraryBatch(readFileSync('examples/starter-library/starter-library.jsonl', 'utf8').split(/\r?\n/).filter(Boolean).slice(0,26).join('\n')), 0, 'synthetic', 'now');
  return { repo, creator, studio };
}
function input(h: ReturnType<typeof harness>, age = 7) {
  return { agePreset: age < 12 ? 'UNDER_ONE' as const : 'THREE_FIVE' as const, exactAgeMonths: age, category: 'bedtime' as const, goalPreset: 'SLEEP' as const, fictionalName: 'تولين', primaryLanguageMode: 'ar-EG' as const, provisionalAcknowledged: true, expectedLibrary: h.repo.loadLibrary().recordVersion,
    bookIntent: { idea: { source: 'CUSTOM' as const, text: clothIdea }, path: { mode: 'AUTO' as const, steps: [] }, length: 'AUTO' as const }};
}
async function readyBook() {
  const h = harness();
  let s = await h.studio.create(input(h));
  const run = async (command: Record<string, unknown>) => (s = await h.studio.command({ ...command, projectId: s.book.projectId, expectedBook: s.book.recordVersion } as BookCommand));
  await run({ action: 'PREPARE_WRITER' });
  const bp = s.session.workflow.blueprints.at(-1)!;
  await h.creator.command({ action: 'IMPORT', projectId: s.book.projectId, packageId: s.session.package!.packageId, expectedPlanner: s.session.planner.recordVersion, expectedWorkflow: s.session.workflow.recordVersion,
    json: JSON.stringify({ schemaVersion: 'writer-response/1.0', editions: [{ mode: 'ar-EG', pages: bp.pagePlan.map((_, i) => ({ pageNumber:i+1, narration:['تولين شافت حاجة ناعمة تحت القماشة.','تولين قربت بهدوء.','تولين رفعت القماشة.','اللعبة ظهرت قدامها.','تولين حضنت اللعبة.','تولين هديت ونامت.'][i] ?? 'تولين هديت.', dialogue: [], altText: 'تولين في البيت.' })) }] }) });
  s = h.studio.load(s.book.projectId);
  await run({ action: 'APPROVE_STORY', draftId:s.session.workflow.current.draftId });
  let n = 0;
  const asset = (purpose: AssetManifest['purpose']): AssetManifest => ({ assetId:`qa-art-${++n}`, projectId:s.book.projectId, sha256:'a'.repeat(64), mime:'image/png', bytes:100, width:2400, height:2400, classification:'PUBLIC_SYNTHETIC', purpose, createdAt:'now' });
  const add = async (kind: 'CHARACTER_SHEET'|'COVER'|'PAGE', extra: Record<string,string>={}) => {
    s = await h.studio.addSelectedAssets({projectId:s.book.projectId,expectedBook:s.book.recordVersion,kind,...extra}, [asset(kind)]);
    return s.images.at(-1)!.imageId;
  };
  for (const identity of s.identities) { await run({action:'IDENTITY',identity:{...identity,approvedProfile:true}}); const id=await add('CHARACTER_SHEET',{characterId:identity.characterId}); await run({action:'IMAGE_DECISION',imageId:id,choice:'APPROVE'}); }
  const cover = await add('COVER'); await run({action:'IMAGE_DECISION',imageId:cover,choice:'APPROVE'});
  for (const page of s.session.workflow.drafts.at(-1)!.editions[0]!.pages) {const id = await add('PAGE',{pageId:page.pageId}); await run({action:'IMAGE_DECISION',imageId:id,choice:'APPROVE'});}
  await run({action:'AUTO_LAYOUT',mode:'ar-EG'});
  await run({action:'APPROVE_BOOK'});
  return {h,run,add,get snapshot(){return s;}};
}

test('QA guided recognition retains selected events even for a cloth premise', async () => {
  const h = harness();
  try {
    const base = input(h);
    const s = await h.studio.create({...base,bookIntent:{...base.bookIntent,path:{mode:'GUIDED',key:'RECOGNITION',steps:[]}}});
    const requested = h.studio.defaults(7,'bedtime','SLEEP','ar-EG').paths.find(p=>p.key==='RECOGNITION')!;
    assert.deepEqual(s.scenes.map(p=>p.intent), requested.steps, 'GUIDED selection cannot silently become cloth discovery');
  } finally {h.repo.close();}
});

test('QA length control changes canonical automatic writer page count', async () => {
  const counts:number[] = [];
  for (const length of ['SHORT','LONG'] as const) {
    const h=harness();
    try {const base=input(h,42); const s=await h.studio.create({...base,bookIntent:{...base.bookIntent,length}}); const ready=await h.studio.command({action:'PREPARE_WRITER',projectId:s.book.projectId,expectedBook:s.book.recordVersion}); counts.push(ready.session.workflow.blueprints.at(-1)!.pagePlan.length);}finally{h.repo.close();}
  }
  assert.ok(counts[1]! > counts[0]!, `SHORT and LONG must differ: ${counts}`);
});

test('QA new approved page version invalidates an already approved layout', async () => {
  const b=await readyBook();
  try {
    const pageId=b.snapshot.layout!.pages[1]!.pageId;
    const imageId=await b.add('PAGE',{pageId});
    await b.run({action:'IMAGE_DECISION',imageId,choice:'APPROVE'});
    await assert.rejects(b.h.studio.exportModel(b.snapshot.book.projectId,b.snapshot.book.recordVersion));
    assert.equal(b.snapshot.approved,false,'book must review selection change');
  }finally{b.h.repo.close();}
});

test('QA USE retains approval and selects a requested older version', async () => {
  const b=await readyBook();
  try {
    const first=b.snapshot.layout!.pages[1]!;
    const newId=await b.add('PAGE',{pageId:first.pageId});
    await b.run({action:'IMAGE_DECISION',imageId:newId,choice:'APPROVE'});
    await b.run({action:'IMAGE_DECISION',imageId:first.imageId,choice:'USE'});
    await b.run({action:'AUTO_LAYOUT',mode:'ar-EG'});
    assert.equal(b.snapshot.layout!.pages[1]!.imageId,first.imageId,'USE must select the requested image rather than newest created');
    assert.equal(b.snapshot.images.find(i=>i.imageId===first.imageId)!.status,'APPROVED','using accepted artwork must not discard approval');
  }finally{b.h.repo.close();}
});

test('QA stale image USE fails in the service boundary', async () => {
  const b=await readyBook();
  try {
    const imageId=b.snapshot.layout!.pages[1]!.imageId;
    await b.run({action:'STYLE',description:'قصاصات ورق بألوان جديدة'});
    assert.equal(b.snapshot.images.find(i=>i.imageId===imageId)!.stale,true);
    await assert.rejects(b.run({action:'IMAGE_DECISION',imageId,choice:'USE'}), /قديمة|تغير|stale/);
  }finally{b.h.repo.close();}
});

test('QA an ancestor junction cannot route private asset storage into forbidden source', async (t) => {
  const root=await mkdtemp(join(tmpdir(),'hekayti-qa-junction-'));
  try {
    const forbidden=join(root,'source'); await mkdir(forbidden);
    const alias=join(root,'alias');
    try {await symlink(forbidden,alias,'junction');}catch(e){if(['EPERM','EACCES'].includes((e as NodeJS.ErrnoException).code??'')){t.skip('Host cannot create junctions'); return;}throw e;}
    const selected=join(root,'synthetic.png');
    await writeFile(selected,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY1cAAAAASUVORK5CYII=','base64'));
    const store=new PrivateBookAssetStore(join(alias,'media'),{dimensions:()=>({width:1,height:1})},[forbidden]);
    await assert.rejects(store.importSelected('qa-project',selected,'PHOTO','PUBLIC_SYNTHETIC'), /source|path|link|root|مصدر/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('QA book append failure rolls back source and retained histories', async () => {
  const h=harness();
  try {const s=await h.studio.create(input(h));const before=canonicalJson(h.repo.loadBook(s.book.projectId));assert.throws(()=>h.repo.transaction(()=>{h.repo.saveBook({...s.book,styles:[...s.book.styles,{revisionId:'rollback-style',description:'اختبار'}]},s.book.recordVersion);throw Error('synthetic failure');}),/synthetic failure/);assert.equal(canonicalJson(h.repo.loadBook(s.book.projectId)),before);assert.equal(h.repo.loadLibrary().recordVersion,1);}finally{h.repo.close();}
});

test('QA malicious renderer cannot replace narration or canonical speakers', async () => {
  const b=await readyBook();
  try {const forged=structuredClone(b.snapshot.layout!);forged.pages[1]!.boxes[0]!.text='<img src="file:///C:/private.png">';const before=canonicalJson(b.snapshot.book);await assert.rejects(b.run({action:'SAVE_LAYOUT',layout:forged}),/exact text/);assert.equal(canonicalJson(b.h.repo.loadBook(b.snapshot.book.projectId)),before);}finally{b.h.repo.close();}
});

test('QA creator identity notes reach the manual reference prompt', async () => {
  const h=harness();
  try {
    let s=await h.studio.create(input(h));
    const notes='الملابس قميص أخضر بدون رسومات، والحذاء أحمر.';
    s=await h.studio.command({action:'IDENTITY',projectId:s.book.projectId,expectedBook:s.book.recordVersion,identity:{...s.identities[0]!,creatorNotes:notes,approvedProfile:true}});
    s=await h.studio.command({action:'PROMPT',kind:'CHARACTER_REFERENCE',characterId:s.identities[0]!.characterId,projectId:s.book.projectId,expectedBook:s.book.recordVersion});
    assert.ok(s.text!.includes(notes),'creator-visible notes must affect the generation instructions');
  }finally{h.repo.close();}
});

test('QA ordinary Egyptian negation does not reveal a covered toy', async () => {
  const h=harness();
  try {
    const base=input(h);
    const s=await h.studio.create({...base,bookIntent:{...base.bookIntent,path:{mode:'CUSTOM',steps:['تولين تشوف اللعبة الناعمة تحت القماشة.','تولين ما رفعتش القماشة.','تولين تهدأ.']}}});
    const scene=s.scenes[1]!;
    assert.notEqual(scene.after.find(e=>e.name==='الشيء الناعم المدور')!.visibility,'VISIBLE','negated lifting cannot be physical reveal authority');
    assert.equal(scene.reviewRequired,true,'unsupported negation must be flagged honestly');
  }finally{h.repo.close();}
});

test('QA legacy book load leaves stored canonical history exactly unchanged', async () => {
  const h=harness();
  try {
    const {bookIntent,...legacy}=input(h,42);
    const created=await h.creator.create(legacy);
    const projectId=created.workflow.projectId;
    const oldWorkflow=canonicalJson(h.repo.loadWorkflow(projectId));
    const oldPlanner=canonicalJson(h.repo.loadPlanner(projectId));
    const oldCreator=canonicalJson(h.repo.loadCreator(projectId));
    const oldBook=canonicalJson(h.repo.loadBook(projectId));
    const s=h.studio.load(projectId);
    assert.equal(s.book.assets.length,0);
    assert.equal(s.book.intents.length,0);
    assert.equal(canonicalJson(h.repo.loadWorkflow(projectId)),oldWorkflow);
    assert.equal(canonicalJson(h.repo.loadPlanner(projectId)),oldPlanner);
    assert.equal(canonicalJson(h.repo.loadCreator(projectId)),oldCreator);
    assert.equal(canonicalJson(h.repo.loadBook(projectId)),oldBook);
  }finally{h.repo.close();}
});

test('QA switching back artwork does not silently revive a former final book approval', async () => {
  const b=await readyBook();
  try {
    const old=b.snapshot.layout!.pages[1]!;
    const newer=await b.add('PAGE',{pageId:old.pageId});
    await b.run({action:'IMAGE_DECISION',imageId:newer,choice:'APPROVE'});
    assert.equal(b.snapshot.approved,false);
    await b.run({action:'IMAGE_DECISION',imageId:old.imageId,choice:'USE'});
    assert.equal(b.snapshot.approved,false,'a changed-and-restored selection needs explicit final approval');
    await assert.rejects(b.h.studio.exportModel(b.snapshot.book.projectId,b.snapshot.book.recordVersion));
  }finally{b.h.repo.close();}
});

// Execute the actual main-process handler source with controlled Electron/filesystem asset ports.
// This verifies handler authority only; it is not native decoder/PDF/visual evidence.
async function runtimeHandlers(b: Awaited<ReturnType<typeof readyBook>>, missing:Set<string>) {
  const root=await mkdtemp(join(tmpdir(),'hekayti-qa-runtime-'));
  const fonts=join(root,'dist','fonts'); await mkdir(fonts,{recursive:true});
  await writeFile(join(fonts,'arabic.woff2'),Buffer.from('synthetic-font'));
  await writeFile(join(fonts,'latin.woff2'),Buffer.from('synthetic-font'));
  const handlers=new Map<string,(arg:unknown)=>unknown>();
  const require=createRequire(import.meta.url);
  const names=['@hekayti/contracts','@hekayti/contracts/creator','@hekayti/contracts/book','@hekayti/persistence','@hekayti/core/book','@hekayti/core','@hekayti/export'];
  const modules=Object.fromEntries(await Promise.all(names.map(async name=>[name,await import(name)])));
  class ControlledAssets {
    async read(ref:AssetManifest){return missing.has(ref.assetId)?null:Buffer.from('synthetic image');}
    async preview(){throw Error('Rendering is outside this handler test');}
  }
  modules['@hekayti/persistence']={...modules['@hekayti/persistence'],PrivateBookAssetStore:ControlledAssets};
  const electron={app:{getPath:()=>join(root,'user-data'),getAppPath:()=>join(root,'source')},clipboard:{writeText:()=>{}},nativeImage:{},dialog:{},BrowserWindow:class{}};
  const compiled=transformSync(readFileSync('apps/desktop/src/book-runtime.ts','utf8'),{loader:'ts',format:'cjs',target:'es2022'}).code;
  const exposed:Record<string,Function>={};
  const module={exports:exposed};
  new Function('require','exports','module',compiled)((name:string)=>name==='electron'?electron:modules[name]??require(name),exposed,module);
  module.exports.installBookRuntime!(b.h.repo,b.h.creator,undefined,undefined,{},(name:string,fn:(arg:unknown)=>unknown)=>handlers.set(name,fn),join(root,'dist'));
  return {handlers,dispose:()=>rm(root,{recursive:true,force:true})};
}

test('QA main-process exact sheet preflight blocks missing authority but allows a newly selected replacement', async () => {
  const b=await readyBook();
  const missing=new Set<string>();
  const runtime=await runtimeHandlers(b,missing);
  try {
    const old=b.snapshot.images.find(i=>i.kind==='CHARACTER_SHEET')!;
    const pageId=b.snapshot.layout!.pages[1]!.pageId;
    await b.run({action:'PROMPT',kind:'PAGE',pageId});
    const promptId=b.snapshot.prompts.at(-1)!.promptId;
    missing.add(old.assetId);
    const command=runtime.handlers.get('studio:command')!;
    await assert.rejects(Promise.resolve(command({action:'COPY_PROMPT',promptId,projectId:b.snapshot.book.projectId,expectedBook:b.snapshot.book.recordVersion})),/غير موجود/);
    await assert.rejects(Promise.resolve(command({action:'APPROVE_BOOK',projectId:b.snapshot.book.projectId,expectedBook:b.snapshot.book.recordVersion})),/غير موجود/);
    const replacement=await b.add('CHARACTER_SHEET',{characterId:old.characterId!});
    await b.run({action:'IMAGE_DECISION',imageId:replacement,choice:'APPROVE'});
    const next=await command({action:'PROMPT',kind:'PAGE',pageId,projectId:b.snapshot.book.projectId,expectedBook:b.snapshot.book.recordVersion}) as BookStudioSnapshot;
    assert.deepEqual(next.prompts.at(-1)!.binding.sheetVersions,[replacement]);
  }finally{await runtime.dispose();b.h.repo.close();}
});
