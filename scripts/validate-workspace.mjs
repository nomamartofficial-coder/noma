
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const ROOT=resolve(import.meta.dirname,'..');
const APPS=['web','api','worker'];
const PACKAGES=['ui','contracts','config','database','platform','integrations','testing','security','observability','eslint-config','tsconfig'];
const allowed={
  '@noma/web':new Set(['@noma/config','@noma/contracts','@noma/observability','@noma/ui']),
  '@noma/api':new Set(['@noma/config','@noma/contracts','@noma/database','@noma/integrations','@noma/observability','@noma/platform','@noma/security']),
  '@noma/worker':new Set(['@noma/config','@noma/contracts','@noma/database','@noma/integrations','@noma/observability','@noma/platform','@noma/security']),
  '@noma/platform':new Set(['@noma/contracts']),
  '@noma/database':new Set(['@noma/contracts','@noma/platform']),
  '@noma/integrations':new Set(['@noma/contracts','@noma/platform']),
  '@noma/testing':new Set(['@noma/contracts']),
  '@noma/security':new Set(['@noma/contracts']),
  '@noma/ui':new Set(), '@noma/contracts':new Set(), '@noma/config':new Set(), '@noma/observability':new Set(),
  '@noma/eslint-config':new Set(), '@noma/tsconfig':new Set(),
};
const fail=(m)=>{throw new Error(m)};
const readJson=async p=>JSON.parse(await readFile(resolve(ROOT,p),'utf8'));
async function validatePackage(path, expected){
  const pkg=await readJson(`${path}/package.json`);
  if(pkg.name!==expected) fail(`${path}: expected name ${expected}`);
  if(pkg.private!==true) fail(`${path}: must remain private`);
  for(const s of ['lint','typecheck','build','clean']) if(!pkg.scripts?.[s]) fail(`${path}: missing ${s} script`);
  const deps={...(pkg.dependencies??{}),...(pkg.devDependencies??{})};
  const workspace=Object.keys(deps).filter(x=>x.startsWith('@noma/'));
  const permit=allowed[expected];
  for(const dep of workspace) if(!permit?.has(dep)) fail(`${expected}: forbidden dependency ${dep}`);
  for(const dep of workspace) if(deps[dep]!=='workspace:*') fail(`${expected}: ${dep} must use workspace:*`);
  return pkg;
}
async function validate(){
  const root=await readJson('package.json');
  if(root.packageManager!=='pnpm@11.17.0') fail('packageManager must be pnpm@11.17.0');
  if(root.engines?.node!=='>=24.0.0 <25') fail('Node 24 LTS engine is required');
  if(root.devDependencies?.turbo!=='2.9.14'||root.devDependencies?.typescript!=='6.0.3') fail('toolchain versions are not pinned');
  const turbo=await readJson('turbo.json');
  for(const task of ['lint','typecheck','build','clean','dev']) if(!turbo.tasks?.[task]) fail(`turbo task ${task} missing`);
  const workspace=await readFile(resolve(ROOT,'pnpm-workspace.yaml'),'utf8');
  if(!workspace.includes('apps/*')||!workspace.includes('packages/*')) fail('workspace globs missing');
  for(const app of APPS) await validatePackage(`apps/${app}`,`@noma/${app}`);
  for(const pkg of PACKAGES) await validatePackage(`packages/${pkg}`,`@noma/${pkg}`);
  const lock=await readFile(resolve(ROOT,'pnpm-lock.yaml'),'utf8');
  for(const token of ["lockfileVersion: '9.0'",'turbo@2.9.14:','typescript@6.0.3:']) if(!lock.includes(token)) fail(`lockfile missing ${token}`);
  return {apps:APPS.length,packages:PACKAGES.length};
}
async function selfTest(){
  const deps={'@noma/database':'workspace:*'};
  const permit=allowed['@noma/web'];
  if(Object.keys(deps).every(x=>permit.has(x))) fail('negative boundary test did not fail');
}
try{
  const result=await validate();
  console.log(`PASS: ${result.apps} apps, ${result.packages} packages, pinned pnpm/Turbo/TypeScript workspace`);
  if(process.argv.includes('--self-test')){await selfTest();console.log('PASS: injected browser-to-database dependency was rejected');}
}catch(error){console.error(`FAIL: ${error.message}`);process.exit(1)}
