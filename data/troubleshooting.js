export const troubleshootingRunbooks = [
  {
    id:"oracle-slow", icon:"🐌", title:"Oracle database is slow", db:"Oracle",
    summary:"Work from symptoms to waits, sessions and SQL before changing anything.",
    steps:[
      {title:"1. Check active sessions and waits",description:"Start with what sessions are waiting on right now. RAC-aware.",command:"SELECT inst_id,sid,serial#,username,sql_id,event,wait_class,seconds_in_wait\nFROM gv$session\nWHERE type='USER' AND status='ACTIVE'\nORDER BY seconds_in_wait DESC;"},
      {title:"2. Check system wait pressure",description:"Find the wait classes consuming database time.",command:"SELECT wait_class,total_waits,time_waited_micro/1000000 AS seconds\nFROM v$system_wait_class\nWHERE wait_class <> 'Idle'\nORDER BY time_waited_micro DESC;"},
      {title:"3. Find expensive SQL",description:"Identify SQL consuming the most elapsed time and CPU.",command:"SELECT * FROM (\n  SELECT sql_id,executions,elapsed_time/1e6 elapsed_s,cpu_time/1e6 cpu_s,buffer_gets,disk_reads\n  FROM gv$sqlstats\n  ORDER BY elapsed_time DESC\n) WHERE ROWNUM <= 20;"},
      {title:"4. Check blockers",description:"A database can look slow when sessions are actually queued behind locks.",command:"SELECT inst_id,sid,serial#,username,sql_id,event,blocking_instance,blocking_session\nFROM gv$session\nWHERE blocking_session IS NOT NULL;"},
      {title:"5. Check host / instance pressure",description:"Correlate database symptoms with OS CPU, memory and I/O before tuning SQL or parameters.",command:"top\nvmstat 1 10\niostat -xz 1 10",note:"Run OS commands on the database host. On Exadata/RAC, check the affected nodes separately."}
    ]
  },
  {
    id:"blocking", icon:"🔒", title:"Blocking / locks", db:"Oracle + PostgreSQL",
    summary:"Identify the waiter and blocker first. Termination is the last step, not the first.",
    steps:[
      {title:"1. Oracle blocker chain",description:"Show waiting and blocking RAC sessions together.",command:"SELECT w.inst_id waiting_inst,w.sid waiting_sid,w.serial# waiting_serial,\n       b.inst_id blocking_inst,b.sid blocking_sid,b.serial# blocking_serial,\n       b.username blocking_user,b.sql_id blocking_sql_id\nFROM gv$session w\nJOIN gv$session b ON b.inst_id=w.blocking_instance AND b.sid=w.blocking_session\nWHERE w.blocking_session IS NOT NULL;"},
      {title:"2. PostgreSQL blockers",description:"Show blocked backends and the PIDs blocking them.",command:"SELECT pid,usename,now()-query_start AS query_age,\n       pg_blocking_pids(pid) AS blocked_by,query\nFROM pg_stat_activity\nWHERE cardinality(pg_blocking_pids(pid)) > 0;"},
      {title:"3. Inspect the transaction",description:"Before killing anything, identify owner, SQL, age and business impact.",command:"-- Oracle\nSELECT inst_id,sid,serial#,username,status,sql_id,event,last_call_et FROM gv$session WHERE sid=<SID>;\n\n-- PostgreSQL\nSELECT pid,usename,state,xact_start,query_start,wait_event_type,wait_event,query FROM pg_stat_activity WHERE pid=<PID>;"},
      {title:"4. Terminate only after validation",description:"Use only after confirming the blocker and expected rollback/application impact.",risk:"danger",command:"-- Oracle\nALTER SYSTEM KILL SESSION '<SID>,<SERIAL#>,@<INST_ID>' IMMEDIATE;\n\n-- PostgreSQL\nSELECT pg_terminate_backend(<PID>);",note:"DANGER: termination can roll back work, trigger retries and affect application consistency. Never run this just because a session appears in the blocker list."}
    ]
  },
  {
    id:"ogg-lag", icon:"🟠", title:"GoldenGate lag", db:"Oracle / GoldenGate",
    summary:"Locate the lag: capture, trail transport or apply. Do not reposition processes until the cause is known.",
    steps:[
      {title:"1. Get the process overview",description:"Find stopped, abended or lagging groups.",command:"GGSCI> INFO ALL\nGGSCI> INFO ER *\nGGSCI> STATUS ER *"},
      {title:"2. Measure Extract and Replicat lag",description:"Check both ends so you know where latency is accumulating.",command:"GGSCI> LAG EXTRACT <EXT>\nGGSCI> LAG REPLICAT <REP>\nGGSCI> SEND EXTRACT <EXT>, LAG\nGGSCI> SEND REPLICAT <REP>, LAG"},
      {title:"3. Check checkpoints and trail position",description:"Confirm whether processes are advancing and which trail/RBA they are using.",command:"GGSCI> INFO EXTRACT <EXT>, DETAIL\nGGSCI> INFO EXTRACT <EXT>, SHOWCH\nGGSCI> INFO REPLICAT <REP>, DETAIL\nGGSCI> INFO REPLICAT <REP>, SHOWCH"},
      {title:"4. Inspect reports and transactions",description:"Look for database errors, long transactions, mapping failures or repeated retries.",command:"GGSCI> VIEW REPORT <GROUP>\nGGSCI> VIEW GGSEVT\nGGSCI> SEND EXTRACT <EXT>, SHOWTRANS"},
      {title:"5. Check throughput",description:"Use statistics to see whether records are still flowing and which operation dominates.",command:"GGSCI> STATS EXTRACT <EXT>, TOTAL\nGGSCI> STATS REPLICAT <REP>, TOTAL"},
      {title:"6. Reposition only as a recovery action",description:"Changing sequence/RBA can duplicate or skip data.",risk:"danger",command:"GGSCI> ALTER REPLICAT <REP>, EXTSEQNO <seq>, EXTRBA <rba>\nGGSCI> ALTER EXTRACT <EXT>, EXTSEQNO <seq>, EXTRBA <rba>",note:"DANGER: validate trail contents, checkpoint state and recovery plan before repositioning."}
    ]
  },
  {
    id:"rac", icon:"🔴", title:"RAC / cluster problem", db:"Oracle RAC",
    summary:"Check cluster resources, node membership, services, ASM and interconnect symptoms in that order.",
    steps:[
      {title:"1. Cluster resource status",description:"See immediately which resources are offline, intermediate or misplaced.",command:"crsctl stat res -t\ncrsctl check crs\nolsnodes -n -s -t"},
      {title:"2. Database and service status",description:"Confirm instance placement and service availability.",command:"srvctl status database -d <DB_UNIQUE_NAME>\nsrvctl status service -d <DB_UNIQUE_NAME>"},
      {title:"3. ASM status",description:"A storage problem can present as a RAC/database outage.",command:"srvctl status asm\nasmcmd lsdg\nasmcmd lsct"},
      {title:"4. Check global cache waits",description:"Look for RAC contention or interconnect-related wait pressure.",command:"SELECT inst_id,event,total_waits,time_waited_micro/1e6 seconds\nFROM gv$system_event\nWHERE event LIKE 'gc %'\nORDER BY time_waited_micro DESC;"},
      {title:"5. Inspect diagnostics",description:"Use ADRCI for alert/trace evidence before restarting cluster components.",command:"adrci> show homes\nadrci> show alert -tail 200"}
    ]
  },
  {
    id:"dataguard", icon:"🟡", title:"Data Guard lag", db:"Oracle Data Guard",
    summary:"Separate transport lag from apply lag, then check archive destinations, gaps and recovery.",
    steps:[
      {title:"1. Broker overview",description:"Start with role, health and broker-reported lag.",command:"DGMGRL> SHOW CONFIGURATION\nDGMGRL> SHOW DATABASE VERBOSE '<STANDBY>'"},
      {title:"2. Transport and apply lag",description:"Read the standby's current Data Guard metrics.",command:"SELECT name,value,unit,time_computed\nFROM v$dataguard_stats\nWHERE name IN ('transport lag','apply lag','apply finish time');"},
      {title:"3. Check managed recovery",description:"Confirm MRP/RFS processes and their current state.",command:"SELECT process,status,thread#,sequence#,block#\nFROM v$managed_standby\nORDER BY process,thread#;"},
      {title:"4. Look for archive gaps",description:"A gap explains apply lag that cannot advance.",command:"SELECT * FROM v$archive_gap;\nSELECT dest_id,status,error,destination FROM v$archive_dest_status WHERE status <> 'INACTIVE';"},
      {title:"5. Validate with Broker",description:"Use Broker validation before considering role or recovery changes.",command:"DGMGRL> VALIDATE DATABASE VERBOSE '<STANDBY>'\nDGMGRL> SHOW DATABASE '<STANDBY>' STATUSREPORT"}
    ]
  },
  {
    id:"postgres", icon:"🐘", title:"PostgreSQL emergency", db:"PostgreSQL",
    summary:"Check activity, waits, locks, long transactions, replication and vacuum pressure.",
    steps:[
      {title:"1. Active sessions",description:"See running queries, waits and query age.",command:"SELECT pid,usename,datname,state,now()-query_start AS query_age,\n       wait_event_type,wait_event,query\nFROM pg_stat_activity\nWHERE state <> 'idle'\nORDER BY query_start;"},
      {title:"2. Blocking",description:"Find sessions waiting behind another backend.",command:"SELECT pid,usename,pg_blocking_pids(pid) AS blocked_by,query\nFROM pg_stat_activity\nWHERE cardinality(pg_blocking_pids(pid)) > 0;"},
      {title:"3. Long transactions",description:"Long transactions can retain locks and prevent vacuum cleanup.",command:"SELECT pid,usename,now()-xact_start AS xact_age,state,query\nFROM pg_stat_activity\nWHERE xact_start IS NOT NULL\nORDER BY xact_start;"},
      {title:"4. Replication lag",description:"Check connected replicas and replay distance.",command:"SELECT application_name,state,sync_state,\n       pg_wal_lsn_diff(pg_current_wal_lsn(),replay_lsn) AS replay_lag_bytes\nFROM pg_stat_replication;"},
      {title:"5. Vacuum health",description:"Find tables with large dead-tuple counts and stale vacuum activity.",command:"SELECT schemaname,relname,n_live_tup,n_dead_tup,last_autovacuum,autovacuum_count\nFROM pg_stat_user_tables\nORDER BY n_dead_tup DESC\nLIMIT 20;"},
      {title:"6. Terminate a backend only when necessary",description:"Cancel first when possible; terminate only after validating impact.",risk:"danger",command:"SELECT pg_cancel_backend(<PID>);\n-- Last resort:\nSELECT pg_terminate_backend(<PID>);",note:"DANGER: terminating a backend aborts its transaction and may trigger application retries."}
    ]
  }
];
