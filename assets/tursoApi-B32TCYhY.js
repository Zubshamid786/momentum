import{q as a}from"./index-CxntHP25.js";async function I(){await a.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#6366f1',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      due_date TEXT,
      recurrence TEXT DEFAULT 'none',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  
    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `);try{await a.exec("ALTER TABLE tasks ADD COLUMN recurrence TEXT DEFAULT 'none'")}catch{}try{await a.exec("ALTER TABLE tasks ADD COLUMN due_time TEXT")}catch{}try{await a.exec("ALTER TABLE tasks ADD COLUMN notify_before INTEGER DEFAULT 10")}catch{}try{await a.exec("ALTER TABLE tasks ADD COLUMN start_date TEXT")}catch{}try{await a.exec("ALTER TABLE tasks ADD COLUMN icon TEXT DEFAULT ''")}catch{}try{await a.exec("ALTER TABLE tasks ADD COLUMN estimate INTEGER DEFAULT 0")}catch{}try{await a.exec("ALTER TABLE tasks ADD COLUMN start_time TEXT")}catch{}try{await a.exec("ALTER TABLE subtasks ADD COLUMN estimate INTEGER DEFAULT 0")}catch{}try{await a.exec("ALTER TABLE projects ADD COLUMN is_inbox INTEGER DEFAULT 0")}catch{}try{await a.exec("ALTER TABLE time_entries ADD COLUMN work_type TEXT DEFAULT 'deep'")}catch{}await a.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#6366f1'
    );
    CREATE TABLE IF NOT EXISTS task_tags (
      task_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (task_id, tag_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS habit_completions (
      task_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      PRIMARY KEY (task_id, date),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      structure TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      done INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS task_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,        -- the dependent task (blocked until depends_on_id is done)
      depends_on_id INTEGER NOT NULL,  -- must finish before task_id can start
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(task_id, depends_on_id),
      FOREIGN KEY (task_id)       REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (depends_on_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      content TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS time_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      due_date TEXT,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `),await a.exec(`
    CREATE TABLE IF NOT EXISTS daily_intentions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      task_id INTEGER NOT NULL,
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS daily_reviews (
      date TEXT PRIMARY KEY,
      carries_over TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS wigs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      project_id INTEGER,
      target_date TEXT,
      lag_label TEXT DEFAULT 'Tasks completed',
      lead_label TEXT DEFAULT 'Hours logged',
      lead_target REAL DEFAULT 2,
      lead_type TEXT DEFAULT 'hours',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS wig_commitments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wig_id INTEGER,
      week_start TEXT NOT NULL,
      commitment TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (wig_id) REFERENCES wigs(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS weekly_commitments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL UNIQUE,
      commitment TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `),await f()}async function y(){return await a.all(`
    SELECT w.*, p.name AS project_name, p.color AS project_color
    FROM wigs w
    LEFT JOIN projects p ON p.id = w.project_id
    ORDER BY w.created_at DESC
  `)}async function U(t){const e=await a.run(`
    INSERT INTO wigs (title, project_id, target_date, lag_label, lead_label, lead_target, lead_type)
    VALUES (@title, @project_id, @target_date, @lag_label, @lead_label, @lead_target, @lead_type)
  `,{project_id:null,target_date:null,lag_label:"Tasks completed",lead_label:"Hours logged",lead_target:2,lead_type:"hours",...t});return await a.get("SELECT * FROM wigs WHERE id = ?",[e.lastInsertRowid])}async function F(t,e){const i=Object.keys(e).map(E=>`${E} = @${E}`).join(", ");return await a.run(`UPDATE wigs SET ${i}, updated_at = datetime('now') WHERE id = @id`,{...e,id:t}),await a.get("SELECT * FROM wigs WHERE id = ?",[t])}async function M(t){await a.run("DELETE FROM wigs WHERE id = ?",[t])}async function j(){const t=await a.all(`
    SELECT w.*, p.name AS project_name, p.color AS project_color
    FROM wigs w
    LEFT JOIN projects p ON p.id = w.project_id
    WHERE w.status = 'active'
    ORDER BY w.created_at ASC
  `),e=(()=>{const i=new Date,E=new Date(i),o=E.getDay();return E.setDate(E.getDate()-(o===0?6:o-1)),E.toISOString().split("T")[0]})();return await Promise.all(t.map(async i=>{let E=0,o=0;if(i.project_id){const d=await a.get(`
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done
        FROM tasks WHERE project_id = ?
      `,[i.project_id]);o=d.total||0,E=d.done||0}let n=0;if(i.lead_type==="hours"&&i.project_id){const d=await a.get(`
        SELECT COALESCE(SUM(duration), 0) AS total FROM time_entries
        WHERE project_id = ? AND date(start_time) >= ?
      `,[i.project_id,e]);n=parseFloat((d.total/3600).toFixed(2))}else i.lead_type==="tasks"&&i.project_id&&(n=(await a.get(`
        SELECT COUNT(*) AS cnt FROM tasks
        WHERE project_id = ? AND status = 'done' AND date(updated_at) >= ?
      `,[i.project_id,e])).cnt);const r=[];for(let d=5;d>=0;d--){const T=new Date(e);T.setDate(T.getDate()-d*7);const N=new Date(T);N.setDate(N.getDate()+6);const l=T.toISOString().split("T")[0],S=N.toISOString().split("T")[0];let u=0;if(i.lead_type==="hours"&&i.project_id){const _=await a.get(`
          SELECT COALESCE(SUM(duration), 0) AS total FROM time_entries
          WHERE project_id = ? AND date(start_time) >= ? AND date(start_time) <= ?
        `,[i.project_id,l,S]);u=parseFloat((_.total/3600).toFixed(2))}else i.lead_type==="tasks"&&i.project_id&&(u=(await a.get(`
          SELECT COUNT(*) AS cnt FROM tasks
          WHERE project_id = ? AND status = 'done' AND date(updated_at) >= ? AND date(updated_at) <= ?
        `,[i.project_id,l,S])).cnt);r.push({week:l,value:u})}const c=await a.get(`
      SELECT commitment FROM wig_commitments WHERE wig_id = ? AND week_start = ?
    `,[i.id,e]);return{...i,lagCurrent:E,lagTotal:o,lagPct:o>0?Math.round(E/o*100):0,leadActual:n,leadTarget:i.lead_target,weekStart:e,commitment:(c==null?void 0:c.commitment)||"",history:r}}))}async function H(t,e,i){await a.run(`
    INSERT INTO wig_commitments (wig_id, week_start, commitment)
    VALUES (?, ?, ?)
    ON CONFLICT DO UPDATE SET commitment = excluded.commitment
  `,[t,e,i])}async function W(t){return await a.get("SELECT * FROM weekly_commitments WHERE week_start = ?",[t])||null}async function b(t,e){await a.run(`
    INSERT INTO weekly_commitments (week_start, commitment) VALUES (?, ?)
    ON CONFLICT(week_start) DO UPDATE SET commitment = excluded.commitment
  `,[t,e])}async function f(){await a.get("SELECT id FROM projects WHERE is_inbox = 1")||await a.run("INSERT INTO projects (name, color, status, is_inbox) VALUES ('Inbox', '#6366f1', 'active', 1)");try{(await a.all("PRAGMA table_info(time_blocks)")).map(i=>i.name).includes("task_id")||await a.run("ALTER TABLE time_blocks ADD COLUMN task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL")}catch{}}async function Y(){return await a.all(`
    SELECT p.*,
      COUNT(DISTINCT t.id) AS task_count,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS completed_tasks,
      COALESCE(SUM(te.duration), 0) AS total_time,
      COALESCE(SUM(CASE WHEN date(te.start_time) = date('now') THEN te.duration ELSE 0 END), 0) AS today_time
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    LEFT JOIN time_entries te ON te.project_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `)}async function B(t){const e=await a.run("INSERT INTO projects (name, description, color, status) VALUES (@name, @description, @color, @status)",t);return await a.get("SELECT * FROM projects WHERE id = ?",[e.lastInsertRowid])}async function v(t,e){const i=Object.keys(e).map(E=>`${E} = @${E}`).join(", ");return await a.run(`UPDATE projects SET ${i}, updated_at = datetime('now') WHERE id = @id`,{...e,id:t}),await a.get("SELECT * FROM projects WHERE id = ?",[t])}async function h(t){return await a.run("DELETE FROM projects WHERE id = ?",[t]),{success:!0}}async function P(t){return await a.all(`
    SELECT t.*,
      COALESCE(SUM(te.duration), 0) AS total_time,
      COALESCE(SUM(CASE WHEN date(te.start_time) = date('now') THEN te.duration ELSE 0 END), 0) AS today_time,
      (SELECT COUNT(*) FROM comments c WHERE c.task_id = t.id) AS comment_count,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) AS subtask_count,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.done = 1) AS subtask_done
    FROM tasks t
    LEFT JOIN time_entries te ON te.task_id = t.id
    WHERE t.project_id = ?
    GROUP BY t.id
    ORDER BY
      COALESCE(t.start_date, t.due_date, '9999-12-31') ASC,
      CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
      t.created_at ASC
  `,[t])}async function D(t){return await a.get(`
    SELECT t.*, p.name AS project_name, p.color AS project_color,
      COALESCE(SUM(te.duration), 0) AS total_time
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN time_entries te ON te.task_id = t.id
    WHERE t.id = ?
    GROUP BY t.id
  `,[t])}async function X(t,e){if(!t)return null;const i=new Date(t+"T12:00:00");if(e==="daily")i.setDate(i.getDate()+1);else if(e==="weekly")i.setDate(i.getDate()+7);else if(e==="monthly")i.setMonth(i.getMonth()+1);else return null;return i.toISOString().split("T")[0]}async function G(t){const e=await a.run(`
    INSERT INTO tasks
      (project_id, title, description, status, priority,
       due_date, due_time, start_date, start_time,
       recurrence, notify_before, icon, estimate)
    VALUES
      (@project_id, @title, @description, @status, @priority,
       @due_date, @due_time, @start_date, @start_time,
       @recurrence, @notify_before, @icon, @estimate)
  `,{recurrence:"none",notify_before:10,icon:"",estimate:0,due_time:null,start_date:null,start_time:null,...t});return D(e.lastInsertRowid)}async function J(t,e){const i=await a.get("SELECT * FROM tasks WHERE id = ?",[t]),E=Object.keys(e).map(o=>`${o} = @${o}`).join(", ");if(await a.run(`UPDATE tasks SET ${E}, updated_at = datetime('now') WHERE id = @id`,{...e,id:t}),e.status==="done"&&(i!=null&&i.recurrence)&&i.recurrence!=="none"){const o=X(i.due_date,i.recurrence);o&&(await a.get("SELECT id FROM tasks WHERE project_id=? AND title=? AND recurrence=? AND status!='done' AND due_date>=?",[i.project_id,i.title,i.recurrence,o])||await a.run(`
          INSERT INTO tasks
            (project_id, title, description, status, priority, due_date, due_time,
             recurrence, notify_before, start_date, icon, estimate)
          VALUES (?, ?, ?, 'todo', ?, ?, ?, ?, ?, NULL, ?, ?)
        `,[i.project_id,i.title,i.description||"",i.priority,o,i.due_time||null,i.recurrence,i.notify_before??10,i.icon||"",i.estimate||0]))}return D(t)}async function $(t){return await a.run("DELETE FROM tasks WHERE id = ?",[t]),{success:!0}}async function x(t={}){let e=[];const i={};t.taskId&&(e.push("te.task_id = @taskId"),i.taskId=t.taskId),t.projectId&&(e.push("te.project_id = @projectId"),i.projectId=t.projectId),t.date&&(e.push("date(te.start_time) = @date"),i.date=t.date),t.from&&(e.push("date(te.start_time) >= @from"),i.from=t.from),t.to&&(e.push("date(te.start_time) <= @to"),i.to=t.to);const E=e.length?`WHERE ${e.join(" AND ")}`:"";return await a.all(`
    SELECT te.*, t.title AS task_title, p.name AS project_name, p.color AS project_color
    FROM time_entries te
    JOIN tasks t ON t.id = te.task_id
    JOIN projects p ON p.id = te.project_id
    ${E}
    ORDER BY te.start_time DESC
  `,i)}async function K(){return await a.get(`
    SELECT te.*, t.title AS task_title, p.name AS project_name, p.color AS project_color
    FROM time_entries te
    JOIN tasks t ON t.id = te.task_id
    JOIN projects p ON p.id = te.project_id
    WHERE te.end_time IS NULL
    ORDER BY te.start_time DESC LIMIT 1
  `)}async function V(t){const e=await a.run(`
    INSERT INTO time_entries (task_id, project_id, start_time, end_time, duration, notes)
    VALUES (@task_id, @project_id, @start_time, @end_time, @duration, @notes)
  `,{end_time:null,duration:0,notes:"",...t});return await a.get("SELECT * FROM time_entries WHERE id = ?",[e.lastInsertRowid])}async function Q(t,e){const i=Object.keys(e).map(E=>`${E} = @${E}`).join(", ");return await a.run(`UPDATE time_entries SET ${i} WHERE id = @id`,{...e,id:t}),await a.get("SELECT * FROM time_entries WHERE id = ?",[t])}async function q(t,e,i){return await a.run("UPDATE time_entries SET end_time = ?, duration = ? WHERE id = ?",[e,i,t]),await a.get("SELECT * FROM time_entries WHERE id = ?",[t])}async function Z(t){return await a.run("DELETE FROM time_entries WHERE id = ?",[t]),{success:!0}}async function z(t){return await a.all("SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC",[t])}async function tt(t){const e=await a.run("INSERT INTO comments (task_id, content) VALUES (@task_id, @content)",t);return await a.get("SELECT * FROM comments WHERE id = ?",[e.lastInsertRowid])}async function et(t,e){return await a.run("UPDATE comments SET content = @content, updated_at = datetime('now') WHERE id = @id",{...e,id:t}),await a.get("SELECT * FROM comments WHERE id = ?",[t])}async function at(t){return await a.run("DELETE FROM comments WHERE id = ?",[t]),{success:!0}}async function it(){return await a.all(`
    SELECT t.*, p.name AS project_name, p.color AS project_color
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.status != 'done'
      AND t.due_date IS NOT NULL
      AND date(t.due_date) < date('now')
      AND p.status = 'active'
    ORDER BY t.due_date ASC
  `)}async function st(t=0){const i=new Date(Date.now()+t*6e4).toISOString().split("T")[0],E=new Date(Date.now()+t*6e4-6*864e5).toISOString().split("T")[0],o=i.slice(0,7),n=`datetime(start_time,'${t>=0?"+":""}${t} minutes')`,r=(await a.get(`SELECT COALESCE(SUM(duration),0) AS value FROM time_entries WHERE date(${n})=?`,[i])).value,c=(await a.get(`SELECT COALESCE(SUM(duration),0) AS value FROM time_entries WHERE date(${n})>=?`,[E])).value,d=(await a.get(`SELECT COALESCE(SUM(duration),0) AS value FROM time_entries WHERE strftime('%Y-%m',${n})=?`,[o])).value,T=(await a.get("SELECT COUNT(*) AS value FROM tasks WHERE status='done'")).value,N=(await a.get("SELECT COUNT(*) AS value FROM tasks WHERE status='in_progress'")).value,l=(await a.get("SELECT COUNT(*) AS value FROM projects WHERE status='active'")).value,S=await a.all(`
    SELECT te.*, t.title AS task_title, p.name AS project_name, p.color AS project_color
    FROM time_entries te JOIN tasks t ON t.id=te.task_id JOIN projects p ON p.id=te.project_id
    WHERE te.end_time IS NOT NULL ORDER BY te.start_time DESC LIMIT 8
  `),u=await a.all(`
    SELECT date(${n}) AS day, COALESCE(SUM(duration),0) AS total
    FROM time_entries WHERE date(${n})>=?
    GROUP BY date(${n}) ORDER BY day ASC
  `,[E]),_=await a.all(`
    SELECT t.*, p.name AS project_name, p.color AS project_color, COALESCE(SUM(te.duration),0) AS total_time
    FROM tasks t JOIN projects p ON p.id=t.project_id LEFT JOIN time_entries te ON te.task_id=t.id
    WHERE t.status!='done' AND p.status='active'
    GROUP BY t.id
    ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, t.due_date ASC NULLS LAST
    LIMIT 6
  `);return{todayTime:r,weekTime:c,monthTime:d,tasksCompleted:T,tasksInProgress:N,activeProjects:l,recentEntries:S,weeklyHours:u,upcomingTasks:_}}async function Et(t={}){const{from:e,to:i,projectId:E}=t,o=E?"AND te.project_id = @projectId":"",n={from:e,to:i,projectId:E},r=await a.all(`
    SELECT te.*, t.title AS task_title, p.name AS project_name, p.color AS project_color
    FROM time_entries te JOIN tasks t ON t.id=te.task_id JOIN projects p ON p.id=te.project_id
    WHERE te.end_time IS NOT NULL AND date(te.start_time)>=@from AND date(te.start_time)<=@to ${o}
    ORDER BY te.start_time DESC
  `,n),c=await a.all(`
    SELECT p.id, p.name, p.color, COALESCE(SUM(te.duration),0) AS total
    FROM time_entries te JOIN projects p ON p.id=te.project_id
    WHERE te.end_time IS NOT NULL AND date(te.start_time)>=@from AND date(te.start_time)<=@to ${o}
    GROUP BY p.id ORDER BY total DESC
  `,n),d=await a.all(`
    SELECT date(te.start_time) AS day, COALESCE(SUM(te.duration),0) AS total
    FROM time_entries te
    WHERE te.end_time IS NOT NULL AND date(te.start_time)>=@from AND date(te.start_time)<=@to ${o}
    GROUP BY date(te.start_time) ORDER BY day ASC
  `,n),T=r.reduce((l,S)=>l+S.duration,0),N=(await a.get(`
    SELECT COUNT(DISTINCT t.id) AS value FROM tasks t JOIN time_entries te ON te.task_id=t.id
    WHERE t.status='done' AND date(te.start_time)>=@from AND date(te.start_time)<=@to ${o}
  `,n)).value;return{entries:r,byProject:c,byDay:d,totalTime:T,completedTasks:N}}async function ot(){const t=await a.all(`
    SELECT p.id, p.name, p.color, COALESCE(SUM(te.duration), 0) AS total
    FROM time_entries te JOIN projects p ON p.id = te.project_id
    WHERE date(te.start_time) = date('now') AND te.end_time IS NOT NULL
    GROUP BY p.id ORDER BY total DESC
  `),e=await a.all(`
    SELECT t.id, t.title, p.name AS project_name, p.color AS project_color,
      COALESCE(SUM(te.duration), 0) AS total
    FROM time_entries te JOIN tasks t ON t.id = te.task_id JOIN projects p ON p.id = te.project_id
    WHERE date(te.start_time) = date('now') AND te.end_time IS NOT NULL
    GROUP BY t.id ORDER BY total DESC
  `);return{byProject:t,byTask:e}}async function nt(){const t=await a.all(`
    SELECT p.id, p.name, p.color, COALESCE(SUM(te.duration), 0) AS total
    FROM time_entries te JOIN projects p ON p.id = te.project_id
    WHERE strftime('%Y-%m', te.start_time) = strftime('%Y-%m', 'now') AND te.end_time IS NOT NULL
    GROUP BY p.id ORDER BY total DESC
  `),e=await a.all(`
    SELECT t.id, t.title, p.name AS project_name, p.color AS project_color,
      COALESCE(SUM(te.duration), 0) AS total
    FROM time_entries te JOIN tasks t ON t.id = te.task_id JOIN projects p ON p.id = te.project_id
    WHERE strftime('%Y-%m', te.start_time) = strftime('%Y-%m', 'now') AND te.end_time IS NOT NULL
    GROUP BY t.id ORDER BY total DESC
  `),i=await a.all(`
    SELECT date(te.start_time) AS day, COALESCE(SUM(te.duration), 0) AS total
    FROM time_entries te
    WHERE strftime('%Y-%m', te.start_time) = strftime('%Y-%m', 'now') AND te.end_time IS NOT NULL
    GROUP BY date(te.start_time) ORDER BY day ASC
  `);return{byProject:t,byTask:e,byDay:i}}async function rt(){return await a.all(`
    SELECT t.*, p.name AS project_name, p.color AS project_color
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.status = 'done'
    ORDER BY t.updated_at DESC
  `)}async function dt({from:t,to:e,tzOffset:i=0}){const E=`datetime(start_time, '${i>=0?"+":""}${i} minutes')`;return await a.all(`
    SELECT date(${E}) AS day, COALESCE(SUM(duration), 0) AS total
    FROM time_entries WHERE end_time IS NOT NULL
    AND date(${E}) >= ? AND date(${E}) <= ?
    GROUP BY date(${E}) ORDER BY day ASC
  `,[t,e])}async function ct(){return await a.all(`
    SELECT t.*, p.name AS project_name, p.color AS project_color,
      COALESCE(SUM(te.duration), 0) AS total_time
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    LEFT JOIN time_entries te ON te.task_id = t.id
    WHERE p.status = 'active'
    GROUP BY t.id
    ORDER BY t.due_date ASC,
      CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END
  `)}async function Tt(){return await a.all(`
    SELECT t.*, p.name AS project_name, p.color AS project_color
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.status != 'done' AND p.status = 'active'
    ORDER BY
      CASE WHEN t.due_date IS NOT NULL AND t.due_date < date('now') THEN 0 ELSE 1 END,
      CASE WHEN t.due_date = date('now') THEN 0 ELSE 1 END,
      CASE t.status WHEN 'in_progress' THEN 0 WHEN 'blocked' THEN 1 WHEN 'todo' THEN 2 END,
      CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
      t.due_date ASC NULLS LAST
    LIMIT 12
  `)}async function Nt(t){return await a.all(`
    SELECT te.*, t.title AS task_title, t.icon AS task_icon,
      p.name AS project_name, p.color AS project_color
    FROM time_entries te
    JOIN tasks t ON t.id = te.task_id
    JOIN projects p ON p.id = te.project_id
    WHERE date(te.start_time) = ? AND te.end_time IS NOT NULL
    ORDER BY te.start_time ASC
  `,[t])}async function lt(){return await a.all(`
    SELECT t.*, p.name AS project_name
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.status != 'done'
      AND t.due_date IS NOT NULL
      AND t.due_time IS NOT NULL
      AND p.status = 'active'
  `)}async function St(){const t=await a.all(`
    SELECT t.id, t.title, t.icon, t.status, t.priority, t.due_date, t.due_time, t.project_id,
      p.name AS project_name, p.color AS project_color,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) AS subtask_count,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.done = 1) AS subtask_done
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.status != 'done' AND t.due_date < date('now') AND p.status = 'active'
      AND (t.start_date IS NULL OR t.start_date <= date('now'))
    ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
    LIMIT 10
  `),e=await a.all(`
    SELECT t.id, t.title, t.icon, t.status, t.priority, t.due_date, t.due_time, t.project_id,
      p.name AS project_name, p.color AS project_color,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) AS subtask_count,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.done = 1) AS subtask_done
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.status != 'done' AND t.due_date = date('now') AND p.status = 'active'
      AND (t.start_date IS NULL OR t.start_date <= date('now'))
    ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
    LIMIT 10
  `),i=await a.all(`
    SELECT t.id, t.title, t.icon, t.status, t.priority, t.due_time, t.project_id,
      p.name AS project_name, p.color AS project_color,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) AS subtask_count,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.done = 1) AS subtask_done
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.status = 'in_progress' AND p.status = 'active'
      AND (t.start_date IS NULL OR t.start_date <= date('now'))
    ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
    LIMIT 8
  `),E=(await a.get(`
    SELECT COALESCE(SUM(duration), 0) AS value FROM time_entries WHERE date(start_time) = date('now')
  `)).value,o=await a.all(`
    SELECT t.id AS task_id, t.title AS task_title, t.icon,
           p.name AS project_name, p.color AS project_color,
           COALESCE(SUM(te.duration), 0) AS total_time
    FROM time_entries te
    JOIN tasks t ON t.id = te.task_id
    JOIN projects p ON p.id = t.project_id
    WHERE date(te.start_time) = date('now') AND te.duration > 0
    GROUP BY t.id
    ORDER BY total_time DESC
    LIMIT 8
  `),n=await a.all(`
    SELECT t.id, t.title, t.icon, t.updated_at,
           p.name AS project_name, p.color AS project_color
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.status = 'done'
      AND date(t.updated_at) = date('now')
      AND p.status = 'active'
    ORDER BY t.updated_at DESC
    LIMIT 50
  `),r=n.length;return{overdue:t,dueToday:e,inProgress:i,completedToday:r,todayTime:E,todayEntries:o,completedTasks:n}}async function ut(t){const e=`%${t}%`,i=await a.all(`
    SELECT t.id, t.title, t.status, t.priority, t.due_date, t.icon,
      p.id AS project_id, p.name AS project_name, p.color AS project_color
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE (t.title LIKE ? OR t.description LIKE ?) AND p.status = 'active'
    ORDER BY CASE t.status WHEN 'done' THEN 1 ELSE 0 END,
      CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END
    LIMIT 20
  `,[e,e]),E=await a.all(`
    SELECT id, name, color, status, task_count
    FROM (
      SELECT p.id, p.name, p.color, p.status, COUNT(t.id) AS task_count
      FROM projects p LEFT JOIN tasks t ON t.project_id = p.id
      WHERE p.name LIKE ?
      GROUP BY p.id
    ) LIMIT 8
  `,[e]);return{tasks:i,projects:E}}async function _t(){return await a.all("SELECT * FROM tags ORDER BY name ASC")}async function pt(t){return await a.run("INSERT OR IGNORE INTO tags (name, color) VALUES (@name, @color)",t),await a.get("SELECT * FROM tags WHERE name = ?",[t.name])}async function mt(t){return await a.run("DELETE FROM tags WHERE id = ?",[t]),{success:!0}}async function w(t){return await a.all(`
    SELECT tg.* FROM tags tg
    JOIN task_tags tt ON tt.tag_id = tg.id
    WHERE tt.task_id = ?
  `,[t])}async function Rt(t,e){await a.run("DELETE FROM task_tags WHERE task_id = ?",[t]);for(const i of e)await a.run("INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)",[t,i]);return w(t)}async function Ot(){const t=await a.all(`
    SELECT t.id, t.title, t.icon, p.color AS project_color
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.recurrence = 'daily' AND t.status != 'done' AND p.status = 'active'
    ORDER BY t.created_at ASC
  `),e=await a.all(`
    SELECT task_id, date FROM habit_completions
    WHERE date >= date('now', '-13 days')
  `);return{habits:t,completions:e}}async function At(t,e){return await a.get("SELECT 1 FROM habit_completions WHERE task_id = ? AND date = ?",[t,e])?(await a.run("DELETE FROM habit_completions WHERE task_id = ? AND date = ?",[t,e]),{done:!1}):(await a.run("INSERT OR IGNORE INTO habit_completions (task_id, date) VALUES (?, ?)",[t,e]),{done:!0})}async function Lt(){return await a.all("SELECT * FROM templates ORDER BY created_at DESC")}async function Dt(t,e){const i=await a.all(`
    SELECT title, description, priority, icon, estimate, recurrence
    FROM tasks WHERE project_id = ? AND status != 'done'
  `,[t]),E=await a.get("SELECT name, color FROM projects WHERE id = ?",[t]),o=JSON.stringify({project:E,tasks:i}),n=await a.run("INSERT INTO templates (name, structure) VALUES (?, ?)",[e,o]);return await a.get("SELECT * FROM templates WHERE id = ?",[n.lastInsertRowid])}async function Ct(t,e){const i=await a.get("SELECT * FROM templates WHERE id = ?",[t]);if(!i)return null;const{tasks:E}=JSON.parse(i.structure),n=(await a.run(`
    INSERT INTO projects (name, description, color, status)
    VALUES (@name, @description, @color, 'active')
  `,e)).lastInsertRowid;for(const r of E)await a.run(`
      INSERT INTO tasks (project_id, title, description, priority, icon, estimate, recurrence, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'todo')
    `,[n,r.title,r.description||"",r.priority,r.icon||"",r.estimate||0,r.recurrence||"none"]);return await a.get("SELECT * FROM projects WHERE id = ?",[n])}async function kt(t){return await a.run("DELETE FROM templates WHERE id = ?",[t]),{success:!0}}async function wt(t=0){const e=`datetime(start_time,'${t>=0?"+":""}${t} minutes')`,i=new Date(Date.now()+t*6e4),o=(i.getUTCDay()+6)%7,n=new Date(Date.now()+t*6e4-o*864e5),r=n.toISOString().split("T")[0],c=new Date(+n+6*864e5).toISOString().split("T")[0],d=new Date(+n-7*864e5).toISOString().split("T")[0],T=new Date(+n-1*864e5).toISOString().split("T")[0],N=(await a.get(`SELECT COALESCE(SUM(duration),0) AS total FROM time_entries WHERE end_time IS NOT NULL AND date(${e}) >= ? AND date(${e}) <= ?`,[r,c])).total,l=(await a.get(`SELECT COALESCE(SUM(duration),0) AS total FROM time_entries WHERE end_time IS NOT NULL AND date(${e}) >= ? AND date(${e}) <= ?`,[d,T])).total,S=`datetime(t.updated_at,'${t>=0?"+":""}${t} minutes')`,u=await a.all(`
    SELECT t.id, t.title, t.icon, t.priority, p.name AS project_name, p.color AS project_color
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.status = 'done'
      AND date(${S}) >= ?
      AND date(${S}) <= ?
    ORDER BY t.updated_at DESC
  `,[r,c]),_=await a.all(`
    SELECT t.id, t.title, t.icon, t.priority, t.due_date, p.name AS project_name, p.color AS project_color
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.status != 'done' AND t.due_date IS NOT NULL AND t.due_date < ?
    ORDER BY t.due_date ASC LIMIT 10
  `,[i.toISOString().split("T")[0]]),m=await a.all(`
    SELECT p.id, p.name, p.color, COALESCE(SUM(te.duration),0) AS total
    FROM time_entries te JOIN projects p ON p.id = te.project_id
    WHERE te.end_time IS NOT NULL AND date(${e}) >= ? AND date(${e}) <= ?
    GROUP BY p.id ORDER BY total DESC
  `,[r,c]),R=await a.all(`
    SELECT date(${e}) AS day, COALESCE(SUM(duration),0) AS total
    FROM time_entries WHERE end_time IS NOT NULL AND date(${e}) >= ? AND date(${e}) <= ?
    GROUP BY date(${e}) ORDER BY day ASC
  `,[r,c]);return{thisWeekTime:N,lastWeekTime:l,completedTasks:u,carriedOver:_,byProject:m,byDay:R,monday:r,sunday:c}}async function gt(t){return await a.all(`
    SELECT m.*,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = m.project_id AND t.due_date = m.due_date) AS total_tasks,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = m.project_id AND t.due_date = m.due_date AND t.status = 'done') AS done_tasks
    FROM milestones m
    WHERE m.project_id = ?
    ORDER BY m.due_date ASC
  `,[t])}async function It(t){return await a.all("SELECT * FROM subtasks WHERE task_id = ? ORDER BY position, created_at",[t])}async function yt(){return await a.all(`
    SELECT s.*
    FROM subtasks s
    JOIN tasks t ON t.id = s.task_id
    WHERE s.done = 0 AND t.status != 'done'
    ORDER BY s.task_id, s.position, s.created_at
  `)}async function Ut(t){const e=(await a.get("SELECT COALESCE(MAX(position),0)+1 AS n FROM subtasks WHERE task_id = ?",[t.task_id])).n,i=await a.run("INSERT INTO subtasks (task_id, title, position) VALUES (@task_id, @title, @position)",{...t,position:e});return await a.get("SELECT * FROM subtasks WHERE id = ?",[i.lastInsertRowid])}async function Ft(t){return await a.run("UPDATE subtasks SET done = 1 - done WHERE id = ?",[t]),await a.get("SELECT * FROM subtasks WHERE id = ?",[t])}async function Mt(t,e,i){return i!==void 0?await a.run("UPDATE subtasks SET title = ?, estimate = ? WHERE id = ?",[e,i,t]):await a.run("UPDATE subtasks SET title = ? WHERE id = ?",[e,t]),await a.get("SELECT * FROM subtasks WHERE id = ?",[t])}async function jt(t){return await a.run("DELETE FROM subtasks WHERE id = ?",[t]),{success:!0}}const Ht={pomodoro_work_min:"25",pomodoro_break_min:"5",pomodoro_long_break_min:"15",pomodoro_long_after:"4",pomodoro_sound:"1",work_start_hour:"9",default_notify_before:"10",daily_hour_goal:"0",weekly_hour_goal:"0"};async function Wt(){const t=await a.all("SELECT key, value FROM settings"),e={...Ht};return t.forEach(i=>{e[i.key]=i.value}),e}async function bt(t,e){return await a.run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",[t,String(e)]),{key:t,value:String(e)}}async function ft(t){return await a.get("SELECT * FROM notes WHERE date = ?",[t])||{date:t,content:""}}async function Yt(t,e){return await a.run(`
    INSERT INTO notes (date, content, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(date) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at
  `,[t,e]),await a.get("SELECT * FROM notes WHERE date = ?",[t])}async function Bt(t=30){return await a.all(`
    SELECT date, SUBSTR(content, 1, 120) AS preview, updated_at
    FROM notes WHERE content != ''
    ORDER BY date DESC LIMIT ?
  `,[t])}async function vt(t,e){const i=`${t}-${String(e).padStart(2,"0")}-01`,E=`${t}-${String(e).padStart(2,"0")}-31`;return(await a.all(`
    SELECT date FROM notes WHERE content != '' AND date >= ? AND date <= ?
  `,[i,E])).map(o=>o.date)}async function ht(t){return await a.all(`
    SELECT tb.*,
      t.title AS task_title, t.icon AS task_icon,
      p.name AS project_name, p.color AS project_color
    FROM time_blocks tb
    LEFT JOIN tasks t ON t.id = tb.task_id
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE tb.date = ? ORDER BY tb.start_time ASC
  `,[t])}async function Pt(t){const e=await a.run(`
    INSERT INTO time_blocks (date, label, start_time, end_time, task_id)
    VALUES (@date, @label, @start_time, @end_time, @task_id)
  `,{task_id:null,...t});return await a.get(`
    SELECT tb.*,
      t.title AS task_title, t.icon AS task_icon,
      p.name AS project_name, p.color AS project_color
    FROM time_blocks tb
    LEFT JOIN tasks t ON t.id = tb.task_id
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE tb.id = ?
  `,[e.lastInsertRowid])}async function Xt(t,e){return await a.run(`
    UPDATE time_blocks SET start_time = @start_time, end_time = @end_time WHERE id = @id
  `,{start_time:e.start_time,end_time:e.end_time,id:t}),await a.get(`
    SELECT tb.*,
      t.title AS task_title, t.icon AS task_icon,
      p.name AS project_name, p.color AS project_color
    FROM time_blocks tb
    LEFT JOIN tasks t ON t.id = tb.task_id
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE tb.id = ?
  `,[t])}async function Gt(t){return await a.run("DELETE FROM time_blocks WHERE id = ?",[t]),{success:!0}}async function Jt(){const t=new Date,e=t.getFullYear(),i=t.getMonth(),E=new Date(e,i,1),o=new Date(e,i+1,0),n=E.toISOString().split("T")[0],r=o.toISOString().split("T")[0],c=new Date(e,i-1,1).toISOString().split("T")[0],d=new Date(e,i,0).toISOString().split("T")[0],T=(await a.get("SELECT COALESCE(SUM(duration),0) AS v FROM time_entries WHERE end_time IS NOT NULL AND date(start_time)>=? AND date(start_time)<=?",[n,r])).v,N=(await a.get("SELECT COALESCE(SUM(duration),0) AS v FROM time_entries WHERE end_time IS NOT NULL AND date(start_time)>=? AND date(start_time)<=?",[c,d])).v,l=await a.all(`
    SELECT t.*, p.name AS project_name, p.color AS project_color
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.status='done' AND t.updated_at >= ? AND t.updated_at <= ?
    ORDER BY t.updated_at DESC
  `,[n+" 00:00:00",r+" 23:59:59"]),S=await a.all(`
    SELECT p.id, p.name, p.color, COALESCE(SUM(te.duration),0) AS total
    FROM time_entries te JOIN projects p ON p.id = te.project_id
    WHERE te.end_time IS NOT NULL AND date(te.start_time)>=? AND date(te.start_time)<=?
    GROUP BY p.id ORDER BY total DESC
  `,[n,r]),u=await a.all(`
    SELECT date(start_time) AS day, COALESCE(SUM(duration),0) AS total
    FROM time_entries WHERE end_time IS NOT NULL AND date(start_time)>=? AND date(start_time)<=?
    GROUP BY date(start_time) ORDER BY day ASC
  `,[n,r]);return{thisMonthTime:T,lastMonthTime:N,completedTasks:l,byProject:S,byDay:u,firstStr:n,lastStr:r}}async function $t(){const t=new Date,e=(t.getDay()+6)%7,i=new Date(t);i.setDate(t.getDate()-e),i.setHours(0,0,0,0);const E=new Date(i);E.setDate(i.getDate()-7);const o=new Date(i);o.setDate(i.getDate()+6);const n=new Date(E);n.setDate(E.getDate()+6);const r=p=>p.toISOString().split("T")[0],[c,d]=[r(i),r(o)],[T,N]=[r(E),r(n)],l=t.getFullYear(),S=t.getMonth(),[u,_]=[r(new Date(l,S,1)),r(new Date(l,S+1,0))],[m,R]=[r(new Date(l,S-1,1)),r(new Date(l,S,0))],A=async(p,O)=>(await a.get("SELECT COALESCE(SUM(duration),0) AS v FROM time_entries WHERE end_time IS NOT NULL AND date(start_time)>=? AND date(start_time)<=?",[p,O])).v,L=async(p,O)=>(await a.get("SELECT COUNT(*) AS v FROM tasks WHERE status='done' AND date(updated_at)>=? AND date(updated_at)<=?",[p,O])).v,C=async(p,O)=>await a.all(`
    SELECT date(start_time) AS day, COALESCE(SUM(duration),0) AS total
    FROM time_entries WHERE end_time IS NOT NULL AND date(start_time)>=? AND date(start_time)<=?
    GROUP BY date(start_time) ORDER BY day ASC
  `,[p,O]);return{week:{current:{time:await A(c,d),tasks:await L(c,d),days:await C(c,d),from:c,to:d},previous:{time:await A(T,N),tasks:await L(T,N),days:await C(T,N),from:T,to:N}},month:{current:{time:await A(u,_),tasks:await L(u,_),from:u,to:_},previous:{time:await A(m,R),tasks:await L(m,R),from:m,to:R}}}}async function xt(t){const e=await a.all(`
    SELECT t.*,
      COALESCE(SUM(te.duration),0) AS total_time,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) AS subtask_count,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.done = 1) AS subtask_done
    FROM tasks t
    LEFT JOIN time_entries te ON te.task_id = t.id AND te.end_time IS NOT NULL
    WHERE t.project_id = ?
    GROUP BY t.id
    ORDER BY CASE t.status WHEN 'done' THEN 2 ELSE 0 END, t.priority, t.created_at
  `,[t]),i=await a.all(`
    SELECT s.*, COALESCE(0,0) AS total_time
    FROM subtasks s
    JOIN tasks t ON t.id = s.task_id
    WHERE t.project_id = ?
    ORDER BY s.task_id, s.position
  `,[t]),E=await a.all(`
    SELECT d.task_id, d.depends_on_id
    FROM task_dependencies d
    JOIN tasks t1 ON t1.id = d.task_id
    JOIN tasks t2 ON t2.id = d.depends_on_id
    WHERE t1.project_id = ? AND t2.project_id = ?
  `,[t,t]);return{project:await a.get("SELECT * FROM projects WHERE id = ?",[t]),tasks:e,subtasks:i,dependencies:E}}async function Kt(t){const e=new Set,i=[t];for(;i.length;){const E=i.pop(),o=await a.all("SELECT depends_on_id FROM task_dependencies WHERE task_id = ?",[E]);for(const{depends_on_id:n}of o)e.has(n)||(e.add(n),i.push(n))}return e}async function Vt(t,e){if(t=+t,e=+e,t===e)return{success:!1,error:"A task cannot depend on itself"};if(Kt(e).has(t))return{success:!1,error:"That would create a circular dependency"};try{return await a.run("INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_id) VALUES (?, ?)",[t,e]),{success:!0}}catch(i){return{success:!1,error:String(i.message||i)}}}async function Qt(t,e){return await a.run("DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_id = ?",[+t,+e]),{success:!0}}async function g(){return await a.get("SELECT * FROM projects WHERE is_inbox = 1")}async function qt(){const t=await g();return t?await a.all(`
    SELECT t.*, p.name AS project_name, p.color AS project_color
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.project_id = ? AND t.status != 'done'
    ORDER BY t.created_at DESC
  `,[t.id]):[]}async function Zt(t,e){return await a.run("UPDATE tasks SET project_id = ?, updated_at = datetime('now') WHERE id = ?",[e,t]),await a.get("SELECT * FROM tasks WHERE id = ?",[t])}async function zt(t){return await a.all(`
    SELECT
      di.*,
      t.title        AS task_title,
      t.icon         AS icon,
      t.status       AS task_status,
      t.priority,
      p.name         AS project_name,
      p.color        AS project_color,
      s.title        AS subtask_title,
      s.done         AS subtask_done,
      -- unified display title
      CASE WHEN di.subtask_id IS NOT NULL THEN s.title ELSE t.title END AS title,
      -- unified done flag: subtask-level or task-level
      CASE
        WHEN di.subtask_id IS NOT NULL THEN COALESCE(s.done, 0)
        ELSE (CASE WHEN t.status = 'done' THEN 1 ELSE 0 END)
      END AS is_done
    FROM daily_intentions di
    JOIN tasks t ON t.id = di.task_id
    JOIN projects p ON p.id = t.project_id
    LEFT JOIN subtasks s ON s.id = di.subtask_id
    WHERE di.date = ?
    ORDER BY di.position ASC
  `,[t])}async function te(t,e){await a.run("DELETE FROM daily_intentions WHERE date = ?",[t]);for(let i=0;i<e.length;i++){const E=e[i],o=typeof E=="object"?E.taskId:E,n=typeof E=="object"&&E.subtaskId||null;await a.run("INSERT INTO daily_intentions (date, task_id, subtask_id, position) VALUES (?, ?, ?, ?)",[t,o,n,i])}}async function ee(t=0){const e=`datetime(start_time,'${t>=0?"+":""}${t} minutes')`;return await a.all(`
    SELECT
      CAST(strftime('%w', ${e}) AS INTEGER) AS dow,
      CAST(strftime('%H', ${e}) AS INTEGER) AS hour,
      COALESCE(SUM(duration), 0) AS total,
      COUNT(*) AS sessions
    FROM time_entries
    WHERE end_time IS NOT NULL AND duration >= 60
    GROUP BY dow, hour
  `)}async function ae(t=0){const e=`datetime(start_time,'${t>=0?"+":""}${t} minutes')`,i=(()=>{const E=new Date(Date.now()+t*6e4),o=new Date(E),n=o.getUTCDay();return o.setUTCDate(o.getUTCDate()-(n===0?6:n-1)),o.toISOString().split("T")[0]})();return await a.all(`
    SELECT work_type, COALESCE(SUM(duration), 0) AS total
    FROM time_entries
    WHERE end_time IS NOT NULL AND date(${e}) >= ?
    GROUP BY work_type
  `,[i])}async function ie(t){return await a.get("SELECT * FROM daily_reviews WHERE date = ?",[t])||null}async function se(t,e){await a.run(`
    INSERT INTO daily_reviews (date, carries_over, notes)
    VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET carries_over = excluded.carries_over, notes = excluded.notes
  `,[t,e.carries_over||"",e.notes||""])}const s={initSchema:I,getProjects:Y,createProject:B,updateProject:v,deleteProject:h,getTasksByProject:P,getTask:D,createTask:G,updateTask:J,deleteTask:$,getTimeEntries:x,getActiveTimer:K,createTimeEntry:V,updateTimeEntry:Q,stopTimer:q,deleteTimeEntry:Z,getComments:z,createComment:tt,updateComment:et,deleteComment:at,getDashboardData:st,getReportData:Et,getOverdueTasks:it,getTodayBreakdown:ot,getMonthBreakdown:nt,getCompletedTasks:rt,getChartData:dt,getUpcomingDeadlines:lt,getCalendarTasks:ct,getDailySummary:St,getTasksSummary:Tt,getDaySchedule:Nt,searchAll:ut,getTags:_t,createTag:pt,deleteTag:mt,getTaskTags:w,setTaskTags:Rt,getHabitData:Ot,toggleHabitCompletion:At,getTemplates:Lt,saveTemplate:Dt,createProjectFromTemplate:Ct,deleteTemplate:kt,getWeeklyReview:wt,getMilestones:gt,getSubtasks:It,getAllActiveSubtasks:yt,createSubtask:Ut,toggleSubtask:Ft,updateSubtask:Mt,deleteSubtask:jt,getAllSettings:Wt,setSetting:bt,getNote:ft,saveNote:Yt,getRecentNotes:Bt,getNoteMonthDates:vt,getTimeBlocks:ht,createTimeBlock:Pt,updateTimeBlock:Xt,deleteTimeBlock:Gt,getMonthlyReview:Jt,getReviewComparison:$t,getProjectDiagram:xt,addDependency:Vt,removeDependency:Qt,getWigs:y,createWig:U,updateWig:F,deleteWig:M,getScoreboardData:j,saveWigCommitment:H,getWeeklyCommitment:W,saveWeeklyCommitment:b,getInboxProject:g,getInboxTasks:qt,processInboxTask:Zt,getDailyIntentions:zt,setDailyIntentions:te,getProductivityHeatmap:ee,getWorkTypeBreakdown:ae,getDailyReview:ie,saveDailyReview:se};function Ee(t,e){const i=new Blob([t],{type:"text/csv;charset=utf-8"}),E=URL.createObjectURL(i),o=document.createElement("a");return o.href=E,o.download=e||"momentum-export.csv",document.body.appendChild(o),o.click(),o.remove(),URL.revokeObjectURL(E),{success:!0}}const k=()=>Promise.resolve({unsupported:!0,message:"Not available in cloud mode"});function ne(){return{getProjects:()=>s.getProjects(),createProject:t=>s.createProject(t),updateProject:(t,e)=>s.updateProject(t,e),deleteProject:t=>s.deleteProject(t),getTasks:t=>s.getTasksByProject(t),getTask:t=>s.getTask(t),createTask:t=>s.createTask(t),updateTask:(t,e)=>s.updateTask(t,e),deleteTask:t=>s.deleteTask(t),getTimeEntries:t=>s.getTimeEntries(t),getActiveTimer:()=>s.getActiveTimer(),createTimeEntry:t=>s.createTimeEntry(t),updateTimeEntry:(t,e)=>s.updateTimeEntry(t,e),stopTimer:(t,e,i)=>s.stopTimer(t,e,i),deleteTimeEntry:t=>s.deleteTimeEntry(t),getComments:t=>s.getComments(t),createComment:t=>s.createComment(t),updateComment:(t,e)=>s.updateComment(t,e),deleteComment:t=>s.deleteComment(t),getDashboardData:t=>s.getDashboardData(t),getReportData:t=>s.getReportData(t),getOverdueTasks:()=>s.getOverdueTasks(),exportPDF:()=>(window.print(),Promise.resolve({printed:!0})),exportCSV:(t,e)=>Promise.resolve(Ee(t,e)),backupDb:k,restoreDb:k,getServerInfo:()=>Promise.resolve({url:null,tailscaleUrl:null}),getCalendarTasks:()=>s.getCalendarTasks(),getTasksSummary:()=>s.getTasksSummary(),getDailySummary:()=>s.getDailySummary(),getDaySchedule:t=>s.getDaySchedule(t),searchAll:t=>s.searchAll(t),getTags:()=>s.getTags(),createTag:t=>s.createTag(t),deleteTag:t=>s.deleteTag(t),getTaskTags:t=>s.getTaskTags(t),setTaskTags:(t,e)=>s.setTaskTags(t,e),getHabitData:()=>s.getHabitData(),toggleHabit:(t,e)=>s.toggleHabitCompletion(t,e),getTemplates:()=>s.getTemplates(),saveTemplate:(t,e)=>s.saveTemplate(t,e),createFromTemplate:(t,e)=>s.createProjectFromTemplate(t,e),deleteTemplate:t=>s.deleteTemplate(t),getWeeklyReview:t=>s.getWeeklyReview(t),getMonthlyReview:()=>s.getMonthlyReview(),getReviewComparison:()=>s.getReviewComparison(),getMilestones:t=>s.getMilestones(t),getSubtasks:t=>s.getSubtasks(t),getAllActiveSubtasks:()=>s.getAllActiveSubtasks(),createSubtask:t=>s.createSubtask(t),toggleSubtask:t=>s.toggleSubtask(t),updateSubtask:(t,e,i)=>s.updateSubtask(t,e,i),deleteSubtask:t=>s.deleteSubtask(t),getAllSettings:()=>s.getAllSettings(),setSetting:(t,e)=>s.setSetting(t,e),getTodayBreakdown:()=>s.getTodayBreakdown(),getMonthBreakdown:()=>s.getMonthBreakdown(),getCompletedTasks:()=>s.getCompletedTasks(),getChartData:t=>s.getChartData(t),getNote:t=>s.getNote(t),saveNote:(t,e)=>s.saveNote(t,e),getRecentNotes:()=>s.getRecentNotes(),getNoteMonthDates:(t,e)=>s.getNoteMonthDates(t,e),getTimeBlocks:t=>s.getTimeBlocks(t),createTimeBlock:t=>s.createTimeBlock(t),updateTimeBlock:(t,e)=>s.updateTimeBlock(t,e),deleteTimeBlock:t=>s.deleteTimeBlock(t),getProjectDiagram:t=>s.getProjectDiagram(t),addDependency:(t,e)=>s.addDependency(t,e),removeDependency:(t,e)=>s.removeDependency(t,e),getWigs:()=>s.getWigs(),createWig:t=>s.createWig(t),updateWig:(t,e)=>s.updateWig(t,e),deleteWig:t=>s.deleteWig(t),getScoreboard:()=>s.getScoreboardData(),saveWigCommitment:(t,e,i)=>s.saveWigCommitment(t,e,i),getWeeklyCommitment:t=>s.getWeeklyCommitment(t),saveWeeklyCommitment:(t,e)=>s.saveWeeklyCommitment(t,e),getInboxTasks:()=>s.getInboxTasks(),processInboxTask:(t,e)=>s.processInboxTask(t,e),getDailyIntentions:t=>s.getDailyIntentions(t),setDailyIntentions:(t,e)=>s.setDailyIntentions(t,e),getDailyReview:t=>s.getDailyReview(t),saveDailyReview:(t,e)=>s.saveDailyReview(t,e),getProductivityHeatmap:t=>s.getProductivityHeatmap(t),getWorkTypeBreakdown:t=>s.getWorkTypeBreakdown(t)}}export{ne as buildTursoApi,I as initSchema};
