"use client";
import {useMemo,useState} from "react";
import {commands} from "../data/commands";
import {troubleshootingRunbooks} from "../data/troubleshooting";

const goldenGateSections=["All","Setup","Extract","Replicat","Monitoring","Trails","Troubleshooting","Microservices"];

function CopyButton({text}){
  const [copied,setCopied]=useState(false);
  const copy=async()=>{await navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),1200)};
  return <button onClick={copy}>{copied?"Copied":"Copy"}</button>;
}

function Troubleshooting(){
  const [selected,setSelected]=useState(null);
  const runbook=troubleshootingRunbooks.find(x=>x.id===selected);
  if(!runbook) return <section className="troubleshooting">
    <div className="troublehero"><span className="eyebrow">INCIDENT RUNBOOKS</span><h2>Troubleshooting</h2><p>Start with the symptom. DBAForge walks you through diagnosis in a safe order — from observation to recovery.</p></div>
    <div className="troublegrid">{troubleshootingRunbooks.map(x=><button className="troublecard" key={x.id} onClick={()=>setSelected(x.id)}><span className="troubleicon">{x.icon}</span><b>{x.title}</b><small>{x.db}</small><p>{x.summary}</p><span className="openrunbook">Open runbook →</span></button>)}</div>
  </section>;
  return <section className="troubleshooting">
    <button className="back" onClick={()=>setSelected(null)}>← All troubleshooting</button>
    <div className="runbookhead"><div><span className="eyebrow">{runbook.db}</span><h2>{runbook.icon} {runbook.title}</h2><p>{runbook.summary}</p></div><div className="stepcount">{runbook.steps.length}<small> steps</small></div></div>
    <div className="runbooksteps">{runbook.steps.map((s,i)=><article className={s.risk==="danger"?"dangerstep":""} key={i}><div className="stepmeta"><span>STEP {i+1}</span>{s.risk==="danger"&&<b>⚠ HIGH RISK</b>}</div><h3>{s.title}</h3><p>{s.description}</p><pre><code>{s.command}</code><CopyButton text={s.command}/></pre>{s.note&&<div className="warning">{s.note}</div>}</article>)}</div>
  </section>;
}

export default function Home(){
  const [q,setQ]=useState("");
  const [db,setDb]=useState("All");
  const [mainCategory,setMainCategory]=useState("All");
  const [ggSection,setGgSection]=useState("All");
  const categories=useMemo(()=>["All","Troubleshooting",...new Set(commands.map(x=>x.category))],[]);
  const rows=useMemo(()=>commands.filter(x=>(db==="All"||x.db===db)&&(mainCategory==="All"||mainCategory==="Troubleshooting"||x.category===mainCategory)&&(mainCategory!=="GoldenGate"||ggSection==="All"||x.subcategory===ggSection)&&([x.title,x.category,x.subcategory,x.description,x.command].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase()))),[q,db,mainCategory,ggSection]);
  const chooseCategory=(x)=>{setMainCategory(x);if(x!=="GoldenGate")setGgSection("All");};
  return <main>
    <header><div><span className="eyebrow">DBA COMMAND CENTER</span><h1>DBA<span>Forge</span></h1><p>Fast, practical Oracle & PostgreSQL commands and runbooks.</p></div><div className="count">{mainCategory==="Troubleshooting"?troubleshootingRunbooks.length:rows.length}<small> {mainCategory==="Troubleshooting"?"runbooks":"commands"}</small></div></header>
    {mainCategory!=="Troubleshooting"&&<section className="toolbar"><input autoFocus placeholder="Search tables, locks, Data Guard, RAC, GoldenGate, replication…" value={q} onChange={e=>setQ(e.target.value)}/><div className="filters">{["All","Oracle","PostgreSQL"].map(x=><button key={x} className={db===x?"active":""} onClick={()=>setDb(x)}>{x}</button>)}</div></section>}
    <nav className="categorybar">{categories.map(x=><button key={x} className={(mainCategory===x?"active ":"")+(x==="Troubleshooting"?"troubleshootnav":"")} onClick={()=>chooseCategory(x)}>{x==="Troubleshooting"?"⚡ Troubleshooting":x}</button>)}</nav>
    {mainCategory==="Troubleshooting"?<Troubleshooting/>:<>
      {mainCategory==="GoldenGate"&&<section className="ggpanel"><div className="ggtitle"><b>GoldenGate</b><span>Setup · capture · delivery · monitoring · troubleshooting</span></div><div className="subfilters">{goldenGateSections.map(x=><button key={x} className={ggSection===x?"active":""} onClick={()=>setGgSection(x)}>{x}</button>)}</div></section>}
      <section className="grid">{rows.map((x,i)=><article key={i}><div className="meta"><b className={x.db==="Oracle"?"oracle":"pg"}>{x.db}</b><span>{x.category}</span>{x.subcategory&&<span className="subcat">{x.subcategory}</span>}<span className={"risk "+x.risk}>{x.risk}</span></div><h2>{x.title}</h2><p>{x.description}</p><pre><code>{x.command}</code><CopyButton text={x.command}/></pre>{x.note&&<div className="note">{x.note}</div>}</article>)}</section>
    </>}
  </main>;
}