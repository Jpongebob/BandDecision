[CmdletBinding()]
param([ValidateSet('Inspect','Backup','Restore','Verify')][string]$Phase='Inspect')
$ErrorActionPreference='Stop'
$appRoot=Split-Path -Parent $PSScriptRoot
$folder=Join-Path $appRoot '.migration\seoul'
$connections=Import-Clixml -LiteralPath (Join-Path $folder 'connections.clixml')
$psql='D:\Apps\PostgreSQL17\pgsql\bin\psql.exe'
$cli='D:\Apps\SupabaseCLI\supabase.exe'
$utf8=[Text.UTF8Encoding]::new($false)
$env:Path='D:\Apps\Docker\resources\bin;'+$env:Path
$env:PGCONNECT_TIMEOUT='20'
$env:PGSSLMODE='require'

function Set-Database([string]$Side){
 $credential=$connections.$Side
 $uri=[Uri]$credential.UserName.Replace('[YOUR-PASSWORD]','placeholder')
 $expected=if($Side -eq 'Source'){'postgres.ejodiyhxkftgoaryfzrq'}else{'postgres.wxtwuyexsjqxpqnxeheq'}
 $env:PGUSER=[Uri]::UnescapeDataString(($uri.UserInfo -split ':')[0])
 if($env:PGUSER -ne $expected){throw "Unexpected $Side project; operation stopped."}
 $env:PGHOST=$uri.Host; $env:PGPORT='5432'; $env:PGDATABASE='postgres'
 $env:PGPASSWORD=$credential.GetNetworkCredential().Password
}
function Query([string]$Sql){
 $ErrorActionPreference='Continue'
 $result=& $psql -X -q -w -At --set ON_ERROR_STOP=1 -c $Sql 2>&1
 $ErrorActionPreference='Stop'
 if($LASTEXITCODE -ne 0){throw 'Database query failed; no credential output was printed.'}
 return ($result -join "`n")
}
function Dump([string]$Name,[string[]]$Options){
 $file=Join-Path $folder $Name
 if(Test-Path -LiteralPath $file){throw "$Name already exists; existing backup preserved."}
 $encoded=[Uri]::EscapeDataString($connections.Source.GetNetworkCredential().Password)
 $url=$connections.Source.UserName.Replace('[YOUR-PASSWORD]',$encoded)
 $ErrorActionPreference='Continue'
 $output=& $cli db dump "--remote=$url" -f $file @Options 2>&1
 $ErrorActionPreference='Stop'
 $code=$LASTEXITCODE
 $safe=($output -join "`n").Replace($url,'[REDACTED_DB_URL]').Replace($encoded,'[REDACTED_PASSWORD]').Replace($connections.Source.GetNetworkCredential().Password,'[REDACTED_PASSWORD]')
 [IO.File]::WriteAllText((Join-Path $folder ($Name+'.log')),$safe,$utf8)
 if($code -ne 0){throw "Backup failed for $Name. See the local sanitized log."}
 if((Get-Item -LiteralPath $file).Length -eq 0){throw "Empty backup: $Name"}
 Write-Output ("Backup complete: {0}, {1} bytes" -f $Name,(Get-Item -LiteralPath $file).Length)
}
function Snapshot([string]$Side){
 Set-Database $Side
 $tableSql="select format('%I.%I',n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and (n.nspname in ('public','private') or (n.nspname='auth' and c.relname in ('users','identities'))) order by 1"
 $tables=(Query $tableSql) -split "`n" | Where-Object {$_}
 $out=@()
 foreach($table in $tables){
  $value=Query ("begin read only; select count(*)::text||'|'||coalesce(md5(string_agg(row_json,E'\\n' order by row_json)),md5('')) from (select to_jsonb(t)::text as row_json from "+$table+" t) s; commit;")
  $out+=$table+'|'+$value
 }
 return ($out -join "`n")
}
try{
 if($Phase -eq 'Inspect'){
  foreach($side in @('Source','Target')){
   Set-Database $side
   Write-Output "$side inventory:"
   Query "begin read only; select 'app_tables='||count(*) from information_schema.tables where table_schema in ('public','private') and table_type='BASE TABLE'; select 'auth_users='||count(*) from auth.users; select 'vault_secrets='||count(*) from vault.secrets; select 'custom_auth_triggers='||count(*) from pg_trigger t join pg_proc p on p.oid=t.tgfoid join pg_namespace pn on pn.oid=p.pronamespace join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='auth' and not t.tgisinternal and pn.nspname not in ('auth','storage'); commit;"
  }
 }
 if($Phase -eq 'Backup'){
  Set-Database 'Source'
  if([int](Query 'select count(*) from vault.secrets') -ne 0){throw 'Vault secrets exist; encryption-key migration must be prepared first.'}
  Dump 'roles.sql' @('--role-only')
  Dump 'schema.sql' @()
  Dump 'data.sql' @('--data-only','--use-copy','-x','storage.buckets_vectors,storage.vector_indexes')
  Set-Database 'Source'
  $triggers=Query "select pg_get_triggerdef(t.oid)||';' from pg_trigger t join pg_proc p on p.oid=t.tgfoid join pg_namespace pn on pn.oid=p.pronamespace join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='auth' and not t.tgisinternal and pn.nspname not in ('auth','storage') order by t.tgname"
  [IO.File]::WriteAllText((Join-Path $folder 'auth_triggers.sql'),$triggers+"`n",$utf8)
  $publications=Query "select format('do %L;',format('begin if not exists(select 1 from pg_publication_tables where pubname=%L and schemaname=%L and tablename=%L) then alter publication supabase_realtime add table %I.%I; end if; end','supabase_realtime',schemaname,tablename,schemaname,tablename)) from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' order by tablename"
  [IO.File]::WriteAllText((Join-Path $folder 'realtime.sql'),$publications+"`nnotify pgrst,'reload schema';`n",$utf8)
  if((Query "select to_regclass('supabase_migrations.schema_migrations') is not null") -eq 't'){
   Dump 'history_schema.sql' @('--schema','supabase_migrations')
   Dump 'history_data.sql' @('--schema','supabase_migrations','--data-only','--use-copy')
  }
  $snapshot=Snapshot 'Source'
  [IO.File]::WriteAllText((Join-Path $folder 'source-snapshot.txt'),$snapshot,$utf8)
  Write-Output 'Backup and source fingerprints saved. No remote writes performed.'
 }
 if($Phase -eq 'Restore'){
  Set-Database 'Source'
  $publications=Query "select format('do %L;',format('begin if not exists(select 1 from pg_publication_tables where pubname=%L and schemaname=%L and tablename=%L) then alter publication supabase_realtime add table %I.%I; end if; end','supabase_realtime',schemaname,tablename,schemaname,tablename)) from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' order by tablename"
  [IO.File]::WriteAllText((Join-Path $folder 'realtime.sql'),$publications+"`nnotify pgrst,'reload schema';`n",$utf8)
  Set-Database 'Target'
  if([int](Query "select count(*) from information_schema.tables where table_schema in ('public','private') and table_type='BASE TABLE'") -ne 0 -or [int](Query 'select count(*) from auth.users') -ne 0){throw 'Target is not empty; restore refused.'}
  foreach($name in @('roles.sql','schema.sql','data.sql','auth_triggers.sql','realtime.sql','source-snapshot.txt')){if(-not(Test-Path -LiteralPath (Join-Path $folder $name))){throw "Missing backup: $name"}}
  $argsList=@('-X','-w','--single-transaction','--set','ON_ERROR_STOP=1','--file',(Join-Path $folder 'roles.sql'),'--file',(Join-Path $folder 'schema.sql'),'--command','SET session_replication_role = replica','--file',(Join-Path $folder 'data.sql'),'--file',(Join-Path $folder 'auth_triggers.sql'),'--file',(Join-Path $folder 'realtime.sql'))
  foreach($name in @('history_schema.sql','history_data.sql','reconcile-permissions.sql')){if(Test-Path -LiteralPath (Join-Path $folder $name)){$argsList+=@('--file',(Join-Path $folder $name))}}
  $ErrorActionPreference='Continue'
  $output=& $psql @argsList 2>&1
  $ErrorActionPreference='Stop'
  $code=$LASTEXITCODE
  [IO.File]::WriteAllText((Join-Path $folder 'restore.log'),($output -join "`n"),$utf8)
  if($code -ne 0){throw 'Restore failed and the transaction rolled back. Check the local restore log.'}
  Write-Output 'Target restore committed. Source database was not changed.'
 }
 if($Phase -eq 'Verify'){
  $source=Snapshot 'Source'; $target=Snapshot 'Target'
  [IO.File]::WriteAllText((Join-Path $folder 'source-current-snapshot.txt'),$source,$utf8)
  [IO.File]::WriteAllText((Join-Path $folder 'target-snapshot.txt'),$target,$utf8)
  $diff=Compare-Object ($source -split "`n") ($target -split "`n")
  if($diff){$diff | Format-Table; throw 'Source and target fingerprints differ. Do not switch Production yet.'}
  Write-Output 'All application tables and auth.users/auth.identities match by row count and content fingerprint.'
 }
}finally{
 foreach($name in @('PGPASSWORD','PGHOST','PGPORT','PGDATABASE','PGUSER','PGSSLMODE','PGCONNECT_TIMEOUT')){[Environment]::SetEnvironmentVariable($name,$null,'Process')}
}
