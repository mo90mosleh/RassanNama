export function guideVideo(value:string){
 let url:URL;
 try{url=new URL(value);}catch{return null;}
 if(url.protocol!=='https:'||url.username||url.password)return null;
 if(url.origin==='https://drive.google.com'){
  const id=url.pathname.match(/^\/file\/d\/([\w-]+)(?:\/|$)/)?.[1];
  if(!id)return null;
  const preview=new URL('/file/d/'+id+'/preview',url.origin);
  const resourceKey=url.searchParams.get('resourcekey');
  if(resourceKey)preview.searchParams.set('resourcekey',resourceKey);
  return {url:preview.href,embed:true};
 }
 return /\.(mp4|webm|ogv)$/i.test(url.pathname)?{url:url.href,embed:false}:null;
}

export function VideoPlayer({source,title}:{source:NonNullable<ReturnType<typeof guideVideo>>;title:string}){
 return source.embed ? <>
  <iframe className="power-bi-guide-player" src={source.url} title={title} allow="autoplay; fullscreen" referrerPolicy="strict-origin-when-cross-origin"/>
  <a href={source.url} target="_blank" rel="noopener noreferrer">باز کردن ویدئو در Drive</a>
 </> : <video className="power-bi-guide-player" controls playsInline src={source.url} aria-label={title}/>;
}
