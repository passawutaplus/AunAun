export const S={user:"aplus-vault-user",items:"aplus-vault-items",cols:"aplus-vault-collections",projects:"aplus-vault-projects",moodboards:"aplus-vault-moodboards",rightWidth:"aplus-vault-right-width",moodboardSourceWidth:"aplus-vault-mb-source-w",moodboardInspectorWidth:"aplus-vault-mb-inspector-w",theme:"aplus-vault-theme",libraryView:"aplus-vault-library-view",captures:"aplus-vault-imported-captures",apiToken:"aplus-vault-api-token"};
export const L={image:"Image",video:"Video",link:"Link",note:"Note"};
export const DEFAULT_COLS=[{id:"all",name:"Vault Library",system:true},{id:"brand",name:"Aplus1 Branding",system:false},{id:"web",name:"WP Catalog",system:false},{id:"campaign",name:"Blacksmith Ads",system:false}];
export function id(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}
export function svg(w,h,b){let raw="<svg xmlns='http://www.w3.org/2000/svg' width='"+w+"' height='"+h+"' viewBox='0 0 "+w+" "+h+"'>"+b+"</svg>";return "data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(raw).replace(/'/g,"%27")}
export const SEED=[
{id:id(),type:"image",title:"Coral dashboard rhythm",note:"A clean app shell reference with warm coral accents and tight utility controls.",sourceUrl:"upload://starter-dashboard.png",assetUrl:svg(820,1080,"<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='#ff4f43'/><stop offset='1' stop-color='#2f3133'/></linearGradient></defs><rect width='820' height='1080' fill='#f6f7f9'/><rect x='80' y='90' width='660' height='880' rx='28' fill='#fff' stroke='#dfe3e7'/><rect x='130' y='150' width='210' height='42' rx='8' fill='#2f3133'/><rect x='130' y='238' width='270' height='420' rx='20' fill='url(#g)'/><rect x='440' y='238' width='230' height='72' rx='14' fill='#eef1f4'/><rect x='440' y='350' width='230' height='220' rx='18' fill='#2f3133'/><circle cx='265' cy='448' r='78' fill='#fff'/><path d='M226 448h78M265 409v78' stroke='#ff4f43' stroke-width='27' stroke-linecap='round'/><rect x='130' y='710' width='540' height='42' rx='10' fill='#eef1f4'/><rect x='130' y='780' width='390' height='42' rx='10' fill='#eef1f4'/>"),collectionIds:["brand"],status:"ready",analysis:{tags:["app shell","coral","premium","dashboard"],colors:["#ff4f43","#2f3133","#ffffff","#f6f7f9"],ocrText:"A+ visual system reference",summary:"A polished product UI reference with Aplus coral contrast."}},
{id:id(),type:"image",title:"Quiet material board",note:"Soft neutral material palette for premium interiors and brand textures.",sourceUrl:"upload://material-board.png",assetUrl:svg(760,620,"<rect width='760' height='620' fill='#ece7df'/><rect x='58' y='68' width='270' height='480' rx='22' fill='#d6c7b7'/><rect x='364' y='68' width='338' height='212' rx='22' fill='#f8f6f2'/><rect x='364' y='316' width='152' height='232' rx='20' fill='#9aa5a7'/><rect x='550' y='316' width='152' height='232' rx='20' fill='#c56b4e'/><path d='M88 112c92 22 145 102 204 178' fill='none' stroke='#fff' stroke-width='18' opacity='.62'/><text x='86' y='514' fill='#2f3133' font-size='36' font-family='Arial' font-weight='700'>material mood</text>"),collectionIds:["brand"],status:"ready",analysis:{tags:["materials","interior","premium"],colors:["#d6c7b7","#f8f6f2","#9aa5a7","#c56b4e"],ocrText:"material mood",summary:"A tactile board for warm premium material direction."}},
{id:id(),type:"image",title:"Pattern system study",note:"Graphic repeat pattern with one coral signal point for visual identity work.",sourceUrl:"upload://pattern-system.png",assetUrl:svg(680,900,"<rect width='680' height='900' fill='#f7f8fa'/><g fill='none' stroke='#9ca2a8' stroke-width='9' stroke-linecap='round'><path d='M96 88c42 58 92 58 134 0'/><path d='M96 198c42 58 92 58 134 0'/><path d='M96 308c42 58 92 58 134 0'/><path d='M278 88c42 58 92 58 134 0'/><path d='M278 198c42 58 92 58 134 0'/><path d='M278 308c42 58 92 58 134 0'/><path d='M460 88c42 58 92 58 134 0'/><path d='M460 198c42 58 92 58 134 0'/><path d='M460 308c42 58 92 58 134 0'/></g><path d='M323 700c42 58 92 58 134 0' fill='none' stroke='#ff4f43' stroke-width='12' stroke-linecap='round'/>"),collectionIds:["brand"],status:"ready",analysis:{tags:["pattern","identity","signal"],colors:["#f7f8fa","#9ca2a8","#ff4f43"],ocrText:"No text detected",summary:"A repeat pattern study with one Aplus signal accent."}},
{id:id(),type:"link",title:"Launch page reference",note:"Useful source for above-the-fold balance, strong product promise, and restrained CTA hierarchy.",sourceUrl:"https://example.com/launch-reference",assetUrl:"",collectionIds:["web"],status:"ready",analysis:{tags:["landing page","composition","reference"],colors:["#ffffff","#17191b","#e7e9ec","#ff4f43"],ocrText:"Metadata preview only in MVP",summary:"A saved URL ready for metadata extraction in the API phase."}},
{id:id(),type:"image",title:"Corkboard campaign feel",note:"Layered campaign board with handmade energy and polished art direction.",sourceUrl:"upload://corkboard-campaign.png",assetUrl:svg(720,780,"<rect width='720' height='780' fill='#7a4c2c'/><rect x='52' y='60' width='616' height='650' rx='20' fill='#c58a52'/><rect x='96' y='106' width='220' height='170' rx='8' fill='#e9dfd3'/><rect x='360' y='106' width='210' height='240' rx='8' fill='#263238'/><rect x='118' y='330' width='186' height='260' rx='10' fill='#2e8b73'/><rect x='354' y='398' width='242' height='170' rx='10' fill='#f4eee9'/><circle cx='190' cy='104' r='16' fill='#ff4f43'/><circle cx='482' cy='106' r='16' fill='#ff4f43'/><text x='108' y='664' fill='#3b2416' font-size='52' font-family='Arial' font-weight='800'>CORKBOARD</text>"),collectionIds:["campaign"],status:"ready",analysis:{tags:["campaign","board","handmade"],colors:["#c58a52","#2e8b73","#263238","#ff4f43"],ocrText:"CORKBOARD",summary:"A layered board style for campaign ideation."}},
{id:id(),type:"note",title:"Opportunity board thought",note:"Turn strong references into reusable creative assets: mood, layout, source, and client fit.",sourceUrl:"",assetUrl:"",collectionIds:["campaign"],status:"ready",analysis:{tags:["strategy","creative asset","opportunity"],colors:["#2f3133","#ff4f43","#ffffff"],ocrText:"Text note",summary:"A strategic note connecting inspiration to future work."}}
];
function demoItem(items,idx,x,y,w,h){
  let item=Array.isArray(items)&&items[idx];
  if(!item||!item.id)return null;
  return {id:id(),kind:"item",itemId:String(item.id),x,y,w,h};
}
/** Demo projects + moodboards built from current vault objects (by index). */
export function defaultProjects(items){
  items=Array.isArray(items)?items:[];
  if(!items.length)return [];
  let objs=(...list)=>list.filter(Boolean);
  return [
    {
      id:"kitchen",
      name:"Kitchen Redesign",
      description:"Warm material direction for residential interiors.",
      collectionIds:["brand"],
      boards:[{
        id:"warm",
        name:"Warm Minimalism",
        objects:objs(
          {id:id(),kind:"text",text:"Warm\nMinimalism",x:46,y:52,w:210,h:118,color:"#17191b",size:34},
          demoItem(items,1,324,70,280,230),
          demoItem(items,4,640,96,190,206),
          {id:id(),kind:"palette",colors:["#f8f6f2","#d6c7b7","#c56b4e","#2f3133"],x:310,y:388,w:280,h:74}
        )
      }]
    },
    {
      id:"identity",
      name:"Brand Identity",
      description:"Signal system and pattern studies for Aplus branding.",
      collectionIds:["brand"],
      boards:[{
        id:"system",
        name:"Signal System",
        objects:objs(
          {id:id(),kind:"text",text:"Signal\nSystem",x:40,y:40,w:200,h:100,color:"#17191b",size:30},
          demoItem(items,0,280,48,260,340),
          demoItem(items,2,580,80,220,290),
          {id:id(),kind:"palette",colors:["#ff4f43","#2f3133","#ffffff","#f6f7f9"],x:280,y:420,w:300,h:70}
        )
      }]
    },
    {
      id:"studio",
      name:"Studio Website",
      description:"Landing and campaign references for web builds.",
      collectionIds:["web","campaign"],
      boards:[{
        id:"site",
        name:"Landing Direction",
        objects:objs(
          demoItem(items,3,60,60,280,180),
          demoItem(items,4,380,80,240,260),
          demoItem(items,5,660,100,200,160),
          {id:id(),kind:"text",text:"Launch\nfeel",x:60,y:280,w:180,h:90,color:"#17191b",size:28}
        )
      }]
    }
  ];
}
