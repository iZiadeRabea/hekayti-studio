import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {SqliteProjectRepository} from "@hekayti/persistence";
import {StoryWorkflowService} from "@hekayti/core/workflow";
import {StoryPlannerService} from "@hekayti/core/planner";
import {SimpleCreatorService} from "@hekayti/core/creator";
import {BookStudioService, deriveVisualIntent, effectiveScenes} from "@hekayti/core/book";
import {MockStoryConceptProvider} from "@hekayti/core/story";
import {MockStoryDraftProvider} from "@hekayti/core/language";
import {importLibraryBatch, parseLibraryBatch} from "@hekayti/core/creative";
import {canonicalJson} from "@hekayti/core";
import {BookCreateFlow} from "../../apps/desktop/renderer/src/BookCreateFlow";
import {UiLanguageProvider} from "../../apps/desktop/renderer/src/UiLanguage";
import type {BookStudioSnapshot, ScenePage} from "@hekayti/contracts/book";
const a={pageId:"a",narration:"الطفل يلاحظ طرف الشكل.",dialogue:[],altText:"طرف مدور ظاهر من تحت قماشة مألوفة، والطفل ينظر بدعم مألوف."};
const b={pageId:"b",narration:"الشخص المألوف يرفع القماشة قليلا.",dialogue:[],altText:"القماشة مرفوعة شوية وجزء أكبر من الشكل ظاهر بدعم مألوف."};
const scene:ScenePage={pageNumber:1,beatId:"beat",creatorStep:0,intent:"اكتشاف",action:"كشف عام",before:[],after:[],reviewRequired:false};
test("partial current state and declared uncovering remain distinct; future reveal is only a negative lock",()=>{
  const first=deriveVisualIntent(a,1,"draft","plan",scene,undefined,b),second=deriveVisualIntent(b,2,"draft","plan",scene,a);
  assert.equal(first.sceneReview!.visibility,"PARTIAL");assert.equal(second.sceneReview!.visibility,"PARTIAL");
  assert.match(first.sceneReview!.mustNotShow.join(" "),/لا تعرض الشيء كاملًا/);
  assert.match(first.sceneReview!.mustNotShow.join(" "),/للصفحة التالية/);
  assert.equal(first.sceneReview!.mustShow[0],a.altText);assert.equal(second.sceneReview!.before,a.altText);
  assert.notEqual(first.sceneReview!.after,second.sceneReview!.after);
  assert.doesNotMatch(first.continuity.join(" "),/VISIBLE/);
});
test("negation and unspecified uncovering do not manufacture full visibility; repeated/unsupported changes request review",()=>{
  for(const altText of ["الطفل لا يرفع القماشة.","الشخص المألوف يرفع القماشة."]){const v=deriveVisualIntent({...a,altText,narration:altText},1,"draft","plan",scene);assert.equal(v.sceneReview!.visibility,"UNKNOWN");assert.equal(v.reviewRequired,true);}
  assert.ok(deriveVisualIntent(a,2,"draft","plan",scene,a).sceneReview!.warnings.some(w=>w.includes("مكرر")));
  const full={...b,altText:"الشكل ظاهر بالكامل تحت القماشة.",narration:"الطفل ينظر."};
  assert.ok(deriveVisualIntent(full,2,"draft","plan",scene,a).sceneReview!.warnings.some(w=>w.includes("كشف مبكر")));
  const deniedNext={...b,narration:"لا يرفع القماشة.",altText:"القماشة لا ترتفع."};
  assert.ok(!deriveVisualIntent(a,1,"draft","plan",scene,undefined,deniedNext).sceneReview!.mustNotShow.some(w=>w.includes("للصفحة التالية")));
});
test("several canonical pages sharing one beat never inherit its completed end-state",()=>{
  const before=[{entityId:"object",kind:"PROP",name:"الشكل",location:"الغرفة",visibility:"PARTIAL",heldBy:null,coveredBy:null,state:"طرف ظاهر"}];
  const raw={...scene,before,after:[{...before[0],visibility:"VISIBLE",state:"ظاهر بالكامل"}]};
  const pages=[a,b];const draft={draftId:"draft",sourceRevision:"source",conceptId:"plan-concept",editions:[{mode:"ar-EG",pages}]};
  const result=effectiveScenes({intents:[{planRevisionId:"plan",scenes:[raw]}]} as never,{drafts:[draft],blueprints:[{revisionId:"bp",pagePlan:[{beatIds:["beat"]},{beatIds:["beat"]}]}],current:{draftId:"draft",blueprintRevisionId:"bp"}} as never,{currentPlanRevisionId:"plan"} as never,"ar-EG");
  assert.equal(result.length,2);for(const p of result){assert.equal(p.reviewRequired,true);assert.equal(p.after[0]!.visibility,"UNKNOWN");assert.doesNotMatch(p.after[0]!.state,/ظاهر بالكامل/);}
  assert.deepEqual(result[1]!.before,result[0]!.after);
});
test("Egyptian negation and ambiguous adjacent subjects require review, never full reveal",()=>{
  for(const altText of ["الشكل ما ظهرش بالكامل تحت القماشة.","الشخص ظاهر بالكامل بجانب لعبة تحت قماشة.","الشخص ظاهر بالكامل واللعبة تحت قماشة.","الطفل ظاهر بالكامل. اللعبة مغطاة تحت القماشة."]){
    const v=deriveVisualIntent({...a,altText,narration:altText},1,"draft","plan",scene);
    assert.equal(v.sceneReview!.visibility,"UNKNOWN");assert.equal(v.reviewRequired,true);assert.ok(v.sceneReview!.warnings.length);
  }
});
test("current narration and dialogue suppress contradictory final prop ledger even with a generic alt",()=>{
  const prop={entityId:"toy",kind:"PROP" as const,name:"اللعبة",location:"الغرفة",visibility:"VISIBLE" as const,heldBy:null,coveredBy:null,state:"مكشوفة بالكامل"};
  for(const page of [{...a,altText:"غرفة مألوفة.",narration:"الطفل يشوف طرف اللعبة ظاهر من تحت القماشة."},{...a,altText:"غرفة مألوفة.",narration:"الطفل ينظر.",dialogue:[{speakerId:"child",text:"طرف اللعبة ظاهر من تحت القماشة."}]}]){
    const v=deriveVisualIntent(page,1,"draft","plan",{...scene,before:[{...prop,visibility:"PARTIAL"}],after:[prop]});
    assert.equal(v.sceneReview!.visibility,"UNKNOWN");assert.equal(v.reviewRequired,true);
    assert.doesNotMatch([...v.continuity,...v.stateChange,...v.sceneReview!.locks].join(" "),/مكشوفة بالكامل|VISIBLE/);
  }
});
test("missing canonical beat mapping cannot borrow the final scene action or completed state",()=>{
  const prop={entityId:"toy",kind:"PROP" as const,name:"اللعبة",location:"الغرفة",visibility:"PARTIAL" as const,heldBy:null,coveredBy:null,state:"طرف ظاهر"};
  const raw={...scene,intent:"النهاية المكشوفة",action:"كشف كامل",before:[prop],after:[{...prop,visibility:"VISIBLE",state:"مكشوفة بالكامل"}]};
  const draft={draftId:"draft",sourceRevision:"source",conceptId:"plan-concept",editions:[{mode:"ar-EG",pages:[a]}]};
  const result=effectiveScenes({intents:[{planRevisionId:"plan",scenes:[raw]}]} as never,{drafts:[draft],blueprints:[{revisionId:"bp",pagePlan:[{beatIds:["missing"]}]}],current:{draftId:"draft",blueprintRevisionId:"bp"}} as never,{currentPlanRevisionId:"plan"} as never,"ar-EG");
  assert.equal(result[0]!.reviewRequired,true);assert.equal(result[0]!.after[0]!.visibility,"UNKNOWN");
  assert.doesNotMatch(JSON.stringify(result[0]),/مكشوفة بالكامل|كشف كامل|النهاية المكشوفة/);
  assert.equal(result[0]!.action,a.narration);
});
function services(path:string){const repo=new SqliteProjectRepository(path);let i=0;const seam={id:()=>`flow-${++i}`,now:()=>"2026-10-13T00:00:00Z"};const workflow=new StoryWorkflowService(repo,new MockStoryConceptProvider(),new MockStoryDraftProvider(),seam);const planner=new StoryPlannerService(repo,workflow,seam,"planner-quality/1.1");const creator=new SimpleCreatorService(repo,workflow,planner,seam);const studio=new BookStudioService(repo,creator,workflow,planner,seam,async()=>"f".repeat(64));return {repo,creator,studio};}
test("custom definite caregiver lifting is not assigned to an infant or its physical state",async()=>{
  const h=services(join(mkdtempSync(join(tmpdir(),"hekayti-story-flow-caregiver-")),"synthetic.sqlite"));
  try {
    importLibraryBatch(h.repo,parseLibraryBatch(readFileSync("examples/starter-library/starter-library.jsonl","utf8").split(/\r?\n/).filter(Boolean).slice(0,26).join("\n")),0,"synthetic","now");
    let s=await h.studio.create({agePreset:"UNDER_ONE",exactAgeMonths:9,category:"everyday-life",goalPreset:"SLEEP",fictionalName:"نور",primaryLanguageMode:"ar-EG",provisionalAcknowledged:true,expectedLibrary:h.repo.loadLibrary().recordVersion,bookIntent:{idea:{source:"CUSTOM",text:"لعبة ناعمة تحت قماشة بدعم مألوف."},path:{mode:"CUSTOM",steps:["الطفل يشوف طرف اللعبة.","الشخص المألوف يرفع القماشة قليلًا.","الطفل يهدأ."]},length:"SHORT"}});
    s=await h.studio.command({action:"PREPARE_WRITER",projectId:s.book.projectId,expectedBook:s.book.recordVersion});
    const plan=s.session.planner.plans.find(p=>p.revisionId===s.session.planner.currentPlanRevisionId)!;
    assert.equal(plan.beats[1]!.actorId,null);assert.equal(plan.beats[1]!.action,"reveal");
    const child=s.scenes[1]!.after.find(e=>e.kind==="CHARACTER")!;
    assert.equal(child.state,s.scenes[1]!.before.find(e=>e.entityId===child.entityId)!.state);
    assert.doesNotMatch(child.state,/يرفع القماشة/);
  } finally {h.repo.close();}
});
test("quick infant writer validation/import/explicit approval/page prompts and history survive real SQLite reopen",async()=>{
  const path=join(mkdtempSync(join(tmpdir(),"hekayti-story-flow-test-")),"synthetic.sqlite");let h=services(path);
  importLibraryBatch(h.repo,parseLibraryBatch(readFileSync("examples/starter-library/starter-library.jsonl","utf8").split(/\r?\n/).filter(Boolean).slice(0,26).join("\n")),0,"synthetic","now");
  let s=await h.studio.create({agePreset:"UNDER_ONE",exactAgeMonths:7,category:"bedtime",goalPreset:"SLEEP",fictionalName:"نور",primaryLanguageMode:"ar-EG",provisionalAcknowledged:true,expectedLibrary:h.repo.loadLibrary().recordVersion,bookIntent:{idea:{source:"CUSTOM",text:"شيء ناعم مألوف يُرى جزء منه تحت قماشة، يكشفه شخص مألوف قليلا ثم يهدأ الطفل."},path:{mode:"AUTO",steps:[]},length:"SHORT"}});
  const run=async(c:object)=>{try{return s=await h.studio.command({...c,projectId:s.book.projectId,expectedBook:s.book.recordVersion} as never);}catch(e){throw Error(`Synthetic action ${JSON.stringify(c)}: ${(e as {code?:string;message?:string}).code} ${(e as Error).message}`);}};
  await run({action:"PREPARE_WRITER"});const pkg=s.session.package!;
  const plan=s.session.planner.plans.find(p=>p.revisionId===s.session.planner.currentPlanRevisionId)!;
  assert.equal(plan.beats[2]!.action,"reveal");assert.equal(plan.beats[2]!.actorId,null);
  assert.ok(s.scenes[2]!.action.includes("شخص مألوف"));
  assert.equal(s.scenes[2]!.after.find(e=>e.kind==="PROP")!.visibility,"PARTIAL");
  assert.ok(s.scenes[2]!.after.find(e=>e.kind==="PROP")!.coveredBy);
  assert.ok(s.scenes.every(p=>p.after.filter(e=>e.kind==="PROP" && e.name.includes("الشيء")).every(e=>e.visibility==="PARTIAL")));
  const response={schemaVersion:"writer-response/1.0",editions:[{mode:"ar-EG",pages:[a,b,{...a,narration:"الشخص المألوف يظل بجانب الطفل.",altText:"الشخص المألوف بجانب الطفل والشيء ثابت كما ظهر."},{...a,narration:"الطفل يهدأ في حضن مألوف.",altText:"الطفل مستريح مع الشخص المألوف."}].map((p,i)=>({pageNumber:i+1,narration:p.narration,dialogue:[],altText:p.altText}))}]};
  const binding={projectId:s.book.projectId,packageId:pkg.packageId,expectedPlanner:s.session.planner.recordVersion,expectedWorkflow:s.session.workflow.recordVersion};
  await assert.rejects(h.creator.command({...binding,action:"IMPORT",json:"{}"}));
  await h.creator.command({...binding,action:"PREVIEW",json:JSON.stringify(response)});
  await h.creator.command({...binding,action:"IMPORT",json:JSON.stringify(response)});s=h.studio.load(s.book.projectId);
  assert.equal(s.session.workflow.drafts.at(-1)!.editions[0]!.pages.length,4);
  assert.equal(s.session.workflow.current.approvalId,null);await run({action:"APPROVE_STORY",draftId:s.session.workflow.current.draftId});
  await run({action:"IDENTITY",identity:{...s.identities[0]!,approvedProfile:true}});
  s=await h.studio.addSelectedAssets({projectId:s.book.projectId,expectedBook:s.book.recordVersion,kind:"CHARACTER_SHEET",characterId:s.identities[0]!.characterId},[{assetId:"sheet",projectId:s.book.projectId,sha256:"a".repeat(64),mime:"image/png",bytes:100,width:1200,height:1200,classification:"PUBLIC_SYNTHETIC",purpose:"CHARACTER_SHEET",createdAt:"now"}]);
  await run({action:"IMAGE_DECISION",imageId:s.images.at(-1)!.imageId,choice:"APPROVE",notes:"synthetic"});
  const pages=s.session.workflow.drafts.at(-1)!.editions[0]!.pages;
  await run({action:"PROMPT",kind:"PAGE",pageId:pages[0]!.pageId});const first=s.text!;
  await run({action:"PROMPT",kind:"PAGE",pageId:pages[1]!.pageId});
  assert.match(first,/MUST SHOW NOW/);assert.match(first,/MUST NOT SHOW YET/);assert.match(first,/PARTIAL/);assert.match(first,/لا تعرض الشيء كاملًا/);assert.notEqual(first,s.text);
  const saved=canonicalJson(s.book),workflow=canonicalJson(s.session.workflow),project=s.book.projectId;h.repo.close();h=services(path);s=h.studio.load(project);
  assert.equal(canonicalJson(s.book),saved);assert.equal(canonicalJson(s.session.workflow),workflow);assert.equal(s.images[0]!.status,"APPROVED");h.repo.close();
});
test("Quick creation initially displays only screen1 essentials and preserves explicit Advanced entry",()=>{
  const html=renderToStaticMarkup(createElement(UiLanguageProvider,{children:createElement(BookCreateFlow,{simple:{agePresets:[],goalPresets:[],library:{recordVersion:0}} as never,choices:null,busy:false,onChoices:()=>{},onCreate:()=>{}})}));
  assert.match(html,/إنشاء سريع/);assert.match(html,/تخصيص متقدم/);assert.match(html,/اسم الطفل أو البطل/);assert.doesNotMatch(html,/8\. مكان/);assert.match(html,/راجع الفكرة/);
});
