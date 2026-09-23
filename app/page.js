"use client";
import {useMemo,useState} from "react";
import {commands} from "../data/commands";

const goldenGateSections=["All","Setup","Extract","Replicat","Monitoring","Trails","Troubleshooting","Microservices"];

export default function Home(){
  const [q,setQ]=useState("");
  const [db,setDb]=useState("All");
  const [mainCategory,setMainCategory]=useState("All");
  const [ggSection,setGgSection]=useState("All");

  const categories=useMemo(()=>["All",...new Set(commands.map(x=>x.category))],[]);
  const rows=useMemo(()=>commands.filter(x=>
    (db==="All"||x.db===db)&&
    (mainCategory==="All"||x.category===mainCategory)&&
    (mainCategory!=="GoldenGate"||ggSection==="All"||x.subcategory===ggSection)&&
    ([x.title,x.category,x.subcategory,x.description,x.command].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase()))
  ),[q,db,mainCategory,ggSection]);

  const chooseCategory=(x)=>{setMainCategory(x);if(x!=="GoldenGate")setGgSection("All");};

  return <main>
    <header><div><span className="eyebrow">DBA COMMAND CENTER</span><h1>DBA<span>Forge</span></h1><p>Fast, practical Oracle & PostgreSQL commands and runbooks.</p></div><div className="count">{rows.length}<small> commands</small></div></header>
    <section className="toolbar">
      <input autoFocus placeholder="Search tables, locks, Data Guard, RAC, GoldenGate, replication…" value={q} onChange={e=>setQ(e.target.value)}/>
      <div className="filters">{["All","Oracle","PostgreSQL"].map(x=><button key={x} className={db===x?"active":""} onClick={()=>setDb(x)}>{x}</button>)}</div>
    </section>
    <nav className="categorybar">
      {categories.map(x=><button key={x} className={mainCategory===x?"active":""} onClick={()=>chooseCategory(x)}>{x}</button>)}
    </nav>
    {mainCategory==="GoldenGate"&&<section className="ggpanel">
      <div className="ggtitle"><b>GoldenGate</b><span>Setup · capture · delivery · monitoring · troubleshooting</span></div>
      <div className="subfilters">{goldenGateSections.map(x=><button key={x} className={ggSection===x?"active":""} onClick={()=>setGgSection(x)}>{x}</button>)}</div>
    </section>}
    <section className="grid">{rows.map((x,i)=><article key={i}>
      <div className="meta"><b className={x.db==="Oracle"?"oracle":"pg"}>{x.db}</b><span>{x.category}</span>{x.subcategory&&<span className="subcat">{x.subcategory}</span>}<span className={"risk "+x.risk}>{x.risk}</span></div>
      <h2>{x.title}</h2><p>{x.description}</p>
      <pre><code>{x.command}</code><button onClick={()=>navigator.clipboard.writeText(x.command)}>Copy</button></pre>
      {x.note&&<div className="note">{x.note}</div>}
    </article>)}</section>
  </main>
}