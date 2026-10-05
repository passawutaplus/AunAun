import { DEFAULT_COLS, L, S, SEED, id, svg, defaultProjects } from "./modules/core.js";
import { stripImageMetadata } from "./modules/image-sanitize.js";
import { startImagePrivacy } from "./modules/image-privacy.js";
import { loadEngine } from "./modules/engine/client.js";
import { POLICY_VERSION, consentToggleMarkup, isGranted, writeConsent } from "./modules/consent.js";
import { pickFromPast } from "./modules/engine/serendipity.js";
import { TRASH_DAYS, daysLeft, trashAdd, trashPurge, trashRemove } from "./modules/engine/trash.js";
import { LONG_PRESS_MS, ambientColor, continueStripMarkup, copyText as copyHexText, pickColorAt, paletteList, paletteStripMarkup, readBw, selectedTagsQuery, viewerToolsMarkup, writeBw } from "./modules/viewer-tools.js";
import { connectorPath, boardsUsingItem, createBlankMoodboard, createMoodboardFromSelection, extractMoodboardsFromProjects, linkMoodboardToProject, MOODBOARD_SELECT_MAX, MOODBOARD_SELECT_MIN, MOODBOARD_SOFT_LIMIT, normalizeMoodboard, normalizeMoodboardObject, normalizeMoodboards, removeItemFromAllBoards, trackMoodboardEvent, clampMoodboardSize, normalizeHex, objectGroupId } from "./modules/moodboard-model.js";
import { packSmartGrid, reflowBoardObjects } from "./modules/smart-grid.js";
import { createMoodboardHistory, snapshotBoard } from "./modules/moodboard-history.js";
import { createMoodboardAutosave, saveStatusLabel } from "./modules/moodboard-autosave.js";
import { moodboardCardsMarkup as moodboardCardsMarkupMod, moodboardCover as moodboardCoverMod, createMoodboardDialogMarkup, linkProjectDialogMarkup, moodboardListMarkup, moodboardVaultPickerMarkup, moodboardColorChooserMarkup } from "./modules/moodboard-ui.js";
import { createVaultRemote } from "./modules/supabase-adapter.js";
import { createDiscoverState, discoverDetailMarkup, discoverEnabled, discoverGridMarkup, discoverMediaUrl, discoverSaveDialogMarkup, discoverReportDialogMarkup, submitDiscoverReport, discoverSearchMarkup, discoverSimilarStripMarkup, discoverToVaultItem, fetchDiscoverItem, fetchDiscoverPage, fetchDiscoverPool, hexToHsv, hsvToHex, normalizeFacet, normalizeHex as normalizeDiscoverHex, readPendingAction, writePendingAction } from "./modules/discover.js";
import { MAX_SEARCH_COLORS, analyzeImageFile, rankSimilar, similarRef, similarityScore } from "./modules/discover-search.js";
import { clamp, esc, escA, host, load, save } from "./modules/utils.js";
import { initScrollBlur } from "./modules/scroll-blur.js";
import { hasThai, thaiConcepts } from "./modules/thai-search.js";
import { moodboardExportHtml } from "./modules/moodboard-export.js";
import { HOWTO, bindHowto, howtoMarkup } from "./modules/howto.js";
import { activeNote, addNote, clearQuickNote, pinToActiveNote, quickNoteHasContent, quickNoteMarkup, quickNoteOpen, readNoteStore, removeActiveNote, setActiveNote, setQuickNoteOpen, unpinFromActiveNote, writeQuickNote } from "./modules/quick-note.js";
import { discoverKeepTargetMenuMarkup, markDiscoverSeen, signalItem, setDiscoverGuest, setDiscoverKeepTargetLabel } from "./modules/discover.js";
import { isTypingTarget, shortcutsDialogMarkup, shortcutsListMarkup } from "./modules/shortcuts.js";
import { SAVED_WINDOWS, buildSuggestions, itemMatchesOperators, parseOperators, savedWithin, sourceHost, suggestionQuery, suggestionsMarkup, topSources } from "./modules/search-tools.js";
import { USAGE_RIGHTS, setUsageRightsMode, usageRights, usageRightsCardBadge, usageRightsDetailMarkup } from "./modules/usage-rights.js";
import { allBoards as allProjectBoards, availableBoardsForProject, availableCollectionsForProject, boardRef, cloneBoardToProject, explicitProjectCollectionIds, projectCollectionPickerDialog, projectLinkedCollectionsMarkup, projectMetaIconsMarkup, projectMoodboardPickerDialog, projectSettingsDialog, removeBoardFromProject, removeCollectionFromProject, updateProjectDetails } from "./modules/project-workspace.js";
import { bindCollectionDrag as bindSidebarCollectionDrag } from "./modules/sidebar-dnd.js";
import { computeDashboardStats, computeKeepActivity, keepActivityMarkup, profileCollectionsCardMarkup, profileProjectsCardMarkup, profileRecentMarkup, settingsOverviewMarkup } from "./modules/user-dashboard.js";
import { adminSettingsMarkup, feedbackSettingsMarkup, isVaultSuperAdmin } from "./modules/settings-ops.js";
import { initPwa } from "./modules/pwa.js";
/* State shared by search + viewer (declared up here: the first render runs before the helper blocks below). */
const TOP_OF_MIND_MAX=5;
const OPENED_KEY="aplus-vault-opened";
const TRASH_KEY="aplus-vault-trash";
let ENGINE=null,engineKick=false,engineParseCache=new Map();
let VIEWER={bw:readBw(),grid:false,pinned:[],excluded:[],trail:[],mode:"similar",fromContinue:false,suppressClick:false,strip:{id:"",offset:0,done:true,busy:false,items:[]}};
/* constants used by the first render live up here to avoid TDZ errors on direct page loads */
const SETTINGS_SECTIONS=[["overview","Overview"],["profile","Profile"],["appearance","Appearance"],["extension","Extension"],["search","Search & rights"],["shortcuts","Shortcuts"],["security","Sign-in & security"],["privacy","Privacy & Legal"],["storage","Storage"]];
const FAVORITE_STYLE_PRESETS=["minimal","branding","editorial","packaging","typography","illustration","photography","retro","luxury","playful","organic","brutalist","japanese","thai"];
const SMART_KEY="aplus-vault-saved-searches",SMART_FIELDS=["q","filterKeyword","filterHex","filterRights","filterSource","filterSince","filterColor","filterStyle","filterCategory"];
const KEEP_TARGET_KEY="aplus-vault-keep-target";
const RESURFACE_KEY="aplus-vault-resurface-hidden";
const GUEST_EXPLAIN={vault:1,collections:1,projects:1,moodboards:1};
const HOWTO_TITLE={vault:"How My Vault works",collections:"How Collections work"};
const GUEST_COPY={
  vault:{eyebrow:"My Vault",title:"Everything you keep,<br>in one calm place.",th:"คลังแรงบันดาลใจส่วนตัวของคุณ",body:"Save from any site with one click. Every reference keeps its source and credit, and you sort it later — by collection, color, or a few words in Thai.",points:["One-click capture with the Chrome extension","Search by color, image, or Thai keywords","Private by default — only you can see it"],cta:"Log in to open your Vault"},
  collections:{eyebrow:"Collections",title:"Group references<br>the way you think.",th:"จัดกลุ่มตามธีม ลูกค้า หรือแคมเปญ",body:"Collections gather references by theme, client, or campaign. Nothing is copied — a reference lives once in your Vault and can sit in many collections.",points:["Nest collections as clients and campaigns grow","Choose where + Keep saves, right from Discover","Reorder, pin, and highlight what matters now"],cta:"Log in to build collections"},
  projects:{eyebrow:"Projects",title:"Turn references<br>into a real job.",th:"รวมทุกอย่างของงานหนึ่งชิ้นไว้ที่เดียว",body:"A project brings the collections and moodboards for one client brief together, so direction and references never drift apart.",points:["Link collections and moodboards to a brief","Keep the credit and source with every image","Pick up exactly where you left off"],cta:"Log in to start a project"},
  moodboards:{eyebrow:"Moodboards",title:"From pile<br>to direction.",th:"จากภาพกองโตเป็นทิศทางงาน",body:"Pull references onto a board, add palette and notes, and share a clear direction with your client — without copying a single file.",points:["A smart grid that keeps boards tidy","Palette, text, notes, and connectors","Undo, autosave, and share when you choose"],cta:"Log in to make a moodboard"}
};

const VAULT_GRID_INITIAL=96,VAULT_GRID_STEP=72;
const DESKTOP_TOP_NAV="(min-width:1025px)";
const STUDIO_VIEWS=["vault","collections","projects","project","moodboards","moodboard-edit","board"];
const STUDIO_NAV=[["vault","vault","My Vault","ทุกอย่างที่เก็บไว้ ก่อนจัดเป็นชุด"],["collections","collection","Collections","กลุ่มรูปที่เก็บมา แยกเป็นชุดๆ"],["moodboards","board","Moodboards","บอร์ดวางรูปเพื่อเล่าไอเดีย"],["projects","project","Projects","1 งาน = รวม collections และ moodboards"]];
const WORKSPACE_VIEWS=[["discover","discover","Discover"],["vault","vault","My Vault"],["collections","collections","Collections"]];
let state={user:load(S.user,null),items:normalizeItems(load(S.items,SEED)),cols:ensureCoreCols(normalizeCols(load(S.cols,DEFAULT_COLS))),projects:null,moodboards:normalizeMoodboards(load(S.moodboards,[])),view:isDiscoverPath()?"discover":"vault",discover:createDiscoverState(),authPrompt:null,type:"all",col:"all",q:"",searchOpen:false,profileMenu:false,theme:load(S.theme,"system"),selected:null,selectedIds:[],modal:false,mode:"image",activeProject:"",activeBoard:"",activeMoodboard:null,selectedObject:null,selectedObjectIds:[],leftCollapsed:true,projectExplorerTab:"folders",projectExplorerQ:"",projectExplorerScope:"all",expandedProjectIds:{},projectBrowserQ:"",projectBrowserFilter:"all",rightCollapsed:false,rightWidth:clampRightWidth(load(S.rightWidth,380)),openMenu:null,toast:"",collectionPicker:null,dialog:null,sortBy:"saved_new",sortMenu:false,libraryView:normalizeLibraryView(load(S.libraryView,"medium")),viewMenu:false,filterColor:"all",filterStyle:"all",filterCategory:"all",filterKeyword:"",filterHex:"",loading:null,animateVault:false,pageEnter:false,publicObject:null,drawerAnimating:false,mediaLightbox:null,moodboardSaveStatus:"idle",moodboardSourceCollapsed:true,moodboardInspectorMode:"auto",moodboardZoom:1,moodboardSourceWidth:clamp(Number(load(S.moodboardSourceWidth,280))||280,180,420),moodboardInspectorWidth:clamp(Number(load(S.moodboardInspectorWidth,300))||300,220,440),moodboardTool:"select",moodboardConnectFrom:null,gridRenderLimit:VAULT_GRID_INITIAL,moodboardEditorLoading:false,feedbackRating:null,feedbackMessage:"",feedbackSubmitted:false,adminOverview:null,adminFeedback:[],adminCaptures:[],adminLoading:false,adminError:"",adminLoaded:false};
let moodboardHistory=createMoodboardHistory(50);
let moodboardAutosave=null;
let vaultLoadingTimer=null,vaultEnterTimer=null;
let moodboardEditorUi=null,moodboardEditorLoad=null,extensionPollTimer=null;
const vaultRemote=createVaultRemote(window.APLUS_VAULT_CONFIG||{});
state.projects=normalizeProjects(load(S.projects,[]),state.items);
(function hydrateBoot(){
  let fixed=false;
  state.items=normalizeItems(state.items).map(i=>{if(i.assetUrl&&i.assetUrl.includes("'")){fixed=true;return Object.assign({},i,{assetUrl:i.assetUrl.replace(/'/g,"%27")})}return i});
  let persist=!!state.user;
  if(fixed&&persist)save(S.items,state.items);
  if(ensureDemoProjects()&&persist){
    save(S.projects,state.projects);
  }
  let nextMoodboards=extractMoodboardsFromProjects(state.projects,state.moodboards);
  if(JSON.stringify(nextMoodboards)!==JSON.stringify(state.moodboards)){state.moodboards=nextMoodboards;if(persist)save(S.moodboards,state.moodboards)}
  else state.moodboards=nextMoodboards;
  if(!state.projects.find(p=>p.id===state.activeProject)){
    state.activeProject=state.projects[0]&&state.projects[0].id||"";
    state.activeBoard=(state.projects[0]&&state.projects[0].boards&&state.projects[0].boards[0]&&state.projects[0].boards[0].id)||"";
  }
})();
parseMoodboardRoute();
const app=document.querySelector("#app");
if(/^\/demo(?:\.html)?\/?$/i.test(location.pathname))history.replaceState(null,"",location.origin+"/vault");
normalizeVaultEntry();vaultRemote.consumeAuthCallback?.();startImagePrivacy();trashPurgeNow();importDeepLinkCapture();syncResponsiveViewport();bindResponsiveViewport();applyTheme({instant:true});render();initRemoteSession();startDevAutoRefresh();syncExtensionCaptures(true);syncExtensionCollections(true);broadcastExtensionCollections();setTimeout(broadcastExtensionCollections,3500);startExtensionPolling();startVaultStorageSync();
function startExtensionPolling(){clearInterval(extensionPollTimer);if(document.visibilityState!=="visible")return;extensionPollTimer=setInterval(()=>{if(document.visibilityState==="visible"){syncExtensionCaptures(true);syncExtensionCollections(true)}},15000)}
function onVaultTabVisible(){importDeepLinkCapture();syncExtensionCaptures(true);syncExtensionCollections(true);broadcastExtensionCollections();startExtensionPolling()}
function startVaultStorageSync(){window.addEventListener("storage",e=>{if(!e||!e.key)return;if(e.key===S.items||e.key===S.captures){try{let next=load(S.items,state.items);if(Array.isArray(next)&&next.length){let known=new Set(state.items.map(i=>i.id));let merged=next.filter(i=>i&&i.id&&!known.has(i.id));if(merged.length){state.items=normalizeItems(merged.concat(state.items));state.sortBy="saved_new";toast(merged.length===1?"Saved image imported.":merged.length+" saved images imported.");render();return}}}catch(_){}render()}if(e.key===S.apiToken)syncExtensionCaptures(true)});document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")onVaultTabVisible();else{clearInterval(extensionPollTimer);extensionPollTimer=null}});window.addEventListener("focus",onVaultTabVisible);window.addEventListener("hashchange",()=>{importDeepLinkCapture();if(state.view==="vault")render()})}
function resetVaultGridLimit(){state.gridRenderLimit=VAULT_GRID_INITIAL}
function vaultRenderPreferSoft(opts){opts=opts||{};if(opts.resetGrid)resetVaultGridLimit();if(state.view==="vault"&&softRefreshVaultResults(opts))return;render()}
function preloadMoodboardEditor(){if(!moodboardEditorLoad)moodboardEditorLoad=import("./modules/moodboard-editor-ui.js").then(m=>{moodboardEditorUi=m;return m}).catch(err=>{console.error("Moodboard editor load failed",err);moodboardEditorLoad=null;throw err})}
function ensureMoodboardEditorUi(){if(moodboardEditorUi)return Promise.resolve(moodboardEditorUi);if(!moodboardEditorLoad)preloadMoodboardEditor();return moodboardEditorLoad}
document.addEventListener("click",e=>{let tagBtn=e.target&&e.target.closest?e.target.closest("[data-filter-keyword]"):null;if(tagBtn){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();filterVaultByKeyword(tagBtn.dataset.filterKeyword);return}let removeTag=e.target&&e.target.closest?e.target.closest("[data-remove-keyword]"):null;if(removeTag){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();removeKeywordFromItem(removeTag.dataset.removeKeyword,removeTag.dataset.itemId);return}let colorBtn=e.target&&e.target.closest?e.target.closest("[data-filter-color]"):null;if(colorBtn){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();filterVaultByColor(colorBtn.dataset.filterColor);return}let clearTag=e.target&&e.target.closest?e.target.closest("[data-clear-tag-filter]"):null;if(clearTag){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();clearTagFilters();return}},true);
document.addEventListener("click",e=>{let b=e.target&&e.target.closest?e.target.closest("[data-menucol]"):null;if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();let i=state.items.find(x=>x.id===b.dataset.menucol);if(!i)return;state.selected=i.id;state.rightCollapsed=false;state.collectionPicker=i.id;state.openMenu=null;render()},true);
document.addEventListener("click",e=>{let b=e.target&&e.target.closest?e.target.closest("[data-view='vault']"):null;if(b){state.col="all";state.type="all"}},true);
document.addEventListener("click",e=>{let toggle=e.target&&e.target.closest?e.target.closest("[data-sorttoggle]"):null;if(toggle){e.preventDefault();e.stopPropagation();state.sortMenu=!state.sortMenu;state.viewMenu=false;render();return}let option=e.target&&e.target.closest?e.target.closest("[data-sortby]"):null;if(option){e.preventDefault();e.stopPropagation();state.sortBy=option.dataset.sortby;state.sortMenu=false;vaultRenderPreferSoft({resetGrid:true});return}let color=e.target&&e.target.closest?e.target.closest("[data-filtercolor]"):null;if(color){e.preventDefault();e.stopPropagation();state.filterColor=color.dataset.filtercolor||"all";vaultRenderPreferSoft({resetGrid:true});return}let style=e.target&&e.target.closest?e.target.closest("[data-filterstyle]"):null;if(style){e.preventDefault();e.stopPropagation();state.filterStyle=style.dataset.filterstyle||"all";vaultRenderPreferSoft({resetGrid:true});return}let category=e.target&&e.target.closest?e.target.closest("[data-filtercategory]"):null;if(category){e.preventDefault();e.stopPropagation();state.filterCategory=category.dataset.filtercategory||"all";vaultRenderPreferSoft({resetGrid:true});return}let clear=e.target&&e.target.closest?e.target.closest("[data-clearfilters]"):null;if(clear){e.preventDefault();e.stopPropagation();state.filterColor="all";state.filterStyle="all";state.filterCategory="all";state.filterKeyword="";state.filterHex="";state.filterRights="";state.filterSource="all";state.filterSince="all";vaultRenderPreferSoft({resetGrid:true});return}let viewToggle=e.target&&e.target.closest?e.target.closest("[data-viewtoggle]"):null;if(viewToggle){e.preventDefault();e.stopPropagation();state.viewMenu=!state.viewMenu;state.sortMenu=false;render();return}let viewOpt=e.target&&e.target.closest?e.target.closest("[data-library-view]"):null;if(viewOpt){e.preventDefault();e.stopPropagation();setLibraryView(viewOpt.dataset.libraryView);return}if(state.sortMenu&&e.target&&e.target.closest&&!e.target.closest(".vault-sort")){state.sortMenu=false;render()}if(state.viewMenu&&e.target&&e.target.closest&&!e.target.closest(".vault-view")){state.viewMenu=false;render()}},true);
document.addEventListener("click",e=>{let pin=e.target&&e.target.closest?e.target.closest("[data-pin],[data-menupin]"):null;if(pin){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();togglePin(pin.dataset.pin||pin.dataset.menupin);return}let share=e.target&&e.target.closest?e.target.closest("[data-share-detail]"):null;if(share){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();shareItem(share.dataset.shareDetail);return}let shareCol=e.target&&e.target.closest?e.target.closest("[data-sharecol]"):null;if(shareCol){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();shareCollection(shareCol.dataset.sharecol);return}let delItem=e.target&&e.target.closest?e.target.closest("[data-menudel],[data-del]"):null;if(delItem){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();let itemId=delItem.dataset.menudel||(selected()&&selected().id);let i=state.items.find(x=>x.id===itemId);if(!i)return;openConfirmDialog({title:"Delete object",message:"Delete "+i.title+" from A+ Vault? This object will be removed from the Vault grid and detail panel.",confirmText:"Delete",danger:true,onConfirm:()=>deleteItemById(i.id)});return}let newCol=e.target&&e.target.closest?e.target.closest("[data-newcol]"):null;if(newCol){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openTextDialog({title:"New collection",label:"Collection name",value:"",confirmText:"Create",onSubmit:createCollection});return}let addProjectCol=e.target&&e.target.closest?e.target.closest("[data-addprojectcol]"):null;if(addProjectCol){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openAddProjectCollectionDialog(addProjectCol.dataset.addprojectcol);return}let addProjectBoard=e.target&&e.target.closest?e.target.closest("[data-addprojectboard]"):null;if(addProjectBoard){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openAddProjectMoodboardDialog(addProjectBoard.dataset.addprojectboard);return}let projectSettings=e.target&&e.target.closest?e.target.closest("[data-project-settings]"):null;if(projectSettings){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openProjectSettingsDialog(projectSettings.dataset.projectSettings);return}let unlinkProjCol=e.target&&e.target.closest?e.target.closest("[data-unlink-proj-col]"):null;if(unlinkProjCol){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();let parts=String(unlinkProjCol.dataset.unlinkProjCol||"").split(":"),p=state.projects.find(x=>x.id===parts[0]),c=state.cols.find(x=>x.id===parts[1]);if(!p||!c)return;openConfirmDialog({title:"Remove from project",message:"Remove \""+c.name+"\" from \""+p.name+"\"? The collection stays in My Vault.",confirmText:"Remove from project",onConfirm:()=>unlinkCollectionFromProject(parts[0],parts[1])});return}let unlinkProjBoard=e.target&&e.target.closest?e.target.closest("[data-unlink-proj-board]"):null;if(unlinkProjBoard){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();let parts=String(unlinkProjBoard.dataset.unlinkProjBoard||"").split(":"),p=state.projects.find(x=>x.id===parts[0]),bd=p&&p.boards&&p.boards.find(x=>x.id===parts[1]);if(!p||!bd)return;openConfirmDialog({title:"Remove from project",message:"Remove moodboard \""+bd.name+"\" from \""+p.name+"\"? Vault objects stay in the library.",confirmText:"Remove from project",onConfirm:()=>unlinkBoardFromProject(parts[0],parts[1])});return}let editCol=e.target&&e.target.closest?e.target.closest("[data-editcol]"):null;if(editCol){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();let c=state.cols.find(x=>x.id===editCol.dataset.editcol);if(!c||c.system)return;openTextDialog({title:"Rename collection",label:"Collection name",value:c.name,confirmText:"Save",onSubmit:name=>renameCollection(c.id,name)});return}let delCol=e.target&&e.target.closest?e.target.closest("[data-delcol]"):null;if(delCol){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();let c=state.cols.find(x=>x.id===delCol.dataset.delcol);if(!c||c.system)return;openConfirmDialog({title:"Delete collection",message:"Delete "+c.name+"? Items will stay safely in My Vault.",confirmText:"Delete",danger:true,onConfirm:()=>deleteCollectionById(c.id)});return}let newProject=e.target&&e.target.closest?e.target.closest("[data-newproject]"):null;if(newProject){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openTextDialog({title:"New project",label:"Project name",value:"",confirmText:"Create",onSubmit:createProject});return}let newBoard=e.target&&e.target.closest?e.target.closest("[data-newboard]"):null;if(newBoard){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openTextDialog({title:"New moodboard",label:"Moodboard name",value:"New Moodboard",confirmText:"Create",onSubmit:name=>createBoard(newBoard.dataset.newboard||state.activeProject,name)});return}let pinProject=e.target&&e.target.closest?e.target.closest("[data-pinproject]"):null;if(pinProject){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();togglePinProject(pinProject.dataset.pinproject);return}let pinCol=e.target&&e.target.closest?e.target.closest("[data-pincol]"):null;if(pinCol){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();togglePinCollection(pinCol.dataset.pincol);return}let highlightCol=e.target&&e.target.closest?e.target.closest("[data-highlightcol]"):null;if(highlightCol){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();toggleHighlightCollection(highlightCol.dataset.highlightcol);return}let addHighlight=e.target&&e.target.closest?e.target.closest("[data-add-highlight]"):null;if(addHighlight){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openHighlightPicker();return}let pickHighlight=e.target&&e.target.closest?e.target.closest("[data-pick-highlight]"):null;if(pickHighlight){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();toggleHighlightCollection(pickHighlight.dataset.pickHighlight);return}let editProject=e.target&&e.target.closest?e.target.closest("[data-editproject]"):null;if(editProject){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();let p=state.projects.find(x=>x.id===editProject.dataset.editproject);if(!p)return;openTextDialog({title:"Rename project",label:"Project name",value:p.name,confirmText:"Save",onSubmit:name=>renameProject(p.id,name)});return}let delProject=e.target&&e.target.closest?e.target.closest("[data-delproject]"):null;if(delProject){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();let p=state.projects.find(x=>x.id===delProject.dataset.delproject);if(!p)return;openConfirmDialog({title:"Delete project",message:"Delete "+p.name+"? Collections and Vault objects stay in the library. Moodboards inside this project will be removed.",confirmText:"Delete",danger:true,onConfirm:()=>deleteProject(p.id)});return}let editBoard=e.target&&e.target.closest?e.target.closest("[data-editboard]"):null;if(editBoard){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();let r=boardRef(editBoard.dataset.editboard),p=state.projects.find(x=>x.id===r.projectId),bd=p&&p.boards&&p.boards.find(x=>x.id===r.boardId);if(!bd)return;openTextDialog({title:"Rename moodboard",label:"Moodboard name",value:bd.name,confirmText:"Save",onSubmit:name=>renameBoardRef(editBoard.dataset.editboard,name)});return}let delBoard=e.target&&e.target.closest?e.target.closest("[data-delboard]"):null;if(delBoard){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();let r=boardRef(delBoard.dataset.delboard),p=state.projects.find(x=>x.id===r.projectId),bd=p&&p.boards&&p.boards.find(x=>x.id===r.boardId);if(!bd)return;openConfirmDialog({title:"Delete moodboard",message:"Delete "+bd.name+"? The project will keep its collections and other moodboards.",confirmText:"Delete",danger:true,onConfirm:()=>deleteBoardRef(delBoard.dataset.delboard)});return}},true);
document.addEventListener("click",e=>{let copy=e.target&&e.target.closest?e.target.closest("[data-copy-share]"):null;if(copy){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();copyText(copy.dataset.copyShare);return}let native=e.target&&e.target.closest?e.target.closest("[data-native-share]"):null;if(native){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();nativeShareItem(native.dataset.nativeShare);return}let nativeCol=e.target&&e.target.closest?e.target.closest("[data-native-share-col]"):null;if(nativeCol){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();nativeShareCollection(nativeCol.dataset.nativeShareCol);return}let open=e.target&&e.target.closest?e.target.closest("[data-open-object]"):null;if(open){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();state.dialog=null;state.selected=open.dataset.openObject;state.view="vault";state.rightCollapsed=false;history.replaceState(null,"",objectShareUrl(open.dataset.openObject));render();openSelectedDetail(open.dataset.openObject);return}let openCol=e.target&&e.target.closest?e.target.closest("[data-open-collection]"):null;if(openCol){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();state.dialog=null;syncCollectionDeepLink(openCol.dataset.openCollection);render();return}let pickProjectCol=e.target&&e.target.closest?e.target.closest("[data-pick-project-col]"):null;if(pickProjectCol){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();let parts=String(pickProjectCol.dataset.pickProjectCol||"").split(":");state.dialog=null;addCollectionToProject(parts[0],parts[1]);return}let createProjectCol=e.target&&e.target.closest?e.target.closest("[data-dialog-create-project-col]"):null;if(createProjectCol){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();let projectId=createProjectCol.dataset.dialogCreateProjectCol;state.dialog=null;openTextDialog({title:"Add collection to project",label:"Collection name",value:"",confirmText:"Create & add",onSubmit:name=>createCollectionForProject(projectId,name)});return}let existing=e.target&&e.target.closest?e.target.closest("[data-dialog-open-existing]"):null;if(existing){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();state.selected=existing.dataset.dialogOpenExisting;state.dialog=null;state.modal=false;state.view="vault";state.rightCollapsed=false;render();return}let cancel=e.target&&e.target.closest?e.target.closest("[data-dialog-cancel]"):null;if(cancel){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();state.dialog=null;render();return}let confirm=e.target&&e.target.closest?e.target.closest("[data-dialog-confirm]"):null;if(confirm){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();let d=state.dialog;state.dialog=null;if(d&&d.onConfirm)d.onConfirm();render();return}},true);
document.addEventListener("submit",e=>{let form=e.target&&e.target.closest?e.target.closest("[data-dialog-form]"):null;if(!form)return;e.preventDefault();e.stopPropagation();let d=state.dialog,fd=new FormData(form),value=(fd.get("value")||"").toString().trim();state.dialog=null;if(value&&d&&d.onSubmit)d.onSubmit(value,fd);render()},true);
document.addEventListener("submit",e=>{let form=e.target&&e.target.closest?e.target.closest("[data-project-collection-form]"):null;if(!form)return;e.preventDefault();e.stopPropagation();let d=state.dialog,fd=new FormData(form),projectId=d&&d.projectId;state.dialog=null;submitProjectCollectionPicker(projectId,(fd.get("existingId")||"").toString(),(fd.get("newName")||"").toString().trim());render()},true);
document.addEventListener("submit",e=>{let form=e.target&&e.target.closest?e.target.closest("[data-project-moodboard-form]"):null;if(!form)return;e.preventDefault();e.stopPropagation();let d=state.dialog,fd=new FormData(form),projectId=d&&d.projectId;state.dialog=null;submitProjectMoodboardPicker(projectId,(fd.get("existingRef")||"").toString(),(fd.get("newName")||"").toString().trim());render()},true);
document.addEventListener("submit",e=>{let form=e.target&&e.target.closest?e.target.closest("[data-create-moodboard-form]"):null;if(!form)return;e.preventDefault();e.stopPropagation();let fd=new FormData(form),name=(fd.get("name")||"").toString().trim(),preset=(fd.get("preset")||"balanced").toString();if(!name){toast("Board name is required.");return}submitCreateMoodboard(name,preset)},true);
document.addEventListener("submit",e=>{let form=e.target&&e.target.closest?e.target.closest("[data-link-moodboard-form]"):null;if(!form)return;e.preventDefault();e.stopPropagation();let fd=new FormData(form),boardId=(fd.get("boardId")||"").toString(),projectId=(fd.get("projectId")||"").toString();state.dialog=null;if(!boardId||!projectId)return;state.moodboards=(state.moodboards||[]).map(b=>b.id===boardId?linkMoodboardToProject(b,projectId):b);persistMoodboards();toast("Moodboard linked to project.");render()},true);
document.addEventListener("submit",e=>{let form=e.target&&e.target.closest?e.target.closest("[data-project-settings-form]"):null;if(!form)return;e.preventDefault();e.stopPropagation();let fd=new FormData(form);saveProjectDetails((fd.get("projectId")||"").toString(),{name:(fd.get("name")||"").toString(),description:(fd.get("description")||"").toString()});return},true);
document.addEventListener("submit",e=>{let form=e.target&&e.target.closest?e.target.closest("[data-auth]"):null;if(!form)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();let fd=new FormData(form),submitter=e.submitter&&e.submitter.dataset?e.submitter:null;beginVaultLogin({email:fd.get("email"),password:fd.get("password"),provider:"password",action:submitter&&submitter.dataset.authAction||"login"})},true);
document.addEventListener("click",e=>{let btn=e.target&&e.target.closest?e.target.closest("[data-auth] button"):null;if(!btn)return;let form=btn.closest("[data-auth]");if(!form)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();let fd=new FormData(form);beginVaultLogin({email:fd.get("email"),password:fd.get("password"),provider:"password",action:btn.dataset.authAction||"login"})},true);
document.addEventListener("click",e=>{let b=e.target&&e.target.closest?e.target.closest("[data-google-login]"):null;if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();beginGoogleLogin()},true);
document.addEventListener("click",e=>{let t=e.target&&e.target.closest?e.target:null;if(!t)return;let v=t.closest("[data-view]");if(v){let view=v.dataset.view;if(view==="discover"){closeDiscoverItem();if(location.pathname!=="/")history.replaceState(null,"",location.origin+"/");return}if(!state.user){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(GUEST_EXPLAIN[view]){state.view=view;state.authPrompt=null;state.profileMenu=false;state.searchOpen=false;history.replaceState(null,"",location.origin+(view==="moodboards"?"/moodboards":"/vault"));render();window.scrollTo(0,0);return}requireAuth({type:"view",view});return}if(/^\/(?:discover\/?)?$/.test(location.pathname)&&view!=="moodboards")history.replaceState(null,"",location.origin+"/vault");return}if(!state.user&&t.closest("[data-open],[data-newcol],[data-newproject],[data-col],[data-type],[data-project]")){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();requireAuth(t.closest("[data-open]")?{type:"keep",id:""}:{type:"view",view:"vault"})}},true);
document.addEventListener("click",e=>{let t=e.target&&e.target.closest?e.target:null;if(!t)return;let a;if(t.closest("[data-auth-open]")){e.preventDefault();requireAuth({type:"login"});return}if((a=t.closest("[data-auth-close]"))&&(a.tagName==="BUTTON"||!t.closest("[data-auth-dialog]"))){e.preventDefault();closeAuthPrompt();return}if(state.discover.saveFor){if((a=t.closest("[data-discover-save-to]"))){e.preventDefault();saveDiscoverTo(state.discover.saveFor,a.dataset.discoverSaveTo||null);return}if(t.closest("[data-discover-save-new]")){e.preventDefault();state.discover.saveCreating=true;mountDiscoverSave();return}if((a=t.closest("[data-discover-save-dismiss]"))&&(a.tagName==="BUTTON"||!t.closest("[data-discover-save-dialog]"))){e.preventDefault();closeDiscoverSave();return}if(t.closest("[data-discover-save-dialog]"))return}if((a=t.closest("[data-discover-keep]"))){e.preventDefault();e.stopPropagation();keepDiscoverItem(a.dataset.discoverKeep);return}if((a=t.closest("[data-discover-open]"))){e.preventDefault();openDiscoverItem(a.dataset.discoverOpen);return}if((a=t.closest("[data-discover-step]"))){e.preventDefault();stepDiscoverItem(Number(a.dataset.discoverStep)||0);return}if((a=t.closest("[data-discover-tag]"))){e.preventDefault();setDiscoverFilter({q:a.dataset.discoverTag||""});return}if((a=t.closest("[data-discover-swatch]"))){e.preventDefault();setDiscoverFilter({colors:[a.dataset.discoverSwatch]});return}if((a=t.closest("[data-discover-facet]"))){e.preventDefault();let ds=state.discover;setDiscoverFilter({facets:ds.facets.concat({key:a.dataset.discoverFacet,value:a.dataset.value})});return}if((a=t.closest("[data-discover-similar]"))){e.preventDefault();let item=findDiscoverRow(a.dataset.discoverSimilar)||state.discover.openItem;if(item)setDiscoverFilter({similar:{id:item.id,title:item.title||"Untitled",thumb:discoverMediaUrl(discoverConfig(),item.image_sm_path),ref:similarRef(item)}});return}if((a=t.closest("[data-discover-unset]"))){e.preventDefault();unsetDiscoverFilter(a.dataset.discoverUnset);return}if(t.closest("[data-discover-clear-all]")){e.preventDefault();clearDiscoverFilters();return}if((a=t.closest("[data-discover-close]"))&&(a.tagName==="BUTTON"||!t.closest("[data-discover-dialog]"))){closeDiscoverItem();return}if((a=t.closest("[data-discover-category]"))){setDiscoverFilter({category:a.dataset.discoverCategory});return}if(t.closest("[data-discover-more]")){loadDiscover(false);return}if(t.closest("[data-discover-retry]"))loadDiscover(true)});
document.addEventListener("submit",e=>{let s=e.target&&e.target.closest?e.target.closest("[data-discover-save-form]"):null;if(!s)return;e.preventDefault();createDiscoverCollection(new FormData(s).get("name"))});
document.addEventListener("change",e=>{let t=e.target;if(!t||!t.matches||!t.matches("[data-discover-image]"))return;let file=t.files&&t.files[0];t.value="";if(file)searchDiscoverByImage(file)});
document.addEventListener("submit",e=>{let f=e.target&&e.target.closest?e.target.closest("[data-discover-search]"):null;if(!f)return;e.preventDefault();setDiscoverFilter({q:String(new FormData(f).get("q")||"")})});
let discoverReport=null;function mountDiscoverReport(){document.querySelectorAll(".discover-report-backdrop").forEach(n=>n.remove());let r=discoverReport,host=document.querySelector(".app-shell")||document.body,item=r&&discoverSourceNow(r.id);if(!item){discoverReport=null;return}host.insertAdjacentHTML("beforeend",discoverReportDialogMarkup(item,discoverConfig(),{email:r.email,busy:r.busy,error:r.error,sent:r.sent}));let f=host.querySelector(".discover-report-form");if(f&&r.form){Object.entries(r.form).forEach(([k,v])=>{let el=f.elements[k];if(el&&el.length!==undefined&&!el.tagName)Array.from(el).forEach(o=>o.checked=o.value===v);else if(el)el.value=v});let rc=f.querySelector("input[name=reason]:checked");if(rc)rc.dispatchEvent(new Event("change",{bubbles:true}))}let focus=host.querySelector(r.sent?".discover-report-done button":".discover-report-reason input");if(focus)focus.focus({preventScroll:true})}
function closeDiscoverReport(){discoverReport=null;document.querySelectorAll(".discover-report-backdrop").forEach(n=>n.remove())}
document.addEventListener("click",e=>{let t=e.target&&e.target.closest?e.target:null,a;if(!t)return;if((a=t.closest("[data-discover-report]"))){e.preventDefault();e.stopPropagation();discoverReport={id:a.dataset.discoverReport,email:state.user&&state.user.email||""};mountDiscoverReport();return}if((a=t.closest("[data-discover-report-dismiss]"))&&(a.tagName==="BUTTON"||!t.closest("[data-discover-report-dialog]"))){e.preventDefault();e.stopPropagation();closeDiscoverReport();return}if(t.closest("[data-discover-report-dialog]"))e.stopPropagation()},true);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&discoverReport){e.preventDefault();e.stopImmediatePropagation();closeDiscoverReport()}},true);
document.addEventListener("change",e=>{let f=e.target&&e.target.closest?e.target.closest("[data-discover-report-form]"):null;if(!f||e.target.name!=="reason")return;let h=f.querySelector("[data-discover-report-email-hint]"),c=e.target.value==="copyright";if(h)h.textContent=c?"(required for copyright claims)":"(optional, so we can follow up)";f.elements.email.required=c});
document.addEventListener("submit",async e=>{let f=e.target&&e.target.closest?e.target.closest("[data-discover-report-form]"):null;if(!f||!discoverReport)return;e.preventDefault();e.stopPropagation();let fd=new FormData(f),form={reason:String(fd.get("reason")||""),details:String(fd.get("details")||""),email:String(fd.get("email")||"")},r=discoverReport;Object.assign(r,{form,email:form.email,busy:true,error:""});mountDiscoverReport();try{await submitDiscoverReport(discoverConfig(),{itemId:r.id,reason:form.reason,details:form.details,email:form.email,accessToken:state.user?sessionAccessToken():""});if(discoverReport!==r)return;Object.assign(r,{busy:false,sent:true})}catch(err){if(discoverReport!==r)return;Object.assign(r,{busy:false,error:err&&err.message||"Couldn't send the report."})}mountDiscoverReport()});
document.addEventListener("keydown",e=>{if((e.key==="ArrowLeft"||e.key==="ArrowRight")&&state.discover.openId&&!e.altKey&&!e.metaKey&&!e.ctrlKey&&!(e.target&&e.target.closest&&e.target.closest("input,textarea,select,[contenteditable]"))){e.preventDefault();stepDiscoverItem(e.key==="ArrowLeft"?-1:1);return}if(e.key!=="Escape")return;if(state.discover.saveFor){closeDiscoverSave();return}if(state.discover.colorOpen){closeDiscoverColor();return}if(state.discover.openId){closeDiscoverItem();return}if(state.authPrompt&&!state.user)closeAuthPrompt()});
document.addEventListener("click",e=>{let t=e.target&&e.target.closest?e.target:null;if(!t)return;let ds=state.discover;if(t.closest("[data-discover-color-toggle]")){e.preventDefault();if(ds.colorOpen){closeDiscoverColor();return}ds.picker=hexToHsv(ds.colors[ds.colors.length-1]||"")||{h:0,s:0,v:0};ds.colorOpen=true;renderDiscoverSearch();return}let a;if(t.closest("[data-discover-color-apply]")){e.preventDefault();applyDiscoverColor();return}if(t.closest("[data-discover-color-clear]")){e.preventDefault();setDiscoverFilter({colors:[],tone:null,shape:null,q:discoverSearchText()},{keepPanel:true});return}if((a=t.closest("[data-discover-color-remove]"))){e.preventDefault();let i=Number(a.dataset.discoverColorRemove);setDiscoverFilter({colors:ds.colors.filter((_,j)=>j!==i),q:discoverSearchText()},{keepPanel:true});return}if((a=t.closest("[data-discover-tone]"))){e.preventDefault();let v=a.dataset.discoverTone;setDiscoverFilter({tone:ds.tone===v?null:v,q:discoverSearchText()},{keepPanel:true});return}if((a=t.closest("[data-discover-shape]"))){e.preventDefault();let v=a.dataset.discoverShape;setDiscoverFilter({shape:ds.shape===v?null:v,q:discoverSearchText()},{keepPanel:true});return}if(ds.colorOpen&&!t.closest("[data-discover-color-panel]"))closeDiscoverColor()});
document.addEventListener("pointerdown",e=>{let sv=e.target&&e.target.closest?e.target.closest("[data-discover-color-sv]"):null;if(!sv)return;e.preventDefault();sv.setPointerCapture(e.pointerId);paintDiscoverColor(sv,e.clientX,e.clientY)});
document.addEventListener("pointermove",e=>{let sv=e.target&&e.target.closest?e.target.closest("[data-discover-color-sv]"):null;if(!sv||!sv.hasPointerCapture(e.pointerId))return;paintDiscoverColor(sv,e.clientX,e.clientY)});
document.addEventListener("input",e=>{let t=e.target;if(!t||!t.matches)return;let p=state.discover.picker;if(t.matches("[data-discover-color-hue]")){p.h=Number(t.value)||0;syncDiscoverColorPanel();return}if(t.matches("[data-discover-color-hex]")){let hex=normalizeDiscoverHex(t.value),hsv=hex&&hexToHsv(hex);if(hsv){state.discover.picker=hsv;syncDiscoverColorPanel({keepHex:true})}}});
document.addEventListener("keydown",e=>{let t=e.target;if(!t||!t.matches)return;if(t.matches("[data-discover-color-hex]")&&e.key==="Enter"){e.preventDefault();applyDiscoverColor();return}if(!t.matches("[data-discover-color-sv]"))return;let p=state.discover.picker,step=e.shiftKey?10:4,moved=true;if(e.key==="ArrowLeft")p.s=clamp(p.s-step,0,100);else if(e.key==="ArrowRight")p.s=clamp(p.s+step,0,100);else if(e.key==="ArrowUp")p.v=clamp(p.v+step,0,100);else if(e.key==="ArrowDown")p.v=clamp(p.v-step,0,100);else moved=false;if(moved){e.preventDefault();syncDiscoverColorPanel()}});
function discoverSearchText(){let input=document.querySelector("[data-discover-search] input[name='q']");return input?input.value:state.discover.q}
function renderDiscoverSearch(){let host=document.querySelector(".topbar-spacer.has-discover-search");if(!host){render();return}let q=discoverSearchText();host.innerHTML=discoverSearchMarkup(state.discover);let input=host.querySelector("input[name='q']");if(input)input.value=q}
function closeDiscoverColor(){if(!state.discover.colorOpen)return;state.discover.colorOpen=false;renderDiscoverSearch()}
function paintDiscoverColor(sv,x,y){let r=sv.getBoundingClientRect(),p=state.discover.picker;p.s=clamp((x-r.left)/r.width*100,0,100);p.v=clamp((1-(y-r.top)/r.height)*100,0,100);syncDiscoverColorPanel()}
function syncDiscoverColorPanel(opts){let p=state.discover.picker,hex=hsvToHex(p.h,p.s,p.v),panel=document.querySelector("[data-discover-color-panel]");if(!panel)return;let sv=panel.querySelector("[data-discover-color-sv]"),thumb=panel.querySelector("[data-discover-color-thumb]"),preview=panel.querySelector("[data-discover-color-preview]"),hue=panel.querySelector("[data-discover-color-hue]"),hexInput=panel.querySelector("[data-discover-color-hex]");if(sv){sv.style.backgroundColor="hsl("+Math.round(p.h)+" 100% 50%)";sv.setAttribute("aria-valuenow",String(Math.round(p.s)))}if(thumb){thumb.style.left=p.s+"%";thumb.style.top=(100-p.v)+"%";thumb.style.background=hex}if(preview)preview.style.background=hex;if(hue&&document.activeElement!==hue)hue.value=String(Math.round(p.h));if(hexInput&&!(opts&&opts.keepHex))hexInput.value=hex}
function applyDiscoverColor(){let ds=state.discover,p=ds.picker,input=document.querySelector("[data-discover-color-hex]"),hex=normalizeDiscoverHex(input&&input.value)||hsvToHex(p.h,p.s,p.v);if(ds.colors.length>=MAX_SEARCH_COLORS)return;setDiscoverFilter({colors:ds.colors.concat(hex),q:discoverSearchText()},{keepPanel:true})}
function unsetDiscoverFilter(key){let ds=state.discover,[kind,idx]=String(key).split(":"),i=Number(idx);if(kind==="q")return setDiscoverFilter({q:""});if(kind==="category")return setDiscoverFilter({category:"all"});if(kind==="similar")return setDiscoverFilter({similar:null});if(kind==="tone")return setDiscoverFilter({tone:null});if(kind==="shape")return setDiscoverFilter({shape:null});if(kind==="color")return setDiscoverFilter({colors:ds.colors.filter((_,j)=>j!==i)});if(kind==="facet")return setDiscoverFilter({facets:ds.facets.filter((_,j)=>j!==i)})}
function clearDiscoverFilters(){setDiscoverFilter({q:"",category:"all",colors:[],tone:null,shape:null,facets:[],similar:null})}
async function discoverPool(){let ds=state.discover;if(!ds.pool)ds.pool=fetchDiscoverPool(discoverConfig()).then(rows=>{ds.poolRows=rows;return rows}).catch(err=>{ds.pool=null;throw err});return ds.pool}
async function fillDiscoverSimilarLocal(item){let host=document.querySelector("[data-discover-similar-host]");if(!host)return;try{let pool=await discoverPool(),seen=new Set(),rows=state.discover.items.concat(pool).filter(r=>!seen.has(r.id)&&seen.add(r.id)),top=rankSimilar(similarRef(item),rows,8);if(state.discover.openId!==item.id)return;host=document.querySelector("[data-discover-similar-host]");if(host)host.innerHTML=discoverSimilarStripMarkup(top,discoverConfig())}catch(err){console.warn("A+ Vault similar failed",err);if(host.isConnected)host.innerHTML="<span class='discover-similar-loading'>Similar images are unavailable right now.</span>"}}
function findDiscoverRow(id){let ds=state.discover;return ds.items.find(i=>i.id===id)||(ds.poolRows||[]).find(i=>i.id===id)||null}
async function searchDiscoverByImage(file){try{toast("Analyzing image on this device…");let a=await analyzeImageFile(file);setDiscoverFilter({similar:{id:null,title:a.title,thumb:a.thumb,ref:a.ref}})}catch(err){toast(err&&err.message?err.message:"This image could not be read.")}}
function discoverConfig(){return window.APLUS_VAULT_CONFIG||{}}
let discoverObserver=null;
function discoverKeptIds(){let s=new Set();(state.items||[]).forEach(i=>{let d=i&&i.captureContext&&i.captureContext.discoverItemId;if(d)s.add(String(d))});return s}
function discoverView(){setDiscoverGuest(!state.user);let ds=state.discover,kept=discoverKeptIds(),open=ds.openId?ds.items.find(i=>i.id===ds.openId)||ds.openItem:null;setTimeout(()=>{if(!ds.loaded&&!ds.loading)loadDiscover(true);else observeDiscoverSentinel();if(open)fillDiscoverSimilar(open)},0);return shell("<div class='workspace discover-workspace"+(state.leftCollapsed?" left-collapsed":"")+" detail-closed"+pageEnterCls()+"'><aside class='rail'>"+sideNav()+"</aside><main class='main discover-main'><h1 class='sr-only'>Discover</h1>"+(state.user?"":guestHeroMarkup())+"<div data-discover-results>"+discoverGridMarkup(ds,discoverConfig(),kept)+"</div></main></div>"+(open?discoverDetailMarkup(open,discoverConfig(),kept.has(open.id),discoverNav(open.id)):""))}
function renderDiscoverResults(){if(state.view!=="discover")return;setDiscoverGuest(!state.user);let box=document.querySelector("[data-discover-results]");if(!box)return;box.innerHTML=discoverGridMarkup(state.discover,discoverConfig(),discoverKeptIds());observeDiscoverSentinel()}
function observeDiscoverSentinel(){if(discoverObserver){discoverObserver.disconnect();discoverObserver=null}let s=document.querySelector("[data-discover-sentinel]");if(!s||!("IntersectionObserver" in window))return;discoverObserver=new IntersectionObserver(es=>{if(es.some(x=>x.isIntersecting))loadDiscover(false)},{rootMargin:"600px 0px"});discoverObserver.observe(s)}
async function loadDiscover(reset){let ds=state.discover;if(ds.loading||(!reset&&ds.done))return;if(!discoverEnabled(discoverConfig())){ds.loaded=true;ds.done=true;ds.error="Discover is not available in this build.";renderDiscoverResults();return}ds.loading=true;ds.error="";if(reset){ds.items=[];ds.done=false}let token=(loadDiscover._token||0)+1;loadDiscover._token=token;renderDiscoverResults();try{let last=reset?null:ds.items[ds.items.length-1],page=await fetchDiscoverPage(discoverConfig(),{category:ds.category,q:ds.q,colors:ds.colors,tone:ds.tone,shape:ds.shape,facets:ds.facets,similar:ds.similar,loaded:reset?0:ds.items.length,after:last?{published_at:last.published_at,id:last.id}:null});if(token!==loadDiscover._token)return;let seen=new Set(ds.items.map(i=>i.id));ds.items=ds.items.concat(page.rows.filter(r=>!seen.has(r.id)));ds.done=page.done;ds.chips=page.chips||[]}catch(err){if(token!==loadDiscover._token)return;console.warn("A+ Vault discover load failed",err);ds.error="Discover could not load right now."}ds.loading=false;ds.loaded=true;renderDiscoverResults()}
function setDiscoverFilter(next,opts){let ds=state.discover;if(next.category!=null)ds.category=String(next.category);if(next.q!=null)ds.q=String(next.q).trim().slice(0,60);if(next.colors!==undefined)ds.colors=[...new Set((next.colors||[]).map(normalizeDiscoverHex).filter(Boolean))].slice(0,MAX_SEARCH_COLORS);if(next.tone!==undefined)ds.tone=next.tone||null;if(next.shape!==undefined)ds.shape=next.shape||null;if(next.facets!==undefined){let seen=new Set();ds.facets=(next.facets||[]).map(normalizeFacet).filter(f=>{if(!f)return false;let k=f.key+"\u0000"+f.value.toLowerCase();if(seen.has(k))return false;seen.add(k);return true}).slice(-4)}if(next.similar!==undefined)ds.similar=next.similar||null;if(!(opts&&opts.keepPanel))ds.colorOpen=false;ds.loading=false;ds.loaded=true;ds.openId=null;ds.openItem=null;loadDiscover._token=(loadDiscover._token||0)+1;render();loadDiscover(true)}
function openDiscoverItem(discoverId){let ds=state.discover,item=findDiscoverRow(discoverId);if(!item)return;markDiscoverSeen([discoverId]);signalItem("open",discoverId,ds.items.findIndex(x=>x.id===discoverId),item.tags_ids||null);viewerTrailOpen(item);ds.openId=discoverId;ds.openItem=item;mountDiscoverDetail(item)}
function mountDiscoverDetail(item,focusDir){document.querySelectorAll(".discover-detail-backdrop").forEach(n=>n.remove());let host=document.querySelector(".app-shell");if(!host)return;document.documentElement.classList.add("discover-detail-open");ensureEngine();viewerSyncTrail(item);host.insertAdjacentHTML("beforeend",discoverDetailMarkup(item,discoverConfig(),discoverKeptIds().has(item.id),discoverNav(item.id),viewerView()));requestAnimationFrame(()=>clampTagRows(host));let arrow=focusDir&&host.querySelector(".discover-detail-nav.is-"+focusDir+":not([disabled])"),c=arrow||host.querySelector(".discover-detail-close");if(c)c.focus({preventScroll:true});fillDiscoverSimilar(item)}
function discoverNav(id){let ds=state.discover,i=ds.items.findIndex(x=>x.id===id);if(i<0)return null;return{hasPrev:i>0,hasNext:i<ds.items.length-1||!ds.done,total:ds.items.length}}
async function stepDiscoverItem(dir){let ds=state.discover,i=ds.items.findIndex(x=>x.id===ds.openId);if(i<0)return;let j=i+dir;if(j<0)return;if(j>=ds.items.length&&!ds.done)await loadDiscover(false);let next=ds.items[j];if(!next||!ds.openId)return;ds.openId=next.id;ds.openItem=next;mountDiscoverDetail(next,dir<0?"prev":"next")}
function closeDiscoverItem(){document.documentElement.classList.remove("discover-detail-open");if(!state.discover.openId)return;state.discover.openId=null;state.discover.openItem=null;document.querySelectorAll(".discover-detail-backdrop").forEach(n=>n.remove())}
function refreshDiscoverKept(){if(state.view!=="discover")return;renderDiscoverResults();let item=state.discover.openItem;if(item&&document.querySelector(".discover-detail-backdrop"))mountDiscoverDetail(item)}
function keepDiscoverItem(discoverId){if(!discoverId)return;if(!state.user){requireAuth({type:"keep",id:discoverId});return}if(discoverVaultItem(String(discoverId))){openDiscoverSave(String(discoverId));return}saveDiscoverTo(String(discoverId),keepTargetId()||null)}
function discoverVaultItem(discoverId){return (state.items||[]).find(i=>i&&i.captureContext&&String(i.captureContext.discoverItemId)===String(discoverId))||null}
function discoverSourceNow(discoverId){let ds=state.discover;return ds.items.find(i=>i.id===discoverId)||(ds.openItem&&ds.openItem.id===discoverId?ds.openItem:null)}
async function discoverSource(discoverId){let src=discoverSourceNow(discoverId);if(src)return src;try{return await fetchDiscoverItem(discoverConfig(),discoverId)}catch(_){return null}}
function openDiscoverSave(discoverId){state.discover.saveFor=discoverId;state.discover.saveCreating=false;mountDiscoverSave()}
function closeDiscoverSave(){state.discover.saveFor=null;state.discover.saveCreating=false;document.querySelectorAll(".discover-save-backdrop").forEach(n=>n.remove())}
function mountDiscoverSave(){document.querySelectorAll(".discover-save-backdrop").forEach(n=>n.remove());let ds=state.discover,did=ds.saveFor,host=document.querySelector(".app-shell");if(!did||!host)return;let src=discoverSourceNow(did),kept=discoverVaultItem(did),inCols=new Set(kept?cleanCollectionIds(kept.collectionIds):[]),cols=[];rootCustomCols().forEach(c=>{cols.push({id:c.id,name:c.name,depth:0,added:inCols.has(c.id)});childCols(c.id).forEach(ch=>cols.push({id:ch.id,name:ch.name,depth:1,added:inCols.has(ch.id)}))});host.insertAdjacentHTML("beforeend",discoverSaveDialogMarkup({title:src?src.title:kept?kept.title:"",thumb:src?discoverMediaUrl(discoverConfig(),src.image_sm_path):kept?kept.thumbnailUrl:"",collections:cols,inVault:!!kept,creating:!!ds.saveCreating,icons:{vault:icon("vault"),collection:icon("collection"),plus:icon("plus")}}));let focus=host.querySelector(ds.saveCreating?".discover-save-form input":".discover-save-option");if(focus)focus.focus({preventScroll:true})}
async function saveDiscoverTo(discoverId,colId){if(!discoverId)return;let col=colId?state.cols.find(c=>c.id===colId&&!c.system):null,existing=discoverVaultItem(discoverId);if(existing){closeDiscoverSave();if(!col){toast("Already in your Vault.");return}let ids=new Set(cleanCollectionIds(existing.collectionIds));ids.add("all");if(ids.has(col.id)){toast("Already in "+col.name+".");return}ids.add(col.id);patch(existing.id,{collectionIds:Array.from(ids)});refreshDiscoverKept();toast("Saved to "+col.name+".");return}let src=await discoverSource(discoverId);if(!src){closeDiscoverSave();toast("This image is no longer available.");return}if(discoverVaultItem(discoverId))return saveDiscoverTo(discoverId,colId);signalItem("save",discoverId,null,src.tags_ids||null);let raw=discoverToVaultItem(src,discoverConfig(),id());if(col)raw.collectionIds=["all",col.id];let item=normalizeItems([raw])[0];state.items=[item].concat(state.items);state.sortBy="saved_new";save(S.items,state.items);syncRemoteItem(item,"create");closeDiscoverSave();refreshDiscoverKept();toast(col?"Saved to "+col.name+".":"Saved to My Vault.");notePinItem(item.id)}
function createDiscoverCollection(name){name=String(name||"").trim().slice(0,60);if(!name||!state.discover.saveFor)return;let c=createCollection(name,{keepView:true,skipToast:true});saveDiscoverTo(state.discover.saveFor,c.id)}
function requireAuth(action){if(state.user)return true;state.authPrompt=action||{type:"login"};writePendingAction(state.authPrompt);closeDiscoverItem();render();let f=document.querySelector("[data-auth] input[name='email']");if(f)f.focus({preventScroll:true});return false}
function closeAuthPrompt(){if(!state.authPrompt)return;state.authPrompt=null;writePendingAction(null);render()}
function resumePendingAction(){let a=state.authPrompt||readPendingAction();if(state.user){setTimeout(broadcastExtensionCollections,1200);setTimeout(broadcastExtensionCollections,4500)}state.authPrompt=null;writePendingAction(null);if(state.user&&a){if(a.type==="keep"&&a.id){state.view="discover";keepDiscoverItem(String(a.id))}else if(a.type==="view"&&a.view&&!["login","home","discover"].includes(a.view))state.view=a.view}if(state.user&&state.view!=="discover"&&/^\/(?:discover\/?)?$/.test(location.pathname))history.replaceState(null,"",location.origin+"/vault"+(location.hash||""))}
document.addEventListener("click",e=>{let projectBtn=e.target&&e.target.closest?e.target.closest("[data-project]"):null;if(projectBtn){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();state.openMenu=null;state.activeProject=projectBtn.dataset.project;state.expandedProjectIds=Object.assign({},state.expandedProjectIds||{});state.expandedProjectIds[projectBtn.dataset.project]=true;let p=project();state.activeBoard=(p.boards&&p.boards[0]&&p.boards[0].id)||"";state.selectedObject=null;state.view="project";state.projectExplorerScope="all";render();return}let openBtn=e.target&&e.target.closest?e.target.closest("[data-openboard]"):null;if(openBtn){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();let r=boardRef(openBtn.dataset.openboard);state.activeProject=r.projectId;state.activeBoard=r.boardId;state.selectedObject=null;state.rightCollapsed=false;state.openMenu=null;state.view="board";render();return}},true);
document.addEventListener("click",e=>{let toggle=e.target&&e.target.closest?e.target.closest("[data-keep-detail]"):null;if(toggle){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();state.collectionPicker=state.collectionPicker===toggle.dataset.keepDetail?null:toggle.dataset.keepDetail;if(!refreshOpenDrawer())render();return}let pick=e.target&&e.target.closest?e.target.closest("[data-keepcol]"):null;if(pick){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();let parts=String(pick.dataset.keepcol||"").split(":"),item=state.items.find(i=>i.id===parts[0]),col=state.cols.find(c=>c.id===parts[1]&&!c.system);if(!item||!col)return;let ids=new Set(cleanCollectionIds(item.collectionIds));ids.add("all");let existed=ids.has(col.id);ids.add(col.id);patch(item.id,{collectionIds:Array.from(ids)});state.collectionPicker=null;toast(existed?"Already in "+col.name+".":"Copied to "+col.name+".");if(!refreshOpenDrawer())render()}},true);
if(window.matchMedia){let themeQuery=window.matchMedia("(prefers-color-scheme: dark)");if(themeQuery.addEventListener)themeQuery.addEventListener("change",()=>{if(state.theme==="system")applyTheme()})}
function isMobileViewport(){return typeof matchMedia==="function"&&matchMedia("(max-width: 860px)").matches}
function isTabletViewport(){return typeof matchMedia==="function"&&matchMedia("(min-width: 861px) and (max-width: 1024px)").matches}
function syncResponsiveViewport(){let root=document.documentElement;root.dataset.viewport=isMobileViewport()?"mobile":isTabletViewport()?"tablet":"desktop";if(isMobileViewport())state.leftCollapsed=true}
function bindResponsiveViewport(){if(!window.matchMedia||window.__vaultViewportBound)return;window.__vaultViewportBound=true;let apply=()=>{let wasMobile=document.documentElement.dataset.viewport==="mobile";syncResponsiveViewport();if(isMobileViewport()&&!wasMobile){state.profileMenu=false;state.sortMenu=false;state.viewMenu=false;render()}else document.documentElement.dataset.viewport=isTabletViewport()?"tablet":isMobileViewport()?"mobile":"desktop"};apply();["(max-width: 860px)","(min-width: 861px) and (max-width: 1024px)"].forEach(q=>{let mq=matchMedia(q);if(mq.addEventListener)mq.addEventListener("change",apply);else if(mq.addListener)mq.addListener(apply)})}
document.addEventListener("click",e=>{if(!isMobileViewport()||state.leftCollapsed)return;let rail=e.target&&e.target.closest?e.target.closest(".rail,.project-rail"):null,toggle=e.target&&e.target.closest?e.target.closest("[data-toggle-left]"):null;if(toggle||rail)return;let ws=e.target&&e.target.closest?e.target.closest(".workspace,.board-workspace"):null;if(ws){state.leftCollapsed=true;state.sortMenu=false;state.viewMenu=false;render()}},true);
document.addEventListener("click",e=>{let nav=e.target&&e.target.closest?e.target.closest("[data-view],[data-col]"):null;if(!nav||!isMobileViewport()||state.leftCollapsed)return;state.leftCollapsed=true},true);
function trackOpened(){let s=state.selected;if(s&&trackOpened._last!==s){try{let m=load(OPENED_KEY,{}),keys;m[s]=Date.now();keys=Object.keys(m);if(keys.length>500)keys.sort((a,b)=>m[a]-m[b]).slice(0,keys.length-500).forEach(k=>delete m[k]);save(OPENED_KEY,m)}catch(e){}}trackOpened._last=s}
function render(opts){trackOpened();setTimeout(mountQuickNote,0);document.documentElement.dataset.gridSize=normalizeLibraryView(state.libraryView);try{if(window.matchMedia(DESKTOP_TOP_NAV).matches)state.leftCollapsed=true;if(!(opts&&opts.skipTheme))applyTheme({instant:true});let prevView=render._view,viewChanged=prevView!=null&&prevView!==state.view;state.pageEnter=!!(viewChanged||(opts&&opts.pageEnter));render._view=state.view;app.innerHTML=state.loading==="vault"?vaultLoadingView():workspaceView();insertStudioTabs();bind();if(state.pageEnter){clearTimeout(render._pageEnterTimer);requestAnimationFrame(()=>{let roots=document.querySelectorAll('.page-enter');roots.forEach(el=>{el.querySelectorAll('.main,.board-main,.library-rail,.inspector,.moodboard-editor,.capture-page').forEach(node=>{void node.offsetWidth})});});render._pageEnterTimer=setTimeout(()=>{state.pageEnter=false},520)}}catch(err){console.error("A+ Vault render failed",err);repairState();app.innerHTML=repairView(err);bindRepair()}}
function pageEnterCls(){return state.pageEnter?" page-enter":""}
function workspaceView(){if(!state.user&&state.view!=="discover"){if(GUEST_EXPLAIN[state.view])return guestExplainerView(state.view);if(!state.authPrompt){state.authPrompt={type:"view",view:state.view};writePendingAction(state.authPrompt)}state.view="discover"}if(state.view==="discover")return discoverView();if(state.view==="project"&&!project())state.view="projects";if(state.view==="board"&&!project())state.view="projects";if(state.view==="moodboard-edit")return moodboardEditView();if(state.view==="board")return boardView();if(state.view==="project")return projectView();if(state.view==="projects")return projectsView();if(state.view==="moodboards")return moodboardsView();if(state.view==="capture")return captureView();if(state.view==="collections")return collectionsView();if(state.view==="profile")return profileView();if(state.view==="settings")return settingsView();return vaultView()}
async function beginVaultLogin(user){let remoteUser=null,remoteError="",keepSelected=state.selected;state.view="vault";state.loading="vault";state.animateVault=true;state.leftCollapsed=true;state.selectedObject=null;state.openMenu=null;state.profileMenu=false;state.sortMenu=false;state.viewMenu=false;clearTimeout(vaultLoadingTimer);clearTimeout(vaultEnterTimer);render();if(shouldUseRemoteLogin(user)){try{let session=user.action==="signup"&&vaultRemote.signUpWithPassword?await vaultRemote.signUpWithPassword(user.email,user.password):await vaultRemote.signInWithPassword(user.email,user.password);if(session&&session.access_token){remoteUser={id:session.user&&session.user.id,email:session.user&&session.user.email||user.email,provider:"supabase"};await importRemoteVault()}else{remoteError="Account created. Check your email if confirmation is enabled, then log in again."}}catch(err){remoteError=err.message||"Supabase login failed."}}state.user=remoteUser||{email:user.email,provider:user.provider||"password",displayName:(state.user&&state.user.displayName)||"",avatarUrl:(state.user&&state.user.avatarUrl)||""};ensureVaultApiToken();save(S.user,state.user);if(keepSelected)state.selected=keepSelected;resumePendingAction();render();vaultLoadingTimer=setTimeout(()=>{state.loading=null;render();vaultEnterTimer=setTimeout(()=>{state.animateVault=false;render();if(keepSelected&&state.items.some(i=>i.id===keepSelected))openSelectedDetail(keepSelected);if(remoteError)toast((remoteUser?"":"Using local alpha. ")+remoteError)},1300)},560)}
function shouldUseRemoteLogin(user){return vaultRemote.enabled&&user&&user.provider==="password"&&user.password&&user.password!=="aplusvault"&&!String(user.email||"").endsWith(".local")}
function beginGoogleLogin(){let live=(window.APLUS_VAULT_CONFIG||{}).mode==="supabase-live";if(vaultRemote.enabled&&live){try{vaultRemote.signInWithGoogle(location.href);return}catch(err){toast(err.message||"Google login is not ready.")}}beginVaultLogin({email:"creative.google@aplus.local",provider:"google"})}
async function initRemoteSession(){if(!vaultRemote.enabled)return;try{let session=await vaultRemote.getSession();if(!session||!session.user)return;state.user={id:session.user.id,email:session.user.email,provider:"supabase"};ensureVaultApiToken();save(S.user,state.user);await importRemoteVault();resumePendingAction();if(state.selected&&state.items.some(i=>i.id===state.selected))state.rightCollapsed=false;render();if(state.selected&&state.items.some(i=>i.id===state.selected))openSelectedDetail(state.selected)}catch(err){}}
function safeHref(u){try{let p=new URL(String(u||""));return p.protocol==="https:"||p.protocol==="http:"?p.href:""}catch(_){return ""}}
function sessionAccessToken(){try{let session=JSON.parse(localStorage.getItem("aplus-vault-supabase-session")||"null");return session&&session.access_token||""}catch(e){return ""}}
function signedVaultTokenFor(userId){let saved=load(S.apiToken,"");return typeof saved==="string"&&saved.startsWith("vxt1."+userId+".")?saved:""}
function getVaultApiToken(){let token=ensureVaultApiToken();if(token)return token;return sessionAccessToken()}
function ensureVaultApiToken(){let userId=state.user&&state.user.id;if(userId){let token=signedVaultTokenFor(userId);if(!token)refreshSignedVaultToken();return token}let saved=load(S.apiToken,"");if(saved&&/^vault-(?!user-)/.test(saved))return saved;let token="vault-"+id();save(S.apiToken,token);return token}
async function refreshSignedVaultToken(){if(refreshSignedVaultToken.pending)return refreshSignedVaultToken.pending;let userId=state.user&&state.user.id,access=sessionAccessToken();if(!userId||!access)return "";refreshSignedVaultToken.pending=(async()=>{try{let r=await fetch("/api/vault/token",{method:"POST",cache:"no-store",headers:{Authorization:"Bearer "+access}});if(!r.ok)return "";let d=await r.json();if(d&&typeof d.token==="string"&&d.token.startsWith("vxt1."+userId+".")){save(S.apiToken,d.token);return d.token}}catch(_){}return ""})().finally(()=>{refreshSignedVaultToken.pending=null});return refreshSignedVaultToken.pending}
async function copyExtensionToken(){if(state.user&&state.user.id){let token=signedVaultTokenFor(state.user.id)||await refreshSignedVaultToken();if(token)copyText(token);else toast("Couldn't create a sync token. Refresh the page and try again.");return}let token=getVaultApiToken();if(token)copyText(token);else toast("Log in first to generate a sync token.")}
function regenerateVaultApiToken(){if(state.user&&state.user.id){toast("Account-bound sync token is already active.");return ensureVaultApiToken()}let token="vault-"+id();save(S.apiToken,token);toast("Extension sync token refreshed.");render();return token}
function demoBanner(){return "<section class='demo-banner'><div><strong>Private alpha demo</strong><span>Log in, copy your extension sync token from Settings, then right-click any image and choose + Keep in Vault.</span></div><button type='button' class='ghost-button' data-view='login'>Start demo</button></section>"}
async function importRemoteVault(){if(!vaultRemote.enabled||!vaultRemote.hasSession())return;try{let remote=await vaultRemote.loadVault();if(remote.items&&remote.items.length){state.items=normalizeItems(remote.items);save(S.items,state.items)}if(remote.collections&&remote.collections.length){state.cols=ensureCoreCols(normalizeCols(DEFAULT_COLS.concat(remote.collections.filter(c=>!c.system))));save(S.cols,state.cols)}if(remote.projects&&remote.projects.length){state.projects=normalizeProjects(remote.projects,state.items);save(S.projects,state.projects)}if(remote.moodboards&&remote.moodboards.length){state.moodboards=normalizeMoodboards(remote.moodboards)}else{state.moodboards=extractMoodboardsFromProjects(state.projects,state.moodboards)}save(S.moodboards,state.moodboards);broadcastExtensionCollections()}catch(err){console.warn("A+ Vault remote import failed",err)}}
function vaultLoadingView(){let stats=count(),realCols=state.cols.filter(c=>!c.system);return shell("<div class='workspace left-collapsed detail-closed vault-loading'><aside class='rail'>"+skeletonSidebar(stats,realCols)+"</aside><main class='main skeleton-main'><section class='skeleton-toolbar'><div class='skeleton-chip-row'><span class='skeleton-pill active'></span><span class='skeleton-pill'></span><span class='skeleton-pill short'></span><span class='skeleton-pill short'></span></div><span class='skeleton-sort'></span></section><section class='skeleton-masonry'>"+Array.from({length:10},(_,n)=>skeletonCard(n)).join("")+"</section></main></div>")}
function skeletonSidebar(stats,cols){return "<div class='side-shell-header'><span class='skeleton-icon'></span></div><div class='sidebar-stats skeleton-stats'><span>"+stats.total+"</span><span>"+stats.images+"</span><span>"+cols.length+"</span></div><div class='skeleton-rail-stack'><span></span><span></span><span></span><span></span></div>"}
function skeletonCard(n){return "<article class='skeleton-card' style='--card-index:"+n+"'><span class='skeleton-image'></span><span class='skeleton-line'></span><span class='skeleton-line short'></span></article>"}
function uiIcon(n){if(n==="pin")return"<svg class='flat-icon pin-line-icon' viewBox='0 0 24 24' aria-hidden='true' fill='none' stroke='currentColor' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'><path d='M12 17v5'/><path d='M8 4h8l1 7-5 3-5-3 1-7z'/></svg>";if(n==="share")return"<svg class='flat-icon share-line-icon' viewBox='0 0 24 24' aria-hidden='true' fill='none' stroke='currentColor' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'><path d='M12 16V4'/><path d='m8 8 4-4 4 4'/><path d='M4 12v8h16v-8'/></svg>";if(n==="undo")return"<svg class='flat-icon' viewBox='0 0 24 24' aria-hidden='true' fill='none' stroke='currentColor' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'><path d='M9 14 4 9l5-5'/><path d='M4 9h10.5a5.5 5.5 0 1 1 0 11H12'/></svg>";if(n==="redo")return"<svg class='flat-icon' viewBox='0 0 24 24' aria-hidden='true' fill='none' stroke='currentColor' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'><path d='m15 14 5-5-5-5'/><path d='M20 9H9.5a5.5 5.5 0 1 0 0 11H12'/></svg>";return icon(n)}
function openTextDialog(d){state.openMenu=null;state.dialog=Object.assign({type:"text",title:"Edit",label:"Name",value:"",confirmText:"Save"},d);render()}
function openConfirmDialog(d){state.openMenu=null;state.dialog=Object.assign({type:"confirm",title:"Confirm",message:"Are you sure?",confirmText:"Confirm",danger:false},d);render()}
function canNativeShare(){return typeof navigator!=="undefined"&&typeof navigator.share==="function"}
async function nativeShareItem(itemId){let i=state.items.find(x=>x.id===itemId);if(!i||!canNativeShare())return;try{await navigator.share({title:i.title,text:(i.note||i.title)+" — A+ Vault",url:objectShareUrl(i.id)});state.dialog=null;render()}catch(err){if(err&&err.name!=="AbortError")toast("Could not open share sheet.")}}
async function nativeShareCollection(colId){let c=state.cols.find(x=>x.id===colId&&!x.system);if(!c||!canNativeShare())return;try{await navigator.share({title:c.name,text:c.name+" — A+ Vault collection",url:collectionShareUrl(colId)});state.dialog=null;render()}catch(err){if(err&&err.name!=="AbortError")toast("Could not open share sheet.")}}
function shareDialog(itemId){let i=state.items.find(x=>x.id===itemId);if(!i)return"";let url=objectShareUrl(i.id),text=encodeURIComponent(i.title+" — A+ Vault"),enc=encodeURIComponent(url),links=[["WhatsApp","https://wa.me/?text="+text+"%20"+enc],["LINE","https://social-plugins.line.me/lineit/share?url="+enc],["X","https://twitter.com/intent/tweet?text="+text+"&url="+enc],["LinkedIn","https://www.linkedin.com/sharing/share-offsite/?url="+enc]],native=canNativeShare()?"<button class='primary-button share-native-button' type='button' data-native-share='"+escA(i.id)+"'>"+uiIcon("share")+"<span>Share</span></button>":"";return"<div class='app-dialog-backdrop'><section class='app-dialog share-dialog' role='dialog' aria-modal='true'><div class='app-dialog-head'><div><span class='section-label'>Share</span><h2>"+esc(i.title)+"</h2></div><button class='icon-button' type='button' data-dialog-cancel>"+icon("close")+"</button></div><div class='share-object-preview'>"+media(i)+"</div><div class='share-primary-actions'>"+native+"<button class='"+(native?"ghost-button":"primary-button")+"' type='button' data-copy-share='"+escA(url)+"'>"+icon("link")+"<span>Copy link</span></button></div><label class='share-link-field'><span>Public object page</span><div><input readonly value='"+escA(url)+"'><button type='button' data-copy-share='"+escA(url)+"'>Copy</button></div></label><div class='share-social-grid'>"+links.map(l=>"<a href='"+l[1]+"' target='_blank' rel='noreferrer'>"+esc(l[0])+"</a>").join("")+"</div><div class='share-dialog-actions'><button class='ghost-button' type='button' data-open-object='"+i.id+"'>Preview page</button></div><p class='share-note'>Anyone with the link can view this object page.</p></section></div>"}
function shareCollectionDialog(colId){let c=state.cols.find(x=>x.id===colId&&!x.system);if(!c)return"";let url=collectionShareUrl(colId),count=itemsForCollection(colId).length,text=encodeURIComponent(c.name+" — A+ Vault collection"),enc=encodeURIComponent(url),links=[["WhatsApp","https://wa.me/?text="+text+"%20"+enc],["LINE","https://social-plugins.line.me/lineit/share?url="+enc],["X","https://twitter.com/intent/tweet?text="+text+"&url="+enc],["LinkedIn","https://www.linkedin.com/sharing/share-offsite/?url="+enc]],native=canNativeShare()?"<button class='primary-button share-native-button' type='button' data-native-share-col='"+escA(colId)+"'>"+uiIcon("share")+"<span>Share</span></button>":"";return"<div class='app-dialog-backdrop'><section class='app-dialog share-dialog share-collection-dialog' role='dialog' aria-modal='true'><div class='app-dialog-head'><div><span class='section-label'>Share collection</span><h2>"+esc(c.name)+"</h2></div><button class='icon-button' type='button' data-dialog-cancel>"+icon("close")+"</button></div><div class='share-object-preview share-collection-preview'>"+collectionMosaicMarkup(colId)+"</div><p class='share-collection-meta'>"+count+" object"+(count===1?"":"s")+" in this collection</p><div class='share-primary-actions'>"+native+"<button class='"+(native?"ghost-button":"primary-button")+"' type='button' data-copy-share='"+escA(url)+"'>"+icon("link")+"<span>Copy link</span></button></div><label class='share-link-field'><span>Collection link</span><div><input readonly value='"+escA(url)+"'><button type='button' data-copy-share='"+escA(url)+"'>Copy</button></div></label><div class='share-social-grid'>"+links.map(l=>"<a href='"+l[1]+"' target='_blank' rel='noreferrer'>"+esc(l[0])+"</a>").join("")+"</div><div class='share-dialog-actions'><button class='ghost-button' type='button' data-open-collection='"+c.id+"'>Open collection</button></div><p class='share-note'>Anyone with the link can open this collection view in A+ Vault.</p></section></div>"}
function appDialog(){let d=state.dialog||{};if(d.type==="pick-color-type")return moodboardColorChooserMarkup({esc,escA,icon});if(d.type==="create-moodboard")return createMoodboardDialogMarkup({esc,escA,icon,selectedCount:(d.itemIds||[]).length,fromSelection:!!(d.itemIds&&d.itemIds.length),renameName:d.renameName||"",renameId:d.renameId||""});if(d.type==="pick-vault-for-board"){let board=activeMoodboard(),colId=d.collectionId||"all",typeFilter=d.typeFilter||"all",query=d.query||"",selectedIds=d.selectedIds||[],pickerItems=colId==="all"?state.items:state.items.filter(i=>(i.collectionIds||[]).includes(colId));return moodboardVaultPickerMarkup({items:pickerItems,board,cols:state.cols,collectionId:colId,typeFilter,query,selectedIds,esc,escA,icon,media,host})}if(d.type==="link-moodboard-project")return linkProjectDialogMarkup({boardId:d.boardId,projects:state.projects,esc,escA,icon});if(d.type==="share")return shareDialog(d.itemId);if(d.type==="share-collection")return shareCollectionDialog(d.colId);if(d.type==="highlight-picker")return highlightPickerDialog(d);if(d.type==="project-collection-picker")return projectCollectionPickerDialog(d,projectPickerHelpers());if(d.type==="project-moodboard-picker")return projectMoodboardPickerDialog(d,projectPickerHelpers());if(d.type==="project-settings")return projectSettingsDialog(d,projectPickerHelpers());if(d.type==="duplicate"){let dup=state.items.find(i=>i.id===d.duplicateId);return"<div class='app-dialog-backdrop'><section class='app-dialog duplicate-dialog' role='dialog' aria-modal='true'><div class='app-dialog-head'><div><span class='section-label'>Duplicate warning</span><h2>"+esc(d.title||"Looks already saved")+"</h2></div><button class='icon-button' type='button' data-dialog-cancel>"+icon("close")+"</button></div><p class='app-dialog-message'>"+esc(d.message||"This source already exists in My Vault.")+"</p>"+(dup?"<div class='duplicate-preview'>"+media(dup)+"<strong>"+esc(dup.title)+"</strong><small>"+detailSourceLine(dup)+"</small></div>":"")+"<div class='app-dialog-actions'><button class='ghost-button' type='button' data-dialog-cancel>Cancel</button>"+(dup?"<button class='ghost-button' type='button' data-dialog-open-existing='"+dup.id+"'>Open existing</button>":"")+"<button class='primary-button' type='button' data-dialog-confirm>Save anyway</button></div></section></div>"}if(d.type==="bulk-project"){let ids=d.itemIds||[];return"<div class='app-dialog-backdrop'><section class='app-dialog' role='dialog' aria-modal='true'><form data-bulk-project-form><div class='app-dialog-head'><h2>Add to project</h2><button class='icon-button' type='button' data-dialog-cancel>"+icon("close")+"</button></div><p class='app-dialog-message'>Move "+ids.length+" selected object"+(ids.length===1?"":"s")+" into a project.</p><label class='app-dialog-field'><span>Project</span><select name='projectId' required><option value=''>Choose a project</option>"+state.projects.map(p=>"<option value='"+p.id+"'>"+esc(p.name)+"</option>").join("")+"</select></label><div class='app-dialog-actions'><button type='button' class='ghost-button' data-dialog-cancel>Cancel</button><button class='primary-button' type='submit'>Add to project</button></div></form></section></div>"}if(d.type==="text")return"<div class='app-dialog-backdrop'><section class='app-dialog' role='dialog' aria-modal='true'><form data-dialog-form><div class='app-dialog-head'><h2>"+esc(d.title)+"</h2><button class='icon-button' type='button' data-dialog-cancel>"+icon("close")+"</button></div><label class='app-dialog-field'><span>"+esc(d.label)+"</span><input name='value' value='"+escA(d.value||"")+"' autofocus></label>"+(d.extra?d.extra():"")+"<div class='app-dialog-actions'><button class='ghost-button' type='button' data-dialog-cancel>Cancel</button><button class='primary-button'>"+esc(d.confirmText||"Save")+"</button></div></form></section></div>";return"<div class='app-dialog-backdrop'><section class='app-dialog' role='dialog' aria-modal='true'><div class='app-dialog-head'><h2>"+esc(d.title)+"</h2><button class='icon-button' type='button' data-dialog-cancel>"+icon("close")+"</button></div><p class='app-dialog-message'>"+esc(d.message)+"</p><div class='app-dialog-actions'><button class='ghost-button' type='button' data-dialog-cancel>Cancel</button><button class='"+(d.danger?"danger-button":"primary-button")+"' type='button' data-dialog-confirm>"+esc(d.confirmText||"Confirm")+"</button></div></section></div>"}
function togglePin(itemId){let i=state.items.find(x=>x.id===itemId);if(!i)return;if(!i.pinnedAt&&state.items.filter(x=>x.pinnedAt).length>=TOP_OF_MIND_MAX){toast("Top of Mind holds "+TOP_OF_MIND_MAX+" items. Unpin one first.");return}let next=i.pinnedAt?0:Date.now();patch(i.id,{pinnedAt:next});state.openMenu=null;toast(next?"Pinned to top.":"Unpinned.");if(!softRefreshPinned(itemId,!!next))render()}
function softRefreshPinned(itemId,pinned){let card=document.querySelector("[data-sel='"+itemId+"'],[data-dragitem='"+itemId+"']"),detailBtn=document.querySelector(".detail-pin-button[data-pin='"+itemId+"']"),changed=false;if(card){card.classList.toggle("pinned",pinned);changed=true}if(detailBtn){detailBtn.classList.toggle("active",pinned);detailBtn.title=pinned?"Unpin":"Pin to top";detailBtn.setAttribute("aria-label",pinned?"Unpin":"Pin to top");changed=true}return changed}
function shareItem(itemId){let i=state.items.find(x=>x.id===itemId);if(!i)return;state.dialog={type:"share",itemId:itemId};render()}
function shareCollection(colId){let c=state.cols.find(x=>x.id===colId&&!x.system);if(!c)return;state.openMenu=null;state.dialog={type:"share-collection",colId:colId};render()}
function deleteItemById(itemId){let i=state.items.find(x=>x.id===itemId);if(!i)return;let used=boardsUsingItem(state.moodboards,itemId);if(used.length){openConfirmDialog({title:"Delete object used on moodboards",message:i.title+" is on "+used.length+" moodboard"+(used.length===1?"":"s")+". Delete removes it from My Vault; moodboard cards become unavailable placeholders.",confirmText:"Delete from Vault",danger:true,onConfirm:()=>finalizeDeleteItem(i)});return}finalizeDeleteItem(i)}
function finalizeDeleteItem(i){trashPut(i);syncRemoteDeleteItem(i);state.items=state.items.filter(x=>x.id!==i.id);state.selectedIds=(state.selectedIds||[]).filter(id=>id!==i.id);if(state.selected===i.id)state.selected=null;state.openMenu=null;state.moodboards=removeItemFromAllBoards(state.moodboards,i.id);save(S.items,state.items);persistMoodboards();toast("Moved to Trash. Kept for "+TRASH_DAYS+" days.");render()}
function createCollection(name,opts){opts=opts||{};let c={id:opts.id||id(),name:name.trim(),system:false,parentId:"",sortOrder:nextCollectionSortOrder(""),pinnedAt:0,highlightedAt:0};state.cols=state.cols.concat(c);save(S.cols,state.cols);syncRemoteCollection(c,"create");pushExtensionCollection(c);broadcastExtensionCollections();if(!opts.keepView){state.col=c.id;state.view="vault"}if(!opts.skipToast)toast(opts.toastMessage||"Collection created.");return c}
function ensureCollectionFromCapture(item){if(!item)return;let ids=cleanCollectionIds(item.collectionIds).filter(colId=>colId&&colId!=="all"),colName=String(item.captureContext&&item.captureContext.collectionName||"").trim();ids.forEach(colId=>{if(state.cols.some(c=>c.id===colId))return;if(!colName)return;createCollection(colName,{id:colId,keepView:true,skipToast:true})})}
function togglePinCollection(colId){let c=state.cols.find(x=>x.id===colId);if(!c||c.system)return;let next=c.pinnedAt?0:Date.now();state.cols=state.cols.map(col=>col.id===colId?Object.assign({},col,{pinnedAt:next}):col);saveColsAndSync();state.openMenu=null;toast(next?"Collection pinned to top.":"Collection unpinned.");render()}
var MAX_COLLECTION_HIGHLIGHTS=8;
function highlightedCollections(){return customCols().filter(c=>Number(c.highlightedAt)>0).sort((a,b)=>(Number(b.highlightedAt)||0)-(Number(a.highlightedAt)||0)).slice(0,MAX_COLLECTION_HIGHLIGHTS)}
function toggleHighlightCollection(colId,opts){opts=opts||{};let c=state.cols.find(x=>x.id===colId);if(!c||c.system)return false;let on=Number(c.highlightedAt)>0;if(on){state.cols=state.cols.map(col=>col.id===colId?Object.assign({},col,{highlightedAt:0}):col);saveColsAndSync();state.openMenu=null;if(state.dialog&&state.dialog.type==="highlight-picker")state.dialog=null;toast("Removed from highlights.");if(!opts.skipRender)render();return true}if(highlightedCollections().length>=MAX_COLLECTION_HIGHLIGHTS){toast("You can highlight up to "+MAX_COLLECTION_HIGHLIGHTS+" collections.");state.openMenu=null;if(!opts.skipRender)render();return false}state.cols=state.cols.map(col=>col.id===colId?Object.assign({},col,{highlightedAt:Date.now()}):col);saveColsAndSync();state.openMenu=null;if(state.dialog&&state.dialog.type==="highlight-picker")state.dialog=null;toast("Highlighted on Vault.");if(!opts.skipRender)render();return true}
function openHighlightPicker(){state.openMenu=null;let available=customCols().filter(c=>!(Number(c.highlightedAt)>0));if(highlightedCollections().length>=MAX_COLLECTION_HIGHLIGHTS){toast("You can highlight up to "+MAX_COLLECTION_HIGHLIGHTS+" collections.");return}if(!available.length){toast("Create a collection first, then highlight it.");openTextDialog({title:"New collection",label:"Collection name",value:"",confirmText:"Create",onSubmit:createCollection});return}state.dialog={type:"highlight-picker",available:available};render()}
function collectionHighlightPreviews(colId){return itemsForCollection(colId).slice().sort((a,b)=>(Number(b.createdAt)||0)-(Number(a.createdAt)||0)).slice(0,3)}
function collectionHighlightThumb(item,slot){let cls="collection-highlight-tile collection-highlight-tile-"+slot;if(!item)return"<span class='"+cls+" is-empty' aria-hidden='true'></span>";let src=item.type==="image"?(item.assetUrl||item.previewUrl||item.thumbnailUrl||""):(item.previewUrl||item.thumbnailUrl||item.assetUrl||"");if(src)return"<span class='"+cls+"'><img src='"+escA(src)+"' alt='' draggable='false' loading='lazy' decoding='async'></span>";return"<span class='"+cls+" is-empty collection-highlight-tile-type' aria-hidden='true'>"+icon(item.type==="video"?"video":item.type==="link"?"link":"note")+"</span>"}
function collectionHighlightCardMarkup(c){let previews=collectionHighlightPreviews(c.id);return"<button type='button' class='collection-highlight-card' data-col='"+c.id+"' data-dropcol='"+c.id+"' title='"+escA(c.name)+"'><div class='collection-highlight-mosaic' aria-hidden='true'>"+collectionHighlightThumb(previews[0],"main")+collectionHighlightThumb(previews[1],"tr")+collectionHighlightThumb(previews[2],"br")+"</div><strong>"+esc(c.name)+"</strong></button>"}
function collectionHighlightAddMarkup(){return"<button type='button' class='collection-highlight-add' data-add-highlight title='Highlight a collection'><div class='collection-highlight-add-frame'><span class='collection-highlight-add-plus' aria-hidden='true'>+</span><span class='collection-highlight-add-label'>Highlight</span></div><strong class='collection-highlight-add-spacer' aria-hidden='true'>&nbsp;</strong></button>"}
function collectionHighlightRail(){let list=highlightedCollections(),parts=list.map(collectionHighlightCardMarkup);if(list.length<MAX_COLLECTION_HIGHLIGHTS)parts.push(collectionHighlightAddMarkup());else if(!list.length)parts.push(collectionHighlightAddMarkup());return"<section class='collection-highlight-rail' aria-label='Highlighted collections'>"+parts.join("")+"</section>"}
function highlightPickerDialog(d){let available=Array.isArray(d.available)?d.available:customCols().filter(c=>!(Number(c.highlightedAt)>0));return"<div class='app-dialog-backdrop'><section class='app-dialog highlight-picker-dialog' role='dialog' aria-modal='true'><div class='app-dialog-head'><div><span class='section-label'>Highlights</span><h2>Highlight a collection</h2></div><button class='icon-button' type='button' data-dialog-cancel>"+icon("close")+"</button></div><p class='app-dialog-message'>Choose up to "+MAX_COLLECTION_HIGHLIGHTS+" collections for the top row. You can also use ··· on a collection in the sidebar.</p><div class='collection-picker-list'>"+(available.length?available.map(c=>"<button type='button' data-pick-highlight='"+c.id+"'>"+icon("collection")+"<span>"+esc(c.name)+"</span><small>"+itemsForCollection(c.id).length+"</small></button>").join(""):"<p>No more collections to highlight.</p>")+"</div><div class='app-dialog-actions'><button class='ghost-button' type='button' data-dialog-cancel>Cancel</button></div></section></div>"}
function projectCollectionIds(p){return explicitProjectCollectionIds(p)}
function addCollectionToProject(projectId,colId){let p=state.projects.find(x=>x.id===projectId),c=state.cols.find(x=>x.id===colId&&!c.system);if(!p||!c)return;if(projectCollectionIds(p).includes(colId)){toast("Already in this project.");return}p.collectionIds=projectCollectionIds(p).concat(colId);state.activeProject=projectId;state.view="project";persistProjects();toast(c.name+" added to project.");render()}
function createCollectionForProject(projectId,name){let trimmed=name.trim();if(!trimmed)return;let c=createCollection(trimmed,{keepView:true,skipToast:true});addCollectionToProject(projectId,c.id)}
function openAddProjectCollectionDialog(projectId){let p=state.projects.find(x=>x.id===projectId);if(!p)return;state.openMenu=null;state.dialog={type:"project-collection-picker",projectId:projectId,available:availableCollectionsForProject(state,projectId)};render()}
function openAddProjectMoodboardDialog(projectId){let p=state.projects.find(x=>x.id===projectId);if(!p)return;state.openMenu=null;state.dialog={type:"project-moodboard-picker",projectId:projectId,available:availableBoardsForProject(state,projectId)};render()}
function submitProjectCollectionPicker(projectId,existingId,newName){if(newName){createCollectionForProject(projectId,newName);return}if(existingId)addCollectionToProject(projectId,existingId);else toast("Choose a collection or enter a new name.")}
function submitProjectMoodboardPicker(projectId,existingRef,newName){let p=state.projects.find(x=>x.id===projectId);if(!p)return;if(newName){let trimmed=newName.trim();if(!trimmed)return;let board=createBlankMoodboard(trimmed);board=linkMoodboardToProject(board,projectId);state.moodboards=(state.moodboards||[]).concat(board);persistMoodboards();state.activeProject=projectId;state.view="project";toast("Moodboard linked to project.");render();return}if(existingRef){if(existingRef.startsWith("moodboard:")){let boardId=existingRef.slice("moodboard:".length);state.moodboards=(state.moodboards||[]).map(b=>b.id===boardId?linkMoodboardToProject(b,projectId):b);persistMoodboards();state.activeProject=projectId;state.view="project";toast("Moodboard linked to project.");render();return}let cloned=cloneBoardToProject(state.projects,existingRef,projectId,normalizeBoardObject);if(!cloned){toast("Could not copy moodboard.");return}state.activeProject=projectId;state.activeBoard=cloned.id;state.view="project";persistProjects();toast(cloned.name+" copied to project.");render();return}toast("Choose a moodboard or enter a new name.")}
function unlinkCollectionFromProject(projectId,colId){let p=state.projects.find(x=>x.id===projectId),c=state.cols.find(x=>x.id===colId);if(!p||!c)return;removeCollectionFromProject(p,colId);persistProjects();toast(c.name+" removed from project.");render()}
function unlinkBoardFromProject(projectId,boardId){let p=state.projects.find(x=>x.id===projectId);if(!p)return;let removed=removeBoardFromProject(p,boardId);let standalone=(state.moodboards||[]).find(b=>b.id===boardId&&b.projectId===projectId);if(standalone){state.moodboards=(state.moodboards||[]).map(b=>b.id===boardId?linkMoodboardToProject(b,""):b);persistMoodboards()}if(!removed&&!standalone)return;if(state.activeBoard===boardId){state.activeBoard=(p.boards[0]&&p.boards[0].id)||"";state.selectedObject=null;if(state.view==="board")state.view="project"}if(removed)persistProjects();toast((removed&&removed.name||standalone&&standalone.name||"Moodboard")+" removed from project.");render()}
function openProjectSettingsDialog(projectId){let p=state.projects.find(x=>x.id===projectId);if(!p)return;state.openMenu=null;state.dialog={type:"project-settings",projectId:projectId};render()}
function saveProjectDetails(projectId,patch){let p=state.projects.find(x=>x.id===projectId);if(!p)return;updateProjectDetails(p,patch);persistProjects();state.dialog=null;toast("Project details saved.");render()}
function projectPickerHelpers(){return {esc,escA,icon,state,itemsForCollection}}
function renameCollection(colId,name){let renamed=null;state.cols=state.cols.map(c=>c.id===colId?(renamed=Object.assign({},c,{name:name.trim()})):c);save(S.cols,state.cols);if(renamed)syncRemoteCollection(renamed,"rename");broadcastExtensionCollections();toast("Collection renamed.")}
function deleteCollectionById(colId){let c=state.cols.find(x=>x.id===colId);if(!c||c.system)return;syncRemoteCollection(c,"delete");state.cols=state.cols.filter(x=>x.id!==colId).map(col=>col.parentId===colId?Object.assign({},col,{parentId:""}):col);state.items=state.items.map(i=>{let ids=(i.collectionIds||[]).filter(id=>id!==colId);return Object.assign({},i,{collectionIds:ids.length?ids:["all"]})});if(state.col===colId)state.col="all";save(S.cols,state.cols);save(S.items,state.items);broadcastExtensionCollections();toast("Collection deleted. Items stayed in My Vault.")}
function createProject(name){let p={id:id(),name:name.trim(),description:"",collectionIds:[],boards:[{id:id(),name:"Moodboard",objects:[]}],pinnedAt:0};state.projects=state.projects.concat(p);state.activeProject=p.id;state.activeBoard=p.boards[0].id;state.view="project";persistProjects();toast("Project created.")}
function togglePinProject(projectId){let p=state.projects.find(x=>x.id===projectId);if(!p)return;p.pinnedAt=p.pinnedAt?0:Date.now();persistProjects();state.openMenu=null;toast(p.pinnedAt?"Project pinned to top.":"Project unpinned.");render()}
function sortedProjects(){let order=new Map(state.projects.map((p,i)=>[p.id,i]));return state.projects.slice().sort((a,b)=>{let aPin=Number(a.pinnedAt)||0,bPin=Number(b.pinnedAt)||0;if(aPin!==bPin)return bPin-aPin;return(order.get(a.id)||0)-(order.get(b.id)||0)})}
function renameProject(projectId,name){let p=state.projects.find(x=>x.id===projectId);if(!p)return;p.name=name.trim()||p.name;persistProjects();toast("Project renamed.");render()}
function deleteProject(projectId){state.projects=state.projects.filter(x=>x.id!==projectId);state.moodboards=(state.moodboards||[]).filter(b=>b.projectId!==projectId);if(state.activeProject===projectId){let next=state.projects[0];state.activeProject=next&&next.id||"";state.activeBoard=next&&next.boards&&next.boards[0]&&next.boards[0].id||"";if(state.view==="project"||state.view==="board")state.view="projects"}persistProjects();persistMoodboards();toast("Project deleted.");render()}
function createBoard(projectId,name){let p=state.projects.find(x=>x.id===projectId)||project(),bd={id:id(),name:name.trim(),objects:[]};p.boards=(p.boards||[]).concat(bd);state.activeProject=p.id;state.activeBoard=bd.id;state.view="moodboards";persistProjects();toast("Moodboard created.")}
function renameBoardRef(raw,name){let r=boardRef(raw),p=state.projects.find(x=>x.id===r.projectId),bd=p&&p.boards&&p.boards.find(x=>x.id===r.boardId);if(!bd)return;bd.name=name.trim();persistProjects();toast("Moodboard renamed.")}
function deleteBoardRef(raw){let r=boardRef(raw),p=state.projects.find(x=>x.id===r.projectId),bd=p&&p.boards&&p.boards.find(x=>x.id===r.boardId);if(!bd)return;p.boards=p.boards.filter(x=>x.id!==bd.id);if(state.activeBoard===bd.id){state.activeBoard=(p.boards[0]&&p.boards[0].id)||"";state.selectedObject=null;if(state.view==="board")state.view="moodboards"}persistProjects();toast("Moodboard deleted.")}
function buildVaultExportPayload(){return{exportedAt:new Date().toISOString(),app:"a-plus-vault",version:"0.1.0",user:state.user,settings:{theme:state.theme,rightWidth:state.rightWidth,sortBy:state.sortBy},items:state.items,collections:state.cols,projects:state.projects,importedCaptures:load(S.captures,[])}}
async function exportVaultDataRemote(){toast("Preparing your export…");try{let r=await vaultRemote.exportAccountData();window.open(r.url,"_blank","noopener");toast("Export ready. The link works for one hour.")}catch(err){toast(err.message||"Could not create the export.")}}
function exportVaultData(){if(vaultRemote.enabled&&vaultRemote.hasSession&&vaultRemote.hasSession()){exportVaultDataRemote();return}let blob=new Blob([JSON.stringify(buildVaultExportPayload(),null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="a-plus-vault-export-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);toast("Vault data exported.")}
async function clearLocalVaultData(){await vaultRemote.signOut().catch(()=>{});Object.values(S).forEach(key=>localStorage.removeItem(key));state.user=null;state.profileMenu=false;state.items=[];state.cols=ensureCoreCols(normalizeCols(DEFAULT_COLS.filter(c=>c.system)));state.projects=normalizeProjects([],[]);state.moodboards=[];state.selectedIds=[];state.activeMoodboard=null;state.theme="system";state.selected=null;state.view="vault";state.modal=false;state.dialog=null;applyTheme();toast("Local Vault data cleared.");render()}
function openDeleteAccountDialog(){if(vaultRemote.enabled&&vaultRemote.hasSession&&vaultRemote.hasSession()){state.dialog={type:"text",title:"Delete my Vault data",label:"Type DELETE MY VAULT DATA to confirm",value:"",extra:()=>"<p class='app-dialog-note'>This permanently deletes your items, collections, projects, moodboards, share links and uploaded files from A+ Vault. Your A+ login is shared with other Aplus apps and is kept. Export first if you want a copy.</p>",confirmText:"Delete everything",danger:true,onConfirm:async value=>{try{await vaultRemote.deleteAccountData(String(value||"").trim());toast("Your Vault data was deleted.");await clearLocalVaultData()}catch(err){toast(err.message||"Could not delete your data.");render()}}};render();return}openConfirmDialog({title:"Clear local Vault data",message:"This session uses local browser storage only. Remove all items, collections, projects, and moodboards from this browser? Export first if you want a backup.",confirmText:"Clear everything",danger:true,onConfirm:clearLocalVaultData})}
async function syncRemoteItem(item,mode){if(!vaultRemote.enabled||!vaultRemote.hasSession())return;try{await ensureRemoteCollectionsForItem(item);let row=mode==="update"?await vaultRemote.updateItem(item):await vaultRemote.saveItem(item);if(row&&row.id&&!item.remoteId){state.items=state.items.map(x=>x.id===item.id?Object.assign({},x,{remoteId:row.id}):x);save(S.items,state.items);if((state.moodboards||[]).length)syncRemoteMoodboards()}}catch(err){console.warn("A+ Vault remote item sync failed",err)}}
async function ensureRemoteCollectionsForItem(item){let ids=(item.collectionIds||[]).filter(colId=>colId&&colId!=="all"),changed=false;for(let colId of ids){let c=state.cols.find(x=>x.id===colId&&!x.system);if(!c||c.remoteId)continue;let row=await vaultRemote.saveCollection(c);if(row&&row.id){c.remoteId=row.id;changed=true}}if(changed)save(S.cols,state.cols)}
async function syncRemoteDeleteItem(item){if(!vaultRemote.enabled||!vaultRemote.hasSession())return;try{await vaultRemote.deleteItem(item)}catch(err){console.warn("A+ Vault remote item delete failed",err)}}
async function syncRemoteCollection(collection,mode){if(!vaultRemote.enabled||!vaultRemote.hasSession())return;try{let row=null;if(mode==="create")row=await vaultRemote.saveCollection(collection);if(mode==="rename")row=await vaultRemote.renameCollection(collection);if(mode==="delete")await vaultRemote.deleteCollection(collection);if(row&&row.id&&!collection.remoteId){state.cols=state.cols.map(c=>c.id===collection.id?Object.assign({},c,{remoteId:row.id}):c);save(S.cols,state.cols)}}catch(err){console.warn("A+ Vault remote collection sync failed",err)}}
async function syncRemoteProjects(){if(!vaultRemote.enabled||!vaultRemote.hasSession()||!vaultRemote.saveProjects)return;try{let updated=await vaultRemote.saveProjects(state.projects);if(updated&&updated.length){state.projects=updated;save(S.projects,state.projects)}}catch(err){console.warn("A+ Vault remote project sync failed",err)}}
function detailSourceLine(i){if(!i.sourceUrl)return"<span class='detail-top-source muted'>Private note</span>";return"<a class='detail-top-source' href='"+escA(safeHref(i.sourceUrl))+"' target='_blank' rel='noreferrer' title='"+escA(i.sourceUrl)+"'>"+esc(shortUrl(i.sourceUrl))+"</a>"}
function publicShell(inner,showLogin){return "<div class='public-shell'><header class='public-topbar'><button class='public-brand-link' data-view='home' aria-label='A+ Vault home'>"+brandMark()+"</button>"+(showLogin?"<button class='public-login-button' data-view='login'>Build your Vault</button>":"<span></span>")+"</header>"+inner+legalFooter()+(state.toast?"<div class='toast'>"+esc(state.toast)+"</div>":"")+"</div>"}
function legalFooter(){return "<footer class='legal-footer'><div><strong>Private by default.</strong><span>Saving a reference does not grant usage rights.</span></div><nav><a href='./legal.html#privacy'>Privacy</a><a href='./legal.html#terms'>Terms</a><a href='./legal.html#copyright'>Copyright</a><a href='./legal.html#ai'>AI Notice</a><a href='./legal.html#security'>Security</a></nav></footer>"}
function publicHomeView(){return publicShell(captureMarkup(false),true)}
function publicObjectView(){let i=state.items.find(x=>x.id===(state.publicObject||state.selected));if(!i)return publicShell("<main class='shared-object-page'><section class='empty-state'><div><h2>Object not found.</h2><p>This shared object may be private or no longer available.</p><button class='primary-button' data-view='login'>Try to your Vault</button></div></section></main>",true);let a=i.analysis||{};return publicShell("<main class='shared-object-page'><section class='shared-object-hero'><div class='shared-object-copy'><span class='object-type-pill'>"+esc(L[i.type])+" object</span><h1>"+esc(i.title)+"</h1><p>"+esc(i.note||a.summary||"A saved creative reference from A+ Vault.")+"</p><div class='shared-object-actions'><a class='primary-button' href='"+escA(appHomeUrl())+"'>Try to your Vault</a>"+(i.sourceUrl?"<a class='ghost-button' href='"+escA(safeHref(i.sourceUrl))+"' target='_blank' rel='noreferrer'>Open source</a>":"")+"</div></div><div class='shared-object-preview'>"+media(i)+"</div></section><section class='shared-object-details'><article><span class='section-label'>Source</span>"+detailSourceLine(i)+"</article><article><span class='section-label'>Keyword</span><div class='tag-row'>"+(a.tags||[]).map(t=>"<span class='tag'>"+esc(t)+"</span>").join("")+"</div></article><article><span class='section-label'>Colors</span><div class='palette-row'>"+(a.colors||[]).map(c=>swatch(c,false)).join("")+"</div></article></section></main>",true)}
function authView(){return publicShell("<main class='auth-screen premium-auth'><section class='auth-copy'>"+brand({sidebar:true})+"<h1>A+ Vault</h1><p>Premium creative reference vault. Save objects from anywhere, organize with context, and turn them into project direction.</p></section><aside class='auth-panel'><div class='auth-box'><h2>Build your Vault</h2><p><strong>Quick demo:</strong> creative@aplus.local / aplusvault stays local in your browser.<br><strong>Real account:</strong> use your email + password, or Continue with Google.</p><form class='auth-form' data-auth><label>Email<input name='email' type='email' value='"+escA(state.user&&state.user.email||"creative@aplus.local")+"' required></label><label>Password<input name='password' type='password' value='aplusvault' required></label><div class='auth-action-row'><button class='primary-button' data-auth-action='login'>Log in</button><button class='ghost-button' data-auth-action='signup'>Create account</button></div></form><button class='google-button' data-google-login>"+icon("google")+"<span>Continue with Google</span></button><p class='auth-demo-note'>After login, open Profile and copy your extension sync token for the Chrome extension.</p></div></aside></main>",false)}
function searchHintChips(){return[["minimal","Style"],["branding","Style"],["campaign","Style"],["image","Type"],["note","Type"],["coral","Color"],["dark","Color"],["this week","Time"],["this month","Time"]].map(h=>"<button type='button' class='search-hint-chip' data-search-hint='"+escA(h[0])+"'><span>"+esc(h[0])+"</span><small>"+esc(h[1])+"</small></button>").join("")}

/* Engine (phase 06): taxonomy + sentence parser, lazy-loaded; own-vault #tag search and Smart Collections run on analysis.tagIds/colors */
function ensureEngine(){if(engineKick)return;engineKick=true;loadEngine().then(e=>{ENGINE=e;if(e&&(state.q||state.cols.some(c=>c.smart)))render();if(e&&state.discover.openItem&&document.querySelector(".discover-detail-backdrop"))mountDiscoverDetail(state.discover.openItem)})}
function engineParsed(text){if(!ENGINE)return null;let t=String(text||"");if(!engineParseCache.has(t)){if(engineParseCache.size>50)engineParseCache.clear();engineParseCache.set(t,ENGINE.parse(t))}return engineParseCache.get(t)}
function engineTagIds(i){let a=i.analysis||{};return Array.isArray(a.tagIds)?a.tagIds:[]}
function tagTokenHit(i,token){if(token.charAt(0)!=="#"||/^#[0-9a-f]{3,8}$/i.test(token))return null;let w=token.slice(1).toLowerCase();if(w.length<2)return false;if(itemHasKeyword(i,w))return true;let id=ENGINE&&ENGINE.tax.lookup(w);return !!(id&&engineTagIds(i).includes(id))}
function engineTokenHit(i,token){if(!ENGINE)return false;let ids=engineTagIds(i);if(!ids.length)return false;let id=ENGINE.tax.lookup(token);return !!(id&&ids.includes(id))}
function smartMatch(i,smart){let p=engineParsed(smart.text);if(!p)return false;let ids=new Set(engineTagIds(i));for(let x of p.exclude)if(ids.has(x))return false;let need=p.include.filter(t=>t.required);if(need.some(t=>!ids.has(t.id)))return false;let tot=0,got=0;for(let t of p.include){tot+=t.weight;if(ids.has(t.id))got+=t.weight}if(!tot)return false;return got/tot>=ENGINE.cfg.MIN_SCORE}
function saveSmartSearch(){let text=String(state.q||"").trim();if(!text)return;let p=engineParsed(text);if(!p||!p.include.length){toast("Type a few style or type words first.");return}let c=createCollection(text.slice(0,48),{keepView:false,skipToast:true});c.smart={text:text.slice(0,600),taxVersion:1};state.cols=state.cols.map(x=>x.id===c.id?c:x);save(S.cols,state.cols);state.q="";state.searchOpen=false;toast("Smart collection created. New matches join it automatically.");render()}
document.addEventListener("click",e=>{let b=e.target&&e.target.closest?e.target.closest("[data-smart-save]"):null;if(!b)return;e.preventDefault();e.stopPropagation();saveSmartSearch()},true);

/* Image viewer (phase 07): palette copy, tag pins, B&W + peek, thirds, continue strip, breadcrumb, bottom sheet. Stored data only. */
/* Tag rows show at most 2 lines; a toggle reveals the rest. */
function clampTagRows(root){(root||document).querySelectorAll(".discover-tags,.viewer-tags .tag-row").forEach(row=>{if(row.dataset.clamped)return;row.dataset.clamped="1";row.classList.add("tags-clamped");let kids=[...row.children],first=kids[0];if(!first)return;let lineH=first.offsetHeight||30,hidden=kids.filter(k=>k.offsetTop-first.offsetTop>=lineH*1.5*1.2&&k.offsetTop-first.offsetTop>lineH*1.2).length;let rows=new Set(kids.map(k=>k.offsetTop)).size;if(rows<=2){row.classList.remove("tags-clamped");return}let rowsTops=[...new Set(kids.map(k=>k.offsetTop))].sort((a,b)=>a-b),limit=rowsTops[2],extra=kids.filter(k=>k.offsetTop>=limit).length;let btn=document.createElement("button");btn.type="button";btn.className="tags-toggle";btn.setAttribute("aria-expanded","false");btn.textContent="+"+extra+" more";btn.addEventListener("click",()=>{let open=row.classList.toggle("tags-open");btn.setAttribute("aria-expanded",open?"true":"false");btn.textContent=open?"Show fewer":"+"+extra+" more"});row.insertAdjacentElement("afterend",btn)})}
function viewerView(){let t=VIEWER.trail,last=t.length-1;return{bw:VIEWER.bw,grid:VIEWER.grid,pinned:VIEWER.pinned,excluded:VIEWER.excluded,mode:VIEWER.mode,labelOf:ENGINE?(id=>ENGINE.tax.label(id)):null,trail:t.map((x,i)=>({label:i===last&&i>0?"this image":x.title}))}}
function viewerTrailOpen(item){let ds=state.discover,title=String(item.title||"image").slice(0,24);if(VIEWER.fromContinue&&VIEWER.trail.length){VIEWER.trail.push({id:item.id,title:(VIEWER.mode==="opposite"?"opposite · ":"similar · ")+title})}else if(!VIEWER.keepTrail){VIEWER.trail=[{id:"",title:ds.q?("\u201c"+ds.q.slice(0,24)+"\u201d"):"Discover"},{id:item.id,title:title}];VIEWER.pinned=[];VIEWER.excluded=[]}VIEWER.fromContinue=false;VIEWER.keepTrail=false}
function viewerSyncTrail(item){let n=VIEWER.trail.length;if(n>1){let prefix=VIEWER.trail[n-1].title.match(/^(similar|opposite) · /);VIEWER.trail[n-1]={id:item.id,title:(prefix?prefix[0]:"")+String(item.title||"image").slice(0,24)}}}
async function fillDiscoverSimilar(item,more){let host=document.querySelector("[data-discover-similar-host]");if(!host)return;let S=VIEWER.strip;if(!more){S.id=item.id;S.offset=0;S.done=false;S.items=[];S.busy=false;host.innerHTML="<span class='discover-similar-loading'>Finding similar images\u2026</span>"}if(S.busy||S.id!==item.id)return;S.busy=true;try{let res=await fetch("/api/similar/"+encodeURIComponent(item.id)+"?offset="+S.offset+"&opposite="+(VIEWER.mode==="opposite"?1:0),{headers:{accept:"application/json"}}),body=res.ok?await res.json():null;if(state.discover.openId!==item.id||S.id!==item.id)return;host=document.querySelector("[data-discover-similar-host]");if(!host)return;if(body&&body.success&&(body.items.length||more)){let known=new Set(S.items.map(x=>x.id));S.items=S.items.concat(body.items.filter(x=>!known.has(x.id)));S.offset=body.nextOffset==null?S.offset:body.nextOffset;S.done=body.nextOffset==null;let ds=state.discover;ds.poolRows=(ds.poolRows||[]).concat(body.items.filter(x=>!(ds.poolRows||[]).some(p=>p.id===x.id)));host.innerHTML=continueStripMarkup(S.items,p=>discoverMediaUrl(discoverConfig(),p))}else if(!more&&VIEWER.mode==="similar"){S.busy=false;S.done=true;await fillDiscoverSimilarLocal(item);return}else{S.done=true;host.innerHTML="<span class='discover-similar-loading'>No close matches yet.</span>"}if(!host.dataset.scrollBound){host.dataset.scrollBound="1";host.addEventListener("scroll",()=>{if(!S.done&&!S.busy&&host.scrollLeft+host.clientWidth>=host.scrollWidth-140)fillDiscoverSimilar(item,true)},{passive:true});let bd=host.closest(".discover-detail-backdrop");if(bd&&window.matchMedia("(max-width:1024px)").matches)bd.addEventListener("scroll",()=>{if(!S.done&&!S.busy&&bd.scrollTop+bd.clientHeight>=bd.scrollHeight-500)fillDiscoverSimilar(item,true)},{passive:true})}}catch(err){console.warn("A+ Vault similar failed",err);if(!more&&VIEWER.mode==="similar"){S.busy=false;await fillDiscoverSimilarLocal(item);return}if(host&&host.isConnected)host.innerHTML="<span class='discover-similar-loading'>Similar images are unavailable right now.</span>"}S.busy=false}
async function viewerPicked(hex,from){let root=viewerRoot(from),pal=root&&root.querySelector(".viewer-palette"),ok=await copyHexText(hex),st=pal&&pal.querySelector("[data-viewer-palette-status]");if(st)st.textContent=ok?"Copied "+hex:"Picked "+hex;let chip=root&&root.querySelector("[data-viewer-picked]");if(chip){chip.hidden=false;chip.dataset.viewerCopy=hex;let dot=chip.querySelector("i"),label=chip.querySelector("span");if(dot)dot.style.background=hex;if(label)label.textContent=hex}let find=pal&&pal.querySelector("[data-viewer-find-color]");if(find){find.hidden=false;find.dataset.hex=hex;find.textContent="Find images with "+hex}let bd=from.closest(".discover-detail-backdrop");if(bd)bd.style.setProperty("--ambient",ambientColor(hex))}
function viewerRoot(el){return el.closest(".discover-detail")||el.closest(".drawer-inner")}
function viewerSetBw(on){VIEWER.bw=on;writeBw(on);document.querySelectorAll(".discover-detail,.drawer-inner").forEach(r=>r.classList.toggle("viewer-bw",on));document.querySelectorAll("[data-viewer-bw]").forEach(b=>b.setAttribute("aria-pressed",on?"true":"false"))}
function viewerUpdateTagSearch(){let n=VIEWER.pinned.length+VIEWER.excluded.length;document.querySelectorAll("[data-viewer-search-tags]").forEach(b=>{b.hidden=!n;b.textContent="Search with selected tags ("+n+")"})}
function viewerToggleTag(id,exclude){let p=VIEWER.pinned,x=VIEWER.excluded;if(exclude){if(x.includes(id))VIEWER.excluded=x.filter(v=>v!==id);else{VIEWER.excluded=x.concat(id);VIEWER.pinned=p.filter(v=>v!==id)}}else{if(p.includes(id))VIEWER.pinned=p.filter(v=>v!==id);else{VIEWER.pinned=p.concat(id);VIEWER.excluded=x.filter(v=>v!==id)}}document.querySelectorAll("[data-viewer-tag]").forEach(b=>{let tid=b.dataset.viewerTag;b.setAttribute("aria-pressed",VIEWER.pinned.includes(tid)?"true":"false");b.classList.toggle("is-excluded",VIEWER.excluded.includes(tid))});viewerUpdateTagSearch()}
let viewerPressTimer=0;
document.addEventListener("pointerdown",e=>{let t=e.target&&e.target.closest?e.target.closest("[data-viewer-tag]"):null;if(t){clearTimeout(viewerPressTimer);viewerPressTimer=setTimeout(()=>{VIEWER.suppressClick=true;viewerToggleTag(t.dataset.viewerTag,true)},LONG_PRESS_MS);return}let media=e.target&&e.target.closest?e.target.closest(".discover-detail-media,.detail-preview"):null;if(media&&e.button===0){let r=viewerRoot(media);if(r&&r.classList.contains("viewer-bw"))r.classList.add("viewer-peek")}});
["pointerup","pointercancel","pointerleave"].forEach(ev=>document.addEventListener(ev,()=>{clearTimeout(viewerPressTimer);document.querySelectorAll(".viewer-peek").forEach(n=>n.classList.remove("viewer-peek"))},true));
document.addEventListener("click",async e=>{let t=e.target&&e.target.closest?e.target:null;if(!t)return;let a;
if((a=t.closest("[data-viewer-copy]"))){e.preventDefault();e.stopPropagation();viewerPicked(a.dataset.viewerCopy,a);return}
if((a=t.closest("[data-viewer-pick]"))){e.preventDefault();e.stopPropagation();let host=viewerRoot(a),img=host&&host.querySelector(".discover-detail-media img,.detail-preview img");if(!img)return;let on=a.getAttribute("aria-pressed")!=="true";a.setAttribute("aria-pressed",on?"true":"false");host.classList.toggle("viewer-picking",on);if(on)toast("Click a spot on the image to pick its color.");return}
if(t.closest(".viewer-picking")&&(a=t.closest(".discover-detail-media img,.detail-preview img"))){e.preventDefault();e.stopPropagation();let host=viewerRoot(a),hex=await pickColorAt(a,e.clientX,e.clientY);if(host){host.classList.remove("viewer-picking");host.querySelectorAll("[data-viewer-pick]").forEach(b=>b.setAttribute("aria-pressed","false"))}if(hex)viewerPicked(hex,a);else toast("This image does not allow picking. Use a swatch instead.");return}
if((a=t.closest("[data-viewer-find-color]"))){e.preventDefault();e.stopPropagation();let hex=a.dataset.hex;if(!hex)return;if(a.closest(".discover-detail")){closeDiscoverItem();let ds=state.discover;if(typeof setDiscoverFilter==="function")setDiscoverFilter({colors:[hex]})}else{state.filterHex=hex;state.selected=null;render()}return}
if((a=t.closest("[data-viewer-bw]"))){e.preventDefault();e.stopPropagation();viewerSetBw(!VIEWER.bw);return}
if((a=t.closest("[data-viewer-grid]"))){e.preventDefault();e.stopPropagation();VIEWER.grid=!VIEWER.grid;document.querySelectorAll(".discover-detail,.drawer-inner").forEach(r=>r.classList.toggle("viewer-grid",VIEWER.grid));document.querySelectorAll("[data-viewer-grid]").forEach(b=>b.setAttribute("aria-pressed",VIEWER.grid?"true":"false"));return}
if((a=t.closest("[data-viewer-tag]"))){e.preventDefault();e.stopPropagation();if(VIEWER.suppressClick){VIEWER.suppressClick=false;return}viewerToggleTag(a.dataset.viewerTag,false);return}
if((a=t.closest("[data-viewer-search-tags]"))){e.preventDefault();e.stopPropagation();if(!ENGINE)return;let q=selectedTagsQuery(VIEWER.pinned,VIEWER.excluded,ENGINE.tax.termById);if(!q)return;closeDiscoverItem();setDiscoverFilter({q});return}
if((a=t.closest("[data-viewer-continue]"))){e.preventDefault();e.stopPropagation();VIEWER.mode=a.dataset.viewerContinue==="opposite"?"opposite":"similar";document.querySelectorAll("[data-viewer-continue]").forEach(b=>b.setAttribute("aria-selected",b.dataset.viewerContinue===VIEWER.mode?"true":"false"));if(state.discover.openItem)fillDiscoverSimilar(state.discover.openItem);return}
if((a=t.closest("[data-viewer-sheet]"))){e.preventDefault();e.stopPropagation();let r=a.closest(".discover-detail"),open=!r.classList.contains("is-sheet-open");r.classList.toggle("is-sheet-open",open);a.setAttribute("aria-expanded",open?"true":"false");return}
if((a=t.closest("[data-viewer-trail]"))){e.preventDefault();e.stopPropagation();let i=Number(a.dataset.viewerTrail);if(!i){VIEWER.trail=[];closeDiscoverItem();return}let step=VIEWER.trail[i];VIEWER.trail=VIEWER.trail.slice(0,i+1);VIEWER.keepTrail=true;if(step&&step.id)openDiscoverItem(step.id);return}
if(t.closest("[data-viewer-from]"))VIEWER.fromContinue=true},true);
document.addEventListener("keydown",e=>{if((e.key==="b"||e.key==="B")&&!e.altKey&&!e.metaKey&&!e.ctrlKey&&!(e.target&&e.target.closest&&e.target.closest("input,textarea,select,[contenteditable]"))&&document.querySelector(".discover-detail,.drawer.open .drawer-inner:not(.drawer-placeholder) .viewer-palette")){e.preventDefault();viewerSetBw(!VIEWER.bw)}});
let viewerTouch=null;
document.addEventListener("touchstart",e=>{let m=e.target&&e.target.closest?e.target.closest(".discover-detail-media"):null;viewerTouch=m&&e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null},{passive:true});
document.addEventListener("touchend",e=>{if(!viewerTouch)return;let t=e.changedTouches[0],dx=t.clientX-viewerTouch.x,dy=t.clientY-viewerTouch.y;viewerTouch=null;if(Math.abs(dx)>60&&Math.abs(dy)<50&&state.discover.openId)stepDiscoverItem(dx<0?1:-1)},{passive:true});
function topOfMindMarkup(){if(state.q.trim()||state.filterKeyword||state.filterHex||state.filterRights||state.vaultImageRef||state.col!=="all"||state.type!=="all")return"";let pins=state.items.filter(i=>i.pinnedAt).sort((a,b)=>b.pinnedAt-a.pinnedAt).slice(0,TOP_OF_MIND_MAX);if(!pins.length)return"";return "<section class='resurface top-of-mind' aria-label='Top of Mind'><div class='resurface-head'><span>Top of Mind</span></div><div class='resurface-row'>"+pins.map(i=>"<button type='button' class='resurface-item' data-resurface='"+escA(i.id)+"'><span class='resurface-thumb'>"+media(i)+"</span><span class='resurface-meta'><strong>"+esc(i.title)+"</strong><small>"+esc(host(i.sourceUrl)||L[i.type]||"")+"</small></span></button>").join("")+"</div></section>"}
function noteHexChips(note){let hexes=Array.from(new Set((String(note||"").match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g)||[]).map(h=>h.length===4?"#"+h[1]+h[1]+h[2]+h[2]+h[3]+h[3]:h).map(h=>h.toLowerCase()))).slice(0,6);return hexes.length?"<div class='note-chips' aria-label='Colors in this note'>"+hexes.map(h=>"<button type='button' class='viewer-picked' data-viewer-copy='"+h+"'><i style='background:"+h+"'></i><span>"+h+"</span></button>").join("")+"</div>":""}
function vaultViewerBlock(i){let list=paletteList(i.analysis);if(!list.length&&!(i.previewUrl||i.thumbnailUrl||i.assetUrl))return"";return paletteStripMarkup(list)+(i.type==="image"||i.previewUrl||i.thumbnailUrl?viewerToolsMarkup({bw:VIEWER.bw,grid:VIEWER.grid}):"")}
async function replaceItemImage(itemId,file){let i=state.items.find(x=>x.id===itemId);if(!i)return;try{checkFile(file);let data=await readFile(await stripUpload(file));patch(i.id,{thumbnailUrl:data,previewUrl:data,importStatus:"ok"});toast("Image added. It stays private to your Vault.");render()}catch(err){toast(err.message||"Could not use this image.")}}
document.addEventListener("change",e=>{let inp=e.target&&e.target.closest?e.target.closest("[data-replace-image]"):null;if(!inp||!inp.files||!inp.files[0])return;replaceItemImage(inp.dataset.replaceImage,inp.files[0]);inp.value=""});

/* Trash (phase 09): deleted items wait 30 days, then are gone for good. Local-first, same as the Vault. */
function trashLoad(){return trashPurge(load(TRASH_KEY,[]))}
function trashPut(i){try{save(TRASH_KEY,trashAdd(trashLoad(),JSON.parse(JSON.stringify(i))))}catch(e){}}
function trashPurgeNow(){try{let all=load(TRASH_KEY,[]),kept=trashPurge(all);if(kept.length!==all.length)save(TRASH_KEY,kept)}catch(e){}}
function mountTrash(){document.querySelectorAll(".trash-backdrop").forEach(n=>n.remove());let list=trashLoad(),host=document.querySelector(".app-shell")||document.body;host.insertAdjacentHTML("beforeend","<div class='trash-backdrop' data-trash-close role='presentation'><section class='trash-dialog' role='dialog' aria-modal='true' aria-labelledby='trash-title'><header><h2 id='trash-title'>Trash</h2><button type='button' class='icon-button' data-trash-close aria-label='Close'>"+icon("close")+"</button></header><p class='trash-note'>Deleted items stay here for "+TRASH_DAYS+" days, then are removed for good.</p>"+(list.length?"<ul class='trash-list'>"+list.map(e=>"<li><span class='trash-title'>"+esc(e.item.title||"Untitled")+"</span><small>"+daysLeft(e)+" days left</small><button type='button' class='ghost-button' data-trash-restore='"+escA(e.item.id)+"'>Restore</button><button type='button' class='ghost-button danger' data-trash-delete='"+escA(e.item.id)+"'>Delete now</button></li>").join("")+"</ul><button type='button' class='ghost-button danger' data-trash-empty>Empty Trash</button>":"<p class='trash-empty'>Trash is empty.</p>")+"</section></div>");let c=host.querySelector(".trash-dialog button");if(c)c.focus()}
document.addEventListener("click",e=>{let t=e.target&&e.target.closest?e.target:null;if(!t)return;let a;if((a=t.closest("[data-open-trash]"))){e.preventDefault();e.stopPropagation();state.profileMenu=false;mountTrash();return}if(t.closest(".trash-dialog")&&!t.closest("[data-trash-close]")){if((a=t.closest("[data-trash-restore]"))){let id=a.dataset.trashRestore,e2=trashLoad().find(x=>x.item.id===id);if(e2){let it=e2.item;state.items=[it].concat(state.items.filter(x=>x.id!==id));save(S.items,state.items);save(TRASH_KEY,trashRemove(trashLoad(),id));syncRemoteItem(it,"create");toast("Restored.");render();mountTrash()}return}if((a=t.closest("[data-trash-delete]"))){save(TRASH_KEY,trashRemove(trashLoad(),a.dataset.trashDelete));mountTrash();return}if(t.closest("[data-trash-empty]")){save(TRASH_KEY,[]);mountTrash()}return}if(t.closest("[data-trash-close]"))document.querySelectorAll(".trash-backdrop").forEach(n=>n.remove())},true);
document.addEventListener("change",e=>{let t=e.target&&e.target.closest?e.target.closest("[data-consent-toggle]"):null;if(!t)return;let purpose=t.dataset.consentToggle,on=t.checked;writeConsent(purpose,on);if(vaultRemote.enabled&&vaultRemote.hasSession&&vaultRemote.hasSession())vaultRemote.logConsent(purpose,on,POLICY_VERSION);toast(on?"Turned on.":"Turned off.")});
function headerSearchMarkup(){let open=!!state.searchOpen,q=state.q.trim(),matchCount=q?filtered().length:0;return "<div class='header-search-group "+(open?"open":"")+(q?" has-query":"")+"'><button type='button' class='search-toggle icon-button "+(open||q?"active":"")+"' data-search-toggle aria-label='Search vault' aria-expanded='"+(open?"true":"false")+"'>"+icon("search")+(q?"<i class='search-dot'></i>":"")+"</button>"+(open?"<div class='search-popup' data-search-popup role='dialog' aria-label='Search vault'><label class='search-popup-field'><span class='search-popup-icon'>"+icon("search")+"</span><input data-search value='"+escA(state.q)+"' placeholder='Style, type, color, keyword, or time…' autocomplete='off' autofocus><button type='button' class='search-clear"+(q?"":" is-hidden")+"' data-search-clear title='Clear search' aria-label='Clear search'>"+icon("close")+"</button></label><label class='vault-image-search'>"+icon("image")+"<span>Search by image</span><input type='file' accept='image/*' data-vault-image-search hidden></label><div class='search-suggest-host' data-search-suggest-host></div>"+savedSearchesMarkup()+"<div class='search-popup-hints'>"+searchHintChips()+"</div>"+(q&&ENGINE?"<div class='search-understood' aria-label='What was understood'>"+engineParsed(q).chips.map(c=>"<span class='discover-understood kind-"+escA(c.kind)+"'>"+(c.kind==="exclude"?"<s>"+esc(c.label)+"</s>":esc(c.label))+"</span>").join("")+"</div>":"")+"<p class='search-popup-meta'>"+(q?matchCount+" match"+(matchCount===1?"":"es")+" · try style, color, keyword, or this week":"Fast search across style, work type, color, keyword, and time")+"</p>"+(q&&ENGINE&&engineParsed(q).include.length?"<button type='button' class='ghost-button smart-save' data-smart-save>Save this search as a collection</button>":"")+"</div>":"")+"</div>"}
function profileLabel(){let email=state.user&&state.user.email||"creative@aplus.local";return ((state.user&&state.user.displayName||"").trim()||email)}
function profileInitials(label){return ((String(label||"A+").match(/[A-Za-z0-9]/g)||["A","+"]).slice(0,2).join("").toUpperCase())}
function profileAvatarMarkup(extraClass){let label=profileLabel(),initials=profileInitials(label),photo=state.user&&state.user.avatarUrl||"",cls="profile-avatar"+(extraClass?" "+extraClass:"");return photo?"<span class='"+cls+" has-photo' style='background-image:url(\""+escA(photo)+"\")' role='img' aria-label='"+escA(label)+"'></span>":"<span class='"+cls+"'>"+esc(initials)+"</span>"}
function profileMenuThemeControl(){let modes=[["light","sun","Light"],["dark","moon","Dark"],["system","half","System"]];return "<div class='profile-menu-switch theme-switch' role='group' aria-label='Theme'>"+modes.map(m=>"<button type='button' class='theme-option "+(state.theme===m[0]?"active":"")+"' data-theme-choice='"+m[0]+"' title='"+m[2]+"' aria-label='"+m[2]+" theme'>"+icon(m[1])+"</button>").join("")+"</div>"}
const GRID_STOPS=[["small","Small",7],["medium","Medium",5],["large","Extra large",3]];
function gridStopIndex(){let m=normalizeLibraryView(state.libraryView);let i=GRID_STOPS.findIndex(x=>x[0]===m);return i<0?1:i}
function profileMenuGridControl(){let i=gridStopIndex();return "<div class='grid-slider' role='group' aria-label='Grid size'><div class='gs-head'><span class='profile-menu-section-label'>Grid</span><span class='gs-value' data-grid-slider-label>"+esc(GRID_STOPS[i][1])+" · "+GRID_STOPS[i][2]+" columns</span></div><div class='gs-track'><input type='range' min='0' max='2' step='1' value='"+i+"' data-grid-slider aria-label='Grid size' aria-valuetext='"+escA(GRID_STOPS[i][1]+", "+GRID_STOPS[i][2]+" columns")+"'><i class='gs-dot' style='left:0'></i><i class='gs-dot' style='left:50%'></i><i class='gs-dot' style='left:100%'></i></div><div class='gs-stops' aria-hidden='true'><span>7</span><span>5</span><span>3</span></div></div>"}
function profileMenuMarkup(){let aplus="https://aplus1.app";return "<div class='profile-menu' data-profile-menu role='menu' aria-label='Account menu'>"+
  "<button type='button' class='profile-menu-item' role='menuitem' data-view='profile'><span>View Profile</span><span class='profile-menu-face profile-avatar' aria-hidden='true'>"+esc(profileInitials(profileLabel()))+"</span></button>"+
  "<button type='button' class='profile-menu-item' role='menuitem' data-view='projects'><span>Projects</span>"+icon("project")+"</button>"+
  "<button type='button' class='profile-menu-item' role='menuitem' data-view='moodboards'><span>Moodboards</span>"+icon("board")+"</button>"+
  "<button type='button' class='profile-menu-item' role='menuitem' data-open-trash><span>Trash</span></button>"+
  "<div class='profile-menu-divider' role='separator'></div>"+
  "<div class='profile-menu-item is-control' role='none'><span>Theme</span>"+profileMenuThemeControl()+"</div>"+
  profileMenuGridControl()+
  "<div class='profile-menu-divider' role='separator'></div>"+
  "<a class='profile-menu-item' role='menuitem' href='/extension'><span>Get the extension</span><svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M12 4v11M7 10l5 5 5-5'/><path d='M5 20h14'/></svg></a>"+
  "<button type='button' class='profile-menu-item' role='menuitem' data-toggle-quick-note aria-pressed='"+(quickNoteEnabled()?"true":"false")+"'><span>Quick note</span><kbd>"+(quickNoteEnabled()?"On":"Off")+"</kbd></button>"+
  "<button type='button' class='profile-menu-item' role='menuitem' data-open-shortcuts><span>Keyboard shortcuts</span><kbd>?</kbd></button>"+
  "<button type='button' class='profile-menu-item' role='menuitem' data-view='settings'><span>Settings</span>"+icon("settings")+"</button>"+
  "<button type='button' class='profile-menu-item is-danger' role='menuitem' data-logout><span>Logout</span>"+icon("logout")+"</button>"+
"</div>"}
function headerProfileButton(){if(!state.user)return"";let open=!!state.profileMenu;return "<div class='header-profile-group "+(open?"open":"")+"'><button type='button' class='header-profile-button"+(open?" active":"")+"' data-profile-menu-toggle title='Account menu' aria-label='Open account menu' aria-expanded='"+(open?"true":"false")+"' aria-haspopup='menu'>"+profileAvatarMarkup("header-avatar")+"</button>"+(open?profileMenuMarkup():"")+"</div>"}
function prefersReducedMotion(){return !!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)}
function openProfileMenu(){clearTimeout(closeProfileMenu._timer);state.searchOpen=false;state.sortMenu=false;state.viewMenu=false;state.profileMenuSettled=false;state.profileMenu=true;render()}
function closeProfileMenu(opts){opts=opts||{};clearTimeout(closeProfileMenu._timer);if(!state.profileMenu)return Promise.resolve();let menu=document.querySelector("[data-profile-menu]"),instant=!!opts.instant||prefersReducedMotion()||!menu;const finish=()=>{state.profileMenu=false;state.profileMenuSettled=false;if(!opts.skipRender)render()};if(instant){finish();return Promise.resolve()}return new Promise(resolve=>{menu.classList.remove("is-open");menu.classList.add("is-closing");let done=false;const end=()=>{if(done)return;done=true;finish();resolve()};menu.addEventListener("transitionend",e=>{if(e.target===menu&&(e.propertyName==="opacity"||e.propertyName==="transform"))end()},{once:true});closeProfileMenu._timer=setTimeout(end,280)})}
function bindProfileMenuMotion(){let menu=document.querySelector("[data-profile-menu]");if(!menu||!state.profileMenu||menu.classList.contains("is-closing"))return;if(prefersReducedMotion()||state.profileMenuSettled){menu.classList.add("is-open","is-settled");state.profileMenuSettled=true;return}if(menu.classList.contains("is-open"))return;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!state.profileMenu||!menu.isConnected)return;menu.classList.add("is-open");clearTimeout(bindProfileMenuMotion._timer);bindProfileMenuMotion._timer=setTimeout(()=>{if(state.profileMenu){state.profileMenuSettled=true;menu.classList.add("is-settled")}},320)}))}
function shell(inner){let gate=!state.user&&!!state.authPrompt&&state.loading!=="vault";return "<div class='app-shell"+(gate?" needs-auth":"")+"'><header class='topbar'><div class='topbar-logo'><button type='button' class='topbar-brand-link' data-view='discover' title='Discover' aria-label='Open Discover'>"+brandMark()+"</button></div>"+topNavMarkup()+(state.view==="discover"?"<div class='topbar-spacer has-discover-search'>"+discoverSearchMarkup(state.discover)+"</div>":"<div class='topbar-spacer' aria-hidden='true'></div>")+"<div class='header-actions'>"+(state.view==="discover"||!state.user?"":headerSearchMarkup())+topUploadMarkup()+headerProfileButton()+(state.user?"":"<button type='button' class='primary-button header-login-button' data-auth-open>Log in</button>")+"</div></header>"+inner+(state.modal?modal():"")+(state.dialog?appDialog():"")+(state.mediaLightbox?mediaLightboxMarkup():"")+(gate?authGateMarkup():"")+(state.toast?"<div class='toast'>"+esc(state.toast)+"</div>":"")+selectionActionsMarkup()+"<button type='button' class='back-to-top' data-back-top hidden title='Back to top' aria-label='Back to top'><svg class='back-to-top-icon' viewBox='0 0 24 24' aria-hidden='true' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M12 19V5'/><path d='m5 12 7-7 7 7'/></svg></button></div>"}
function authPromptReason(){let a=state.authPrompt||{};if(a.type==="keep")return "Log in to keep this image in your Vault.";if(a.type==="view")return "Log in to open your Vault, moodboards, and projects.";return "Log in to save references and build moodboards."}
function authCopy(a){if(a.type==="keep")return{title:"Save it.<br>Sort it later.",sub:"Keep any reference in your private Vault — with its source and credit — and find it again by color, image, or a few words in Thai.",chips:["Private","Source &amp; credit kept","Search by color"]};if(a.type==="view")return{title:"Your Vault<br>is waiting.",sub:"Log in to open your Vault, collections, and moodboards.",chips:["Private","Collections","Moodboards"]};return{title:"Keep what<br>moves you.",sub:"Log in to save references, build moodboards, and find them again.",chips:["Private","Free in alpha","Thai search"]}}
function authStripImages(){let items=(state.discover&&state.discover.items)||[],out=[];for(let i=0;i<12;i++){let it=items[(i*2+1)%Math.max(1,items.length)];out.push(it&&it.image_sm_path?"<img src='"+escA(discoverMediaUrl(discoverConfig(),it.image_sm_path))+"' alt='' draggable='false'>":"<span class='ap-ph' style='--i:"+i+"'></span>")}return out}
function authColsMarkup(imgs){let hs=[[104,138,112,146,100,128],[132,100,146,108,136,104],[110,142,98,130,118,144]],dur=[34,42,38],dir=["up","down","up"],off=[0,-14,-6];return "<div class='ap-cols' aria-hidden='true'>"+[0,1,2].map(c=>{let tiles=[0,1,2,3,4,5].map(k=>"<span class='apc-tile' style='--h:"+hs[c][k]+"px'>"+imgs[(c*4+k)%imgs.length]+"</span>").join("");return "<div class='apc "+dir[c]+"'><div class='apc-track' style='--dur:"+dur[c]+"s;--off:"+off[c]+"s'>"+tiles+tiles+"</div></div>"}).join("")+"</div>"}
function authGateMarkup(){let a=state.authPrompt||{},c=authCopy(a),heights=[118,148,96,132,110,142,100,126],imgs=authStripImages();return "<div class='auth-gate-backdrop' data-auth-close role='dialog' aria-modal='true' aria-label='Log in to A+ Vault'><section class='auth-gate-dialog auth-box auth-pop' data-auth-dialog data-auth-kind='"+escA(a.type||"login")+"'><button type='button' class='auth-gate-close' data-auth-close aria-label='Close'>&times;</button>"+
"<div class='ap-mark'>"+brandMark()+"</div>"+
"<h2 class='ap-title'>"+c.title+"</h2>"+
authColsMarkup(imgs)+
"<div class='ap-chips'>"+c.chips.map(x=>"<span>"+x+"</span>").join("")+"</div>"+
"<div class='ap-pane ap-actions'><button type='button' class='ap-primary' data-google-login>"+icon("google")+"<span>Continue with Google</span></button><button type='button' class='ap-secondary' data-auth-email>Continue with email</button></div>"+
"<div class='ap-pane ap-email'><form class='auth-form ap-form' data-auth><label>Email<input name='email' type='email' value='"+escA(state.user&&state.user.email||"creative@aplus.local")+"' autocomplete='email' required></label><label>Password<input name='password' type='password' value='aplusvault' autocomplete='current-password' required></label><div class='ap-action-row'><button class='ap-primary' data-auth-action='login'>Log in</button><button class='ap-secondary' data-auth-action='signup'>Create account</button></div></form><button type='button' class='ap-back' data-auth-back>&larr; Back</button><p class='ap-note'>Quick demo: creative@aplus.local / aplusvault stays local in your browser.</p></div>"+
"<p class='ap-foot'>Free while in alpha · Private by default</p></section></div>"}
document.addEventListener("click",e=>{let t=e.target&&e.target.closest?e.target:null;if(!t)return;let d=t.closest("[data-auth-dialog]");if(!d)return;if(t.closest("[data-auth-email]")){e.preventDefault();d.classList.add("show-email");let f=d.querySelector("input[name=email]");if(f)setTimeout(()=>f.focus({preventScroll:true}),180);return}if(t.closest("[data-auth-back]")){e.preventDefault();d.classList.remove("show-email")}},true);
function sidebarUploadZone(){if(state.view==="settings"||state.view==="profile")return "";return "<div class='side-section sidebar-upload'><button type='button' class='sidebar-upload-button' data-open title='Upload to Vault' aria-label='Upload to Vault'><span class='side-icon'>"+icon("plus")+"</span><span class='side-label'>Upload</span></button></div>"}
function railCollapseButton(){return "<button class='collapse-button rail-collapse-button' data-toggle-left title='"+(state.leftCollapsed?"Expand sidebar":"Collapse sidebar")+"' aria-label='"+(state.leftCollapsed?"Expand sidebar":"Collapse sidebar")+"'>"+icon(state.leftCollapsed?"expand":"collapse")+"</button>"}
function isWorkspaceViewActive(view){return view==="moodboards"?(state.view==="moodboards"||state.view==="moodboard-edit"||state.view==="board"):view==="projects"?(state.view==="projects"||state.view==="project"):state.view===view}
function topNavMarkup(){return "<nav class='topbar-nav' aria-label='Main'>"+WORKSPACE_VIEWS.filter(v=>v[0]!=="collections").map(v=>{let active=isWorkspaceViewActive(v[0]);return "<button type='button' class='topbar-nav-link"+(active?" is-active":"")+"' data-view='"+v[0]+"'"+(active?" aria-current='page'":"")+" data-label='"+escA(v[2])+"'><span>"+v[2]+"</span></button>"}).join("")+"<a class='topbar-nav-link' href='/extension' data-label='Extension'><span>Extension</span></a></nav>"}
function topUploadMarkup(){if(state.view==="settings"||state.view==="profile")return "";return "<button type='button' class='topbar-upload' data-open title='Keep something in your Vault' aria-label='Keep in Vault'>"+icon("plus")+"<span>Keep</span></button>"}
window.matchMedia(DESKTOP_TOP_NAV).addEventListener("change",()=>render());
initPwa({toast});initScrollBlur({enabled:()=>["discover","vault","collections"].includes(state.view)&&!state.discover.openId&&!state.discover.saveFor,topEnabled:()=>state.view!=="moodboard-edit"&&!isMobileViewport()});
function navKeepButton(){return "<button type='button' class='rail-keep' data-open title='Keep something' aria-label='Keep something'>"+icon("plus")+"</button>"}
function navPhoneButtons(){return "<button type='button' class='side-nav-button nav-extra' data-phone-search title='Search' aria-label='Search'><span class='side-icon'>"+icon("search")+"</span><span class='side-label'>Search</span></button>"+(state.user?"<button type='button' class='side-nav-button nav-extra nav-profile' data-profile-menu-toggle title='Account' aria-label='Open account menu' aria-haspopup='menu'><span class='side-icon'>"+profileAvatarMarkup("nav-avatar")+"</span><span class='side-label'>Account</span></button>":"<button type='button' class='side-nav-button nav-extra nav-profile' data-auth-open title='Log in' aria-label='Log in'><span class='side-icon'>"+icon("users")+"</span><span class='side-label'>Log in</span></button>")}
function collectionNoteMarkup(colId){let c=state.cols.find(x=>x.id===colId);if(!c||c.system)return"";let ps=state.projects.filter(p=>projectCollectionIds(p).includes(colId));return "<section class='collection-note-box'><div class='collection-in-projects'><span>"+(ps.length?"In "+ps.length+" project"+(ps.length===1?"":"s"):"Not in any project yet")+"</span>"+ps.map(p=>"<button type='button' class='object-glance-chip' data-project='"+escA(p.id)+"'>"+esc(p.name)+"</button>").join("")+"</div></section>"}
/* Studio search: rank collections / moodboards by name, image titles, tags, colors; fall back to the closest names */
function studioDice(a,b){a=String(a||"").toLowerCase();b=String(b||"").toLowerCase();if(!a||!b)return 0;let bg=t=>{let m=new Map();for(let i=0;i<t.length-1;i++){let k=t.slice(i,i+2);m.set(k,(m.get(k)||0)+1)}return m},x=bg(a),y=bg(b),hit=0,n=0;x.forEach((v,k)=>{n+=v;if(y.has(k))hit+=Math.min(v,y.get(k))});y.forEach(v=>{n+=v});return n?2*hit/n:0}
function studioScore(name,items,q){let parsed=parseSearchQuery(q),tokens=parsed.tokens;if(!tokens.length)return{score:1,exact:true};let nm=String(name||"").toLowerCase(),score=0,hits=0;tokens.forEach(tok=>{let t=expandSearchToken(tok),inName=nm.includes(tok)||nm.includes(t),n=items.length?items.filter(i=>itemMatchesSearch(i,{tokens:[tok],since:0})).length:0;if(inName){score+=10;hits++}if(n){score+=Math.min(n,4)*2+3*n/items.length;hits++}});return{score,exact:hits>0&&tokens.every(tok=>{let t=expandSearchToken(tok);return nm.includes(tok)||nm.includes(t)||items.some(i=>itemMatchesSearch(i,{tokens:[tok],since:0}))})}}
function studioRank(entries,q){let tokens=parseSearchQuery(q).tokens;if(!tokens.length)return{list:entries.map(e=>e.ref),note:""};let scored=entries.map(e=>Object.assign({e},studioScore(e.name,e.items,q))),hits=scored.filter(x=>x.score>0).sort((a,b)=>b.score-a.score);if(hits.length)return{list:hits.map(x=>x.e.ref),note:hits.length+" result"+(hits.length===1?"":"s")+" for “"+String(q).trim()+"”"};let near=entries.map(e=>({e,d:Math.max(studioDice(e.name,q),...e.items.slice(0,40).map(i=>studioDice(i.title,q)))})).sort((a,b)=>b.d-a.d).slice(0,3).map(x=>x.e.ref);return{list:near,note:"No exact match for “"+String(q).trim()+"”. Closest:"}}
function studioSearchMarkup(kind,value,placeholder){return "<label class='studio-search'>"+icon("search")+"<input type='search' data-studio-search='"+kind+"' value='"+escA(value||"")+"' placeholder='"+escA(placeholder)+"' autocomplete='off'></label>"}
function collectionsFiltered(){let all=customCols(),q=state.collectionsQ||"";if(!String(q).trim()){return{list:rootCustomCols().flatMap(c=>[c].concat(childCols(c.id))),note:""}}return studioRank(all.map(c=>({name:c.name,items:itemsForCollection(c.id),ref:c})),q)}
function moodboardItemsOf(b){return (b.objects||[]).filter(o=>o&&o.kind==="item"&&o.itemId).map(o=>state.items.find(i=>i.id===o.itemId)).filter(Boolean)}
function moodboardsFiltered(){let list=(state.moodboards||[]).slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)),q=state.moodboardsQ||"";if(!String(q).trim())return{list,note:""};return studioRank(list.map(b=>({name:b.name,items:moodboardItemsOf(b).concat((b.objects||[]).filter(o=>o&&o.kind==="text").map(o=>({title:o.text,note:"",analysis:{}}))),ref:b})),q)}
let studioSearchTimer=null;
document.addEventListener("input",e=>{let t=e.target&&e.target.matches&&e.target.matches("[data-studio-search]")?e.target:null;if(!t)return;clearTimeout(studioSearchTimer);studioSearchTimer=setTimeout(()=>{let kind=t.dataset.studioSearch;if(kind==="collections"){state.collectionsQ=t.value;let r=collectionsFiltered(),g=document.querySelector(".collection-overview-grid"),n=document.querySelector("[data-studio-note='collections']");if(g)g.innerHTML=r.list.map(collectionCard).join("")||"<p class='studio-empty'>Nothing here yet.</p>";if(n)n.textContent=r.note}else{state.moodboardsQ=t.value;let r=moodboardsFiltered(),g=document.querySelector(".moodboard-index-grid"),n=document.querySelector("[data-studio-note='moodboards']");if(g)g.innerHTML=moodboardCardsMarkup(r.list);if(n)n.textContent=r.note}},180)});
function moodboardThumbFor(id){let i=state.items.find(x=>x.id===id);return i&&(i.thumbnailUrl||i.previewUrl||(i.type==="image"?i.assetUrl:""))||""}
function moodboardCardsMarkup(list){return moodboardCardsMarkupMod(list,state.projects,esc,escA,icon,moodboardThumbFor)}
function moodboardListCtx(){let r=moodboardsFiltered();return{moodboards:r.list,keepOrder:true,total:(state.moodboards||[]).length,projects:state.projects,esc,escA,icon,emptyPrimary:"Open My Vault",thumbFor:moodboardThumbFor,searchMarkup:studioSearchMarkup("moodboards",state.moodboardsQ,"Search moodboards, images or colors…"),note:r.note}}
document.addEventListener("click",e=>{let b=e.target&&e.target.closest?e.target.closest("[data-project-scope]"):null;if(!b)return;e.preventDefault();e.stopPropagation();state.projectExplorerScope="all";state.activeProject=null;state.view="projects";render()},true);

/* moodboard editor: zoom, fit, pan, inspector visibility, tool shortcuts */
function mbZoom(){let z=Number(state.moodboardZoom)||1;return Math.min(2,Math.max(.25,z))}
function mbHasSelection(){return !!(state.selectedObject||(state.selectedObjectIds||[]).length)}
function mbInspectorHidden(){let m=state.moodboardInspectorMode||"auto";return m==="open"?false:m==="closed"?true:!mbHasSelection()}
function mbSetZoom(z,anchor){let wrap=document.querySelector("[data-mb-canvas-wrap]"),canvas=document.querySelector("[data-smart-grid-canvas]");if(!canvas)return;let old=mbZoom(),next=Math.min(2,Math.max(.25,Math.round(z*100)/100));state.moodboardZoom=next;let cx=0,cy=0;if(wrap){let r=wrap.getBoundingClientRect();cx=anchor?anchor.x-r.left:r.width/2;cy=anchor?anchor.y-r.top:r.height/2;let ux=(wrap.scrollLeft+cx)/old,uy=(wrap.scrollTop+cy)/old;canvas.style.zoom=String(next);wrap.scrollLeft=ux*next-cx;wrap.scrollTop=uy*next-cy}else canvas.style.zoom=String(next);document.querySelectorAll("[data-mb-zoom-label]").forEach(l=>{l.textContent=Math.round(next*100)+"%"})}
function mbFit(){let board=activeMoodboard(),wrap=document.querySelector("[data-mb-canvas-wrap]");if(!board||!wrap)return;let objs=(board.objects||[]).filter(o=>o&&o.kind!=="connector"&&Number(o.w)>0);if(!objs.length){mbSetZoom(1);return}let minX=Math.min(...objs.map(o=>o.x)),minY=Math.min(...objs.map(o=>o.y)),maxX=Math.max(...objs.map(o=>o.x+o.w)),maxY=Math.max(...objs.map(o=>o.y+o.h)),w=maxX-minX+96,h=maxY-minY+160,z=Math.min(wrap.clientWidth/w,wrap.clientHeight/h,1.5);mbSetZoom(z);let canvas=document.querySelector("[data-smart-grid-canvas]");wrap.scrollLeft=Math.max(0,(minX-48)*mbZoom());wrap.scrollTop=Math.max(0,(minY-48)*mbZoom())}
function bindMoodboardZoom(){
  document.querySelectorAll("[data-mb-zoom]").forEach(b=>b.onclick=()=>{let a=b.dataset.mbZoom;if(a==="in")mbSetZoom(mbZoom()*1.2);else if(a==="out")mbSetZoom(mbZoom()/1.2);else if(a==="reset")mbSetZoom(1);else if(a==="fit")mbFit()});
  let wrap=document.querySelector("[data-mb-canvas-wrap]");if(!wrap)return;
  wrap.onwheel=e=>{if(!(e.ctrlKey||e.metaKey))return;e.preventDefault();mbSetZoom(mbZoom()*(e.deltaY<0?1.1:1/1.1),{x:e.clientX,y:e.clientY})};
  let pan=null;
  wrap.onpointerdown=e=>{let onBg=e.target===wrap||e.target.matches&&e.target.matches("[data-smart-grid-canvas],.moodboard-connectors");if(!(e.button===1||(onBg&&(e.button===0&&(window.__mbSpace||state.moodboardTool==="hand")))))return;e.preventDefault();pan={x:e.clientX,y:e.clientY,l:wrap.scrollLeft,t:wrap.scrollTop};wrap.classList.add("is-panning");try{wrap.setPointerCapture(e.pointerId)}catch(_){}};
  wrap.onpointermove=e=>{if(!pan)return;wrap.scrollLeft=pan.l-(e.clientX-pan.x);wrap.scrollTop=pan.t-(e.clientY-pan.y)};
  wrap.onpointerup=wrap.onpointercancel=()=>{pan=null;wrap.classList.remove("is-panning")};
}
if(!window.__mbKeys2){window.__mbKeys2=true;
  document.addEventListener("keydown",e=>{if(e.code==="Space"&&state.view==="moodboard-edit"&&!isTypingTarget(e.target)){window.__mbSpace=true;document.body.classList.add("mb-space")}if(state.view!=="moodboard-edit"||e.metaKey||e.ctrlKey||e.altKey||isTypingTarget(e.target)||state.dialog)return;let map={v:"select",i:"image",u:"upload",t:"text",c:"color",f:"frame"},tool=map[String(e.key).toLowerCase()];if(tool){let b=document.querySelector("[data-moodboard-tool='"+tool+"']");if(b){e.preventDefault();b.click()}}if(e.key==="0"&&!e.shiftKey){mbSetZoom(1)}if(e.key==="1"&&e.shiftKey){mbFit()}});
  document.addEventListener("keyup",e=>{if(e.code==="Space"){window.__mbSpace=false;document.body.classList.remove("mb-space")}})}

/* moodboard editor: duplicate, present mode, PNG export */
function mbDuplicate(objId){mutateActiveMoodboard(draft=>{let o=draft.objects.find(x=>x.id===objId);if(!o||o.kind==="connector")return;let z=Math.max(0,...draft.objects.map(x=>Number(x.zIndex)||0))+1,copy=JSON.parse(JSON.stringify(o));copy.id=id();copy.x=(Number(o.x)||0)+28;copy.y=(Number(o.y)||0)+28;copy.zIndex=z;copy.sortOrder=draft.objects.length;if(copy.style&&copy.style.groupId)delete copy.style.groupId;draft.objects.push(copy);state.selectedObject=copy.id;state.selectedObjectIds=[copy.id]},"duplicate");render()}
document.addEventListener("click",e=>{let d=e.target&&e.target.closest?e.target.closest("[data-mb-duplicate]"):null;if(d){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();mbDuplicate(d.dataset.mbDuplicate);return}let p=e.target&&e.target.closest?e.target.closest("[data-mb-present]"):null;if(p){e.preventDefault();mbPresent(true);return}let x=e.target&&e.target.closest?e.target.closest("[data-mb-export-png]"):null;if(x){e.preventDefault();let det=x.closest("details");if(det)det.open=false;mbExportPng();return}},true);
function mbPresent(on){document.documentElement.classList.toggle("mb-present",on);if(on){mbFit();let b=document.createElement("button");b.type="button";b.className="mb-present-exit";b.textContent="Exit (Esc)";b.onclick=()=>mbPresent(false);document.body.appendChild(b);if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{})}else{document.querySelectorAll(".mb-present-exit").forEach(n=>n.remove());if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{})}}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.documentElement.classList.contains("mb-present"))mbPresent(false)});
document.addEventListener("fullscreenchange",()=>{if(!document.fullscreenElement&&document.documentElement.classList.contains("mb-present"))mbPresent(false)});
function mbLoadImage(src){return new Promise(res=>{let im=new Image();im.crossOrigin="anonymous";im.onload=()=>res(im);im.onerror=()=>res(null);im.src=src})}
async function mbExportPng(){let board=activeMoodboard();if(!board)return;let objs=(board.objects||[]).filter(o=>o&&o.kind!=="connector"&&Number(o.w)>0).sort((a,b)=>(a.zIndex||0)-(b.zIndex||0));if(!objs.length){toast("Nothing to export yet.");return}let pad=48,minX=Math.min(...objs.map(o=>o.x))-pad,minY=Math.min(...objs.map(o=>o.y))-pad,maxX=Math.max(...objs.map(o=>o.x+o.w))+pad,maxY=Math.max(...objs.map(o=>o.y+o.h))+pad,W=maxX-minX,H=maxY-minY,k=Math.min(2,4000/Math.max(W,H)),cv=document.createElement("canvas");cv.width=Math.round(W*k);cv.height=Math.round(H*k);let g=cv.getContext("2d");g.scale(k,k);g.fillStyle=document.documentElement.dataset.theme==="dark"?"#16181b":"#f4f1ea";g.fillRect(0,0,W,H);toast("Preparing PNG…");let tainted=false;for(let o of objs){let x=o.x-minX,y=o.y-minY,w=o.w,h=o.h;g.save();if(o.rotation){g.translate(x+w/2,y+h/2);g.rotate(o.rotation*Math.PI/180);g.translate(-(x+w/2),-(y+h/2))}if(o.kind==="item"){let it=state.items.find(i=>i.id===o.itemId),src=it&&(it.assetUrl||it.previewUrl||it.thumbnailUrl||""),im=src?await mbLoadImage(src):null;if(im){let r=Math.max(w/im.width,h/im.height),sw=w/r,sh=h/r;g.drawImage(im,(im.width-sw)/2,(im.height-sh)/2,sw,sh,x,y,w,h)}else{tainted=true;g.fillStyle="#2c2f33";g.fillRect(x,y,w,h)}}else if(o.kind==="palette"){let cs=(o.colors&&o.colors.length?o.colors:[o.color||"#888"]),cw=w/cs.length;cs.forEach((c,i)=>{g.fillStyle=safeHex(c);g.fillRect(x+i*cw,y,cw,h)})}else if(o.kind==="text"){g.fillStyle=o.color||"#151719";g.font="400 "+(Number(o.size)||28)+"px 'Agrandir Wide','IBM Plex Sans Thai',sans-serif";g.textBaseline="top";String(o.text||"").split("\n").forEach((ln,i)=>g.fillText(ln,x,y+i*(Number(o.size)||28)*1.2))}else if(o.kind==="note"){g.fillStyle="#fff3a6";g.fillRect(x,y,w,h)}else{g.strokeStyle="rgba(127,127,127,.6)";g.lineWidth=2;g.strokeRect(x,y,w,h)}g.restore()}cv.toBlob(b=>{if(!b){toast("Could not export (images blocked by the browser). Try PDF.");return}let a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=(board.name||"moodboard").replace(/[^\w\-]+/g,"-")+".png";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);toast(tainted?"Exported (some images could not load).":"PNG exported.")},"image/png")}

/* layers panel: drag rows to reorder (top of the list = front of the board) */
let mbDragLayer=null;
function mbClearDropMarks(){document.querySelectorAll(".drop-before,.drop-after").forEach(n=>n.classList.remove("drop-before","drop-after"))}
document.addEventListener("dragstart",e=>{let li=e.target&&e.target.closest?e.target.closest("[data-layer-unit]"):null;if(!li)return;mbDragLayer=li;li.classList.add("is-drag");e.dataTransfer.effectAllowed="move";try{e.dataTransfer.setData("text/plain",li.dataset.layerUnit)}catch(_){}});
document.addEventListener("dragover",e=>{if(!mbDragLayer)return;let t=e.target&&e.target.closest?e.target.closest("[data-layer-unit]"):null;if(!t||t===mbDragLayer)return;e.preventDefault();e.dataTransfer.dropEffect="move";let r=t.getBoundingClientRect(),after=e.clientY>r.top+r.height/2;mbClearDropMarks();t.classList.add(after?"drop-after":"drop-before")});
document.addEventListener("drop",e=>{if(!mbDragLayer)return;let t=e.target&&e.target.closest?e.target.closest("[data-layer-unit]"):null;if(!t||t===mbDragLayer){mbClearDropMarks();return}e.preventDefault();let after=t.classList.contains("drop-after");mbClearDropMarks();after?t.after(mbDragLayer):t.before(mbDragLayer);let units=[...mbDragLayer.parentElement.children].filter(x=>x.dataset&&x.dataset.layerUnit),groups=units.map(u=>u.dataset.layerUnit.startsWith("g:")?[...u.querySelectorAll("[data-select-board-obj]")].map(b=>b.dataset.selectBoardObj):[u.dataset.layerUnit.slice(2)]),flat=groups.flat();mutateActiveMoodboard(draft=>{let z=flat.length+1;flat.forEach(id=>{let o=draft.objects.find(x=>x.id===id);if(o)o.zIndex=z;z-=1})},"layer-reorder");mbDragLayer=null;render()});
document.addEventListener("dragend",()=>{if(mbDragLayer)mbDragLayer.classList.remove("is-drag");mbDragLayer=null;mbClearDropMarks()});

/* FigJam-style connectors: drag a dot on an object's edge to another object */
function mbCreateConnector(fromId,toId){if(!fromId||!toId||fromId===toId)return;mutateActiveMoodboard(draft=>{if(draft.objects.some(o=>o.kind==="connector"&&((o.fromId===fromId&&o.toId===toId)||(o.fromId===toId&&o.toId===fromId)))){toast("Already connected.");return}let o=normalizeMoodboardObject({id:id(),kind:"connector",fromId,toId,color:"#ff4f43",style:{line:state.moodboardConnStyle||"elbow"},sortOrder:draft.objects.length,zIndex:0});draft.objects=draft.objects.concat(o);state.selectedObject=o.id;state.selectedObjectIds=[o.id]},"add-connector");render()}
document.addEventListener("pointerdown",e=>{let h=e.target&&e.target.closest?e.target.closest("[data-mb-conn]"):null;if(!h||e.button!==0)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();let board=activeMoodboard(),canvas=document.querySelector("[data-smart-grid-canvas]"),svg=document.querySelector("[data-moodboard-connectors]");if(!board||!canvas||!svg)return;let fromId=h.dataset.mbConn,from=(board.objects||[]).find(o=>o.id===fromId);if(!from)return;let ns="http://www.w3.org/2000/svg",path=document.createElementNS(ns,"path");path.setAttribute("class","connector-line mb-conn-draft");path.setAttribute("fill","none");svg.appendChild(path);let side=h.dataset.mbSide,sx=side==="w"?from.x:side==="e"?from.x+from.w:from.x+from.w/2,sy=side==="n"?from.y:side==="s"?from.y+from.h:from.y+from.h/2,over=null;const toCanvas=ev=>{let r=canvas.getBoundingClientRect(),z=mbZoom();return{x:(ev.clientX-r.left)/z,y:(ev.clientY-r.top)/z}};const targetAt=ev=>{let el=document.elementFromPoint(ev.clientX,ev.clientY),n=el&&el.closest?el.closest(".smart-grid-item[data-board-obj]"):null;return n&&n.dataset.boardObj!==fromId?n:null};function move(ev){let p=toCanvas(ev),t=targetAt(ev);if(over&&over!==t)over.classList.remove("is-conn-target");if(t)t.classList.add("is-conn-target");over=t;let dx=p.x-sx,dy=p.y-sy,horizontal=Math.abs(dx)>=Math.abs(dy);path.setAttribute("d",horizontal?"M"+sx+" "+sy+" C"+(sx+dx/2)+" "+sy+" "+(p.x-dx/2)+" "+p.y+" "+p.x+" "+p.y:"M"+sx+" "+sy+" C"+sx+" "+(sy+dy/2)+" "+p.x+" "+(p.y-dy/2)+" "+p.x+" "+p.y)}function up(ev){document.removeEventListener("pointermove",move);document.removeEventListener("pointerup",up);let t=targetAt(ev);path.remove();if(over)over.classList.remove("is-conn-target");if(t)mbCreateConnector(fromId,t.dataset.boardObj)}document.addEventListener("pointermove",move);document.addEventListener("pointerup",up);move(e)},true);

document.addEventListener("click",e=>{let b=e.target&&e.target.closest?e.target.closest("[data-mb-conn-style]"):null;if(!b)return;e.preventDefault();e.stopPropagation();let st=b.dataset.mbConnStyle;state.moodboardConnStyle=st;let sel=state.selectedObject;mutateActiveMoodboard(draft=>{let c=draft.objects.find(x=>x.id===sel&&x.kind==="connector");if(c)c.style=Object.assign({},c.style,{line:st})},"connector-style");render()},true);

/* image cards on the board take the image's own proportions (no captions on the card; details live in the inspector) */
let mbFitTried=new Set(),mbFitTimer=null;
function mbFitAspect(){let board=activeMoodboard();if(!board)return;let fixes=new Map();const flush=()=>{clearTimeout(mbFitTimer);mbFitTimer=setTimeout(()=>{if(!fixes.size)return;let f=new Map(fixes);fixes.clear();mutateActiveMoodboard(d=>{f.forEach((h,oid)=>{let o=d.objects.find(x=>x.id===oid);if(o)o.h=h})},"fit-aspect");render()},120)};document.querySelectorAll(".smart-grid-item.vault-item").forEach(card=>{let img=card.querySelector(".smart-grid-media img");if(!img)return;let oid=card.dataset.boardObj;const check=()=>{let nw=img.naturalWidth,nh=img.naturalHeight;if(!nw||!nh)return;let o=(board.objects||[]).find(x=>x.id===oid);if(!o)return;let want=Math.max(40,Math.round(o.w*nh/nw)),key=oid+":"+o.w+":"+want;if(Math.abs(want-o.h)<=2||mbFitTried.has(key))return;mbFitTried.add(key);fixes.set(oid,want)};if(img.complete)check();else img.addEventListener("load",()=>{check();flush()},{once:true})});flush()}
function studioTabsMarkup(){let onCol=state.view==="vault"&&state.col&&state.col!=="all",cur=onCol?STUDIO_NAV[1]:STUDIO_NAV.find(v=>isWorkspaceViewActive(v[0]));return "<nav class='studio-tabs' aria-label='Studio'><div class='studio-tabs-row' role='tablist'>"+STUDIO_NAV.map(v=>"<button type='button' role='tab' class='studio-tab"+(v===cur?" is-active":"")+"' data-view='"+v[0]+"' aria-selected='"+(v===cur?"true":"false")+"'>"+icon(v[1])+"<span>"+v[2]+"</span></button>").join("")+"</div>"+""+"</nav>"}
function insertStudioTabs(){if(!STUDIO_VIEWS.includes(state.view)||state.view==="moodboard-edit"||state.view==="board"||!state.user)return;let main=document.querySelector(".workspace > .main");if(main&&!main.querySelector(".studio-tabs"))main.insertAdjacentHTML("afterbegin",studioTabsMarkup())}
function sideNav(statsHtml){let views=WORKSPACE_VIEWS,collapse=railCollapseButton(),header=state.leftCollapsed?"<div class='side-shell-header is-collapsed-header' aria-hidden='true'></div>":"<div class='side-shell-header is-expanded-header'>"+collapse+"</div>";return header+(statsHtml||"")+"<div class='side-section sidebar-workspace'><p class='side-kicker'>Workspace</p><nav class='side-nav vault-bottom-nav' aria-label='Workspace'>"+views.map(v=>{let active=isWorkspaceViewActive(v[0]);return "<button class='side-nav-button "+(active?"active":"")+"' data-view='"+v[0]+"' title='"+v[2]+"' aria-label='"+v[2]+"'><span class='side-icon'>"+icon(v[1])+"</span><span class='side-label'>"+v[2]+"</span></button>"}).join("")+navPhoneButtons()+"</nav></div>"+navKeepButton()+sidebarUploadZone()+(state.leftCollapsed?"<div class='sidebar-rail-footer'>"+collapse+"</div>":"")}
function vaultStatsBlock(stats,collections){return "<section class='sidebar-stats' aria-label='Vault stats'><div class='sidebar-stat'><strong>"+stats.total+"</strong><span>Items</span></div><div class='sidebar-stat'><strong>"+stats.images+"</strong><span>Images</span></div><div class='sidebar-stat'><strong>"+collections.length+"</strong><span>Collections</span></div></section>"}
function reorderItems(from,to){if(!from||!to||from===to)return;let old=state.items.slice(),fromIndex=old.findIndex(i=>i.id===from),toIndex=old.findIndex(i=>i.id===to);if(fromIndex<0||toIndex<0)return;let moved=old.splice(fromIndex,1)[0];old.splice(toIndex,0,moved);state.items=old;save(S.items,state.items);toast("Object order updated.")}
function sidebarMain(){return "<div class='sidebar-body'>"+projectsBlock()+collectionsBlock()+"</div>"}
function projectsBlock(){return "<div class='side-section sidebar-projects'><div class='rail-heading compact-heading'><button class='rail-title-button "+(state.view==="projects"?"active":"")+"' data-view='projects'><h2>Projects</h2></button><button class='mini-button' data-newproject title='New project'>+</button></div><div class='project-list sidebar-project-list'>"+sortedProjects().map(projectRow).join("")+"</div></div>"}
function collectionsBlock(){let roots=rootCustomCols(),body=roots.map(c=>collectionRowsMarkup(c)).join("");return "<div class='side-section sidebar-collections'><div class='rail-heading compact-heading'><button class='rail-title-button "+(state.view==="collections"?"active":"")+"' data-view='collections'><h2>Collections</h2></button><button class='mini-button' data-newcol title='New collection'>+</button></div><div class='collection-list'>"+(body||"<p class='empty-sidebar-note'>Create custom collections for materials, campaigns, clients, or references.</p>")+"<div class='collection-root-drop' data-dropcol-root hidden>Release to move back to main collections</div></div></div>"}
function collectionRowsMarkup(c){return colRow(c,{depth:0})+childCols(c.id).map(ch=>colRow(ch,{depth:1})).join("")}
function iconForType(t){return t==="all"?"all":t==="image"?"image":t==="video"?"video":t==="link"?"link":t==="note"?"note":"collections"}
function themeControl(){let modes=[["light","sun","Light"],["dark","moon","Dark"],["system","system","System"]];return "<div class='theme-switch' role='group' aria-label='Theme'>"+modes.map(m=>"<button class='theme-option "+(state.theme===m[0]?"active":"")+"' data-theme-choice='"+m[0]+"' title='"+m[2]+"' aria-label='"+m[2]+" theme'>"+icon(m[1])+"<span>"+m[2]+"</span></button>").join("")+"</div>"}
function resolvedTheme(){if(state.theme==="system")return window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";return state.theme}
function applyTheme(options){let next=resolvedTheme(),root=document.documentElement,prev=root.dataset.theme||"",reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,animate=!(options&&options.instant)&&!!prev&&prev!==next&&!reduce;const commit=()=>{if(root.dataset.theme!==next)root.dataset.theme=next;if(root.dataset.themeMode!==state.theme)root.dataset.themeMode=state.theme};if(!animate){commit();return}clearTimeout(applyTheme._veilTimer);document.querySelectorAll(".theme-veil").forEach(el=>el.remove());let veil=document.createElement("div");veil.className="theme-veil "+(next==="dark"?"to-dark":"to-light");veil.setAttribute("aria-hidden","true");document.body.appendChild(veil);requestAnimationFrame(()=>{veil.classList.add("is-on");applyTheme._veilTimer=setTimeout(()=>{commit();veil.classList.add("is-off");setTimeout(()=>veil.remove(),520)},220)})}
function icon(n){let p={home:"<path d='M4 11 12 4l8 7'/><path d='M6 10v10h12V10'/><path d='M10 20v-6h4v6'/>",vault:"<path d='M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z'/><path d='m8.6 12.1 2.4 2.4 4.4-5'/>",discover:"<rect x='3.5' y='3.5' width='7.5' height='10' rx='1.8'/><rect x='13' y='3.5' width='7.5' height='6' rx='1.8'/><rect x='13' y='11.5' width='7.5' height='9' rx='1.8'/><rect x='3.5' y='15.5' width='7.5' height='5' rx='1.8'/>",board:"<path d='M4 5h16v14H4z'/><path d='M8 9h8M8 13h5M16 17h1'/>",all:"<path d='M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'/>",list:"<path d='M8 7h12M8 12h12M8 17h12'/><path d='M4 7h.01M4 12h.01M4 17h.01'/>",image:"<path d='M4 6h16v12H4z'/><path d='m7 15 3-3 2 2 3-4 2 5'/><circle cx='9' cy='9' r='1.2'/>",video:"<path d='M4 7h11v10H4z'/><path d='m15 10 5-3v10l-5-3z'/><path d='M8 10v4l4-2z'/>",link:"<path d='M10 7H8a5 5 0 0 0 0 10h2'/><path d='M14 7h2a5 5 0 0 1 0 10h-2'/><path d='M8 12h8'/>",note:"<path d='M6 4h9l3 3v13H6z'/><path d='M15 4v4h4M9 12h6M9 16h4'/>",collections:"<rect x='3.5' y='10' width='17' height='10.5' rx='2.2'/><path d='M6.5 6.5h11'/><path d='M9 3.2h6'/>",collection:"<rect x='3.5' y='10' width='17' height='10.5' rx='2.2'/><path d='M6.5 6.5h11'/><path d='M9 3.2h6'/>",plus:"<path d='M12 5v14M5 12h14'/>",close:"<path d='M6 6l12 12M18 6 6 18'/>",copy:"<rect x='8' y='8' width='11' height='11' rx='1.5'/><path d='M6 15V5.5A1.5 1.5 0 0 1 7.5 4H16'/>",collapse:"<path d='M15 6l-6 6 6 6'/><path d='M19 4v16'/>",expand:"<path d='M9 6l6 6-6 6'/><path d='M5 4v16'/>",sun:"<circle cx='12' cy='12' r='4'/><path d='M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'/>",moon:"<path d='M20 15.2A7.8 7.8 0 0 1 8.8 4a6.5 6.5 0 1 0 11.2 11.2z'/>",system:"<rect x='4' y='5' width='16' height='11' rx='1.5'/><path d='M9 20h6M12 16v4'/>",save:"<path d='M5 4h12l2 2v14H5z'/><path d='M8 4v6h8V4M8 18h8'/>",spark:"<path d='M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z'/>",compass:"<circle cx='12' cy='12' r='9'/><path d='m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z'/>",layers:"<path d='m12 3 9 5-9 5-9-5z'/><path d='m3 12 9 5 9-5'/><path d='m3 16 9 5 9-5'/>",tag:"<path d='M20 12 12 20 4 12V4h8z'/><path d='M7.5 7.5h.01'/>",search:"<circle cx='11' cy='11' r='7'/><path d='m16 16 4 4'/>",lock:"<rect x='5' y='10' width='14' height='10' rx='2'/><path d='M8 10V7a4 4 0 0 1 8 0v3'/>",project:"<path d='M4 6h6l2 2h8v10H4z'/>",archive:"<path d='M4 6h16v4H4z'/><path d='M6 10h12v10H6z'/><path d='M10 14h4'/>",settings:"<circle cx='12' cy='12' r='3'/><path d='M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1'/>",import:"<path d='M12 3v12'/><path d='m8 11 4 4 4-4'/><path d='M4 19h16'/>",filter:"<path d='M4 6h16M7 12h10M10 18h4'/>",bell:"<path d='M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9'/><path d='M10 21h4'/>",check:"<path d='m5 12 4 4L19 6'/>",edit:"<path d='M12 20h9'/><path d='M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z'/>",trash:"<path d='M4 7h16'/><path d='M10 11v6M14 11v6'/><path d='M6 7l1 14h10l1-14'/><path d='M9 7V4h6v3'/>",users:"<path d='M16 19v-1.2A3.3 3.3 0 0 0 12.7 14.5H7.3A3.3 3.3 0 0 0 4 17.8V19'/><circle cx='10' cy='8.5' r='3'/><path d='M20 19v-1a2.8 2.8 0 0 0-2-2.7'/><path d='M15.5 5.6a3 3 0 0 1 0 5.8'/>",logout:"<path d='M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4'/><path d='M15 8l4 4-4 4'/><path d='M9 12h10'/>",half:"<circle cx='12' cy='12' r='8'/><path d='M12 4a8 8 0 0 1 0 16z' fill='currentColor' stroke='none'/>",google:"<path d='M20 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h4.5a3.8 3.8 0 0 1-1.7 2.5v2.1h2.8c1.6-1.5 2.4-3.6 2.4-6.3z'/><path d='M12 20c2.3 0 4.2-.8 5.6-2.1l-2.8-2.1c-.8.5-1.7.8-2.8.8-2.1 0-3.9-1.4-4.6-3.3H4.5v2.1A8 8 0 0 0 12 20z'/><path d='M7.4 13.3a4.8 4.8 0 0 1 0-2.6V8.6H4.5a8 8 0 0 0 0 6.8z'/><path d='M12 7.4c1.2 0 2.3.4 3.2 1.2l2.4-2.4A8 8 0 0 0 4.5 8.6l2.9 2.1C8.1 8.8 9.9 7.4 12 7.4z'/>"}[n]||"<circle cx='12' cy='12' r='8'/>";return "<svg class='flat-icon' viewBox='0 0 24 24' aria-hidden='true' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'>"+p+"</svg>"}
function rightCollapsedPanel(label){return "<div class='right-mini-panel'><button class='collapse-button right-reopen' data-toggle-right title='Open "+escA(label)+"'>"+icon("expand")+"<span class='vertical-label'>"+esc(label)+"</span></button></div>"}
function resizeHandle(){return "<button class='resize-handle' data-resize-right title='Drag to resize details' aria-label='Resize detail sidebar'><span></span></button>"}
function captureMarkup(showEntry){let stats=count(),items=state.items.slice(0,6),projectList=state.projects.slice(0,3),entry=showEntry?"<div class='capture-entry-actions'><button class='primary-button capture-entry-button' data-view='vault'>"+icon("vault")+"<span>Open Workspace</span></button><button class='ghost-button capture-entry-button' data-view='moodboards'>"+icon("board")+"<span>Build Moodboard</span></button></div>":"";return "<main class='capture-page landing-animate"+pageEnterCls()+"'><section class='capture-hero'><div class='capture-title-block'><h1>A+ Vault</h1><p>PREMIUM CREATIVE REFERENCE VAULT</p>"+entry+"</div><div class='capture-steps capture-steps-vertical'><div class='capture-step capture-step-reveal' style='--step-delay:0ms'><span>1</span><div><strong>Find inspiration anywhere</strong><small>Right-click any image on the web.</small></div></div><div class='capture-step capture-step-reveal' style='--step-delay:120ms'><span>2</span><div><strong>Save with context</strong><small>Organize instantly with projects, collections, and notes.</small></div></div><div class='capture-step capture-step-reveal' style='--step-delay:240ms'><span>3</span><div><strong>Find it in your Vault</strong><small>Your item is saved to My Vault and added to your project.</small></div></div></div><div class='capture-flow-stage capture-static-demo' aria-hidden='true'>"+browserCaptureMock()+"<div class='flow-arrow'>&rarr;</div>"+capturePopupMock()+"<div class='flow-arrow'>&rarr;</div>"+vaultLibraryMock(items,projectList,stats)+"</div><div class='capture-under-note capture-step-reveal' style='--step-delay:360ms'><div class='capture-note-icon'>"+icon("compass")+"</div><div><strong>Works across any website.</strong><span>One click to save what inspires you.</span></div></div><div class='capture-benefits capture-step-reveal' style='--step-delay:480ms'><div>"+icon("layers")+"<span>Save anything that inspires you</span></div><div>"+icon("tag")+"<span>Organize with projects, collections, and tags</span></div><div>"+icon("search")+"<span>Find what you need, when you need it</span></div><div>"+icon("lock")+"<span>Private. Secure. Always yours.</span></div></div></section></main>"}
function captureView(){return shell(captureMarkup(true))}
function browserCaptureMock(){return "<article class='browser-mock'><div class='browser-bar'><span></span><span></span><span></span><div>openhouse-magazine.com/interiors/soft-modern-living</div></div><div class='browser-content'><div class='interior-scene'><img src='"+escA(svg(760,620,"<rect width='760' height='620' fill='#e7ded2'/><rect width='760' height='620' fill='#e8dfd4'/><rect x='58' y='62' width='230' height='500' rx='120' fill='#f7f3ec'/><rect x='82' y='86' width='182' height='452' rx='95' fill='#d2c5b6'/><rect x='312' y='180' width='292' height='210' rx='18' fill='#c9baaa'/><rect x='365' y='230' width='232' height='145' rx='80' fill='#f6f0e7'/><rect x='90' y='505' width='520' height='80' rx='40' fill='#d7c6b4'/><circle cx='524' cy='438' r='70' fill='#c8b59f'/><circle cx='532' cy='438' r='48' fill='#efe8dd'/><path d='M162 354c25-90 72-126 145-142' fill='none' stroke='#4a443c' stroke-width='6'/><rect x='146' y='368' width='60' height='100' rx='24' fill='#252420'/><path d='M175 252c22 36 24 79 4 116' fill='none' stroke='#383630' stroke-width='5'/><text x='622' y='220' fill='#171717' font-size='42' font-family='Georgia'>Soft</text><text x='622' y='266' fill='#171717' font-size='42' font-family='Georgia'>Modern</text>"))+"' alt='' draggable='false'></div><aside><h3>Soft Modern Living</h3><p>A study in balance, natural light, layered textures, and timeless materials create a quietly sophisticated interior.</p><small>Photography by Luca Moretti</small></aside><div class='context-menu-mock'><span>Open image in new tab</span><span>Save image as...</span><span>Copy image</span><span>Copy image address</span><span>Search image with Google</span><span class='save-context'>"+icon("plus")+" Save to A+ Vault</span><span>Inspect</span></div></div></article>"}
function capturePopupMock(){return "<article class='capture-popup-mock'><header><div class='popup-mark'>A<sup>+</sup></div><strong>Save to A+ Vault</strong><span class='popup-close'>×</span></header><div class='popup-preview'>"+browserThumb()+"</div><label>Title<input value='Soft modern living room with arched window' readonly tabindex='-1'></label><label>Project<select tabindex='-1'><option>No project</option><option selected>Aplus1 Branding</option><option>WP Catalog</option><option>Blacksmith Ads</option></select></label><label>Collection <span>(optional)</span><select tabindex='-1'><option selected>My Vault</option><option>Interior References</option></select></label><label>Note <span>(optional)</span><textarea placeholder='Add a note...' readonly tabindex='-1'></textarea></label><span class='popup-save'>Save</span><p>"+icon("lock")+" If no project is selected, this item will still be saved to My Vault.</p></article>"}
function vaultLibraryMock(items,projects,stats){return "<article class='vault-mock'><aside><div class='mock-logo'>A<sup>+</sup> Vault</div><span class='active'>"+icon("vault")+" My Vault</span><span>"+icon("project")+" Projects</span><span>"+icon("board")+" Moodboards</span><span>"+icon("collections")+" Collections</span><span>"+icon("tag")+" Tags</span><span>"+icon("archive")+" Archive</span><hr><span>"+icon("settings")+" Settings</span><span>"+icon("import")+" Import</span></aside><section><header><label class='mock-search'>"+icon("search")+"<input placeholder='Search your vault...' readonly tabindex='-1'></label><div>"+icon("filter")+icon("bell")+"<span class='mock-avatar'>A<sup>+</sup></span></div></header><div class='mock-library-head'><h2>My Vault <span>"+stats.total+"</span></h2><div class='mock-chips'><span class='active'>All</span><span>Images</span><span>Videos</span><span>Links</span><span>Docs</span></div></div><div class='mock-grid'>"+items.map(mockVaultCard).join("")+"</div></section><aside class='mock-success'><div class='success-check'>"+icon("check")+"</div><h3>Saved to<br>My Vault</h3><p>Added to Project:</p><strong>Aplus1 Branding</strong><span class='mock-cta'>View in Library</span><span class='mock-cta subtle'>Open Project</span><div class='mock-side-list'><h4>Projects</h4>"+projects.map(p=>"<span>"+esc(p.name)+"<small>"+p.boards.length+" board</small></span>").join("")+"</div></aside></article>"}
function browserThumb(){return "<div class='mini-interior'><span></span><span></span><span></span></div>"}
function mockVaultCard(i){let a=i.analysis||{},colors=(a.colors||[]).slice(0,2);return "<div class='mock-vault-card'>"+media(i)+"<strong>"+esc(i.title)+"</strong><small>"+esc(i.type==="link"?host(i.sourceUrl):(i.sourceUrl||"Private note"))+"</small><div>"+colors.map(c=>"<i style='background:"+c+"'></i>").join("")+"<span>"+esc(projectLabel(i)||"Aplus1 Branding")+"</span></div></div>"}
function vaultSearchBanner(count){let q=state.q.trim(),keyword=(state.filterKeyword||"").trim(),hex=(state.filterHex||"").trim(),parts=[];if(q)parts.push("<em>"+esc(q)+"</em>");if(keyword)parts.push("Keyword: <em>"+esc(keyword)+"</em>");if(hex)parts.push("Color: <i class='banner-swatch' style='background:"+escA(safeHex(hex))+"'></i> <em>"+esc(safeHex(hex))+"</em>");if(state.vaultImageRef)parts.push("Similar to "+(state.vaultImageRef.thumb?"<img class='banner-thumb' src='"+escA(state.vaultImageRef.thumb)+"' alt=''> ":"")+"<em>"+esc(state.vaultImageRef.title||"image")+"</em>");if(state.filterRights&&USAGE_RIGHTS[state.filterRights])parts.push("Rights: <em>"+esc(USAGE_RIGHTS[state.filterRights].label)+"</em>");if(!parts.length)return"";let n=typeof count==="number"?count:filtered().length;return "<div class='vault-search-banner'><span>Showing <strong>"+n+"</strong> for "+parts.join(" · ")+"</span><span class='banner-actions'>"+(state.vaultImageRef?"":"<button type='button' data-save-search>Save search</button>")+"<button type='button' data-clear-tag-filter>Clear</button></span></div>"}
function vaultView(){let items=filtered(),sel=state.selected?state.items.find(i=>i.id===state.selected):null,stats=count(),realCols=state.cols.filter(c=>!c.system),cls="workspace"+(state.leftCollapsed?" left-collapsed":"")+(sel?"":" detail-closed")+(state.drawerAnimating?" drawer-animating":"")+(state.animateVault?" vault-enter":"")+pageEnterCls(),isCollection=!!(state.col&&state.col!=="all"),pageTitle=isCollection?((state.cols.find(c=>c.id===state.col)||{}).name||"Collection"):"My Vault",pageTitleHtml="<h1>"+esc(pageTitle)+(isCollection?" <span class='vault-page-title-suffix'>collection</span>":"")+"</h1>",showHighlights=!state.col||state.col==="all";return shell("<div class='"+cls+"' style='--right-width:"+state.rightWidth+"px'><aside class='rail'>"+sideNav(vaultStatsBlock(stats,realCols))+sidebarMain()+"</aside><main class='main vault-page-drop' data-vault-page-drop><div class='vault-page-drop-overlay' aria-hidden='true'><strong>Drop to upload</strong><span>JPG, PNG, or WebP</span></div><header class='vault-page-title'>"+pageTitleHtml+(isCollection?"":howtoInfoButton("vault"))+"</header>"+(isCollection?collectionNoteMarkup(state.col):"")+(showHighlights?collectionHighlightRail():"")+topOfMindMarkup()+"<section class='vault-command-row'><div class='filter-chips'>"+["all","image","video","link","note"].map(chip).join("")+"</div>"+vaultViewControl()+vaultSortControl()+"</section>"+vaultSearchBanner()+vaultResurfaceMarkup()+(items.length?vaultItemsMarkup(items):empty())+"</main><aside class='drawer"+(sel&&!state.drawerAnimating?" open":"")+"'>"+(sel?resizeHandle()+detail(sel):"<div class='drawer-inner drawer-placeholder' aria-hidden='true'></div>")+"</aside></div>")}
function normalizeLibraryView(raw){let v=String(raw||"medium");if(v==="grid")return"medium";if(v==="small"||v==="medium"||v==="large"||v==="details")return v;return"medium"}
function libraryViewLabel(mode){return mode==="small"?"Small":mode==="large"?"Extra large":mode==="details"?"Details":"Medium"}
function libraryViewIcon(mode){return mode==="details"?"list":"all"}
function libraryResultsRoot(){return document.querySelector(".main .object-grid,.main .object-list")}
function closeLibraryViewMenu(){let pop=document.querySelector(".view-popover");if(pop)pop.remove();let trigger=document.querySelector("[data-viewtoggle]");if(trigger){trigger.classList.remove("active");trigger.setAttribute("aria-expanded","false")}}
function fadeLibraryResults(dir){let el=libraryResultsRoot();if(!el)return Promise.resolve();if(dir==="out"){el.classList.remove("library-fade-in");el.classList.add("library-fade-out");return new Promise(r=>setTimeout(r,160))}el.classList.remove("library-fade-out");el.classList.add("library-fade-in");return new Promise(r=>setTimeout(()=>{el.classList.remove("library-fade-in");r()},280))}
function applyLibraryFlip(first){if(!first||!first.size)return;requestAnimationFrame(()=>{document.querySelectorAll(".object-grid .pin-card[data-sel]").forEach(el=>{let f=first.get(el.dataset.sel);if(!f)return;let r=el.getBoundingClientRect(),dx=f.l-r.left,dy=f.t-r.top,sx=f.w/Math.max(r.width,1),sy=f.h/Math.max(r.height,1);if(Math.abs(dx)<1&&Math.abs(dy)<1&&Math.abs(sx-1)<.02&&Math.abs(sy-1)<.02)return;if(typeof el.animate==="function"){el.animate([{transform:"translate("+dx+"px,"+dy+"px) scale("+sx+","+sy+")"},{transform:"translate(0,0) scale(1,1)"}],{duration:340,easing:"cubic-bezier(.2,.7,.2,1)",fill:"both"});return}el.style.transformOrigin="top left";el.style.transition="none";el.style.transform="translate("+dx+"px,"+dy+"px) scale("+sx+","+sy+")";requestAnimationFrame(()=>{el.style.transition="transform .34s cubic-bezier(.2,.7,.2,1)";el.style.transform="";const done=()=>{el.style.transition="";el.style.transformOrigin="";el.removeEventListener("transitionend",done)};el.addEventListener("transitionend",done)})})})}
function setLibraryView(mode){let next=normalizeLibraryView(mode),prev=normalizeLibraryView(state.libraryView);state.viewMenu=false;closeLibraryViewMenu();if(next===prev){render();return}let reduce=typeof matchMedia==="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches;let crossMode=(prev==="details")!==(next==="details");let finish=()=>{state.libraryView=next;save(S.libraryView,state.libraryView);render();if(crossMode&&!reduce)fadeLibraryResults("in")};if(crossMode&&!reduce){fadeLibraryResults("out").then(finish);return}let first=null;if(!reduce&&!crossMode){first=new Map();document.querySelectorAll(".object-grid .pin-card[data-sel]").forEach(el=>{let r=el.getBoundingClientRect();first.set(el.dataset.sel,{l:r.left,t:r.top,w:r.width,h:r.height})})}finish();applyLibraryFlip(first)}
function vaultViewControl(){let mode=normalizeLibraryView(state.libraryView),label=libraryViewLabel(mode),options=[["small","Small"],["medium","Medium"],["large","Extra large"],["details","Details"]];return "<div class='vault-view'><button class='view-trigger "+(state.viewMenu?"active":"")+"' data-viewtoggle title='"+esc(label)+"' aria-label='"+esc(label)+"' aria-expanded='"+(state.viewMenu?"true":"false")+"'>"+icon(libraryViewIcon(mode))+"</button>"+(state.viewMenu?"<div class='view-popover' role='menu'>"+options.map(o=>"<button type='button' class='"+(mode===o[0]?"active":"")+"' data-library-view='"+o[0]+"'>"+icon(o[0]==="details"?"list":"all")+"<span>"+esc(o[1])+"</span></button>").join("")+"</div>":"")+"</div>"}
function vaultItemsMarkup(items){let total=items.length,limit=state.gridRenderLimit||VAULT_GRID_INITIAL,shown=items.slice(0,limit),mode=normalizeLibraryView(state.libraryView),body=mode==="details"?shown.map((i,idx)=>listRow(i,idx)).join(""):shown.map((i,idx)=>card(i,idx)).join(""),sentinel="";if(shown.length<total){let remain=total-shown.length,step=Math.min(VAULT_GRID_STEP,remain);sentinel="<div class='vault-grid-sentinel' data-grid-load-more><button type='button' class='ghost-button wide'>Show "+step+" more <span class='muted'>("+remain+" left)</span></button></div>"}return mode==="details"?"<section class='object-list' role='list'>"+body+sentinel+"</section>":"<section class='object-grid size-"+mode+"'>"+body+sentinel+"</section>"}
function listRow(i,idx){let a=i.analysis||{},colors=(a.colors||[]).slice(0,4),menu=state.openMenu===i.id,picked=(state.selectedIds||[]).includes(i.id),date=new Date(Number(i.createdAt)||Date.now()).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"});return "<article class='object-list-row "+(menu?"menu-open ":"")+(picked?"is-selected ":"")+"' role='listitem' style='--card-index:"+((idx||0)%18)+"' data-dragitem='"+i.id+"' data-dropitem='"+i.id+"' data-sel='"+i.id+"' tabindex='0'><label class='object-select-check list-select-check' title='Select object'><input type='checkbox' data-toggle-select='"+i.id+"' "+(picked?"checked":"")+" aria-label='Select object'></label><div class='object-list-thumb'>"+media(i)+"</div><div class='object-list-main'><strong class='object-list-title'>"+esc(i.title)+"</strong><span class='object-list-meta'>"+esc(L[i.type]||i.type)+" · "+esc(date)+"</span></div>"+(colors.length?"<div class='card-color-stack object-list-colors' aria-label='Color palette'>"+colors.map(c=>"<span style='background:"+safeHex(c)+"'></span>").join("")+"</div>":"<span class='object-list-colors-empty'></span>")+"<div class='object-list-actions'><button type='button' class='card-menu-trigger meta-menu-trigger' data-cardmenu='"+i.id+"' aria-label='Open object menu'>...</button>"+(menu?cardMenu(i):"")+"</div></article>"}
function selectionActionsMarkup(){let n=(state.selectedIds||[]).length;if(!n)return"";let canBoard=n>=MOODBOARD_SELECT_MIN&&n<=MOODBOARD_SELECT_MAX;return "<div class='vault-selection-dock' role='toolbar' aria-label='Selected objects'><span class='vault-selection-count'>"+n+" selected</span><div class='vault-selection-actions'><button type='button' class='ghost-button selection-action-button' data-open-create-moodboard "+(canBoard?"":"disabled")+">"+icon("board")+"<span>Create Moodboard</span></button><button type='button' class='ghost-button selection-action-button' data-bulk-new-collection>"+icon("collection")+"<span>New collection</span></button><button type='button' class='ghost-button selection-action-button' data-bulk-to-project>"+icon("project")+"<span>Add to project</span></button><button type='button' class='ghost-button selection-action-button' data-clear-selection>Clear</button><span class='vault-selection-divider' aria-hidden='true'></span><button type='button' class='ghost-button selection-action-button danger-selection icon-only' data-bulk-delete title='Delete' aria-label='Delete selected'>"+icon("trash")+"</button></div></div>"}

function timeGroups(items){let now=Date.now(),week=7*24*60*60*1000,monthStart=new Date();monthStart.setDate(1);monthStart.setHours(0,0,0,0);let groups=[{label:"Recent 7 Days",items:[]},{label:"This Month",items:[]},{label:"Older",items:[]}];items.forEach(i=>{let t=Number(i.createdAt)||0;if(t>=now-week)groups[0].items.push(i);else if(t>=monthStart.getTime())groups[1].items.push(i);else groups[2].items.push(i)});return groups.filter(g=>g.items.length)}
function projectLinkedMoodboards(p){let byId=new Map();(p.boards||[]).forEach(b=>byId.set(b.id,Object.assign({},b,{_source:"nested"})));(state.moodboards||[]).filter(b=>b.projectId===p.id).forEach(b=>{if(!byId.has(b.id))byId.set(b.id,Object.assign({},b,{_source:"standalone"}))});return Array.from(byId.values())}

function folderGraphicMarkup(opts){
  opts=opts||{};
  let count=Math.max(0,Number(opts.count)||0),
    sheets=Math.min(3,Math.max(1,count?Math.min(3,count):2)),
    sheetHtml="";
  for(let i=0;i<sheets;i++)sheetHtml+="<span class='folder-sheet s"+i+"' aria-hidden='true'></span>";
  return "<div class='folder-graphic' aria-hidden='true'><div class='folder-body'>"+sheetHtml+"<span class='folder-tab'></span></div></div>";
}
const FOLDER_COLORS=["#CB5037","#4568A7","#386451","#8a6d3b","#6b4f8f","#d9a441","#2f3133","#e86a92"];
function projectHash(p){let h=0;String(p.id||p.name).split("").forEach(ch=>{h=(h*31+ch.charCodeAt(0))>>>0});return h}
function projectCoverImages(p){let seen=new Set(),list=[];projectItems(p).concat(projectCollectionIds(p).flatMap(cid=>itemsForCollection(cid))).forEach(i=>{if(!i||seen.has(i.id))return;let src=i.thumbnailUrl||i.previewUrl||(i.type==="image"?i.assetUrl:"")||"";if(!src)return;seen.add(i.id);list.push(src)});let h=projectHash(p);return list.map((src,k)=>[((h+k*2654435761)>>>0)%1000,src]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]).slice(0,3)}
function projectFolderMosaic(p){
  let imgs=projectCoverImages(p),color=/^#[0-9a-f]{6}$/i.test(p.color||"")?p.color:FOLDER_COLORS[projectHash(p)%5],
    papers=[0,1,2].map(function(k){let src=imgs[k];return "<span class='pf-paper pf-paper-"+k+"'>"+(src?"<img src='"+escA(src)+"' alt='' loading='lazy' decoding='async' draggable='false'>":"<i></i><i></i><i></i>")+"</span>"}).join("");
  return "<div class='pfolder"+(p.glass?" is-glass":"")+"' style='--fc:"+color+"' aria-hidden='true'><span class='pf-back'></span><span class='pf-stage'>"+papers+"</span><span class='pf-front'></span></div>";
}
function projectEditExtra(p){let cur=/^#[0-9a-f]{6}$/i.test(p.color||"")?p.color.toLowerCase():"";return ()=>"<div class='app-dialog-field'><span>Folder color</span><div class='folder-color-row'>"+FOLDER_COLORS.map(c=>"<label class='folder-swatch' style='--c:"+c+"'><input type='radio' name='folderColor' value='"+c+"'"+(cur===c.toLowerCase()?" checked":"")+"><i></i></label>").join("")+"</div></div><label class='folder-glass-toggle'><input type='checkbox' name='folderGlass'"+(p.glass?" checked":"")+"><span>Translucent folder</span></label>"}
document.addEventListener("click",e=>{let b=e.target&&e.target.closest?e.target.closest("[data-rename-project]"):null;if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();let p=state.projects.find(x=>x.id===b.dataset.renameProject);if(!p)return;openTextDialog({title:"Edit project",label:"Project name",value:p.name,confirmText:"Save",extra:projectEditExtra(p),onSubmit:(name,fd)=>{p.name=name.trim()||p.name;let c=String(fd.get("folderColor")||"");p.color=/^#[0-9a-f]{6}$/i.test(c)?c:"";p.glass=fd.get("folderGlass")==="on";persistProjects();toast("Project updated.")}})},true);
function projectFolderCard(p){
  let boards=projectLinkedMoodboards(p),
    cols=projectCollectionIds(p).map(id=>state.cols.find(c=>c.id===id)).filter(Boolean),
    items=projectItems(p),
    folderCount=cols.length+boards.length,
    fileCount=items.length,
    sub=[cols.length?cols.length+" collection"+(cols.length===1?"":"s"):"",boards.length?boards.length+" board"+(boards.length===1?"":"s"):"",fileCount?fileCount+" file"+(fileCount===1?"":"s"):""].filter(Boolean).join(" · ")||"Empty — open it to add things";
  return "<article class='folder-card project-set-card "+(state.activeProject===p.id?"active":"")+"'>"+
    "<button type='button' class='folder-card-open project-set-open' data-project='"+p.id+"' title='Open "+escA(p.name)+"'>"+
      projectFolderMosaic(p)+
      "<span class='folder-card-copy'><strong>"+esc(p.name)+"</strong><small>"+esc(sub)+"</small></span>"+
    "</button>"+
    "<div class='folder-card-actions'>"+
      "<button type='button' data-newboard='"+p.id+"' title='New moodboard' aria-label='New moodboard'>"+icon("board")+"</button>"+
      "<button type='button' data-rename-project='"+p.id+"' title='Rename' aria-label='Rename project'>"+icon("edit")+"</button>"+
      "<button type='button' class='danger-link' data-delproject='"+p.id+"' title='Delete' aria-label='Delete project'>"+icon("trash")+"</button>"+
    "</div>"+
  "</article>";
}
function projectChildFolderCard(opts){
  let kind=opts.kind||"folder",
    name=opts.name||"Folder",
    count=opts.count||0,
    openAttr=opts.openAttr||"",
    actions=opts.actions||"";
  return "<article class='folder-card folder-card-child'>"+
    "<button type='button' class='folder-card-open' "+openAttr+" title='Open "+escA(name)+"'>"+
      folderGraphicMarkup({count:count})+
      "<span class='folder-card-copy'><strong>"+esc(name)+"</strong><small>"+count+" "+(kind==="board"?"object":"file")+(count===1?"":"s")+"</small></span>"+
    "</button>"+
    (actions?"<div class='folder-card-actions'>"+actions+"</div>":"")+
  "</article>";
}
function projectFileRow(item){
  let who=(state.user&&(state.user.displayName||state.user.email))||"You",
    initial=profileInitials(who),
    typeLabel=L[item.type]||item.type||"file",
    title=item.title||"Untitled";
  return "<div class='project-file-row'>"+
    "<button type='button' class='project-file-main' data-open-object='"+item.id+"'>"+
      "<span class='project-file-icon' aria-hidden='true'>"+icon(item.type==="image"?"image":item.type==="video"?"video":item.type==="link"?"link":"note")+"</span>"+
      "<span class='project-file-name'><strong>"+esc(title)+"</strong><small>"+esc(typeLabel)+"</small></span>"+
    "</button>"+
    "<div class='project-file-added'>"+
      "<span class='project-file-avatar' aria-hidden='true'>"+esc(initial)+"</span>"+
      "<span>"+esc(who)+"</span>"+
    "</div>"+
  "</div>";
}


function collectionThumbItems(col){
  return state.items.filter(i=>(i.collectionIds||[]).includes(col.id)&& (i.type==="image"||i.previewUrl||i.assetUrl||i.thumbnailUrl)).slice(0,4);
}
function mosaicFromItems(items,emptyIcon){
  items=items||[];
  if(!items.length){
    return "<div class='project-detail-mosaic is-empty'><span class='project-detail-empty-icon' aria-hidden='true'>"+icon(emptyIcon||"collection")+"</span></div>";
  }
  return "<div class='project-detail-mosaic count-"+Math.min(items.length,4)+"'>"+items.map(function(i){
    let src=escA(i.thumbnailUrl||i.previewUrl||i.assetUrl||"");
    return src?"<span class='project-detail-tile'><img src='"+src+"' alt='' loading='lazy'></span>":"<span class='project-detail-tile is-blank'></span>";
  }).join("")+"</div>";
}
function projectCollectionCard(p,c){
  let n=state.items.filter(i=>(i.collectionIds||[]).includes(c.id)).length;
  return "<article class='project-detail-card pd-card'>"+
    "<button type='button' class='pd-open' data-col='"+c.id+"' title='Open "+escA(c.name)+"'>"+
      "<div class='collection-card-visual pd-visual'>"+collectionStackMarkup(c.id)+"</div>"+
      "<span class='pd-line'><strong>"+esc(c.name)+"</strong><small>"+n+" object"+(n===1?"":"s")+"</small></span>"+
    "</button>"+
    "<div class='pd-actions'><button type='button' class='danger-link' data-unlink-proj-col='"+p.id+":"+c.id+"' title='Remove from project' aria-label='Remove from project'>"+icon("close")+"</button></div>"+
  "</article>";
}
function projectMoodboardCard(p,b){
  let n=(b.objects||[]).filter(o=>o&&o.kind==="item").length,
    open=b._source==="standalone"||b.layoutMode==="smart_grid"?"data-open-moodboard='"+b.id+"'":"data-openboard='"+p.id+":"+b.id+"'";
  return "<article class='project-detail-card pd-card'>"+
    "<button type='button' class='pd-open' "+open+" title='Open "+escA(b.name)+"'>"+
      moodboardCoverMod(b,esc,escA,moodboardThumbFor)+
      "<span class='pd-line'><strong>"+esc(b.name)+"</strong><small>"+n+" ref"+(n===1?"":"s")+"</small></span>"+
    "</button>"+
    "<div class='pd-actions'><button type='button' class='danger-link' data-unlink-proj-board='"+p.id+":"+b.id+"' title='Remove from project' aria-label='Remove from project'>"+icon("close")+"</button></div>"+
  "</article>";
}
function projectObjectCard(item){
  let typeLabel=L[item.type]||item.type||"file",
    src=escA(item.thumbnailUrl||item.previewUrl||(item.type==="image"?item.assetUrl:"")||"");
  return "<article class='project-object-card'>"+
    "<button type='button' class='project-object-open' data-open-object='"+item.id+"' title='"+escA(item.title||"Untitled")+"'>"+
      "<span class='project-object-thumb'>"+(src?"<img src='"+src+"' alt='' loading='lazy'>":"<span class='project-object-fallback'>"+icon(item.type==="image"?"image":item.type==="video"?"video":item.type==="link"?"link":"note")+"</span>")+"</span>"+
      "<span class='project-object-copy'><strong>"+esc(item.title||"Untitled")+"</strong><small>"+esc(typeLabel)+"</small></span>"+
    "</button>"+
  "</article>";
}
function projectSectionEmpty(message,actionHtml){
  return "<div class='project-section-empty'><p>"+esc(message)+"</p>"+(actionHtml||"")+"</div>";
}

function projectView(){
  let p=project(),
    stats=count(),
    realCols=state.cols.filter(c=>!c.system),
    cols=projectCollectionIds(p).map(id=>state.cols.find(c=>c.id===id)).filter(Boolean),
    boards=projectLinkedMoodboards(p),
    items=projectItems(p),
    cls="workspace overview-workspace project-browser detail-closed"+(state.leftCollapsed?" left-collapsed":"")+pageEnterCls(),
    colCards=cols.map(c=>projectCollectionCard(p,c)).join(""),
    boardCards=boards.map(b=>projectMoodboardCard(p,b)).join(""),
    objectCards=items.map(projectObjectCard).join("");
  return shell("<div class='"+cls+"'><aside class='rail'>"+sideNav(vaultStatsBlock(stats,realCols))+sidebarMain()+"</aside>"+
    "<main class='main overview-main project-folder-page project-detail-page'>"+
      "<section class='page-head project-folder-head'>"+
        "<div class='project-folder-title'>"+
          "<div>"+
            "<nav class='folder-breadcrumb' aria-label='Breadcrumb'>"+
              "<button type='button' class='folder-crumb' data-view='projects'>Projects</button>"+
              "<span aria-hidden='true'>/</span>"+
              "<span class='folder-crumb-current'>"+esc(p.name)+"</span>"+
            "</nav>"+
            "<h1>"+esc(p.name)+"</h1>"+
            (p.description?"<p>"+esc(p.description)+"</p>":"")+
          "</div>"+
        "</div>"+
        "<div class='project-folder-head-actions'>"+
          "<button type='button' class='ghost-button' data-addprojectcol='"+p.id+"'>"+icon("plus")+"<span>Collection</span></button>"+
          "<button type='button' class='ghost-button' data-addprojectboard='"+p.id+"'>"+icon("plus")+"<span>Moodboard</span></button>"+
          "<button class='icon-button project-settings-button' type='button' data-project-settings='"+p.id+"' title='Project settings' aria-label='Project settings'>"+icon("settings")+"</button>"+
        "</div>"+
      "</section>"+
      "<div class='project-browser-body'>"+
        projectExplorerMarkup()+
        "<div class='project-browser-pane project-detail-pane'>"+
          "<section class='project-detail-section'>"+
            "<div class='project-detail-section-head'>"+
              "<div><h2>Collections</h2></div>"+
              "<div class='project-detail-section-meta'>"+
                "<span>"+cols.length+"</span>"+
                "<button type='button' class='ghost-button mini-add' data-addprojectcol='"+p.id+"'>"+icon("plus")+"<span>Add</span></button>"+
              "</div>"+
            "</div>"+
            (colCards
              ?"<div class='project-detail-grid'>"+colCards+"</div>"
              :projectSectionEmpty("ยังไม่มี collection — เพิ่มจาก Vault หรือสร้างใหม่","<button type='button' class='primary-button' data-addprojectcol='"+p.id+"'>Add collection</button>"))+
          "</section>"+
          "<section class='project-detail-section'>"+
            "<div class='project-detail-section-head'>"+
              "<div><h2>Moodboards</h2></div>"+
              "<div class='project-detail-section-meta'>"+
                "<span>"+boards.length+"</span>"+
                "<button type='button' class='ghost-button mini-add' data-addprojectboard='"+p.id+"'>"+icon("plus")+"<span>Add</span></button>"+
              "</div>"+
            "</div>"+
            (boardCards
              ?"<div class='project-detail-grid'>"+boardCards+"</div>"
              :projectSectionEmpty("ยังไม่มี moodboard — สร้างบอร์ดแรกได้เลย","<button type='button' class='primary-button' data-addprojectboard='"+p.id+"'>Add moodboard</button>"))+
          "</section>"+
          "<section class='project-detail-section'>"+
            "<div class='project-detail-section-head'>"+
              "<div><h2>Objects</h2></div>"+
              "<div class='project-detail-section-meta'><span>"+items.length+"</span></div>"+
            "</div>"+
            (objectCards
              ?"<div class='project-object-grid'>"+objectCards+"</div>"
              :projectSectionEmpty("ยังไม่มี object — บันทึกจาก My Vault เข้าโปรเจกต์นี้","<button type='button' class='ghost-button' data-view='vault'>Open Vault</button>"))+
          "</section>"+
        "</div>"+
      "</div>"+
    "</main></div>");
}

function projectExplorerQuery(){return String(state.projectExplorerQ||"").trim().toLowerCase()}
function projectExplorerMatches(name,q){if(!q)return true;return String(name||"").toLowerCase().includes(q)}
function projectTreeCount(p){let cols=projectCollectionIds(p).length,boards=projectLinkedMoodboards(p).length,items=projectItems(p).length;return cols+boards+items}
function projectExplorerTags(){
  let map=new Map(),q=projectExplorerQuery();
  (state.projects||[]).forEach(p=>{
    projectItems(p).forEach(item=>{
      let tags=[].concat(item.analysis&&item.analysis.keywords||[],item.analysis&&item.analysis.styles||[],item.tags||[]);
      tags.forEach(t=>{
        let label=String(t||"").trim();if(!label)return;
        if(q&&!label.toLowerCase().includes(q))return;
        let key=label.toLowerCase();
        let row=map.get(key)||{label,count:0};
        row.count+=1;map.set(key,row);
      });
    });
  });
  return Array.from(map.values()).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
}
function projectExplorerTreeRows(){
  let q=projectExplorerQuery(),rows=[],expanded=state.expandedProjectIds||{};
  sortedProjects().forEach(p=>{
    let cols=projectCollectionIds(p).map(id=>state.cols.find(c=>c.id===id)).filter(Boolean),
      boards=projectLinkedMoodboards(p),
      active=state.activeProject===p.id&&state.view==="project",
      selfMatch=projectExplorerMatches(p.name,q),
      childCols=cols.filter(c=>projectExplorerMatches(c.name,q)),
      childBoards=boards.filter(b=>projectExplorerMatches(b.name,q)),
      show=selfMatch||childCols.length||childBoards.length;
    if(!show)return;
    let count=projectTreeCount(p),
      isOpen=!!expanded[p.id]||!!q||active,
      kids=(q?childCols:cols).length+(q?childBoards:boards).length;
    rows.push("<div class='project-tree-folder "+(active?"is-active":"")+(isOpen?" is-open":"")+"'>"+
      "<div class='project-tree-folder-row'>"+
        "<button type='button' class='project-tree-chevron' data-toggle-project-expand='"+p.id+"' aria-label='"+(isOpen?"Collapse":"Expand")+"' aria-expanded='"+(isOpen?"true":"false")+"'>"+icon("expand")+"</button>"+
        "<button type='button' class='project-tree-row "+(active?"active":"")+"' data-project='"+p.id+"'>"+
          "<span class='project-tree-icon' aria-hidden='true'>"+icon("project")+"</span>"+
          "<span class='project-tree-label'>"+esc(p.name)+"</span>"+
          "<span class='project-tree-count'>"+count+"</span>"+
        "</button>"+
      "</div>");
    if(isOpen){
      rows.push("<div class='project-tree-children'>");
      if(!kids&&!q){
        rows.push("<p class='project-tree-empty-child'>Empty — link a collection or moodboard</p>");
      }
      (q?childCols:cols).forEach(c=>{
        let n=state.items.filter(i=>(i.collectionIds||[]).includes(c.id)).length;
        rows.push("<button type='button' class='project-tree-row is-child' data-col='"+c.id+"'>"+
          "<span class='project-tree-thumb' aria-hidden='true'>"+icon("collection")+"</span>"+
          "<span class='project-tree-label'>"+esc(c.name)+"</span>"+
          "<span class='project-tree-count'>"+n+"</span>"+
        "</button>");
      });
      (q?childBoards:boards).forEach(b=>{
        let n=(b.objects||[]).length,
          open=b._source==="standalone"||b.layoutMode==="smart_grid"?"data-open-moodboard='"+b.id+"'":"data-openboard='"+p.id+":"+b.id+"'";
        rows.push("<button type='button' class='project-tree-row is-child' "+open+">"+
          "<span class='project-tree-thumb' aria-hidden='true'>"+icon("board")+"</span>"+
          "<span class='project-tree-label'>"+esc(b.name)+"</span>"+
          "<span class='project-tree-count'>"+n+"</span>"+
        "</button>");
      });
      rows.push("</div>");
    }
    rows.push("</div>");
  });
  return rows.join("")||"<div class='project-explorer-empty'>No folders match.</div>";
}
function bindProjectExplorerChrome(){
  document.querySelectorAll("[data-toggle-project-expand]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();let id=b.dataset.toggleProjectExpand;state.expandedProjectIds=Object.assign({},state.expandedProjectIds||{});state.expandedProjectIds[id]=!state.expandedProjectIds[id];softRefreshProjectExplorer()});
  document.querySelectorAll("[data-project-scope]").forEach(b=>b.onclick=()=>{state.projectExplorerScope="all";state.view="projects";render()});
}
function softRefreshProjectExplorer(){
  let tree=document.querySelector(".project-explorer-tree");
  if(!tree){render();return}
  let tab=state.projectExplorerTab==="tags"?"tags":"folders";
  if(tab==="tags"){
    let tags=projectExplorerTags();
    tree.innerHTML=tags.length?tags.map(t=>"<div class='project-tree-row is-tag'><span class='project-tree-icon' aria-hidden='true'>"+icon("tag")+"</span><span class='project-tree-label'>"+esc(t.label)+"</span><span class='project-tree-count'>"+t.count+"</span></div>").join(""):"<div class='project-explorer-empty'>No tags in projects yet.</div>";
  }else{
    tree.innerHTML=projectExplorerTreeRows();
    bindProjectExplorerTreeClicks(tree);
  }
}
function bindProjectExplorerTreeClicks(root){
  if(!root)return;
  root.querySelectorAll("[data-project]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();state.openMenu=null;state.activeProject=b.dataset.project;let p=project();state.activeBoard=(p.boards&&p.boards[0]&&p.boards[0].id)||"";state.selectedObject=null;state.view="project";render()});
  root.querySelectorAll("[data-col]").forEach(b=>b.onclick=()=>{state.col=b.dataset.col;state.type="all";state.view="vault";render()});
  root.querySelectorAll("[data-open-moodboard]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();state.activeMoodboard=b.dataset.openMoodboard;state.view="moodboard-edit";render()});
  root.querySelectorAll("[data-openboard]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();let r=boardRef(b.dataset.openboard);state.activeProject=r.projectId;state.activeBoard=r.boardId;state.selectedObject=null;state.rightCollapsed=false;state.openMenu=null;state.view="board";render()});
}

function projectExplorerMarkup(){
  let q=escA(state.projectExplorerQ||""),
    searching=!!projectExplorerQuery(),
    list=sortedProjects(),
    fileCount=state.items.length,
    body=projectExplorerTreeRows();
  return "<aside class='project-explorer' aria-label='Projects explorer'>"+
    "<label class='project-explorer-search'>"+icon("search")+
      "<input type='search' data-project-explorer-q placeholder='Search projects…' value='"+q+"' autocomplete='off'>"+
    "</label>"+
    "<nav class='project-explorer-nav' aria-label='Project folders'>"+
      (searching?"":(
        "<button type='button' class='project-nav-row "+(state.view==="projects"?"active":"")+"' data-project-scope='all'>"+
          "<span class='project-tree-icon' aria-hidden='true'>"+icon("project")+"</span>"+
          "<span class='project-tree-label'>All projects</span>"+
          "<span class='project-tree-count'>"+list.length+"</span>"+
        "</button>"+
        "<div class='project-explorer-divider' aria-hidden='true'></div>"
      ))+
      "<div class='project-explorer-tree'>"+body+"</div>"+
    "</nav>"+
  "</aside>";
}
function projectsView(){
  let stats=count(),
    realCols=state.cols.filter(c=>!c.system),
    cls="workspace overview-workspace project-browser detail-closed"+(state.leftCollapsed?" left-collapsed":"")+pageEnterCls(),
    list=sortedProjects(),
    q=String(state.projectBrowserQ||"").trim().toLowerCase(),
    filter=state.projectBrowserFilter||"all",
    filtered=list.filter(p=>{
      if(q&&!String(p.name||"").toLowerCase().includes(q))return false;
      let boards=projectLinkedMoodboards(p),cols=projectCollectionIds(p);
      if(filter==="boards")return boards.length>0;
      if(filter==="collections")return cols.length>0;
      return true;
    }),
    title=filter==="boards"?"Projects with boards":filter==="collections"?"Projects with collections":"All projects";
  return shell("<div class='"+cls+"'><aside class='rail'>"+sideNav(vaultStatsBlock(stats,realCols))+sidebarMain()+"</aside>"+
    "<main class='main overview-main project-folder-page'>"+
      "<section class='page-head project-folder-head'>"+
        "<div class='project-folder-title'>"+
          "<div>"+
            "<h1>Projects</h1>"+
          "</div>"+
        "</div>"+

      "</section>"+
      "<div class='project-browser-body'>"+
        projectExplorerMarkup()+
        "<div class='project-browser-pane'>"+
          "<div class='project-browser-bar'>"+
          "<label class='project-browser-search'>"+icon("search")+
            "<input type='search' data-project-browser-q placeholder='Search project name…' value='"+escA(state.projectBrowserQ||"")+"' autocomplete='off'>"+
          "</label>"+
          "<button class='primary-button' data-newproject>"+icon("plus")+"<span>New Project</span></button>"+
          "</div>"+
          (filtered.length
            ?"<section class='folder-section'><div class='folder-card-grid project-set-grid'>"+filtered.map(projectFolderCard).join("")+"</div></section>"
            :"<section class='empty-state'><div><h2>"+(list.length?"No matching projects.":"No projects yet.")+"</h2><p>"+(list.length?"Try another filter or search.":"Create a project folder to gather collections and moodboards.")+"</p>"+(list.length?"":"<button class='primary-button' data-newproject>Create Project</button>")+"</div></section>")+
        "</div>"+
      "</div>"+
    "</main></div>");
}
function moodboardsView(){let stats=count(),realCols=state.cols.filter(c=>!c.system),cls="workspace overview-workspace detail-closed"+(state.leftCollapsed?" left-collapsed":"")+pageEnterCls();return shell("<div class='"+cls+"'><aside class='rail'>"+sideNav(vaultStatsBlock(stats,realCols))+sidebarMain()+"</aside><main class='main overview-main'>"+moodboardListMarkup(moodboardListCtx())+"</main></div>")}
function moodboardEditView(){let board=activeMoodboard();if(!board){state.view="moodboards";return moodboardsView()}if(!moodboardEditorUi){if(!state.moodboardEditorLoading){state.moodboardEditorLoading=true;ensureMoodboardEditorUi().then(()=>{state.moodboardEditorLoading=false;render()}).catch(()=>{state.moodboardEditorLoading=false;toast("Could not load moodboard editor.");state.view="moodboards";render()})}return shell("<div class='moodboard-editor-loading boot-skeleton' aria-busy='true' aria-label='Loading moodboard editor'><div class='boot-topbar'><span class='skeleton-box mark'></span><span class='skeleton-line title'></span></div><div class='boot-grid'><aside><span class='skeleton-pill'></span><span class='skeleton-pill'></span></aside><main><span class='skeleton-line wide'></span><div class='boot-cards'><span></span><span></span><span></span></div></main></div></div>")}ensureMoodboardAutosave();let html=moodboardEditorUi.smartGridEditorMarkup({board,items:state.items,esc,escA,icon,uiIcon,media,host,saveStatus:state.moodboardSaveStatus,canUndo:moodboardHistory.canUndo(),canRedo:moodboardHistory.canRedo(),selectedObjectId:state.selectedObject,selectedObjectIds:state.selectedObjectIds||[],tool:state.moodboardTool||"select",sourceCollapsed:!!state.moodboardSourceCollapsed,inspectorCollapsed:mbInspectorHidden(),zoom:mbZoom(),connStyle:state.moodboardConnStyle||"elbow",sourceWidth:state.moodboardSourceWidth,inspectorWidth:state.moodboardInspectorWidth});if(state.pageEnter)html=html.replace('class="moodboard-editor','class="moodboard-editor page-enter');return shell(html)}

function projectCollectionRow(p,c){let items=projectItems(p).filter(i=>(i.collectionIds||[]).includes(c.id)),fallback=itemsForCollection(c.id).length;return "<article class='list-card collection-list-card'><button class='list-card-main' data-col='"+c.id+"'>"+icon("collection")+"<span><strong>"+esc(c.name)+"</strong><small>"+(items.length||fallback)+" objects</small></span></button><div class='list-card-actions'><button data-editcol='"+c.id+"' title='Rename'>"+icon("edit")+"</button><button class='danger-link' data-unlink-proj-col='"+p.id+":"+c.id+"' title='Remove from project'>"+icon("trash")+"</button></div></article>"}
function projectMoodboardRow(p,b){let openAttr=b._source==="standalone"||b.layoutMode==="smart_grid"?"data-open-moodboard='"+b.id+"'":"data-openboard='"+p.id+":"+b.id+"'";return "<article class='list-card moodboard-list-card'><button class='list-card-main' "+openAttr+">"+moodboardPreview(b)+"<span><strong>"+esc(b.name)+"</strong><small>"+((b.objects||[]).length)+" objects · "+esc(p.name)+(b.layoutMode==="smart_grid"?" · Smart Grid":"")+"</small></span></button><div class='list-card-actions'><button data-editboard='"+p.id+":"+b.id+"' title='Rename'>"+icon("edit")+"</button><button class='danger-link' data-unlink-proj-board='"+p.id+":"+b.id+"' title='Remove from project'>"+icon("trash")+"</button></div></article>"}
function moodboardCard(pair){let p=pair.project,b=pair.board;return "<article class='moodboard-index-card'><button class='moodboard-card-open' data-openboard='"+p.id+":"+b.id+"'>"+moodboardPreview(b)+"<span><strong>"+esc(b.name)+"</strong><small>"+esc(p.name)+" · "+((b.objects||[]).length)+" objects</small></span></button><div class='moodboard-card-actions'><button data-openboard='"+p.id+":"+b.id+"'>Open</button><button data-editboard='"+p.id+":"+b.id+"'>Edit</button><button class='danger-link' data-delboard='"+p.id+":"+b.id+"'>Delete</button></div></article>"}
function moodboardPreview(b){let objs=(b.objects||[]).slice(0,6);return "<div class='moodboard-preview'>"+(objs.length?objs.map((o,idx)=>"<i class='preview-obj p"+(idx%6)+"' style='background:"+previewColor(o)+"'></i>").join(""):"<i class='preview-empty'></i><i class='preview-empty two'></i><i class='preview-empty three'></i>")+"</div>"}
function boardView(){let p=project(),b=board(),obj=selectedObj(),items=filtered(),cls="board-workspace"+(state.leftCollapsed?" left-collapsed":"")+(state.rightCollapsed?" right-collapsed":"")+pageEnterCls(),right=state.rightCollapsed?rightCollapsedPanel("Inspector"):("<div class='detail-header'><span class='status-pill'>Moodboard</span><button class='icon-button drawer-close' data-toggle-right title='Close inspector'>"+icon("close")+"</button></div><h2>Selected Object</h2>"+(obj?objectInspector(obj):"<p class='inspector-empty'>Select an object, drag from the vault, or add a text object.</p>")+"<button class='primary-button wide' data-board-save>Save Board</button><button class='ghost-button wide' data-share>Share Link</button>");return shell("<div class='"+cls+"' style='--right-width:"+state.rightWidth+"px'><aside class='project-rail'>"+sideNav()+sidebarMain()+"</aside><aside class='library-rail'><div class='rail-heading'><h2>My Vault</h2><button class='mini-button' data-board-save>Save</button></div><div class='board-filter'><select data-lib-filter><option value='all'>All Items</option><option value='image'>Images</option><option value='video'>Videos</option><option value='link'>Links</option><option value='note'>Notes</option></select></div><div class='library-grid'>"+items.map(libraryCard).join("")+"</div><p class='library-hint'>Drag items to canvas to add</p></aside><main class='board-main'>"+projectContextPanel(p)+"<section class='board-title-row'><div><input class='board-title' data-board-title value='"+escA(b.name)+"'><p>Project: "+esc(p.name)+"</p></div><div class='board-toolbar'><button class='ghost-button' data-addtext>Add Text</button><button class='ghost-button' data-addfromvault>Add From Vault</button><button class='ghost-button' data-export>Export</button><button class='ghost-button' data-grid>Grid</button></div></section><section class='canvas-wrap'><div class='mood-canvas' data-canvas>"+b.objects.map(boardObject).join("")+"</div></section></main><aside class='inspector "+(state.rightCollapsed?"mini":"")+"'>"+(state.rightCollapsed?right:resizeHandle()+right)+"</aside></div>")}
function collectionsView(){let stats=count(),realCols=state.cols.filter(c=>!c.system),cls="workspace overview-workspace detail-closed"+(state.leftCollapsed?" left-collapsed":"")+pageEnterCls(),found=collectionsFiltered(),cards=found.list.map(collectionCard).join("");return shell("<div class='"+cls+"'><aside class='rail'>"+sideNav(vaultStatsBlock(stats,realCols))+sidebarMain()+"</aside><main class='main overview-main'><section class='page-head'><div class='page-head-title'><h1>Collections</h1>"+howtoInfoButton("collections")+"</div></section><div class='studio-toolbar'>"+studioSearchMarkup("collections",state.collectionsQ,"Search collections, images or colors…")+"<button class='primary-button' data-newcol>"+icon("plus")+"<span>New Collection</span></button></div>"+"<p class='studio-search-note' data-studio-note='collections'>"+esc(found.note)+"</p><section class='collection-overview-grid'>"+cards+"</section></main></div>")}
function collectionStackMarkup(colId){let items=itemsForCollection(colId).slice().sort((a,b)=>(Number(b.createdAt)||0)-(Number(a.createdAt)||0)).slice(0,5),n=Math.max(items.length,1),mid=(n-1)/2,order=items.length?items:[null],spatial=[],k=0;order.forEach((it,idx)=>{if(idx%2===0)spatial.push(it);else spatial.unshift(it)});return "<div class='cstack' style='--n:"+n+"' aria-hidden='true'>"+spatial.map((it,i)=>{let src=it?(it.thumbnailUrl||it.previewUrl||(it.type==="image"?it.assetUrl:"")||""):"",z=n-Math.round(Math.abs(i-mid)*2)/2;return "<span class='cstack-card"+(src?"":" is-empty")+"' style='--i:"+i+";--z:"+Math.round(z*2)+"'>"+(src?"<img src='"+escA(src)+"' alt='' loading='lazy' decoding='async' draggable='false'>":(it?icon(it.type==="video"?"video":it.type==="link"?"link":"note"):""))+"</span>"}).join("")+"</div>"}
function collectionMosaicMarkup(colId){let previews=collectionHighlightPreviews(colId);return"<div class='collection-highlight-mosaic collection-card-mosaic' aria-hidden='true'>"+collectionHighlightThumb(previews[0],"main")+collectionHighlightThumb(previews[1],"tr")+collectionHighlightThumb(previews[2],"br")+"</div>"}
function collectionTypeChipsMarkup(items){let t=typeCounts(items),parts=[];[["image","image"],["video","video"],["link","link"],["note","note"]].forEach(pair=>{if(t[pair[0]])parts.push("<span>"+t[pair[0]]+" "+pair[1]+(t[pair[0]]===1?"":"s")+"</span>")});return parts.length?"<div class='collection-card-type-row'>"+parts.join("")+"":"<p class='collection-card-empty-note'>No objects yet</p>"}
function collectionCardBadgesMarkup(c,opts){let parts=[];if(opts.highlighted)parts.push("<span class='collection-card-badge is-highlight'>Highlighted</span>");if(opts.pinned)parts.push("<span class='collection-card-badge is-pinned'>Pinned</span>");if(opts.isSub&&opts.parent)parts.push("<span class='collection-card-badge is-sub'>In "+esc(opts.parent.name)+"</span>");return parts.length?"<div class='collection-card-badges'>"+parts.join("")+"</div>":""}
function collectionUpdatedLabel(items){if(!items.length)return"Waiting for first save";let ts=Math.max(...items.map(i=>Number(i.createdAt)||0));return ts?"Updated "+new Date(ts).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):""}
function collectionCard(c){let items=itemsForCollection(c.id),custom=!c.system,isSub=!!c.parentId,parent=c.parentId?state.cols.find(x=>x.id===c.parentId):null,highlighted=Number(c.highlightedAt)>0,pinned=!!c.pinnedAt,updated=collectionUpdatedLabel(items);return "<article class='collection-card collection-detail-card "+(state.col===c.id?"active":"")+(isSub?" sub-collection-card":"")+(highlighted?" is-highlighted":"")+"'><button type='button' class='collection-card-open' data-col='"+c.id+"' title='"+escA(c.name)+"'><div class='collection-card-visual'>"+collectionStackMarkup(c.id)+(highlighted?"<span class='collection-card-highlight-badge' title='Highlighted' aria-hidden='true'>★</span>":"")+"</div><div class='collection-card-body'><div class='collection-card-head'><strong>"+esc(c.name)+"</strong><span class='collection-card-count'>"+items.length+" object"+(items.length===1?"":"s")+"</span></div><p class='collection-card-updated'>"+esc(updated)+"</p>"+collectionCardBadgesMarkup(c,{highlighted:highlighted,pinned:pinned,isSub:isSub,parent:parent})+collectionTypeChipsMarkup(items)+"</div></button>"+(custom?"<div class='collection-card-footer'><button type='button' class='collection-card-action collection-card-star"+(highlighted?" is-on":"")+"' data-highlightcol='"+c.id+"' title='"+(highlighted?"Remove highlight":"Highlight")+"' aria-label='"+(highlighted?"Remove highlight":"Highlight collection")+"' aria-pressed='"+(highlighted?"true":"false")+"'><svg class='flat-icon' viewBox='0 0 24 24' fill='"+(highlighted?"currentColor":"none")+"' stroke='currentColor' stroke-width='1.8' stroke-linejoin='round' aria-hidden='true'><path d='m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z'/></svg></button><span class='collection-card-spacer'></span><button type='button' class='collection-card-action' data-sharecol='"+c.id+"' title='Share collection' aria-label='Share collection'><svg class='flat-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='m15 4 5 5-5 5'/><path d='M20 9H10a6 6 0 0 0-6 6v4'/></svg>"+"<span>Share</span></button><button type='button' class='collection-card-action' data-editcol='"+c.id+"' title='Edit collection' aria-label='Edit collection'>"+icon("edit")+"<span>Edit</span></button><button type='button' class='collection-card-action danger-link' data-delcol='"+c.id+"' title='Delete collection' aria-label='Delete collection'>"+icon("trash")+"<span>Delete</span></button></div>":"")+"</article>"}
function projectCard(p){return projectFolderCard(p)}
function profileView(){
  let stats=count(),
    realCols=state.cols.filter(c=>!c.system),
    s=storageBreakdown(),
    email=state.user&&state.user.email||"creative@aplus.local",
    dashboard=computeDashboardStats(state,{storageBreakdown,formatBytes,getVaultApiToken}),
    keep=computeKeepActivity(state.items),
    keepCard=keepActivityMarkup(keep,{esc}),
    label=profileLabel(),
    storagePct=Math.min(100,s.total/s.limit*100),
    themeLabel=state.theme==="system"?"System":state.theme==="dark"?"Dark":"Light",
    tokenReady=!!(getVaultApiToken&&getVaultApiToken()),
    recent=profileRecentMarkup(state.items,{esc,escA,media,typeLabel:t=>L[t]||t}),
    collectionsCard=profileCollectionsCardMarkup(state.cols,state.items,{esc,media,itemsForCollection}),
    projectsCard=profileProjectsCardMarkup(state.projects,state.items,{esc,media,projectItems});
  return shell(
    "<div class='workspace profile-workspace"+(state.leftCollapsed?" left-collapsed":"")+" detail-closed"+pageEnterCls()+"'>"+
      "<aside class='rail'>"+sideNav(vaultStatsBlock(stats,realCols))+sidebarMain()+"</aside>"+
      "<main class='main profile-main'>"+
        "<section class='settings-page profile-studio'>"+
          "<header class='settings-page-head profile-studio-head'>"+
            "<div class='profile-studio-head-copy'>"+
              "<span class='section-label'>Account</span>"+
              "<h1>Profile</h1>"+
              "<p>Your Vault pulse and daily keep activity.</p>"+
            "</div>"+
            "<button type='button' class='ghost-button profile-settings-button' data-view='settings' title='Settings' aria-label='Open settings'>"+icon("settings")+"<span>Settings</span></button>"+
          "</header>"+
          "<div class='profile-studio-layout profile-studio-layout-2'>"+
            "<section class='profile-studio-col profile-studio-hero'>"+
              "<article class='profile-studio-card profile-hero-card'>"+
                "<div class='profile-hero-stage'>"+
                  "<div class='profile-hero-avatar'>"+profileAvatarMarkup("profile-hero-face")+"</div>"+
                  "<div class='profile-hero-pills'>"+
                    "<span class='profile-recent-pill'>"+esc(String(dashboard.total))+" refs</span>"+
                    "<span class='profile-recent-pill'>"+esc(themeLabel)+"</span>"+
                    "<span class='profile-recent-pill "+(tokenReady?"is-ok":"is-warn")+"'>"+(tokenReady?"Token ready":"No token")+"</span>"+
                  "</div>"+
                "</div>"+
                "<div class='profile-hero-copy'>"+
                  "<h2>"+esc(label)+"</h2>"+
                  "<p>"+esc(email)+"</p>"+
                "</div>"+
                "<div class='profile-hero-stats profile-hero-stats-2'>"+
                  "<div><strong>"+dashboard.total+"</strong><span>References</span></div>"+
                  "<div><strong>"+dashboard.savedThisWeek+"</strong><span>This week</span></div>"+
                  "<div><strong>"+dashboard.collections+"</strong><span>Collections</span></div>"+
                  "<div><strong>"+dashboard.projects+"</strong><span>Projects</span></div>"+
                "</div>"+
                "<div class='profile-hero-storage'>"+
                  "<div class='profile-hero-storage-label'><span>Storage</span><strong>"+esc(dashboard.storageLabel)+" / "+formatBytes(s.limit)+"</strong></div>"+
                  "<i class='profile-hero-meter'><b style='width:"+storagePct.toFixed(2)+"%'></b></i>"+
                "</div>"+
                "<div class='profile-hero-actions'>"+
                  "<button type='button' class='primary-button' data-view='vault'>"+icon("vault")+"<span>Open Vault</span></button>"+
                  "<button type='button' class='ghost-button' data-newcol>"+icon("collection")+"<span>New collection</span></button>"+
                  "<button type='button' class='ghost-button' data-logout>Log out</button>"+
                "</div>"+
              "</article>"+
              keepCard+
            "</section>"+
            "<section class='profile-studio-col profile-studio-pulse'>"+
              collectionsCard+
              projectsCard+
              "<article class='profile-studio-card profile-recent-card'>"+
                "<div class='settings-card-head profile-recent-head'>"+
                  "<div><h2>Recent</h2><p>Latest references in your Vault.</p></div>"+
                  "<button type='button' class='ghost-button' data-view='vault'>View all</button>"+
                "</div>"+
                recent+
              "</article>"+
            "</section>"+
          "</div>"+
        "</section>"+
      "</main>"+
    "</div>"
  );
}
function settingsNavMarkup(){return "<nav class='settings-nav' aria-label='Settings sections'>"+SETTINGS_SECTIONS.map(([k,l])=>"<button type='button' data-settings-jump='settings-"+k+"'>"+esc(l)+"</button>").join("")+"</nav>"}
function favoriteStyleList(v){return String(v||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean)}
function favoriteStyleChips(v){let picked=new Set(favoriteStyleList(v));return "<div class='style-chip-row'>"+FAVORITE_STYLE_PRESETS.map(t=>"<label class='style-chip'><input type='checkbox' name='favoriteStyle' value='"+escA(t)+"'"+(picked.has(t)?" checked":"")+"><span>"+esc(t)+"</span></label>").join("")+"</div>"}
function customFavoriteStyles(v){return favoriteStyleList(v).filter(t=>!FAVORITE_STYLE_PRESETS.includes(t)).join(", ")}
function maskToken(t){t=String(t||"");return t.length>10?t.slice(0,6)+"••••••••"+t.slice(-2):"••••••••"}
function providerLabel(p){return p==="google"?"Google":p==="supabase"||p==="password"?"Email & password":"Local preview"}
function settingsView(){
  let stats=count(),
    realCols=state.cols.filter(c=>!c.system),
    s=storageBreakdown(),
    email=state.user&&state.user.email||"creative@aplus.local",
    displayName=(state.user&&state.user.displayName||"").trim(),
    favoriteStyles=Array.isArray(state.user&&state.user.favoriteStyles)?state.user.favoriteStyles.join(", "):String(state.user&&state.user.favoriteStyles||""),
    site=(window.APLUS_VAULT_RUNTIME&&window.APLUS_VAULT_RUNTIME.siteUrl)||location.origin,
    dashboard=computeDashboardStats(state,{storageBreakdown,formatBytes,getVaultApiToken}),
    overview=settingsOverviewMarkup(dashboard,{esc,icon,formatBytes}),
    rightsMode=(state.user&&state.user.rightsMode)==="reference"?"reference":"auto";
  return shell(
    "<div class='workspace profile-workspace settings-workspace"+(state.leftCollapsed?" left-collapsed":"")+" detail-closed"+pageEnterCls()+"'>"+
      "<aside class='rail'>"+sideNav(vaultStatsBlock(stats,realCols))+sidebarMain()+"</aside>"+
      "<main class='main profile-main'>"+
        "<section class='settings-page profile-studio account-settings'>"+
          "<header class='settings-page-head profile-studio-head'>"+
            "<div class='profile-studio-head-copy'>"+
              "<span class='section-label'>Account</span>"+
              "<h1>Settings</h1>"+
              "<p>Profile, appearance, extension, search, security, and storage.</p>"+
            "</div>"+
            "<button type='button' class='ghost-button profile-settings-button' data-view='profile' title='Back to profile' aria-label='Back to profile'>"+icon("collapse")+"<span>Back to Profile</span></button>"+
          "</header>"+
          "<div class='account-settings-layout settings-with-nav'>"+
            settingsNavMarkup()+
            "<div class='settings-sections'>"+"<div id='settings-overview'>"+overview+"</div>"+
            "<article class='profile-studio-card' id='settings-profile'>"+
              "<div class='settings-card-head'>"+
                "<h2>Profile</h2>"+
                "<p>How you appear in A+ Vault, and the styles you save most.</p>"+
              "</div>"+
              "<form class='profile-form settings-form' data-profile>"+
                "<div class='profile-avatar-editor'>"+
                  "<div class='profile-avatar-preview'>"+profileAvatarMarkup("settings-avatar")+"</div>"+
                  "<div class='profile-avatar-actions'>"+
                    "<label class='ghost-button profile-avatar-upload'>"+icon("image")+"<span>"+(state.user&&state.user.avatarUrl?"Change photo":"Upload photo")+"</span>"+
                      "<input type='file' data-avatar-upload accept='image/jpeg,image/png,image/webp' hidden>"+
                    "</label>"+
                    (state.user&&state.user.avatarUrl?"<button type='button' class='ghost-button' data-avatar-remove>Remove photo</button>":"")+
                    "<p class='settings-field-hint'>JPG, PNG, or WebP up to 2MB.</p>"+
                  "</div>"+
                "</div>"+
                "<label>Display name<input name='displayName' type='text' value='"+escA(displayName)+"' placeholder='Your name' autocomplete='name' maxlength='60'></label>"+
                "<div class='settings-field'><span class='settings-field-label'>Favorite styles</span>"+favoriteStyleChips(favoriteStyles)+
                  "<input name='favoriteStylesExtra' type='text' value='"+escA(customFavoriteStyles(favoriteStyles))+"' placeholder='Add your own, comma-separated' aria-label='Other favorite styles'></div>"+
                "<div class='settings-actions profile-studio-save-row'>"+
                  "<button class='primary-button profile-studio-save'>Save profile</button>"+
                "</div>"+
              "</form>"+
            "</article>"+
            "<article class='profile-studio-card' id='settings-appearance'>"+
              "<div class='settings-card-head'>"+
                "<h2>Appearance</h2>"+
                "<p>Light, dark, or match your system.</p>"+
              "</div>"+
              "<div class='settings-theme-row'>"+themeControl()+"</div>"+
            "</article>"+
            "<article class='profile-studio-card profile-studio-extension' id='settings-extension'>"+
              "<div class='settings-card-head'>"+
                "<h2>Chrome extension</h2>"+
                "<p>The extension connects itself when you’re logged in here — nothing to paste. If it ever doesn’t, paste this token in the popup. API Base: <code>"+esc(site.replace(/\/$/,""))+"</code></p>"+
              "</div>"+
              "<div class='extension-token-box'><code data-extension-token data-masked='true'>"+esc(getVaultApiToken()?maskToken(getVaultApiToken()):"Log in to generate a token")+"</code>"+
                (getVaultApiToken()?"<button type='button' class='ghost-button token-reveal' data-reveal-token aria-pressed='false'>Show</button>":"")+"</div>"+
              "<p class='settings-field-hint'>Anyone with this token can save into your Vault. Refresh it if you shared it by mistake.</p>"+
              "<div class='settings-actions'>"+
                "<button type='button' class='primary-button' data-copy-extension-token>Copy token</button>"+
                "<button type='button' class='ghost-button' data-regenerate-extension-token>Refresh token</button>"+
              "</div>"+
              "<div class='install-app-row' data-install-row><div><strong>Install A+ Vault as an app</strong><span data-install-hint>Opens in its own window with a home-screen icon.</span><span data-install-hint-ios>On iPhone: tap Share, then <b>Add to Home Screen</b>.</span></div><button type='button' class='primary-button' data-install-app>Install</button></div>"+
              "<details class='mobile-save-guide'><summary>Save from your phone</summary>"+
                "<div class='mobile-save-steps'><h3>Android</h3><ol><li>Open A+ Vault in Chrome and choose <strong>Add to Home screen</strong>.</li><li>In any app (Pinterest, Instagram, browser) tap <strong>Share → A+ Vault</strong>. The link opens ready to keep.</li></ol>"+
                "<h3>iPhone (Shortcuts app)</h3><ol><li>New shortcut → turn on <strong>Show in Share Sheet</strong>, accept URLs.</li><li>Add <strong>Get Contents of URL</strong>: <code>"+esc(site.replace(/\/$/,""))+"/api/vault/capture</code>, method <strong>POST</strong>.</li><li>Header <code>Authorization</code> = <code>Bearer</code> + your token above.</li><li>Request body JSON: <code>type</code> = link, <code>sourceUrl</code> = Shortcut Input.</li><li>Name it <strong>Keep in Vault</strong>, then Share → Keep in Vault from any app.</li></ol></div>"+
              "</details>"+
            "</article>"+
            "<article class='profile-studio-card' id='settings-search'>"+
              "<div class='settings-card-head'>"+
                "<h2>Search & usage rights</h2>"+
                "<p>How Vault labels whether a reference can go into client work.</p>"+
              "</div>"+
              "<label class='settings-select-row'><span>Usage rights for new and unlabeled items</span><select data-rights-mode>"+
                "<option value='auto'"+(rightsMode==="auto"?" selected":"")+">Guess from the source (CC0, Unsplash, Pexels…)</option>"+
                "<option value='reference'"+(rightsMode==="reference"?" selected":"")+">Treat everything as reference only</option>"+
              "</select></label>"+
              "<p class='settings-field-hint'>Items you labeled yourself keep their label. Thai search works in Discover and My Vault (e.g. “เก้าอี้วินเทจ”, “ลายดอกไม้สีแดง”).</p>"+
            "</article>"+
            "<article class='profile-studio-card' id='settings-shortcuts'>"+
              "<div class='settings-card-head'>"+
                "<h2>Keyboard shortcuts</h2>"+
                "<p>Press <kbd>?</kbd> anywhere to see this list.</p>"+
              "</div>"+
              shortcutsListMarkup()+
            "</article>"+
            "<article class='profile-studio-card' id='settings-security'>"+
              "<div class='settings-card-head'>"+
                "<h2>Sign-in & security</h2>"+
                "<p>Your login and active sessions.</p>"+
              "</div>"+
              "<dl class='settings-facts'>"+
                "<div><dt>Email</dt><dd>"+esc(email)+"</dd></div>"+
                "<div><dt>Signed in with</dt><dd>"+esc(providerLabel(state.user&&state.user.provider))+"</dd></div>"+
              "</dl>"+
              "<div class='settings-actions'>"+
                (state.user&&state.user.provider==="google"?"":"<button type='button' class='google-button' data-google-login>"+icon("google")+"<span>Link Google sign-in</span></button>")+
                "<button type='button' class='ghost-button' data-logout>Sign out</button>"+
                "<button type='button' class='ghost-button danger-button' data-logout-everywhere>Sign out on all devices</button>"+
              "</div>"+
            "</article>"+
            "<article class='profile-studio-card profile-privacy-card' id='settings-privacy'>"+
              "<div class='settings-card-head'>"+
                "<h2>Privacy & Legal</h2>"+
                "<p>Export, clear, or delete your account data.</p>"+
              "</div>"+
              "<div class='settings-stack privacy-data-actions'>"+
                "<div class='consent-choices' aria-label='Your privacy choices'>"+consentToggleMarkup("ai_private_tagging",esc)+consentToggleMarkup("marketing_email",esc)+"</div>"+
                "<button type='button' class='primary-button wide' data-export-vault>Export my data</button>"+
                "<button type='button' class='ghost-button wide' data-clear-vault>Clear data on this device</button>"+
                "<button type='button' class='ghost-button wide danger-button' data-delete-account>Delete my Vault data</button>"+
              "</div>"+
              "<div class='legal-link-list profile-legal-compact'>"+
                "<a href='./legal.html#privacy' target='_blank' rel='noreferrer'>Privacy</a>"+
                "<a href='./legal.html#cookies' target='_blank' rel='noreferrer'>Cookies</a>"+
                "<a href='./legal.html#data-rights' target='_blank' rel='noreferrer'>Export & Deletion</a>"+
                "<a href='./legal.html#copyright' target='_blank' rel='noreferrer'>Copyright</a>"+
                "<a href='./legal.html#ai' target='_blank' rel='noreferrer'>AI Notice</a>"+
                "<a href='./legal.html#security' target='_blank' rel='noreferrer'>Security</a>"+
              "</div>"+
            "</article>"+
            "<article class='profile-studio-card profile-storage-mini' id='settings-storage'>"+
              "<div class='settings-card-head'>"+
                "<h2>Storage</h2>"+
                "<p>1 GB Vault quota for references and uploads.</p>"+
              "</div>"+
              "<div class='storage-meter'><strong>"+formatBytes(s.total)+"</strong><span>of 1 GB used</span><i><b style='width:"+Math.min(100,s.total/s.limit*100).toFixed(2)+"%'></b></i></div>"+
              "<div class='storage-breakdown'>"+storageRows(s).join("")+"</div>"+
            "</article>"+
            "</div>"+
          "</div>"+
        "</section>"+
      "</main>"+
    "</div>"
  );
}
function brandMark(){return "<span class='brand-mark header-logo' aria-hidden='true'><img class='brand-mark-img brand-mark-light' src='/assets/vault-logo.png' alt=''><img class='brand-mark-img brand-mark-dark' src='/assets/vault-logo-on-dark.png' alt=''></span>"}
function ensureVaultAdminPanel(){
  if(state.view!=="settings"||!isVaultSuperAdmin(state.user))return;
  if(state.adminLoaded&&!state.adminError)return;
  if(window.__vaultAdminFetch)return;
  if(!vaultRemote.enabled||!vaultRemote.hasSession()){
    state.adminError="Sign in with your Google/email account to open Vault Admin.";
    state.adminLoaded=true;
    state.adminLoading=false;
    return;
  }
  window.__vaultAdminFetch=true;
  state.adminLoading=true;
  state.adminError="";
  Promise.all([
    vaultRemote.adminOverview(),
    vaultRemote.adminListFeedback(40),
    vaultRemote.adminListCaptures(40)
  ]).then(([overview,feedback,captures])=>{
    state.adminOverview=overview||{};
    state.adminFeedback=Array.isArray(feedback)?feedback:[];
    state.adminCaptures=Array.isArray(captures)?captures:[];
    state.adminLoading=false;
    state.adminLoaded=true;
    window.__vaultAdminFetch=false;
    if(state.view==="settings")render();
  }).catch(err=>{
    state.adminLoading=false;
    state.adminLoaded=true;
    window.__vaultAdminFetch=false;
    state.adminError=err&&err.message||"Could not load admin data.";
    if(state.view==="settings")render();
  });
}
function bindSettingsOps(){
  ensureVaultAdminPanel();
  document.querySelectorAll("[data-feedback-rating]").forEach(b=>b.onclick=e=>{
    e.preventDefault();
    state.feedbackRating=Number(b.dataset.feedbackRating)||null;
    state.feedbackSubmitted=false;
    render();
  });
  document.querySelectorAll("[data-feedback-again]").forEach(b=>b.onclick=()=>{
    state.feedbackSubmitted=false;
    state.feedbackRating=null;
    state.feedbackMessage="";
    render();
  });
  let feedbackForm=document.querySelector("[data-feedback-form]");
  if(feedbackForm){
    let message=feedbackForm.querySelector("textarea[name='message']");
    if(message)message.oninput=()=>{state.feedbackMessage=message.value};
    feedbackForm.onsubmit=async e=>{
      e.preventDefault();
      if(!state.feedbackRating){toast("Choose a rating from 1 to 5.");return}
      if(!vaultRemote.enabled||!vaultRemote.hasSession()){toast("Sign in with a real account to send feedback.");return}
      let btn=feedbackForm.querySelector("[data-feedback-submit]");
      if(btn)btn.disabled=true;
      try{
        await vaultRemote.submitFeedback({rating:state.feedbackRating,message:state.feedbackMessage,feature:"vault"});
        state.feedbackSubmitted=true;
        state.feedbackMessage="";
        state.adminLoaded=false;
        toast("Thanks for your feedback.");
        render();
      }catch(err){
        toast(err&&err.message||"Could not send feedback.");
        if(btn)btn.disabled=false;
      }
    };
  }
  document.querySelectorAll("[data-admin-refresh]").forEach(b=>b.onclick=()=>{
    state.adminLoaded=false;
    state.adminError="";
    window.__vaultAdminFetch=false;
    ensureVaultAdminPanel();
    render();
  });
  document.querySelectorAll("[data-admin-purge-captures]").forEach(b=>b.onclick=()=>{
    openConfirmDialog({
      title:"Purge old captures",
      message:"Delete extension capture queue rows older than 30 days? This cannot be undone.",
      confirmText:"Purge",
      danger:true,
      onConfirm:async()=>{
        try{
          let result=await vaultRemote.adminPurgeCaptures(30);
          toast("Purged "+(result&&result.deleted||0)+" captures.");
          state.adminLoaded=false;
          window.__vaultAdminFetch=false;
          ensureVaultAdminPanel();
          render();
        }catch(err){
          toast(err&&err.message||"Purge failed.");
        }
      }
    });
  });
}

function brand(options){let sidebar=options&&options.sidebar;return "<div class='brand"+(sidebar?" sidebar-brand":"")+"'>"+brandMark()+(sidebar?"<div><p class='brand-title'>A+ Vault</p><p class='brand-subtitle'>You Create, We Connect</p></div>":"")+"</div>"}
function saveActionIcon(){return "<img class='save-action-icon' src='/assets/vault-save-icon-white-128.png' alt='' aria-hidden='true'>"}
function chip(t){let name=t==="all"?"All":L[t]+"s";return "<button class='chip "+(state.type===t?"active":"")+"' data-type='"+t+"'><span class='chip-icon'>"+icon(iconForType(t))+"</span><span>"+name+"</span></button>"}
function sortOptions(){return[["saved_new","Newest saved","Pinned first, then latest objects"],["saved_old","Oldest saved","Pinned first, then oldest objects"],["color","Main color","Arrange by primary color"],["keyword","Keyword","Arrange by first keyword"],["style","Style","Mood / visual language"],["category","Category","Furniture, art, UI, branding"]]}
function sortLabel(){let found=sortOptions().find(o=>o[0]===state.sortBy)||sortOptions()[0];return found[1]}
function vaultSortControl(){return "<div class='vault-sort'><button class='sort-trigger "+(state.sortMenu?"active":"")+"' data-sorttoggle title='Filter and sort objects' aria-label='Filter and sort objects'>"+icon("filter")+"<span>"+esc(sortLabel())+(activeFilterCount()?" · "+activeFilterCount()+" filter"+(activeFilterCount()>1?"s":""):"")+"</span></button>"+(state.sortMenu?"<div class='sort-popover' role='menu'><div class='sort-section'><span>Sort</span>"+sortOptions().map(o=>"<button class='"+(state.sortBy===o[0]?"active":"")+"' data-sortby='"+o[0]+"'><strong>"+esc(o[1])+"</strong><small>"+esc(o[2])+"</small></button>").join("")+"</div><div class='sort-section compact'><span>Color family</span><div class='filter-option-row'>"+filterButtons("filtercolor",colorFilterOptions(),state.filterColor)+"</div></div><div class='sort-section compact'><span>Style</span><div class='filter-option-row'>"+filterButtons("filterstyle",styleFilterOptions(),state.filterStyle)+"</div></div><div class='sort-section compact'><span>Category</span><div class='filter-option-row'>"+filterButtons("filtercategory",categoryFilterOptions(),state.filterCategory)+"</div></div><div class='sort-section compact'><span>Usage rights</span><div class='filter-option-row'>"+filterButtons("filterrightsopt",[["all","All"]].concat(Object.keys(USAGE_RIGHTS).map(k=>[k,USAGE_RIGHTS[k].label])),state.filterRights||"all")+"</div></div><div class='sort-section compact'><span>Saved</span><div class='filter-option-row'>"+filterButtons("filtersince",SAVED_WINDOWS,state.filterSince||"all")+"</div></div>"+(topSources(state.items).length?"<div class='sort-section compact'><span>Source</span><div class='filter-option-row'>"+filterButtons("filtersource",[["all","All"]].concat(topSources(state.items).map(h=>[h,h])),state.filterSource||"all")+"</div></div>":"")+(activeFilterCount()?"<button class='clear-filter-button' data-clearfilters>Clear filters</button>":"")+"</div>":"")+"</div>"}
function filterButtons(attr,options,current){return options.map(o=>"<button class='"+(current===o[0]?"active":"")+"' data-"+attr+"='"+o[0]+"'>"+esc(o[1])+"</button>").join("")}
function activeFilterCount(){return ["filterColor","filterStyle","filterCategory","filterRights","filterSource","filterSince"].filter(k=>state[k]&&state[k]!=="all").length}
function colorFilterOptions(){return[["all","All"],["warm","Warm"],["cool","Cool"],["neutral","Neutral"],["dark","Dark"],["light","Light"],["coral","Coral"]]}
function styleFilterOptions(){return[["all","All"],["minimal","Minimal"],["premium brand","Premium"],["campaign collage","Campaign"],["digital ui","Digital UI"],["motion","Motion"]]}
function categoryFilterOptions(){return[["all","All"],["branding","Branding"],["poster","Poster"],["interior","Interior"],["furniture","Furniture"],["product","Product"],["typography","Typography"],["ui","UI"],["illustration","Illustration"],["packaging","Packaging"],["other","Other"]]}
function colRow(c,opts){opts=opts||{};let depth=opts.depth||0,custom=!c.system,count=itemsForCollection(c.id).length,menuKey="col:"+c.id,menuOpen=state.openMenu===menuKey,isSub=depth>0||!!c.parentId,pinned=!!c.pinnedAt,highlighted=Number(c.highlightedAt)>0;return "<div class='collection-row "+(state.col===c.id?"active":"")+(menuOpen?" menu-open":"")+(isSub?" sub-collection":"")+(pinned?" is-pinned":"")+(highlighted?" is-highlighted":"")+"' data-dragcol='"+c.id+"' data-dropcol='"+c.id+"' style='--col-depth:"+depth+"' draggable='true'><button class='collection-open' data-col='"+c.id+"'>"+icon(c.system?"all":"collection")+"<span class='collection-name'>"+esc(c.name)+"</span>"+(pinned?"<span class='row-pin-badge' title='Pinned' aria-hidden='true'>"+uiIcon("pin")+"</span>":"")+(highlighted?"<span class='row-highlight-badge' title='Highlighted' aria-hidden='true'>★</span>":"")+"<span class='count'>"+count+"</span></button>"+(custom?"<div class='row-menu-wrap'><button type='button' class='row-icon-button row-menu-trigger' data-rowmenu='"+menuKey+"' title='Collection options' aria-label='Collection options'>...</button>"+(menuOpen?"<div class='row-menu' role='menu'><button type='button' data-pincol='"+c.id+"'>"+uiIcon("pin")+"<span>"+(pinned?"Unpin":"Pin to top")+"</span></button><button type='button' data-highlightcol='"+c.id+"'>"+icon("collection")+"<span>"+(highlighted?"Remove highlight":"Highlight on Vault")+"</span></button><button type='button' data-sharecol='"+c.id+"'>"+uiIcon("share")+"<span>Share</span></button><button type='button' data-editcol='"+c.id+"'>"+icon("edit")+"<span>Rename</span></button><button type='button' class='danger-menu' data-delcol='"+c.id+"'>"+icon("trash")+"<span>Delete</span></button></div>":"")+"</div>":"")+"</div>"}
function projectRow(p){let active=state.activeProject===p.id,boards=(p.boards||[]).length,cols=projectCollectionIds(p).length,menuKey="project:"+p.id,menuOpen=state.openMenu===menuKey,linked=projectLinkedCollectionsMarkup(p,state,esc),pinned=!!p.pinnedAt;return "<div class='project-row-wrap "+(active?"active":"")+(menuOpen?" menu-open":"")+(pinned?" is-pinned":"")+"' data-dropproject='"+p.id+"'><button class='project-row' data-project='"+p.id+"'><span class='project-row-title'>"+(pinned?"<span class='row-pin-badge' title='Pinned' aria-hidden='true'>"+uiIcon("pin")+"</span>":"")+"<span>"+esc(p.name)+"</span></span>"+projectMetaIconsMarkup(boards,cols,icon)+linked+"</button><div class='row-menu-wrap'><button type='button' class='row-icon-button row-menu-trigger' data-rowmenu='"+menuKey+"' title='Project options' aria-label='Project options'>...</button>"+(menuOpen?"<div class='row-menu' role='menu'><button type='button' data-project='"+p.id+"'>"+icon("project")+"<span>Open</span></button><button type='button' data-pinproject='"+p.id+"'>"+uiIcon("pin")+"<span>"+(pinned?"Unpin":"Pin to top")+"</span></button><button type='button' data-addprojectboard='"+p.id+"'>"+icon("plus")+"<span>Add board</span></button><button type='button' data-editproject='"+p.id+"'>"+icon("edit")+"<span>Rename</span></button><button type='button' class='danger-menu' data-delproject='"+p.id+"'>"+icon("trash")+"<span>Delete</span></button></div>":"")+"</div></div>"}
function card(i,idx){let a=i.analysis||{},colors=(a.colors||[]).slice(0,5),menu=state.openMenu===i.id,pinned=!!i.pinnedAt,picked=(state.selectedIds||[]).includes(i.id);return "<article class='pin-card "+(menu?"menu-open ":"")+(pinned?"pinned ":"")+(picked?"is-selected ":"")+"' style='--card-index:"+((idx||0)%18)+"' draggable='true' data-dragitem='"+i.id+"' data-dropitem='"+i.id+"' data-sel='"+i.id+"' tabindex='0'><div class='pin-frame'><label class='object-select-check' title='Select object'><input type='checkbox' data-toggle-select='"+i.id+"' "+(picked?"checked":"")+" aria-label='Select object'></label><button type='button' class='object-pin-button "+(pinned?"active":"")+"' data-pin='"+i.id+"' title='"+(pinned?"Unpin":"Pin to top")+"' aria-label='Pin object'>"+uiIcon("pin")+"</button><div class='pin-media'>"+media(i)+"</div>"+""+"</div><div class='pin-meta compact-card-meta'><h3>"+esc(i.title)+"</h3><div class='card-meta-actions'>"+(colors.length?"<div class='card-color-stack' aria-label='Color palette'>"+colors.map(c=>"<span style='background:"+safeHex(c)+"'></span>").join("")+"</div>":"")+"<button type='button' class='card-menu-trigger meta-menu-trigger' data-cardmenu='"+i.id+"' aria-label='Open object menu'>...</button>"+(menu?cardMenu(i):"")+"</div></div></article>"}
function cardMenu(i){return "<div class='card-menu' role='menu'><button data-menucol='"+i.id+"'>Keep in Collections</button><button data-use='"+i.id+"'>Use in MoodBoard</button><button class='danger-menu' data-menudel='"+i.id+"'>Delete</button></div>"}

function libraryCard(i){return "<div class='lib-card' draggable='true' data-lib='"+i.id+"'><div class='lib-thumb'>"+media(i)+"</div><span>"+esc(i.title)+"</span></div>"}
function bindMediaLightboxControls(){document.querySelectorAll("[data-open-lightbox]").forEach(el=>{el.onclick=e=>{e.preventDefault();e.stopPropagation();openMediaLightbox(el.dataset.openLightbox)};el.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openMediaLightbox(el.dataset.openLightbox)}}});document.querySelectorAll("[data-close-lightbox]").forEach(el=>el.onclick=e=>{if(e.target!==el&&!e.target.closest(".media-lightbox-close"))return;e.preventDefault();e.stopPropagation();closeMediaLightbox()});document.querySelectorAll("[data-lightbox-stage]").forEach(el=>el.onclick=e=>e.stopPropagation())}
function openMediaLightbox(itemId){if(!itemId)return;let i=state.items.find(x=>x.id===itemId);if(!i)return;state.mediaLightbox=itemId;render()}
function closeMediaLightbox(){if(!state.mediaLightbox)return;state.mediaLightbox=null;render()}
function lightboxMedia(i){if(i.type==="image"&&i.assetUrl)return "<img src='"+escA(i.assetUrl)+"' alt='"+escA(i.title)+"'>";if(i.type==="video"&&i.assetUrl)return "<video src='"+escA(i.assetUrl)+"' controls autoplay playsinline></video>";let preview=i.previewUrl||i.thumbnailUrl||"";if(preview)return "<img src='"+escA(preview)+"' alt='"+escA(i.title)+"'>";return media(i)}
function mediaLightboxMarkup(){let i=state.items.find(x=>x.id===state.mediaLightbox);if(!i)return "";return "<div class='media-lightbox' data-close-lightbox role='dialog' aria-modal='true' aria-label='Full size preview'><button type='button' class='media-lightbox-close' data-close-lightbox title='Close' aria-label='Close'>"+icon("close")+"</button><div class='media-lightbox-stage' data-lightbox-stage>"+lightboxMedia(i)+"</div><p class='media-lightbox-caption'>"+esc(i.title||"")+"</p></div>"}
function media(i){let preview=i.previewUrl||i.thumbnailUrl||"",lazy=" loading='lazy' decoding='async'";if(i.type==="image"&&i.assetUrl)return "<img src='"+escA(i.assetUrl)+"' alt='"+escA(i.title)+"' draggable='false'"+lazy+">";if(i.type==="video")return i.assetUrl?"<video class='vault-video' src='"+escA(i.assetUrl)+"' controls muted preload='none' draggable='false'></video>":"<div class='video-preview'>"+icon("video")+"<strong>"+esc(i.title)+"</strong></div>";if(i.type==="link")return preview?"<img src='"+escA(preview)+"' alt='"+escA(i.title)+"' draggable='false'"+lazy+">":"<div class='link-preview'><strong>"+esc(host(i.sourceUrl)||i.title)+"</strong></div>";return "<div class='note-preview'><strong>"+esc(i.title)+"</strong></div>"}
function boardObject(o){let active=state.selectedObject===o.id;let style="left:"+o.x+"px;top:"+o.y+"px;width:"+o.w+"px;height:"+o.h+"px;";if(o.kind==="text")return "<div class='board-object text-object "+(active?"selected":"")+"' data-obj='"+o.id+"' style='"+style+"'><div contenteditable='true' data-textobj='"+o.id+"' style='font-size:"+(o.size||28)+"px;color:"+(o.color||"#17191b")+"'>"+esc(o.text||"Text")+"</div><span class='handle'></span></div>";if(o.kind==="palette")return "<div class='board-object palette-object "+(active?"selected":"")+"' data-obj='"+o.id+"' style='"+style+"'>"+(o.colors||[]).map(c=>"<span style='background:"+c+"'></span>").join("")+"<span class='handle'></span></div>";let item=state.items.find(i=>i.id===o.itemId);return "<div class='board-object image-object "+(active?"selected":"")+"' data-obj='"+o.id+"' style='"+style+"'>"+(item?media(item):"")+"<span class='handle'></span></div>"}
function captureMethodLabel(i){let m=String(i.captureContext&&i.captureContext.method||"").toLowerCase();if(m==="discover")return "Discover";if(m.includes("extension"))return "Chrome extension";if(m.includes("upload")||m.includes("quick"))return "Upload";if(m.includes("manual"))return "Manual save";return "Vault"}
function detailExtractedText(a){let text=String(a&&a.ocrText||"").trim();if(!text)return"";if(/placeholder|metadata preview only|production build will|transcript\/ocr can be added/i.test(text))return"";return text}
function moodboardsUsingItem(itemId){let idStr=String(itemId||""),hits=[],seen=new Set();boardsUsingItem(state.moodboards,idStr).forEach(b=>{if(seen.has(b.id))return;seen.add(b.id);hits.push({id:b.id,name:b.name,standalone:true})});(state.projects||[]).forEach(p=>{(p.boards||[]).forEach(b=>{if(!(b.objects||[]).some(o=>o.kind==="item"&&String(o.itemId)===idStr))return;if(seen.has(p.id+":"+b.id))return;seen.add(p.id+":"+b.id);hits.push({id:b.id,name:b.name,projectId:p.id,projectName:p.name,standalone:false})})});return hits}
function detailObjectGlance(i){let style=styleLabel(i),cat=categoryLabel(i),fam=colorFamily(primaryColor(i)),chips=[];if(style&&style!=="general reference")chips.push({kind:"style",value:style,label:style});if(cat&&cat!=="other")chips.push({kind:"category",value:cat,label:cat});if(fam)chips.push({kind:"color",value:fam,label:fam+" tone"});if(!chips.length)return"";return "<div class='analysis-section object-glance-section'><div class='object-glance-chips'>"+chips.map(c=>c.kind==="style"?"<button type='button' class='object-glance-chip' data-filterstyle='"+escA(c.value)+"'>"+esc(c.label)+"</button>":c.kind==="category"?"<button type='button' class='object-glance-chip' data-filtercategory='"+escA(c.value)+"'>"+esc(c.label)+"</button>":"<button type='button' class='object-glance-chip' data-filtercolor='"+escA(c.value)+"'>"+esc(c.label)+"</button>").join("")+"</div></div>"}
function detailObjectSummary(a){let summary=String(a&&a.summary||"").trim();if(!summary)return"";return "<div class='analysis-section object-summary-section'><span>Summary</span><p class='object-summary-copy'>"+esc(summary)+"</p></div>"}
function detailObjectExtracted(a){let text=detailExtractedText(a);if(!text)return"";return "<details class='analysis-section object-extract-section'><summary>Extracted text</summary><div class='ocr-box object-extract-box'>"+esc(text)+"</div></details>"}
function detailObjectMoodboards(i){let hits=moodboardsUsingItem(i.id);if(!hits.length)return"<div class='analysis-section object-boards-section'><span>On moodboards</span><p class='object-boards-empty'>Not on any moodboard yet.</p></div>";return "<div class='analysis-section object-boards-section'><span>On moodboards</span><div class='object-boards-list'>"+hits.map(b=>b.standalone?"<button type='button' class='object-board-link' data-open-moodboard='"+escA(b.id)+"'>"+icon("board")+"<span><strong>"+esc(b.name)+"</strong><small>Smart grid board</small></span></button>":"<button type='button' class='object-board-link' data-openboard='"+escA(b.projectId)+":"+escA(b.id)+"'>"+icon("board")+"<span><strong>"+esc(b.name)+"</strong><small>"+esc(b.projectName)+"</small></span></button>").join("")+"</div></div>"}
function detailObjectMeta(i){let method=captureMethodLabel(i),captured=new Date(Number(i.createdAt)||Date.now()).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"});return "<p class='object-provenance'><span>Saved via "+esc(method)+"</span><span>·</span><span>"+esc(captured)+"</span></p>"}
function detailObjectProvenance(i){return detailDiscoverCredit(i)+usageRightsDetailMarkup(i)+(((i.analysis&&i.analysis.colors)||[]).length?"<button type='button' class='ghost-button vault-similar-button' data-vault-similar='"+escA(i.id)+"'>"+icon("search")+"<span>Find similar in my Vault</span></button>":"")}
function detailDiscoverCredit(i){let c=i.captureContext||{};if(c.method!=="discover"||!c.attribution)return "";let lic=({cc0:"CC0 Public Domain",pdm:"Public Domain Mark","cc-by":"CC BY","cc-by-sa":"CC BY-SA"})[String(c.license||"").toLowerCase()]||String(c.license||"").toUpperCase(),licUrl=/^https:\/\//.test(c.licenseUrl||"")?c.licenseUrl:"",src=/^https:\/\//.test(i.sourceUrl||"")?i.sourceUrl:"";return "<div class='object-credit'><span class='section-label'>Credit</span><p>"+esc(c.attribution)+"</p><p class='object-credit-meta'>"+(licUrl?"<a href='"+escA(licUrl)+"' target='_blank' rel='noopener noreferrer license'>"+esc(lic)+"</a>":esc(lic))+(src?" · <a href='"+escA(src)+"' target='_blank' rel='noopener noreferrer'>View at source</a>":"")+"</p></div>"}
function detailObjectCard(i){let a=i.analysis||{};return "<div class='analysis-card'>"+detailObjectProvenance(i)+detailObjectGlance(i)+((i.captureContext||{}).method==="discover"?"":detailObjectSummary(a))+"<div class='analysis-section keyword-section'><span>Keyword</span><div class='tag-row'>"+((a.tags||[]).length?(a.tags||[]).map(t=>"<span class='tag keyword-tag'><button type='button' class='tag-filter-button' data-filter-keyword='"+escA(t)+"' title='See objects with this keyword'>"+esc(t)+"</button><button type='button' class='tag-remove-button' data-remove-keyword='"+escA(t)+"' data-item-id='"+i.id+"' title='Remove keyword' aria-label='Remove "+escA(t)+"'>&times;</button></span>").join(""):"<span class='tag-empty'>No keywords yet</span>")+"</div><form class='keyword-add-form' data-add-keyword-form='"+i.id+"'><input name='keyword' type='text' placeholder='Add keyword' maxlength='40' autocomplete='off'><button type='submit' class='ghost-button keyword-add-button'>"+icon("plus")+"<span>Add</span></button></form></div><div class='analysis-section'><span>Colors</span>"+colorDetails(a.colors||[])+"</div>"+detailObjectExtracted(a)+detailObjectMoodboards(i)+detailObjectMeta(i)+"</div>"}
function detail(i){let cv=collectionValue(i),typeLabel=esc(L[i.type])+" object";return "<div class='drawer-inner"+(VIEWER.bw?" viewer-bw":"")+(VIEWER.grid?" viewer-grid":"")+"'><div class='detail-header'><span class='object-type-pill'>"+typeLabel+"</span><div class='detail-header-actions'><button class='icon-button detail-share-button' data-share-detail='"+i.id+"' title='Share link' aria-label='Share link'>"+uiIcon("share")+"</button><button class='icon-button detail-pin-button "+(i.pinnedAt?"active":"")+"' data-pin='"+i.id+"' title='"+(i.pinnedAt?"Unpin":"Pin to top")+"' aria-label='Pin object'>"+uiIcon("pin")+"</button><button class='icon-button drawer-close' data-close-detail title='Close details'>"+icon("close")+"</button></div></div><input class='detail-title' data-title value='"+escA(i.title)+"'><div class='detail-subline'><span class='detail-subline-source'>"+detailSourceLine(i)+"</span></div><div class='detail-preview is-loading can-lightbox' data-detail-preview data-open-lightbox='"+i.id+"' role='button' tabindex='0' title='View full size' aria-label='View full size'>"+media(i)+"<span class='viewer-thirds' aria-hidden='true'></span><span class='detail-preview-glow' aria-hidden='true'></span></div>"+vaultViewerBlock(i)+(i.type==="link"&&!(i.previewUrl||i.thumbnailUrl)?"<label class='ghost-button replace-image'><input type='file' accept='image/jpeg,image/png,image/webp' data-replace-image='"+escA(i.id)+"' hidden><span>Add an image</span></label>":"")+"<div class='detail-actions detail-primary-actions'><button class='primary-button' data-adddetail>"+icon("board")+"<span>Use in Moodboard</span></button><button class='ghost-button' data-keep-detail='"+i.id+"'>"+icon("collection")+"<span>Keep in Collection</span></button><button class='ghost-button ai-icon-button' data-ai title='Run AI Lite' aria-label='Run AI Lite'>"+icon("spark")+"</button></div>"+detailCollectionPicker(i)+"<div class='field'><label>Note</label><textarea data-note>"+esc(i.note||"")+"</textarea>"+noteHexChips(i.note)+"</div><div class='field'><label>Project</label><select data-itemproject><option value=''>No project</option>"+state.projects.map(p=>"<option value='"+p.id+"' "+((i.projectIds||[]).includes(p.id)?"selected":"")+">"+esc(p.name)+"</option>").join("")+"</select></div><div class='field'><label>Collection</label><select data-itemcol><option value='all' "+(cv==="all"?"selected":"")+">My Vault</option>"+state.cols.filter(c=>!c.system).map(c=>"<option value='"+c.id+"' "+(cv===c.id?"selected":"")+">"+esc(c.name)+"</option>").join("")+"</select></div>"+detailObjectCard(i)+"<div class='detail-actions'><button class='danger-button' data-del>Delete</button></div></div>"}
function detailCollectionPicker(i){if(state.collectionPicker!==i.id)return "";let cols=state.cols.filter(c=>!c.system);return "<div class='collection-picker'><span class='section-label'>Keep in Collection</span><div class='collection-picker-list'>"+(cols.length?cols.map(c=>"<button class='"+((i.collectionIds||[]).includes(c.id)?"active":"")+"' data-keepcol='"+i.id+":"+c.id+"'>"+icon("collection")+"<span>"+esc(c.name)+"</span>"+(((i.collectionIds||[]).includes(c.id))?"<small>Added</small>":"")+"</button>").join(""):"<p>Create a collection from the sidebar first.</p>")+"</div></div>"}
function objectInspector(o){let tags=[],colors=[];if(o.itemId){let item=state.items.find(i=>i.id===o.itemId);tags=(item&&item.analysis&&item.analysis.tags)||[];colors=(item&&item.analysis&&item.analysis.colors)||[]}if(o.kind==="palette")colors=o.colors||[];return "<div class='field'><label>Type</label><input value='"+escA(o.kind)+" object' readonly></div>"+(o.kind==="text"?"<div class='field'><label>Text</label><textarea data-inspector-text>"+esc(o.text||"")+"</textarea></div><div class='field'><label>Size</label><input data-inspector-size type='number' value='"+(o.size||28)+"'></div>":"")+"<div class='field'><label>Position</label><input value='x "+Math.round(o.x)+" / y "+Math.round(o.y)+" / "+Math.round(o.w)+" x "+Math.round(o.h)+"' readonly></div><div class='analysis-section'><span class='section-label'>AI Tags</span><div class='tag-row'>"+tags.slice(0,6).map(t=>"<span class='tag'>"+esc(t)+"</span>").join("")+"</div></div><div class='analysis-section'><span class='section-label'>Colors</span><div class='palette-row'>"+colors.map(c=>swatch(c,true)).join("")+"</div></div><button class='danger-button wide' data-delobj>Remove Object</button>"}
function empty(){let q=state.q.trim(),keyword=(state.filterKeyword||"").trim(),hex=(state.filterHex||"").trim();if(q||keyword||hex){let label=q||(keyword?"keyword “"+keyword+"”":"color "+safeHex(hex));return "<section class='empty-state'><div><h2>No matches for “"+esc(label)+"”.</h2><p>Try another keyword, color, style, or clear the filter.</p><button class='primary-button' data-clear-tag-filter>Clear filter</button></div></section>"}return "<section class='empty-state'><div><h2>Your private vault is ready.</h2><p>Start by saving an image, URL, or quick note. A+ Vault will turn it into a searchable creative asset.</p><button class='primary-button' data-open>Save your first asset</button></div></section>"}
function modal(){return "<div class='modal-backdrop' data-closemodal><section class='modal' data-modal><header class='modal-header'><div><h2>Save to A+ Vault</h2><p>Capture image, video, URL, or note as a reusable creative object.</p></div><button class='icon-button' data-closemodal>"+icon("close")+"</button></header><div class='modal-tabs'>"+["image","video","link","note"].map(m=>"<button class='modal-tab "+(state.mode===m?"active":"")+"' data-mode='"+m+"'>"+icon(m==="image"?"image":m==="video"?"video":m==="link"?"link":"note")+"<span>"+(m==="image"?"Upload Image":m==="video"?"Save Video":m==="link"?"Save URL":"Quick Note")+"</span></button>").join("")+"</div><div class='modal-body'>"+form()+"</div></section></div>"}
function form(){if(state.mode==="image")return "<form class='modal-form' data-form><input type='hidden' name='type' value='image'><div class='dropzone'><strong>Upload images</strong><span>Select one or many · JPG, PNG or WebP · up to 10MB each</span><input class='file-input' name='file' type='file' accept='image/jpeg,image/png,image/webp' multiple required></div><input name='title' placeholder='Title (optional)'><textarea name='note' class='note-compact' placeholder='Why is this worth keeping? (optional)'></textarea>"+saveContextFields("<input name='sourceUrl' placeholder='Source URL'>")+"<label class='rights-check'><input type='checkbox' name='rights' required><span>I own the rights or have permission to store this image. <a href='/legal#terms' target='_blank' rel='noopener'>Terms</a></span></label>"+footer()+"</form>";if(state.mode==="video")return "<form class='modal-form' data-form><input type='hidden' name='type' value='video'><input name='sourceUrl' type='url' placeholder='https://example.com/video.mp4' required><input name='title' placeholder='Title (optional)'><textarea name='note' class='note-compact' placeholder='Note (optional)'></textarea>"+saveContextFields()+footer()+"</form>";if(state.mode==="link")return "<form class='modal-form' data-form><input type='hidden' name='type' value='link'><input name='sourceUrl' type='url' placeholder='https://example.com/reference' required autocomplete='off'><div class='link-import' data-link-import aria-live='polite'></div><label class='link-import-thumb' data-link-import-thumb hidden><span>Add an image</span><input name='thumb' type='file' accept='image/jpeg,image/png,image/webp'></label><input name='title' placeholder='Title (optional)'><textarea name='note' class='note-compact' placeholder='Note (optional)'></textarea>"+saveContextFields()+footer()+"</form>";return "<form class='modal-form' data-form><input type='hidden' name='type' value='note'><input name='title' placeholder='Title' required><textarea name='note' placeholder='Capture the thought, mood, or client fit.' required></textarea>"+saveContextFields()+footer()+"</form>"}
function saveContextFields(extra){return "<div class='save-context-grid save-collection-only'><label>Collection<select name='collectionId'><option value='all'>My Vault</option>"+state.cols.filter(c=>!c.system).map(c=>"<option value='"+c.id+"'>"+esc(c.name)+"</option>").join("")+"</select></label></div><details class='save-more'><summary>More options</summary>"+(extra||"")+"<div class='save-metadata-grid'><label>Quick keywords <span>(1-2 words)</span><input name='quickKeywords' placeholder='minimal, warm, branding'></label><label>Visual category <span>(optional)</span><select name='visualCategory'>"+visualCategoryOptions().map(o=>"<option value='"+o[0]+"'>"+esc(o[1])+"</option>").join("")+"</select></label></div><div class='save-context-grid'><label>Project <span>(optional)</span><select name='projectId'><option value=''>No project</option>"+state.projects.map(p=>"<option value='"+p.id+"'>"+esc(p.name)+"</option>").join("")+"</select></label></div></details>"}
function visualCategoryOptions(){return[["","No category yet"],["branding","Branding"],["poster","Poster"],["interior","Interior"],["furniture","Furniture"],["product","Product"],["typography","Typography"],["ui","UI"],["illustration","Illustration"],["packaging","Packaging"],["other","Other"]]}
function footer(){return "<div class='modal-footer'><span class='help-text'>Saved to My Vault first</span><button class='primary-button'>"+saveActionIcon()+"<span>Save to Vault</span></button></div>"}
function isVaultAppPath(){return /^\/(?:|index\.html|vault(?:\/index\.html)?|discover)\/?$/i.test(location.pathname)}
function isDiscoverPath(){return /^\/(?:|index\.html|discover)\/?$/i.test(location.pathname)&&!/^#(?:object|collection|vault-capture|moodboard)/.test(location.hash||"")}
function normalizeVaultEntry(){if(!isVaultAppPath())return;if(/^\/(?:index\.html|discover\/?)$/i.test(location.pathname))history.replaceState(null,"",location.origin+"/"+location.hash);if(state.view==="home"||state.view==="login"||state.view==="object")state.view=isDiscoverPath()?"discover":"vault"}
function readDeepLinkObjectId(){let hash=location.hash||"";if(hash.startsWith("#object="))return decodeURIComponent(hash.slice(8).split("&")[0]);let q=new URLSearchParams(location.search).get("object");return q?decodeURIComponent(q):""}
function readDeepLinkCollectionId(){let hash=location.hash||"";if(hash.startsWith("#collection="))return decodeURIComponent(hash.slice(12).split("&")[0]);let q=new URLSearchParams(location.search).get("collection");return q?decodeURIComponent(q):""}
function syncObjectDeepLink(objectId){if(!objectId)return;state.selected=objectId;state.publicObject=null;state.view="vault";state.type="all";state.col="all";state.rightCollapsed=false;history.replaceState(null,"",location.origin+"/vault#object="+encodeURIComponent(objectId))}
function syncCollectionDeepLink(colId){if(!colId)return;let c=state.cols.find(x=>x.id===colId&&!x.system);if(!c)return;state.selected=null;state.publicObject=null;state.view="vault";state.type="all";state.col=colId;state.rightCollapsed=false;history.replaceState(null,"",location.origin+"/vault#collection="+encodeURIComponent(colId))}
function importDeepLinkCapture(){normalizeVaultEntry();let objectId=readDeepLinkObjectId();if(objectId){syncObjectDeepLink(objectId);return}let colId=readDeepLinkCollectionId();if(colId){syncCollectionDeepLink(colId);return}let hash=location.hash||"",prefix="#vault-capture=";if(!hash.startsWith(prefix))return;let encoded=hash.slice(prefix.length);state.view="vault";history.replaceState(null,"",location.origin+"/vault");try{let payload=decodeVaultPayload(encoded),key="hash:"+encoded.slice(0,160);if(load(S.captures,[]).includes(key))return;let item=itemFromCapturePayload(payload),src=host(item.sourceUrl);openConfirmDialog({title:"Keep this capture?",message:"Add “"+String(item.title||"Untitled").slice(0,120)+"”"+(src?" from "+src:"")+" to your Vault? Only continue if you just sent it from the A+ Vault extension.",confirmText:"Keep in Vault",onConfirm:()=>{let seen=load(S.captures,[]);if(seen.includes(key))return;ensureCollectionFromCapture(item);state.items=[item].concat(state.items);state.selected=item.id;state.sortBy="saved_new";save(S.items,state.items);save(S.captures,seen.concat(key).slice(-500));syncRemoteItem(item,"create");history.replaceState(null,"",location.origin+"/vault#object="+encodeURIComponent(item.id))}})}catch(e){console.warn("Could not import Vault capture.",e)}}
function decodeVaultPayload(encoded){let normalized=String(encoded||"").replace(/-/g,"+").replace(/_/g,"/");while(normalized.length%4)normalized+="=";let binary=atob(normalized),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return JSON.parse(new TextDecoder().decode(bytes))}
function startDevAutoRefresh(){let host=(location.hostname||"").toLowerCase();if(location.protocol==="file:"||!(host==="localhost"||host==="127.0.0.1"||host.endsWith(".local")))return;if(!/[?&]devwatch=1(?:&|$)/.test(location.search||""))return;let baseline=null,check=async()=>{try{let files=await Promise.all(["./app.js","./styles.css"].map(file=>fetch(file+"?dev="+Date.now(),{cache:"no-store"}).then(r=>r.ok?r.text():"")));return files.map(text=>[text.length,text.slice(0,80),text.slice(-80)].join(":")).join("|")}catch(_){return null}};check().then(sig=>baseline=sig);setInterval(async()=>{let sig=await check();if(baseline&&sig&&sig!==baseline)location.reload()},3500)}
function itemFromCapturePayload(payload){payload=payload&&typeof payload==="object"?payload:{};let ctx=payload.captureContext&&typeof payload==="object"?payload.captureContext||{}:{},raw=String(payload.type||"").toLowerCase(),type=raw==="image"?"image":raw==="video"?"video":raw==="link"||raw==="page"?"link":"note",sourceUrl=payload.sourceUrl||ctx.pageUrl||ctx.linkUrl||ctx.videoUrl||"",assetUrl=type==="image"?(payload.assetUrl||ctx.imageUrl||payload.previewUrl||""):type==="video"?(payload.assetUrl||ctx.videoUrl||sourceUrl):"",previewUrl=payload.previewUrl||payload.thumbnailUrl||ctx.previewUrl||ctx.ogImage||ctx.twitterImage||"",note=type==="note"?(payload.note||ctx.selectionText||""):(payload.note||""),title=payload.title||"";if(!title&&raw==="text")title=(note||"Saved text").slice(0,54);if(!title&&raw==="page")title=ctx.pageTitle||host(sourceUrl)||"Saved page";if(!title&&type==="link")title=host(sourceUrl)||"Saved link";if(!title&&type==="image")title=ctx.pageTitle||"Saved image";if(!title&&type==="video")title=ctx.pageTitle||host(sourceUrl)||"Saved video";ctx.quickTags=Array.isArray(ctx.quickTags)?ctx.quickTags:quickTagsFrom(payload.quickKeywords||ctx.quickKeywords);ctx.visualCategory=payload.visualCategory||ctx.visualCategory||"";ctx.usageNote=ctx.usageNote||"Private reference only";let item={id:id(),type,title,note,sourceUrl:safeHref(sourceUrl),assetUrl,previewUrl,thumbnailUrl:payload.thumbnailUrl||previewUrl,collectionIds:[payload.collectionId||"all"],projectIds:payload.projectId?[payload.projectId]:[],status:"ready",createdAt:Date.now(),captureContext:Object.assign({destination:"Vault Library",rawType:raw||type},ctx)};item.analysis=analyze(item);return item}
async function syncExtensionCaptures(silent){if(!state.user||syncExtensionCaptures.busy)return;syncExtensionCaptures.busy=true;try{let token=getVaultApiToken();if(!token)return;let response=await fetch("/api/vault/captures",{cache:"no-store",headers:{Authorization:"Bearer "+token}});if(!response.ok)return;let data=await response.json(),rows=Array.isArray(data.items)?data.items:[],seen=load(S.captures,[]),seenSet=new Set(seen),existing=new Set(state.items.map(i=>i.id)),fresh=[];rows.forEach(row=>{let objectId=row&&row.objectId||row&&row.item&&row.item.id;if(!objectId||seenSet.has(objectId))return;let item=normalizeCapturedItem(row.item||row);if(item&&item.id&&!existing.has(item.id)){ensureCollectionFromCapture(item);fresh.push(item);existing.add(item.id);seen.push(objectId)}});if(fresh.length){state.items=fresh.concat(state.items);state.sortBy="saved_new";save(S.items,state.items);save(S.captures,seen.slice(-500));for(let item of fresh)await syncRemoteItem(item,"create");if(!silent)toast(fresh.length===1?"Extension capture imported.":fresh.length+" extension captures imported.");render();if(state.selected&&state.items.some(i=>i.id===state.selected))openSelectedDetail(state.selected)}}catch(e){}finally{syncExtensionCaptures.busy=false}}
function broadcastExtensionCollections(){try{window.postMessage({type:"VAULT_EXTENSION_COLLECTIONS",collections:customCols().map(c=>({id:c.id,name:c.name}))},location.origin);if(state.user){let t=getVaultApiToken();if(t)window.postMessage({type:"VAULT_EXTENSION_PAIR",token:t},location.origin)}}catch(_){}}
window.addEventListener("message",e=>{if(e.source!==window||e.origin!==location.origin||!e.data||e.data.type!=="VAULT_EXTENSION_PAIRED")return;let seen=load("aplus-vault-ext-paired","");if(e.data.changed||!seen){save("aplus-vault-ext-paired","1");toast("Chrome extension connected. Right-click anything to + Keep.")}});
function mergeExtensionCollectionsIntoState(rows,silent){let incoming=Array.isArray(rows)?rows:[],changed=false;incoming.forEach(row=>{if(!row||!row.id||!row.name||row.id==="all")return;if(state.cols.some(c=>c.id===row.id))return;state.cols=state.cols.concat({id:row.id,name:row.name,system:false,parentId:"",sortOrder:nextCollectionSortOrder(""),pinnedAt:0,highlightedAt:0});changed=true});if(changed){save(S.cols,state.cols);if(!silent)toast("Collections synced from extension.");render()}}
async function pushExtensionCollection(collection){if(!collection||collection.system)return;let token=getVaultApiToken();if(!token)return;try{await fetch("/api/vault/collections",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({id:collection.id,name:collection.name})})}catch(_){}}
async function syncExtensionCollections(silent){if(!state.user||syncExtensionCollections.busy)return;syncExtensionCollections.busy=true;try{let token=getVaultApiToken();if(!token)return;let response=await fetch("/api/vault/collections",{cache:"no-store",headers:{Authorization:"Bearer "+token}});if(!response.ok)return;let data=await response.json();mergeExtensionCollectionsIntoState(data.collections,silent)}catch(_){}finally{syncExtensionCollections.busy=false}}
function normalizeCapturedItem(item){if(!item||typeof item!=="object")return null;let ctx=item.captureContext&&typeof item.captureContext==="object"?item.captureContext:{},type=item.type==="image"?"image":item.type==="video"?"video":item.type==="link"||item.type==="page"?"link":"note",sourceUrl=item.sourceUrl||ctx.pageUrl||"",note=type==="note"?(item.note||ctx.selectionText||""):(item.note||""),title=item.title||((type==="link"&&host(sourceUrl))?host(sourceUrl)+" reference":type==="image"?"Extension image":type==="video"?"Extension video":"Saved text"),previewUrl=item.previewUrl||item.thumbnailUrl||ctx.previewUrl||ctx.ogImage||ctx.twitterImage||"",assetUrl=type==="image"?(item.assetUrl||ctx.imageUrl||previewUrl||""):type==="video"?(item.assetUrl||ctx.videoUrl||sourceUrl):"",collectionIds=cleanCollectionIds(item.collectionIds);ctx.quickTags=Array.isArray(ctx.quickTags)?ctx.quickTags:quickTagsFrom(ctx.quickKeywords);ctx.visualCategory=ctx.visualCategory||item.visualCategory||"";ctx.usageNote=ctx.usageNote||"Private reference only";return Object.assign({},item,{id:item.id||id(),type,title,note,sourceUrl,assetUrl,previewUrl,thumbnailUrl:item.thumbnailUrl||previewUrl,collectionIds,projectIds:item.projectIds||[],status:item.status||"ready",createdAt:Number(item.createdAt)||Date.now(),captureContext:ctx,analysis:item.analysis||analyze({type,title,note,sourceUrl,captureContext:ctx})})}
let suppressCardClick=false;
let railDragExpand={active:false,wasCollapsed:false,collapseTimer:null};
function workspaceShellEl(){return document.querySelector(".workspace,.board-workspace,.overview-workspace,.profile-workspace")}
function railShellEl(){return document.querySelector(".rail,.project-rail")}
function collectionDropAt(x,y){let el=document.elementFromPoint(x,y);if(!el||!el.closest)return null;let row=el.closest("[data-dropcol]");if(!row)return null;let col=state.cols.find(c=>c.id===row.dataset.dropcol);if(!col||col.system)return null;return col.id}
function markCollectionDropTarget(colId){document.querySelectorAll("[data-dropcol]").forEach(row=>{let on=!!(colId&&row.dataset.dropcol===colId);row.classList.toggle("object-drop-target",on)})}
function clearObjectDragUi(){document.body.classList.remove("is-object-dragging");document.querySelectorAll("[data-dropcol].object-drop-target").forEach(el=>el.classList.remove("object-drop-target"));document.querySelectorAll("[data-dropitem].drop-target").forEach(el=>el.classList.remove("drop-target"))}
function expandRailForObjectDrag(){let ws=workspaceShellEl();if(!ws)return;if(!state.leftCollapsed&&!ws.classList.contains("left-collapsed")&&!railDragExpand.active)return;if(!ws.classList.contains("left-collapsed")&&railDragExpand.active){clearTimeout(railDragExpand.collapseTimer);return}if(!ws.classList.contains("left-collapsed"))return;railDragExpand.active=true;railDragExpand.wasCollapsed=true;clearTimeout(railDragExpand.collapseTimer);ws.classList.remove("left-collapsed");ws.classList.add("rail-drag-expanded")}
function scheduleCollapseRailAfterObjectDrag(){if(!railDragExpand.active||!railDragExpand.wasCollapsed)return;clearTimeout(railDragExpand.collapseTimer);railDragExpand.collapseTimer=setTimeout(()=>{let ws=workspaceShellEl();if(ws){ws.classList.add("left-collapsed");ws.classList.remove("rail-drag-expanded")}railDragExpand.active=false;railDragExpand.wasCollapsed=false},160)}
function endRailExpandSession(){clearTimeout(railDragExpand.collapseTimer);if(railDragExpand.wasCollapsed){let ws=workspaceShellEl();if(ws){ws.classList.add("left-collapsed");ws.classList.remove("rail-drag-expanded")}}railDragExpand.active=false;railDragExpand.wasCollapsed=false;railDragExpand.collapseTimer=null}
function commitRailExpanded(){clearTimeout(railDragExpand.collapseTimer);state.leftCollapsed=false;let ws=workspaceShellEl();if(ws){ws.classList.remove("left-collapsed","rail-drag-expanded")}railDragExpand.active=false;railDragExpand.wasCollapsed=false;railDragExpand.collapseTimer=null}
function pointerInRailExpandZone(x,y){let rail=railShellEl(),ws=workspaceShellEl();if(rail){let r=rail.getBoundingClientRect();if(x>=r.left-8&&x<=r.right+8&&y>=r.top-8&&y<=r.bottom+8)return true}if(!ws)return false;let wr=ws.getBoundingClientRect(),expanded=railDragExpand.active||!ws.classList.contains("left-collapsed");if(expanded){let railBox=rail?rail.getBoundingClientRect():null;if(railBox&&x>=railBox.left&&x<=railBox.right)return true;return x>=wr.left&&x<=wr.left+240}return x>=wr.left&&x<=wr.left+76}
function syncRailExpandFromPointer(x,y){if(pointerInRailExpandZone(x,y))expandRailForObjectDrag();else scheduleCollapseRailAfterObjectDrag()}
function addItemToCollection(itemId,colId){let item=state.items.find(i=>i.id===itemId),col=state.cols.find(c=>c.id===colId&&!c.system);if(!item||!col)return false;let ids=new Set(cleanCollectionIds(item.collectionIds));ids.add("all");let existed=ids.has(col.id);ids.add(col.id);patch(item.id,{collectionIds:Array.from(ids)});toast(existed?"Already in "+col.name+".":"Added to "+col.name+".");return true}
function bindCardReorder(){document.querySelectorAll("[data-dragitem]").forEach(card=>{let session=null;const cleanup=(opts)=>{opts=opts||{};if(session&&session.timer)clearTimeout(session.timer);card.classList.remove("dragging","drag-ready","drop-target");document.querySelectorAll("[data-dropitem]").forEach(c=>c.classList.remove("drop-target","drag-ready","dragging"));clearObjectDragUi();if(!opts.keepExpanded)endRailExpandSession();session=null};const finishPointer=(e)=>{if(!session)return;let from=session.id,moved=session.moved,x=e.clientX,y=e.clientY,colId=moved?collectionDropAt(x,y):null,hit=(!colId&&moved)?document.elementFromPoint(x,y)?.closest?.("[data-dropitem]"):null,toId=hit&&hit.dataset.dropitem;if(colId){cleanup({keepExpanded:true});suppressCardClick=true;addItemToCollection(from,colId);commitRailExpanded();render();setTimeout(()=>{suppressCardClick=false},0);return}cleanup();if(!moved)return;suppressCardClick=true;if(toId&&toId!==from){reorderItems(from,toId);render()}setTimeout(()=>{suppressCardClick=false},0)};card.addEventListener("pointerdown",e=>{if(e.button!==undefined&&e.button!==0)return;if(e.target.closest("button,[data-cardmenu],.card-menu,[data-pin]"))return;session={id:card.dataset.dragitem,x:e.clientX,y:e.clientY,moved:false,timer:null,pid:e.pointerId};session.timer=setTimeout(()=>{if(!session)return;card.classList.add("drag-ready");try{card.setPointerCapture(e.pointerId)}catch(_){}},320)});card.addEventListener("pointermove",e=>{if(!session||session.pid!==e.pointerId)return;if(!session.moved&&Math.hypot(e.clientX-session.x,e.clientY-session.y)>6){card.classList.add("drag-ready");try{card.setPointerCapture(e.pointerId)}catch(_){}}if(!card.classList.contains("drag-ready"))return;if(!session.moved){session.moved=true;card.classList.add("dragging");document.body.classList.add("is-object-dragging");state.openMenu=null}syncRailExpandFromPointer(e.clientX,e.clientY);let colId=collectionDropAt(e.clientX,e.clientY);markCollectionDropTarget(colId);let hit=colId?null:document.elementFromPoint(e.clientX,e.clientY)?.closest?.("[data-dropitem]");document.querySelectorAll("[data-dropitem]").forEach(c=>c.classList.toggle("drop-target",!!(hit&&hit===c&&c!==card)))});card.addEventListener("pointerup",e=>{if(!session||session.pid!==e.pointerId)return;finishPointer(e)});card.addEventListener("pointercancel",cleanup);card.addEventListener("dragstart",e=>{if(e.target.closest("button,[data-cardmenu],.card-menu,[data-pin]")){e.preventDefault();return}state.openMenu=null;card.classList.add("dragging");document.body.classList.add("is-object-dragging");e.dataTransfer.setData("text/plain",card.dataset.dragitem);e.dataTransfer.setData("vault-item",card.dataset.dragitem);e.dataTransfer.effectAllowed="copyMove"});card.addEventListener("dragend",()=>{card.classList.remove("dragging","drag-ready","drop-target");clearObjectDragUi();endRailExpandSession()});card.addEventListener("dragover",e=>{e.preventDefault();e.dataTransfer.dropEffect="move"});card.addEventListener("dragenter",e=>{e.preventDefault();card.classList.add("drop-target")});card.addEventListener("dragleave",e=>{if(!card.contains(e.relatedTarget))card.classList.remove("drop-target")});card.addEventListener("drop",e=>{e.preventDefault();card.classList.remove("drop-target");let from=e.dataTransfer.getData("vault-item")||e.dataTransfer.getData("text/plain");if(from&&from!==card.dataset.dropitem){suppressCardClick=true;reorderItems(from,card.dataset.dropitem);render();setTimeout(()=>{suppressCardClick=false},0)}})});bindObjectCollectionDrop();bindRailObjectExpand()}
function bindRailObjectExpand(){if(window.__vaultRailObjectExpandBound)return;window.__vaultRailObjectExpandBound=true;const onDragOver=(e)=>{if(!document.body.classList.contains("is-object-dragging")&&!(e.dataTransfer&&Array.from(e.dataTransfer.types||[]).includes("vault-item")))return;syncRailExpandFromPointer(e.clientX,e.clientY);if(pointerInRailExpandZone(e.clientX,e.clientY)){e.preventDefault();e.dataTransfer.dropEffect="copy"}};document.addEventListener("dragover",onDragOver);document.addEventListener("dragend",()=>{clearObjectDragUi();endRailExpandSession()},true);document.addEventListener("drop",()=>{setTimeout(()=>{clearObjectDragUi();endRailExpandSession()},0)},true)}
function bindObjectCollectionDrop(){if(window.__vaultObjectColDropBound)return;window.__vaultObjectColDropBound=true;document.addEventListener("dragover",e=>{let row=e.target&&e.target.closest&&e.target.closest("[data-dropcol]");if(!row)return;let types=e.dataTransfer&&e.dataTransfer.types?Array.from(e.dataTransfer.types):[];if(!(types.includes("vault-item")||document.body.classList.contains("is-object-dragging")))return;let col=state.cols.find(c=>c.id===row.dataset.dropcol);if(!col||col.system)return;e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect="copy";expandRailForObjectDrag();markCollectionDropTarget(row.dataset.dropcol)},true);document.addEventListener("dragleave",e=>{let row=e.target&&e.target.closest&&e.target.closest("[data-dropcol]");if(!row)return;if(e.relatedTarget&&row.contains(e.relatedTarget))return;row.classList.remove("object-drop-target")},true);document.addEventListener("drop",e=>{let row=e.target&&e.target.closest&&e.target.closest("[data-dropcol]");if(!row)return;let itemId=e.dataTransfer.getData("vault-item")||(document.body.classList.contains("is-object-dragging")?e.dataTransfer.getData("text/plain"):"");if(!itemId)return;let col=state.cols.find(c=>c.id===row.dataset.dropcol);if(!col||col.system)return;e.preventDefault();e.stopPropagation();row.classList.remove("object-drop-target");clearObjectDragUi();suppressCardClick=true;addItemToCollection(itemId,col.id);commitRailExpanded();render();setTimeout(()=>{suppressCardClick=false},0)},true)}
function softCloseOpenMenus(){document.querySelectorAll(".pin-card.menu-open,.collection-row.menu-open,.project-row-wrap.menu-open").forEach(el=>el.classList.remove("menu-open"));document.querySelectorAll(".card-menu,.row-menu").forEach(el=>el.remove());return true}
function bindSearchClearButtons(root){(root||document).querySelectorAll("[data-search-clear]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();clearSearchSoft()})}
function bindVaultResultCards(){document.querySelectorAll(".object-grid [data-sel],.object-list [data-sel]").forEach(x=>{x.onclick=e=>{if(suppressCardClick||x.classList.contains("drag-ready")||x.classList.contains("dragging")){e.stopPropagation();return}e.stopPropagation();openSelectedDetail(x.dataset.sel)};x.onkeydown=e=>{if(e.key==="Enter")openSelectedDetail(x.dataset.sel)}});document.querySelectorAll(".object-grid [data-cardmenu],.object-list [data-cardmenu]").forEach(b=>b.onclick=e=>{e.stopPropagation();state.openMenu=state.openMenu===b.dataset.cardmenu?null:b.dataset.cardmenu;render()});document.querySelectorAll(".object-grid [data-menusee],.object-list [data-menusee]").forEach(b=>b.onclick=e=>{e.stopPropagation();openSelectedDetail(b.dataset.menusee)});document.querySelectorAll(".object-grid [data-use],.object-list [data-use]").forEach(x=>x.onclick=e=>{e.stopPropagation();addItemToBoard(x.dataset.use,140,120);state.view="board";toast("Object added to moodboard.");render()});bindCardReorder();bindSearchClearButtons(document.querySelector(".main"));bindMoodboardSelectChecks()}
function bindMoodboardSelectChecks(){document.querySelectorAll("[data-toggle-select]").forEach(inp=>{inp.onclick=e=>e.stopPropagation();inp.onchange=e=>{e.stopPropagation();toggleVaultSelect(inp.dataset.toggleSelect,{shift:!!e.shiftKey})}});document.querySelectorAll("[data-open-create-moodboard]").forEach(b=>b.onclick=()=>openCreateMoodboardDialog());document.querySelectorAll("[data-bulk-new-collection]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();openBulkNewCollectionDialog()});document.querySelectorAll("[data-bulk-to-project]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();openBulkProjectDialog()});document.querySelectorAll("[data-bulk-delete]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();openBulkDeleteDialog()});document.querySelectorAll("[data-bulk-project-form]").forEach(form=>form.onsubmit=e=>{e.preventDefault();e.stopPropagation();let fd=new FormData(form),projectId=(fd.get("projectId")||"").toString();if(!projectId){toast("Choose a project.");return}addSelectedToProject(projectId)});document.querySelectorAll("[data-clear-selection]").forEach(b=>b.onclick=()=>{state.selectedIds=[];if(!softRefreshVaultResults())render()})}
let searchInputTimer=null;
function patchVaultFilterChips(){document.querySelectorAll(".filter-chips [data-type]").forEach(btn=>{btn.classList.toggle("active",state.type===btn.dataset.type)})}
function bindGridLoadMore(){let btn=document.querySelector("[data-grid-load-more] button");if(btn)btn.onclick=e=>{e.preventDefault();state.gridRenderLimit=(state.gridRenderLimit||VAULT_GRID_INITIAL)+VAULT_GRID_STEP;softRefreshVaultResults()};let sentinel=document.querySelector("[data-grid-load-more]");if(sentinel&&!sentinel.dataset.ioBound&&typeof IntersectionObserver==="function"){sentinel.dataset.ioBound="1";new IntersectionObserver(entries=>{entries.forEach(entry=>{if(!entry.isIntersecting||state.view!=="vault")return;let items=filtered(),limit=state.gridRenderLimit||VAULT_GRID_INITIAL;if(limit>=items.length)return;state.gridRenderLimit=limit+VAULT_GRID_STEP;softRefreshVaultResults()})},{root:null,rootMargin:"320px 0px",threshold:0}).observe(sentinel)}}
function softRefreshVaultResults(){if(state.view!=="vault"){render();return false}let main=document.querySelector(".main");if(!main){render();return false}let items=filtered(),grid=main.querySelector(".object-grid,.object-list"),emptyEl=main.querySelector(".empty-state"),command=main.querySelector(".vault-command-row"),banner=main.querySelector(".vault-search-banner"),q=state.q.trim(),html=items.length?vaultItemsMarkup(items):empty(),selectionHtml=selectionActionsMarkup(),existingDock=document.querySelector(".vault-selection-dock"),shellEl=document.querySelector(".app-shell");if(existingDock){if(selectionHtml)existingDock.outerHTML=selectionHtml;else existingDock.remove()}else if(selectionHtml&&shellEl){shellEl.insertAdjacentHTML("beforeend",selectionHtml)}if(banner)banner.remove();if(q||(state.filterKeyword||"").trim()||(state.filterHex||"").trim()||state.filterRights||state.vaultImageRef){let bannerHtml=vaultSearchBanner(items.length);if(command)command.insertAdjacentHTML("afterend",bannerHtml);else main.insertAdjacentHTML("afterbegin",bannerHtml)}if(grid)grid.outerHTML=html;else if(emptyEl)emptyEl.outerHTML=html;else main.insertAdjacentHTML("beforeend",html);let titleEl=main.querySelector(".vault-page-title h1");if(titleEl){let pageTitle=state.col&&state.col!=="all"?((state.cols.find(c=>c.id===state.col)||{}).name||"My Vault"):"My Vault";titleEl.textContent=pageTitle}patchVaultFilterChips();let popupMeta=document.querySelector(".search-popup-meta"),n=items.length,clearBtn=document.querySelector(".search-clear");if(popupMeta)popupMeta.textContent=q?n+" match"+(n===1?"":"es")+" · try style, color, keyword, or this week":"Fast search across style, work type, color, keyword, and time";if(clearBtn)clearBtn.classList.toggle("is-hidden",!q);let group=document.querySelector(".header-search-group");if(group)group.classList.toggle("has-query",!!q);let searchInput=document.querySelector("[data-search]");if(searchInput&&searchInput.value!==state.q)searchInput.value=state.q;bindVaultResultCards();bindMoodboardSelectChecks();bindGridLoadMore();return true}
function queueSearchRender(value){let prev=state.q;state.q=value;if(value.trim()!==prev.trim())resetVaultGridLimit();clearTimeout(searchInputTimer);searchInputTimer=setTimeout(()=>{if(state.view==="vault")softRefreshVaultResults();else render()},140)}
function clearSearchSoft(){clearTimeout(searchInputTimer);state.q="";state.filterKeyword="";state.filterHex="";state.searchOpen=true;resetVaultGridLimit();if(state.view==="vault")softRefreshVaultResults();else render();setTimeout(()=>{let input=document.querySelector("[data-search]");if(input)input.focus()},0)}
function bindBackToTop(){let btn=document.querySelector("[data-back-top]");if(!btn)return;const scrollables=()=>[...document.querySelectorAll(".main,.sidebar-body,.board-main,.drawer-inner")];const update=()=>{let show=(window.scrollY||document.documentElement.scrollTop||0)>240;scrollables().forEach(el=>{if(el.scrollTop>240)show=true});btn.hidden=!show;btn.classList.toggle("is-visible",show)};btn.onclick=e=>{e.preventDefault();scrollables().forEach(el=>el.scrollTo({top:0,behavior:"smooth"}));window.scrollTo({top:0,behavior:"smooth"})};if(!window.__vaultBackTopBound){window.__vaultBackTopBound=true;window.addEventListener("scroll",()=>{let b=document.querySelector("[data-back-top]");if(!b)return;let show=(window.scrollY||document.documentElement.scrollTop||0)>240;document.querySelectorAll(".main,.sidebar-body,.board-main,.drawer-inner").forEach(el=>{if(el.scrollTop>240)show=true});b.hidden=!show;b.classList.toggle("is-visible",show)},{passive:true})}scrollables().forEach(el=>{if(el.dataset.backTopBound)return;el.dataset.backTopBound="1";el.addEventListener("scroll",update,{passive:true})});update()}
function bind(){document.onclick=e=>{let c=e.target&&e.target.closest?e.target.closest("[data-copy-color]"):null;if(c){e.preventDefault();e.stopPropagation();copyText(c.dataset.copyColor||c.textContent.trim());return}if(e.target&&e.target.closest&&!e.target.closest(".card-menu,.card-menu-trigger,.row-menu,.row-menu-trigger")){if(state.openMenu){state.openMenu=null;softCloseOpenMenus()}}};let pf=document.querySelector("[data-profile]");if(pf)pf.onsubmit=e=>{e.preventDefault();let fd=new FormData(pf);state.user=Object.assign({},state.user||{},{displayName:(fd.get("displayName")||"").toString().trim().slice(0,60),favoriteStyles:Array.from(new Set(fd.getAll("favoriteStyle").map(String).concat(quickTagsFrom(fd.get("favoriteStylesExtra"))))),avatarUrl:state.user&&state.user.avatarUrl||"",provider:state.user&&state.user.provider||"password"});save(S.user,state.user);toast("Profile saved.");render()};document.querySelectorAll("[data-google-login]").forEach(b=>b.onclick=()=>beginGoogleLogin());document.querySelectorAll("[data-logout]").forEach(b=>b.onclick=async()=>{await closeProfileMenu({instant:true});await vaultRemote.signOut().catch(()=>{});localStorage.removeItem(S.user);state.user=null;state.authPrompt=null;writePendingAction(null);state.view="discover";history.replaceState(null,"",location.origin+"/");toast("Logged out.");render()});document.querySelectorAll("[data-export-vault]").forEach(b=>b.onclick=()=>exportVaultData());document.querySelectorAll("[data-clear-vault]").forEach(b=>b.onclick=()=>openConfirmDialog({title:"Clear local Vault data",message:"Remove all items, collections, projects, and moodboards from this browser? Export first if you want a backup.",confirmText:"Clear everything",danger:true,onConfirm:clearLocalVaultData}));document.querySelectorAll("[data-delete-account]").forEach(b=>b.onclick=()=>openDeleteAccountDialog());document.querySelectorAll("[data-copy-extension-token]").forEach(b=>b.onclick=()=>copyExtensionToken());document.querySelectorAll("[data-regenerate-extension-token]").forEach(b=>b.onclick=()=>openConfirmDialog({title:"Refresh extension token",message:"Generate a new extension sync token? Update the Chrome extension popup after refreshing.",confirmText:"Refresh token",onConfirm:regenerateVaultApiToken}));document.querySelectorAll("[data-open-profile-item]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();let itemId=b.dataset.openProfileItem;if(!itemId)return;state.view="vault";state.selected=null;state.rightCollapsed=false;render();openSelectedDetail(itemId)});document.querySelectorAll("[data-toggle-left]").forEach(b=>b.onclick=()=>{state.leftCollapsed=!state.leftCollapsed;if(isMobileViewport()){state.profileMenu=false;state.sortMenu=false;state.viewMenu=false}render()});document.querySelectorAll("[data-cardmenu]").forEach(b=>b.onclick=e=>{e.stopPropagation();state.openMenu=state.openMenu===b.dataset.cardmenu?null:b.dataset.cardmenu;render()});document.querySelectorAll("[data-rowmenu]").forEach(b=>b.onclick=e=>{e.stopPropagation();state.openMenu=state.openMenu===b.dataset.rowmenu?null:b.dataset.rowmenu;render()});document.querySelectorAll("[data-menusee]").forEach(b=>b.onclick=e=>{e.stopPropagation();openSelectedDetail(b.dataset.menusee)});document.querySelectorAll("[data-copy-color]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();copyText(b.dataset.copyColor||b.textContent.trim())});document.querySelectorAll("[data-toggle-right]").forEach(b=>b.onclick=()=>{state.rightCollapsed=!state.rightCollapsed;render()});document.querySelectorAll("[data-close-detail]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();closeSelectedDetail()});bindMediaLightboxControls();document.querySelectorAll("[data-resize-right]").forEach(h=>h.onpointerdown=startRightResize);document.querySelectorAll("[data-theme-choice]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();state.theme=b.dataset.themeChoice;save(S.theme,state.theme);applyTheme();render({skipTheme:true})});document.querySelectorAll("[data-project-explorer-tab]").forEach(b=>b.onclick=e=>{e.preventDefault();state.projectExplorerTab=b.dataset.projectExplorerTab==="tags"?"tags":"folders";render()});
let projectExplorerQ=document.querySelector("[data-project-explorer-q]");
if(projectExplorerQ){projectExplorerQ.oninput=()=>{state.projectExplorerQ=projectExplorerQ.value||"";softRefreshProjectExplorer()}};
document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{setPhoneSearch(false);state.view=b.dataset.view;state.profileMenu=false;state.searchOpen=false;clearTimeout(closeProfileMenu._timer);if(b.dataset.view==="settings"){state.adminLoaded=false;state.adminError="";if(isVaultSuperAdmin(state.user)){if(!vaultRemote.enabled||!vaultRemote.hasSession()){state.adminError="Sign in with your Google/email account to open Vault Admin.";state.adminLoaded=true;state.adminLoading=false}else{state.adminLoading=true}}}if(b.dataset.view==="moodboards"){history.replaceState(null,"",moodboardAppUrl());preloadMoodboardEditor()}else if(b.dataset.view==="vault"&&/moodboard/.test(location.hash||""))history.replaceState(null,"",location.origin+"/vault");render()});document.querySelectorAll("[data-type]").forEach(b=>b.onclick=()=>{state.view="vault";state.type=b.dataset.type;if(state.type==="collections"&&state.col==="all")state.col="brand";render()});document.querySelectorAll("[data-col]").forEach(b=>b.onclick=()=>{if(suppressColClick)return;state.col=b.dataset.col;state.type="all";state.view="vault";render()});document.querySelectorAll("[data-profile-menu-toggle]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();if(state.profileMenu)closeProfileMenu();else openProfileMenu()});document.querySelectorAll("[data-search-toggle]").forEach(b=>b.onclick=e=>{e.stopPropagation();state.searchOpen=!state.searchOpen;if(state.profileMenu){closeProfileMenu({instant:true,skipRender:true})}render();if(state.searchOpen)setTimeout(()=>{let input=document.querySelector("[data-search]");if(input)input.focus()},0)});document.querySelectorAll("[data-search-clear]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();clearSearchSoft()});document.querySelectorAll("[data-search-hint]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();let hint=b.dataset.searchHint||"";state.q=state.q.trim()?state.q.trim()+" "+hint:hint;state.searchOpen=true;state.view="vault";render();setTimeout(()=>{let input=document.querySelector("[data-search]");if(input){input.focus();input.setSelectionRange(input.value.length,input.value.length)}},0)});if(!window.__vaultSearchOutsideBound){window.__vaultSearchOutsideBound=true;document.addEventListener("click",e=>{if(state.searchOpen&&e.target&&e.target.closest&&!e.target.closest(".header-search-group")){state.searchOpen=false;render();return}if(state.profileMenu&&e.target&&e.target.closest&&!e.target.closest(".header-profile-group")){closeProfileMenu()}},true);document.addEventListener("keydown",e=>{if(e.key==="Escape"&&state.mediaLightbox){e.preventDefault();closeMediaLightbox();return}if(e.key==="Escape"&&state.profileMenu){e.preventDefault();closeProfileMenu();return}if(e.key==="Escape"&&state.searchOpen){state.searchOpen=false;render()}})}let q=document.querySelector("[data-search]");if(q){q.oninput=e=>queueSearchRender(e.target.value);if(state.searchOpen)q.focus()}document.querySelectorAll("[data-phone-search]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();togglePhoneSearch()});document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{if(!state.user){requireAuth({type:"keep",id:""});return}state.modal=true;render()});document.querySelectorAll("[data-adddetail]").forEach(b=>b.onclick=()=>{let i=selected();if(!i)return;addItemToBoard(i.id,160,140);state.view="board";toast("Object added to moodboard.");render()});document.querySelectorAll("[data-closemodal]").forEach(x=>x.onclick=e=>{let backdrop=x.classList&&x.classList.contains("modal-backdrop");if(backdrop&&e.target!==x)return;e.preventDefault();e.stopPropagation();state.modal=false;render()});document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;render()});let sf=document.querySelector("[data-form]");if(sf){sf.onsubmit=saveItem;bindLinkImport(sf)}document.querySelectorAll("[data-sel]").forEach(x=>{x.onclick=e=>{if(suppressCardClick||x.classList.contains("drag-ready")||x.classList.contains("dragging")){e.stopPropagation();return}e.stopPropagation();openSelectedDetail(x.dataset.sel)};x.onkeydown=e=>{if(e.key==="Enter")openSelectedDetail(x.dataset.sel)}});bindCardReorder();bindCollectionDrag();document.querySelectorAll("[data-use]").forEach(x=>x.onclick=e=>{e.stopPropagation();addItemToBoard(x.dataset.use,140,120);state.view="board";toast("Object added to moodboard.");render()});let close=document.querySelector("[data-close]");if(close)close.onclick=()=>closeSelectedDetail();bindDrawerControls();bindMediaLightboxControls();bindBackToTop();bindQuickUploads();bindProfileAvatarControls();bindBoard();bindMoodboardUi();bindProfileMenuMotion()}
function bindMoodboardUi(){document.querySelectorAll("[data-toggle-select]").forEach(inp=>{inp.onclick=e=>e.stopPropagation();inp.onchange=e=>{e.stopPropagation();toggleVaultSelect(inp.dataset.toggleSelect,{shift:!!e.shiftKey})}});document.querySelectorAll("[data-open-create-moodboard]").forEach(b=>b.onclick=()=>openCreateMoodboardDialog());document.querySelectorAll("[data-create-blank-moodboard]").forEach(b=>b.onclick=()=>{state.dialog={type:"create-moodboard",itemIds:[]};render()});document.querySelectorAll("[data-bulk-new-collection]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();openBulkNewCollectionDialog()});document.querySelectorAll("[data-bulk-to-project]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();openBulkProjectDialog()});document.querySelectorAll("[data-bulk-delete]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();openBulkDeleteDialog()});document.querySelectorAll("[data-bulk-project-form]").forEach(form=>form.onsubmit=e=>{e.preventDefault();e.stopPropagation();let fd=new FormData(form),projectId=(fd.get("projectId")||"").toString();if(!projectId){toast("Choose a project.");return}addSelectedToProject(projectId)});document.querySelectorAll("[data-clear-selection]").forEach(b=>b.onclick=()=>{state.selectedIds=[];if(!softRefreshVaultResults())render()});document.querySelectorAll("[data-open-moodboard]").forEach(b=>b.onclick=()=>openMoodboard(b.dataset.openMoodboard));document.querySelectorAll("[data-rename-moodboard]").forEach(b=>b.onclick=()=>{let board=(state.moodboards||[]).find(x=>x.id===b.dataset.renameMoodboard);if(!board)return;state.dialog={type:"create-moodboard",itemIds:[],renameId:board.id,renameName:board.name};render()});document.querySelectorAll("[data-delete-moodboard]").forEach(b=>b.onclick=()=>{let board=(state.moodboards||[]).find(x=>x.id===b.dataset.deleteMoodboard);if(!board)return;openConfirmDialog({title:"Delete moodboard",message:"Delete "+board.name+"? Vault objects stay in the library.",confirmText:"Delete",danger:true,onConfirm:()=>{state.moodboards=(state.moodboards||[]).filter(x=>x.id!==board.id);if(state.activeMoodboard===board.id){state.activeMoodboard=null;state.view="moodboards";history.replaceState(null,"",moodboardAppUrl())}persistMoodboards();toast("Moodboard deleted.");render()}})});document.querySelectorAll("[data-link-moodboard-project]").forEach(b=>b.onclick=()=>{state.dialog={type:"link-moodboard-project",boardId:b.dataset.linkMoodboardProject};render()});if(state.view==="moodboard-edit")bindSmartGridEditor()}
function bindSmartGridEditor(){
  let board=activeMoodboard();
  if(!board)return;
  let title=document.querySelector("[data-moodboard-title]");
  if(title)title.onchange=e=>mutateActiveMoodboard(draft=>{draft.name=e.target.value.trim().slice(0,120)||"Untitled Moodboard"},"rename");
  document.querySelectorAll("[data-moodboard-undo]").forEach(b=>b.onclick=()=>{let snap=moodboardHistory.undo();if(snap){applyMoodboardSnapshot(snap);queueMoodboardSave(snap)}});
  document.querySelectorAll("[data-moodboard-redo]").forEach(b=>b.onclick=()=>{let snap=moodboardHistory.redo();if(snap){applyMoodboardSnapshot(snap);queueMoodboardSave(snap)}});
  document.querySelectorAll("[data-moodboard-tool]").forEach(b=>b.onclick=()=>{
    let tool=b.dataset.moodboardTool||"select";
    state.moodboardTool=tool;
    state.moodboardConnectFrom=null;
    if(tool==="image"){state.dialog={type:"pick-vault-for-board",collectionId:"all",typeFilter:"all",query:"",selectedIds:[]};render();return}
    if(tool==="upload"){let input=document.querySelector("[data-moodboard-upload]");if(input)input.click();state.moodboardTool="select";render();return}
    if(tool==="text"){addMoodboardText();return}
    if(tool==="todo"){addMoodboardTodo();return}
    if(tool==="color"){state.dialog={type:"pick-color-type"};render();return}
    if(tool==="frame"){addMoodboardFrame();return}
    render();
  });
  document.querySelectorAll("[data-moodboard-upload]").forEach(input=>{
    input.onchange=async()=>{
      let files=input.files;input.value="";
      await uploadImagesToMoodboard(files,{method:"moodboard_upload"});
    };
  });
  document.querySelectorAll("[data-pick-vault-item]").forEach(b=>b.onclick=()=>{
    let itemId=b.dataset.pickVaultItem;
    state.dialog=null;
    addMoodboardVaultItem(itemId);
  });
  document.querySelectorAll("[data-picker-check]").forEach(inp=>{
    inp.onchange=()=>{
      if(!state.dialog||state.dialog.type!=="pick-vault-for-board")return;
      let id=inp.dataset.pickerCheck,set=new Set(state.dialog.selectedIds||[]);
      if(inp.checked)set.add(id);else set.delete(id);
      state.dialog=Object.assign({},state.dialog,{selectedIds:Array.from(set)});
      refreshPickerSelectionChrome();
    };
  });
  document.querySelectorAll("[data-picker-select-visible]").forEach(b=>{
    b.onclick=()=>{
      if(!state.dialog||state.dialog.type!=="pick-vault-for-board")return;
      let board=activeMoodboard();
      let onBoard=new Set((board?.objects||[]).filter(o=>o.kind==="item"&&o.itemId).map(o=>o.itemId));
      let ids=Array.from(document.querySelectorAll("[data-picker-check]:not(:disabled)")).map(el=>el.dataset.pickerCheck).filter(id=>id&&!onBoard.has(id));
      state.dialog=Object.assign({},state.dialog,{selectedIds:ids});
      document.querySelectorAll("[data-picker-check]:not(:disabled)").forEach(el=>{el.checked=true});
      refreshPickerSelectionChrome();
    };
  });
  document.querySelectorAll("[data-picker-clear-selection]").forEach(b=>{
    b.onclick=()=>{
      if(!state.dialog||state.dialog.type!=="pick-vault-for-board")return;
      state.dialog=Object.assign({},state.dialog,{selectedIds:[]});
      document.querySelectorAll("[data-picker-check]").forEach(el=>{el.checked=false});
      refreshPickerSelectionChrome();
    };
  });
  document.querySelectorAll("[data-add-picked-vault]").forEach(b=>{
    b.onclick=()=>{
      if(!state.dialog||state.dialog.type!=="pick-vault-for-board")return;
      let ids=(state.dialog.selectedIds||[]).slice();
      state.dialog=null;
      addMoodboardVaultItems(ids);
    };
  });
  document.querySelectorAll("[data-picker-collection]").forEach(sel=>{
    sel.onchange=()=>{
      if(!state.dialog||state.dialog.type!=="pick-vault-for-board")return;
      state.dialog=Object.assign({},state.dialog,{collectionId:sel.value||"all"});
      render();
    };
  });
  document.querySelectorAll("[data-picker-type]").forEach(b=>{
    b.onclick=()=>{
      if(!state.dialog||state.dialog.type!=="pick-vault-for-board")return;
      state.dialog=Object.assign({},state.dialog,{typeFilter:b.dataset.pickerType||"all"});
      render();
    };
  });
  document.querySelectorAll("[data-picker-search]").forEach(input=>{
    input.oninput=()=>{
      if(!state.dialog||state.dialog.type!=="pick-vault-for-board")return;
      clearTimeout(window.__vaultPickerSearchTimer);
      let value=input.value;
      window.__vaultPickerSearchTimer=setTimeout(()=>{
        if(!state.dialog||state.dialog.type!=="pick-vault-for-board")return;
        state.dialog=Object.assign({},state.dialog,{query:value});
        render();
        setTimeout(()=>{
          let el=document.querySelector("[data-picker-search]");
          if(el){el.focus();try{el.setSelectionRange(el.value.length,el.value.length)}catch(err){}}
        },0);
      },160);
    };
  });
  document.querySelectorAll("[data-add-color-type]").forEach(b=>{
    b.onclick=()=>{
      let mode=b.dataset.addColorType==="swatch"?"swatch":"palette";
      state.dialog=null;
      addMoodboardColor(mode);
    };
  });
  document.querySelectorAll("[data-add-color-from-item]").forEach(b=>{
    b.onclick=e=>{
      e.stopPropagation();
      addMoodboardColorsFromItem(b.dataset.addColorFromItem,b.dataset.colorMode||"swatch",b.dataset.color||"");
    };
  });
  document.querySelectorAll("[data-board-swatch-color]").forEach(inp=>{
    inp.oninput=()=>{
      let objId=inp.dataset.boardSwatchColor,hex=normalizeHex(inp.value);
      mutateActiveMoodboard(draft=>{
        let o=draft.objects.find(x=>x.id===objId);
        if(!o||o.kind!=="palette")return;
        o.colors=[hex];o.color=hex;
        o.style=Object.assign({},o.style||{},{mode:"swatch"});
      },"swatch-color");
    };
  });
  document.querySelectorAll("[data-board-swatch-name]").forEach(inp=>{
    inp.onchange=()=>{
      let objId=inp.dataset.boardSwatchName;
      mutateActiveMoodboard(draft=>{
        let o=draft.objects.find(x=>x.id===objId);
        if(!o||o.kind!=="palette")return;
        o.text=String(inp.value||"").trim().slice(0,48);
        o.style=Object.assign({},o.style||{},{mode:"swatch"});
      },"swatch-name");
    };
  });
  document.querySelectorAll("[data-board-palette-color]").forEach(inp=>{
    inp.oninput=()=>{
      let objId=inp.dataset.boardPaletteColor,idx=Number(inp.dataset.colorIndex)||0,hex=normalizeHex(inp.value);
      mutateActiveMoodboard(draft=>{
        let o=draft.objects.find(x=>x.id===objId);
        if(!o||o.kind!=="palette")return;
        let colors=(o.colors||[]).slice();
        while(colors.length<=idx)colors.push("#cccccc");
        colors[idx]=hex;
        o.colors=colors.slice(0,8);o.color=o.colors[0];
        o.style=Object.assign({},o.style||{},{mode:"palette"});
      },"palette-color");
    };
  });
  document.querySelectorAll("[data-board-palette-add]").forEach(b=>{
    b.onclick=()=>{
      let objId=b.dataset.boardPaletteAdd;
      mutateActiveMoodboard(draft=>{
        let o=draft.objects.find(x=>x.id===objId);
        if(!o||o.kind!=="palette")return;
        let colors=(o.colors||[]).slice();
        if(colors.length>=8){toast("Palette is full (8 colors).");return}
        colors.push("#cccccc");
        o.colors=colors;o.color=colors[0];
        o.style=Object.assign({},o.style||{},{mode:"palette"});
      },"palette-add");
    };
  });
  document.querySelectorAll("[data-board-palette-remove]").forEach(b=>{
    b.onclick=()=>{
      let objId=b.dataset.boardPaletteRemove,idx=Number(b.dataset.colorIndex)||0;
      mutateActiveMoodboard(draft=>{
        let o=draft.objects.find(x=>x.id===objId);
        if(!o||o.kind!=="palette")return;
        let colors=(o.colors||[]).slice();
        if(colors.length<=2){toast("Keep at least 2 colors in a palette.");return}
        colors.splice(idx,1);
        o.colors=colors;o.color=colors[0];
        o.style=Object.assign({},o.style||{},{mode:"palette"});
      },"palette-remove");
    };
  });
  document.querySelectorAll("[data-board-text-bg]").forEach(inp=>{
    inp.oninput=()=>setMoodboardTextBackground(inp.dataset.boardTextBg,inp.value);
  });
  document.querySelectorAll("[data-board-text-bg-preset]").forEach(b=>{
    b.onclick=()=>setMoodboardTextBackground(b.dataset.boardTextBgPreset,b.dataset.color);
  });
  document.querySelectorAll("[data-board-frame-label]").forEach(inp=>{
    inp.onchange=()=>{
      let objId=inp.dataset.boardFrameLabel;
      mutateActiveMoodboard(draft=>{let o=draft.objects.find(x=>x.id===objId);if(o&&o.kind==="frame")o.text=String(inp.value||"").trim().slice(0,80)||"Section"},"frame-label");
    };
  });
  document.querySelectorAll("[data-board-frame-color]").forEach(inp=>{
    inp.oninput=()=>{
      let objId=inp.dataset.boardFrameColor,color=inp.value;
      mutateActiveMoodboard(draft=>{let o=draft.objects.find(x=>x.id===objId);if(o&&o.kind==="frame")o.color=String(color||"#ff4f43")},"frame-color");
    };
  });
  document.querySelectorAll("[data-board-todo-title]").forEach(inp=>{
    inp.onchange=()=>{
      let objId=inp.dataset.boardTodoTitle;
      mutateActiveMoodboard(draft=>{let o=draft.objects.find(x=>x.id===objId);if(o&&o.kind==="todo")o.text=String(inp.value||"").trim().slice(0,80)||"To-do"},"todo-title");
    };
  });
  document.querySelectorAll("[data-todo-check]").forEach(inp=>{
    inp.onpointerdown=e=>e.stopPropagation();
    inp.onchange=()=>updateMoodboardTodoTask(inp.dataset.todoCheck,inp.dataset.taskId,{done:inp.checked});
  });
  document.querySelectorAll("[data-todo-text]").forEach(inp=>{
    inp.onpointerdown=e=>e.stopPropagation();
    inp.onchange=()=>updateMoodboardTodoTask(inp.dataset.todoText,inp.dataset.taskId,{text:inp.value});
  });
  document.querySelectorAll("[data-todo-add]").forEach(b=>{
    b.onclick=e=>{
      e.stopPropagation();
      addMoodboardTodoTask(b.dataset.todoAdd);
    };
  });
  document.querySelectorAll("[data-layer-board-obj]").forEach(b=>{
    b.onclick=e=>{
      e.stopPropagation();
      shiftMoodboardLayer(b.dataset.layerBoardObj,b.dataset.layerAction);
    };
  });
  document.querySelectorAll("[data-align-board-obj]").forEach(b=>{
    b.onclick=e=>{
      e.stopPropagation();
      alignMoodboardObject(b.dataset.alignBoardObj,b.dataset.alignAction);
    };
  });
  document.querySelectorAll("[data-resize-board-obj]").forEach(h=>{
    h.onpointerdown=e=>{
      e.preventDefault();
      e.stopPropagation();
      startMoodboardObjectResize(e,h.dataset.resizeBoardObj,h.dataset.resizeCorner||"se");
    };
  });
  document.querySelectorAll("[data-remove-board-obj]").forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    let objId=b.dataset.removeBoardObj;
    mutateActiveMoodboard(draft=>{
      draft.objects=draft.objects.filter(o=>o.id!==objId&&!(o.kind==="connector"&&(o.fromId===objId||o.toId===objId)));
      if(state.selectedObject===objId)state.selectedObject=null;
      state.selectedObjectIds=(state.selectedObjectIds||[]).filter(id=>id!==objId);
      trackMoodboardEvent("moodboard_item_removed",{});
    },"remove");
  });
  document.querySelectorAll("[data-select-board-obj]").forEach(b=>b.onclick=e=>{
    selectMoodboardObject(b.dataset.selectBoardObj,{additive:!!(e.shiftKey||e.metaKey||e.ctrlKey)});
  });
  document.querySelectorAll("[data-select-board-group]").forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    selectMoodboardGroup(b.dataset.selectBoardGroup,{additive:!!(e.shiftKey||e.metaKey||e.ctrlKey)});
  });
  document.querySelectorAll("[data-moodboard-group]").forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    groupMoodboardSelection();
  });
  document.querySelectorAll("[data-moodboard-ungroup]").forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    ungroupMoodboardSelection();
  });
  document.querySelectorAll("[data-board-text]").forEach(t=>{
    t.onpointerdown=e=>e.stopPropagation();
    t.onchange=()=>{let objId=t.dataset.boardText;mutateActiveMoodboard(draft=>{let o=draft.objects.find(x=>x.id===objId);if(o)o.text=t.value},"text")};
  });
  document.querySelectorAll("[data-board-obj]").forEach(el=>{
    el.onclick=e=>{
      if(e.target.closest("button,a,textarea,input"))return;
      let objId=el.dataset.boardObj;
      if((state.moodboardTool||"select")==="connector"){
        handleMoodboardConnectorClick(objId);
        return;
      }
      state.selectedObject=objId;
      if(e.shiftKey||e.metaKey||e.ctrlKey)selectMoodboardObject(objId,{additive:true});
      else{state.selectedObject=objId;state.selectedObjectIds=[objId];if(state.moodboardTool!=="select"){state.moodboardTool="select";state.moodboardConnectFrom=null}render()}
    };
    if(el.tagName==="G"||el.classList.contains("moodboard-connector"))return;
    el.onpointerdown=e=>{
      if(e.button!==0)return;
      if(e.target.closest("button,a,textarea,input,[data-resize-board-obj],.todo-row,.todo-add"))return;
      if((state.moodboardTool||"select")==="connector")return;
      let id=el.dataset.boardObj;
      if(e.shiftKey||e.metaKey||e.ctrlKey){
        selectMoodboardObject(id,{additive:true,soft:true});
      }else if(!(state.selectedObjectIds||[]).includes(id)){
        state.selectedObject=id;
        state.selectedObjectIds=[id];
      }
      startMoodboardObjectDrag(e,el);
    };
  });
  bindMoodboardCanvasDrop();
  document.querySelectorAll("[data-toggle-moodboard-source]").forEach(b=>b.onclick=()=>{state.moodboardSourceCollapsed=!state.moodboardSourceCollapsed;render()});
  document.querySelectorAll("[data-toggle-moodboard-inspector]").forEach(b=>b.onclick=()=>{state.moodboardInspectorMode=mbInspectorHidden()?"open":"closed";render()});
  bindMoodboardZoom();
  setTimeout(mbFitAspect,0);
  document.querySelectorAll("[data-resize-moodboard-source]").forEach(h=>h.onpointerdown=e=>startMoodboardPanelResize(e,"source"));
  document.querySelectorAll("[data-resize-moodboard-inspector]").forEach(h=>h.onpointerdown=e=>startMoodboardPanelResize(e,"inspector"));
  if(!window.__vaultMoodboardKeys){
    window.__vaultMoodboardKeys=true;
    document.addEventListener("keydown",e=>{
      if(state.view!=="moodboard-edit")return;
      let tag=(e.target&&e.target.tagName||"").toLowerCase();
      if(tag==="textarea"||tag==="input")return;
      let mod=e.metaKey||e.ctrlKey;
      if(mod&&e.key.toLowerCase()==="z"&&!e.shiftKey){e.preventDefault();let snap=moodboardHistory.undo();if(snap){applyMoodboardSnapshot(snap);queueMoodboardSave(snap)}}
      if(mod&&((e.key.toLowerCase()==="z"&&e.shiftKey)||e.key.toLowerCase()==="y")){e.preventDefault();let snap=moodboardHistory.redo();if(snap){applyMoodboardSnapshot(snap);queueMoodboardSave(snap)}}
      if((e.key==="Delete"||e.key==="Backspace")&&(state.selectedObject||(state.selectedObjectIds||[]).length)){
        e.preventDefault();
        let ids=new Set(state.selectedObjectIds||[]);
        if(state.selectedObject)ids.add(state.selectedObject);
        mutateActiveMoodboard(draft=>{
          draft.objects=draft.objects.filter(o=>!ids.has(o.id)&&!(o.kind==="connector"&&(ids.has(o.fromId)||ids.has(o.toId))));
          state.selectedObject=null;
          state.selectedObjectIds=[];
        },"remove");
      }
      if(e.key==="Escape"){state.moodboardTool="select";state.moodboardConnectFrom=null;state.selectedObjectIds=[];state.dialog=null;render()}
      if(mod&&e.key.toLowerCase()==="g"&&!e.shiftKey){e.preventDefault();groupMoodboardSelection()}
      if(mod&&e.key.toLowerCase()==="g"&&e.shiftKey){e.preventDefault();ungroupMoodboardSelection()}
    });
  }
}
function nextMoodboardDropPoint(board,w,h){
  let pad=Number(board.padding)||24;
  let count=(board.objects||[]).filter(o=>o.kind!=="connector").length;
  let col=count%4;
  let row=Math.floor(count/4);
  return {x:pad+col*((w||180)+24),y:pad+row*((h||140)+24)};
}
function addMoodboardVaultItem(itemId){
  addMoodboardVaultItems(itemId?[itemId]:[]);
}
function refreshPickerSelectionChrome(){
  let ids=(state.dialog&&state.dialog.selectedIds)||[];
  let n=ids.length;
  document.querySelectorAll(".moodboard-picker-card").forEach(card=>{
    let box=card.querySelector("[data-picker-check]");
    card.classList.toggle("is-checked",!!(box&&box.checked));
  });
  let count=document.querySelector(".moodboard-picker-count");
  if(count){
    let shown=document.querySelectorAll(".moodboard-picker-card").length;
    count.textContent=shown+" shown · "+n+" selected";
  }
  let addBtn=document.querySelector("[data-add-picked-vault]");
  if(addBtn){
    addBtn.disabled=!n;
    addBtn.textContent=n?"Add "+n+" to board":"Add to board";
  }
  let clearBtn=document.querySelector("[data-picker-clear-selection]");
  if(clearBtn)clearBtn.disabled=!n;
}
async function addMoodboardVaultItems(itemIds){
  let ids=[...new Set((itemIds||[]).filter(Boolean).map(String))];
  if(!ids.length)return;
  let sized=[];
  for(let itemId of ids){
    let item=state.items.find(i=>i.id===itemId);
    if(!item)continue;
    let size=await moodboardItemDisplaySize(item);
    sized.push({itemId,w:size.w,h:size.h});
  }
  mutateActiveMoodboard(draft=>{
    let added=0,lastId=null;
    sized.forEach(entry=>{
      if(draft.objects.some(o=>o.kind==="item"&&o.itemId===entry.itemId))return;
      if(draft.objects.filter(o=>o.kind==="item").length>=MOODBOARD_SOFT_LIMIT){toast("Board soft limit is "+MOODBOARD_SOFT_LIMIT+" references.");return}
      let spot=nextMoodboardDropPoint(draft,entry.w,entry.h);
      let o=normalizeMoodboardObject({id:id(),kind:"item",itemId:entry.itemId,x:spot.x,y:spot.y,w:entry.w,h:entry.h,sortOrder:draft.objects.length,zIndex:draft.objects.length+1});
      draft.objects=draft.objects.concat(o);
      lastId=o.id;
      added++;
    });
    if(lastId)state.selectedObject=lastId;
    state.moodboardTool="select";
    if(added)trackMoodboardEvent("moodboard_item_added",{via:"picker",count:added});
    if(added>1)toast(added+" objects added to board.");
  },"add-item");
}
function moodboardItemDisplaySize(item){
  const fallback={w:220,h:280};
  if(!item)return Promise.resolve(fallback);
  if(item.type!=="image"&&item.type!=="video")return Promise.resolve({w:220,h:180});
  let src=item.assetUrl||item.previewUrl||item.thumbnailUrl;
  if(!src||String(src).startsWith("upload://"))return Promise.resolve(fallback);
  return new Promise(resolve=>{
    let img=new Image();
    let done=false;
    let finish=(w,h)=>{
      if(done)return;done=true;
      let aspect=(Number(w)||1)/(Number(h)||1);
      let width=220;
      let height=Math.round(width/Math.max(aspect,0.35));
      height=Math.max(140,Math.min(420,height));
      resolve({w:width,h:height});
    };
    img.onload=()=>finish(img.naturalWidth,img.naturalHeight);
    img.onerror=()=>finish(3,4);
    setTimeout(()=>finish(3,4),1200);
    img.src=src;
  });
}
function addMoodboardText(){
  mutateActiveMoodboard(draft=>{
    let spot=nextMoodboardDropPoint(draft,220,120);
    let o=normalizeMoodboardObject({id:id(),kind:"text",text:"Direction note",x:spot.x,y:spot.y,w:220,h:120,color:"#17191b",style:{background:"#ffffff"},sortOrder:draft.objects.length,zIndex:draft.objects.length+1});
    draft.objects=draft.objects.concat(o);
    state.selectedObject=o.id;
    state.moodboardTool="select";
  },"add-text");
}
function addMoodboardColor(mode,opts){
  opts=opts||{};
  let isSwatch=mode==="swatch";
  let colors=Array.isArray(opts.colors)?opts.colors.map(c=>normalizeHex(c,"")).filter(Boolean):[];
  if(isSwatch)colors=colors.length?[colors[0]]:[normalizeHex(opts.color||"#ff4f43")];
  else if(!colors.length)colors=["#ff4f43","#2f3133","#f8f6f2","#c56b4e"];
  else colors=colors.slice(0,8);
  mutateActiveMoodboard(draft=>{
    let near=opts.nearObjId?draft.objects.find(x=>x.id===opts.nearObjId):null;
    let w=isSwatch?148:Math.max(200,Math.min(320,40+colors.length*48));
    let h=isSwatch?188:88;
    let spot=near
      ?{x:Math.max(0,(Number(near.x)||0)+(Number(near.w)||160)+24),y:Math.max(0,Number(near.y)||0)}
      :nextMoodboardDropPoint(draft,w,h);
    let o=normalizeMoodboardObject(isSwatch
      ?{id:id(),kind:"palette",colors:colors,text:"",x:spot.x,y:spot.y,w:148,h:188,style:{mode:"swatch"},sortOrder:draft.objects.length,zIndex:draft.objects.length+1}
      :{id:id(),kind:"palette",colors:colors,text:"",x:spot.x,y:spot.y,w:w,h:h,style:{mode:"palette"},sortOrder:draft.objects.length,zIndex:draft.objects.length+1}
    );
    draft.objects=draft.objects.concat(o);
    state.selectedObject=o.id;
    state.moodboardTool="select";
  },isSwatch?"add-swatch":"add-palette");
}
function addMoodboardColorsFromItem(sourceObjId,mode,color){
  let board=activeMoodboard();
  if(!board||!sourceObjId)return;
  let source=(board.objects||[]).find(o=>o.id===sourceObjId);
  if(!source||source.kind!=="item")return;
  let item=state.items.find(i=>i.id===source.itemId);
  let fromItem=((item&&item.analysis&&item.analysis.colors)||[]).map(c=>normalizeHex(c,"")).filter(Boolean).slice(0,8);
  if(mode==="palette"){
    addMoodboardColor("palette",{colors:fromItem.length?fromItem:undefined,nearObjId:sourceObjId});
    toast(fromItem.length?"Palette added from image.":"Palette added.");
    return;
  }
  if(mode==="swatches"){
    let list=fromItem.length?fromItem:[normalizeHex("#ff4f43")];
    mutateActiveMoodboard(draft=>{
      let near=draft.objects.find(x=>x.id===sourceObjId);
      let baseX=near?Math.max(0,(Number(near.x)||0)+(Number(near.w)||160)+24):nextMoodboardDropPoint(draft,148,188).x;
      let baseY=near?Math.max(0,Number(near.y)||0):nextMoodboardDropPoint(draft,148,188).y;
      let added=[];
      list.forEach((hex,i)=>{
        let o=normalizeMoodboardObject({
          id:id(),kind:"palette",colors:[hex],text:"",
          x:baseX+(i%3)*160,y:baseY+Math.floor(i/3)*210,w:148,h:188,
          style:{mode:"swatch"},sortOrder:draft.objects.length+i,zIndex:draft.objects.length+i+1
        });
        added.push(o);
      });
      draft.objects=draft.objects.concat(added);
      state.selectedObject=added[0]&&added[0].id||state.selectedObject;
      state.moodboardTool="select";
    },"add-swatches");
    toast("Added "+list.length+" color chip"+(list.length===1?"":"s")+".");
    return;
  }
  addMoodboardColor("swatch",{color:color||fromItem[0]||"#ff4f43",nearObjId:sourceObjId});
  toast("Pantone chip added.");
}
function addMoodboardFrame(){
  mutateActiveMoodboard(draft=>{
    let spot=nextMoodboardDropPoint(draft,420,320);
    let o=normalizeMoodboardObject({id:id(),kind:"frame",text:"Section",x:spot.x,y:spot.y,w:420,h:320,color:"#ff4f43",sortOrder:draft.objects.length,zIndex:0});
    draft.objects=draft.objects.concat(o);
    state.selectedObject=o.id;
    state.moodboardTool="select";
  },"add-frame");
}
function addMoodboardTodo(){
  mutateActiveMoodboard(draft=>{
    let spot=nextMoodboardDropPoint(draft,260,200);
    let o=normalizeMoodboardObject({
      id:id(),
      kind:"todo",
      text:"To-do",
      x:spot.x,y:spot.y,w:260,h:200,
      sortOrder:draft.objects.length,
      zIndex:draft.objects.length+1,
      style:{tasks:[{id:id(),text:"",done:false},{id:id(),text:"",done:false}]}
    });
    draft.objects=draft.objects.concat(o);
    state.selectedObject=o.id;
    state.moodboardTool="select";
  },"add-todo");
}
function updateMoodboardTodoTask(objId,taskId,patch){
  if(!objId||!taskId)return;
  mutateActiveMoodboard(draft=>{
    let o=draft.objects.find(x=>x.id===objId);
    if(!o||o.kind!=="todo")return;
    let tasks=Array.isArray(o.style&&o.style.tasks)?o.style.tasks.slice():[];
    tasks=tasks.map(t=>t.id===taskId?Object.assign({},t,patch,patch.text!=null?{text:String(patch.text).slice(0,200)}:{}):t);
    o.style=Object.assign({},o.style||{},{tasks});
  },"todo-edit");
}
function addMoodboardTodoTask(objId){
  mutateActiveMoodboard(draft=>{
    let o=draft.objects.find(x=>x.id===objId);
    if(!o||o.kind!=="todo")return;
    let tasks=Array.isArray(o.style&&o.style.tasks)?o.style.tasks.slice():[];
    if(tasks.length>=40){toast("Too many tasks on this list.");return}
    tasks.push({id:id(),text:"",done:false});
    o.style=Object.assign({},o.style||{},{tasks});
    let nextH=Math.max(o.h||200,120+tasks.length*36);
    let size=clampMoodboardSize("todo",o.w||260,nextH);
    o.w=size.w;o.h=size.h;
  },"todo-add");
}
function setMoodboardTextBackground(objId,color){
  if(!objId||!color)return;
  mutateActiveMoodboard(draft=>{
    let o=draft.objects.find(x=>x.id===objId);
    if(!o||(o.kind!=="text"&&o.kind!=="note"))return;
    o.style=Object.assign({},o.style&&typeof o.style==="object"?o.style:{},{background:String(color)});
    if(o.kind==="note")o.color=String(color);
  },"text-bg");
}
function handleMoodboardConnectorClick(objId){
  let board=activeMoodboard();
  if(!board)return;
  let target=(board.objects||[]).find(o=>o.id===objId);
  if(!target||target.kind==="connector")return;
  if(!state.moodboardConnectFrom){
    state.moodboardConnectFrom=objId;
    state.selectedObject=objId;
    toast("Pick a second object to connect.");
    render();
    return;
  }
  if(state.moodboardConnectFrom===objId){
    state.moodboardConnectFrom=null;
    toast("Connection cancelled.");
    render();
    return;
  }
  let fromId=state.moodboardConnectFrom;
  let toId=objId;
  state.moodboardConnectFrom=null;
  mutateActiveMoodboard(draft=>{
    if(draft.objects.some(o=>o.kind==="connector"&&((o.fromId===fromId&&o.toId===toId)||(o.fromId===toId&&o.toId===fromId)))){toast("Already connected.");return}
    let o=normalizeMoodboardObject({id:id(),kind:"connector",fromId,toId,color:"#ff4f43",style:{line:state.moodboardConnStyle||"elbow"},sortOrder:draft.objects.length,zIndex:0});
    draft.objects=draft.objects.concat(o);
    state.selectedObject=o.id;
    state.moodboardTool="select";
  },"add-connector");
}
function updateMoodboardConnectorsLive(board,movedId,x,y,w,h){
  let svg=document.querySelector("[data-moodboard-connectors]");
  if(!svg)return;
  let nodes=new Map((board.objects||[]).filter(o=>o.kind!=="connector").map(o=>[o.id,o]));
  if(movedId&&nodes.has(movedId))nodes.set(movedId,Object.assign({},nodes.get(movedId),{x,y,w,h}));
  (board.objects||[]).filter(o=>o.kind==="connector").forEach(c=>{
    let from=nodes.get(c.fromId),to=nodes.get(c.toId);
    if(!from||!to)return;
    let g=svg.querySelector('[data-connector-id="'+c.id+'"]');
    if(!g)return;
    let d=connectorPath(from,to,(c.style&&c.style.line)||"elbow").d;
    g.querySelectorAll("path.connector-hit,path.connector-line").forEach(pth=>pth.setAttribute("d",d));
  });
}
function selectMoodboardObject(objId,opts){
  opts=opts||{};
  if(!objId)return;
  let ids=Array.isArray(state.selectedObjectIds)?state.selectedObjectIds.slice():[];
  if(opts.additive){
    if(ids.includes(objId))ids=ids.filter(id=>id!==objId);
    else ids.push(objId);
  }else ids=[objId];
  state.selectedObjectIds=ids;
  state.selectedObject=ids.includes(objId)?objId:(ids[ids.length-1]||null);
  if(!opts.soft)render();
}
function selectMoodboardGroup(groupId,opts){
  opts=opts||{};
  let board=activeMoodboard();
  if(!board||!groupId)return;
  let members=(board.objects||[]).filter(o=>o.kind!=="connector"&&objectGroupId(o)===groupId).map(o=>o.id);
  if(!members.length)return;
  let ids=opts.additive?(state.selectedObjectIds||[]).slice():[];
  members.forEach(id=>{if(!ids.includes(id))ids.push(id)});
  state.selectedObjectIds=ids;
  state.selectedObject=members[0];
  render();
}
function groupMoodboardSelection(){
  let board=activeMoodboard();
  if(!board)return;
  let ids=(state.selectedObjectIds||[]).filter(Boolean);
  if(ids.length<2){toast("Select at least 2 layers to group.");return}
  let groupId="g_"+id();
  mutateActiveMoodboard(draft=>{
    draft.objects.forEach(o=>{
      if(!ids.includes(o.id)||o.kind==="connector")return;
      o.style=Object.assign({},o.style&&typeof o.style==="object"?o.style:{},{groupId});
    });
  },"group");
  toast("Grouped "+ids.length+" layers.");
}
function ungroupMoodboardSelection(){
  let board=activeMoodboard();
  if(!board)return;
  let ids=new Set(state.selectedObjectIds||[]);
  if(state.selectedObject)ids.add(state.selectedObject);
  let groupIds=new Set();
  (board.objects||[]).forEach(o=>{
    if(ids.has(o.id)){
      let gid=objectGroupId(o);
      if(gid)groupIds.add(gid);
    }
  });
  if(!groupIds.size){toast("No group in selection.");return}
  mutateActiveMoodboard(draft=>{
    draft.objects.forEach(o=>{
      let gid=objectGroupId(o);
      if(!gid||!groupIds.has(gid))return;
      let style=Object.assign({},o.style&&typeof o.style==="object"?o.style:{});
      delete style.groupId;
      o.style=style;
    });
  },"ungroup");
  toast("Ungrouped.");
}
function startMoodboardObjectDrag(e,el){
  let board=activeMoodboard();
  if(!board)return;
  let objId=el.dataset.boardObj;
  let obj=(board.objects||[]).find(o=>o.id===objId);
  if(!obj||obj.locked||obj.kind==="connector")return;
  e.preventDefault();
  e.stopPropagation();
  if(!(state.selectedObjectIds||[]).includes(objId)){
    state.selectedObject=objId;
    state.selectedObjectIds=[objId];
  }else state.selectedObject=objId;
  let moveIds=moodboardDragIds(board,objId);
  let origins=new Map();
  let els=new Map();
  moveIds.forEach(id=>{
    let o=(board.objects||[]).find(x=>x.id===id);
    if(!o)return;
    origins.set(id,{x:o.x,y:o.y,w:o.w,h:o.h});
    let node=document.querySelector('[data-board-obj="'+id+'"]');
    if(node&&node.tagName!=="G"){node.classList.add("is-dragging");els.set(id,node)}
  });
  let sx=e.clientX,sy=e.clientY,moved=false;
  try{el.setPointerCapture&&el.setPointerCapture(e.pointerId)}catch(err){}
  function move(ev){
    let dx=(ev.clientX-sx)/mbZoom(),dy=(ev.clientY-sy)/mbZoom();
    if(Math.abs(dx)>2||Math.abs(dy)>2)moved=true;
    els.forEach((node,id)=>{
      let origin=origins.get(id);if(!origin)return;
      let nx=Math.max(0,origin.x+dx),ny=Math.max(0,origin.y+dy);
      node.style.left=nx+"px";node.style.top=ny+"px";
      updateMoodboardConnectorsLive(board,id,nx,ny,origin.w,origin.h);
    });
  }
  function up(){
    document.removeEventListener("pointermove",move);
    document.removeEventListener("pointerup",up);
    els.forEach(node=>node.classList.remove("is-dragging"));
    if(!moved){render();return}
    mutateActiveMoodboard(draft=>{
      els.forEach((node,id)=>{
        let o=draft.objects.find(x=>x.id===id);
        if(!o)return;
        o.x=parseFloat(node.style.left)||o.x;
        o.y=parseFloat(node.style.top)||o.y;
        if(o.kind!=="frame")o.zIndex=Math.max(...draft.objects.map(x=>x.zIndex||0),0)+1;
      });
    },"drag");
    moodboardHistory.endMerge();
  }
  document.addEventListener("pointermove",move);
  document.addEventListener("pointerup",up);
}
function moodboardDragIds(board,objId){
  let obj=(board.objects||[]).find(o=>o.id===objId);
  if(!obj)return [objId];
  let gid=objectGroupId(obj);
  let selected=new Set(state.selectedObjectIds||[]);
  if(selected.size>1&&selected.has(objId))return [...selected];
  if(gid)return (board.objects||[]).filter(o=>objectGroupId(o)===gid).map(o=>o.id);
  return [objId];
}
function startMoodboardObjectResize(e,objId,corner){
  let board=activeMoodboard();
  if(!board||!objId)return;
  let obj=(board.objects||[]).find(o=>o.id===objId);
  if(!obj||obj.locked||obj.kind==="connector")return;
  let el=document.querySelector('[data-board-obj="'+objId+'"]');
  if(!el||el.tagName==="G")return;
  state.selectedObject=objId;
  el.classList.add("is-resizing","selected");
  document.body.classList.add("resizing-moodboard-obj");
  let sx=e.clientX,sy=e.clientY,ox=obj.x,oy=obj.y,ow=obj.w,oh=obj.h;
  let badge=el.querySelector("[data-size-badge]");
  if(badge){badge.hidden=false;badge.textContent=Math.round(ow)+" × "+Math.round(oh)}
  try{e.currentTarget.setPointerCapture&&e.currentTarget.setPointerCapture(e.pointerId)}catch(err){}
  function clampBox(nx,ny,nw,nh){
    let size=clampMoodboardSize(obj.kind,nw,nh,obj);
    // Keep opposite edges anchored when min/max kick in
    if(corner.includes("w"))nx=ox+(ow-size.w);
    if(corner.includes("n"))ny=oy+(oh-size.h);
    return {x:Math.max(0,nx),y:Math.max(0,ny),w:size.w,h:size.h};
  }
  function apply(box){
    el.style.left=box.x+"px";
    el.style.top=box.y+"px";
    el.style.width=box.w+"px";
    el.style.height=box.h+"px";
    if(badge)badge.textContent=Math.round(box.w)+" × "+Math.round(box.h);
    updateMoodboardConnectorsLive(board,objId,box.x,box.y,box.w,box.h);
  }
  function move(ev){
    let dx=(ev.clientX-sx)/mbZoom(),dy=(ev.clientY-sy)/mbZoom();
    let nx=ox,ny=oy,nw=ow,nh=oh;
    if(corner.includes("e"))nw=ow+dx;
    if(corner.includes("s"))nh=oh+dy;
    if(corner.includes("w")){nw=ow-dx;nx=ox+dx}
    if(corner.includes("n")){nh=oh-dy;ny=oy+dy}
    apply(clampBox(nx,ny,nw,nh));
  }
  function up(){
    document.removeEventListener("pointermove",move);
    document.removeEventListener("pointerup",up);
    el.classList.remove("is-resizing");
    document.body.classList.remove("resizing-moodboard-obj");
    if(badge)badge.hidden=true;
    let box=clampBox(parseFloat(el.style.left)||ox,parseFloat(el.style.top)||oy,parseFloat(el.style.width)||ow,parseFloat(el.style.height)||oh);
    if(Math.abs(box.x-ox)<1&&Math.abs(box.y-oy)<1&&Math.abs(box.w-ow)<1&&Math.abs(box.h-oh)<1){render();return}
    mutateActiveMoodboard(draft=>{
      let o=draft.objects.find(x=>x.id===objId);
      if(!o)return;
      o.x=box.x;o.y=box.y;o.w=box.w;o.h=box.h;
    },"resize");
    moodboardHistory.endMerge();
  }
  document.addEventListener("pointermove",move);
  document.addEventListener("pointerup",up);
}
function shiftMoodboardLayer(objId,action){
  if(!objId||!action)return;
  mutateActiveMoodboard(draft=>{
    let o=draft.objects.find(x=>x.id===objId);
    if(!o||o.kind==="connector")return;
    let peers=draft.objects.filter(x=>x.kind!=="connector");
    let zs=peers.map(x=>Number(x.zIndex)||0);
    let maxZ=Math.max(...zs,0),minZ=Math.min(...zs,0);
    let z=Number(o.zIndex)||0;
    if(action==="front"){o.zIndex=maxZ+1;return}
    if(action==="back"){o.zIndex=minZ-1;return}
    let sorted=peers.slice().sort((a,b)=>(Number(a.zIndex)||0)-(Number(b.zIndex)||0)||String(a.id).localeCompare(String(b.id)));
    let idx=sorted.findIndex(x=>x.id===objId);
    if(idx<0)return;
    if(action==="forward"){
      if(idx>=sorted.length-1){o.zIndex=maxZ+1;return}
      let above=sorted[idx+1];
      let az=Number(above.zIndex)||0;
      o.zIndex=az;
      above.zIndex=z<az?z:az-1;
      return;
    }
    if(action==="backward"){
      if(idx<=0){o.zIndex=minZ-1;return}
      let below=sorted[idx-1];
      let bz=Number(below.zIndex)||0;
      o.zIndex=bz;
      below.zIndex=z>bz?z:bz+1;
    }
  },"layer");
}
function alignMoodboardObject(objId,action){
  if(!objId||!action)return;
  let board=activeMoodboard();
  if(!board)return;
  let canvas=document.querySelector("[data-smart-grid-canvas]");
  let boardW=Math.max(Number(board.width)||1200,canvas?canvas.scrollWidth:0,800);
  let boardH=Math.max(Number(board.height)||900,canvas?canvas.scrollHeight:0,600);
  let pad=24;
  mutateActiveMoodboard(draft=>{
    let o=draft.objects.find(x=>x.id===objId);
    if(!o||o.kind==="connector")return;
    let w=Number(o.w)||0,h=Number(o.h)||0;
    if(action==="left")o.x=pad;
    else if(action==="center")o.x=Math.max(0,Math.round((boardW-w)/2));
    else if(action==="right")o.x=Math.max(0,Math.round(boardW-w-pad));
    else if(action==="top")o.y=pad;
    else if(action==="middle")o.y=Math.max(0,Math.round((boardH-h)/2));
    else if(action==="bottom")o.y=Math.max(0,Math.round(boardH-h-pad));
  },"align");
}
function bindMoodboardCanvasDrop(){
  let canvas=document.querySelector("[data-smart-grid-canvas]");
  if(!canvas)return;
  let hint=document.querySelector("[data-moodboard-drop-hint]");
  let depth=0;
  canvas.ondragenter=e=>{
    if(!isFileDrag(e))return;
    e.preventDefault();
    depth++;
    canvas.classList.add("is-file-drag");
    if(hint)hint.hidden=false;
  };
  canvas.ondragover=e=>{
    if(!isFileDrag(e))return;
    e.preventDefault();
    e.dataTransfer.dropEffect="copy";
    canvas.classList.add("is-file-drag");
    if(hint)hint.hidden=false;
  };
  canvas.ondragleave=e=>{
    if(!isFileDrag(e))return;
    depth=Math.max(0,depth-1);
    if(!depth||!canvas.contains(e.relatedTarget)){
      depth=0;
      canvas.classList.remove("is-file-drag");
      if(hint)hint.hidden=true;
    }
  };
  canvas.ondrop=async e=>{
    if(!isFileDrag(e))return;
    e.preventDefault();
    e.stopPropagation();
    depth=0;
    canvas.classList.remove("is-file-drag");
    if(hint)hint.hidden=true;
    let rect=canvas.getBoundingClientRect();
    await uploadImagesToMoodboard(filesFromDataTransfer(e.dataTransfer),{method:"moodboard_drop",dropX:(e.clientX-rect.left)/mbZoom()+canvas.scrollLeft,dropY:(e.clientY-rect.top)/mbZoom()+canvas.scrollTop});
  };
}
async function uploadImagesToMoodboard(fileList,opts){
  opts=opts||{};
  if(!state.user){toast("Log in to upload to Vault.");render();return}
  let files=Array.from(fileList||[]).filter(f=>f&&f.type&&f.type.startsWith("image/"));
  if(!files.length){toast("Drop JPG, PNG, or WebP images.");return}
  let savedIds=[],last=null;
  for(let file of files.slice(0,12)){
    try{
      let item=await buildImageItemFromFile(file,{method:opts.method||"moodboard_upload"});
      let duplicate=findDuplicateItem(item);
      if(duplicate){savedIds.push(duplicate.id);last=duplicate;continue}
      commitSavedItemQuiet(item);
      savedIds.push(item.id);
      last=item;
    }catch(err){toast(err.message||"Could not upload image.")}
  }
  if(!savedIds.length){if(last)toast("That image is already in My Vault.");return}
  let dropX=Number(opts.dropX),dropY=Number(opts.dropY),hasDrop=Number.isFinite(dropX)&&Number.isFinite(dropY);
  let unique=[...new Set(savedIds)];
  let sized=[];
  for(let itemId of unique){
    let item=state.items.find(i=>i.id===itemId);
    let size=await moodboardItemDisplaySize(item);
    sized.push({itemId,w:size.w,h:size.h});
  }
  mutateActiveMoodboard(draft=>{
    let added=0,lastId=null,col=0;
    sized.forEach(entry=>{
      if(draft.objects.some(o=>o.kind==="item"&&o.itemId===entry.itemId))return;
      if(draft.objects.filter(o=>o.kind==="item").length>=MOODBOARD_SOFT_LIMIT){toast("Board soft limit is "+MOODBOARD_SOFT_LIMIT+" references.");return}
      let x=hasDrop?Math.max(0,dropX-entry.w/2+col*24):nextMoodboardDropPoint(draft,entry.w,entry.h).x;
      let y=hasDrop?Math.max(0,dropY-entry.h/2+col*24):nextMoodboardDropPoint(draft,entry.w,entry.h).y;
      let o=normalizeMoodboardObject({id:id(),kind:"item",itemId:entry.itemId,x,y,w:entry.w,h:entry.h,sortOrder:draft.objects.length,zIndex:draft.objects.length+1});
      draft.objects=draft.objects.concat(o);
      lastId=o.id;added++;col++;
    });
    if(lastId)state.selectedObject=lastId;
    state.moodboardTool="select";
    if(added)trackMoodboardEvent("moodboard_item_added",{via:opts.method||"upload",count:added});
  },"upload-add");
  toast(savedIds.length===1?"Uploaded to Vault and added to board.":savedIds.length+" images uploaded to Vault and added to board.");
}
function commitSavedItemQuiet(item){
  state.items=[item].concat(state.items);
  save(S.items,state.items);
  syncRemoteItem(item,"create");
}
function bindBoard(){document.querySelectorAll("[data-lib]").forEach(x=>{x.ondragstart=e=>{e.dataTransfer.setData("vault-item",x.dataset.lib)}});let canvas=document.querySelector("[data-canvas]");if(canvas){canvas.ondragover=e=>e.preventDefault();canvas.ondrop=e=>{e.preventDefault();let itemId=e.dataTransfer.getData("vault-item");if(itemId){let r=canvas.getBoundingClientRect();addItemToBoard(itemId,e.clientX-r.left,e.clientY-r.top);render()}}}let addText=document.querySelector("[data-addtext]");if(addText)addText.onclick=()=>{addTextObject();state.rightCollapsed=false;render()};let addFrom=document.querySelector("[data-addfromvault]");if(addFrom)addFrom.onclick=()=>toast("Drag any object from My Vault into the canvas.");let title=document.querySelector("[data-board-title]");if(title)title.onchange=e=>{board().name=e.target.value.trim()||"Moodboard";persistProjects();render()};document.querySelectorAll("[data-obj]").forEach(el=>{el.onmousedown=e=>startDrag(e,el);el.onclick=e=>{e.stopPropagation();state.selectedObject=el.dataset.obj;state.rightCollapsed=false;render()}});document.querySelectorAll("[data-textobj]").forEach(el=>{el.onmousedown=e=>e.stopPropagation();el.onblur=()=>{let o=selectedObj();if(o){o.text=el.innerText;persistProjects();render()}}});let tx=document.querySelector("[data-inspector-text]");if(tx)tx.onchange=e=>{let o=selectedObj();o.text=e.target.value;persistProjects();render()};let sz=document.querySelector("[data-inspector-size]");if(sz)sz.onchange=e=>{let o=selectedObj();o.size=Math.max(12,Number(e.target.value)||28);persistProjects();render()};let delObj=document.querySelector("[data-delobj]");if(delObj)delObj.onclick=()=>{let b=board();b.objects=b.objects.filter(o=>o.id!==state.selectedObject);state.selectedObject=null;persistProjects();render()};document.querySelectorAll("[data-board-save]").forEach(b=>b.onclick=()=>{persistProjects();toast("Moodboard saved.")});let share=document.querySelector("[data-share]");if(share)share.onclick=()=>{let url=location.href.split("#")[0]+"#board-"+state.activeProject+"-"+state.activeBoard;if(navigator.clipboard)navigator.clipboard.writeText(url).catch(()=>{});toast("Share link copied for this prototype.")};let exp=document.querySelector("[data-export]");if(exp)exp.onclick=()=>toast("Export queued for next build. Board is saved locally now.");let grid=document.querySelector("[data-grid]");if(grid)grid.onclick=()=>document.querySelector(".mood-canvas")?.classList.toggle("show-grid")}
function startMoodboardPanelResize(e,side){e.preventDefault();e.stopPropagation();let startX=e.clientX,isSource=side==="source",startW=isSource?state.moodboardSourceWidth:state.moodboardInspectorWidth,editor=document.querySelector("[data-moodboard-editor]");document.body.classList.add("resizing-moodboard");try{e.currentTarget.setPointerCapture&&e.currentTarget.setPointerCapture(e.pointerId)}catch(err){}function apply(w){w=clamp(w,isSource?180:200,420);if(isSource){state.moodboardSourceWidth=w;if(editor)editor.style.setProperty("--mb-source-w",w+"px")}else{state.moodboardInspectorWidth=w;if(editor)editor.style.setProperty("--mb-inspector-w",w+"px")}}function move(ev){let dx=ev.clientX-startX;apply(isSource?startW+dx:startW-dx)}function up(){document.removeEventListener("pointermove",move);document.removeEventListener("pointerup",up);document.body.classList.remove("resizing-moodboard");if(isSource)save(S.moodboardSourceWidth,state.moodboardSourceWidth);else save(S.moodboardInspectorWidth,state.moodboardInspectorWidth)}document.addEventListener("pointermove",move);document.addEventListener("pointerup",up)}
function startRightResize(e){if(state.rightCollapsed)return;e.preventDefault();let startX=e.clientX,startW=state.rightWidth;document.body.classList.add("resizing-detail");try{e.currentTarget.setPointerCapture&&e.currentTarget.setPointerCapture(e.pointerId)}catch(err){}function apply(w){state.rightWidth=clampRightWidth(w);document.querySelectorAll(".workspace,.board-workspace").forEach(el=>el.style.setProperty("--right-width",state.rightWidth+"px"))}function move(ev){apply(startW-(ev.clientX-startX))}function up(){document.removeEventListener("pointermove",move);document.removeEventListener("pointerup",up);document.body.classList.remove("resizing-detail");save(S.rightWidth,state.rightWidth)}document.addEventListener("pointermove",move);document.addEventListener("pointerup",up)}
function startDrag(e,el){if(e.target.isContentEditable)return;state.selectedObject=el.dataset.obj;let o=selectedObj(),canvas=document.querySelector("[data-canvas]"),rect=canvas.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,ox=o.x,oy=o.y;function move(ev){let nx=Math.max(0,Math.min(rect.width-o.w,ox+ev.clientX-sx)),ny=Math.max(0,Math.min(rect.height-o.h,oy+ev.clientY-sy));el.style.left=nx+"px";el.style.top=ny+"px"}function up(ev){document.removeEventListener("mousemove",move);document.removeEventListener("mouseup",up);o.x=parseFloat(el.style.left)||o.x;o.y=parseFloat(el.style.top)||o.y;persistProjects();render()}document.addEventListener("mousemove",move);document.addEventListener("mouseup",up)}
let linkImport={url:"",result:null,seq:0,timer:0};
async function enrichLocalItem(item){if(!vaultRemote.enabled||!vaultRemote.hasSession()||!item)return;let a=await vaultRemote.enrichItem({type:item.type,title:item.title,note:item.note,previewUrl:item.previewUrl||"",thumbnailUrl:item.thumbnailUrl||"",quickTags:(item.captureContext&&item.captureContext.quickTags)||[]});if(!a)return;let cur=state.items.find(i=>i.id===item.id);if(!cur)return;let prev=cur.analysis||{},tags=Array.from(new Set([].concat(prev.tags||[],a.tags||[]))).slice(0,24);cur.analysis=Object.assign({},prev,a,{tags,colors:(a.colors&&a.colors.length)?a.colors:prev.colors||[]});save(S.items,state.items);syncRemoteItem(cur,"update");render()}
function importMessage(code){return({INVALID_URL:"ลิงก์ไม่ถูกต้อง",UNSAFE_URL:"ลิงก์นี้ไม่อนุญาตให้นำเข้า",FETCH_FAILED:"เว็บไม่ตอบกลับ ลองใหม่อีกครั้ง",UNSUPPORTED_CONTENT:"ไฟล์ชนิดนี้ยังไม่รองรับ",RATE_LIMITED:"ลองบ่อยเกินไป รอสักครู่"})[code]||"นำเข้าลิงก์ไม่สำเร็จ"}
async function stripUpload(file){let out=stripImageMetadata(new Uint8Array(await file.arrayBuffer()));return new Blob([out],{type:file.type})}
function bindLinkImport(form){let input=form&&form.querySelector("input[name=sourceUrl]"),box=form&&form.querySelector("[data-link-import]"),thumb=form&&form.querySelector("[data-link-import-thumb]");if(!input||!box||input.dataset.linkBound)return;input.dataset.linkBound="1";const run=async()=>{let url=input.value.trim(),seq=++linkImport.seq;if(!/^https?:\/\/\S+\.\S+/i.test(url)){box.innerHTML="";if(thumb)thumb.hidden=true;linkImport.url="";linkImport.result=null;return}box.innerHTML="<span class='link-import-status'>Reading the page…</span>";let r=await vaultRemote.importUrl(url);if(seq!==linkImport.seq)return;linkImport.url=url;linkImport.result=r;if(!r){box.innerHTML="<span class='link-import-status'>Will be saved as a link (sign in to see a preview).</span>";if(thumb)thumb.hidden=false;return}if(!r.ok){box.innerHTML="<span class='link-import-status error'>"+esc(importMessage(r.code))+"</span>";if(thumb)thumb.hidden=true;return}let d=r.data;box.innerHTML=(d.imageUrl?"<img src='"+escA(d.imageUrl)+"' alt='' referrerpolicy='no-referrer' loading='lazy'>":"")+"<div class='link-import-meta'><strong>"+esc(d.title||d.domain)+"</strong><span>"+esc(d.domain)+" · <a href='"+escA(d.canonicalUrl||url)+"' target='_blank' rel='noopener noreferrer'>Open original</a></span>"+(d.imageUrl?"":"<span class='link-import-status'>Saved as a link only (this site blocks previews).</span>")+"</div>";if(thumb)thumb.hidden=!!d.imageUrl};input.addEventListener("input",()=>{clearTimeout(linkImport.timer);linkImport.timer=setTimeout(run,500)});input.addEventListener("paste",()=>{clearTimeout(linkImport.timer);linkImport.timer=setTimeout(run,60)});if(input.value.trim())run()}
async function saveItem(e){e.preventDefault();let linkOnlyNotice=false;let fd=new FormData(e.currentTarget),type=fd.get("type"),projectId=(fd.get("projectId")||"").trim(),collectionId=(fd.get("collectionId")||"all").trim()||"all",manualTags=quickTagsFrom(fd.get("quickKeywords")),visualCategory=(fd.get("visualCategory")||"").trim(),item;try{let base={collectionIds:collectionId?[collectionId]:["all"],projectIds:projectId?[projectId]:[],status:"ready",createdAt:Date.now(),captureContext:{method:"manual_"+type,destination:"Vault Library",projectId:projectId||null,collectionId:collectionId||"all",quickTags:manualTags,visualCategory:visualCategory||null,usageNote:"Private reference only"}};if(type==="image"){if(!fd.get("rights"))throw new Error("Tick the rights confirmation to upload this image.");base.rightsConfirmedAt=Date.now();base.itemType="upload";base.licenseStatus="unknown";base.visibility="private";let files=fd.getAll("file").filter(f=>f&&f.size);if(files.length>1){let n=0,skipped=0;for(let f of files){try{checkFile(f);let a=await readFile(await stripUpload(f)),cl=await colorsFrom(a),it=Object.assign({id:id(),type,title:f.name.replace(/\.[^.]+$/,"").replace(/[-_]+/g," "),note:(fd.get("note")||"").trim(),sourceUrl:"upload://"+f.name,assetUrl:a},base);it.analysis=mergeManualAnalysis(analyze(it,cl),manualTags,visualCategory);if(findDuplicateItem(it)){skipped++;continue}commitSavedItem(it,projectId);n++}catch(_){skipped++}}toast(n+" saved to Vault"+(skipped?" · "+skipped+" skipped":"")+".");render();return}let file=fd.get("file");checkFile(file);let asset=await readFile(await stripUpload(file)),colors=await colorsFrom(asset);item=Object.assign({id:id(),type,title:(fd.get("title")||"").trim()||file.name.replace(/.[^.]+$/," ").replace(/[-_]+/g," "),note:(fd.get("note")||"").trim(),sourceUrl:(fd.get("sourceUrl")||"").trim()||"upload://"+file.name,assetUrl:asset},base);item.analysis=mergeManualAnalysis(analyze(item,colors),manualTags,visualCategory)}if(type==="video"){let url=(fd.get("sourceUrl")||"").trim();new URL(url);item=Object.assign({id:id(),type,title:(fd.get("title")||"").trim()||host(url)+" video",note:(fd.get("note")||"").trim(),sourceUrl:url,assetUrl:url},base);item.captureContext.videoUrl=url;item.analysis=mergeManualAnalysis(analyze(item),manualTags,visualCategory)}if(type==="link"){let url=(fd.get("sourceUrl")||"").trim();new URL(url);let r=linkImport.url===url&&linkImport.result?linkImport.result:await vaultRemote.importUrl(url);if(r&&r.ok===false&&(r.code==="INVALID_URL"||r.code==="UNSAFE_URL"))throw new Error(importMessage(r.code));let d=r&&r.ok?r.data:{},thumbFile=fd.get("thumb"),own=thumbFile&&thumbFile.size?(checkFile(thumbFile),await readFile(await stripUpload(thumbFile))):"",img=d.imageUrl||own||"";item=Object.assign({id:id(),type,title:(fd.get("title")||"").trim()||d.title||host(url)+" reference",note:(fd.get("note")||"").trim(),sourceUrl:url,assetUrl:"",thumbnailUrl:img,previewUrl:img,canonicalUrl:d.canonicalUrl||url,sourceDomain:d.domain||host(url),faviconUrl:d.faviconUrl||"",imageWidth:d.imageUrl?d.imageWidth||null:null,imageHeight:d.imageUrl?d.imageHeight||null:null,itemType:"webpage",importStatus:d.imageUrl?"ok":"partial",licenseStatus:"unknown",visibility:"private"},base);if(d.imageUrl)item.captureContext.linkPreview={siteName:d.siteName||"",method:"og_image"};if(!img)linkOnlyNotice=true;item.analysis=mergeManualAnalysis(analyze(item),manualTags,visualCategory)}if(type==="note"){item=Object.assign({id:id(),type,title:(fd.get("title")||"").trim(),note:(fd.get("note")||"").trim(),sourceUrl:"",assetUrl:""},base);item.analysis=mergeManualAnalysis(analyze(item),manualTags,visualCategory)}if(!item)throw new Error("Choose a valid Vault object type.");let duplicate=findDuplicateItem(item);if(duplicate){state.dialog={type:"duplicate",title:"Looks already saved",message:"This exact source is already in My Vault. Open the existing object or save another copy.",duplicateId:duplicate.id,onConfirm:()=>commitSavedItem(item,projectId)};render();return}commitSavedItem(item,projectId);if(item.type==="link"&&/^https:/i.test(item.previewUrl||item.thumbnailUrl||""))enrichLocalItem(item);if(linkOnlyNotice)setTimeout(()=>toast("Saved as a link only (this site blocks previews)."),60);render()}catch(err){toast(err.message||"Could not save this reference.");render()}}
function commitSavedItem(item,projectId){state.items=[item].concat(state.items);state.selected=item.id;state.sortBy="saved_new";state.modal=false;save(S.items,state.items);syncRemoteItem(item,"create");let pName=projectId?(state.projects.find(p=>p.id===projectId)||{}).name:"";toast(pName?"Saved to My Vault + Added to Project: "+pName:(L[item.type]||"Object")+" saved to My Vault.")}
async function buildImageItemFromFile(file,opts){opts=opts||{};checkFile(file);let asset=await readFile(file),colors=await colorsFrom(asset),collectionId=opts.collectionId||(state.col&&state.col!=="all"?state.col:"all"),item={id:id(),type:"image",title:(file.name||"Untitled image").replace(/\.[^.]+$/,"").replace(/[-_]+/g," ").trim()||"Untitled image",note:"",sourceUrl:"upload://"+file.name,assetUrl:asset,collectionIds:collectionId?[collectionId]:["all"],projectIds:[],status:"ready",createdAt:Date.now(),captureContext:{method:opts.method||"quick_upload",destination:"Vault Library",projectId:null,collectionId:collectionId||"all",quickTags:[],visualCategory:null,usageNote:"Private reference only"}};item.analysis=mergeManualAnalysis(analyze(item,colors),[],"");return item}
async function uploadImageFiles(fileList,opts){opts=opts||{};if(!state.user){toast("Log in to upload to Vault.");render();return}let files=Array.from(fileList||[]).filter(f=>f&&f.type&&f.type.startsWith("image/"));if(!files.length){toast("Drop JPG, PNG, or WebP images.");return}let saved=0,last=null;for(let file of files.slice(0,12)){try{let item=await buildImageItemFromFile(file,opts);let duplicate=findDuplicateItem(item);if(duplicate){last=duplicate;continue}commitSavedItem(item,"");saved++;last=item}catch(err){toast(err.message||"Could not upload image.");}}if(saved){state.view="vault";state.mode="image";toast(saved===1?"Image uploaded to My Vault.":saved+" images uploaded to My Vault.")}else if(last)toast("That image is already in My Vault.");render()}
function filesFromDataTransfer(dt){if(!dt)return[];if(dt.files&&dt.files.length)return Array.from(dt.files);return[]}
function isFileDrag(e){let types=e.dataTransfer&&e.dataTransfer.types?Array.from(e.dataTransfer.types):[];return types.includes("Files")||types.includes("application/x-moz-file")}
async function setProfileAvatarFromFile(file){if(!state.user){toast("Log in to update your profile photo.");return}if(!file)return;if(!["image/jpeg","image/png","image/webp"].includes(file.type)){toast("Profile photo must be JPG, PNG, or WebP.");return}if(file.size>2*1024*1024){toast("Profile photo must be 2MB or smaller.");return}let asset=await readFile(file);state.user=Object.assign({},state.user,{avatarUrl:asset});save(S.user,state.user);toast("Profile photo updated.");render()}
function removeProfileAvatar(){if(!state.user)return;state.user=Object.assign({},state.user,{avatarUrl:""});save(S.user,state.user);toast("Profile photo removed.");render()}
function bindProfileAvatarControls(){document.querySelectorAll("[data-avatar-upload]").forEach(input=>{input.onchange=async()=>{let file=input.files&&input.files[0];input.value="";await setProfileAvatarFromFile(file)}});document.querySelectorAll("[data-avatar-remove]").forEach(b=>b.onclick=e=>{e.preventDefault();removeProfileAvatar()})}
function bindQuickUploads(){document.querySelectorAll("[data-quick-upload]").forEach(input=>{input.onchange=async()=>{let files=input.files;input.value="";await uploadImageFiles(files,{method:"sidebar_file"})}});document.querySelectorAll("[data-sidebar-dropzone]").forEach(zone=>{zone.ondragenter=e=>{if(!isFileDrag(e))return;e.preventDefault();zone.classList.add("is-dragover")};zone.ondragover=e=>{if(!isFileDrag(e))return;e.preventDefault();e.dataTransfer.dropEffect="copy";zone.classList.add("is-dragover")};zone.ondragleave=e=>{if(!zone.contains(e.relatedTarget))zone.classList.remove("is-dragover")};zone.ondrop=async e=>{if(!isFileDrag(e))return;e.preventDefault();e.stopPropagation();zone.classList.remove("is-dragover");await uploadImageFiles(filesFromDataTransfer(e.dataTransfer),{method:"sidebar_drop"})}});document.querySelectorAll("[data-vault-page-drop]").forEach(page=>{let depth=0;page.ondragenter=e=>{if(!isFileDrag(e))return;e.preventDefault();depth++;page.classList.add("is-file-drag")};page.ondragover=e=>{if(!isFileDrag(e))return;e.preventDefault();e.dataTransfer.dropEffect="copy";page.classList.add("is-file-drag")};page.ondragleave=e=>{if(!isFileDrag(e))return;depth=Math.max(0,depth-1);if(!depth||!page.contains(e.relatedTarget)){depth=0;page.classList.remove("is-file-drag")}};page.ondrop=async e=>{if(!isFileDrag(e))return;e.preventDefault();e.stopPropagation();depth=0;page.classList.remove("is-file-drag");await uploadImageFiles(filesFromDataTransfer(e.dataTransfer),{method:"page_drop"})}})}
function quickTagsFrom(value){return String(value||"").split(/[,\n]/).map(v=>v.trim()).filter(Boolean).slice(0,6)}
function mergeManualAnalysis(analysis,tags,category){let a=Object.assign({},analysis||{}),set=new Set([].concat(a.tags||[]));(tags||[]).forEach(t=>set.add(t));if(category)set.add(category);a.tags=Array.from(set).slice(0,10);if(category)a.category=category;return a}
function findDuplicateItem(item){let values=duplicateKeys(item);if(!values.length)return null;return state.items.find(existing=>duplicateKeys(existing).some(v=>values.includes(v)))||null}
function duplicateKeys(i){let ctx=i&&i.captureContext||{};return [i&&i.sourceUrl,i&&i.assetUrl,i&&i.previewUrl,i&&i.thumbnailUrl,ctx.imageUrl,ctx.linkUrl,ctx.pageUrl,ctx.videoUrl].map(canonicalRef).filter(Boolean)}
function canonicalRef(v){let s=String(v||"").trim();if(!s)return"";try{return new URL(s).href.replace(/#.*$/,"")}catch(_){return s}}
function addItemToBoard(itemId,x,y){let item=state.items.find(i=>i.id===itemId);if(!item)return;let b=board();let visual=item.type==="image"||item.type==="video";let o={id:id(),kind:"item",itemId:itemId,x:Math.max(20,x-80),y:Math.max(20,y-70),w:visual?210:190,h:visual?180:150};b.objects.push(o);state.selectedObject=o.id;state.rightCollapsed=false;persistProjects()}
function addTextObject(){let b=board();let o={id:id(),kind:"text",text:"Write a mood note",x:80,y:80,w:230,h:120,color:"#17191b",size:30};b.objects.push(o);state.selectedObject=o.id;persistProjects()}
function analyze(i,colors){let ctx=i.captureContext||{},manual=Array.isArray(ctx.quickTags)?ctx.quickTags:quickTagsFrom(ctx.quickKeywords),text=(i.title+" "+i.note+" "+i.sourceUrl+" "+manual.join(" ")+" "+(ctx.visualCategory||"")).toLowerCase(),tags=new Set([(L[i.type]||"Object").toLowerCase()]);[["brand","branding"],["logo","logo"],["web","web design"],["landing","landing page"],["dashboard","dashboard"],["campaign","campaign"],["minimal","minimal"],["luxury","premium"],["cafe","cafe"],["thai","thai modern"],["coral","coral"],["red","red"],["black","graphite"],["motion","motion"],["reel","short video"],["video","video reference"],["poster","poster"],["interior","interior"],["furniture","furniture"],["product","product"],["typography","typography"],["packaging","packaging"],["illustration","illustration"]].forEach(r=>{if(text.includes(r[0]))tags.add(r[1])});manual.forEach(t=>tags.add(t));if(ctx.visualCategory)tags.add(ctx.visualCategory);if(i.type==="image")tags.add("visual reference");if(i.type==="video")tags.add("motion reference");if(i.type==="link")tags.add(host(i.sourceUrl)||"source");if(i.type==="note")tags.add("thought");return{tags:Array.from(tags).slice(0,10),category:ctx.visualCategory||"",colors:(colors&&colors.length?colors:[]).slice(0,5),tagSource:"rule",ocrText:i.type==="note"?i.note:"",summary:i.type==="image"?"Image reference saved for future creative direction.":i.type==="video"?"Video reference saved for motion, timing, and mood direction.":i.type==="link"?"Saved source from "+(host(i.sourceUrl)||"the web")+" with note context.":i.note}}
function infer(t){if(t.includes("coral")||t.includes("red"))return["#ff4f43","#2f3133","#ffffff"];if(t.includes("luxury")||t.includes("premium"))return["#17191b","#d7c7a5","#ffffff"];if(t.includes("minimal"))return["#ffffff","#e7e9ec","#2f3133"];return["#ffffff","#2f3133","#ff4f43","#e7e9ec"]}
async function colorsFrom(src){let img=await loadImg(src),canvas=document.createElement("canvas"),s=80;canvas.width=s;canvas.height=s;let ctx=canvas.getContext("2d",{willReadFrequently:true});ctx.drawImage(img,0,0,s,s);let d=ctx.getImageData(0,0,s,s).data,b=new Map();for(let i=0;i<d.length;i+=16){if(d[i+3]<120)continue;let r=Math.round(d[i]/32)*32,g=Math.round(d[i+1]/32)*32,bb=Math.round(d[i+2]/32)*32,k=clamp(r)+","+clamp(g)+","+clamp(bb);b.set(k,(b.get(k)||0)+1)}return Array.from(b.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5).map(e=>"#"+e[0].split(",").map(Number).map(v=>v.toString(16).padStart(2,"0")).join(""))}
function loadImg(src){return new Promise((res,rej)=>{let img=new Image();img.onload=()=>res(img);img.onerror=()=>rej(new Error("Could not read image colors."));img.src=src})}
function checkFile(f){if(!f||!f.size)throw new Error("Choose an image to upload.");if(!["image/jpeg","image/png","image/webp"].includes(f.type))throw new Error("A+ Vault accepts JPG, PNG, or WebP images.");if(f.size>10*1024*1024)throw new Error("Image must be 10MB or smaller.")}
function readFile(f){return new Promise((res,rej)=>{let r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error("Could not read file."));r.readAsDataURL(f)})}
function cleanCollectionIds(ids){let list=(Array.isArray(ids)?ids:[]).filter(Boolean).map(String).filter(id=>id!=="inbox");return list.length?list:["all"]}
function normalizeItems(items){let list=Array.isArray(items)?items:SEED;return list.filter(i=>i&&typeof i==="object").map((i,idx)=>{let type=["image","video","link","note"].includes(i.type)?i.type:"note",title=String(i.title||i.note||"Untitled reference").slice(0,160),sourceUrl=String(i.sourceUrl||""),assetUrl=String(i.assetUrl||""),collectionIds=cleanCollectionIds(i.collectionIds),projectIds=Array.isArray(i.projectIds)?i.projectIds.filter(Boolean).map(String):[],analysis=i.analysis&&typeof i.analysis==="object"?i.analysis:{},captureContext=i.captureContext&&typeof i.captureContext==="object"?i.captureContext:{},createdAt=Number(i.createdAt)||Date.now()-idx*1000;captureContext.quickTags=Array.isArray(captureContext.quickTags)?captureContext.quickTags.map(String).filter(Boolean):quickTagsFrom(captureContext.quickKeywords);captureContext.visualCategory=String(captureContext.visualCategory||analysis.category||"");captureContext.usageNote=String(captureContext.usageNote||"Private reference only");analysis.tags=Array.isArray(analysis.tags)?analysis.tags.filter(Boolean).map(String):[];captureContext.quickTags.forEach(t=>{if(!analysis.tags.includes(t))analysis.tags.push(t)});if(captureContext.visualCategory&&!analysis.tags.includes(captureContext.visualCategory))analysis.tags.push(captureContext.visualCategory);analysis.colors=Array.isArray(analysis.colors)?analysis.colors.filter(Boolean).map(String):infer((title+" "+sourceUrl).toLowerCase());analysis.ocrText=String(analysis.ocrText||"");analysis.summary=String(analysis.summary||"");analysis.category=String(analysis.category||captureContext.visualCategory||"");return Object.assign({},i,{id:String(i.id||id()),type,title,note:String(i.note||""),sourceUrl,assetUrl,collectionIds,projectIds,status:String(i.status||"ready"),createdAt,captureContext,analysis})})}
function normalizeCols(cols){let list=Array.isArray(cols)?cols:DEFAULT_COLS,normalized=list.filter(c=>c&&typeof c==="object").map(c=>({id:String(c.id||id()),name:String(c.name||"Collection"),system:!!c.system,parentId:c.parentId&&String(c.parentId)!==String(c.id)?String(c.parentId):"",sortOrder:Number(c.sortOrder)||0,pinnedAt:Number(c.pinnedAt)||0,highlightedAt:Number(c.highlightedAt)||0,note:String(c.note||"").slice(0,600),smart:c.smart&&c.smart.text?{text:String(c.smart.text).slice(0,600),taxVersion:Number(c.smart.taxVersion)||1,excluded:Array.isArray(c.smart.excluded)?c.smart.excluded.map(String).slice(0,500):[]}:null}));return repairCollectionTree(normalized)}
function repairCollectionTree(cols){let byId=new Map(cols.map(c=>[c.id,c]));return cols.map(c=>{if(c.system){c.parentId="";return c}if(c.parentId){let parent=byId.get(c.parentId);if(!parent||parent.system||parent.parentId)c.parentId=""}if(c.parentId&&childColsIn(cols,c.id).length)c.parentId="";return c})}
function customCols(){return state.cols.filter(c=>!c.system)}
function childColsIn(cols,parentId){return cols.filter(c=>!c.system&&c.parentId===parentId)}
function childCols(parentId){return childColsIn(state.cols,parentId).sort(collectionSiblingSort)}
function rootCustomCols(){return customCols().filter(c=>!c.parentId).sort(collectionSiblingSort)}
function collectionSiblingSort(a,b){let aPin=Number(a.pinnedAt)||0,bPin=Number(b.pinnedAt)||0;if(aPin!==bPin)return bPin-aPin;return (Number(a.sortOrder)||0)-(Number(b.sortOrder)||0)||String(a.name).localeCompare(String(b.name))||state.cols.findIndex(x=>x.id===a.id)-state.cols.findIndex(x=>x.id===b.id)}
function nextCollectionSortOrder(parentId){let siblings=customCols().filter(c=>(c.parentId||"")===(parentId||""));return siblings.reduce((max,c)=>Math.max(max,Number(c.sortOrder)||0),-1)+1}
function collectionDescendantIds(colId){let ids=[colId];childCols(colId).forEach(c=>ids.push(c.id));return ids}
function itemMatchesCollection(i,colId){if((i.collectionIds||[]).some(cid=>collectionDescendantIds(colId).includes(cid)))return true;let col=state.cols.find(c=>c.id===colId);if(col&&col.smart&&!(col.smart.excluded||[]).includes(i.id)){ensureEngine();return smartMatch(i,col.smart)}return false}
function canNestCollection(childId,parentId){if(!childId||!parentId||childId===parentId)return false;let child=state.cols.find(c=>c.id===childId),parent=state.cols.find(c=>c.id===parentId);if(!child||!parent||child.system||parent.system)return false;if(parent.parentId)return false;if(childCols(childId).length)return false;return true}
function saveColsAndSync(){save(S.cols,state.cols);customCols().forEach(c=>syncRemoteCollection(c,"rename"))}
function nestCollection(childId,parentId){if(!canNestCollection(childId,parentId))return;let child=state.cols.find(c=>c.id===childId),parent=state.cols.find(c=>c.id===parentId);state.cols=state.cols.map(c=>c.id===childId?Object.assign({},c,{parentId:parentId,sortOrder:nextCollectionSortOrder(parentId)}):c);saveColsAndSync();toast((child&&child.name||"Collection")+" is now inside "+(parent&&parent.name||"collection")+".");render()}
function promoteCollection(colId){let col=state.cols.find(c=>c.id===colId);if(!col||!col.parentId)return;state.cols=state.cols.map(c=>c.id===colId?Object.assign({},c,{parentId:"",sortOrder:nextCollectionSortOrder("")}):c);saveColsAndSync();toast((col.name||"Collection")+" moved back to main collections.");render()}
function reorderCollection(fromId,toId,mode){let from=state.cols.find(c=>c.id===fromId),target=state.cols.find(c=>c.id===toId);if(!from||!target||from.id===target.id)return;let parentId=from.parentId||"";if((target.parentId||"")!==parentId)return;let siblings=customCols().filter(c=>(c.parentId||"")===parentId).sort(collectionSiblingSort).filter(c=>c.id!==fromId),idx=siblings.findIndex(c=>c.id===toId);if(idx<0)return;if(mode==="after")idx++;siblings.splice(idx,0,from);let order=new Map(siblings.map((c,i)=>[c.id,i]));state.cols=state.cols.map(c=>order.has(c.id)?Object.assign({},c,{sortOrder:order.get(c.id)}):c);saveColsAndSync();toast("Collection order updated.");render()}
function promoteAndReorderCollection(fromId,toId,mode){let from=state.cols.find(c=>c.id===fromId);if(!from||!from.parentId)return;state.cols=state.cols.map(c=>c.id===fromId?Object.assign({},c,{parentId:"",sortOrder:nextCollectionSortOrder("")}):c);saveColsAndSync();reorderCollection(fromId,toId,mode)}
function handleCollectionDrop(fromId,toId,mode){let from=state.cols.find(c=>c.id===fromId);if(!from||from.system)return;if(mode==="promote"){if(!from.parentId){toast("Already a main collection.");return}openConfirmDialog({title:"Move to main collections",message:"Move \""+from.name+"\" back to the main collection list?",confirmText:"Move to main",onConfirm:()=>promoteCollection(fromId)});return}let target=toId?state.cols.find(c=>c.id===toId):null;if(mode==="nest"){if(!target||from.id===target.id)return;if(from.parentId===target.id){toast("Already inside this collection.");return}if(!canNestCollection(from.id,target.id)){toast("This collection cannot be nested here.");return}openConfirmDialog({title:"Add sub-collection",message:"Move \""+from.name+"\" inside \""+target.name+"\" as a sub-collection?",confirmText:"Move inside",onConfirm:()=>nestCollection(from.id,target.id)});return}if(!target)return;if(from.parentId&&!target.parentId){openConfirmDialog({title:"Move to main collections",message:"Move \""+from.name+"\" back to the main collection list?",confirmText:"Move to main",onConfirm:()=>promoteAndReorderCollection(from.id,target.id,mode)});return}if((from.parentId||"")===(target.parentId||""))reorderCollection(from.id,target.id,mode)}
let suppressColClick=false;
function bindCollectionDrag(){bindSidebarCollectionDrag({state,getSuppressColClick:()=>suppressColClick,setSuppressColClick:v=>{suppressColClick=v},handleCollectionDrop,addCollectionToProject,openConfirmDialog,explicitProjectCollectionIds})}
function normalizeProjects(projects,items){let list=Array.isArray(projects)?projects:[];return list.filter(p=>p&&typeof p==="object").map(p=>{let boards=Array.isArray(p.boards)?p.boards:[];boards=boards.filter(b=>b&&typeof b==="object").map(b=>({id:String(b.id||id()),name:String(b.name||"Moodboard"),objects:Array.isArray(b.objects)?b.objects.filter(Boolean).map(normalizeBoardObject):[]}));if(!boards.length)boards=[{id:id(),name:"Moodboard",objects:[]}];return Object.assign({},p,{id:String(p.id||id()),name:String(p.name||"Project"),description:String(p.description||""),boards,collectionIds:Array.isArray(p.collectionIds)?p.collectionIds.filter(Boolean).map(String):[],pinnedAt:Number(p.pinnedAt)||0})})}
function ensureDemoProjects(){
  let demos=defaultProjects(state.items);
  if(!demos.length)return false;
  let have=new Set((state.projects||[]).map(p=>String(p.id)));
  let missing=demos.filter(d=>!have.has(String(d.id)));
  if(!missing.length)return false;
  state.projects=normalizeProjects((state.projects||[]).concat(missing),state.items);
  return true;
}
function normalizeBoardObject(o){let kind=["item","text","palette"].includes(o.kind)?o.kind:"item";return Object.assign({},o,{id:String(o.id||id()),kind,x:Number(o.x)||40,y:Number(o.y)||40,w:Number(o.w)||180,h:Number(o.h)||140,colors:Array.isArray(o.colors)?o.colors:[],text:String(o.text||"Text")})}
function repairState(){state.items=normalizeItems(state.items);state.cols=ensureCoreCols(normalizeCols(state.cols));state.projects=normalizeProjects(state.projects,state.items);state.moodboards=normalizeMoodboards(state.moodboards);state.selected=null;state.selectedObject=null;state.openMenu=null;state.collectionPicker=null;if(state.view!=="moodboard-edit"&&state.view!=="moodboards")state.view="vault";save(S.items,state.items);save(S.cols,state.cols);save(S.projects,state.projects);save(S.moodboards,state.moodboards)}
function repairView(err){return "<div class='app-shell'><header class='topbar'>"+brand()+"<div></div><div class='actions'><button class='save-button' data-repair-vault>Open Vault</button></div></header><main class='main'><section class='empty-state'><div><h2>A+ Vault repaired the workspace.</h2><p>Some saved browser data was out of shape, so the app cleaned it up instead of showing a blank page.</p><button class='primary-button' data-repair-vault>Back to My Vault</button></div></section></main></div>"}
function bindRepair(){document.querySelectorAll("[data-repair-vault]").forEach(b=>b.onclick=()=>{state.view="vault";render()})}
function vaultImageRank(list){let ref=state.vaultImageRef&&state.vaultImageRef.ref;if(!ref)return null;return list.filter(i=>i.id!==ref.id).map(i=>({i,score:similarityScore(ref,{colors:(i.analysis&&i.analysis.colors)||[],phash:(i.analysis&&i.analysis.phash)||"",width:i.width,height:i.height})})).filter(x=>x.score>=0.3).sort((a,b)=>b.score-a.score).slice(0,60).map(x=>x.i)}
function filtered(){if(state.q||state.cols.some(c=>c.smart))ensureEngine();let opq=parseOperators(state.q),parsed=parseSearchQuery(opq.rest),opCtx={rightsOf:i=>usageRights(i).level,collectionNames:i=>(i.collectionIds||[]).map(cid=>(state.cols.find(c=>c.id===cid)||{}).name||"").filter(Boolean),colorFamilyOf:i=>colorFamily(primaryColor(i))},keyword=(state.filterKeyword||"").trim().toLowerCase(),hex=(state.filterHex||"").trim();let pick=state.items.filter(i=>{let tm=state.type==="all"||state.type==="collections"||i.type===state.type,cm=state.col==="all"||itemMatchesCollection(i,state.col),colorOk=!state.filterColor||state.filterColor==="all"||colorFamily(primaryColor(i))===state.filterColor,styleOk=!state.filterStyle||state.filterStyle==="all"||styleLabel(i)===state.filterStyle,cat=categoryLabel(i),catOk=!state.filterCategory||state.filterCategory==="all"||cat===state.filterCategory,keywordOk=!keyword||itemHasKeyword(i,keyword),hexOk=!hex||itemHasNearColor(i,hex),rightsOk=!state.filterRights||usageRights(i).level===state.filterRights,sourceOk=!state.filterSource||state.filterSource==="all"||sourceHost(i.sourceUrl)===state.filterSource,sinceOk=savedWithin(i,state.filterSince),opsOk=itemMatchesOperators(i,opq.ops,opCtx);return tm&&cm&&colorOk&&styleOk&&catOk&&keywordOk&&hexOk&&rightsOk&&sourceOk&&sinceOk&&opsOk&&itemMatchesSearch(i,parsed)});return vaultImageRank(pick)||sortItems(pick)}
function parseSearchQuery(raw){let q=String(raw||"").trim().toLowerCase();if(!q)return{tokens:[],since:0};let since=0,cleaned=q;[["today",1],["yesterday",2],["this week",7],["last week",14],["this month",31],["last month",62],["this year",366],["last year",730],["7d",7],["14d",14],["30d",30],["90d",90],["last 7 days",7],["last 30 days",30],["last 90 days",90]].forEach(pair=>{if(cleaned.includes(pair[0])){since=Math.max(since,pair[1]*24*60*60*1000);cleaned=cleaned.replace(pair[0]," ")}});let tokens=cleaned.split(/\s+/).map(t=>t.trim()).filter(Boolean).filter(t=>t.length>1||/^#[0-9a-f]{3,8}$/i.test(t));return{tokens,since}}
function expandSearchToken(token){let t=String(token||"").toLowerCase(),map={img:"image",image:"image",images:"image",photo:"image",photos:"image",pic:"image",pics:"image",video:"video",videos:"video",reel:"video",reels:"video",motion:"motion",link:"link",links:"link",url:"link",urls:"link",note:"note",notes:"note",text:"note",thought:"note",coral:"coral",red:"coral",warm:"warm",cool:"cool",dark:"dark",light:"light",neutral:"neutral",minimal:"minimal",premium:"premium brand",brand:"branding",branding:"branding",identity:"branding",logo:"logo",campaign:"campaign collage",collage:"campaign collage",ui:"digital ui",digital:"digital ui",web:"digital ui",dashboard:"digital ui",furniture:"furniture",interior:"interior",poster:"poster",typography:"typography",font:"typography",packaging:"packaging",illustration:"illustration",product:"product"};return map[t]||t}
function searchHaystack(i){let colors=(i.analysis&&i.analysis.colors)||[],families=colors.map(c=>colorFamily(c)),hexes=colors.map(c=>safeHex(c).toLowerCase()),cols=(i.collectionIds||[]).map(id=>{let c=state.cols.find(x=>x.id===id);return c&&c.name||id}),projects=(i.projectIds||[]).map(id=>{let p=state.projects.find(x=>x.id===id);return p&&p.name||id}),created=new Date(Number(i.createdAt)||0),typeName=(L[i.type]||i.type||"").toLowerCase(),savedLabel=created.toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}).toLowerCase();return[i.title,i.note,i.sourceUrl,host(i.sourceUrl),i.type,typeName,i.analysis&&i.analysis.summary,i.analysis&&i.analysis.ocrText,categoryLabel(i),styleLabel(i),colorFamily(primaryColor(i)),i.captureContext&&i.captureContext.visualCategory,i.captureContext&&i.captureContext.usageNote,savedLabel,created.getFullYear()].concat((i.analysis&&i.analysis.tags)||[],(i.captureContext&&i.captureContext.quickTags)||[],families,hexes,hexes.map(h=>h.replace("#","")),cols,projects).join(" ").toLowerCase()}
function itemMatchesSearch(i,parsed){if(!parsed||(!parsed.tokens.length&&!parsed.since))return true;if(parsed.since){let age=Date.now()-(Number(i.createdAt)||0);if(age>parsed.since)return false}if(!parsed.tokens.length)return true;let hay=searchHaystack(i);return parsed.tokens.every(token=>{let tt=tagTokenHit(i,token);if(tt!==null)return tt;if(engineTokenHit(i,token))return true;if(hasThai(token)){let groups=thaiConcepts(token);if(groups.length)return groups.every(g=>g.some(v=>hay.includes(v)))||hay.includes(token)}let t=expandSearchToken(token);if(t===i.type||t===(L[i.type]||"").toLowerCase())return true;if(["coral","warm","cool","dark","light","neutral"].includes(t))return((i.analysis&&i.analysis.colors)||[]).some(c=>colorFamily(c)===t)||colorFamily(primaryColor(i))===t;if(/^#[0-9a-f]{3,8}$/i.test(token)||/^#[0-9a-f]{3,8}$/i.test(t)){let hex=safeHex(t.startsWith("#")?t:"#"+t).toLowerCase();return((i.analysis&&i.analysis.colors)||[]).some(c=>safeHex(c).toLowerCase()===hex||safeHex(c).toLowerCase().includes(hex.slice(1,4)))}return hay.includes(t)||hay.includes(token)})}
function sortItems(list){let orderIndex=new Map(state.items.map((item,idx)=>[item.id,idx]));return list.map((i,idx)=>({i,idx})).sort((a,b)=>{let aPin=Number(a.i.pinnedAt)||0,bPin=Number(b.i.pinnedAt)||0;if(aPin||bPin){if(aPin!==bPin)return bPin-aPin}let s=state.sortBy||"saved_new";if(s==="saved_new")return (orderIndex.get(a.i.id)??0)-(orderIndex.get(b.i.id)??0);if(s==="saved_old")return (orderIndex.get(b.i.id)??0)-(orderIndex.get(a.i.id)??0);if(s==="color")return primaryColor(a.i).localeCompare(primaryColor(b.i))||a.idx-b.idx;if(s==="keyword")return primaryKeyword(a.i).localeCompare(primaryKeyword(b.i))||a.idx-b.idx;if(s==="style")return styleLabel(a.i).localeCompare(styleLabel(b.i))||a.idx-b.idx;if(s==="category")return categoryLabel(a.i).localeCompare(categoryLabel(b.i))||a.idx-b.idx;return a.idx-b.idx}).map(x=>x.i)}
function primaryColor(i){return String(i.analysis&&i.analysis.colors&&i.analysis.colors[0]||"#ffffff").toLowerCase()}
function primaryKeyword(i){return String(i.analysis&&i.analysis.tags&&i.analysis.tags[0]||i.type||"").toLowerCase()}
function styleLabel(i){let text=objectText(i);if(/minimal|quiet|soft|neutral|material/.test(text))return"minimal";if(/premium|luxury|brand|identity|logo/.test(text))return"premium brand";if(/campaign|handmade|cork|board/.test(text))return"campaign collage";if(/web|landing|dashboard|ui|app/.test(text))return"digital ui";if(/motion|video|reel/.test(text))return"motion";return"general reference"}
function categoryLabel(i){let explicit=String(i.analysis&&i.analysis.category||i.captureContext&&i.captureContext.visualCategory||"").toLowerCase();if(explicit)return explicit==="ui"?"ui":explicit;let text=objectText(i);if(/chair|sofa|table|kitchen|wood|veneer|furniture/.test(text))return"furniture";if(/interior|material|room|home/.test(text))return"interior";if(/paint|art|gallery|canvas/.test(text))return"illustration";if(/poster|print/.test(text))return"poster";if(/type|font|letter|text|typography/.test(text))return"typography";if(/package|packaging|label/.test(text))return"packaging";if(/product/.test(text))return"product";if(/dashboard|web|landing|app|ui/.test(text))return"ui";if(/brand|logo|identity/.test(text))return"branding";return"other"}
function objectText(i){return [i.title,i.note,i.sourceUrl,i.type,i.captureContext&&i.captureContext.visualCategory].concat((i.analysis&&i.analysis.tags)||[],(i.captureContext&&i.captureContext.quickTags)||[]).join(" ").toLowerCase()}
function itemHasKeyword(i,keyword){let needle=String(keyword||"").trim().toLowerCase();if(!needle)return true;let tags=((i.analysis&&i.analysis.tags)||[]).concat((i.captureContext&&i.captureContext.quickTags)||[]);return tags.some(t=>String(t||"").trim().toLowerCase()===needle)}
function colorDistance(a,b){let x=hexRgb(a),y=hexRgb(b),dr=x.r-y.r,dg=x.g-y.g,db=x.b-y.b;return Math.sqrt(dr*dr+dg*dg+db*db)}
function itemHasNearColor(i,hex,tolerance){let target=safeHex(hex),limit=typeof tolerance==="number"?tolerance:48,colors=((i.analysis&&i.analysis.colors)||[]).map(safeHex);return colors.some(c=>colorDistance(c,target)<=limit)}
function filterVaultByKeyword(keyword){let tag=String(keyword||"").trim();if(!tag)return;state.filterKeyword=tag;state.filterHex="";state.q="";state.col="all";state.view="vault";state.selected=null;state.openMenu=null;state.sortMenu=false;toast("Showing keyword: "+tag);vaultRenderPreferSoft({resetGrid:true})}
function filterVaultByColor(hex){let color=safeHex(hex);if(!color)return;state.filterHex=color;state.filterKeyword="";state.q="";state.col="all";state.view="vault";state.selected=null;state.openMenu=null;state.sortMenu=false;toast("Showing color: "+color);vaultRenderPreferSoft({resetGrid:true})}
document.addEventListener("click",e=>{let b=e.target&&e.target.closest?e.target.closest("[data-filter-rights]"):null;if(!b)return;e.preventDefault();e.stopPropagation();let lvl=b.dataset.filterRights;if(!USAGE_RIGHTS[lvl])return;state.filterRights=lvl;state.view="vault";resetVaultGridLimit();render()});
document.addEventListener("change",e=>{let sel=e.target&&e.target.closest?e.target.closest("[data-rights-select]"):null;if(!sel)return;let item=state.items.find(i=>i.id===sel.dataset.rightsSelect);if(!item)return;let v=USAGE_RIGHTS[sel.value]?sel.value:"";patch(item.id,{captureContext:Object.assign({},item.captureContext,{usageRights:v})});render();toast(v?"Usage rights set to "+USAGE_RIGHTS[v].label+".":"Usage rights set to auto.")});
setUsageRightsMode(state.user&&state.user.rightsMode);
document.addEventListener("click",e=>{let t=e.target&&e.target.closest?e.target:null;if(!t)return;let j=t.closest("[data-settings-jump]");if(j){e.preventDefault();let sec=document.getElementById(j.dataset.settingsJump);if(sec)sec.scrollIntoView({behavior:"smooth",block:"start"});return}let rv=t.closest("[data-reveal-token]");if(rv){e.preventDefault();let code=document.querySelector("[data-extension-token]"),tok=getVaultApiToken();if(!code||!tok)return;let show=code.dataset.masked==="true";code.textContent=show?tok:maskToken(tok);code.dataset.masked=show?"false":"true";rv.textContent=show?"Hide":"Show";rv.setAttribute("aria-pressed",String(show));return}let all=t.closest("[data-logout-everywhere]");if(all){e.preventDefault();openConfirmDialog({title:"Sign out on all devices",message:"This signs you out everywhere, including other browsers and phones. Your Vault data stays safe.",confirmText:"Sign out everywhere",onConfirm:async()=>{await vaultRemote.signOut({everywhere:true}).catch(()=>{});localStorage.removeItem(S.user);state.user=null;state.authPrompt=null;writePendingAction(null);state.view="discover";history.replaceState(null,"",location.origin+"/");toast("Signed out on all devices.");render()}})}});
document.addEventListener("change",e=>{let sel=e.target&&e.target.closest?e.target.closest("[data-rights-mode]"):null;if(!sel||!state.user)return;state.user=Object.assign({},state.user,{rightsMode:sel.value==="reference"?"reference":"auto"});save(S.user,state.user);setUsageRightsMode(state.user.rightsMode);toast(sel.value==="reference"?"Unlabeled items are now reference only.":"Usage rights are guessed from the source.")});
document.addEventListener("click",e=>{let t=e.target&&e.target.closest?e.target:null;if(!t)return;let b=t.closest("[data-filterrightsopt],[data-filtersince],[data-filtersource]");if(!b)return;e.preventDefault();e.stopPropagation();if(b.dataset.filterrightsopt!==undefined){let v=b.dataset.filterrightsopt;state.filterRights=USAGE_RIGHTS[v]?v:""}if(b.dataset.filtersince!==undefined)state.filterSince=b.dataset.filtersince;if(b.dataset.filtersource!==undefined)state.filterSource=b.dataset.filtersource;vaultRenderPreferSoft({resetGrid:true})},true);
function vaultSuggestPool(){let pool=[],tags=new Map();state.items.forEach(i=>((i.analysis&&i.analysis.tags)||[]).forEach(t=>{t=String(t).toLowerCase();tags.set(t,(tags.get(t)||0)+1)}));[...tags].sort((a,b)=>b[1]-a[1]).slice(0,200).forEach(([t])=>pool.push({kind:"tag",value:t}));state.cols.filter(c=>!c.system).forEach(c=>pool.push({kind:"collection",value:c.name}));topSources(state.items,30).forEach(h=>pool.push({kind:"site",value:h}));return pool}
function lastQueryWord(q){let m=String(q||"").match(/(?:^|\s)("[^"]*|[^\s]*)$/);return m?m[1].replace(/^"/,""):""}
function updateVaultSuggestions(input){let host=document.querySelector("[data-search-suggest-host]");if(!host)return;let word=lastQueryWord(input.value);host.innerHTML=word&&!/:/.test(word)?suggestionsMarkup(buildSuggestions(word,vaultSuggestPool(),6),"vault-suggest"):""}
document.addEventListener("input",e=>{let input=e.target&&e.target.matches&&e.target.matches("[data-search]")?e.target:null;if(input)updateVaultSuggestions(input)});
document.addEventListener("click",e=>{let b=e.target&&e.target.closest?e.target.closest("[data-vault-suggest]"):null;if(!b)return;e.preventDefault();e.stopPropagation();let sug;try{sug=JSON.parse(b.dataset.vaultSuggest)}catch(err){return}let input=document.querySelector("[data-search]"),cur=input?input.value:state.q,word=lastQueryWord(cur),base=cur.slice(0,cur.length-word.length).replace(/"$/,""),next=(base+suggestionQuery(sug)+" ").replace(/^\s+/,"");if(input){input.value=next;input.focus()}queueSearchRender(next);let host=document.querySelector("[data-search-suggest-host]");if(host)host.innerHTML=""},true);
document.addEventListener("change",async e=>{let input=e.target&&e.target.matches&&e.target.matches("[data-vault-image-search]")?e.target:null;if(!input||!input.files||!input.files[0])return;try{let res=await analyzeImageFile(input.files[0]);state.vaultImageRef={title:res.title,thumb:res.thumb,ref:res.ref};state.q="";state.searchOpen=false;state.view="vault";resetVaultGridLimit();render()}catch(err){toast(err&&err.message||"Could not read this image.")}input.value=""});
document.addEventListener("click",e=>{let b=e.target&&e.target.closest?e.target.closest("[data-vault-similar]"):null;if(!b)return;e.preventDefault();e.stopPropagation();let item=state.items.find(i=>i.id===b.dataset.vaultSimilar);if(!item)return;let a=item.analysis||{};state.vaultImageRef={title:item.title,thumb:item.thumbnailUrl||(item.type==="image"?item.assetUrl:""),ref:{id:item.id,phash:a.phash||"",colors:a.colors||[],ratio:(Number(item.width)||1)/(Number(item.height)||1),hasMeta:false}};state.q="";state.view="vault";resetVaultGridLimit();render()},true);
function savedSearches(){let list=load(SMART_KEY,[]);return Array.isArray(list)?list.filter(x=>x&&x.id&&x.name):[]}
function savedSearchesMarkup(){let list=savedSearches();if(!list.length)return"";return "<div class='saved-searches'><span>Saved searches</span><div class='saved-search-row'>"+list.map(x=>"<span class='saved-search-chip'><button type='button' data-run-saved-search='"+escA(x.id)+"'>"+icon("search")+esc(x.name)+"</button><button type='button' class='saved-search-remove' data-remove-saved-search='"+escA(x.id)+"' aria-label='Remove saved search "+escA(x.name)+"'>&times;</button></span>").join("")+"</div></div>"}
function currentSearchState(){let o={};SMART_FIELDS.forEach(k=>{let v=state[k];if(v&&v!=="all")o[k]=v});return o}
document.addEventListener("click",e=>{let t=e.target&&e.target.closest?e.target:null;if(!t)return;let save1=t.closest("[data-save-search]");if(save1){e.preventDefault();e.stopPropagation();let crit=currentSearchState();if(!Object.keys(crit).length){toast("Search or filter first, then save it.");return}openTextDialog({title:"Save search",message:"Saved searches update by themselves as you keep new references.",label:"Name",value:(crit.q||crit.filterKeyword||"My search").slice(0,40),confirmText:"Save",onSubmit:name=>{name=String(name||"").trim().slice(0,40);if(!name)return;let list=savedSearches();list.unshift({id:id(),name,criteria:crit,createdAt:Date.now()});save(SMART_KEY,list.slice(0,24));toast("Saved “"+name+"”. Find it in search.");render()}});return}
let run=t.closest("[data-run-saved-search]");if(run){e.preventDefault();e.stopPropagation();let x=savedSearches().find(v=>v.id===run.dataset.runSavedSearch);if(!x)return;SMART_FIELDS.forEach(k=>{state[k]=k==="q"||k==="filterKeyword"||k==="filterHex"||k==="filterRights"?"":"all"});Object.assign(state,x.criteria||{});state.vaultImageRef=null;state.searchOpen=false;state.view="vault";resetVaultGridLimit();render();return}
let rm=t.closest("[data-remove-saved-search]");if(rm){e.preventDefault();e.stopPropagation();save(SMART_KEY,savedSearches().filter(v=>v.id!==rm.dataset.removeSavedSearch));let host=t.closest(".saved-searches");if(host)host.outerHTML=savedSearchesMarkup()}},true);
let shortcutPrefix=null,shortcutPrefixTimer=null;
function openShortcuts(){document.querySelectorAll(".shortcut-backdrop").forEach(n=>n.remove());document.body.insertAdjacentHTML("beforeend",shortcutsDialogMarkup());let c=document.querySelector(".shortcut-close");if(c)c.focus({preventScroll:true})}
function closeShortcuts(){let n=document.querySelector(".shortcut-backdrop");if(!n)return false;n.remove();return true}
function setPhoneSearch(on){let root=document.documentElement;if(on)root.dataset.mSearch="1";else delete root.dataset.mSearch}
function togglePhoneSearch(){if(document.documentElement.dataset.mSearch){setPhoneSearch(false);if(state.view!=="discover"&&state.searchOpen){state.searchOpen=false;render()}else if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();return}setPhoneSearch(true);state.profileMenu=false;focusSearchShortcut()}
document.addEventListener("focusout",e=>{if(!document.documentElement.dataset.mSearch||!e.target||!e.target.matches||!e.target.matches("[data-search],[data-discover-search] input"))return;setTimeout(()=>{let a=document.activeElement;if(a&&a.matches&&a.matches("[data-search],[data-discover-search] input,[data-search-clear]"))return;if(!String(e.target.value||"").trim())setPhoneSearch(false)},200)});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.documentElement.dataset.mSearch)setPhoneSearch(false)});
function focusSearchShortcut(){if(state.view==="discover"){let d=document.querySelector("[data-discover-search] input");if(d){d.focus();d.select();return}}if(state.view!=="vault"){state.view="vault"}state.searchOpen=true;render();setTimeout(()=>{let i=document.querySelector("[data-search]");if(i){i.focus();i.select()}},0)}
document.addEventListener("click",e=>{let b=e.target&&e.target.closest?e.target.closest("[data-shortcuts-close]"):null;if(!b)return;if(b.tagName==="BUTTON"||!e.target.closest(".shortcut-dialog")){e.preventDefault();closeShortcuts()}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&closeShortcuts()){e.preventDefault();e.stopImmediatePropagation();return}if(e.metaKey||e.ctrlKey||e.altKey||isTypingTarget(e.target)||state.dialog||state.modal||state.view==="moodboard-edit"||document.querySelector(".discover-report-backdrop,.discover-save-backdrop"))return;let k=e.key.length===1?e.key.toLowerCase():e.key;
if(shortcutPrefix==="g"){shortcutPrefix=null;clearTimeout(shortcutPrefixTimer);let to={d:"discover",v:"vault",c:"collections"}[k];if(to){e.preventDefault();state.view=to;state.searchOpen=false;render()}return}
if(k==="?"){e.preventDefault();openShortcuts();return}
if(k==="/"){e.preventDefault();focusSearchShortcut();return}
if(k==="g"){shortcutPrefix="g";clearTimeout(shortcutPrefixTimer);shortcutPrefixTimer=setTimeout(()=>{shortcutPrefix=null},1200);return}
if(k==="n"){e.preventDefault();if(!state.user){toast("Log in to keep references.");return}state.modal=true;render();return}
if(state.view!=="vault"||state.discover.openId)return;let item=state.items.find(i=>i.id===state.selected);if(!item)return;
if(k===" "){e.preventDefault();openMediaLightbox(item.id);return}
if(k==="p"){e.preventDefault();togglePin(item.id);return}
if(k==="c"){e.preventDefault();state.rightCollapsed=false;state.collectionPicker=item.id;render()}});
function keepTargetId(){let v=String(load(KEEP_TARGET_KEY,"")||"");return v&&state.cols.some(c=>c.id===v&&!c.system)?v:""}
function keepTargetName(){let v=keepTargetId();return v?((state.cols.find(c=>c.id===v)||{}).name||"My Vault"):"My Vault"}
function syncKeepTargetLabel(){let n=keepTargetName();setDiscoverKeepTargetLabel(n);document.querySelectorAll(".discover-target-label").forEach(el=>{el.textContent=n})}
function keepTargetOptions(){let out=[];rootCustomCols().forEach(c=>{out.push({id:c.id,name:c.name,depth:0});childCols(c.id).forEach(ch=>out.push({id:ch.id,name:ch.name,depth:1}))});return out}
function closeKeepTargetMenu(){document.querySelectorAll(".discover-target-menu").forEach(n=>n.remove());document.querySelectorAll(".discover-card.target-open").forEach(n=>n.classList.remove("target-open"))}
function openKeepTargetMenu(card,creating){closeKeepTargetMenu();if(!card)return;card.classList.add("target-open");card.insertAdjacentHTML("beforeend",discoverKeepTargetMenuMarkup(keepTargetOptions(),keepTargetId(),!!creating));let f=card.querySelector(creating?".discover-target-new-form input":".discover-target-option.is-current");if(f)f.focus({preventScroll:true})}
function setKeepTarget(colId){save(KEEP_TARGET_KEY,colId||"");syncKeepTargetLabel();closeKeepTargetMenu();toast("+ Keep now saves to "+keepTargetName()+".")}
syncKeepTargetLabel();
document.addEventListener("click",e=>{let t=e.target&&e.target.closest?e.target:null;if(!t)return;let tog=t.closest("[data-discover-target-toggle]");if(tog){e.preventDefault();e.stopPropagation();let card=tog.closest(".discover-card");if(!state.user){let kb=card&&card.querySelector("[data-discover-keep]");requireAuth({type:"keep",id:kb?kb.dataset.discoverKeep:""});return}if(card&&card.classList.contains("target-open")){closeKeepTargetMenu();return}openKeepTargetMenu(card,false);return}
let opt=t.closest("[data-discover-target]");if(opt){e.preventDefault();e.stopPropagation();setKeepTarget(opt.dataset.discoverTarget);return}
let nw=t.closest("[data-discover-target-new]");if(nw){e.preventDefault();e.stopPropagation();openKeepTargetMenu(nw.closest(".discover-card"),true);return}
if(t.closest(".discover-target-menu")){e.stopPropagation();return}
if(document.querySelector(".discover-target-menu"))closeKeepTargetMenu()},true);
document.addEventListener("submit",e=>{let f=e.target&&e.target.closest?e.target.closest("[data-discover-target-new-form]"):null;if(!f)return;e.preventDefault();e.stopPropagation();let name=String(new FormData(f).get("name")||"").trim().slice(0,60);if(!name)return;let c=createCollection(name,{keepView:true,skipToast:true});if(c&&c.id)setKeepTarget(c.id)},true);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.querySelector(".discover-target-menu")){e.preventDefault();e.stopImmediatePropagation();closeKeepTargetMenu()}},true);
function resurfacePicks(){let day=new Date().toISOString().slice(0,10);if(load(RESURFACE_KEY,"")===day)return[];return pickFromPast(state.items,{day,opened:load(OPENED_KEY,{})})}
function resurfaceAge(i){let d=Math.round((Date.now()-(Number(i.createdAt)||0))/86400000);return d<60?d+" days ago":Math.round(d/30)+" months ago"}
function vaultResurfaceMarkup(){if(state.q.trim()||state.filterKeyword||state.filterHex||state.filterRights||state.vaultImageRef||state.col!=="all"||state.type!=="all")return"";let picks=resurfacePicks();if(!picks.length)return"";return "<section class='resurface' aria-label='From your past'><div class='resurface-head'><span>From your past</span><button type='button' data-resurface-hide aria-label='Hide for today'>Hide for today</button></div><div class='resurface-row'>"+picks.map(i=>"<button type='button' class='resurface-item' data-resurface='"+escA(i.id)+"'><span class='resurface-thumb'>"+media(i)+"</span><span class='resurface-meta'><strong>"+esc(i.title)+"</strong><small>Saved "+esc(resurfaceAge(i))+"</small></span></button>").join("")+"</div></section>"}
document.addEventListener("click",e=>{let t=e.target&&e.target.closest?e.target:null;if(!t)return;let h=t.closest("[data-resurface-hide]");if(h){e.preventDefault();save(RESURFACE_KEY,new Date().toISOString().slice(0,10));let sec=t.closest(".resurface");if(sec)sec.remove();return}let it=t.closest("[data-resurface]");if(it){e.preventDefault();e.stopPropagation();state.selected=it.dataset.resurface;state.rightCollapsed=false;render()}},true);
/* Android share sheet → installed PWA opens /vault?share_url=…; prefill the Keep link form. */
function readSharedLink(){let q=new URLSearchParams(location.search),url=q.get("share_url")||"",txt=q.get("share_text")||"",title=q.get("share_title")||"";if(!url){let m=txt.match(/https?:\/\/\S+/);if(m){url=m[0];txt=txt.replace(m[0],"").trim()}}if(!url&&!txt)return null;history.replaceState(null,"",location.pathname);return{url:url.slice(0,2000),title:title.slice(0,160),note:txt.slice(0,500)}}
function applySharedLink(share){if(!share)return;if(!state.user){try{sessionStorage.setItem("aplus-vault-shared",JSON.stringify(share))}catch(e){}toast("Log in to keep what you shared.");return}state.view="vault";state.modal=true;state.mode=share.url?"link":"note";render();setTimeout(()=>{let f=document.querySelector("[data-form]");if(!f)return;let set=(n,v)=>{let el=f.elements[n];if(el&&v&&!el.value)el.value=v};set("sourceUrl",share.url);set("title",share.title);set("note",share.note);let t=f.elements.title;if(t)t.focus()},0)}
window.addEventListener("load",()=>{let share=readSharedLink();if(!share&&state.user){try{share=JSON.parse(sessionStorage.getItem("aplus-vault-shared")||"null");sessionStorage.removeItem("aplus-vault-shared")}catch(e){}}setTimeout(()=>applySharedLink(share),300)});
document.addEventListener("click",e=>{let b=e.target&&e.target.closest?e.target.closest("[data-export-moodboard]"):null;if(!b)return;e.preventDefault();let board=(state.moodboards||[]).find(x=>x.id===b.dataset.exportMoodboard);if(!board){toast("Open a moodboard to export.");return}let itemsById=new Map(state.items.map(i=>[i.id,i])),html=moodboardExportHtml(board,{itemsById,rightsLabel:i=>USAGE_RIGHTS[usageRights(i).level].label,siteName:"A+ Vault"}),w=window.open("","_blank");if(!w){toast("Allow pop-ups to export the PDF.");return}w.document.open();w.document.write(html);w.document.close();let go=()=>setTimeout(()=>{try{w.focus();w.print()}catch(e){}},300);w.document.readyState==="complete"?go():w.addEventListener("load",go);toast("Choose “Save as PDF” in the print dialog.")});
let quickNoteTimer=null,quickNoteUser=null;
function quickNoteUserId(){return state.user&&(state.user.id||state.user.email)||"guest"}
function mountQuickNote(){let uid=quickNoteUserId(),host=document.querySelector("[data-quick-note]");if(host&&quickNoteUser===uid){host.hidden=quickNoteHidden();return}quickNoteUser=uid;let store=readNoteStore(uid),note=activeNote(store),html=quickNoteMarkup(store,quickNoteOpen(),note.updatedAt?"Saved":"",quickNoteThumbs(note));if(host)host.outerHTML=html;else document.body.insertAdjacentHTML("beforeend",html);let el=document.querySelector("[data-quick-note]");if(el)el.hidden=quickNoteHidden()}
function quickNoteThumbs(note){return (note.pins||[]).map(pid=>{let i=state.items.find(x=>x.id===pid);let src=i&&(i.thumbnailUrl||i.previewUrl||(i.type==="image"?i.assetUrl:""));return src?{id:pid,src}:null}).filter(Boolean)}
function remountQuickNote(){quickNoteUser=null;mountQuickNote();let el=document.querySelector("[data-quick-note]");if(el)el.classList.add("qn-swap")}
function saveQuickNoteNow(){clearTimeout(quickNoteTimer);if(document.querySelector("[data-quick-note-field]"))writeQuickNote(quickNoteUserId(),quickNoteValues())}
function notePinItem(itemId){if(!state.user||!quickNoteEnabled()||!quickNoteOpen())return;saveQuickNoteNow();let r=pinToActiveNote(quickNoteUserId(),itemId);if(r.added){remountQuickNote();toast("Saved and pinned to your note.")}}
function quickNoteEnabled(){try{return localStorage.getItem("aplus-vault-quick-note-on")==="1"}catch(e){return false}}
function quickNoteHidden(){return !state.user||!quickNoteEnabled()||state.view==="moodboard-edit"}
document.addEventListener("click",e=>{let b=e.target&&e.target.closest?e.target.closest("[data-toggle-quick-note]"):null;if(!b)return;e.preventDefault();e.stopPropagation();let on=!quickNoteEnabled();try{localStorage.setItem("aplus-vault-quick-note-on",on?"1":"0")}catch(_){}if(on)setQuickNoteOpen(true);closeProfileMenu({instant:true});quickNoteUser=null;mountQuickNote()},true)
function quickNoteValues(){let o={lookingFor:"",forWhat:"",notes:""};document.querySelectorAll("[data-quick-note-field]").forEach(f=>{o[f.dataset.quickNoteField]=f.value});return o}
function setQuickNoteState(open){setQuickNoteOpen(open);let el=document.querySelector("[data-quick-note]");if(!el)return;el.classList.toggle("is-open",open);let paper=el.querySelector(".quick-note-paper");if(paper)paper.hidden=!open;el.querySelectorAll("[data-quick-note-toggle]").forEach(b=>b.setAttribute("aria-expanded",String(open)));if(open){let f=el.querySelector("[data-quick-note-field='lookingFor']");if(f)setTimeout(()=>f.focus({preventScroll:true}),60)}}
function refreshQuickNoteFab(){let fab=document.querySelector(".quick-note-fab");if(fab)fab.classList.toggle("has-content",quickNoteHasContent(quickNoteValues()))}
document.addEventListener("input",e=>{let f=e.target&&e.target.matches&&e.target.matches("[data-quick-note-field]")?e.target:null;if(!f)return;let lbl=document.querySelector("[data-quick-note-saved]");if(lbl)lbl.textContent="Saving…";clearTimeout(quickNoteTimer);quickNoteTimer=setTimeout(()=>{writeQuickNote(quickNoteUserId(),quickNoteValues());if(lbl)lbl.textContent="Saved";refreshQuickNoteFab()},400)});
document.addEventListener("click",e=>{let t=e.target&&e.target.closest?e.target:null;if(!t||!t.closest("[data-quick-note]"))return;
if(t.closest("[data-quick-note-toggle]")){e.preventDefault();setQuickNoteState(!document.querySelector("[data-quick-note]").classList.contains("is-open"));return}
if(t.closest("[data-quick-note-clear]")){e.preventDefault();clearQuickNote(quickNoteUserId());remountQuickNote();return}
if(t.closest("[data-quick-note-delete]")){e.preventDefault();removeActiveNote(quickNoteUserId());remountQuickNote();return}
if(t.closest("[data-quick-note-new]")){e.preventDefault();saveQuickNoteNow();let r=addNote(quickNoteUserId());if(!r.added)toast("Up to 12 notes.");remountQuickNote();return}
let tab=t.closest("[data-quick-note-tab]");if(tab){e.preventDefault();saveQuickNoteNow();setActiveNote(quickNoteUserId(),tab.dataset.quickNoteTab);remountQuickNote();return}
let unpin=t.closest("[data-quick-note-unpin]");if(unpin){e.preventDefault();unpinFromActiveNote(quickNoteUserId(),unpin.dataset.quickNoteUnpin);remountQuickNote();return}
if(t.closest("[data-quick-note-board]")){e.preventDefault();saveQuickNoteNow();let n=activeNote(readNoteStore(quickNoteUserId())),ids=(n.pins||[]).filter(pid=>state.items.some(x=>x.id===pid));if(ids.length<2){toast("Pin at least 2 references first: keep things from Discover while this note is open.");return}let nm=(n.lookingFor||n.forWhat||"Moodboard from note").trim().slice(0,60),board=createMoodboardFromSelection({name:nm,itemIds:ids,items:state.items,pack:packSmartGrid,gridPreset:"balanced"});state.moodboards=(state.moodboards||[]).concat(board);persistMoodboards();trackMoodboardEvent("moodboard_created_from_selection",{count:ids.length,source:"quick_note"});setQuickNoteState(false);openMoodboard(board.id);return}
if(t.closest("[data-quick-note-search]")){e.preventDefault();let q=quickNoteValues().lookingFor.trim();if(!q){toast("Write what you are looking for first.");return}state.view="discover";render();setTimeout(()=>{let f=document.querySelector("[data-discover-search]"),i=f&&f.querySelector("input");if(i){i.value=q;f.requestSubmit?f.requestSubmit():f.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))}},50);return}
if(t.closest("[data-quick-note-keep]")){e.preventDefault();let v=quickNoteValues();if(!quickNoteHasContent(v)){toast("The note is empty.");return}if(!state.user){toast("Log in to keep notes in your Vault.");return}let body=[v.lookingFor&&"Looking for: "+v.lookingFor,v.forWhat&&"For: "+v.forWhat,v.notes].filter(Boolean).join("\n\n"),item=normalizeItems([{id:id(),type:"note",title:(v.lookingFor||v.forWhat||v.notes).trim().slice(0,80)||"Quick note",note:body,collectionIds:["all"],createdAt:Date.now(),captureContext:{method:"quick-note"}}])[0];state.items=[item].concat(state.items);save(S.items,state.items);syncRemoteItem(item,"create");toast("Note kept in My Vault.");if(state.view==="vault")render()}});
document.addEventListener("click",e=>{let b=e.target&&e.target.closest?e.target.closest("[data-open-shortcuts]"):null;if(!b)return;e.preventDefault();e.stopPropagation();closeProfileMenu({instant:true});openShortcuts()},true);
function guestThumb(i){let it=state.discover&&state.discover.items&&state.discover.items.length?state.discover.items[i%state.discover.items.length]:null;if(it&&it.image_sm_path)return "<img src='"+escA(discoverMediaUrl(discoverConfig(),it.image_sm_path))+"' alt='' loading='lazy' decoding='async'>";let c=["#d9c7a7","#b9774f","#3e5c76","#c9b38f","#7a8b6f","#e3d5c3","#a44a3f","#2f3133"];return "<span style='display:block;width:100%;height:100%;background:linear-gradient(135deg,"+c[i%8]+","+c[(i+3)%8]+")'></span>"}
function guestPreviewMarkup(view){let t=n=>Array.from({length:n},(_,i)=>"<span class='gp-tile'>"+guestThumb(i+2)+"</span>").join("");
if(view==="collections")return "<div class='gp gp-collections'>"+["Packaging ideas","Client A — Brand","Type & lettering"].map((n,i)=>"<div class='gp-folder'><div class='gp-folder-thumbs'>"+[0,1,2].map(k=>"<span class='gp-tile'>"+guestThumb(i*3+k)+"</span>").join("")+"</div><strong>"+n+"</strong><small>"+(12+i*7)+" references</small></div>").join("")+"</div>";
if(view==="projects")return "<div class='gp gp-project'><div class='gp-project-head'><strong>Heritage tea — rebrand</strong><small>Brief · 3 collections · 2 moodboards</small></div><div class='gp-project-row'>"+t(4)+"</div><div class='gp-chips'><span>Warm</span><span>Kraft paper</span><span>Quiet type</span></div></div>";
if(view==="moodboards")return "<div class='gp gp-board'><span class='gp-b1'>"+guestThumb(1)+"</span><span class='gp-b2'>"+guestThumb(4)+"</span><span class='gp-b3'>"+guestThumb(6)+"</span><span class='gp-b4'><i style='background:#d9c7a7'></i><i style='background:#b9774f'></i><i style='background:#3e5c76'></i><i style='background:#2f3133'></i><i style='background:#ff4f43'></i></span><span class='gp-b5'>Warm, honest, a little vintage.</span></div>";
return "<div class='gp gp-vault'>"+t(8)+"<span class='gp-keep'>+ Keep</span></div>"}
function guestHeroMarkup(){setTimeout(bindGuestReveal,0);let feats=[["Save in one click","Grab any image from any site with the Chrome extension. Capture first, sort later."],["Credit stays attached","Every reference keeps its source and creator, so you always know where it came from."],["Find it by color or words","Search your Vault by palette, or by a few words in Thai or English."]];return "<section class='guest-hero'><div class='guest-hero-top'><span class='guest-hero-brand' data-reveal>A+ Vault</span><h2 data-reveal>Keep every spark in one place.</h2><p data-reveal>A reference library for designers. Save what inspires you, sort it when you are ready, then turn it into moodboards and real projects.</p><div class='guest-hero-actions' data-reveal><button type='button' class='guest-hero-login' data-auth-open>Log in</button><button type='button' class='guest-hero-browse' data-guest-browse>Browse first</button></div><div class='guest-hero-links' data-reveal><a href='/welcome'>Full welcome</a><a href='/extension'>How the extension works</a></div></div><div class='guest-hero-feats'>"+feats.map((f,n)=>"<article class='guest-feat' data-reveal style='--d:"+n*90+"ms'><b>"+(n+1)+"</b><h3>"+f[0]+"</h3><p>"+f[1]+"</p></article>").join("")+"</div><span class='guest-hero-scroll' aria-hidden='true'>Scroll</span></section>"}
function guestRevealTick(){let els=document.querySelectorAll(".guest-hero [data-reveal]:not(.is-in)"),h=window.innerHeight*.92;els.forEach(e=>{if(e.getBoundingClientRect().top<h)e.classList.add("is-in")});return els.length}
let guestRevealBound=false;function bindGuestReveal(){if(!guestRevealBound){guestRevealBound=true;window.addEventListener("scroll",guestRevealTick,{passive:true});window.addEventListener("resize",guestRevealTick)}let n=0,t=setInterval(()=>{guestRevealTick();if(++n>12)clearInterval(t)},250);requestAnimationFrame(guestRevealTick)}
function guestExplainerView(view){let c=GUEST_COPY[view]||GUEST_COPY.vault;if(!((state.discover.items||[]).length)&&!state.discover.loading)setTimeout(()=>loadDiscover(true).then(()=>{if(!state.user&&GUEST_EXPLAIN[state.view])render()}),0);return shell("<div class='workspace guest-workspace"+(state.leftCollapsed?" left-collapsed":"")+" detail-closed"+pageEnterCls()+"'><aside class='rail'>"+sideNav()+"</aside><main class='main guest-main'><section class='guest-explainer'><div class='guest-copy'><span class='guest-eyebrow'>"+esc(c.eyebrow)+"</span><h1>"+c.title+"</h1><p class='guest-th'>"+esc(c.th)+"</p><p class='guest-body'>"+esc(c.body)+"</p><ul class='guest-points'>"+c.points.map(p=>"<li><i aria-hidden='true'></i>"+esc(p)+"</li>").join("")+"</ul><div class='guest-actions'><button type='button' class='guest-cta' data-guest-login='"+escA(view)+"'>"+esc(c.cta)+"</button><button type='button' class='guest-secondary' data-view='discover'>Browse Discover</button></div><p class='guest-note'>Free while in alpha · <a href='/welcome#capture'>See how + Keep works</a></p></div><div class='guest-visual' aria-hidden='true'>"+guestPreviewMarkup(view)+"</div></section>"+guestHowtoMarkup(view,c)+"</main></div>")}
function guestHowtoMarkup(view,c){if(!HOWTO[view])return"";setTimeout(()=>bindHowto(),0);return "<div class='guest-howto-head'><span>How it works</span><h2>Four small steps.</h2></div>"+howtoMarkup(view,guestThumb)+"<section class='guest-closing'><h2>Ready when you are.</h2><p>"+esc(c.th)+"</p><div class='guest-actions'><button type='button' class='guest-cta' data-guest-login='"+escA(view)+"'>"+esc(c.cta)+"</button><button type='button' class='guest-secondary' data-view='discover'>Browse Discover</button></div></section>"}
document.addEventListener("click",e=>{let b=e.target&&e.target.closest?e.target.closest("[data-guest-login]"):null;if(!b)return;e.preventDefault();e.stopPropagation();requireAuth({type:"view",view:b.dataset.guestLogin||"vault"})},true);
document.addEventListener("click",e=>{let b=e.target&&e.target.closest?e.target.closest("[data-guest-browse]"):null;if(!b)return;let r=document.querySelector("[data-discover-results]");if(r)r.scrollIntoView({behavior:"smooth",block:"start"})});
function howtoInfoButton(view){return "<button type='button' class='howto-info' data-howto-open='"+escA(view)+"' title='"+escA(HOWTO_TITLE[view]||"How it works")+"' aria-label='"+escA(HOWTO_TITLE[view]||"How it works")+"'><svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' aria-hidden='true'><circle cx='12' cy='12' r='9'/><path d='M12 11v5'/><circle cx='12' cy='7.8' r='.6' fill='currentColor'/></svg></button>"}
function closeHowto(){let n=document.querySelector("[data-howto-overlay]");if(!n)return false;n.remove();document.documentElement.classList.remove("howto-open");return true}
function openHowto(view){if(!HOWTO[view])return;closeHowto();document.body.insertAdjacentHTML("beforeend","<div class='howto-overlay' data-howto-overlay role='dialog' aria-modal='true' aria-label='"+escA(HOWTO_TITLE[view]||"How it works")+"'><div class='howto-overlay-bar'><strong>"+esc(HOWTO_TITLE[view]||"How it works")+"</strong><button type='button' class='howto-overlay-close' data-howto-close aria-label='Close'>&times;</button></div><div class='howto-overlay-body'>"+howtoMarkup(view,guestThumb)+"<div class='howto-overlay-foot'><button type='button' class='guest-cta' data-howto-close>Got it</button></div></div></div>");document.documentElement.classList.add("howto-open");bindHowto();let b=document.querySelector(".howto-overlay-close");if(b)b.focus({preventScroll:true})}
document.addEventListener("click",e=>{let t=e.target&&e.target.closest?e.target:null;if(!t)return;let o=t.closest("[data-howto-open]");if(o){e.preventDefault();e.stopPropagation();openHowto(o.dataset.howtoOpen);return}if(t.closest("[data-howto-close]")){e.preventDefault();closeHowto()}},true);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&closeHowto()){e.preventDefault();e.stopImmediatePropagation()}},true);
function gridCardKey(el){let o=el.querySelector&&el.querySelector("[data-discover-open]");return o?"d:"+o.dataset.discoverOpen:el.dataset&&el.dataset.sel?"v:"+el.dataset.sel:""}
function flipGrid(change){let reduce=prefersReducedMotion(),els=[...document.querySelectorAll(".discover-card:not(.is-gated),.pin-card")].slice(0,160),before=new Map();if(!reduce)els.forEach(el=>{let k=gridCardKey(el);if(k)before.set(k,el.getBoundingClientRect())});change();if(reduce)return;let after=[...document.querySelectorAll(".discover-card:not(.is-gated),.pin-card")].slice(0,160);after.forEach(el=>{let k=gridCardKey(el),b=k&&before.get(k),a=el.getBoundingClientRect();if(!k||!el.animate)return;if(b&&a.width){let sx=b.width/a.width;el.animate([{transformOrigin:"0 0",transform:"translate("+(b.left-a.left)+"px,"+(b.top-a.top)+"px) scale("+sx+")"},{transformOrigin:"0 0",transform:"none"}],{duration:560,easing:"cubic-bezier(.2,.7,.2,1)"})}else if(a.bottom>0&&a.top<innerHeight){el.animate([{opacity:0,transform:"scale(.92)"},{opacity:1,transform:"none"}],{duration:420,easing:"ease-out"})}})}
function setGridSizeLive(mode){let prev=normalizeLibraryView(state.libraryView);state.libraryView=mode;save(S.libraryView,mode);document.documentElement.dataset.gridSize=mode;document.querySelectorAll(".object-grid").forEach(g=>{g.classList.remove("size-small","size-medium","size-large");g.classList.add("size-"+mode)});if(prev==="details")render()}
document.addEventListener("input",e=>{let r=e.target&&e.target.matches&&e.target.matches("[data-grid-slider]")?e.target:null;if(!r)return;let stop=GRID_STOPS[Number(r.value)]||GRID_STOPS[1];if(normalizeLibraryView(state.libraryView)===stop[0])return;flipGrid(()=>setGridSizeLive(stop[0]));let lbl=document.querySelector("[data-grid-slider-label]");if(lbl)lbl.textContent=stop[1]+" · "+stop[2]+" columns";r.setAttribute("aria-valuetext",stop[1]+", "+stop[2]+" columns")});
function clearTagFilters(){state.filterKeyword="";state.filterHex="";state.filterRights="";state.vaultImageRef=null;state.q="";resetVaultGridLimit();if(state.view==="vault")softRefreshVaultResults();else render()}
function normalizeKeyword(raw){return String(raw||"").trim().replace(/\s+/g," ").slice(0,40)}
function addKeywordToItem(itemId,raw){let i=state.items.find(x=>x.id===itemId);if(!i)return;let tag=normalizeKeyword(raw);if(!tag){toast("Enter a keyword.");return}let analysis=Object.assign({},i.analysis||{}),tags=Array.isArray(analysis.tags)?analysis.tags.map(String):[];if(tags.some(t=>t.toLowerCase()===tag.toLowerCase())){toast("Keyword already added.");return}tags.push(tag);analysis.tags=tags.slice(0,16);patch(itemId,{analysis});toast("Keyword added.");if(!refreshOpenDrawer())render()}
function removeKeywordFromItem(tag,itemId){let id=itemId||(selected()&&selected().id),i=state.items.find(x=>x.id===id);if(!i)return;let needle=String(tag||"").trim().toLowerCase(),analysis=Object.assign({},i.analysis||{}),tags=(Array.isArray(analysis.tags)?analysis.tags:[]).filter(t=>String(t||"").trim().toLowerCase()!==needle);analysis.tags=tags;patch(id,{analysis});if(state.filterKeyword&&state.filterKeyword.toLowerCase()===needle)state.filterKeyword="";toast("Keyword removed.");if(!refreshOpenDrawer())render()}
function colorFamily(c){let x=hexRgb(c),max=Math.max(x.r,x.g,x.b),min=Math.min(x.r,x.g,x.b),light=(x.r+x.g+x.b)/3;if(safeHex(c).toLowerCase()==="#ff4f43"||x.r>220&&x.g<120&&x.b<110)return"coral";if(light<70)return"dark";if(light>218)return"light";if(max-min<38)return"neutral";if(x.r>=x.b&&x.r>=x.g*.85)return"warm";return"cool"}
function selected(){return state.items.find(i=>i.id===state.selected)||filtered()[0]||null}
function project(){return state.projects.find(p=>p.id===state.activeProject)||state.projects[0]||null}
function board(){let p=project();if(!p){return {id:"",name:"Moodboard",objects:[]}}p.boards=p.boards||[];let b=p.boards.find(b=>b.id===state.activeBoard)||p.boards[0];if(!b){b={id:id(),name:"Moodboard",objects:[]};p.boards.push(b);state.activeBoard=b.id;persistProjects()}return b}
function selectedObj(){let b=board();return (b.objects||[]).find(o=>o.id===state.selectedObject)||null}
function patchSel(p){let i=selected();if(i)patch(i.id,p)}function patch(itemId,p){let updated=null;state.items=state.items.map(i=>i.id===itemId?(updated=Object.assign({},i,p)):i);save(S.items,state.items);if(updated)syncRemoteItem(updated,"update")}
function count(){return{total:state.items.length,images:state.items.filter(i=>i.type==="image").length}}
function ensureCoreCols(cols){let list=(Array.isArray(cols)?cols.slice():[]).filter(c=>c.id!=="inbox");let byId=id=>list.find(c=>c.id===id);if(!byId("all"))list.unshift({id:"all",name:"My Vault",system:true});else Object.assign(byId("all"),{name:"My Vault",system:true});return list}
function collectionValue(i){let ids=i.collectionIds||[];return ids.find(id=>state.cols.some(c=>!c.system&&c.id===id))||"all"}
function itemsForCollection(id){if(id==="all")return state.items;return state.items.filter(i=>itemMatchesCollection(i,id))}
function projectContextPanel(p){
  return "<section class='project-context-bar'>"+
    "<button type='button' class='ghost-button project-context-back' data-view='project'>"+icon("expand")+"<span>Back to project</span></button>"+
    "<div class='project-context-copy'>"+
      "<span class='section-label'>Editing moodboard</span>"+
      "<strong>"+esc(p.name)+"</strong>"+
    "</div>"+
  "</section>";
}
function projectItems(p){let ids=new Set();state.items.forEach(i=>{if((i.projectIds||[]).includes(p.id))ids.add(i.id)});(p.boards||[]).forEach(b=>(b.objects||[]).forEach(o=>{if(o.itemId)ids.add(o.itemId)}));return state.items.filter(i=>ids.has(i.id))}
function allBoards(){return allProjectBoards(state.projects)}
function previewColor(o){if(o.kind==="palette"&&(o.colors||[])[0])return safeHex(o.colors[0]);if(o.kind==="text")return "#ffffff";let item=state.items.find(i=>i.id===o.itemId),colors=item&&item.analysis&&item.analysis.colors;return safeHex(colors&&colors[0]||"#ff4f43")}
function typeCounts(items){return{image:items.filter(i=>i.type==="image").length,video:items.filter(i=>i.type==="video").length,link:items.filter(i=>i.type==="link").length,note:items.filter(i=>i.type==="note").length}}
function estimateItemBytes(i){if(i.assetUrl&&i.assetUrl.startsWith("data:"))return Math.round(i.assetUrl.length*.75);if(i.type==="video")return 8*1024*1024;if(i.type==="image")return 360*1024;if(i.type==="link")return 18*1024;return 8*1024}
function storageBreakdown(){let limit=1024*1024*1024,types={image:0,video:0,link:0,note:0};state.items.forEach(i=>{types[i.type]=(types[i.type]||0)+estimateItemBytes(i)});let total=Object.values(types).reduce((a,b)=>a+b,0);return{limit,total,types}}
function formatBytes(v){let n=Number(v)||0;if(n>=1024*1024*1024)return(n/1024/1024/1024).toFixed(2)+" GB";if(n>=1024*1024)return(n/1024/1024).toFixed(1)+" MB";if(n>=1024)return Math.round(n/1024)+" KB";return n+" B"}
function storageRows(s){return["image","video","link","note"].map(t=>{let v=s.types[t]||0,p=s.total?Math.max(2,v/s.total*100):0;return"<div class='storage-row'><span>"+icon(iconForType(t))+" "+esc((L[t]||t)+"s")+"</span><strong>"+formatBytes(v)+"</strong><i><b style='width:"+p.toFixed(2)+"%'></b></i></div>"})}
function appHomeUrl(){return location.origin+"/vault"}
function objectShareUrl(id){return appHomeUrl()+"#object="+encodeURIComponent(id)}
function collectionShareUrl(colId){return appHomeUrl()+"#collection="+encodeURIComponent(colId)}
function shortUrl(u){try{let url=new URL(u),path=url.pathname.replace(/\/$/,""),tail=path.split("/").filter(Boolean).slice(-2).join("/");let label=url.hostname.replace(/^www\./,"")+(tail?"/"+tail:"");return label.length>58?label.slice(0,55)+"...":label}catch(e){let s=String(u||"");return s.length>58?s.slice(0,55)+"...":s}}
function projectLabel(i){let pid=(i.projectIds||[])[0];let p=state.projects&&state.projects.find(p=>p.id===pid);return p?p.name:""}
function safeHex(c){return /^#[0-9a-f]{6}$/i.test(c)?c:"#e7e9ec"}
function hexRgb(c){let h=safeHex(c).slice(1);return{r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)}}
function rgbText(c){let x=hexRgb(c);return "rgb("+x.r+", "+x.g+", "+x.b+")"}
function cmykText(c){let x=hexRgb(c),r=x.r/255,g=x.g/255,b=x.b/255,k=1-Math.max(r,g,b);if(k>=.999)return "0, 0, 0, 100";let cc=(1-r-k)/(1-k),m=(1-g-k)/(1-k),y=(1-b-k)/(1-k);return [cc,m,y,k].map(v=>Math.round(v*100)).join(", ")}
function pantoneText(c){let x=hexRgb(c),set=[["PANTONE 1788 C","#ff4f43"],["PANTONE Black 6 C","#151719"],["PANTONE Cool Gray 4 C","#b8bec4"],["PANTONE Warm Gray 2 C","#d6c7b7"],["PANTONE 7522 C","#c56b4e"],["PANTONE 5575 C","#9aa5a7"],["PANTONE 7499 C","#f8f6f2"]];let best=set[0],bd=1e9;set.forEach(p=>{let y=hexRgb(p[1]),d=(x.r-y.r)**2+(x.g-y.g)**2+(x.b-y.b)**2;if(d<bd){bd=d;best=p}});return best[0]}
function colorDetails(colors){let list=(colors||[]).map(safeHex);if(!list.length)return "<div class='ocr-box'>No colors detected yet.</div>";let strip="<div class='detail-color-strip'>"+list.map(c=>"<button type='button' class='detail-color-strip-swatch' data-filter-color='"+c+"' style='background:"+c+"' title='Filter by "+c+"' aria-label='Filter by color "+c+"'></button>").join("")+"</div>";let rows=list.map(c=>"<div class='detail-color-row'><button type='button' class='detail-color-swatch' data-filter-color='"+c+"' style='background:"+c+"' title='See objects with this color' aria-label='Filter by color "+c+"'></button><div><button type='button' data-copy-color='"+c+"'><strong>"+c+"</strong><span>HEX</span></button><button type='button' data-copy-color='"+rgbText(c)+"'><strong>"+rgbText(c)+"</strong><span>RGB</span></button><button type='button' data-copy-color='cmyk("+cmykText(c)+")'><strong>"+cmykText(c)+"</strong><span>CMYK</span></button><button type='button' data-copy-color='"+pantoneText(c)+"'><strong>"+pantoneText(c)+"</strong><span>Pantone approx.</span></button></div></div>").join("");return strip+"<details class='detail-color-expand'><summary>Color codes</summary><div class='detail-color-list'>"+rows+"</div></details>"}
function copyText(v){copyToast("Copied: "+v);try{if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(v).catch(()=>{})}catch(e){}}
function copyToast(m){let t=document.querySelector(".toast");if(!t){t=document.createElement("div");t.className="toast copy-toast";document.body.appendChild(t)}t.textContent=m;t.classList.add("show");clearTimeout(copyToast.t);copyToast.t=setTimeout(()=>{t.classList.remove("show");if(t.classList.contains("copy-toast"))t.remove()},2200)}
function swatch(c,label){let safe=safeHex(c);return"<span class='swatch' title='"+safe+"' style='background:"+safe+"'></span>"+(label?"<span class='tag'>"+safe+"</span>":"")}function clampRightWidth(v){let n=Number(v)||380;return Math.max(300,Math.min(680,n))}
function persistProjects(){save(S.projects,state.projects);syncRemoteProjects()}
function persistMoodboards(){state.moodboards=normalizeMoodboards(state.moodboards);save(S.moodboards,state.moodboards);syncRemoteMoodboards()}
async function syncRemoteMoodboards(){if(!vaultRemote.enabled||!vaultRemote.hasSession()||!vaultRemote.saveMoodboards)return;try{let updated=await vaultRemote.saveMoodboards(state.moodboards,state.projects,state.items);if(updated&&updated.length){state.moodboards=normalizeMoodboards(updated);save(S.moodboards,state.moodboards)}}catch(err){console.warn("A+ Vault remote moodboard sync failed",err)}}
function activeMoodboard(){return (state.moodboards||[]).find(b=>b.id===state.activeMoodboard)||null}
function upsertMoodboard(board,opts){opts=opts||{};let next=normalizeMoodboard(Object.assign({},board,{updatedAt:Date.now(),version:(board.version||1)+(opts.bumpVersion===false?0:1)}));state.moodboards=(state.moodboards||[]).filter(b=>b.id!==next.id).concat(next);state.activeMoodboard=next.id;return next}
function ensureMoodboardAutosave(){if(moodboardAutosave)return;moodboardAutosave=createMoodboardAutosave({debounceMs:700,saveLocal:(board)=>{upsertMoodboard(board,{bumpVersion:false});save(S.moodboards,state.moodboards)},saveRemote:async(board)=>{if(!vaultRemote.enabled||!vaultRemote.hasSession()||!vaultRemote.saveMoodboards)return;let updated=await vaultRemote.saveMoodboards([board],state.projects,state.items);if(updated&&updated[0]){let merged=normalizeMoodboard(updated[0]);state.moodboards=(state.moodboards||[]).map(b=>b.id===merged.id?merged:b);save(S.moodboards,state.moodboards)}},onStatus:(s)=>{state.moodboardSaveStatus=s;let el=document.querySelector("[data-moodboard-save-status]");if(el){el.dataset.status=s;el.textContent=saveStatusLabel(s)}}})}
function queueMoodboardSave(board){ensureMoodboardAutosave();moodboardAutosave.queue(board);let el=document.querySelector("[data-moodboard-save-status]");if(el){el.dataset.status=moodboardAutosave.getStatus();el.textContent=saveStatusLabel(moodboardAutosave.getStatus())}}
function applyMoodboardSnapshot(snap){if(!snap)return;upsertMoodboard(snap,{bumpVersion:false});save(S.moodboards,state.moodboards);render()}
function mutateActiveMoodboard(mutator,historyType){let board=activeMoodboard();if(!board)return;let before=snapshotBoard(board);let draft=snapshotBoard(board);mutator(draft);draft=normalizeMoodboard(Object.assign({},draft,{updatedAt:Date.now(),version:(board.version||1)+1}));moodboardHistory.push({type:historyType||"edit",before,after:snapshotBoard(draft),mergeKey:historyType==="drag"?draft.id:null});upsertMoodboard(draft,{bumpVersion:false});queueMoodboardSave(draft);render()}
function parseMoodboardRoute(){let path=location.pathname||"";let hash=location.hash||"";let m=path.match(/^\/moodboards\/([^\/]+)\/?$/);if(m){state.view="moodboard-edit";state.activeMoodboard=decodeURIComponent(m[1]);return}if(/^\/moodboards\/?$/.test(path)){state.view="moodboards";return}let boardHash=hash.match(/^#moodboard=([^&]+)/);if(boardHash){state.view="moodboard-edit";state.activeMoodboard=decodeURIComponent(boardHash[1]);return}if(hash==="#moodboards"||hash==="#/moodboards")state.view="moodboards"}
function moodboardAppUrl(boardId){if(boardId)return location.origin+"/vault#moodboard="+encodeURIComponent(boardId);return location.origin+"/vault#moodboards"}
function openMoodboard(boardId){preloadMoodboardEditor();state.activeMoodboard=boardId;state.view="moodboard-edit";state.selectedObject=null;state.selectedObjectIds=[];state.moodboardTool="select";state.moodboardConnectFrom=null;moodboardHistory.clear();history.replaceState(null,"",moodboardAppUrl(boardId));render()}
function openCreateMoodboardDialog(itemIds){let ids=Array.isArray(itemIds)?itemIds:(state.selectedIds||[]).slice();if(ids.length&&(ids.length<MOODBOARD_SELECT_MIN||ids.length>MOODBOARD_SELECT_MAX)){toast("Select "+MOODBOARD_SELECT_MIN+"–"+MOODBOARD_SELECT_MAX+" references.");return}state.dialog={type:"create-moodboard",itemIds:ids};render()}
function submitCreateMoodboard(name,preset){let d=state.dialog||{},ids=d.itemIds||[],renameId=d.renameId||"";state.dialog=null;if(renameId){state.moodboards=(state.moodboards||[]).map(b=>b.id===renameId?Object.assign({},b,{name:name.slice(0,120)||b.name,updatedAt:Date.now()}):b);persistMoodboards();toast("Moodboard renamed.");render();return}let board;if(ids.length){board=createMoodboardFromSelection({name,itemIds:ids,items:state.items,pack:packSmartGrid,gridPreset:preset||"balanced"});trackMoodboardEvent("moodboard_created_from_selection",{count:ids.length})}else{board=createBlankMoodboard(name);trackMoodboardEvent("moodboard_created",{blank:true})}state.moodboards=(state.moodboards||[]).concat(board);state.selectedIds=[];persistMoodboards();openMoodboard(board.id)}
function openBulkNewCollectionDialog(){let ids=(state.selectedIds||[]).slice();if(!ids.length)return;openTextDialog({title:"New collection",label:"Collection name",value:"",confirmText:"Create & add",onSubmit:name=>createCollectionFromSelected(name,ids)})}
function createCollectionFromSelected(name,itemIds){let trimmed=(name||"").trim();if(!trimmed)return;let ids=Array.isArray(itemIds)?itemIds:(state.selectedIds||[]).slice();if(!ids.length)return;let c=createCollection(trimmed,{keepView:true,skipToast:true});ids.forEach(id=>{let item=state.items.find(i=>i.id===id);if(!item)return;let set=new Set(cleanCollectionIds(item.collectionIds));set.add("all");set.add(c.id);patch(id,{collectionIds:Array.from(set)})});state.selectedIds=[];state.col=c.id;state.view="vault";toast(ids.length+" object"+(ids.length===1?"":"s")+" added to "+c.name+".");render()}
function openBulkProjectDialog(){let ids=(state.selectedIds||[]).slice();if(!ids.length)return;state.openMenu=null;state.dialog={type:"bulk-project",itemIds:ids};render()}
function addSelectedToProject(projectId){let p=state.projects.find(x=>x.id===projectId),ids=(state.dialog&&state.dialog.itemIds)||(state.selectedIds||[]).slice();if(!p||!ids.length)return;ids.forEach(id=>{let item=state.items.find(i=>i.id===id);if(!item)return;let set=new Set(Array.isArray(item.projectIds)?item.projectIds.map(String):[]);set.add(p.id);patch(id,{projectIds:Array.from(set)})});state.selectedIds=[];state.dialog=null;state.activeProject=p.id;toast(ids.length+" object"+(ids.length===1?"":"s")+" added to "+p.name+".");render()}
function deleteSelectedItems(){let ids=(state.selectedIds||[]).slice();if(!ids.length)return;let deleted=0;ids.forEach(id=>{let i=state.items.find(x=>x.id===id);if(!i)return;syncRemoteDeleteItem(i);state.moodboards=removeItemFromAllBoards(state.moodboards,i.id);state.items=state.items.filter(x=>x.id!==i.id);if(state.selected===i.id)state.selected=null;deleted++});state.selectedIds=[];state.openMenu=null;save(S.items,state.items);persistMoodboards();toast(deleted+" object"+(deleted===1?"":"s")+" deleted.");render()}
function openBulkDeleteDialog(){let n=(state.selectedIds||[]).length;if(!n)return;openConfirmDialog({title:"Delete selected",message:"Delete "+n+" object"+(n===1?"":"s")+" from A+ Vault? They will be removed from the Vault grid and any moodboards.",confirmText:"Delete",danger:true,onConfirm:()=>deleteSelectedItems()})}
function toggleVaultSelect(itemId,opts){opts=opts||{};let ids=new Set(state.selectedIds||[]);if(opts.shift&&state.selected){let list=filtered(),a=list.findIndex(i=>i.id===state.selected),b=list.findIndex(i=>i.id===itemId);if(a>=0&&b>=0){let [lo,hi]=a<b?[a,b]:[b,a];for(let i=lo;i<=hi;i++)ids.add(list[i].id)}}else{if(ids.has(itemId))ids.delete(itemId);else ids.add(itemId)}state.selectedIds=Array.from(ids).slice(0,MOODBOARD_SOFT_LIMIT);state.selected=itemId;if(!softRefreshVaultResults())render()}
function toast(m){state.toast=m;clearTimeout(toast.t);let el=document.querySelector(".toast"),shellEl=document.querySelector(".app-shell");if(el){if(m){el.textContent=m;el.hidden=false}else el.remove()}else if(m&&shellEl){shellEl.insertAdjacentHTML("beforeend","<div class='toast'>"+esc(m)+"</div>")}else if(m){render();return}toast.t=setTimeout(()=>{state.toast="";let t=document.querySelector(".toast");if(t)t.remove()},2600)}
function openSelectedDetail(itemId){if(!itemId)return;let drawerOpen=!!document.querySelector(".drawer.open"),same=state.selected===itemId&&drawerOpen;state.selected=itemId;state.rightCollapsed=false;state.openMenu=null;if(same)return;if(drawerOpen){refreshOpenDrawer({animate:true});return}state.drawerAnimating=true;render();requestAnimationFrame(()=>{requestAnimationFrame(()=>{let drawer=document.querySelector(".drawer"),ws=document.querySelector(".workspace");if(drawer)drawer.classList.add("open");if(ws)ws.classList.remove("detail-closed");let preview=drawer&&drawer.querySelector(".detail-preview");if(preview)primeDetailPreview(preview);clearTimeout(openSelectedDetail.t);openSelectedDetail.t=setTimeout(()=>{state.drawerAnimating=false;if(ws)ws.classList.remove("drawer-animating")},420)})})}
function closeSelectedDetail(){let drawer=document.querySelector(".drawer.open"),ws=document.querySelector(".workspace");if(drawer&&ws&&state.view==="vault"){state.drawerAnimating=true;ws.classList.add("drawer-animating","detail-closing");drawer.classList.remove("open");clearTimeout(closeSelectedDetail.t);closeSelectedDetail.t=setTimeout(()=>{state.selected=null;state.rightCollapsed=false;state.drawerAnimating=false;render()},340);return}state.selected=null;state.rightCollapsed=false;render()}
function primeDetailPreview(preview){if(!preview)return;preview.classList.add("is-loading");let mediaEl=preview.querySelector("img,video");const ready=()=>{preview.classList.remove("is-loading");preview.classList.add("is-ready");preview.classList.remove("detail-preview-enter")};if(mediaEl&&mediaEl.tagName==="IMG"&&!mediaEl.complete){mediaEl.addEventListener("load",ready,{once:true});mediaEl.addEventListener("error",ready,{once:true});return}if(mediaEl&&mediaEl.tagName==="VIDEO"){if(mediaEl.readyState>=2){ready();return}mediaEl.addEventListener("loadeddata",ready,{once:true});mediaEl.addEventListener("error",ready,{once:true});return}requestAnimationFrame(()=>requestAnimationFrame(ready))}
function refreshOpenDrawer(opts){opts=opts||{};let drawer=document.querySelector(".drawer"),i=state.items.find(x=>x.id===state.selected);if(!drawer||!i)return false;let scroll=drawer.querySelector(".drawer-inner"),top=scroll?scroll.scrollTop:0,preview=drawer.querySelector(".detail-preview"),animate=!!opts.animate&&!!preview&&!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);const swap=()=>{drawer.classList.add("open");drawer.innerHTML=resizeHandle()+detail(i);let next=drawer.querySelector(".drawer-inner");if(next)next.scrollTop=top;let np=drawer.querySelector(".detail-preview");if(np){if(animate)np.classList.add("detail-preview-enter");primeDetailPreview(np)}bindDrawerControls()};if(animate){preview.classList.add("detail-preview-exit");clearTimeout(refreshOpenDrawer._t);refreshOpenDrawer._t=setTimeout(swap,150)}else swap();return true}
function bindDrawerControls(){document.querySelectorAll("[data-add-keyword-form]").forEach(form=>form.onsubmit=e=>{e.preventDefault();e.stopPropagation();let fd=new FormData(form),itemId=form.dataset.addKeywordForm,value=(fd.get("keyword")||"").toString();addKeywordToItem(itemId,value);let input=form.querySelector("input[name='keyword']");if(input)input.value=""});document.querySelectorAll("[data-close-detail]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();closeSelectedDetail()});document.querySelectorAll("[data-resize-right]").forEach(h=>h.onpointerdown=startRightResize);document.querySelectorAll("[data-adddetail]").forEach(b=>b.onclick=()=>{let i=selected();if(!i)return;addItemToBoard(i.id,160,140);state.view="board";toast("Object added to moodboard.");render()});document.querySelectorAll("[data-keep-detail]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();state.collectionPicker=state.collectionPicker===b.dataset.keepDetail?null:b.dataset.keepDetail;refreshOpenDrawer()});document.querySelectorAll(".drawer [data-open-moodboard]").forEach(b=>b.onclick=()=>openMoodboard(b.dataset.openMoodboard));document.querySelectorAll(".drawer [data-openboard]").forEach(b=>b.onclick=()=>{let ref=String(b.dataset.openboard||"").split(":");if(ref.length<2)return;state.activeProject=ref[0];state.activeBoard=ref[1];state.view="board";render()});let title=document.querySelector("[data-title]");if(title)title.onchange=e=>patchSel({title:e.target.value.trim()||"Untitled reference"});let note=document.querySelector("[data-note]");if(note)note.onchange=e=>patchSel({note:e.target.value});let itemcol=document.querySelector("[data-itemcol]");if(itemcol)itemcol.onchange=e=>{patchSel({collectionIds:e.target.value?[e.target.value]:["all"]});refreshOpenDrawer()};let itemproject=document.querySelector("[data-itemproject]");if(itemproject)itemproject.onchange=e=>{patchSel({projectIds:e.target.value?[e.target.value]:[]});refreshOpenDrawer()};let ai=document.querySelector("[data-ai]");if(ai)ai.onclick=()=>{let i=selected();if(!i)return;patch(i.id,{status:"processing"});refreshOpenDrawer();setTimeout(()=>{let latest=state.items.find(x=>x.id===i.id);patch(i.id,{status:"ready",analysis:analyze(latest,latest.analysis&&latest.analysis.colors)});toast("AI Lite analysis refreshed.");refreshOpenDrawer()},650)}}
